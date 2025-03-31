import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Log the configuration (without sensitive data)
console.log('Firebase Config:', {
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId
});

let app;
let auth;
let db;
let storage;

try {
  // Initialize Firebase only if it hasn't been initialized
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');

    // Initialize Firebase Authentication and get a reference to the service
    auth = getAuth(app);
    console.log('Firebase Auth initialized');

    // Initialize Cloud Firestore and get a reference to the service
    db = getFirestore(app);
    console.log('Firestore initialized');

    // Initialize Firebase Storage
    storage = getStorage(app);
    console.log('Firebase Storage initialized');
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log('Using existing Firebase instance');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// Function to update user role
export const updateUserRole = async (userId, role) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      role: role,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Successfully updated user ${userId} role to ${role}`);
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
};

export { auth, db, storage };
export default app; 