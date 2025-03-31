import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { showNotification } from '../../utils/notification';

const defaultSettings = {
  headline: 'Get Your Free Guide',
  subheadline: 'Download our comprehensive guide to learn more about how chiropractic care can help you live pain-free.',
  benefit1: 'Learn about common causes of back pain',
  benefit2: 'Discover natural pain relief techniques',
  benefit3: 'Get expert tips for maintaining spinal health',
  ctaLabel: 'Download Now',
  leadMagnet: {
    title: 'The Complete Guide to Back Pain Relief',
    type: 'PDF Guide',
    url: ''
  },
  formFields: {
    name: true,
    email: true,
    phone: false
  }
};

const LeadGenerator = ({ readOnly, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState(() => {
    if (!initialData) return defaultSettings;
    
    return {
      ...defaultSettings,
      ...initialData,
      leadMagnet: {
        ...defaultSettings.leadMagnet,
        ...(initialData.leadMagnet || {})
      },
      formFields: {
        ...defaultSettings.formFields,
        ...(initialData.formFields || {})
      }
    };
  });

  const db = getFirestore();

  // Only load data if not in readOnly mode and no initialData provided
  useEffect(() => {
    if (readOnly || initialData) return;

    const loadSavedData = async () => {
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid, 'elements', 'leadGenerator');
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setSettings(userDocSnap.data());
        } else {
          const legacyRef = doc(db, 'elements', 'leadGenerator');
          const legacySnap = await getDoc(legacyRef);
          
          if (legacySnap.exists()) {
            setSettings(legacySnap.data());
          }
        }
      } catch (error) {
        console.error('Error loading lead generator settings:', error);
        showNotification('Failed to load saved settings', 'error');
      }
    };

    loadSavedData();
  }, [currentUser, readOnly, initialData]);

  const handleInputChange = (field, value) => {
    if (readOnly) return;
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLeadMagnetChange = (field, value) => {
    if (readOnly) return;
    setSettings(prev => ({
      ...prev,
      leadMagnet: {
        ...prev.leadMagnet,
        [field]: value
      }
    }));
  };

  const handleFormFieldChange = (field, value) => {
    if (readOnly) return;
    setSettings(prev => ({
      ...prev,
      formFields: {
        ...prev.formFields,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'leadGenerator');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      showNotification('Lead generator settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving lead generator settings:', error);
      showNotification('Failed to save lead generator settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    try {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification('Image file size must be less than 10MB', 'error');
        return;
      }

      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        showNotification('Only PNG, JPEG, and GIF files are allowed', 'error');
        return;
      }

      const { url, filename } = await uploadFile(file, 'lead-generator', currentUser.uid);
      
      setSettings(prev => ({
        ...prev,
        image: {
          url,
          filename
        }
      }));

      showNotification('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification('Failed to upload image. Please try again.', 'error');
    }
  };

  const handleDeleteImage = async () => {
    try {
      const filename = settings.image?.filename;
      if (!filename) return;

      await deleteFile(filename, 'lead-generator', currentUser.uid);
      
      setSettings(prev => ({
        ...prev,
        image: {
          url: '',
          filename: ''
        }
      }));

      showNotification('Image deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting image:', error);
      showNotification('Failed to delete image. Please try again.', 'error');
    }
  };

  const renderField = (label, value) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900">
        {value || 'Not provided'}
      </div>
    </div>
  );

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Welcome Message and Audio - Only show if not readOnly */}
        {!readOnly && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <p className="text-gray-600 mb-4">
              Welcome! On this page you'll configure your Lead Generator element. To get started, click the play button below.
            </p>
            <div>
              <audio controls className="w-full">
                <source src="/lead-generator-intro.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Lead Generator</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {readOnly ? (
              <>
                {renderField('Title', settings.title)}
                {renderField('Description', settings.description)}
                {renderField('Type', settings.leadMagnet?.type || 'Not specified')}
                {renderField('File URL', settings.leadMagnet?.url || 'Not provided')}
                {renderField('Form Fields', Object.entries(settings.formFields)
                  .filter(([_, enabled]) => enabled)
                  .map(([field]) => field.charAt(0).toUpperCase() + field.slice(1))
                  .join(', ') || 'None enabled')}
                {renderField('CTA Button Text', settings.ctaButtonText)}
                {renderField('Confirmation Type', settings.confirmationType)}
                {renderField('Confirmation Message', settings.confirmationMessage)}
                {renderField('Redirect URL', settings.redirectUrl || 'Not provided')}
              </>
            ) : (
              <>
                {/* Interactive form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={settings.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="e.g., 'Get Your Free Guide to Better Health'"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={settings.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe what visitors will get when they sign up..."
                      rows={3}
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Magnet Type
                    </label>
                    <select
                      value={settings.leadMagnet?.type || ''}
                      onChange={(e) => handleLeadMagnetChange('type', e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    >
                      <option value="">Select a type</option>
                      <option value="pdf">PDF Guide</option>
                      <option value="video">Video</option>
                      <option value="checklist">Checklist</option>
                      <option value="worksheet">Worksheet</option>
                      <option value="ebook">E-book</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Magnet File URL
                    </label>
                    <input
                      type="url"
                      value={settings.leadMagnet?.url || ''}
                      onChange={(e) => handleLeadMagnetChange('url', e.target.value)}
                      placeholder="Enter the URL where your lead magnet is hosted"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Fields
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={settings.formFields.name}
                          onChange={(e) => handleFormFieldChange('name', e.target.checked)}
                          className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Name</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={settings.formFields.email}
                          onChange={(e) => handleFormFieldChange('email', e.target.checked)}
                          className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Email</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={settings.formFields.phone}
                          onChange={(e) => handleFormFieldChange('phone', e.target.checked)}
                          className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Phone</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={settings.ctaButtonText}
                      onChange={(e) => handleInputChange('ctaButtonText', e.target.value)}
                      placeholder="e.g., 'Get My Free Guide'"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmation Settings
                    </label>
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={settings.confirmationType === 'message'}
                            onChange={() => handleInputChange('confirmationType', 'message')}
                            className="text-teal-500 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Show Message</span>
                        </label>
                        {settings.confirmationType === 'message' && (
                          <textarea
                            value={settings.confirmationMessage}
                            onChange={(e) => handleInputChange('confirmationMessage', e.target.value)}
                            placeholder="Thank you! Your free guide is on its way."
                            rows={3}
                            className="mt-2 w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                        )}
                      </div>
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={settings.confirmationType === 'redirect'}
                            onChange={() => handleInputChange('confirmationType', 'redirect')}
                            className="text-teal-500 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Redirect to URL</span>
                        </label>
                        {settings.confirmationType === 'redirect' && (
                          <input
                            type="url"
                            value={settings.redirectUrl}
                            onChange={(e) => handleInputChange('redirectUrl', e.target.value)}
                            placeholder="https://example.com/thank-you"
                            className="mt-2 w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                        )}
                      </div>
                    </div>
                  </div>
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
                {settings.saveError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                    {settings.saveError}
                  </div>
                )}
              </>
            )}

            {/* Preview Section */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Preview:</h4>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{settings.title}</h2>
                <p className="text-gray-600 mb-6">{settings.description}</p>
                <div className="space-y-4">
                  {settings.formFields.name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                        disabled
                      />
                    </div>
                  )}
                  {settings.formFields.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                        disabled
                      />
                    </div>
                  )}
                  {settings.formFields.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        placeholder="Enter your phone number"
                        className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                        disabled
                      />
                    </div>
                  )}
                  <button
                    className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!settings.leadMagnet?.url || readOnly}
                  >
                    {settings.ctaButtonText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadGenerator; 