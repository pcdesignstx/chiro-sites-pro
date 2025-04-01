const { onCall } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
admin.initializeApp();

// Create a new user in both Auth and Firestore
exports.createClient = onCall({
  memory: "256MiB",
  timeoutSeconds: 60
}, async (request) => {
  try {
    // Verify the caller is an admin
    if (!request.auth) {
      throw new Error('Must be logged in');
    }

    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    
    if (!callerDoc.exists || !['admin', 'owner'].includes(callerDoc.data().role)) {
      throw new Error('Must be an admin to create clients');
    }

    // Create the user in Authentication
    const userRecord = await admin.auth().createUser({
      email: request.data.email,
      password: request.data.password,
      displayName: request.data.name
    });

    // Create the user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      name: request.data.name,
      email: request.data.email,
      clinicName: request.data.clinicName,
      role: 'client',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedAdmin: callerUid
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error('Error creating client:', error);
    throw new Error(error.message);
  }
});

// Delete a user from both Auth and Firestore
exports.deleteUser = onCall({
  memory: "256MiB",
  timeoutSeconds: 60
}, async (request) => {
  try {
    // Verify the caller is an admin
    if (!request.auth) {
      throw new Error('Must be logged in');
    }

    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    
    if (!callerDoc.exists || !['admin', 'owner'].includes(callerDoc.data().role)) {
      throw new Error('Must be an admin to delete users');
    }

    const uid = request.data.userId;

    try {
      // Try to delete from Authentication
      await admin.auth().deleteUser(uid);
    } catch (authError) {
      // If user doesn't exist in Auth, log it but continue
      if (authError.code === 'auth/user-not-found') {
        console.log('User not found in Authentication, proceeding with Firestore deletion');
      } else {
        // For other auth errors, throw the error
        throw authError;
      }
    }
    
    // Delete from Firestore
    await admin.firestore().collection('users').doc(uid).delete();

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error(error.message);
  }
});

// Create a new admin in both Auth and Firestore
exports.createAdmin = onCall({
  memory: "256MiB",
  timeoutSeconds: 60
}, async (request) => {
  try {
    // Verify the caller is an admin
    if (!request.auth) {
      throw new Error('Must be logged in');
    }

    const callerUid = request.auth.uid;
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    
    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      throw new Error('Must be an admin to create other admins');
    }

    // Create the user in Authentication
    const userRecord = await admin.auth().createUser({
      email: request.data.email,
      password: request.data.password,
      displayName: request.data.name
    });

    // Create the user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      name: request.data.name,
      email: request.data.email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error('Error creating admin:', error);
    throw new Error(error.message);
  }
}); 