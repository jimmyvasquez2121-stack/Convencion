import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

// Firestore con memoria offline: los datos se guardan en el dispositivo
// y los cambios hechos sin internet se suben solos al volver la conexión.
let firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (error) {
  console.error('No se pudo activar la memoria offline, se usa modo normal:', error);
  firestore = getFirestore(app);
}
export const db = firestore;

export const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence);

export default app;