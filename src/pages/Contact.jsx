import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { showNotification } from '../utils/notification';

const Contact = ({ readOnly, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [settings, setSettings] = useState(initialData || {
    headline: "Let's Connect",
    introText: "Have a question or want to book an appointment? Reach out below.",
    formOptions: {
      includeName: true,
      includeEmail: true,
      includePhone: true,
      includeMessage: true,
      preferredContact: 'email'
    },
    contactInfo: {
      phone: '',
      email: '',
      address: '',
      mapsEmbed: ''
    },
    businessHours: [
      { day: 'Monday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Tuesday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Wednesday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Thursday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Friday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Saturday', hours: 'Closed' },
      { day: 'Sunday', hours: 'Closed' }
    ],
    ctaButtonLabel: 'Send Message',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    }
  });

  const { currentUser } = useAuth();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'pages', 'contact');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        console.error('Error loading contact settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFormOptionChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      formOptions: {
        ...prev.formOptions,
        [field]: value
      }
    }));
  };

  const handleContactInfoChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };

  const handleBusinessHoursChange = (index, field, value) => {
    const newHours = [...settings.businessHours];
    newHours[index] = {
      ...newHours[index],
      [field]: value
    };
    setSettings(prev => ({
      ...prev,
      businessHours: newHours
    }));
  };

  const handleSocialMediaChange = (platform, value) => {
    setSettings(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
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
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'contact');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      showNotification('Contact settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving contact settings:', error);
      showNotification('Failed to save contact settings. Please try again.', 'error');
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

      const { url, filename } = await uploadFile(file, 'contact-images', currentUser.uid);
      
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

      await deleteFile(filename, 'contact-images', currentUser.uid);
      
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

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Welcome Message and Audio - Only show if not readOnly */}
        {!readOnly && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <p className="text-gray-600 mb-4">
              Welcome! On this page you'll configure your contact page content and form settings. To get started, click the play button below.
            </p>
            <div>
              <audio controls className="w-full">
                <source src="/contact-intro.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Contact</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Headline */}
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
                placeholder="Enter your headline"
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
              />
            </div>

            {/* Intro Text */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Intro Text
                </label>
              </div>
              <textarea
                value={settings.introText}
                onChange={(e) => handleInputChange('introText', e.target.value)}
                placeholder="Enter your intro text"
                rows={3}
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
              />
            </div>

            {/* Form Options */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Form Options
                </label>
              </div>
              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.formOptions.includeName}
                    onChange={(e) => handleFormOptionChange('includeName', e.target.checked)}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Include Name field</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.formOptions.includeEmail}
                    onChange={(e) => handleFormOptionChange('includeEmail', e.target.checked)}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Include Email field</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.formOptions.includePhone}
                    onChange={(e) => handleFormOptionChange('includePhone', e.target.checked)}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Include Phone field</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.formOptions.includeMessage}
                    onChange={(e) => handleFormOptionChange('includeMessage', e.target.checked)}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">Include Message field</span>
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Contact Method
                  </label>
                  <select
                    value={settings.formOptions.preferredContact}
                    onChange={(e) => handleFormOptionChange('preferredContact', e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="either">Either</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Contact Information
                </label>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settings.contactInfo.phone}
                    onChange={(e) => handleContactInfoChange('phone', e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.contactInfo.email}
                    onChange={(e) => handleContactInfoChange('email', e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={settings.contactInfo.address}
                    onChange={(e) => handleContactInfoChange('address', e.target.value)}
                    placeholder="Enter your address"
                    rows={3}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Maps Embed Code
                  </label>
                  <textarea
                    value={settings.contactInfo.mapsEmbed}
                    onChange={(e) => handleContactInfoChange('mapsEmbed', e.target.value)}
                    placeholder="Enter your Google Maps embed code"
                    rows={3}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Business Hours
                </label>
              </div>
              <div className="space-y-4">
                {settings.businessHours.map((hours, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={hours.day}
                      onChange={(e) => handleBusinessHoursChange(index, 'day', e.target.value)}
                      placeholder="Day"
                      className="w-32 p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                    <input
                      type="text"
                      value={hours.hours}
                      onChange={(e) => handleBusinessHoursChange(index, 'hours', e.target.value)}
                      placeholder="Hours"
                      className="flex-1 p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                    <button
                      onClick={() => {
                        const newHours = [...settings.businessHours];
                        newHours.splice(index, 1);
                        setSettings(prev => ({
                          ...prev,
                          businessHours: newHours
                        }));
                      }}
                      className="p-1 text-red-500 hover:text-red-700 bg-transparent"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setSettings(prev => ({
                      ...prev,
                      businessHours: [
                        ...prev.businessHours,
                        { day: '', hours: '' }
                      ]
                    }));
                  }}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-500 transition-colors flex items-center justify-center bg-transparent"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Business Hours
                </button>
              </div>
            </div>

            {/* CTA Button Label */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  CTA Button Label
                </label>
              </div>
              <input
                type="text"
                value={settings.ctaButtonLabel}
                onChange={(e) => handleInputChange('ctaButtonLabel', e.target.value)}
                placeholder="Enter CTA button label"
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
              />
            </div>

            {/* Social Media Links */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Social Media Links
                </label>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook URL
                  </label>
                  <input
                    type="url"
                    value={settings.socialMedia.facebook}
                    onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                    placeholder="Enter your Facebook URL"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={settings.socialMedia.instagram}
                    onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                    placeholder="Enter your Instagram URL"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Twitter URL
                  </label>
                  <input
                    type="url"
                    value={settings.socialMedia.twitter}
                    onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                    placeholder="Enter your Twitter URL"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
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

export default Contact; 