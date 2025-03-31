import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBlqrV74WVx7KOh7G8dUSpLa9Vu3jWRjP8",
  authDomain: 'clientflowtool.firebaseapp.com',
  projectId: 'clientflowtool',
  storageBucket: 'clientflowtool.firebasestorage.app',
  messagingSenderId: '572933928317'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const userId = '3HgW5sOfuiW0qjalRndoNtWDzhr2';
const email = 'cdkc@pcdesignstx.com';
const password = process.argv[2]; // Get password from command line argument

async function updateUserRole() {
  try {
    // Sign in first
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Successfully authenticated');

    // Then update the role
    await setDoc(doc(db, 'users', userId), {
      role: 'owner',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('Successfully updated user role to owner');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (!password) {
  console.error('Please provide your password as a command line argument');
  process.exit(1);
}

updateUserRole(); 