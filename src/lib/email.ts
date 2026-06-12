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

  // Fallback: console log in development
  return {
    sendMail: async (opts: { to: string; subject: string; html: string }) => {
      console.log('📧 EMAIL (dev mode — not sent):')
      console.log('  To:', opts.to)
      console.log('  Subject:', opts.subject)
      return { messageId: 'dev-mode' }
    }
  }
}

const FROM = process.env.EMAIL_FROM || 'noreply@advancehub.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function sendAccountApprovedEmail(to: string, name: string) {
  const transporter = getTransporter()
  await transporter.sendMail({
    to,
    subject: 'Your Advance Hub account has been approved',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e40af;">Account Approved</h2>
        <p>Hi ${name},</p>
        <p>Your Advance Hub account has been approved. You can now log in.</p>
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
  
  await transporter.sendMail({
    to,
    subject: 'Reset your Advance Hub password',
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
}
