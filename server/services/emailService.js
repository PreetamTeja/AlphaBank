// server/services/emailService.js
// NodeMailer email service — runs on the server only.

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST,
  port:   Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Verify connection on startup
transporter.verify((err) => {
  if (err) console.error('[MAIL] Connection failed:', err.message);
  else     console.log('[MAIL] Server ready to send emails');
});

// ── Email templates ────────────────────────────────────────────────────────────

const templates = {
  approved: (customerName, bankName) => ({
    subject: `Your KYC has been approved — ${bankName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#1E3A5F;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">${bankName}</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#1E3A5F;margin-top:0">KYC Approved ✅</h2>
          <p style="color:#4A5568">Dear <strong>${customerName}</strong>,</p>
          <p style="color:#4A5568">
            Congratulations! Your KYC verification has been <strong style="color:#059669">approved</strong>.
            Your bank account will be set up by our team shortly.
          </p>
          <p style="color:#4A5568">You will be able to access your account and start transacting once it is opened.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#718096;font-size:13px">This is an automated message from ${bankName}. Please do not reply.</p>
        </div>
      </div>`,
  }),

  hold: (customerName, bankName, reason) => ({
    subject: `Your KYC is on hold — ${bankName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#1E3A5F;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">${bankName}</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#1E3A5F;margin-top:0">KYC On Hold ⏸</h2>
          <p style="color:#4A5568">Dear <strong>${customerName}</strong>,</p>
          <p style="color:#4A5568">
            Your KYC verification has been put <strong style="color:#D97706">on hold</strong>.
          </p>
          ${reason ? `
          <div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:16px;margin:16px 0">
            <strong style="color:#92400E">Reason:</strong>
            <p style="color:#92400E;margin:8px 0 0">${reason}</p>
          </div>` : ''}
          <p style="color:#4A5568">Our team will contact you soon. Please ensure your documents are valid and try resubmitting.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#718096;font-size:13px">This is an automated message from ${bankName}.</p>
        </div>
      </div>`,
  }),

  rejected: (customerName, bankName, reason) => ({
    subject: `Your KYC was rejected — ${bankName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#1E3A5F;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">${bankName}</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#1E3A5F;margin-top:0">KYC Rejected ❌</h2>
          <p style="color:#4A5568">Dear <strong>${customerName}</strong>,</p>
          <p style="color:#4A5568">
            Unfortunately, your KYC verification has been <strong style="color:#DC2626">rejected</strong>.
          </p>
          ${reason ? `
          <div style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:16px;margin:16px 0">
            <strong style="color:#991B1B">Reason:</strong>
            <p style="color:#991B1B;margin:8px 0 0">${reason}</p>
          </div>` : ''}
          <p style="color:#4A5568">
            You may resubmit your KYC with the correct documents by logging into the app.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#718096;font-size:13px">This is an automated message from ${bankName}.</p>
        </div>
      </div>`,
  }),
};

// ── Send email ─────────────────────────────────────────────────────────────────

const sendKYCEmail = async ({ to, customerName, bankName, action, reason }) => {
  const template = templates[action]?.(customerName, bankName, reason);
  if (!template) throw new Error(`Unknown email action: ${action}`);

  const info = await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to,
    subject: template.subject,
    html:    template.html,
  });

  console.log(`[MAIL] Sent "${action}" email to ${to} — Message ID: ${info.messageId}`);
  return info;
};

module.exports = { sendKYCEmail };
