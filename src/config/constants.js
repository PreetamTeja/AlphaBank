// src/config/constants.js
export const BANK_ID    = import.meta.env.VITE_BANK_ID;
export const BANK_NAME  = import.meta.env.VITE_BANK_NAME;
export const BANK_IFSC  = import.meta.env.VITE_IFSC_CODE;
export const BANK_COLOR = import.meta.env.VITE_BANK_COLOR || 'blue';
export const HUB_BANK_EMAIL    = import.meta.env.VITE_HUB_BANK_EMAIL;
export const HUB_BANK_PASSWORD = import.meta.env.VITE_HUB_BANK_PASSWORD;

export const TRANSFER_MODES = {
  INTERNAL: 'internal',
  IMPS:     'imps',
  NEFT:     'neft',
};

export const ACCOUNT_TYPES = ['savings', 'current', 'salary', 'fd'];

export const TXN_STATUS = {
  PENDING:   'pending',
  COMPLETED: 'completed',
  FAILED:    'failed',
};
