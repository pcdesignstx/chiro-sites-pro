import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { isAdmin, isAccountManager } from '../../utils/userManagement';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const [recentRequests, setRecentRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserRole = async () => {
      const auth = getAuth();
      if (auth.currentUser) {
        const isAdminUser = await isAdmin(auth.currentUser.uid);
        const isAccountManagerUser = await isAccountManager(auth.currentUser.uid);
        setUserRole(isAdminUser ? 'admin' : isAccountManagerUser ? 'accountManager' : 'client');
      }
    };
    loadUserRole();
  }, []);

  useEffect(() => {
    const loadRecentRequests = async () => {
      try {
        const q = query(
          collection(db, 'clientRequests'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setRecentRequests(requests);
      } catch (error) {
        console.error('Error loading recent requests:', error);
        setError('Failed to load recent requests');
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentRequests();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Total Clients</h3>
          <p className="text-3xl font-bold text-teal-500">--</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Active Clients</h3>
          <p className="text-3xl font-bold text-green-500">--</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900">Inactive Clients</h3>
          <p className="text-3xl font-bold text-red-500">--</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-4">
            {userRole === 'admin' && (
              <button
                onClick={() => navigate('/admin/clients/new')}
                className="w-full px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
              >
                Add New Client
              </button>
            )}
            <button
              onClick={() => navigate('/admin/clients')}
              className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded hover:bg-gray-200"
            >
              View All Clients
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => navigate('/admin/settings')}
                className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded hover:bg-gray-200"
              >
                System Settings
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <p className="text-gray-600">No recent activity to display</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Quick Stats Cards */}
        <Link
          to="/admin/requests"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-teal-100 rounded-lg">
              <ClipboardDocumentListIcon className="w-6 h-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Client Requests</p>
              <p className="text-lg font-semibold text-gray-900">{recentRequests.length}</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/clients"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-lg font-semibold text-gray-900">--</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Requests Section */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Requests</h2>
            <Link
              to="/admin/requests"
              className="flex items-center text-sm text-teal-600 hover:text-teal-800"
            >
              View all
              <ArrowRightIcon className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : recentRequests.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No requests found</div>
          ) : (
            recentRequests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {request.clientName || 'Unknown Client'}
                    </h3>
                    <p className="text-sm text-gray-500">{request.clientEmail}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {request.createdAt?.toLocaleDateString()} {request.createdAt?.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(request.status)}`}>
                      <span className="mr-1.5">{getStatusIcon(request.status)}</span>
                      {request.status}
                    </span>
                    <Link
                      to={`/admin/requests?id=${request.id}`}
                      className="text-teal-600 hover:text-teal-800"
                    >
                      <ArrowRightIcon className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 