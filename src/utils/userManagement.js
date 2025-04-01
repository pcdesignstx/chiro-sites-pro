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

// Create a new client using Cloud Function
export const createClient = async (clientData) => {
  try {
    const functions = getFunctions();
    const createClientFunction = httpsCallable(functions, 'createClient');
    
    const result = await createClientFunction(clientData);
    
    if (result.data.success) {
      return { success: true, uid: result.data.uid };
    } else {
      throw new Error('Failed to create client');
    }
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
};

// Delete a client using Cloud Function
export const deleteClientCompletely = async (userId) => {
  try {
    const functions = getFunctions();
    const deleteUserFunction = httpsCallable(functions, 'deleteUser');
    
    const result = await deleteUserFunction({ userId });
    
    if (result.data.success) {
      return { success: true };
    } else {
      throw new Error('Failed to delete client');
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
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
      return userDoc.data().role;
    }
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Check if user is admin
export const isAdmin = async (uid) => {
  try {
    console.log('Checking admin status for user:', uid);
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      console.log('User document not found');
      return false;
    }
    const role = userDoc.data().role;
    console.log('User role:', role);
    return role === 'admin';
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

  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, {
      role: newRole,
      lastUpdated: new Date()
    }, { merge: true });
    console.log(`Updated user ${uid} role to ${newRole}`);
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Function to ensure user has a role
export const ensureUserRole = async (uid, defaultRole = 'client') => {
  try {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (!userData.role) {
        await setDoc(userRef, {
          role: defaultRole,
          lastUpdated: new Date()
        }, { merge: true });
        console.log(`Added missing role ${defaultRole} to user ${uid}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring user role:', error);
  }
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

export const checkUserRole = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    return userDoc.data().role || 'client';
  } catch (error) {
    console.error('Error checking user role:', error);
    throw error;
  }
};

export const isAdminOrAccountManager = async (uid) => {
  try {
    const role = await checkUserRole(uid);
    return role === 'admin' || role === 'accountManager';
  } catch (error) {
    console.error('Error checking admin/account manager status:', error);
    return false;
  }
};

export const isAccountManager = async (uid) => {
  try {
    const role = await checkUserRole(uid);
    return role === 'accountManager';
  } catch (error) {
    console.error('Error checking account manager status:', error);
    return false;
  }
};

// Create a new admin
export const createAdmin = async (adminData) => {
  try {
    const functions = getFunctions();
    const createAdminFunction = httpsCallable(functions, 'createAdmin');
    
    const result = await createAdminFunction(adminData);
    
    if (result.data.success) {
      return { success: true, uid: result.data.uid };
    } else {
      throw new Error('Failed to create admin');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  }
};