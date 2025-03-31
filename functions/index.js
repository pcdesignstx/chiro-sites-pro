const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.deleteUser = functions.https.onCall(async (data, context) => {
  // Check if the caller is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to delete users');
  }

  // Get the caller's role from Firestore
  const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!callerDoc.exists || !['admin', 'owner'].includes(callerDoc.data().role)) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin to delete users');
  }

  const uid = data.userId;
  try {
    // Delete from Authentication
    await admin.auth().deleteUser(uid);
    
    // Delete from Firestore
    await admin.firestore().collection('users').doc(uid).delete();
    
    // Delete user's storage folder if it exists
    const bucket = admin.storage().bucket();
    await bucket.deleteFiles({
      prefix: `users/${uid}/`
    });

    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError('internal', 'Error deleting user');
  }
}); 