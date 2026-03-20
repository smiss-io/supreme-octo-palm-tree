import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResend(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required')
    }
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  const resend = getResend()
  return resend.emails.send({
    from: from ?? 'KidSpark <noreply@kidspark.app>',
    to,
    subject,
    html,
  })
}

// Pre-built email senders for common flows
export async function sendVerificationEmail(email: string, userName: string, verifyUrl: string) {
  return sendEmail({
    to: email,
    subject: 'Verify your email address — KidSpark',
    html: buildVerifyEmailHtml(userName, verifyUrl),
  })
}

export async function sendPasswordResetEmail(email: string, userName: string, resetUrl: string) {
  return sendEmail({
    to: email,
    subject: 'Reset your password — KidSpark',
    html: buildResetPasswordHtml(userName, resetUrl),
  })
}

export async function sendStaffInviteEmail(
  email: string,
  organizationName: string,
  inviterName: string,
  role: string,
  acceptUrl: string
) {
  return sendEmail({
    to: email,
    subject: `You've been invited to join ${organizationName} on KidSpark`,
    html: buildStaffInviteHtml(organizationName, inviterName, role, acceptUrl),
  })
}

// Simple HTML builders (used when React Email render is not available server-side)
function buildVerifyEmailHtml(userName: string, verifyUrl: string): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #1B2D6B; font-size: 24px;">Verify your email address</h1>
      <p style="color: #374151; font-size: 16px; line-height: 24px;">
        Hi ${escapeHtml(userName)}, please verify your email address by clicking the button below.
        This link expires in 24 hours.
      </p>
      <a href="${escapeHtml(verifyUrl)}" style="background-color: #1B2D6B; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 12px 24px; text-decoration: none;">
        Verify Email
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
        If you didn't create a KidSpark account, you can safely ignore this email.
      </p>
    </div>
  `
}

function buildResetPasswordHtml(userName: string, resetUrl: string): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #1B2D6B; font-size: 24px;">Reset your password</h1>
      <p style="color: #374151; font-size: 16px; line-height: 24px;">
        Hi ${escapeHtml(userName)}, we received a request to reset your password.
        Click the button below to choose a new password. This link expires in 1 hour.
      </p>
      <a href="${escapeHtml(resetUrl)}" style="background-color: #1B2D6B; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 12px 24px; text-decoration: none;">
        Reset Password
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `
}

function buildStaffInviteHtml(
  organizationName: string,
  inviterName: string,
  role: string,
  acceptUrl: string
): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="color: #1B2D6B; font-size: 24px;">You've been invited!</h1>
      <p style="color: #374151; font-size: 16px; line-height: 24px;">
        ${escapeHtml(inviterName)} has invited you to join
        <strong>${escapeHtml(organizationName)}</strong> as a <strong>${escapeHtml(role)}</strong>
        on KidSpark.
      </p>
      <a href="${escapeHtml(acceptUrl)}" style="background-color: #1B2D6B; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: 600; padding: 12px 24px; text-decoration: none;">
        Accept Invite
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
        This invitation expires in 7 days.
      </p>
    </div>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
