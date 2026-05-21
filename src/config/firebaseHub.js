// src/config/firebaseHub.js
// Initialises the SHARED HUB Firebase app.
// Uses VITE_HUB_* env vars — IDENTICAL across all bank deployments.
// This is the interbank message bus: only routing metadata, never balances.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth }      from 'firebase/auth';

const hubConfig = {
  apiKey:            import.meta.env.VITE_HUB_API_KEY,
  authDomain:        import.meta.env.VITE_HUB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_HUB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_HUB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_HUB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_HUB_APP_ID,
};

// Named 'hub' to avoid collision with the private app instance
const hubApp = getApps().find(a => a.name === 'hub')
  ?? initializeApp(hubConfig, 'hub');

export const hubDb   = getFirestore(hubApp);
export const hubAuth = getAuth(hubApp);
export { hubApp };
