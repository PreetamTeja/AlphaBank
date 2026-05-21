// server/index.js
// Express backend — handles email notifications via NodeMailer.
// Run: cd server && npm install && npm run dev

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const { sendKYCEmail } = require('./services/emailService');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Send KYC email ─────────────────────────────────────────────────────────────
// POST /api/send-email
// Body: { to, customerName, bankName, action, reason }
app.post('/api/send-email', async (req, res) => {
  const { to, customerName, bankName, action, reason } = req.body;

  if (!to || !customerName || !action) {
    return res.status(400).json({ error: 'Missing required fields: to, customerName, action' });
  }
  if (!['approved', 'hold', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be: approved | hold | rejected' });
  }

  try {
    const info = await sendKYCEmail({ to, customerName, bankName, action, reason });
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('[SERVER] Email send failed:', err.message);
    // Return 200 so the KYC action isn't blocked by email failure
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[SERVER] BMS email server running on http://localhost:${PORT}`);
});
