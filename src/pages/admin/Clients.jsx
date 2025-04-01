import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, where, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { deleteClientCompletely, ensureUserRole, createClient, isAdmin, isAccountManager, checkUserRole } from '../../utils/userManagement';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { createAdmin } from '../../utils/userManagement';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    clinicName: '',
    status: 'active',
    password: ''
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    clinicName: '',
  });
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Store admin credentials before creating new client
  const [adminCredentials, setAdminCredentials] = useState(null);

  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editAdminFormData, setEditAdminFormData] = useState({
    name: '',
    email: '',
  });

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      const auth = getAuth();
      if (auth.currentUser) {
        console.log('Current user:', auth.currentUser.uid);
        const isAdminUser = await isAdmin(auth.currentUser.uid);
        const isAccountManagerUser = await isAccountManager(auth.currentUser.uid);
        const userRole = await checkUserRole(auth.currentUser.uid);
        console.log('Is admin:', isAdminUser);
        console.log('Is account manager:', isAccountManagerUser);
        console.log('User role:', userRole);
        // Set role based on user type
        const role = isAdminUser ? 'admin' : isAccountManagerUser ? 'accountManager' : 'client';
        console.log('Setting user role to:', role);
        setUserRole(role);
      } else {
        console.log('No current user found');
      }
    };
    loadUserRole();
  }, []);

  // Load clients and admins
  useEffect(() => {
    loadClients();
    loadAdmins();
  }, []);

  useEffect(() => {
    // Store admin credentials when component mounts
    const storeAdminCredentials = async () => {
      const auth = getAuth();
      if (auth.currentUser) {
        setAdminCredentials({
          email: auth.currentUser.email,
          uid: auth.currentUser.uid
        });
      }
    };
    storeAdminCredentials();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      console.log('Loading clients...');
      
      // First, let's check all users to see what's in the database
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = allUsersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('All users in database:', allUsers);

      // Ensure all users have roles
      for (const user of allUsers) {
        if (!user.role && user.id !== getAuth().currentUser?.uid) {
          console.log('Adding missing role for user:', user.id);
          await ensureUserRole(user.id, 'client');
        }
      }
      
      // Query specifically for clients
      const clientsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'client')
      );
      
      const querySnapshot = await getDocs(clientsQuery);
      console.log('Query snapshot size:', querySnapshot.size);
      console.log('Query snapshot empty:', querySnapshot.empty);
      
      const clientsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Client document:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      });
      
      console.log('Final clients data:', clientsData);
      setClients(clientsData);
      setError(null);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      console.log('Loading admins...');
      
      // Get current user first
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log('Current user ID:', currentUser?.uid);
      
      // Query specifically for admins
      const adminsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      
      const querySnapshot = await getDocs(adminsQuery);
      console.log('Admins query snapshot size:', querySnapshot.size);
      
      const adminsData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(admin => {
          console.log('Comparing admin ID:', admin.id, 'with current user ID:', currentUser?.uid);
          return admin.id !== currentUser?.uid;
        });
      
      console.log('Final admins data:', adminsData);
      setAdmins(adminsData);
    } catch (error) {
      console.error('Error loading admins:', error);
      setError('Failed to load admins');
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const auth = getAuth();
      const currentAdmin = auth.currentUser;
      
      if (!currentAdmin) {
        setError('Admin authentication required');
        return;
      }

      setError(null);
      setIsCreatingClient(true);
      console.log('Creating new client with data:', formData);

      // Create client using Cloud Function
      const result = await createClient(formData);
      console.log('Client created successfully:', result);

      // Reload the clients list
      await loadClients();
      
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        clinicName: '',
        status: 'active',
        password: ''
      });
      toast.success('Client created successfully');
    } catch (error) {
      console.error('Error creating client:', error);
      setError(error.message || 'Failed to create client');
      toast.error('Failed to create client');
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleEditClient = async (e) => {
    e.preventDefault();
    try {
      const clientRef = doc(db, 'users', selectedClient.id);
      await updateDoc(clientRef, formData);
      
      setClients(prev => prev.map(client => 
        client.id === selectedClient.id ? { ...client, ...formData } : client
      ));
      setShowEditModal(false);
      setSelectedClient(null);
      setFormData({ name: '', email: '', clinicName: '', status: 'active' });
    } catch (error) {
      console.error('Error updating client:', error);
      setError('Failed to update client');
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      try {
        setError(null);
        // Delete the client
        await deleteClientCompletely(clientId);
        
        // Update UI immediately
        setClients(prev => prev.filter(client => client.id !== clientId));
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
        successMessage.textContent = 'Client deleted successfully';
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);

        // Reload clients list to ensure sync
        await loadClients();
      } catch (error) {
        console.error('Error deleting client:', error);
        setError('Failed to delete client. Please try again.');
      }
    }
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      clinicName: client.clinicName || '',
      status: client.status || 'active'
    });
    setShowEditModal(true);
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      const auth = getAuth();
      const currentAdmin = auth.currentUser;
      
      if (!currentAdmin) {
        setError('Admin authentication required');
        return;
      }

      setError(null);
      setIsCreatingAdmin(true);
      console.log('Creating new admin with data:', adminFormData);

      // Create admin using Cloud Function
      const result = await createAdmin(adminFormData);
      console.log('Admin created successfully:', result);

      // Reload the clients list
      await loadClients();
      
      setShowAddAdminModal(false);
      setAdminFormData({
        name: '',
        email: '',
        password: '',
      });
      toast.success('Admin created successfully');
    } catch (error) {
      console.error('Error creating admin:', error);
      setError(error.message || 'Failed to create admin');
      toast.error('Failed to create admin');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    try {
      const adminRef = doc(db, 'users', selectedAdmin.id);
      await updateDoc(adminRef, editAdminFormData);
      
      setAdmins(prev => prev.map(admin => 
        admin.id === selectedAdmin.id ? { ...admin, ...editAdminFormData } : admin
      ));
      setShowEditAdminModal(false);
      setSelectedAdmin(null);
      setEditAdminFormData({ name: '', email: '' });
      toast.success('Admin updated successfully!');
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Failed to update admin');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (window.confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
      try {
        // Delete the admin from Authentication and Firestore
        await deleteClientCompletely(adminId);
        
        // Update UI immediately
        setAdmins(prev => prev.filter(admin => admin.id !== adminId));
        toast.success('Admin deleted successfully');

        // Reload admins list to ensure sync
        await loadAdmins();
      } catch (error) {
        console.error('Error deleting admin:', error);
        toast.error('Failed to delete admin');
      }
    }
  };

  const openEditAdminModal = (admin) => {
    setSelectedAdmin(admin);
    setEditAdminFormData({
      name: admin.name || '',
      email: admin.email || '',
    });
    setShowEditAdminModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
        <div className="flex space-x-4">
          {userRole === 'admin' && (
            <>
              <button
                onClick={() => setShowAddAdminModal(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800"
              >
                Add Admin
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
              >
                Add Client
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Admins Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Administrators</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                {userRole === 'admin' && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{admin.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Administrator</td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditAdminModal(admin)}
                        className="text-teal-600 hover:text-teal-900 mr-4 bg-transparent"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin.id)}
                        className="text-red-600 hover:text-red-900 bg-transparent"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clients Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Clients</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{client.clinicName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  {userRole === 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(client)}
                        className="text-teal-600 hover:text-teal-900 mr-4 bg-transparent"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="text-red-600 hover:text-red-900 bg-transparent"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Admin</h2>
            <form onSubmit={handleAddAdmin}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={adminFormData.name}
                  onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={adminFormData.email}
                  onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  className="mr-2 px-4 py-2 bg-white text-gray-900 border border-gray-900 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAdmin}
                  className={`px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 ${
                    isCreatingAdmin ? 'cursor-not-allowed bg-gray-400' : ''
                  }`}
                >
                  {isCreatingAdmin ? 'Creating Admin...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Client</h3>
              <form onSubmit={handleAddClient}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Clinic Name
                  </label>
                  <input
                    type="text"
                    name="clinicName"
                    value={formData.clinicName}
                    onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="mr-2 px-4 py-2 bg-white text-gray-900 border border-gray-900 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingClient}
                    className={`px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 ${
                      isCreatingClient ? 'cursor-not-allowed bg-gray-400' : ''
                    }`}
                  >
                    {isCreatingClient ? 'Creating Client...' : 'Create Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Edit Client</h2>
            <form onSubmit={handleEditClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Clinic Name</label>
                <input
                  type="text"
                  value={formData.clinicName}
                  onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium bg-white text-gray-900 border border-gray-900 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-md hover:bg-teal-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Edit Administrator</h2>
            <form onSubmit={handleEditAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editAdminFormData.name}
                  onChange={(e) => setEditAdminFormData({ ...editAdminFormData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editAdminFormData.email}
                  onChange={(e) => setEditAdminFormData({ ...editAdminFormData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-white text-gray-900 border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditAdminModal(false)}
                  className="px-4 py-2 text-sm font-medium bg-white text-gray-900 border border-gray-900 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-md hover:bg-teal-600"
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

export default Clients; 