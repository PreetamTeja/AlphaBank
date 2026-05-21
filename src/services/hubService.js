// src/services/hubService.js
// Manages all interactions with the shared Firebase hub.
// Bank B uses startIncomingListener() to detect and process incoming transfers.
// Bank A uses startStatusListener() to track the completion of sent transfers.

import {
  collection, doc, query, where, onSnapshot, getDocs,
  setDoc, serverTimestamp,
} from 'firebase/firestore';
import { hubDb }  from '../config/firebaseHub';
import { BANK_ID, BANK_NAME, BANK_IFSC } from '../config/constants';
import { processIncomingTransfer, syncTransactionStatus } from './transactionService';

// ── Incoming transfer listener (runs on Bank B's instance) ───────────────────
// Listens for pending transfers addressed to THIS bank in the hub.
// When a new doc appears: validate → credit → update hub status.
//
// Returns an unsubscribe function — call it on component unmount or logout.

export const startIncomingListener = (onProcessed, onError) => {
  console.log(`[HUB LISTENER] Starting incoming listener for bankId: ${BANK_ID}`);
  const q = query(
    collection(hubDb, 'interbank_transfers'),
    where('toBankId', '==', BANK_ID),
    where('status',   '==', 'pending'),
  );

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    console.log(`[HUB LISTENER] Snapshot fired — ${snapshot.docChanges().length} change(s)`);
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const transfer = { id: change.doc.id, ...change.doc.data() };
        console.log(`[HUB LISTENER] New transfer detected:`, transfer.transferId, 'amount:', transfer.amount);
        try {
          await processIncomingTransfer(transfer);
          console.log(`[HUB LISTENER] Processed successfully:`, transfer.transferId);
          onProcessed?.(transfer);
        } catch (err) {
          console.error(`[HUB LISTENER] Processing failed:`, transfer.transferId, err.message);
          onError?.(transfer, err);
        }
      }
    }
  }, (err) => {
    console.error('[HUB LISTENER] onSnapshot error:', err.code, err.message);
    onError?.(null, err);
  });

  return unsubscribe;
};

// ── Outgoing transfer status listener (runs on Bank A's instance) ─────────────
// Watches hub for status changes on transfers sent BY this bank.
// When status becomes completed/failed: sync local private DB transaction.

export const startStatusListener = (onStatusChange) => {
  const q = query(
    collection(hubDb, 'interbank_transfers'),
    where('fromBankId', '==', BANK_ID),
    where('status',     'in', ['completed', 'failed']),
  );

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added' || change.type === 'modified') {
        const transfer = { id: change.doc.id, ...change.doc.data() };
        if (transfer.status === 'pending') continue; // Skip pending

        console.log(`[HUB] Transfer ${transfer.transferId} status → ${transfer.status}`);
        try {
          await syncTransactionStatus(transfer.transferId, transfer.status, transfer.failureReason);
          onStatusChange?.(transfer);
        } catch (err) {
          console.error('[HUB] Status sync error:', err);
        }
      }
    }
  });

  return unsubscribe;
};

// ── Register this bank in the hub registry ────────────────────────────────────
// Called once during setup. Idempotent — safe to call on every app start.

export const registerBankInHub = async () => {
  try {
    await setDoc(doc(hubDb, 'banks', BANK_ID), {
      bankId:    BANK_ID,
      bankName:  BANK_NAME,
      ifscPrefix: BANK_IFSC.slice(0, 4),
      isActive:  true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    // Non-fatal — hub rules may restrict this write; admin does it manually
    console.warn('[HUB] Could not register bank in hub:', err.message);
  }
};

// ── Register a public account routing entry ───────────────────────────────────
// Called when a new account is created, so other banks can route to it.
// Stores ONLY masked account number — no balance, no customer PII.

export const registerPublicAccount = async (accountId, accountNumber) => {
  const masked = '••••' + String(accountNumber).slice(-4);
  try {
    await setDoc(doc(hubDb, 'public_accounts', accountId), {
      accountId,
      bankId:              BANK_ID,
      maskedAccountNumber: masked,
      ifscCode:            BANK_IFSC,
      isActive:            true,
      registeredAt:        serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[HUB] Could not register public account:', err.message);
  }
};

// ── Fetch all registered banks from hub ───────────────────────────────────────
// Used to populate the "Destination Bank" dropdown in Send Money form.

export const getAllBanks = async () => {
  try {
    const snap = await getDocs(collection(hubDb, 'banks'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
};
