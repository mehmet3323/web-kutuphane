import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAN5jVcwGP-fEPGmUq_Ids1M6JovJNzca8",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "kutuphane-14257.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "kutuphane-14257",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "kutuphane-14257.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "584699718413",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:584699718413:android:708bc18056c5bd1c81de44"
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const auth = getAuth(app);

export default app;
