// src/context/NotificationContext.jsx
// Writes notifications to Firestore — NO toast popups.
// Notifications appear in the /notifications page only.
 
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { privateDb } from '../config/firebasePrivate';
import { startIncomingListener, startStatusListener } from '../services/hubService';
import { paiseToRupees } from '../utils/formatters';
import { useAuth } from './AuthContext';
 
const NotificationContext = createContext(null);
 
// Write to Firestore notifications collection — shows up in Notifications page
const pushNotification = async (type, message, relatedTxnId = null) => {
  try {
    await addDoc(collection(privateDb, 'notifications'), {
      type, message, relatedTxnId,
      isRead:    false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[NOTIF] Failed to write notification:', err.message);
  }
};
 
export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const unsubRefs = useRef([]);
 
  const clearListeners = () => {
    unsubRefs.current.forEach(fn => fn?.());
    unsubRefs.current = [];
  };
 
  useEffect(() => {
    if (!user) {
      clearListeners();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
 
    // 1. Listen to unread notifications for badge count
    const notifQ = query(
      collection(privateDb, 'notifications'),
      where('isRead', '==', false),
    );
    const unsubNotif = onSnapshot(notifQ, (snap) => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setNotifications(docs);
      setUnreadCount(docs.length);
    });
    unsubRefs.current.push(unsubNotif);
 
    // 2. Incoming transfer listener — write to notifications, NO toast
    const unsubIncoming = startIncomingListener(
      (transfer) => {
        pushNotification(
          'incoming_transfer',
          `You received ${paiseToRupees(transfer.amount)} from ${transfer.fromBankId.toUpperCase()} via ${transfer.mode.toUpperCase()}`,
          transfer.transferId,
        );
      },
      (transfer, err) => {
        if (transfer) {
          pushNotification(
            'transfer_failed',
            `Incoming transfer of ${paiseToRupees(transfer.amount)} failed: ${err.message}`,
            transfer.transferId,
          );
        }
      },
    );
    unsubRefs.current.push(unsubIncoming);
 
    // 3. Outgoing status listener — write to notifications, NO toast
    const unsubStatus = startStatusListener((transfer) => {
      if (transfer.status === 'completed') {
        pushNotification(
          'transfer_completed',
          `Your transfer of ${paiseToRupees(transfer.amount)} was delivered successfully.`,
          transfer.transferId ?? transfer.id,
        );
      } else if (transfer.status === 'failed') {
        pushNotification(
          'transfer_failed',
          `Your transfer of ${paiseToRupees(transfer.amount)} failed: ${transfer.failureReason ?? 'Unknown reason'}`,
          transfer.transferId ?? transfer.id,
        );
      }
    });
    unsubRefs.current.push(unsubStatus);
 
    return clearListeners;
  }, [user]);
 
  const markAllRead = async () => {
    await Promise.all(
      notifications.map(n => updateDoc(doc(privateDb, 'notifications', n.id), { isRead: true }))
    );
  };
 
  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
 
export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
 
 