import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const auth = getAuth();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = auth.currentUser;
        console.log('Current user:', user?.uid); // Debug log

        if (!user) {
          console.log('No user found, redirecting to login'); // Debug log
          setIsAuthenticated(false);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Get user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        console.log('User document:', userDoc.data()); // Debug log

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isUserAdmin = userData.role === 'admin' || userData.role === 'owner';
          console.log('User role:', userData.role); // Debug log
          console.log('Is user admin?', isUserAdmin); // Debug log
          setIsAdmin(isUserAdmin);
        } else {
          console.log('No user document found'); // Debug log
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setIsAuthenticated(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(checkAuth);
    return () => unsubscribe();
  }, [auth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login'); // Debug log
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    console.log('Not an admin, redirecting to dashboard'); // Debug log
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute; 