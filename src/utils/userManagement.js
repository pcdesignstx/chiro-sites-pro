import { db } from "../firebase";
import { doc, setDoc, serverTimestamp, getDoc, deleteDoc } from "firebase/firestore";
import { deleteUser } from 'firebase/auth';
import { auth } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Call this function after user signs up or logs in
export const createOrUpdateUser = async (userAuth, role = "client") => {
  if (!userAuth || !db) {
    console.error('User auth or Firestore not initialized');
    return;
  }

  try {
    const userRef = doc(db, "users", userAuth.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Create new user document
      await setDoc(userRef, {
        uid: userAuth.uid,
        name: userAuth.displayName || "",
        email: userAuth.email,
        role,
        createdAt: serverTimestamp(),
        clinicName: "",
        assignedAdmin: "",
        emailVerified: userAuth.emailVerified
      });
    } else {
      // Update existing user document, only update name if it's provided
      const updates = {
        email: userAuth.email,
        emailVerified: userAuth.emailVerified,
        lastLogin: serverTimestamp()
      };

      // Only update name if displayName is provided or if name is empty/undefined
      if (userAuth.displayName || !userDoc.data().name) {
        updates.name = userAuth.displayName || userDoc.data().name || "";
      }

      await setDoc(userRef, updates, { merge: true });
    }
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    // Don't throw the error to prevent login failure
  }
};

// Get user role from Firestore
export const getUserRole = async (uid) => {
  if (!uid) {
    console.log('No UID provided to getUserRole');
    return null;
  }

  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const role = userDoc.data().role;
      console.log('User role:', role); // Debug log
      return role;
    }
    console.log('No user document found'); // Debug log
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Check if user is admin
export const isAdmin = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.role === 'admin' || userData.role === 'owner';
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Check if user is owner
export const isOwner = async (uid) => {
  if (!uid) return false;
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() && userDoc.data().role === "owner";
};

// Update user role (admin only)
export const updateUserRole = async (uid, newRole) => {
  if (!uid) return;

  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    role: newRole
  }, { merge: true });
};

// Update clinic name for client
export const updateClinicName = async (uid, clinicName) => {
  if (!uid) return;

  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    clinicName
  }, { merge: true });
};

// Assign admin to client
export const assignAdmin = async (clientUid, adminUid) => {
  if (!clientUid || !adminUid) return;

  const userRef = doc(db, "users", clientUid);
  await setDoc(userRef, {
    assignedAdmin: adminUid
  }, { merge: true });
};

// Update user's name
export const updateUserName = async (uid, name) => {
  if (!uid || !name) return;

  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    name
  }, { merge: true });
};

export const deleteClientCompletely = async (userId) => {
  try {
    const functions = getFunctions();
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    
    const result = await deleteUserFunction({ userId });
    
    if (result.data.success) {
      return { success: true };
    } else {
      throw new Error('Failed to delete user');
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};