const nodemailer = require("nodemailer");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const FROM_EMAIL = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || "safemom.support@gmail.com";
const FROM_NAME = process.env.BREVO_SENDER_NAME || "SafeMom";

/* ──────────────────────────────────────────────────────────────────────────────
   Core send helper — routes through Brevo when available,
   falls back to SMTP for local development.
   ────────────────────────────────────────────────────────────────────────────── */

/**
 * Send an email.
 * 1. Tries Brevo transactional email API first (if BREVO_API_KEY is set)
 * 2. If Brevo fails or key is missing, falls back to nodemailer / Gmail SMTP
 */
async function sendEmail({ to, subject, html, text }) {
  // ── Brevo API path ─────────────────────────────────────────────────────────
  const brevoKey = process.env.BREVO_API_KEY;
  let sentViaBrevo = false;

  if (brevoKey) {
    try {
      const recipients = Array.isArray(to)
        ? to.map((email) => ({ email: email.trim() }))
        : to.split(",").map((email) => ({ email: email.trim() }));

      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": brevoKey,
        },
        body: JSON.stringify({
          sender: { name: FROM_NAME, email: FROM_EMAIL },
          to: recipients,
          subject,
          htmlContent: html || undefined,
          textContent: text || undefined,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "unknown");
        console.warn(`[Email] Brevo API error (${res.status}): ${errBody} — Falling back to SMTP...`);
      } else {
        console.log("[Email] Sent via Brevo to", to);
        sentViaBrevo = true;
        return true;
      }
    } catch (err) {
      console.warn(`[Email] Brevo fetch failed: ${err.message} — Falling back to SMTP...`);
    }
  }

  // ── SMTP fallback (if Brevo failed or is not configured) ─────────────────
  if (!sentViaBrevo) {
    const transporter = getSmtpTransporter();
    if (!transporter) {
      console.log("[Email] Both Brevo and SMTP are missing/failed — skipping email to", to);
      return false;
    }

    await transporter.sendMail({ from: FROM_EMAIL, to, subject, html, text });
    console.log("[Email] Sent fallback via SMTP to", to);
    return true;
  }
}

/**
 * Build a nodemailer transporter (only used when POWER_AUTOMATE_URL is NOT set)
 */
function getSmtpTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  if (host) {
    return nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  }
  // Gmail default
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    family: 4,
  });
}

// Keep backward-compat export so test-smtp route still works
function getTransporter() {
  if (process.env.BREVO_API_KEY) {
    // Return a duck-typed object so the /test-smtp route can call verify()
    return {
      verify: async () => true,
      sendMail: async (opts) => sendEmail(opts),
    };
  }
  return getSmtpTransporter();
}

/* ──────────────────────────────────────────────────────────────────────────────
   Individual email functions — templates are UNCHANGED, only the send call
   at the bottom of each function is swapped to use sendEmail().
   ────────────────────────────────────────────────────────────────────────────── */

/**
 * Send email verification link
 */
async function sendVerificationEmail(email, token) {
  const verifyUrl = `${FRONTEND_URL}/verify-email/${token}`;

  return sendEmail({
    to: email,
    subject: "SafeMom — Verify your email address",
    html: `
      <div style="font-family: 'Comic Sans MS', 'Comic Sans', cursive, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7f9f4; border-radius: 16px;">
        <h2 style="color: #7c3aed; font-weight: normal; margin-top: 20px;">Welcome to SafeMom! 💜</h2>
        <p style="margin-top: 20px; line-height: 1.5; font-weight: bold; color: #111;">Thank you for signing up. Please verify your email<br/>address by clicking the button below:</p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${verifyUrl}" 
             style="background: linear-gradient(135deg, #7c3aed, #db2777); color: white; padding: 14px 40px; 
                    text-decoration: none; border-radius: 16px; font-weight: normal; font-size: 16px;
                    display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Or copy and paste this link in your browser:<br/>
          <a href="${verifyUrl}" style="color: #6d28d9; word-break: break-all; text-decoration: none;">${verifyUrl}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 20px; margin-bottom: 30px;">This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; font-style: italic; margin-bottom: 20px;">
          This is an automated email from SafeMom. If you didn't<br/>create an account, please ignore this email.
        </p>
      </div>
    `.trim(),
    text: `Welcome to SafeMom! Verify your email by visiting: ${verifyUrl} (Expires in 24 hours)`,
  });
}

/**
 * Send password reset link
 */
async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  return sendEmail({
    to: email,
    subject: "SafeMom — Reset your password",
    html: `
      <div style="font-family: 'Comic Sans MS', 'Comic Sans', cursive, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed; font-weight: normal;">Password Reset Request 🔒</h2>
        <p>We received a request to reset your SafeMom password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #7c3aed, #db2777); color: white; padding: 14px 32px; 
                    text-decoration: none; border-radius: 12px; font-weight: normal; font-size: 16px;
                    display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link in your browser:<br/>
          <a href="${resetUrl}" style="color: #7c3aed;">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px; font-style: italic;">
          This is an automated email from SafeMom.
        </p>
      </div>
    `.trim(),
    text: `Reset your SafeMom password by visiting: ${resetUrl} (Expires in 1 hour)`,
  });
}

/**
 * Send login success alert
 */
async function sendLoginSuccessEmail(email, name) {
  const date = new Date().toLocaleString();

  return sendEmail({
    to: email,
    subject: "SafeMom — New Login to Your Account",
    html: `
      <div style="font-family: 'Comic Sans MS', 'Comic Sans', cursive, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7f9f4; border-radius: 16px;">
        <h2 style="color: #7c3aed; font-weight: normal; margin-top: 20px;">Hello ${name},</h2>
        <p style="margin-top: 20px; line-height: 1.5; color: #111;">We're writing to let you know that a successful<br/>login to your SafeMom account occurred on<br/>${date}.</p>
        <p style="margin-top: 20px; line-height: 1.5; color: #111;">If this was you, you can safely ignore this email.</p>
        <p style="color: #dc2626; margin-top: 20px; line-height: 1.5;">If you did not log in recently, please reset your<br/>password immediately to secure your account.</p>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${FRONTEND_URL}/forgot-password" 
             style="background: #f7f9f4; color: #dc2626; border: 1px solid #dc2626; padding: 12px 30px; 
                    text-decoration: none; border-radius: 10px; font-size: 16px;
                    display: inline-block;">
            Secure My Account
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px; font-style: italic; margin-bottom: 20px;">
          This is an automated security alert from SafeMom.
        </p>
      </div>
    `.trim(),
    text: `New login to your SafeMom account on ${date}. If this wasn't you, secure your account at ${FRONTEND_URL}/forgot-password`,
  });
}

/**
 * Send account deletion confirmation
 */
async function sendAccountDeletionEmail(email, name) {
  const date = new Date().toLocaleString();

  return sendEmail({
    to: email,
    subject: "SafeMom — Your Account Has Been Deleted",
    html: `
      <div style="font-family: 'Comic Sans MS', 'Comic Sans', cursive, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7f9f4; border-radius: 16px;">
        <h2 style="color: #dc2626; font-weight: normal; margin-top: 20px;">Account Deleted 🗑️</h2>
        <p style="margin-top: 20px; line-height: 1.5; color: #111;">Hello <strong>${name}</strong>,</p>
        <p style="line-height: 1.5; color: #111;">
          Your SafeMom account associated with <strong>${email}</strong> was permanently deleted on <strong>${date}</strong>.
        </p>
        <p style="line-height: 1.5; color: #111;">
          All your personal data, health records, and profile information have been permanently removed from our system.
        </p>
        <p style="color: #dc2626; margin-top: 20px; line-height: 1.5;">
          If you did <strong>not</strong> request this deletion, please contact us immediately — someone may have accessed your account.
        </p>
        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px; font-style: italic; margin-bottom: 20px;">
          This is an automated notification from SafeMom. Thank you for using our service.
        </p>
      </div>
    `.trim(),
    text: `Hello ${name}, your SafeMom account (${email}) was permanently deleted on ${date}. If you did not request this, please contact us immediately.`,
  });
}

/**
 * Send contact form message to support team
 */
async function sendContactEmailToSupport(name, email, message) {
  return sendEmail({
    to: "safemom.support@gmail.com",
    subject: `New Contact Message: ${name}`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); padding: 32px 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">New Support Message</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 15px;">Via Contact Form</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px;">
          <!-- User Details -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #f1f5f9;">
            <div style="margin-bottom: 16px;">
              <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; margin-bottom: 4px;">From</span>
              <span style="display: block; font-size: 16px; color: #0f172a; font-weight: 500;">${escapeHtml(name)}</span>
            </div>
            <div>
              <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; margin-bottom: 4px;">Email Address</span>
              <a href="mailto:${escapeHtml(email)}" style="color: #7c3aed; text-decoration: none; font-size: 16px; font-weight: 500;">${escapeHtml(email)}</a>
            </div>
          </div>

          <!-- Message Body -->
          <div>
            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; margin: 0 0 16px 0;">Message Content</h3>
            <div style="background-color: #ffffff; border-left: 4px solid #db2777; padding: 20px 24px; color: #334155; font-size: 16px; line-height: 1.6; border-radius: 0 12px 12px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.02); border-top: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
              ${escapeHtml(message).replace(/\n/g, '<br/>')}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
          <a href="mailto:${escapeHtml(email)}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">Reply to User</a>
          <p style="margin: 20px 0 0 0; font-size: 13px; color: #94a3b8;">SafeMom Automated Contact System</p>
        </div>
      </div>
    `.trim(),
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
  });
}

/**
 * Send auto-reply to user who submitted contact form
 */
async function sendContactAutoReply(name, email) {
  return sendEmail({
    to: email,
    subject: "SafeMom — We've received your message",
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%); padding: 32px 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Message Received! 💜</h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px;">
          <h2 style="color: #0f172a; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">Hi ${escapeHtml(name)},</h2>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for reaching out to <strong>SafeMom</strong>! This is an automated message to let you know that we've received your inquiry and our support team is reviewing it.
          </p>
          
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
            We aim to respond to all messages within 24 hours. If your inquiry is urgent and requires immediate medical attention, please do not wait for our email response.
          </p>

          <!-- Urgent Contact Box -->
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 20px; text-align: center;">
            <p style="color: #be123c; font-size: 14px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">For Urgent Matters</p>
            <p style="color: #e11d48; font-size: 18px; font-weight: 700; margin: 0;">Call us at: +91 1800-SAFEMOM</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
            This is an automated reply. Please do not reply directly to this email.<br/>
            &copy; ${new Date().getFullYear()} SafeMom Healthcare Pvt. Ltd.
          </p>
        </div>
      </div>
    `.trim(),
    text: `Hi ${name},\n\nThank you for reaching out to SafeMom! We've received your message and our team will get back to you as soon as possible.\n\nIf your inquiry is urgent, please call us at +91 1800-SAFEMOM.`,
  });
}

function escapeHtml(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendLoginSuccessEmail,
  sendAccountDeletionEmail,
  sendContactEmailToSupport,
  sendContactAutoReply,
  getTransporter,
};
