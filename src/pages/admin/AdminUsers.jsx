import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const AdminUsers = () => {
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'admin', // Default to admin role
  });
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    checkAdminStatus();
    loadAdminUsers();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        console.log('No user found, redirecting to login');
        navigate('/login');
        return;
      }

      setCurrentUserId(user.uid);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const isOwnerRole = userDoc.data().role === 'owner';
        console.log('User role check:', {
          userId: user.uid,
          role: userDoc.data().role,
          isOwner: isOwnerRole
        });
        setIsOwner(isOwnerRole);
      } else {
        console.log('User document not found');
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      navigate('/login');
    }
  };

  const loadAdminUsers = async () => {
    try {
      console.log('Loading admin users...');
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const users = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          firstName: doc.data().firstName || '',
          lastName: doc.data().lastName || '',
          email: doc.data().email || '',
          role: doc.data().role || '',
          createdAt: doc.data().createdAt || new Date().toISOString()
        }))
        .filter(user => user.role === 'admin' || user.role === 'owner');

      console.log('Loaded users:', users);
      setAdminUsers(users);
    } catch (err) {
      console.error('Error in loadAdminUsers:', err);
      setError('Error loading admin users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('You must be logged in to perform this action.');
        return;
      }

      // Check current user's role
      const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!currentUserDoc.exists() || currentUserDoc.data().role !== 'owner') {
        setError('Only owners can create new admin users.');
        return;
      }

      console.log('Current user role:', currentUserDoc.data().role);

      // First check if the email already exists
      const signInMethods = await fetchSignInMethodsForEmail(auth, newAdmin.email);
      if (signInMethods.length > 0) {
        setError('This email is already associated with a user account. Please use a different email.');
        return;
      }

      // Create the user in Firebase Auth first
      console.log('Creating new user in Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newAdmin.email,
        newAdmin.password
      );

      // Prepare the user document
      const userData = {
        email: newAdmin.email,
        firstName: newAdmin.firstName,
        lastName: newAdmin.lastName,
        role: newAdmin.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Adding user document to Firestore...', {
        uid: userCredential.user.uid,
        ...userData
      });

      // Add user document to Firestore
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, userData);

      // Verify the document was created
      const newUserDoc = await getDoc(userRef);
      if (!newUserDoc.exists()) {
        throw new Error('Failed to create user document in Firestore');
      }

      console.log('Successfully created new admin user');

      // Reset form and close modal
      setNewAdmin({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'admin',
      });
      setShowAddModal(false);

      // Reload the list
      await loadAdminUsers();
    } catch (err) {
      console.error('Error in handleAddAdmin:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please use a different email address.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else if (err.code === 'permission-denied') {
        setError('You do not have permission to create admin users. Please contact the owner.');
      } else {
        setError(`Error adding admin user: ${err.message}`);
      }
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // If editing own account, don't allow role change
      const updates = {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        updatedAt: new Date().toISOString(),
      };
      
      // Only include role update if not editing own account
      if (editingUser.id !== currentUserId) {
        updates.role = editingUser.role;
      }

      await setDoc(doc(db, 'users', editingUser.id), updates, { merge: true });

      setShowEditModal(false);
      setEditingUser(null);
      loadAdminUsers(); // Reload the list
    } catch (err) {
      setError('Error updating admin user: ' + err.message);
    }
  };

  const handleDeleteAdmin = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this admin user?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      loadAdminUsers(); // Reload the list
    } catch (err) {
      setError('Error deleting admin user: ' + err.message);
    }
  };

  const openEditModal = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>You do not have permission to manage admin users. Only owners can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
        >
          Add Admin User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adminUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 capitalize">{user.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  {isOwner && (
                    <>
                      <button
                        onClick={() => openEditModal(user)}
                        className="inline-block bg-emerald-500 text-white px-3 py-1 rounded-md hover:bg-emerald-600 transition-colors mr-3"
                      >
                        Edit
                      </button>
                      {user.id !== currentUserId ? (
                        <button
                          onClick={() => handleDeleteAdmin(user.id)}
                          className="inline-block bg-white border border-gray-900 text-gray-900 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="inline-block text-gray-400 cursor-not-allowed" title="You cannot delete your own account">
                          Delete
                        </span>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-4">Add Admin User</h2>
            <form onSubmit={handleAddAdmin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={newAdmin.firstName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400"
                    required
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={newAdmin.lastName}
                    onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400"
                    required
                    placeholder="Enter last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400"
                    required
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder-gray-400"
                    required
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={newAdmin.role}
                    onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="admin" className="text-gray-900">Admin</option>
                    <option value="owner" className="text-gray-900">Owner</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600"
                >
                  Add Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Edit Admin User</h2>
            {editingUser.id === currentUserId && (
              <div className="mb-4 text-sm text-gray-500 bg-gray-50 p-3 rounded">
                Note: You cannot change your own role to prevent accidental loss of access.
              </div>
            )}
            <form onSubmit={handleEditAdmin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="mt-1 block w-full rounded-md bg-gray-50 text-gray-500 border border-gray-300 px-3 py-2"
                  />
                </div>
                {editingUser.id !== currentUserId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                      className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers; 