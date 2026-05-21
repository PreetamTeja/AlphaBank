// src/services/transactionService.js
//
// ALL balance mutations use Firestore runTransaction() for atomicity.
// Interbank transfers use a two-phase approach:
//   Phase 1 → atomic deduction in private DB + local pending record
//   Phase 2 → write transfer request to shared hub Firestore
//
// Without Cloud Functions, Phase 1 and Phase 2 are NOT globally atomic.
// If Phase 2 fails, the local record is marked 'failed' for manual review.

import {
  doc, collection, runTransaction, setDoc, updateDoc, getDoc,
  serverTimestamp, query, where, getDocs,
} from 'firebase/firestore';
import { privateDb } from '../config/firebasePrivate';
import { hubDb }     from '../config/firebaseHub';
import { BANK_ID }   from '../config/constants';

// src/services/transactionService.js - Fixed transfer functions
 
// ── Intrabank transfer ────────────────────────────────────────────────────────

// Creates ONLY one record per account view (debit for sender, credit for receiver)

// But when fetching for a specific account, we only show relevant direction
 
export const intrabankTransfer = async ({

  fromAccountId,

  toAccountId,

  amountPaise,

  mode = 'internal',

  remarks = '',

}) => {

  if (fromAccountId === toAccountId) throw new Error('Cannot transfer to the same account.');
 
  const fromRef = doc(privateDb, 'accounts', fromAccountId);

  const toRef = doc(privateDb, 'accounts', toAccountId);

  const transferId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
 
  await runTransaction(privateDb, async (txn) => {

    const [fromSnap, toSnap] = await Promise.all([txn.get(fromRef), txn.get(toRef)]);
 
    if (!fromSnap.exists()) throw new Error('Sender account not found.');

    if (!toSnap.exists()) throw new Error('Recipient account not found.');

    if (fromSnap.data().status !== 'active') throw new Error('Sender account is not active.');

    if (toSnap.data().status !== 'active') throw new Error('Recipient account is not active.');

    if (fromSnap.data().balance < amountPaise) throw new Error('Insufficient balance.');
 
    const now = serverTimestamp();

    const newFromBalance = fromSnap.data().balance - amountPaise;

    const newToBalance = toSnap.data().balance + amountPaise;
 
    txn.update(fromRef, { balance: newFromBalance, updatedAt: now });

    txn.update(toRef, { balance: newToBalance, updatedAt: now });
 
    // Create ONE debit record for the sender

    txn.set(doc(privateDb, 'transactions', `${transferId}_DEBIT`), {

      transactionId: transferId,

      type: 'intrabank_transfer',

      direction: 'debit',

      fromAccountId,

      toAccountId,

      fromBankId: BANK_ID,

      toBankId: BANK_ID,

      amount: amountPaise,

      currency: 'INR',

      status: 'completed',

      mode,

      remarks,

      createdAt: now,

      completedAt: now,

      balanceAfter: newFromBalance,

    });
 
    // Create ONE credit record for the receiver

    txn.set(doc(privateDb, 'transactions', `${transferId}_CREDIT`), {

      transactionId: transferId,

      type: 'intrabank_transfer',

      direction: 'credit',

      fromAccountId,

      toAccountId,

      fromBankId: BANK_ID,

      toBankId: BANK_ID,

      amount: amountPaise,

      currency: 'INR',

      status: 'completed',

      mode,

      remarks,

      createdAt: now,

      completedAt: now,

      balanceAfter: newToBalance,

    });

  });
 
  return transferId;

};
 
// ── Interbank transfer — Phase 1: deduct + local pending ─────────────────────
 
export const initiateInterbankTransfer = async ({

  fromAccountId,

  toAccountId,

  toBankId,

  amountPaise,

  mode,

  remarks = '',

}) => {

  const fromRef = doc(privateDb, 'accounts', fromAccountId);

  const transferId = `IBT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
 
  // Phase 1: atomic deduction in private DB

  await runTransaction(privateDb, async (txn) => {

    const fromSnap = await txn.get(fromRef);

    if (!fromSnap.exists()) throw new Error('Sender account not found.');

    if (fromSnap.data().status !== 'active') throw new Error('Account is not active.');

    if (fromSnap.data().balance < amountPaise) throw new Error('Insufficient balance.');
 
    const newBalance = fromSnap.data().balance - amountPaise;

    txn.update(fromRef, {

      balance: newBalance,

      updatedAt: serverTimestamp(),

    });

    // Create ONE debit record for the sender (pending status)

    txn.set(doc(privateDb, 'transactions', `${transferId}_DEBIT`), {

      transactionId: transferId,

      type: 'interbank_transfer',

      direction: 'debit',

      fromAccountId,

      toAccountId,

      fromBankId: BANK_ID,

      toBankId,

      amount: amountPaise,

      currency: 'INR',

      status: 'pending',

      mode,

      remarks,

      createdAt: serverTimestamp(),

      completedAt: null,

      failureReason: null,

      balanceAfter: newBalance,

    });

  });
 
  // Phase 2: write to shared hub

  try {

    console.log('[TRANSFER] Writing to hub:', transferId, '→', toBankId);

    await setDoc(doc(hubDb, 'interbank_transfers', transferId), {

      transferId,

      fromBankId: BANK_ID,

      toBankId,

      fromAccountId,

      toAccountId,

      amount: amountPaise,

      currency: 'INR',

      mode,

      status: 'pending',

      createdAt: serverTimestamp(),

      completedAt: null,

      failureReason: null,

    });

    console.log('[TRANSFER] Hub write success:', transferId);

  } catch (hubError) {

    console.error('[TRANSFER] Hub write FAILED:', hubError.code, hubError.message);

    // Update the transaction to failed

    await updateDoc(doc(privateDb, 'transactions', `${transferId}_DEBIT`), {

      status: 'failed',

      failureReason: `Hub write failed: ${hubError.message}`,

      completedAt: serverTimestamp(),

    });

    throw new Error(`Hub write failed: ${hubError.message}`);

  }
 
  return transferId;

};
 
// ── Process an incoming interbank transfer (called by Bank B's hub listener) ──
//
// CRITICAL FIX: toAccountId in the hub document is the ACCOUNT NUMBER string
// (e.g. "123456789012") that the sender typed into the Send Money form —
// NOT the Firestore document ID. We must resolve it first before crediting.

export const processIncomingTransfer = async (hubTransfer) => {
  const { transferId, fromBankId, fromAccountId, toAccountId, amount } = hubTransfer;

  const localRef = doc(privateDb, 'transactions', transferId);
  const hubRef   = doc(hubDb,     'interbank_transfers', transferId);

  // Step 1: Resolve account NUMBER → Firestore document ID
  console.log('[PROCESS] Resolving account number:', toAccountId);
  const acctSnap = await getDocs(
    query(collection(privateDb, 'accounts'), where('accountNumber', '==', toAccountId))
  );

  if (acctSnap.empty) {
    console.error('[PROCESS] Account number not found:', toAccountId);
    await updateDoc(hubRef, {
      status:        'failed',
      failureReason: `Recipient account number "${toAccountId}" not found in this bank.`,
      completedAt:   serverTimestamp(),
    });
    return;
  }

  const toDocId = acctSnap.docs[0].id;
  const toRef   = doc(privateDb, 'accounts', toDocId);
  console.log('[PROCESS] Resolved account doc ID:', toDocId, '— crediting', amount, 'paise');

  // Step 2: Atomic credit via runTransaction
  try {
    await runTransaction(privateDb, async (txn) => {
      const toSnap    = await txn.get(toRef);
      const localSnap = await txn.get(localRef);

      // Duplicate guard — transferId is the idempotency key
      if (localSnap.exists()) throw new Error('DUPLICATE');

      if (!toSnap.exists()) throw new Error('Recipient account not found.');
      if (toSnap.data().status !== 'active') throw new Error('Recipient account is not active.');

      const newBalance = toSnap.data().balance + amount;

      txn.update(toRef, { balance: newBalance, updatedAt: serverTimestamp() });

      // Store the resolved doc ID, not the account number
      txn.set(localRef, {
        transactionId: transferId,
        type:          'interbank_transfer',
        direction:     'credit',
        fromAccountId,
        toAccountId:   toDocId,
        fromBankId,
        toBankId:      BANK_ID,
        amount,
        currency:      'INR',
        status:        'completed',
        mode:          hubTransfer.mode,
        createdAt:     serverTimestamp(),
        completedAt:   serverTimestamp(),
        failureReason: null,
      });
    });

    await updateDoc(hubRef, { status: 'completed', completedAt: serverTimestamp() });
    console.log('[PROCESS] Transfer', transferId, 'completed — balance updated.');

  } catch (err) {
    if (err.message === 'DUPLICATE') {
      console.log('[PROCESS] Transfer', transferId, 'already processed — skipping.');
      return;
    }
    console.error('[PROCESS] Credit failed:', err.message);
    await updateDoc(hubRef, {
      status:        'failed',
      failureReason: err.message,
      completedAt:   serverTimestamp(),
    });
    throw err;
  }
};

// ── Sync local transaction status from hub update ─────────────────────────────

export const syncTransactionStatus = async (transferId, status, failureReason = null) => {
  const ref  = doc(privateDb, 'transactions', transferId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  if (snap.data().direction !== 'debit') return; // only sync sender side
  await updateDoc(ref, {
    status,
    ...(failureReason && { failureReason }),
    completedAt: serverTimestamp(),
  });
};

// ── Rollback a stuck/failed interbank debit ───────────────────────────────────
//
// Eligible:  type === 'interbank_transfer' AND direction === 'debit'
//            AND status is 'pending' OR 'failed'
//
// For 'pending': cancel hub record first so the receiving bank cannot credit
//               the recipient after we have already refunded the sender.
// For 'failed':  hub record was never written (or is already failed), safe to
//               refund without touching the hub.
//
// The operation is NOT globally atomic (two different Firestore projects), but
// is idempotent — re-running on an already rolled-back transaction is rejected.

export const rollbackTransaction = async (transactionId, staffUid) => {
  const txnRef    = doc(privateDb, 'transactions', transactionId);
  const hubRef    = doc(hubDb, 'interbank_transfers', transactionId);
  const refundRef = doc(collection(privateDb, 'transactions'));

  // ── 1. Read the local transaction record ──────────────────────────────────
  const txnSnap = await getDoc(txnRef);
  if (!txnSnap.exists()) throw new Error('Transaction not found.');

  const txn = txnSnap.data();
  if (txn.type !== 'interbank_transfer')
    throw new Error('Only interbank transfers can be rolled back.');
  if (txn.direction !== 'debit')
    throw new Error('Only debit-side transactions can be rolled back.');
  if (!['pending', 'failed'].includes(txn.status))
    throw new Error(`Transaction status is "${txn.status}" — rollback not allowed.`);

  const accountRef = doc(privateDb, 'accounts', txn.fromAccountId);

  // ── 2. Cancel the hub record first (for pending transfers) ────────────────
  //    This prevents the receiving bank from crediting the recipient after we
  //    have returned funds to the sender.
  if (txn.status === 'pending') {
    try {
      const hubSnap = await getDoc(hubRef);
      if (hubSnap.exists() && hubSnap.data().status === 'pending') {
        await updateDoc(hubRef, {
          status:        'cancelled',
          failureReason: `Rolled back by staff (uid: ${staffUid})`,
          completedAt:   serverTimestamp(),
        });
      }
      // If hub record is already cancelled/completed/failed, proceed regardless.
    } catch (hubErr) {
      // Hub is unreachable — refuse to proceed to avoid double-credit risk.
      throw new Error(`Cannot reach transfer hub to cancel: ${hubErr.message}. Rollback aborted.`);
    }
  }

  // ── 3. Atomically refund sender + mark transaction rolled_back ─────────────
  await runTransaction(privateDb, async (t) => {
    const [accSnap, freshTxnSnap] = await Promise.all([
      t.get(accountRef),
      t.get(txnRef),
    ]);

    if (!accSnap.exists()) throw new Error('Sender account not found.');

    const freshStatus = freshTxnSnap.data()?.status;
    if (freshStatus === 'rolled_back')
      throw new Error('This transaction has already been rolled back.');
    if (freshStatus === 'completed')
      throw new Error('Transaction already completed — rollback not permitted.');

    const newBalance = (accSnap.data().balance ?? 0) + txn.amount;

    // Refund sender balance
    t.update(accountRef, { balance: newBalance, updatedAt: serverTimestamp() });

    // Mark original transaction as rolled back
    t.update(txnRef, {
      status:       'rolled_back',
      rolledBackAt: serverTimestamp(),
      rolledBackBy: staffUid,
    });

    // Record the refund credit so it appears in the account history
    t.set(refundRef, {
      transactionId: refundRef.id,
      type:          'rollback',
      direction:     'credit',
      fromAccountId: txn.fromAccountId,
      toAccountId:   txn.fromAccountId,
      fromBankId:    txn.toBankId,
      toBankId:      txn.fromBankId,
      amount:        txn.amount,
      currency:      'INR',
      status:        'completed',
      mode:          'rollback',
      remarks:       `Refund for rolled-back transfer (ref: ${transactionId})`,
      originalTxnId: transactionId,
      rolledBackBy:  staffUid,
      createdAt:     serverTimestamp(),
      completedAt:   serverTimestamp(),
    });
  });

  return refundRef.id;
};

// Get all pending interbank debits (rollback candidates)
export const getPendingInterbankDebits = async () => {
  const snap = await getDocs(
    query(
      collection(privateDb, 'transactions'),
      where('type',      '==', 'interbank_transfer'),
      where('direction', '==', 'debit'),
      where('status',    '==', 'pending'),
    )
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
};

// ── Read transactions from private DB ─────────────────────────────────────────

// src/services/transactionService.js - Fix transaction fetching
 
export const getTransactionsByAccount = async (accountId) => {

  // Query both debit and credit transactions for this account

  const [debitSnap, creditSnap] = await Promise.all([

    getDocs(query(collection(privateDb, 'transactions'), where('fromAccountId', '==', accountId))),

    getDocs(query(collection(privateDb, 'transactions'), where('toAccountId', '==', accountId))),

  ]);

  // Use Map to prevent duplicates (by transactionId, not document ID)

  const map = new Map();

  debitSnap.docs.forEach(d => {

    const data = d.data();

    // Use transactionId as key to group related transactions

    map.set(data.transactionId, { 

      id: d.id, 

      ...data,

      // For debit, the account is the sender

      direction: 'debit',

    });

  });

  creditSnap.docs.forEach(d => {

    const data = d.data();

    // Don't override if already exists (would be weird), but if exists,

    // we want to show the direction from THIS account's perspective

    if (map.has(data.transactionId)) {

      const existing = map.get(data.transactionId);

      // If both exist, keep the one that shows direction from this account

      // (already handled by separate queries)

    } else {

      map.set(data.transactionId, { 

        id: d.id, 

        ...data,

        direction: 'credit',

      });

    }

  });

  return [...map.values()].sort((a, b) =>

    (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)

  );

};

 export const getAllTransactions = async () => {
  const snap = await getDocs(collection(privateDb, 'transactions'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
};
