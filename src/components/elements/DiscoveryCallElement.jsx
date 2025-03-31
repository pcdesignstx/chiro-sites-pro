import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const DiscoveryCallElement = () => {
  const [settings, setSettings] = useState({
    headline: 'Book Your Free Discovery Call',
    subheadline: 'Let\'s chat about your health goals and how chiropractic care can help you feel your best.',
    benefit1: 'Discuss your symptoms and concerns',
    benefit2: 'Learn how chiropractic care works',
    benefit3: 'Get a personalized care plan',
    ctaText: 'Schedule My Call',
    bookingLink: '',
    isEnabled: true
  });

  const { currentUser } = useAuth();
  const db = getFirestore();

  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser) {
        console.log('No user found, skipping settings load');
        return;
      }

      try {
        console.log('Loading settings for user:', currentUser.uid);
        // First try to load from user-specific path
        const userSettingsRef = doc(db, 'users', currentUser.uid, 'settings', 'discoveryCall');
        const userSettingsSnap = await getDoc(userSettingsRef);

        if (userSettingsSnap.exists()) {
          console.log('Found user-specific settings');
          setSettings(userSettingsSnap.data());
        } else {
          console.log('No user-specific settings found, checking legacy path');
          // Try legacy path as fallback
          const legacyRef = doc(db, 'elements', 'discoveryCall');
          const legacySnap = await getDoc(legacyRef);
          
          if (legacySnap.exists()) {
            console.log('Found legacy settings');
            setSettings(legacySnap.data());
          } else {
            console.log('No settings found, using defaults');
          }
        }
      } catch (error) {
        console.error('Error loading discovery call settings:', error);
      }
    };

    loadSettings();
  }, [currentUser]);

  if (!settings.isEnabled) {
    return null;
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-sm">
      <h2 className="text-3xl font-bold text-gray-900 mb-3">{settings.headline}</h2>
      <p className="text-gray-600 text-lg mb-8">{settings.subheadline}</p>
      <ul className="space-y-4 mb-8">
        <li className="flex items-center text-gray-700">
          <svg className="w-6 h-6 text-teal-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span className="text-lg">{settings.benefit1}</span>
        </li>
        <li className="flex items-center text-gray-700">
          <svg className="w-6 h-6 text-teal-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span className="text-lg">{settings.benefit2}</span>
        </li>
        <li className="flex items-center text-gray-700">
          <svg className="w-6 h-6 text-teal-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span className="text-lg">{settings.benefit3}</span>
        </li>
      </ul>
      <button
        className="w-full bg-teal-500 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-teal-600 transition-colors"
        onClick={() => settings.bookingLink && window.open(settings.bookingLink, '_blank')}
        disabled={!settings.bookingLink}
      >
        {settings.ctaText}
      </button>
    </div>
  );
};

export default DiscoveryCallElement; 