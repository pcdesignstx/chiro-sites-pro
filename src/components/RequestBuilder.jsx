import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const RequestBuilder = ({ formData }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { currentUser } = useAuth();

  // Check if user has already submitted a request
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!currentUser) return;

      try {
        const q = query(
          collection(db, 'clientRequests'),
          where('clientId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        setHasSubmitted(!querySnapshot.empty);
      } catch (error) {
        console.error('Error checking existing request:', error);
      }
    };

    checkExistingRequest();
  }, [currentUser]);

  const gatherAllData = async () => {
    const collections = {
      // Main settings
      websiteIdentity: {
        path: ['websiteIdentity', 'settings'],
        userPath: ['users', currentUser.uid, 'settings', 'websiteIdentity']
      },
      websiteDesign: {
        path: ['websiteDesign', 'settings'],
        userPath: ['users', currentUser.uid, 'settings', 'websiteDesign']
      },
      
      // Elements
      discoveryCall: {
        path: ['elements', 'discoveryCall'],
        userPath: ['users', currentUser.uid, 'elements', 'discoveryCall']
      },
      leadGenerator: {
        path: ['elements', 'leadGenerator'],
        userPath: ['users', currentUser.uid, 'elements', 'leadGenerator']
      },
      faq: {
        path: ['elements', 'faq'],
        userPath: ['users', currentUser.uid, 'elements', 'faq']
      },
      promoBar: {
        path: ['elements', 'promoBar'],
        userPath: ['users', currentUser.uid, 'elements', 'promoBar']
      },
      images: {
        path: ['elements', 'images'],
        userPath: ['users', currentUser.uid, 'elements', 'images']
      },
      
      // Pages
      home: {
        path: ['pages', 'home'],
        userPath: ['users', currentUser.uid, 'pages', 'home']
      },
      about: {
        path: ['pages', 'about'],
        userPath: ['users', currentUser.uid, 'pages', 'about']
      },
      blog: {
        path: ['pages', 'blog'],
        userPath: ['users', currentUser.uid, 'pages', 'blog']
      },
      contact: {
        path: ['pages', 'contact'],
        userPath: ['users', currentUser.uid, 'pages', 'contact']
      },
      landingPages: {
        path: ['pages', 'landingPages'],
        userPath: ['users', currentUser.uid, 'pages', 'landingPages']
      },
      services: {
        path: ['pages', 'services'],
        userPath: ['users', currentUser.uid, 'pages', 'services']
      }
    };

    const allData = {};

    try {
      // Add console logs for debugging
      console.log('Current user:', currentUser);
      console.log('Collections to gather:', collections);

      // Gather data from each collection
      for (const [key, paths] of Object.entries(collections)) {
        try {
          // First try user-specific settings
          console.log(`Trying user path for ${key}:`, paths.userPath);
          const userDocRef = doc(db, ...paths.userPath);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            console.log(`Found user-specific data for ${key}`);
            allData[key] = userDocSnap.data();
          } else {
            // If not found, try general settings
            console.log(`Trying general path for ${key}:`, paths.path);
            const docRef = doc(db, ...paths.path);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              console.log(`Found general data for ${key}`);
              allData[key] = docSnap.data();
            } else {
              console.log(`No data found for ${key}`);
            }
          }
        } catch (error) {
          console.error(`Error gathering data for ${key}:`, error);
          // Continue with other collections even if one fails
        }
      }

      console.log('All gathered data:', allData);
      return allData;
    } catch (error) {
      console.error('Error in gatherAllData:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (hasSubmitted) return;
    
    setIsSubmitting(true);

    try {
      // Get user data from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.exists() ? userDocSnap.data() : {};

      // Gather all data from different collections
      const allSavedData = await gatherAllData();

      // Create the build request with all data
      const requestData = {
        clientId: currentUser.uid,
        clientName: userData.name || currentUser.displayName || 'Unknown Client',
        clientEmail: currentUser.email,
        clinicName: userData.clinicName || '',
        data: {
          websiteIdentity: allSavedData.websiteIdentity || {},
          websiteDesign: allSavedData.websiteDesign || {},
          elements: {
            discoveryCall: allSavedData.discoveryCall || {},
            leadGenerator: allSavedData.leadGenerator || {},
            faq: allSavedData.faq || {},
            promoBar: allSavedData.promoBar || {},
            images: allSavedData.images || {}
          },
          pages: {
            home: allSavedData.home || {},
            about: allSavedData.about || {},
            blog: allSavedData.blog || {},
            contact: allSavedData.contact || {},
            landingPages: allSavedData.landingPages || {},
            services: allSavedData.services || {}
          }
        },
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Submitting request with data:', requestData);
      await addDoc(collection(db, 'clientRequests'), requestData);
      setHasSubmitted(true);

      // Create toast notification for success
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMessage.textContent = 'Request submitted successfully! Our team will review it shortly.';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);
    } catch (error) {
      console.error('Error submitting request:', error);
      
      // Create toast notification for error
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      errorMessage.textContent = 'Failed to submit request. Please try again.';
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <div className="w-full flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg text-base font-medium">
        <CheckCircleIcon className="w-5 h-5 mr-3" />
        Request Submitted
      </div>
    );
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={isSubmitting || hasSubmitted}
      className="w-full flex items-center justify-center px-4 py-3 bg-teal-500 text-white hover:bg-teal-600 rounded-lg transition-all text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ArrowPathIcon className={`w-5 h-5 mr-3 ${isSubmitting ? 'animate-spin' : ''}`} />
      {isSubmitting ? 'Submitting...' : 'Request Build'}
    </button>
  );
};

export default RequestBuilder; 