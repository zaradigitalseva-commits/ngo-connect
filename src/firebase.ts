import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Public web-app configuration for the separate NGO Connect Firebase project.
// Vercel environment variables may override these defaults.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBVoc8TERW_owrOpLxrDvM6HZ2NW7p7vPs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ngo-connect-4cfc0.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ngo-connect-4cfc0',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ngo-connect-4cfc0.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1063498140742',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1063498140742:web:5c17585cb63f19fea18e47',
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

const app = getApps().length ? getApps()[0] : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
