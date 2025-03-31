import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { DocumentDuplicateIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { copyToClipboard, downloadAsJSON } from '../../utils/exportUtils';

const defaultSettings = {
  headline: 'Book Your Free Discovery Call',
  subheadline: 'Let\'s chat about your health goals and how chiropractic care can help you feel your best.',
  benefit1: 'Discuss your symptoms and concerns',
  benefit2: 'Learn how chiropractic care works',
  benefit3: 'Get a personalized care plan',
  ctaLabel: 'Schedule My Call',
  bookingLink: '',
  duration: '15 minutes',
  confirmationType: 'message',
  confirmationMessage: 'Thank you! We\'ll send you a confirmation email with your appointment details shortly.',
  redirectUrl: '',
  formFields: {
    name: true,
    email: true,
    phone: true
  }
};

const DiscoveryCall = ({ readOnly, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState(() => {
    if (!initialData) return defaultSettings;
    
    return {
      ...defaultSettings,
      ...initialData,
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
        const userDocRef = doc(db, 'users', currentUser.uid, 'elements', 'discoveryCall');
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setSettings(userDocSnap.data());
        } else {
          const legacyRef = doc(db, 'elements', 'discoveryCall');
          const legacySnap = await getDoc(legacyRef);
          
          if (legacySnap.exists()) {
            setSettings(legacySnap.data());
          }
        }
      } catch (error) {
        console.error('Error loading discovery call settings:', error);
        setSaveError('Failed to load saved settings');
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
    if (!currentUser || readOnly) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const data = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'elements', 'discoveryCall'), data);
      await setDoc(doc(db, 'users', currentUser.uid, 'elements', 'discoveryCall'), data);

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMessage.textContent = 'Settings saved successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(JSON.stringify(settings, null, 2));
    if (success) {
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMessage.textContent = 'Discovery Call settings copied to clipboard!';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);
    }
  };

  const handleDownload = () => {
    downloadAsJSON(settings, 'discovery-call-settings.json');
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
              Welcome! On this page you'll configure your Discovery Call element. To get started, click the play button below.
            </p>
            <div>
              <audio controls className="w-full">
                <source src="/discovery-call-intro.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Discovery Call</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {readOnly ? (
              <>
                {renderField('Headline', settings.headline)}
                {renderField('Description', settings.subheadline)}
                {renderField('Call Duration', settings.duration)}
                {renderField('CTA Button Label', settings.ctaLabel)}
                {renderField('Booking Link', settings.bookingLink)}
                {renderField('Confirmation Type', settings.confirmationType)}
                {renderField('Confirmation Message', settings.confirmationMessage)}
                {renderField('Redirect URL', settings.redirectUrl)}
                {renderField('Form Fields', Object.entries(settings.formFields)
                  .filter(([, enabled]) => enabled)
                  .map(([field]) => field)
                  .join(', '))}
              </>
            ) : (
              <>
                {/* Interactive form fields */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Headline
                    </label>
                  </div>
                  <input
                    type="text"
                    value={settings.headline}
                    onChange={(e) => handleInputChange('headline', e.target.value)}
                    placeholder="e.g., 'Schedule Your Free Back Pain Consultation'"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>

                {/* Other interactive fields... */}
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
              </>
            )}

            {/* Preview Section */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Preview:</h4>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{settings.headline}</h2>
                <p className="text-gray-600 mb-6">{settings.subheadline}</p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-teal-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {settings.benefit1}
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-teal-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {settings.benefit2}
                  </li>
                  <li className="flex items-center text-gray-700">
                    <svg className="w-5 h-5 text-teal-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {settings.benefit3}
                  </li>
                </ul>
                <button
                  className="w-full bg-teal-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-600 transition-colors"
                  disabled={!settings.bookingLink || readOnly}
                >
                  {settings.ctaLabel}
                </button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default DiscoveryCall; 