import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export async function sendPasswordResetEmail(email: string, code: string) {
  const subject = 'Reset your FamFlow password'
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;font-size:48px;">🏡</div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1f2937;text-align:center;">Password Reset</h1>
      <p style="color:#6b7280;text-align:center;margin:0 0 32px;">Use the code below to reset your password. It expires in 15 minutes.</p>
      <div style="background:white;border-radius:12px;padding:24px;text-align:center;border:2px solid #e5e7eb;margin-bottom:24px;">
        <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:#667eea;font-family:monospace;">${code}</div>
      </div>
      <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">
        If you did not request this, ignore this email — your password remains unchanged.
      </p>
    </div>
  `

  if (resend) {
    await resend.emails.send({ from: FROM, to: email, subject, html })
  } else {
    // No email provider — log to console for development
    console.log(`\n[PASSWORD RESET] Code for ${email}: ${code}\n`)
  }
}

// ── Product-admin approval emails ──────────────────────────────────────────

/** Sent to the product admin when a new family-head registers (needs approval). */
export async function sendApprovalRequestEmail(
  adminEmail: string,
  pendingName: string,
  pendingEmail: string,
  familyName: string,
  approveUrl: string,
) {
  const subject = `[FamFlow] אישור רישום: ${pendingName} (${pendingEmail})`
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
      <div style="text-align:center;font-size:48px;margin-bottom:16px;">🏡</div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1f2937;text-align:center;">בקשת רישום חדשה</h1>
      <p style="color:#6b7280;text-align:center;margin:0 0 24px;">משתמש חדש ביקש להקים משפחה ב-FamFlow:</p>
      <div style="background:white;border-radius:12px;padding:20px;border:2px solid #e5e7eb;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#374151;"><strong>שם:</strong> ${pendingName}</p>
        <p style="margin:0 0 6px;color:#374151;"><strong>אימייל:</strong> ${pendingEmail}</p>
        <p style="margin:0;color:#374151;"><strong>שם המשפחה:</strong> ${familyName}</p>
      </div>
      <a href="${approveUrl}"
         style="display:block;padding:16px 24px;background:linear-gradient(135deg,#43e97b,#38f9d7);color:white;text-decoration:none;border-radius:14px;text-align:center;font-weight:800;font-size:16px;margin-bottom:16px;">
        ✅ אשר רישום
      </a>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">לחץ כדי לאשר ולאפשר למשתמש להתחיל.</p>
    </div>
  `

  if (resend) {
    await resend.emails.send({ from: FROM, to: adminEmail, subject, html })
  } else {
    console.log(`\n[APPROVAL REQUEST] ${pendingName} <${pendingEmail}> wants to create family "${familyName}"\nApprove: ${approveUrl}\n`)
  }
}

/** Sent to the new family-head after the admin approves. */
export async function sendRegistrationApprovedEmail(
  userEmail: string,
  userName: string,
  loginUrl: string,
) {
  const subject = '🎉 חשבון FamFlow שלך אושר!'
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
      <div style="text-align:center;font-size:48px;margin-bottom:16px;">🎉</div>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1f2937;text-align:center;">ברוך הבא, ${userName}!</h1>
      <p style="color:#6b7280;text-align:center;margin:0 0 28px;">הבקשה שלך אושרה — אפשר להתחיל!</p>
      <a href="${loginUrl}"
         style="display:block;padding:16px 24px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;text-decoration:none;border-radius:14px;text-align:center;font-weight:800;font-size:16px;margin-bottom:16px;">
        🚀 כניסה והקמת המשפחה
      </a>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">לאחר הכניסה תוכל להקים את המשפחה ולהזמין חברים.</p>
    </div>
  `

  if (resend) {
    await resend.emails.send({ from: FROM, to: userEmail, subject, html })
  } else {
    console.log(`\n[APPROVED] ${userName} <${userEmail}> is approved. Login: ${loginUrl}\n`)
  }
}

/** Sent to the product admin after approval — gives a revoke link. */
export async function sendRevokeNotificationEmail(
  adminEmail: string,
  userName: string,
  userEmail: string,
  familyName: string,
  revokeUrl: string,
) {
  const subject = `[FamFlow] אושר: ${userName} — קישור ביטול`
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
      <div style="text-align:center;font-size:48px;margin-bottom:16px;">✅</div>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1f2937;text-align:center;">אישרת את ${userName}</h1>
      <p style="color:#6b7280;text-align:center;margin:0 0 16px;">${userEmail} · משפחה: ${familyName}</p>
      <p style="color:#6b7280;text-align:center;margin:0 0 24px;font-size:13px;">שמור את הקישור הבא למקרה שתרצה לבטל גישה בעתיד:</p>
      <a href="${revokeUrl}"
         style="display:block;padding:14px 20px;background:#fee2e2;color:#991b1b;text-decoration:none;border-radius:14px;text-align:center;font-weight:800;font-size:14px;">
        🗑️ בטל גישה ומחק משפחה
      </a>
    </div>
  `

  if (resend) {
    await resend.emails.send({ from: FROM, to: adminEmail, subject, html })
  } else {
    console.log(`\n[REVOKE LINK] ${userName} <${userEmail}>. Revoke: ${revokeUrl}\n`)
  }
}

export const emailConfigured = !!process.env.RESEND_API_KEY
export { APP_URL }
