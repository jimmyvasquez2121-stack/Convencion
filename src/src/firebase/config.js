import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCN4wyejesdOHWdZqDBakDukFFeGK7hqUA",
  authDomain: "convencion-9a887.firebaseapp.com",
  projectId: "convencion-9a887",
  storageBucket: "convencion-9a887.firebasestorage.app",
  messagingSenderId: "787913517591",
  appId: "1:787913517591:web:b26d36e83c3ad6979aca52"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;