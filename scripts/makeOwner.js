import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBlqrV74WVx7KOh7G8dUSpLa9Vu3jWRjP8",
  authDomain: 'clientflowtool.firebaseapp.com',
  projectId: 'clientflowtool',
  storageBucket: 'clientflowtool.firebasestorage.app',
  messagingSenderId: '572933928317'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const userId = '3HgW5sOfuiW0qjalRndoNtWDzhr2';

async function makeUserOwner() {
  try {
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

makeUserOwner(); 