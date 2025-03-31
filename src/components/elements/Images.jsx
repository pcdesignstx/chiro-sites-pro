import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../../contexts/AuthContext';
import { TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { db } from '../../firebase';
import { showNotification } from '../../utils/notification';

const defaultSettings = {
  images: []
};

const Images = ({ readOnly, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState(() => {
    if (!initialData) return defaultSettings;
    return {
      ...defaultSettings,
      ...initialData,
      images: initialData.images || defaultSettings.images
    };
  });

  const storage = getStorage();

  // Only load data if not in readOnly mode and no initialData provided
  useEffect(() => {
    if (readOnly || initialData) return;

    const loadSavedData = async () => {
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid, 'elements', 'images');
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setSettings(userDocSnap.data());
        } else {
          const legacyRef = doc(db, 'elements', 'images');
          const legacySnap = await getDoc(legacyRef);
          
          if (legacySnap.exists()) {
            setSettings(legacySnap.data());
          }
        }
      } catch (error) {
        console.error('Error loading images settings:', error);
        setSaveError('Failed to load saved settings');
      }
    };

    loadSavedData();
  }, [currentUser, readOnly, initialData]);

  const handleSave = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'images');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      showNotification('Image settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving image settings:', error);
      showNotification('Failed to save image settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!currentUser || readOnly) return;

    setIsUploading(true);
    setUploadProgress(0);
    setSaveError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Create a unique filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${file.name}`;
        const storageRef = ref(storage, `users/${currentUser.uid}/images/${filename}`);

        // Upload the file
        await uploadBytes(storageRef, file);

        // Get the download URL
        const downloadURL = await getDownloadURL(storageRef);

        return {
          url: downloadURL,
          filename: filename,
          name: file.name,
          size: file.size,
          type: file.type
        };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      
      setSettings(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));

      // Save the updated settings
      await handleSave();
    } catch (error) {
      console.error('Error uploading images:', error);
      setSaveError('Failed to upload images. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteImage = async (index) => {
    if (!currentUser || readOnly) return;

    try {
      const filename = settings.images[index]?.filename;
      if (!filename) return;

      await deleteObject(ref(storage, `users/${currentUser.uid}/images/${filename}`));
      
      setSettings(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));

      showNotification('Image deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting image:', error);
      showNotification('Failed to delete image. Please try again.', 'error');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Welcome Message and Audio - Only show if not readOnly */}
        {!readOnly && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <p className="text-gray-600 mb-4">
              Welcome! On this page you can upload and manage your images. You can drag and drop images or click to select them.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Images</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {!readOnly && (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop images here, or click to select files
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-teal-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            {/* Error Message */}
            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {saveError}
              </div>
            )}

            {/* Image Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {settings.images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Save Button */}
            {!readOnly && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    isSaving
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-teal-500 hover:bg-teal-600 text-white'
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Images; 