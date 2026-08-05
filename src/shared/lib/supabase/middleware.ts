/**
 * @fileoverview Next.js middleware for multi-tenant auth and route protection.
 *
 * This middleware is the first line of defense in the Ledgerly security architecture.
 * It runs on every request BEFORE the page or API route handler executes, and is
 * responsible for:
 *
 * 1. **Session refresh** — Refreshes the Supabase auth token on every request so
 *    the session never expires during active use. The Supabase SSR client reads
 *    and writes auth cookies (access_token, refresh_token) transparently.
 *
 * 2. **Route classification** — Categorizes every incoming path into one of four
 *    tiers, each with different auth requirements:
 *    - Public routes (login, request-access, etc.) — no auth required
 *    - Protected routes (/, /expenses, /settings) — require auth + org membership
 *    - Admin routes (/admin) — require auth + super_admin role
 *    - API routes (/api/*) — require auth
 *
 * 3. **Org cookie validation** — Reads the `ledgerly_active_org` cookie to
 *    determine which organization the user is currently acting on behalf of.
 *    Validates that the user actually has an `org_members` row for that org.
 *    If the cookie is invalid/missing, the client-side OrgProvider handles
 *    setting a default (middleware cannot set response cookies for the first visit).
 *
 * 4. **Defense-in-depth for org isolation** — This middleware validates org
 *    membership at the routing layer, but the actual row-level security (RLS)
 *    policies on the Supabase database enforce per-org data isolation at the
 *    query layer. The two layers are complementary, not redundant:
 *    - Middleware prevents accidental cross-org navigation
 *    - RLS prevents malicious cross-org data access even if middleware is bypassed
 *
 * @security
 * - Unauthenticated users hitting protected/admin/API routes are redirected to /login
 * - Authenticated users on public auth pages (login, reset-password) are redirected to /
 * - Admin routes require a super_admin role membership in ANY org
 * - The org cookie is validated against actual org_members rows, not trusted blindly
 *
 * @see {@link src/entities/expense/repository.ts} for application-level RLS enforcement
 * @see {@link src/shared/lib/org-context.ts} for the active org context provider
 */
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Cookie name used to persist the user's currently selected organization.
 *
 * This cookie is set client-side by the OrgProvider after the user selects
 * or is assigned an organization. Middleware reads it to validate org
 * membership but never writes it directly — client-side code owns the
 * cookie lifecycle to handle edge cases (e.g., first visit with no cookie).
 */
const ACTIVE_ORG_COOKIE = 'ledgerly_active_org'

/**
 * Response header stamped whenever a lookup fails and the middleware downgrades
 * to fail-open. Lets request-level logging / APM see degradation without
 * parsing console output.
 */
export const FAIL_OPEN_HEADER = 'x-middleware-mode'
export const FAIL_OPEN_MODE = 'fail-open'

/** Whether a string env value means "on" for a boolean switch. */
export function isTruthyEnv(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'TRUE' || value === 'on'
}

/**
 * D-05: configurable fail-closed enforcement.
 *
 * The default posture is fail-open: a transient Supabase/DB error on an
 * authorization-critical lookup lets the request through rather than bricking
 * auth (availability over strictness). This is correct for most routes, but for
 * /admin a non-admin must never render the console, so when
 * `MIDDLEWARE_FAIL_CLOSED=1` is set, an unverifiable org lookup denies admin
 * access instead of allowing it.
 */
export const FAIL_CLOSED = isTruthyEnv(process.env.MIDDLEWARE_FAIL_CLOSED)

/** Observability: every fail-open downgrade is logged with a stable tag. */
function logFailOpen(context: string, error: unknown) {
  console.warn(`[middleware:fail-open] ${context}`, error)
}

/** Stamp the pass-through response so logs/APM can flag the downgrade. */
function failOpenResponse(response: NextResponse, context: string, error: unknown): NextResponse {
  response.headers.set(FAIL_OPEN_HEADER, FAIL_OPEN_MODE)
  logFailOpen(context, error)
  return response
}

/** Result of a possibly-failing lookup query. */
type Settled<T> =
  | { ok: true; data: T }
  | { ok: false; data: null; error: unknown }

/**
 * Await a lookup query without letting a transient DB error abort the whole
 * request. Callers apply their own per-check fail-open policy via `.ok`. A
 * `null` promise (a lookup a route doesn't need) resolves as a no-op success.
 */
async function settle<T>(
  promise: PromiseLike<{ data: T }> | null
): Promise<Settled<T>> {
  if (!promise) return { ok: true, data: null as T }
  try {
    const result = await promise
    return { ok: true, data: result.data }
  } catch (error) {
    return { ok: false, data: null, error }
  }
}

/**
 * Main middleware handler that intercepts every Next.js request.
 *
 * Flow:
 * 1. Create a Supabase SSR client that reads/writes auth cookies on the request/response
 * 2. Call getUser() to verify the session is still valid (triggers token refresh if needed)
 * 3. Classify the route and enforce the appropriate auth/authorization policy
 * 4. For protected/admin routes, validate org membership via org_members table
 * 5. Return the (possibly modified) response with updated auth cookies
 *
 * @param request - The incoming Next.js request object
 * @returns A NextResponse that either continues the request, redirects, or blocks it
 */
export async function updateSession(request: NextRequest) {
  // Start with a pass-through response. The Supabase SSR client will modify
  // this response to include updated auth cookies if a token refresh occurs.
  let supabaseResponse = NextResponse.next({
    request,
  })

  /**
   * Create a Supabase client with cookie-based auth.
   *
   * Why we use `createServerClient` from @supabase/ssr (not @supabase/supabase-js):
   * - The SSR client reads auth state from request cookies and writes new tokens
   *   to the response cookies. This is the recommended pattern for Next.js middleware.
   * - We use only the public anon key here — the service role key is NEVER exposed
   *   to the client. RLS policies on the database handle authorization; this middleware
   *   only needs to verify the user's identity.
   *
   * The cookie handlers use a two-phase write pattern:
   * - setAll() first writes to request.cookies (so subsequent code in this middleware
   *   sees the latest auth state)
   * - Then it recreates the response and writes to response.cookies (so the browser
   *   receives the updated tokens)
   */
  let supabase: ReturnType<typeof createServerClient> | null = null

  // Verify the user's session. This also silently refreshes expired tokens —
  // the updated tokens are written to the response cookies via setAll() above.
  //
  // D-05 fail-open: a missing/invalid Supabase config (or a failed session
  // lookup) must not take the whole site down with a 500 on every request.
  // If the client can't be created or the session can't be verified, treat the
  // request as unauthenticated: public routes still render and protected/admin/
  // API routes redirect to login instead of erroring.
  let user: User | null = null
  try {
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            // Phase 1: Update request cookies so Supabase client sees the latest token
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            // Phase 2: Recreate the response with updated request, then set response cookies
            // This ensures the browser receives the refreshed tokens
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (error) {
    logFailOpen('session verification', error)
  }

  const pathname = request.nextUrl.pathname

  // ──────────────────────────────────────────────────────────────────────
  // Route classification
  //
  // Every path is classified into one of four tiers. A path can match
  // EXACTLY or be a prefix (e.g., /expenses/123 matches /expenses).
  // The order of checks matters — public paths are checked first to allow
  // unauthenticated access, then admin, then protected, then API.
  // ──────────────────────────────────────────────────────────────────────

  /** Public routes — accessible without authentication. These are auth-related
   *  pages where showing a login form would create a redirect loop. */
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/request-access',
    '/reset-password',
    '/update-password',
    '/auth/callback',
    '/onboarding',
    '/org-signup',
    '/invite',
    '/suspended',
    '/no-access',
  ]
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  /** Admin-only routes — require the user to have at least one super_admin
   *  role membership in any organization. Non-admins are silently redirected
   *  to home (no error page — this is a UX decision to avoid revealing
   *  whether admin routes exist). */
  const adminPaths = ['/admin']
  const isAdminPath = adminPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  /** Protected routes — require authentication AND valid org membership.
   *  These are the main authenticated app routes. */
  const protectedPaths = ['/dashboard', '/expenses', '/settings', '/reports', '/categories']
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  /** All API routes require authentication. API routes handle their own
   *  org isolation via RLS policies rather than middleware-level checks. */
  const isApiPath = pathname.startsWith('/api/')

  // ──────────────────────────────────────────────────────────────────────
  // Auth enforcement
  // ──────────────────────────────────────────────────────────────────────

  // Unauthenticated users can only access public paths.
  // For everything else, redirect to login. We do NOT serve a 401 here —
  // Next.js middleware should redirect, not return error responses.
  if (!user) {
    if (isProtectedPath || isAdminPath || isApiPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // A verified user always has a client, but keep the narrowing explicit so the
  // DB checks below never run on a null client (defensive; unreachable in practice).
  if (!supabase) {
    logFailOpen('session verification', new Error('Supabase client unavailable'))
    return supabaseResponse
  }

  // ──────────────────────────────────────────────────────────────────────
  // Consolidated authorization lookups
  //
  // Every remaining decision (suspension, super-admin routing, onboarding
  // status, org membership, removed-member confinement) depends on just two
  // rows: the user's `profiles` row and their `org_members` memberships.
  // Both are fetched ONCE here, in parallel. This replaces the four
  // sequential round trips (suspension, super-admin, onboarding, memberships)
  // the middleware used to issue, so an authenticated request now costs two
  // Supabase round trips instead of four.
  // ──────────────────────────────────────────────────────────────────────

  // Which lookups does this route need?
  // - profiles: every authenticated path except /suspended (suspension flag,
  //   onboarding status, and org_id for removed-member confinement).
  // - memberships: protected/admin routes (org validation) and the public
  //   auth pages that redirect logged-in users away (super-admin routing).
  const needsProfile = pathname !== '/suspended'
  const isRedirectBlockPublic =
    isPublicPath &&
    pathname !== '/auth/callback' &&
    pathname !== '/onboarding' &&
    pathname !== '/' &&
    pathname !== '/suspended' &&
    pathname !== '/invite' &&
    pathname !== '/update-password'
  const needsMemberships = isProtectedPath || isAdminPath || isRedirectBlockPublic

  const [profileLookup, membershipLookup] = await Promise.all([
    settle(
      needsProfile
        ? supabase
            .from('profiles')
            .select('is_suspended, onboarding_completed, org_id')
            .eq('user_id', user.id)
            .maybeSingle()
        : null
    ),
    settle(
      needsMemberships
        ? supabase
            .from('org_members')
            .select('org_id, role, organizations!inner(id, name, slug, status)')
            .eq('user_id', user.id)
        : null
    ),
  ])

  const profile = profileLookup.data
  const memberships = membershipLookup.data

  // ──────────────────────────────────────────────────────────────────────
  // Suspension enforcement
  //
  // Suspended accounts are confined to /suspended (where they can sign out
  // or contact support). This applies to every route — even public auth pages.
  // `is_suspended` lives on `profiles`; RLS still lets a user read their own
  // suspension flag (solo users via their own-profile policy, org members via
  // their org-scoped profile row).
  // ──────────────────────────────────────────────────────────────────────
  if (needsProfile) {
    if (!profileLookup.ok) {
      // If the is_suspended column is unavailable, fail closed by confining to
      // /suspended when enabled (cannot verify the user is not suspended),
      // otherwise fall through and serve normally.
      if (FAIL_CLOSED) {
        const url = request.nextUrl.clone()
        url.pathname = '/suspended'
        return NextResponse.redirect(url)
      }
      logFailOpen('suspension check', profileLookup.error)
    } else if (profile?.is_suspended) {
      const url = request.nextUrl.clone()
      url.pathname = '/suspended'
      return NextResponse.redirect(url)
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // Auth-page redirect for logged-in users
  //
  // Authenticated users who land on auth pages (login, reset-password, etc.)
  // are redirected to the dashboard. The /auth/callback exception is necessary
  // because the OAuth callback flow needs to complete before redirecting.
  // ──────────────────────────────────────────────────────────────────────
  if (isRedirectBlockPublic) {
    // Super admins are redirected to the admin console, not the dashboard.
    if (!membershipLookup.ok) {
      // If the org_members query fails, fall through to the default redirect
      logFailOpen('super-admin lookup on auth-page redirect', membershipLookup.error)
    } else if (memberships?.some((m) => m.role === 'super_admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    // Check onboarding status before redirecting
    if (!profileLookup.ok) {
      // If the profiles query fails, redirect to dashboard
      logFailOpen('onboarding check on auth-page redirect', profileLookup.error)
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    if (!profile) {
      // No profile row — the old per-check `.single()` threw here and fell
      // back to /dashboard, so match that behavior.
      logFailOpen('onboarding check on auth-page redirect', new Error('no profiles row'))
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = profile?.onboarding_completed ? '/dashboard' : '/onboarding'
    return NextResponse.redirect(url)
  }

  // ──────────────────────────────────────────────────────────────────────
  // Org membership validation
  //
  // This is a DEFENSE-IN-DEPTH check at the routing layer. The primary
  // org isolation is enforced by RLS policies on every table (expenses,
  // categories, settings, etc.). This middleware check prevents:
  //
  // 1. Users with no org from seeing any protected content
  // 2. Users with an invalid org cookie from accessing data
  // 3. Non-admin users from accessing /admin routes
  //
  // Note: We cannot set the org cookie from middleware on first visit
  // (Next.js middleware has limited cookie-setting capabilities for SSR
  // responses). The client-side OrgProvider handles setting the cookie
  // after validating the user's org memberships.
  // ──────────────────────────────────────────────────────────────────────
  if (isProtectedPath || isAdminPath) {
    // Read the org cookie — this tells us which org the user selected.
    // The cookie is NOT trusted blindly; we validate it against org_members.
    const activeOrgId = request.cookies.get(ACTIVE_ORG_COOKIE)?.value

    if (!membershipLookup.ok) {
      // If the org_members query fails, let the user through — EXCEPT on admin
      // routes when fail-closed is enabled: /admin must never render without
      // proof of the super_admin role, so an unverifiable lookup denies access.
      if (isAdminPath && FAIL_CLOSED) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
      return failOpenResponse(supabaseResponse, 'org membership lookup', membershipLookup.error)
    }

    if (!memberships || memberships.length === 0) {
      if (isAdminPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }

      // Removed-member confinement: if the user has no memberships but their
      // profile is still bound to an org, they were removed from that org.
      // Confine them to /no-access (where they can sign out or request access
      // again). Solo users (profiles.org_id IS NULL) are allowed through.
      if (isProtectedPath) {
        if (!profileLookup.ok) {
          // If the profiles query fails, fall through and let the request continue
          logFailOpen('removed-member profile lookup', profileLookup.error)
        } else if (profile?.org_id) {
          const url = request.nextUrl.clone()
          url.pathname = '/no-access'
          return NextResponse.redirect(url)
        }
      }
    } else {
      // Validate that the org cookie references a real membership.
      // This prevents a user from crafting a cookie with an arbitrary org_id.
      // RLS is the real guard; this is just a navigation-level sanity check.
      const validOrg = activeOrgId
        ? memberships.find(m => m.org_id === activeOrgId)
        : null

      if (!validOrg && isProtectedPath) {
        // No valid org cookie set — let the request through.
        // The client-side OrgProvider will detect this, set the cookie
        // to the user's first available org, and re-render.
        // Note: We intentionally do NOT redirect here. The client will
        // set the cookie and the page will render with the default org.
      }

      // Organization life-cycle enforcement: members of a suspended or
      // cancelled org are confined to /suspended (mirrors profile-level
      // suspension). RLS also blocks access via is_org_member.
      if (validOrg && isProtectedPath && validOrg.organizations?.status !== 'active') {
        const url = request.nextUrl.clone()
        url.pathname = '/suspended'
        return NextResponse.redirect(url)
      }

      // Admin route guard: require super_admin role in at least one org.
      // This is checked at the middleware level because admin pages should
      // never render at all for non-admin users (defense-in-depth).
      const isSuperAdmin = memberships.some(m => m.role === 'super_admin')

      // Super admins live on the admin console. Route them away from the
      // org dashboards (/dashboard, /expenses, /settings) so their home is
      // always /admin where they manage clients and announcements.
      if (isSuperAdmin && isProtectedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      }

      if (isAdminPath) {
        if (!isSuperAdmin) {
          // Silently redirect to home — do not reveal that /admin exists
          // or that the user lacks permissions (security through obscurity
          // at the navigation level; RLS is the real enforcement).
          const url = request.nextUrl.clone()
          url.pathname = '/'
          return NextResponse.redirect(url)
        }
      }

      // Onboarding guard: redirect users who haven't completed onboarding
      // to the onboarding page. Skip if they're already on /onboarding,
      // or on admin/settings/API routes.
      const isOnboardingPath = pathname === '/onboarding' || pathname.startsWith('/onboarding/')
      if (isProtectedPath && !isOnboardingPath && !isAdminPath) {
        if (!profileLookup.ok) {
          // If the onboarding_completed column doesn't exist yet,
          // skip the redirect and let the user through
          logFailOpen('onboarding guard', profileLookup.error)
        } else if (profile && !profile.onboarding_completed) {
          const url = request.nextUrl.clone()
          url.pathname = '/onboarding'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}
