import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { ChevronUpIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, validateFile, deleteFile } from '../utils/uploadUtils';
import { showNotification } from '../utils/notification';

const About = ({ readOnly, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isTeamExpanded, setIsTeamExpanded] = useState(false);
  const { currentUser } = useAuth();

  const defaultSettings = {
    doctorBio: '',
    philosophy: '',
    credentials: [
      'D.C. – Doctor of Chiropractic',
      '15+ years in practice'
    ],
    photo: null,
    personalQuote: '',
    teamMembers: []
  };

  const [settings, setSettings] = useState(initialData || defaultSettings);

  useEffect(() => {
    const loadSavedSettings = async () => {
      if (!currentUser?.uid) return;

      try {
        console.log('Loading saved settings for user:', currentUser.uid);
        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'about');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          console.log('Found saved settings:', docSnap.data());
          const savedData = docSnap.data();
          
          // Merge saved data with defaults
          const mergedData = {
            ...defaultSettings,
            ...savedData,
            credentials: savedData.credentials || defaultSettings.credentials,
            teamMembers: savedData.teamMembers || defaultSettings.teamMembers
          };
          
          console.log('Merged settings:', mergedData);
          setSettings(mergedData);
        } else {
          console.log('No saved settings found, using defaults');
          // Save default settings if none exist
          await setDoc(docRef, {
            ...defaultSettings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        showNotification('Error loading settings. Please try again.', 'error');
      }
    };

    loadSavedSettings();
  }, [currentUser?.uid]);

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCredentialChange = (index, value) => {
    const newCredentials = [...settings.credentials];
    newCredentials[index] = value;
    setSettings(prev => ({
      ...prev,
      credentials: newCredentials
    }));
  };

  const handleAddCredential = () => {
    setSettings(prev => ({
      ...prev,
      credentials: [...prev.credentials, '']
    }));
  };

  const handleRemoveCredential = (index) => {
    setSettings(prev => ({
      ...prev,
      credentials: prev.credentials.filter((_, i) => i !== index)
    }));
  };

  const handleAddTeamMember = () => {
    const newTeamMember = {
      id: Date.now(),
      name: '',
      title: '',
      bio: '',
      photo: null,
      photoUrl: '',
      photoFilename: ''
    };
    setSettings(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, newTeamMember]
    }));
  };

  const handleTeamMemberChange = (id, field, value) => {
    setSettings(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map(member =>
        member.id === id ? { ...member, [field]: value } : member
      )
    }));
  };

  const handleRemoveTeamMember = (id) => {
    setSettings(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(member => member.id !== id)
    }));
  };

  const handlePhotoChange = async (type, file, memberIndex) => {
    if (!file) return;

    if (!currentUser?.uid) {
      showNotification('You must be logged in to upload photos', 'error');
      return;
    }

    // Validate the file
    const error = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/png', 'image/jpeg', 'image/gif']
    });

    if (error) {
      showNotification(error, 'error');
      return;
    }

    try {
      // Upload to Firebase Storage
      const { url, filename } = await uploadFile(file, 'photos', currentUser.uid);
      
      if (type === 'teamMembers') {
        // Handle team member photo upload
        setSettings(prev => ({
          ...prev,
          teamMembers: prev.teamMembers.map((member, index) => 
            index === memberIndex ? {
              ...member,
              photo: { url, filename }
            } : member
          )
        }));
      } else {
        // Handle main photo upload
        setSettings(prev => ({
          ...prev,
          photo: { url, filename }
        }));
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      showNotification('Error uploading photo. Please try again.', 'error');
    }
  };

  const handleDeletePhoto = async (type, filename, memberIndex) => {
    if (!currentUser?.uid) {
      showNotification('You must be logged in to delete photos', 'error');
      return;
    }

    try {
      // Delete from Firebase Storage
      await deleteFile(filename, 'photos', currentUser.uid);
      
      if (type === 'teamMembers') {
        // Handle team member photo deletion
        setSettings(prev => ({
          ...prev,
          teamMembers: prev.teamMembers.map((member, index) => 
            index === memberIndex ? {
              ...member,
              photo: null
            } : member
          )
        }));
      } else {
        // Handle main photo deletion
        setSettings(prev => ({
          ...prev,
          photo: null
        }));
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      showNotification('Error deleting photo. Please try again.', 'error');
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    try {
      setIsSaving(true);

      // Prepare the data for Firestore
      const aboutData = {
        doctorBio: settings.doctorBio,
        philosophy: settings.philosophy,
        credentials: settings.credentials,
        photo: settings.photo,
        personalQuote: settings.personalQuote,
        teamMembers: settings.teamMembers.map(member => ({
          ...member,
          photo: member.photo
        })),
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'about'), aboutData);
      
      showNotification('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving about settings:', error);
      showNotification('Failed to save changes. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Welcome Message and Audio - Only show if not readOnly */}
        {!readOnly && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <p className="text-gray-600 mb-4">
              Welcome! On this page you'll configure your About page content. To get started, click the play button below.
            </p>
            <div>
              <audio controls className="w-full">
                <source src="/about-page-intro.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">About</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Doctor Bio */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Doctor Bio
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Share your personal story and why you became a chiropractor.
              </p>
              <textarea
                value={settings.doctorBio}
                onChange={(e) => handleInputChange('doctorBio', e.target.value)}
                rows={6}
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
              />
            </div>

            {/* Practice Philosophy */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Practice Philosophy / Mission Statement
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Describe your approach to care and what makes your practice unique.
              </p>
              <textarea
                value={settings.philosophy}
                onChange={(e) => handleInputChange('philosophy', e.target.value)}
                rows={4}
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
              />
            </div>

            {/* Credentials */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Credentials
                </label>
              </div>
              <div className="space-y-4">
                {settings.credentials.map((credential, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={credential}
                      onChange={(e) => handleCredentialChange(index, e.target.value)}
                      placeholder="Enter credential"
                      className="flex-1 p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                    <button
                      onClick={() => handleRemoveCredential(index)}
                      className="p-1 text-red-500 hover:text-red-700 bg-transparent"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddCredential}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-500 transition-colors flex items-center justify-center bg-transparent"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Credential
                </button>
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Your Photo (Optional)
                </label>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif"
                onChange={(e) => handlePhotoChange('photo', e.target.files[0])}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-teal-500 hover:text-teal-500 transition-colors"
              >
                {settings.photo?.url ? (
                  <div className="relative">
                    <img
                      src={settings.photo.url}
                      alt="Profile"
                      className="w-32 h-32 mx-auto rounded-full object-cover"
                    />
                    <button
                      onClick={() => handleDeletePhoto('photo', settings.photo.filename)}
                      className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-1">Click to upload a photo</p>
                  </div>
                )}
              </label>
            </div>

            {/* Personal Quote */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Personal Quote or Statement (Optional)
                </label>
              </div>
              <input
                type="text"
                value={settings.personalQuote}
                onChange={(e) => handleInputChange('personalQuote', e.target.value)}
                placeholder="Share an inspiring quote or personal statement"
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
              />
            </div>

            {/* Team Members Section */}
            <div className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                onClick={() => setIsTeamExpanded(!isTeamExpanded)}
              >
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-700">Team Members (Optional)</h4>
                </div>
                <ChevronUpIcon className={`w-5 h-5 text-gray-500 transition-transform ${!isTeamExpanded ? 'rotate-180' : ''}`} />
              </div>

              {isTeamExpanded && (
                <div className="p-4 space-y-6">
                  {settings.teamMembers.map((member, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Team Member {index + 1}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTeamMember(index);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)}
                            placeholder="Enter team member's name"
                            className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role
                          </label>
                          <input
                            type="text"
                            value={member.title}
                            onChange={(e) => handleTeamMemberChange(index, 'title', e.target.value)}
                            placeholder="Enter team member's role"
                            className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bio
                          </label>
                          <textarea
                            value={member.bio}
                            onChange={(e) => handleTeamMemberChange(index, 'bio', e.target.value)}
                            placeholder="Enter team member's bio"
                            rows={3}
                            className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Photo
                          </label>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/gif"
                            onChange={(e) => handlePhotoChange('teamMembers', e.target.files[0], index)}
                            className="hidden"
                            id={`team-member-photo-${index}`}
                          />
                          <label
                            htmlFor={`team-member-photo-${index}`}
                            className="block w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-teal-500 hover:text-teal-500 transition-colors"
                          >
                            {member.photoUrl ? (
                              <div className="relative">
                                <img
                                  src={member.photoUrl}
                                  alt={member.name}
                                  className="w-32 h-32 mx-auto rounded-full object-cover"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto('teamMembers', member.photoFilename, index);
                                  }}
                                  className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-gray-500">
                                <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <p className="mt-1">Click to upload a photo</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddTeamMember}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-500 transition-colors flex items-center justify-center bg-transparent"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Team Member
                  </button>
                </div>
              )}
            </div>

            {/* Save Button */}
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

            {/* Error Message */}
            {saveError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {saveError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About; 