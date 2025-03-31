import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { showNotification } from '../../utils/notification';

const defaultSettings = {
  message: 'New Patient Special: Get your first consultation for just $49!',
  ctaLabel: 'Book Now',
  ctaLink: '',
  backgroundColor: '#10b981',
  textColor: '#ffffff',
  position: 'top',
  dismissible: true
};

const PromoBar = ({ readOnly, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState(() => {
    if (!initialData) return defaultSettings;
    
    return {
      ...defaultSettings,
      ...initialData,
      message: initialData.message || defaultSettings.message,
      ctaLabel: initialData.ctaLabel || defaultSettings.ctaLabel,
      ctaLink: initialData.ctaLink || defaultSettings.ctaLink,
      backgroundColor: initialData.backgroundColor || defaultSettings.backgroundColor,
      textColor: initialData.textColor || defaultSettings.textColor,
      position: initialData.position || defaultSettings.position,
      dismissible: initialData.dismissible ?? defaultSettings.dismissible,
    };
  });

  const db = getFirestore();

  // Only load data if not in readOnly mode and no initialData provided
  useEffect(() => {
    if (readOnly || initialData) return;

    const loadSavedData = async () => {
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid, 'elements', 'promoBar');
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setSettings({
            ...defaultSettings,
            ...data,
            message: data.message || defaultSettings.message,
            ctaLabel: data.ctaLabel || defaultSettings.ctaLabel,
            ctaLink: data.ctaLink || defaultSettings.ctaLink,
            backgroundColor: data.backgroundColor || defaultSettings.backgroundColor,
            textColor: data.textColor || defaultSettings.textColor,
            position: data.position || defaultSettings.position,
            dismissible: data.dismissible ?? defaultSettings.dismissible,
          });
        } else {
          const legacyRef = doc(db, 'elements', 'promoBar');
          const legacySnap = await getDoc(legacyRef);
          
          if (legacySnap.exists()) {
            const data = legacySnap.data();
            setSettings({
              ...defaultSettings,
              ...data,
              message: data.message || defaultSettings.message,
              ctaLabel: data.ctaLabel || defaultSettings.ctaLabel,
              ctaLink: data.ctaLink || defaultSettings.ctaLink,
              backgroundColor: data.backgroundColor || defaultSettings.backgroundColor,
              textColor: data.textColor || defaultSettings.textColor,
              position: data.position || defaultSettings.position,
              dismissible: data.dismissible ?? defaultSettings.dismissible,
            });
          }
        }
      } catch (error) {
        console.error('Error loading promo bar settings:', error);
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

  const handleSave = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'promoBar');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      showNotification('Promo bar settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving promo bar settings:', error);
      showNotification('Failed to save promo bar settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
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
              Welcome! On this page you'll configure your Promo Bar element. To get started, click the play button below.
            </p>
            <div>
              <audio controls className="w-full">
                <source src="/promo-bar-intro.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Promo Bar</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {readOnly ? (
              <>
                {renderField('Message', settings.message)}
                {renderField('CTA Label', settings.ctaLabel)}
                {renderField('CTA Link', settings.ctaLink)}
                {renderField('Background Color', settings.backgroundColor)}
                {renderField('Text Color', settings.textColor)}
                {renderField('Position', settings.position)}
                {renderField('Dismissible', settings.dismissible ? 'Yes' : 'No')}
              </>
            ) : (
              <>
                {/* Interactive form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <input
                      type="text"
                      value={settings.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      placeholder="Enter your promotional message"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CTA Button Label
                    </label>
                    <input
                      type="text"
                      value={settings.ctaLabel}
                      onChange={(e) => handleInputChange('ctaLabel', e.target.value)}
                      placeholder="e.g., 'Book Now'"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CTA Button Link
                    </label>
                    <input
                      type="text"
                      value={settings.ctaLink}
                      onChange={(e) => handleInputChange('ctaLink', e.target.value)}
                      placeholder="Enter the URL"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={settings.textColor}
                      onChange={(e) => handleInputChange('textColor', e.target.value)}
                      className="w-full h-10 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <select
                      value={settings.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.dismissible}
                        onChange={(e) => handleInputChange('dismissible', e.target.checked)}
                        className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Allow users to dismiss</span>
                    </label>
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
              <div 
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: settings.backgroundColor,
                  color: settings.textColor
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{settings.message}</p>
                  {settings.ctaLabel && (
                    <button className="ml-4 px-4 py-1 bg-white text-teal-500 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors">
                      {settings.ctaLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromoBar; 