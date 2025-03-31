import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFormData } from '../contexts/FormDataContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, validateFile } from '../utils/uploadUtils';
import { showNotification } from '../utils/notification';

const MAX_BASE64_SIZE = 900000; // Keep base64 under ~900KB to ensure we're under Firestore's 1MB limit

const compressImage = async (file, maxWidth = 800) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        
        // Clear the canvas with a transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Use PNG format with transparency for PNG files
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'image/png' ? 1 : 0.7;
        
        const compressedBase64 = canvas.toDataURL(format, quality);
        resolve(compressedBase64);
      };
    };
  });
};

const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className={`flex items-center p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-800'
      }`}>
        <div className="flex-shrink-0">
          {type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-teal-400" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-red-400" />
          )}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

const WebsiteIdentity = ({ readOnly, initialData }) => {
  const { updateFormData } = useFormData();
  const { currentUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const fileInputRef = React.useRef(null);
  const [formState, setFormState] = useState(initialData || {
    businessName: '',
    tagline: '',
    description: '',
    mission: '',
    vision: '',
    values: [],
    logoUrl: '',
    logoFilename: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    }
  });

  // Debug logging for authentication state
  useEffect(() => {
    console.log('Current Authentication State:', {
      currentUser: currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        role: currentUser.role
      } : 'No user logged in'
    });
  }, [currentUser]);

  // Load saved data when component mounts
  useEffect(() => {
    const loadSavedData = async () => {
      console.log('Starting to load saved data');
      
      if (!currentUser) {
        console.log('No authenticated user found');
        return;
      }

      try {
        console.log('Attempting to load data for user:', currentUser.uid);
        
        // Try loading from websiteIdentity collection first (legacy path)
        const legacyDocRef = doc(db, 'websiteIdentity', 'settings');
        const legacyDocSnap = await getDoc(legacyDocRef);
        
        if (legacyDocSnap.exists()) {
          console.log('Found data in legacy path');
          const data = legacyDocSnap.data();
          const newFormState = {
            businessName: data.businessName || '',
            tagline: data.tagline || '',
            description: data.description || '',
            mission: data.mission || '',
            vision: data.vision || '',
            values: data.values || [],
            logoUrl: data.logoUrl || '',
            logoFilename: data.logoFilename || '',
            socialMedia: {
              facebook: data.socialMedia?.facebook || '',
              instagram: data.socialMedia?.instagram || '',
              twitter: data.socialMedia?.twitter || ''
            }
          };
          console.log('Setting form state with legacy data:', newFormState);
          setFormState(newFormState);
          return;
        }

        // If no legacy data, try the new path
        console.log('No legacy data found, trying new path');
        const userDocRef = doc(db, 'users', currentUser.uid, 'settings', 'websiteIdentity');
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          console.log('Found data in user settings');
          const data = userDocSnap.data();
          const newFormState = {
            businessName: data.businessName || '',
            tagline: data.tagline || '',
            description: data.description || '',
            mission: data.mission || '',
            vision: data.vision || '',
            values: data.values || [],
            logoUrl: data.logoUrl || '',
            logoFilename: data.logoFilename || '',
            socialMedia: {
              facebook: data.socialMedia?.facebook || '',
              instagram: data.socialMedia?.instagram || '',
              twitter: data.socialMedia?.twitter || ''
            }
          };
          console.log('Setting form state with user data:', newFormState);
          setFormState(newFormState);
        } else {
          console.log('No data found in either location');
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
        console.log('Error details:', {
          code: error.code,
          message: error.message,
          path: `users/${currentUser?.uid}/settings/websiteIdentity`
        });
        showNotification('Failed to load saved data', 'error');
      }
    };

    loadSavedData();
  }, [currentUser]);

  // Update form data context when form state changes, but debounced
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFormData('websiteIdentity', formState);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formState, updateFormData]);

  const handleInputChange = (field, value) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleValuesChange = (value) => {
    const newValues = value.split('\n').filter(v => v.trim() !== '');
    setFormState(prev => ({
      ...prev,
      values: newValues
    }));
  };

  const handleSocialMediaChange = (platform, value) => {
    setFormState(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Logo file size must be less than 5MB', 'error');
        return;
      }

      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        showNotification('Only PNG, JPEG, and GIF files are allowed', 'error');
        return;
      }

      const { url, filename } = await uploadFile(file, 'logos', currentUser.uid);
      
      setFormState(prev => ({
        ...prev,
        logoUrl: url,
        logoFilename: filename
      }));

      showNotification('Logo uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading logo:', error);
      showNotification('Failed to upload logo. Please try again.', 'error');
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const filename = formState.logoFilename;
      if (!filename) return;

      await uploadFile(null, 'logos', currentUser.uid, filename);
      
      setFormState(prev => ({
        ...prev,
        logoUrl: '',
        logoFilename: ''
      }));

      showNotification('Logo deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting logo:', error);
      showNotification('Failed to delete logo. Please try again.', 'error');
    }
  };

  const handleSave = async (e) => {
    // Prevent default form submission
    if (e) e.preventDefault();

    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    setIsSaving(true);
    try {
      console.log('Starting save operation for user:', currentUser.uid);
      console.log('Current form state:', formState);

      if (!formState.businessName.trim()) {
        showNotification('Business Name is required', 'error');
        return;
      }

      // Prepare the data for Firestore
      const websiteData = {
        businessName: formState.businessName.trim(),
        tagline: formState.tagline.trim(),
        description: formState.description.trim(),
        mission: formState.mission.trim(),
        vision: formState.vision.trim(),
        values: formState.values.map(v => v.trim()),
        logoUrl: formState.logoUrl || '',
        logoFilename: formState.logoFilename || '',
        socialMedia: {
          facebook: formState.socialMedia.facebook.trim(),
          instagram: formState.socialMedia.instagram.trim(),
          twitter: formState.socialMedia.twitter.trim()
        },
        updatedAt: new Date().toISOString()
      };

      console.log('Saving website data:', websiteData);

      // Save to both locations to ensure data consistency
      console.log('Saving to legacy path');
      await setDoc(doc(db, 'websiteIdentity', 'settings'), websiteData);
      
      console.log('Saving to user settings path');
      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'websiteIdentity'), websiteData);
      
      showNotification('Website identity settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error in save operation:', error);
      showNotification('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        <form onSubmit={handleSave}>
          {/* Welcome Message and Audio - Only show if not readOnly */}
          {!readOnly && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <p className="text-gray-600 mb-4">
                Welcome! On this page you'll manage your website's identity, including your business name, tagline, and logo. To get started, click the play button below.
              </p>
              <div>
                <audio controls className="w-full">
                  <source src="/website-identity-intro.mp3" type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}

          {/* Business Information */}
          <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
            <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Website Identity</h3>
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="p-6 space-y-6">
              {/* Business Name */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Business Name
                  </label>
                </div>
                <input
                  type="text"
                  value={formState.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="Enter your business name"
                  className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                />
              </div>

              {/* Tagline */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Tagline
                  </label>
                </div>
                <input
                  type="text"
                  value={formState.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="A short, memorable phrase that captures your essence"
                  className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                />
              </div>

              {/* Business Description */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Business Description
                  </label>
                </div>
                <textarea
                  value={formState.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  placeholder="Describe what your business does and who you serve"
                  className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                />
              </div>

              {/* Mission Statement */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Mission Statement
                  </label>
                </div>
                <textarea
                  value={formState.mission}
                  onChange={(e) => handleInputChange('mission', e.target.value)}
                  rows={3}
                  placeholder="What is your company's purpose?"
                  className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                />
              </div>

              {/* Vision Statement */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Vision Statement
                  </label>
                </div>
                <textarea
                  value={formState.vision}
                  onChange={(e) => handleInputChange('vision', e.target.value)}
                  rows={3}
                  placeholder="What does your company aspire to achieve?"
                  className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                />
              </div>

              {/* Core Values */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Core Values
                  </label>
                </div>
                <textarea
                  value={formState.values.join('\n')}
                  onChange={(e) => handleValuesChange(e.target.value)}
                  rows={5}
                  placeholder="Enter each value on a new line"
                  className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter each value on a new line
                </p>
              </div>

              {/* Logo Upload */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Logo Upload
                  </label>
                </div>
                <div className="mt-1 flex items-start space-x-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    {formState.logoUrl ? (
                      <div className="mb-4 relative">
                        <img 
                          src={formState.logoUrl} 
                          alt="Logo preview" 
                          className="h-20 object-contain"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={handleDeleteLogo}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No logo uploaded
                      </div>
                    )}
                    <p className="mt-2 text-sm text-gray-500">
                      When uploading your logo, use the highest-resolution version possible, in .PNG format
                    </p>
                  </div>
                  {!readOnly && !formState.logoUrl && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/gif"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-black hover:border-0 border-0 transition-all"
                      >
                        Upload Image
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Social Media Links */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Social Media Links (Optional)
                  </label>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Facebook
                    </label>
                    <input
                      type="url"
                      value={formState.socialMedia.facebook}
                      onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                      placeholder="https://facebook.com/yourclinic"
                      className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={formState.socialMedia.instagram}
                      onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                      placeholder="https://instagram.com/yourclinic"
                      className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Twitter
                    </label>
                    <input
                      type="url"
                      value={formState.socialMedia.twitter}
                      onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                      placeholder="https://twitter.com/yourclinic"
                      className="mt-1 w-full px-4 py-2 bg-gray-50 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-0 focus:border-teal-500 focus:border-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </details>

          {!readOnly && (
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={!formState.businessName.trim() || isSaving}
                onClick={handleSave}
                className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-black hover:border-0 border-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'SAVING...' : 'SAVE'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default WebsiteIdentity; 