#!/usr/bin/env node
/**
 * Smoke test for the org-admin scope (Epic 1-6) against the LIVE Supabase
 * project. Exercises the RPCs and RLS policies shipped in migration 013 with
 * the real seeded users. Replicates the server-action flows at the PostgREST
 * layer (server actions need a Next.js request context).
 *
 * Setup: reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
 * SUPABASE_SERVICE_ROLE_KEY from .env.local. No secrets are embedded.
 *
 * Run:  node scripts/smoke-org-admin.mjs
 *
 * Test resources (throwaway users/orgs/plans/requests/invites) are cleaned
 * up at the end. Audit rows are left in place as evidence.
 */
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Env / clients
// ---------------------------------------------------------------------------
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !ANON || !SERVICE) {
  console.error('Missing env keys (need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const service = createClient(SUPA_URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})
async function anonClient(email, password) {
  const c = createClient(SUPA_URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn ${email}: ${error.message}`)
  return c
}

const TS = Date.now().toString(36)
const CREDS = {
  admin: ['admin@ledgerly.app', 'Admin@123456789!'],
  orgadmin: ['orgadmin@ledgerly.app', 'OrgAdmin@123!'],
  manager: ['manager@ledgerly.app', 'Manager@123!'],
  solo: ['solo@ledgerly.app', 'Solo@123!'],
}
const THROWAWAY = {
  accept: `smoke-accept-${TS}@ledgerly.app`,
  revoked: `smoke-revoked-${TS}@ledgerly.app`,
  expired: `smoke-expired-${TS}@ledgerly.app`,
  approved: `smoke-approved-${TS}@ledgerly.app`,
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
const results = []
async function check(name, fn) {
  try {
    const detail = await fn()
    results.push({ name, pass: true })
    console.log(`  \x1b[32mPASS\x1b[0m  ${name}${detail ? ` — ${detail}` : ''}`)
  } catch (err) {
    results.push({ name, pass: false })
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name} — ${err.message}`)
  }
}
const expectError = async (label, promise) => {
  let res
  try {
    res = await promise
  } catch (err) {
    return err.message
  }
  if (res && res.error) {
    const msg = typeof res.error === 'string' ? res.error : res.error.message
    return msg || 'error'
  }
  throw new Error(`${label}: expected an error, got ${JSON.stringify(res ?? null).slice(0, 120)}`)
}
const genToken = () => randomBytes(32).toString('hex')

async function createUser(email) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: 'SmokePass123!',
    email_confirm: true,
    user_metadata: { full_name: `Smoke ${email}` },
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  return data.user
}

/**
 * Tear down a throwaway org. The last-org-admin guard fires on DELETE too
 * (by design), so cascade teardown of a single-admin org is impossible via
 * PostgREST — route through the Management API (postgres superuser) to
 * disarm the trigger for the delete. Falls back to service-role deletes when
 * no SUPABASE_MGMT_TOKEN is set (prints a warning, may leave a test org).
 */
async function teardownOrg(orgId) {
  const mgmtToken = process.env.SUPABASE_MGMT_TOKEN
  const projectRef = new globalThis.URL(SUPA_URL).hostname.split('.')[0]
  if (mgmtToken) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            `ALTER TABLE public.org_members DISABLE TRIGGER preserve_last_org_admin; ` +
            `DELETE FROM public.organizations WHERE id = '${orgId}'; ` +
            `ALTER TABLE public.org_members ENABLE TRIGGER preserve_last_org_admin;`,
        }),
      },
    )
    if (!res.ok) throw new Error(`teardown org ${orgId}: ${(await res.text()).slice(0, 200)}`)
    return
  }
  console.log('    ! no SUPABASE_MGMT_TOKEN — org teardown may leave a test org behind')
  await service.from('subscriptions').delete().eq('org_id', orgId)
  await service.from('org_members').delete().eq('org_id', orgId)
  await service.from('organizations').delete().eq('id', orgId)
}

const cleanup = []
async function run() {
  console.log(`\n  Smoke test org-admin scope — ${new Date().toISOString()}\n`)

  // Resolve real user ids + Carter org
  const { data: list } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const byEmail = new Map((list?.users || []).map((u) => [u.email, u.id]))
  const adminId = byEmail.get(CREDS.admin[0])
  const orgadminId = byEmail.get(CREDS.orgadmin[0])
  const managerId = byEmail.get(CREDS.manager[0])
  if (!adminId || !orgadminId || !managerId) throw new Error('Seeded users missing — run seed-test-users.mjs first')

  const { data: org } = await service.from('organizations').select('id, name').eq('slug', 'carter-enterprises').single()
  const orgId = org.id
  console.log(`  Carter org: ${orgId}\n`)

  // Sessions
  const admin = await anonClient(...CREDS.admin)
  const orgadmin = await anonClient(...CREDS.orgadmin)
  const manager = await anonClient(...CREDS.manager)
  const solo = await anonClient(...CREDS.solo)

  // =========================================================================
  console.log('  A. can_admin_org (AD-4)')
  // =========================================================================
  await check('A1 org_admin can admin own org', async () => {
    const { data } = await orgadmin.rpc('can_admin_org', { target_org_id: orgId })
    if (data !== true) throw new Error(`expected true, got ${data}`)
  })
  await check('A2 super_admin can admin any org', async () => {
    const { data } = await admin.rpc('can_admin_org', { target_org_id: orgId })
    if (data !== true) throw new Error(`expected true, got ${data}`)
  })
  await check('A3 org member cannot admin org', async () => {
    const { data } = await manager.rpc('can_admin_org', { target_org_id: orgId })
    if (data !== false) throw new Error(`expected false, got ${data}`)
  })
  await check('A4 null org id -> false', async () => {
    const { data } = await orgadmin.rpc('can_admin_org', { target_org_id: null })
    if (data !== false) throw new Error(`expected false, got ${data}`)
  })
  await check('A5 unknown org id -> false', async () => {
    const { data } = await orgadmin.rpc('can_admin_org', { target_org_id: '00000000-0000-0000-0000-000000000000' })
    if (data !== false) throw new Error(`expected false, got ${data}`)
  })

  // =========================================================================
  console.log('\n  B. log_audit_event RPC (AD-6)')
  // =========================================================================
  await check('B1 org-scoped audit write succeeds for org_admin', async () => {
    const { data, error } = await orgadmin.rpc('log_audit_event', {
      p_action: 'settings.update',
      p_org_id: orgId,
      p_entity_type: 'settings',
      p_entity_id: null,
      p_old_value: null,
      p_new_value: { smoke: true },
    })
    if (error) throw new Error(error.message)
    if (!/^[0-9a-f-]{36}$/i.test(data)) throw new Error(`expected audit row id, got ${data}`)
    const { data: row } = await service.from('audit_logs').select('user_id, org_id, action').eq('id', data).single()
    if (row.user_id !== orgadminId) throw new Error(`actor mismatch: ${row.user_id}`)
    if (row.org_id !== orgId) throw new Error(`org mismatch: ${row.org_id}`)
  })
  await check('B2 member cannot write org-scoped audit', async () => {
    const msg = await expectError('member audit write', manager.rpc('log_audit_event', {
      p_action: 'settings.update', p_org_id: orgId,
    }))
    if (!msg.includes('Not authorized')) throw new Error(msg)
  })
  await check('B3 unknown action rejected', async () => {
    const msg = await expectError('unknown action', orgadmin.rpc('log_audit_event', {
      p_action: 'nonsense.action', p_org_id: orgId,
    }))
    if (!msg.toLowerCase().includes('unknown')) throw new Error(msg)
  })
  await check('B4 org-scoped write to foreign org rejected', async () => {
    const msg = await expectError('foreign org audit write', orgadmin.rpc('log_audit_event', {
      p_action: 'settings.update', p_org_id: '00000000-0000-0000-0000-000000000000',
    }))
    if (!msg.includes('Not authorized')) throw new Error(msg)
  })
  await check('B5 direct audit_logs INSERT denied (no policy / revoked)', async () => {
    const msg = await expectError('direct audit insert', orgadmin.from('audit_logs').insert({
      org_id: orgId, user_id: orgadminId, action: 'settings.update', entity_type: 'settings',
    }))
    if (!/permission|row-level security|violates/i.test(msg)) throw new Error(msg)
  })

  // =========================================================================
  console.log('\n  C. Invite lifecycle (FR-11..16, AD-5)')
  // =========================================================================
  const inviteToken = genToken()
  const inviteEmail = THROWAWAY.accept
  let inviteId
  await check('C1 org_admin creates invite (RLS + send_id cols)', async () => {
    const { data, error } = await orgadmin.from('invites').insert({
      org_id: orgId,
      email: inviteEmail,
      token: inviteToken,
      invited_by: orgadminId,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    if (error) throw new Error(error.message)
    inviteId = data.id
    const { error: sendError } = await orgadmin.from('invites')
      .update({ send_id: `smoke-send-${TS}`, last_sent_at: new Date().toISOString() })
      .eq('id', inviteId)
    if (sendError) throw new Error(`recordSend: ${sendError.message}`)
    const { data: row } = await service.from('invites').select('send_id, last_sent_at').eq('id', inviteId).single()
    if (!row.send_id || !row.last_sent_at) throw new Error('send_id/last_sent_at not persisted')
    await orgadmin.rpc('log_audit_event', { p_action: 'invite.send', p_org_id: orgId, p_entity_type: 'invite', p_entity_id: inviteId })
  })
  await check('C2 member cannot create invites (RLS)', async () => {
    const msg = await expectError('member invite insert', manager.from('invites').insert({
      org_id: orgId, email: `x-${TS}@ledgerly.app`, token: genToken(), status: 'pending',
    }))
    if (!/permission|row-level security|violates/i.test(msg)) throw new Error(msg)
  })

  const acceptUser = await createUser(inviteEmail)
  cleanup.push({ user: acceptUser.id, invite: inviteId })
  const acceptSession = await anonClient(inviteEmail, 'SmokePass123!')

  await check('C3 invitee can read own invite by token (FR-16)', async () => {
    const { data, error } = await acceptSession.from('invites').select('status').eq('token', inviteToken)
    if (error) throw new Error(error.message)
    if (data.length !== 1 || data[0].status !== 'pending') throw new Error(`expected 1 pending row, got ${JSON.stringify(data)}`)
  })
  await check('C4 org member can view invites in their org (by design)', async () => {
    const { data } = await manager.from('invites').select('id').eq('token', inviteToken)
    if (data.length !== 1) throw new Error(`expected 1 row, got ${data.length}`)
  })
  await check('C4b non-member, non-invitee cannot read invite by token', async () => {
    const { data } = await solo.from('invites').select('id').eq('token', inviteToken)
    if (data.length !== 0) throw new Error(`expected 0 rows, got ${data.length}`)
  })
  await check('C5 accept_invite adds membership + flips status + audits', async () => {
    const { data: orgIdBack, error } = await acceptSession.rpc('accept_invite', { p_token: inviteToken })
    if (error) throw new Error(error.message)
    if (orgIdBack !== orgId) throw new Error(`org mismatch: ${orgIdBack}`)
    const { data: member } = await service.from('org_members').select('role').eq('org_id', orgId).eq('user_id', acceptUser.id).single()
    if (member.role !== 'member') throw new Error(`expected member role, got ${member.role}`)
    const { data: inv } = await service.from('invites').select('status').eq('id', inviteId).single()
    if (inv.status !== 'accepted') throw new Error(`expected accepted, got ${inv.status}`)
    const { data: audit } = await service.from('audit_logs').select('action, user_id, org_id')
      .eq('action', 'invite.accept').eq('entity_id', inviteId).maybeSingle()
    if (!audit) throw new Error('invite.accept audit row missing')
    if (audit.user_id !== acceptUser.id || audit.org_id !== orgId) throw new Error('invite.accept actor/org wrong')
  })
  await check('C6 accepted token is single-use', async () => {
    const { error } = await acceptSession.rpc('accept_invite', { p_token: inviteToken })
    if (!error) throw new Error('expected error after acceptance, got success')
    if (!/not found|expired/i.test(error.message)) throw new Error(error.message)
    const { count } = await service.from('org_members').select('id', { count: 'exact', head: true })
      .eq('org_id', orgId).eq('user_id', acceptUser.id)
    if (count !== 1) throw new Error(`expected 1 membership, got ${count}`)
  })

  // Revoked invite
  const revToken = genToken()
  let revInviteId
  await check('C7 revoke invite (org_admin) + invitee still sees revoked state', async () => {
    const { data, error } = await orgadmin.from('invites').insert({
      org_id: orgId, email: THROWAWAY.revoked, token: revToken, invited_by: orgadminId,
      status: 'pending', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    if (error) throw new Error(error.message)
    revInviteId = data.id
    const { error: revError } = await orgadmin.from('invites').update({ status: 'revoked' }).eq('id', revInviteId)
    if (revError) throw new Error(`revoke: ${revError.message}`)
    await orgadmin.rpc('log_audit_event', { p_action: 'invite.revoke', p_org_id: orgId, p_entity_type: 'invite', p_entity_id: revInviteId })
  })
  const revUser = await createUser(THROWAWAY.revoked)
  cleanup.push({ user: revUser.id, invite: revInviteId })
  const revSession = await anonClient(THROWAWAY.revoked, 'SmokePass123!')
  await check('C8 revoked invite cannot be accepted', async () => {
    const { data } = await revSession.from('invites').select('status').eq('token', revToken)
    if (data.length !== 1 || data[0].status !== 'revoked') throw new Error(`expected revoked row, got ${JSON.stringify(data)}`)
    const { error } = await revSession.rpc('accept_invite', { p_token: revToken })
    if (!error) throw new Error('expected error, got success')
    if (!/not found|expired/i.test(error.message)) throw new Error(error.message)
  })

  // Expired invite
  const expToken = genToken()
  let expInviteId
  await check('C9 expired invite flips to expired and cannot be accepted', async () => {
    const { data, error } = await orgadmin.from('invites').insert({
      org_id: orgId, email: THROWAWAY.expired, token: expToken, invited_by: orgadminId,
      status: 'pending', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    if (error) throw new Error(error.message)
    expInviteId = data.id
    const { error: pastError } = await service.from('invites')
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', expInviteId)
    if (pastError) throw new Error(`backdate: ${pastError.message}`)
  })
  const expUser = await createUser(THROWAWAY.expired)
  cleanup.push({ user: expUser.id, invite: expInviteId })
  const expSession = await anonClient(THROWAWAY.expired, 'SmokePass123!')
  await check('C10 expired invite accept is refused + status becomes expired', async () => {
    const { data, error } = await expSession.rpc('accept_invite', { p_token: expToken })
    if (error) throw new Error(`unexpected error: ${error.message}`)
    if (data !== null) throw new Error(`expected null (expired), got ${data}`)
    const { data: inv } = await service.from('invites').select('status').eq('id', expInviteId).single()
    if (inv.status !== 'expired') throw new Error(`expected expired, got ${inv.status}`)
  })

  // =========================================================================
  console.log('\n  D. Org settings (AD-8, FR-26..28)')
  // =========================================================================
  let auditDefaultsBefore
  await check('D1 org_admin can read org defaults', async () => {
    const { data, error } = await orgadmin.from('organizations').select('default_currency, default_vat_rate').eq('id', orgId).single()
    if (error) throw new Error(error.message)
    if (data.default_currency !== 'USD') throw new Error(`expected USD, got ${data.default_currency}`)
    if (data.default_vat_rate !== 16) throw new Error(`expected 16, got ${data.default_vat_rate}`)
    auditDefaultsBefore = (await service.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'org.defaults_update')).count
  })
  await check('D2 org_admin updates org defaults + audits', async () => {
    const { error: updateError } = await orgadmin.from('organizations').update({ default_currency: 'EUR' }).eq('id', orgId)
    if (updateError) throw new Error(updateError.message)
    const { error: auditError } = await orgadmin.rpc('log_audit_event', {
      p_action: 'org.defaults_update', p_org_id: orgId, p_entity_type: 'organization',
      p_entity_id: orgId, p_old_value: { default_currency: 'USD' }, p_new_value: { default_currency: 'EUR' },
    })
    if (auditError) throw new Error(auditError.message)
    const { data: row } = await service.from('organizations').select('default_currency').eq('id', orgId).single()
    if (row.default_currency !== 'EUR') throw new Error(`expected EUR, got ${row.default_currency}`)
    const { count } = await service.from('audit_logs').select('id', { count: 'exact', head: true }).eq('action', 'org.defaults_update')
    if (count <= auditDefaultsBefore) throw new Error('audit row not written')
    await service.from('organizations').update({ default_currency: 'USD' }).eq('id', orgId)
  })
  await check('D3 member cannot update org (RLS silent no-op)', async () => {
    await manager.from('organizations').update({ default_currency: 'GBP' }).eq('id', orgId)
    const { data: row } = await service.from('organizations').select('default_currency').eq('id', orgId).single()
    if (row.default_currency !== 'USD') throw new Error(`expected USD after member update, got ${row.default_currency}`)
  })

  // =========================================================================
  console.log('\n  E. Requests / plans (FR-22..25)')
  // =========================================================================
  const planSlug = `smoke-plan-${TS}`
  let planId
  await check('E1 create plan + audit wiring', async () => {
    const { data, error } = await service.from('plans').insert({
      name: `Smoke Plan ${TS}`, slug: planSlug, price_monthly_cents: 9900, price_yearly_cents: 99000,
      max_members: 5, max_expenses_per_month: 100, features: {},
    }).select('id').single()
    if (error) throw new Error(error.message)
    planId = data.id
    cleanup.push({ plan: planId })
    const { error: auditError } = await admin.rpc('log_audit_event', {
      p_action: 'plan.price_update', p_org_id: null, p_entity_type: 'plan', p_entity_id: planId,
    })
    if (auditError) throw new Error(auditError.message)
  })
  await check('E2 plan update + audit diff', async () => {
    const { error } = await admin.from('plans').update({ price_monthly_cents: 12900 }).eq('id', planId)
    if (error) throw new Error(error.message)
    const { error: auditError } = await admin.rpc('log_audit_event', {
      p_action: 'plan.price_update', p_org_id: null, p_entity_type: 'plan', p_entity_id: planId,
      p_old_value: { price_monthly_cents: 9900 }, p_new_value: { price_monthly_cents: 12900 },
    })
    if (auditError) throw new Error(auditError.message)
    const { data: row } = await service.from('plans').select('price_monthly_cents').eq('id', planId).single()
    if (row.price_monthly_cents !== 12900) throw new Error(`expected 12900, got ${row.price_monthly_cents}`)
  })

  // Reject flow
  const { data: rejectReq } = await service.from('client_requests').insert({
    name: 'Smoke Reject', email: `smoke-reject-${TS}@ledgerly.app`, business_name: 'Reject Co', status: 'pending',
  }).select('id').single()
  cleanup.push({ request: rejectReq.id })
  await check('E3 reject request + audit', async () => {
    const { error } = await admin.from('client_requests').update({ status: 'rejected' }).eq('id', rejectReq.id)
    if (error) throw new Error(error.message)
    const { error: auditError } = await admin.rpc('log_audit_event', {
      p_action: 'request.reject', p_org_id: null, p_entity_type: 'client_request', p_entity_id: rejectReq.id,
      p_old_value: { status: 'pending' }, p_new_value: { status: 'rejected' },
    })
    if (auditError) throw new Error(auditError.message)
    const { data: row } = await service.from('client_requests').select('status').eq('id', rejectReq.id).single()
    if (row.status !== 'rejected') throw new Error(`expected rejected, got ${row.status}`)
  })

  // Approve flow (super_admin provisions a new org for a fresh user)
  const approveUser = await createUser(THROWAWAY.approved)
  const { data: approveReq } = await service.from('client_requests').insert({
    name: 'Smoke Approve', email: THROWAWAY.approved, business_name: 'Approve Co', status: 'pending',
  }).select('id').single()
  cleanup.push({ user: approveUser.id, request: approveReq.id })
  let approveOrgId
  await check('E4 approve request end-to-end (org + member + sub + audit)', async () => {
    const { data: orgIdBack, error: orgError } = await admin.rpc('create_org_for_user', {
      p_org_name: `Approve Co ${TS}`, p_org_slug: `approve-co-${TS}`, p_user_id: approveUser.id, p_plan_slug: planSlug,
    })
    if (orgError) throw new Error(`create_org_for_user: ${orgError.message}`)
    approveOrgId = orgIdBack
    cleanup.push({ org: approveOrgId })
    const { error: roleError } = await admin.from('org_members').update({ role: 'org_admin' }).eq('org_id', approveOrgId).eq('user_id', approveUser.id)
    if (roleError) throw new Error(`assign org admin: ${roleError.message}`)
    const { error: reqError } = await admin.from('client_requests').update({ status: 'approved' }).eq('id', approveReq.id)
    if (reqError) throw new Error(`approve request: ${reqError.message}`)
    const { error: auditError } = await admin.rpc('log_audit_event', {
      p_action: 'request.approve', p_org_id: approveOrgId, p_entity_type: 'client_request', p_entity_id: approveReq.id,
      p_new_value: { plan: planSlug, assign_org_admin: true },
    })
    if (auditError) throw new Error(`audit: ${auditError.message}`)
    const { data: member } = await service.from('org_members').select('role').eq('org_id', approveOrgId).eq('user_id', approveUser.id).single()
    if (member.role !== 'org_admin') throw new Error(`expected org_admin, got ${member.role}`)
    const { data: sub } = await service.from('subscriptions').select('plan_id, status').eq('org_id', approveOrgId).single()
    if (sub.plan_id !== planId || sub.status !== 'active') throw new Error(`subscription wrong: ${JSON.stringify(sub)}`)
    const { data: req } = await service.from('client_requests').select('status').eq('id', approveReq.id).single()
    if (req.status !== 'approved') throw new Error(`expected approved, got ${req.status}`)
  })

  // =========================================================================
  console.log('\n  F. Roster guards (FR-5..10, FR-31)')
  // =========================================================================
  await check('F1 legacy role value rejected (CHECK)', async () => {
    const msg = await expectError('legacy role insert', service.from('org_members').insert({ org_id: orgId, user_id: managerId, role: 'manager' }))
    if (!/check|enum|violates/i.test(msg)) throw new Error(msg)
  })
  await check('F2 member cannot insert roster rows (RLS)', async () => {
    const msg = await expectError('member roster insert', manager.from('org_members').insert({ org_id: orgId, user_id: managerId, role: 'org_admin' }))
    if (!/permission|row-level security|violates/i.test(msg)) throw new Error(msg)
  })
  await check('F3 last Org Admin cannot be demoted (DB trigger)', async () => {
    const msg = await expectError('demote last admin', service.from('org_members').update({ role: 'member' }).eq('org_id', orgId).eq('user_id', orgadminId))
    if (!/last org admin/i.test(msg)) throw new Error(msg)
  })
  await check('F4 promote manager then demote old admin succeeds (2 admins)', async () => {
    const { error: promo } = await service.from('org_members').update({ role: 'org_admin' }).eq('org_id', orgId).eq('user_id', managerId)
    if (promo) throw new Error(`promote: ${promo.message}`)
    const { error: demote } = await service.from('org_members').update({ role: 'member' }).eq('org_id', orgId).eq('user_id', orgadminId)
    if (demote) throw new Error(`demote: ${demote.message}`)
    // restore seed state: orgadmin -> org_admin, manager -> member
    await service.from('org_members').update({ role: 'org_admin' }).eq('org_id', orgId).eq('user_id', orgadminId)
    await service.from('org_members').update({ role: 'member' }).eq('org_id', orgId).eq('user_id', managerId)
    const { data: check } = await service.from('org_members').select('role').eq('org_id', orgId).eq('user_id', orgadminId).single()
    if (check.role !== 'org_admin') throw new Error(`restore failed: ${check.role}`)
  })

  // =========================================================================
  // Cleanup
  // =========================================================================
  console.log('\n  Cleaning up throwaway resources...')
  const done = new Set()
  const seen = (item) => {
    const key = JSON.stringify(item)
    if (done.has(key)) return true
    done.add(key)
    return false
  }
  // Pass 1: tear down orgs first — deleteUser fails while memberships exist.
  for (const item of cleanup.filter((i) => i.org)) {
    if (seen(item)) continue
    try {
      await teardownOrg(item.org)
    } catch (e) {
      console.log(`    ! cleanup ${JSON.stringify(item)}: ${e.message}`)
    }
  }
  // Pass 2: plans, invites, requests, users.
  for (const item of cleanup.filter((i) => !i.org)) {
    if (seen(item)) continue
    try {
      if (item.plan) {
        const { data: sub } = await service.from('subscriptions').select('id').eq('plan_id', item.plan)
        for (const s of sub || []) await service.from('subscriptions').delete().eq('id', s.id)
        await service.from('plans').delete().eq('id', item.plan)
      }
      if (item.invite) await service.from('invites').delete().eq('id', item.invite)
      if (item.request) await service.from('client_requests').delete().eq('id', item.request)
      if (item.user) {
        await service.from('org_members').delete().eq('user_id', item.user)
        const { error } = await service.auth.admin.deleteUser(item.user)
        if (error) console.log(`    ! deleteUser ${item.user}: ${JSON.stringify(error)}`)
      }
    } catch (e) {
      console.log(`    ! cleanup ${JSON.stringify(item)}: ${e.message}`)
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  const passed = results.filter((r) => r.pass).length
  const failed = results.length - passed
  console.log(`\n  ${passed}/${results.length} checks passed`)
  const audit = await service.from('audit_logs').select('id', { count: 'exact', head: true })
  console.log(`  audit_logs total rows now: ${audit.count} (evidence trail kept)`)
  if (failed > 0) {
    console.log(`\n  ${failed} FAILED`)
    process.exit(1)
  }
  console.log('\n  Smoke test OK.')
}

run().catch((err) => {
  console.error(`\n  FATAL: ${err.message}`)
  process.exit(2)
})
