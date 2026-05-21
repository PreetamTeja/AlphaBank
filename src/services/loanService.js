// src/services/loanService.js
// Loan application, approval, and management.
// All loans stored in private Firestore loans/ collection.

import {
  doc, addDoc, updateDoc, getDocs, getDoc,
  collection, query, where, serverTimestamp,
} from 'firebase/firestore';
import { privateDb } from '../config/firebasePrivate';
import { BANK_ID } from '../config/constants';

const LOAN_TYPES = {
  personal:  { label: 'Personal Loan',   interestRate: 12 },
  home:      { label: 'Home Loan',        interestRate: 8.5 },
  education: { label: 'Education Loan',   interestRate: 9 },
  vehicle:   { label: 'Vehicle Loan',     interestRate: 10 },
  business:  { label: 'Business Loan',    interestRate: 14 },
};

export { LOAN_TYPES };

// Calculate EMI: P × r × (1+r)^n / ((1+r)^n - 1)
export const calculateEMI = (principalPaise, annualRate, months) => {
  const principal = principalPaise / 100;
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  const emi = principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi * 100); // return in paise
};

// Customer applies for a loan
export const applyLoan = async (customerId, { loanType, amountPaise, durationMonths, purpose }) => {
  const rate = LOAN_TYPES[loanType]?.interestRate ?? 12;
  const emi  = calculateEMI(amountPaise, rate, durationMonths);

  const ref = await addDoc(collection(privateDb, 'loans'), {
    customerId,
    bankId:          BANK_ID,
    loanType,
    amountPaise,
    durationMonths,
    purpose,
    interestRate:    rate,
    emiPaise:        emi,
    status:          'pending',
    appliedAt:       serverTimestamp(),
    reviewedAt:      null,
    reviewedBy:      null,
    rejectionReason: null,
    disbursedAt:     null,
  });
  return ref.id;
};

// Get loans for a specific customer
export const getMyLoans = async (customerId) => {
  const q    = query(collection(privateDb, 'loans'), where('customerId', '==', customerId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.appliedAt?.toMillis?.() ?? 0) - (a.appliedAt?.toMillis?.() ?? 0));
};

// Get all loans (admin)
export const getAllLoans = async () => {
  const q    = query(collection(privateDb, 'loans'), where('bankId', '==', BANK_ID));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.appliedAt?.toMillis?.() ?? 0) - (a.appliedAt?.toMillis?.() ?? 0));
};

// Get pending loans (admin)
export const getPendingLoans = async () => {
  const q    = query(collection(privateDb, 'loans'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Admin approves loan
export const approveLoan = async (loanId, staffUid) => {
  await updateDoc(doc(privateDb, 'loans', loanId), {
    status:     'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy: staffUid,
    disbursedAt: serverTimestamp(),
  });
};

// Admin rejects loan
export const rejectLoan = async (loanId, staffUid, reason) => {
  await updateDoc(doc(privateDb, 'loans', loanId), {
    status:          'rejected',
    reviewedAt:      serverTimestamp(),
    reviewedBy:      staffUid,
    rejectionReason: reason,
  });
};

// Admin puts loan on hold (pending further review)
export const holdLoan = async (loanId, staffUid, reason) => {
  await updateDoc(doc(privateDb, 'loans', loanId), {
    status:     'hold',
    reviewedAt: serverTimestamp(),
    reviewedBy: staffUid,
    holdReason: reason,
  });
};

// Get loans on hold (admin)
export const getHoldLoans = async () => {
  const q    = query(collection(privateDb, 'loans'), where('status', '==', 'hold'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
