// src/config/firebasePrivate.js
// Initialises the PRIVATE Firebase app for this bank.
// Uses VITE_PRIVATE_* env vars — unique per bank deployment.
// No other bank's app can access this project.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore }  from 'firebase/firestore';
import { getAuth }       from 'firebase/auth';

const privateConfig = {
  apiKey:            import.meta.env.VITE_PRIVATE_API_KEY,
  authDomain:        import.meta.env.VITE_PRIVATE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_PRIVATE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_PRIVATE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_PRIVATE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_PRIVATE_APP_ID,
};

// Named 'private' to avoid collision with the hub app instance
const privateApp = getApps().find(a => a.name === 'private')
  ?? initializeApp(privateConfig, 'private');

export const privateDb   = getFirestore(privateApp);
export const privateAuth = getAuth(privateApp);
export { privateApp };
