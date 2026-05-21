// src/services/kycService.js

import {
  doc, setDoc, updateDoc, getDoc, getDocs,
  collection, query, where, serverTimestamp,
} from 'firebase/firestore';
import { privateDb } from '../config/firebasePrivate';
import { sendKYCEmail } from './emailService';

export const submitKYC = async (uid, data) => {
  await setDoc(doc(privateDb, 'kyc', uid), {
    customerId:      uid,
    fullName:        data.fullName,
    pan:             data.pan,
    aadhaarLast4:    data.aadhaarLast4,
    dob:             data.dob,
    address:         data.address,
    docType:         data.docType,
    status:          'pending',
    submittedAt:     serverTimestamp(),
    reviewedAt:      null,
    reviewedBy:      null,
    rejectionReason: null,
    holdReason:      null,
  });
  await updateDoc(doc(privateDb, 'customers', uid), {
    kycStatus: 'pending',
    updatedAt: serverTimestamp(),
  });
};

export const getKYC = async (uid) => {
  const snap = await getDoc(doc(privateDb, 'kyc', uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const getPendingKYC = async () => {
  const q    = query(collection(privateDb, 'kyc'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getHoldKYC = async () => {
  const q    = query(collection(privateDb, 'kyc'), where('status', '==', 'hold'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getApprovedKYC = async () => {
  const q    = query(collection(privateDb, 'kyc'), where('status', '==', 'approved'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const approveKYC = async (customerId, staffUid, customerEmail, customerName) => {
  await updateDoc(doc(privateDb, 'kyc', customerId), {
    status: 'approved', reviewedAt: serverTimestamp(), reviewedBy: staffUid,
  });
  await updateDoc(doc(privateDb, 'customers', customerId), {
    kycStatus: 'approved', updatedAt: serverTimestamp(),
  });
  // Send email notification
  await sendKYCEmail(customerEmail, customerName, 'approved');
};

export const holdKYC = async (customerId, staffUid, reason, customerEmail, customerName) => {
  await updateDoc(doc(privateDb, 'kyc', customerId), {
    status: 'hold', reviewedAt: serverTimestamp(), reviewedBy: staffUid, holdReason: reason,
  });
  await updateDoc(doc(privateDb, 'customers', customerId), {
    kycStatus: 'hold', updatedAt: serverTimestamp(),
  });
  await sendKYCEmail(customerEmail, customerName, 'hold', reason);
};

export const rejectKYC = async (customerId, staffUid, reason, customerEmail, customerName) => {
  await updateDoc(doc(privateDb, 'kyc', customerId), {
    status: 'rejected', reviewedAt: serverTimestamp(), reviewedBy: staffUid, rejectionReason: reason,
  });
  await updateDoc(doc(privateDb, 'customers', customerId), {
    kycStatus: 'rejected', updatedAt: serverTimestamp(),
  });
  await sendKYCEmail(customerEmail, customerName, 'rejected', reason);
};
