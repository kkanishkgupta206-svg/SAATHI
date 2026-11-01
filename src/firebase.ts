import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyDcdYjdZuYgsghWX5oY4MyzMgPWyI4ScDY",
  authDomain: "saathi-d189f.firebaseapp.com",
  projectId: "saathi-d189f",
  storageBucket: "saathi-d189f.firebasestorage.app",
  messagingSenderId: "561842996821",
  appId: "1:561842996821:web:4db9fd3aacc2da18c6b6dc"
};

// Initialize Firebase safely (avoiding duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
