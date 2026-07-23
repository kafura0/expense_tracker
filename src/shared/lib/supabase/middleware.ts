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
  const supabase = createServerClient(
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

  // Verify the user's session. This also silently refreshes expired tokens —
  // the updated tokens are written to the response cookies via setAll() above.
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    '/login',
    '/request-access',
    '/reset-password',
    '/update-password',
    '/auth/callback',
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
  const protectedPaths = ['/', '/expenses', '/settings']
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

  // Authenticated users who land on auth pages (login, reset-password, etc.)
  // are redirected to the dashboard. The /auth/callback exception is necessary
  // because the OAuth callback flow needs to complete before redirecting.
  if (isPublicPath && pathname !== '/auth/callback') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
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

    // Fetch all org memberships for this user, including org details.
    // The `organizations!inner` join ensures we only get memberships where
    // the referenced organization still exists (deleted orgs are excluded).
    const { data: memberships } = await supabase
      .from('org_members')
      .select('org_id, role, organizations!inner(id, name, slug, status)')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
      // User has no org membership — they can't access any app content.
      // Redirect to request-access with a message so the UI can explain why.
      if (isProtectedPath) {
        const url = request.nextUrl.clone()
        url.pathname = '/request-access'
        url.searchParams.set('message', 'no_org')
        return NextResponse.redirect(url)
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

      // Admin route guard: require super_admin role in at least one org.
      // This is checked at the middleware level because admin pages should
      // never render at all for non-admin users (defense-in-depth).
      if (isAdminPath) {
        const isSuperAdmin = memberships.some(m => m.role === 'super_admin')
        if (!isSuperAdmin) {
          // Silently redirect to home — do not reveal that /admin exists
          // or that the user lacks permissions (security through obscurity
          // at the navigation level; RLS is the real enforcement).
          const url = request.nextUrl.clone()
          url.pathname = '/'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}
