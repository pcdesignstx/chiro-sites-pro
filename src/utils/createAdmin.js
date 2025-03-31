import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const createAdminUser = async (email, password, name) => {
  try {
    // Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification
    await sendEmailVerification(user);

    // Set the user document in Firestore with admin role
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      name: name || user.displayName || '',
      role: 'admin',
      createdAt: new Date(),
      clinicName: '',
      assignedAdmin: '',
      emailVerified: false
    });

    console.log('Admin user created successfully:', user.email);
    return user;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}; 