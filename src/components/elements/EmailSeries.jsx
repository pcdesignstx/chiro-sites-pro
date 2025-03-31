import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { ChevronUpIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const EmailSeries = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [settings, setSettings] = useState({
    headline: 'Get Your Free Health Tips',
    subheadline: 'Join our email series and receive valuable health tips and insights.',
    benefit1: 'Weekly health tips',
    benefit2: 'Exercise recommendations',
    benefit3: 'Nutrition advice',
    ctaText: 'Subscribe Now',
    emailPlaceholder: 'Enter your email',
    isEnabled: true
  });

  const db = getFirestore();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'elements', 'emailSeries');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setSettings(docSnap.data());
          setIsEnabled(docSnap.data().isEnabled);
        }
      } catch (error) {
        console.error('Error loading email series settings:', error);
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      await setDoc(doc(db, 'elements', 'emailSeries'), {
        ...settings,
        isEnabled,
        updatedAt: new Date().toISOString()
      });

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMessage.textContent = 'Email Series settings saved successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);
    } catch (error) {
      console.error('Error saving email series settings:', error);
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Welcome Message and Audio */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <p className="text-gray-600 mb-4">
            Welcome! On this page you'll configure your Email Series element. To get started, click the play button below.
          </p>
          <div>
            <audio controls className="w-full">
              <source src="/email-series-intro.mp3" type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div 
            className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-2">
              <ChevronUpIcon className={`w-5 h-5 text-gray-500 transition-transform ${!isExpanded ? 'rotate-180' : ''}`} />
              <h3 className="text-lg font-medium text-gray-900">Email Series</h3>
            </div>
            <div className="flex items-center space-x-2">
              <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  checked={isEnabled}
                  onChange={() => setIsEnabled(!isEnabled)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
              <button 
                className="text-black bg-gray-100 rounded-lg p-1 hover:border-teal-500 border border-transparent transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <QuestionMarkCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="p-6 space-y-6">
              {/* Headline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Headline
                </label>
                <input
                  type="text"
                  value={settings.headline}
                  onChange={(e) => handleInputChange('headline', e.target.value)}
                  placeholder="Get Your Free Health Tips"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-transparent text-black"
                />
              </div>

              {/* Subheadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subheadline
                </label>
                <input
                  type="text"
                  value={settings.subheadline}
                  onChange={(e) => handleInputChange('subheadline', e.target.value)}
                  placeholder="Join our email series and receive valuable health tips and insights."
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-transparent text-black"
                />
              </div>

              {/* Benefits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benefit 1
                </label>
                <input
                  type="text"
                  value={settings.benefit1}
                  onChange={(e) => handleInputChange('benefit1', e.target.value)}
                  placeholder="Weekly health tips"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-transparent text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benefit 2
                </label>
                <input
                  type="text"
                  value={settings.benefit2}
                  onChange={(e) => handleInputChange('benefit2', e.target.value)}
                  placeholder="Exercise recommendations"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-transparent text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benefit 3
                </label>
                <input
                  type="text"
                  value={settings.benefit3}
                  onChange={(e) => handleInputChange('benefit3', e.target.value)}
                  placeholder="Nutrition advice"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-transparent text-black"
                />
              </div>

              {/* CTA Button Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={settings.ctaText}
                  onChange={(e) => handleInputChange('ctaText', e.target.value)}
                  placeholder="Subscribe Now"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-transparent text-black"
                />
              </div>

              {/* Email Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Input Placeholder
                </label>
                <input
                  type="text"
                  value={settings.emailPlaceholder}
                  onChange={(e) => handleInputChange('emailPlaceholder', e.target.value)}
                  placeholder="Enter your email"
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-transparent text-black"
                />
              </div>

              {/* Preview */}
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
                  <form className="space-y-4">
                    <input
                      type="email"
                      placeholder={settings.emailPlaceholder}
                      className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      className="w-full bg-teal-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-600 transition-colors"
                    >
                      {settings.ctaText}
                    </button>
                  </form>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSeries; 