import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { copyToClipboard, downloadAsJSON } from '../../utils/exportUtils';
import { db } from '../../firebase';
import { showNotification } from '../../utils/notification';

const defaultSettings = {
  headline: 'Frequently Asked Questions',
  subheadline: 'Find answers to common questions about chiropractic care and our services.',
  questions: [
    {
      question: 'What conditions do you treat?',
      answer: 'We treat a wide range of conditions including back pain, neck pain, headaches, sports injuries, and more.'
    },
    {
      question: 'Do you accept insurance?',
      answer: 'Yes, we accept most major insurance plans. Please contact our office to verify your coverage.'
    },
    {
      question: 'How long is a typical appointment?',
      answer: 'Initial consultations typically last 45-60 minutes, while follow-up visits are usually 20-30 minutes.'
    }
  ]
};

const FAQ = ({ readOnly, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState(() => {
    if (!initialData) return defaultSettings;
    
    return {
      ...defaultSettings,
      ...initialData,
      questions: initialData.questions || defaultSettings.questions
    };
  });

  const db = getFirestore();

  // Only load data if not in readOnly mode and no initialData provided
  useEffect(() => {
    if (readOnly || initialData) return;

    const loadSavedData = async () => {
      if (!currentUser) return;

      try {
        const userDocRef = doc(db, 'users', currentUser.uid, 'elements', 'faq');
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setSettings(userDocSnap.data());
        } else {
          const legacyRef = doc(db, 'elements', 'faq');
          const legacySnap = await getDoc(legacyRef);
          
          if (legacySnap.exists()) {
            setSettings(legacySnap.data());
          }
        }
      } catch (error) {
        console.error('Error loading FAQ settings:', error);
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

  const handleQuestionChange = (index, field, value) => {
    if (readOnly) return;
    setSettings(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const addQuestion = () => {
    if (readOnly) return;
    setSettings(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question: '', answer: '' }
      ]
    }));
  };

  const removeQuestion = (index) => {
    if (readOnly) return;
    setSettings(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'faq');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      showNotification('FAQ settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving FAQ settings:', error);
      showNotification('Failed to save FAQ settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(JSON.stringify(settings, null, 2));
    if (success) {
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMessage.textContent = 'FAQ settings copied to clipboard!';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);
    }
  };

  const handleDownload = () => {
    downloadAsJSON(settings, 'faq-settings.json');
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
              Welcome! On this page you'll configure your FAQ element. To get started, click the play button below.
            </p>
            <div>
              <audio controls className="w-full">
                <source src="/faq-intro.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">FAQ</h3>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {readOnly ? (
              <>
                {renderField('Headline', settings.headline)}
                {renderField('Subheadline', settings.subheadline)}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Questions</label>
                  <div className="space-y-4">
                    {settings.questions.map((qa, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-900">{qa.question}</p>
                        <p className="mt-2 text-gray-600">{qa.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Interactive form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Headline
                    </label>
                    <input
                      type="text"
                      value={settings.headline}
                      onChange={(e) => handleInputChange('headline', e.target.value)}
                      placeholder="e.g., 'Frequently Asked Questions'"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subheadline
                    </label>
                    <input
                      type="text"
                      value={settings.subheadline}
                      onChange={(e) => handleInputChange('subheadline', e.target.value)}
                      placeholder="e.g., 'Find answers to common questions about chiropractic care'"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Questions
                    </label>
                    <div className="space-y-4">
                      {settings.questions.map((qa, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                            <button
                              onClick={() => removeQuestion(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={qa.question}
                            onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                            placeholder="Enter your question"
                            className="w-full p-2 mb-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                          <textarea
                            value={qa.answer}
                            onChange={(e) => handleQuestionChange(index, 'answer', e.target.value)}
                            placeholder="Enter your answer"
                            rows={3}
                            className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                        </div>
                      ))}
                      <button
                        onClick={addQuestion}
                        className="flex items-center px-4 py-2 text-teal-500 hover:text-teal-600"
                      >
                        <PlusIcon className="w-5 h-5 mr-1" />
                        Add Question
                      </button>
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
              </>
            )}

            {/* Preview Section */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Preview:</h4>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{settings.headline}</h2>
                <p className="text-gray-600 mb-6">{settings.subheadline}</p>
                <div className="space-y-4">
                  {settings.questions.map((qa, index) => (
                    <details key={index} className="group">
                      <summary className="flex items-center justify-between p-4 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100">
                        <span className="font-medium text-gray-900">{qa.question}</span>
                        <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="mt-2 p-4 text-gray-600">
                        {qa.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ; 