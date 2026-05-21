// src/services/emailService.js
// Calls the Express backend which uses NodeMailer to send emails.

import { BANK_NAME } from '../config/constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const sendKYCEmail = async (toEmail, customerName, action, reason = '') => {
  try {
    const res = await fetch(`${API_URL}/api/send-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:           toEmail,
        customerName,
        bankName:     BANK_NAME,
        action,
        reason,
      }),
    });
    const data = await res.json();
    if (!data.success) {
      console.warn('[EMAIL] Server reported failure:', data.error);
    } else {
      console.log('[EMAIL] Sent successfully:', data.messageId);
    }
  } catch (err) {
    // Non-fatal — email failure should never block KYC actions
    console.warn('[EMAIL] Could not reach email server:', err.message);
    console.warn('Make sure the backend is running: cd server && npm run dev');
  }
};
