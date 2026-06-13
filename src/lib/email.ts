// src/lib/email.ts
import nodemailer from 'nodemailer'

function getTransporter() {
  // Using Resend's SMTP (free tier: 100/day)
  // Alternatively works with any SMTP provider
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    })
  }

  // Generic SMTP (e.g. Gmail with an App Password — no domain required)
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587)
    console.log(`[email] using SMTP transport host=${process.env.SMTP_HOST} port=${port} user=${process.env.SMTP_USER}`)
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  // Fallback: console log in development
  return {
    sendMail: async (opts: { from?: string; to: string; subject: string; html: string }) => {
      console.log('📧 EMAIL (dev mode — not sent):')
      console.log('  To:', opts.to)
      console.log('  Subject:', opts.subject)
      return { messageId: 'dev-mode' }
    }
  }
}

const FROM = process.env.EMAIL_FROM || 'noreply@asianahub.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function sendAccountApprovedEmail(to: string, name: string) {
  const transporter = getTransporter()
  await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Your Asiana Hub account has been approved',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e40af;">Account Approved</h2>
        <p>Hi ${name},</p>
        <p>Your Asiana Hub account has been approved. You can now log in.</p>
        <a href="${APP_URL}/login" 
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Log In Now
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">
          If you did not register for this account, please ignore this email.
        </p>
      </div>
    `
  })
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const transporter = getTransporter()
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Reset your Asiana Hub password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e40af;">Password Reset</h2>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <p style="color:#ef4444;"><strong>This link expires in 1 hour.</strong></p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">
          If you did not request this, please ignore this email. Your password will not change.
        </p>
      </div>
    `
  })
  console.log(`[email] password reset sent to=${to} messageId=${info?.messageId}`)
}

export async function sendNewRequestNotification(
  recipients: string[],
  details: {
    requestId: number
    studentName: string
    icNumber: string
    amount: number
    frequency: number
    requesterName: string
    remark?: string | null
  }
) {
  if (recipients.length === 0) return
  const transporter = getTransporter()
  const url = `${APP_URL}/advance-requests/${details.requestId}`
  const remarkRow = details.remark
    ? `<tr><td style="padding:4px 0;color:#6b7280;">Remark</td><td style="padding:4px 0;font-weight:600;">${details.remark}</td></tr>`
    : ''

  const info = await transporter.sendMail({
    from: FROM,
    to: FROM,
    // BCC so recipients don't see each other's addresses
    bcc: recipients.join(','),
    subject: `New advance request: ${details.studentName} — RM${details.amount}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e40af;">New Money Advance Request</h2>
        <p>A new advance request has been submitted and is waiting for approval.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          <tr><td style="padding:4px 0;color:#6b7280;">Student</td><td style="padding:4px 0;font-weight:600;">${details.studentName}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">IC Number</td><td style="padding:4px 0;font-weight:600;">${details.icNumber}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Amount</td><td style="padding:4px 0;font-weight:600;">RM${details.amount}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Frequency</td><td style="padding:4px 0;font-weight:600;">#${details.frequency} this month</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Submitted by</td><td style="padding:4px 0;font-weight:600;">${details.requesterName}</td></tr>
          ${remarkRow}
        </table>
        <a href="${url}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
          Review Request
        </a>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">
          You're receiving this because you are an approver or administrator on Asiana Hub.
        </p>
      </div>
    `
  })
  console.log(`[email] new-request notification sent to ${recipients.length} recipient(s) messageId=${info?.messageId}`)
}
