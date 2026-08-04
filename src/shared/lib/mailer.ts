/**
 * @fileoverview Single mailer module for Ledgerly (AD-7).
 *
 * All transactional email goes through this module. It is backed by Resend
 * when `RESEND_API_KEY` is present (server env only). In development —
 * identified by the `DEV_EMAIL_*` vars or a missing key — it logs a no-op
 * with a generated send-id so delivery is still observable.
 *
 * Every send returns a `sendId` so callers can correlate the outbound
 * email with the originating invite/request row (NFR-5).
 */

import { Resend } from 'resend'

export interface SendResult {
  /** Opaque send id used for delivery correlation/logging. */
  sendId: string
  /** True when the provider accepted (or a dev no-op completed). */
  delivered: boolean
  /** Provider error message when delivery failed. */
  error?: string
}

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.DEV_EMAIL_FROM ||
    'Ledgerly <onboarding@resend.dev>'
  )
}

/** True when running outside a real transactional provider (dev). */
function isDevMode(): boolean {
  return !process.env.RESEND_API_KEY || Boolean(process.env.DEV_EMAIL_LOG)
}

/**
 * Send an org membership invitation email.
 */
export async function sendInviteEmail(input: {
  to: string
  token: string
  orgName: string
  invitedByName?: string
}): Promise<SendResult> {
  const sendId = `send_${crypto.randomUUID()}`

  if (isDevMode()) {
    console.log(
      `[mailer:dev] ${sendId} -> ${input.to} | join ${input.orgName} | ` +
        `${getSiteUrl()}/invite?token=${input.token} | invited by ${input.invitedByName || 'org admin'}`
    )
    return { sendId, delivered: true }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: [input.to],
    subject: `You're invited to join ${input.orgName} on Ledgerly`,
    html: [
      `<p>${input.invitedByName || 'An admin'} invited you to join <strong>${input.orgName}</strong> on Ledgerly.</p>`,
      `<p>Accept the invite to start tracking expenses together:</p>`,
      `<p><a href="${getSiteUrl()}/invite?token=${input.token}">Accept invite</a></p>`,
      `<p>This link expires in 7 days. If you did not expect this email, you can ignore it.</p>`,
    ].join('\n'),
  })

  if (error) {
    console.error(`[mailer] ${sendId} failed for ${input.to}: ${error.message}`)
    return { sendId, delivered: false, error: error.message }
  }

  console.log(`[mailer] ${sendId} -> ${input.to} | ${data?.id || 'ok'}`)
  return { sendId, delivered: true }
}

/**
 * Send a welcome/sign-in link to a newly provisioned client account so they
 * can set their own password and log in (FR-22, AD-5 — called only after the
 * user/org DB commit has succeeded).
 */
export async function sendWelcomeEmail(input: {
  to: string
  orgName: string
}): Promise<SendResult> {
  const sendId = `send_${crypto.randomUUID()}`

  if (isDevMode()) {
    console.log(`[mailer:dev] ${sendId} -> ${input.to} | welcome to ${input.orgName}`)
    return { sendId, delivered: true }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: [input.to],
    subject: `Welcome to ${input.orgName} on Ledgerly`,
    html: [
      `<p>Your account for <strong>${input.orgName}</strong> has been approved.</p>`,
      `<p><a href="${getSiteUrl()}/login">Log in to Ledgerly</a> to get started.</p>`,
    ].join('\n'),
  })

  if (error) {
    console.error(`[mailer] ${sendId} failed for ${input.to}: ${error.message}`)
    return { sendId, delivered: false, error: error.message }
  }

  console.log(`[mailer] ${sendId} -> ${input.to} | ${data?.id || 'ok'}`)
  return { sendId, delivered: true }
}
