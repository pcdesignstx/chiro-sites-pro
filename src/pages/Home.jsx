import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import { useFormData } from '../contexts/FormDataContext';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, validateFile, deleteFile } from '../utils/uploadUtils';
import { TrashIcon } from '@heroicons/react/24/outline';
import { showNotification } from '../utils/notification';

// Move defaultSettings outside component to prevent recreation on every render
const defaultSettings = {
  hero: {
    headline: 'Experience Natural Healing Through Expert Chiropractic Care',
    subheadline: 'Restore Your Health and Live Pain-Free with Our Gentle, Personalized Approach',
    backgroundType: 'image',
    backgroundImage: '',
    backgroundImageFilename: ''
  },
  problem: {
    headline: 'Living With Pain Should Not Be Your Normal',
    subheadline: 'Common Symptoms We Help Resolve',
    label1: 'Back & Neck Pain',
    copy1: 'Struggling with persistent back pain, neck stiffness, or recurring headaches? Our proven chiropractic techniques provide lasting relief without medication.'
  },
  guide: {
    headshot: '',
    headshotFilename: '',
    headline: 'Your Path to Wellness Starts Here',
    bodyCopy: 'With over 15 years of experience in chiropractic care, Dr. Smith and our dedicated team understand that each patient\'s journey to wellness is unique. We combine traditional chiropractic techniques with modern therapeutic approaches to create personalized treatment plans that address the root cause of your pain, not just the symptoms. Our gentle, effective treatments have helped thousands of patients regain their mobility and return to the activities they love.'
  },
  solution: {
    headline: 'Comprehensive Care for Your Whole Family',
    description: 'We offer a full range of chiropractic services to help you achieve optimal health and wellness',
    features: [
      'Gentle Spinal Adjustments',
      'Sports Injury Recovery',
      'Prenatal Chiropractic Care',
      'Advanced Pain Relief Techniques'
    ]
  },
  steps: {
    headline: 'Your Journey to Better Health',
    description: 'Getting started on your path to wellness is simple',
    items: [
      {
        title: '1. Initial Consultation',
        description: 'We\'ll discuss your health concerns and perform a thorough examination to understand your needs'
      },
      {
        title: '2. Custom Treatment Plan',
        description: 'We\'ll create a personalized care plan designed to achieve your health goals'
      },
      {
        title: '3. Start Healing',
        description: 'Begin your journey to a pain-free life with gentle, effective treatments'
      }
    ]
  }
};

const Home = ({ readOnly, initialData }) => {
  const { updateFormData } = useFormData();
  const [expandedSections, setExpandedSections] = useState({
    hero: true,
    problem: false,
    guide: false,
    solution: false,
    steps: false
  });
  const [isSaving, setIsSaving] = useState({
    hero: false,
    problem: false,
    guide: false,
    solution: false,
    steps: false
  });
  const [saveError, setSaveError] = useState(null);
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState(() => {
    const data = initialData || defaultSettings;
    return data;
  });

  // Update form data when settings change, with debounce
  useEffect(() => {
    if (!readOnly) {
      const timeoutId = setTimeout(() => {
        updateFormData('home', settings);
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [settings, readOnly, updateFormData]);

  // Load saved settings only when component mounts or currentUser changes
  useEffect(() => {
    let isMounted = true;

    const loadSavedSettings = async () => {
      if (!currentUser) return;

      try {
        console.log('Loading saved settings...');
        const docRef = doc(db, 'users', currentUser.uid, 'settings', 'home');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && isMounted) {
          console.log('Found saved settings:', docSnap.data());
          const savedData = docSnap.data();
          
          // Helper function to merge objects, preferring non-empty saved values
          const mergeWithDefaults = (defaults, saved) => {
            if (!saved) return defaults;
            const merged = { ...defaults };
            Object.keys(defaults).forEach(key => {
              if (saved[key] !== undefined && saved[key] !== '') {
                merged[key] = saved[key];
              }
            });
            return merged;
          };

          const mergedData = {
            hero: mergeWithDefaults(defaultSettings.hero, savedData.hero),
            problem: mergeWithDefaults(defaultSettings.problem, savedData.problem),
            guide: mergeWithDefaults(defaultSettings.guide, savedData.guide),
            solution: mergeWithDefaults(defaultSettings.solution, savedData.solution),
            steps: mergeWithDefaults(defaultSettings.steps, savedData.steps)
          };
          
          if (isMounted) {
            setSettings(mergedData);
          }
        } else if (isMounted) {
          console.log('No saved settings found, using defaults');
          await setDoc(docRef, {
            ...defaultSettings,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        if (isMounted) {
          showNotification('Error loading settings. Please try again.', 'error');
        }
      }
    };

    loadSavedSettings();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]); // Only depend on currentUser.uid

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleInputChange = (section, field, value) => {
    console.log(`Updating ${section}.${field} to:`, value);
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
      console.log(`New ${section} settings:`, newSettings[section]);
      return newSettings;
    });
  };

  const handleImageUpload = async (file, section) => {
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

      const { url, filename } = await uploadFile(file, 'images', currentUser.uid);
      
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          imageUrl: url,
          imageFilename: filename
        }
      }));

      showNotification('Image uploaded successfully!', 'success');
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification('Failed to upload image. Please try again.', 'error');
    }
  };

  const handleDeleteImage = async (section) => {
    try {
      const filename = settings[section]?.imageFilename;
      if (!filename) return;

      await deleteFile(filename, 'images', currentUser.uid);
      
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          imageUrl: '',
          imageFilename: ''
        }
      }));

      showNotification('Image deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting image:', error);
      showNotification('Failed to delete image. Please try again.', 'error');
    }
  };

  const handleSaveSection = async (section) => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    setIsSaving(prev => ({ ...prev, [section]: true }));
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'home');
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      const updatedData = {
        ...existingData,
        [section]: {
          ...settings[section],
          updatedAt: new Date().toISOString()
        }
      };

      await setDoc(docRef, updatedData);
      showNotification(`${section} section saved successfully!`, 'success');
    } catch (error) {
      console.error('Error saving section:', error);
      showNotification(`Failed to save ${section} section. Please try again.`, 'error');
    } finally {
      setIsSaving(prev => ({ ...prev, [section]: false }));
    }
  };

  const renderSectionSaveButton = (section) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleSaveSection(section);
      }}
      disabled={isSaving[section]}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
        isSaving[section]
          ? 'bg-gray-300 cursor-not-allowed'
          : 'bg-teal-500 hover:bg-teal-600 text-white'
      }`}
    >
      {isSaving[section] ? 'Saving...' : 'Save'}
    </button>
  );

  const handleSave = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    try {
      setIsSaving(true);

      // Prepare the data for Firestore
      const homeData = {
        hero: {
          ...settings.hero,
          backgroundImageFilename: settings.hero.backgroundImageFilename
        },
        problem: settings.problem,
        guide: {
          ...settings.guide,
          headshotFilename: settings.guide.headshotFilename
        },
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'home'), homeData);
      
      showNotification('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving home settings:', error);
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
              Welcome! On this page you'll submit the details we'll need to create the Home Page on your website. To get started, click the play button below.
            </p>
            <div>
              <audio controls className="w-full">
                <source src="/home-intro.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Hero Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleSection('hero')}
            >
              <div className="flex items-center space-x-2">
                <ChevronUpIcon 
                  className={`w-5 h-5 text-gray-500 transition-transform ${!expandedSections.hero ? 'rotate-180' : ''}`}
                />
                <h3 className="text-lg font-medium text-gray-900">Hero</h3>
              </div>
            </div>

            {expandedSections.hero && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={settings.hero.headline}
                    onChange={(e) => handleInputChange('hero', 'headline', e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subhead
                  </label>
                  <input
                    type="text"
                    value={settings.hero.subheadline}
                    onChange={(e) => handleInputChange('hero', 'subheadline', e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hero Background
                  </label>
                  <div className="flex items-center space-x-4 mb-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={settings.hero.backgroundType === 'image'}
                        onChange={() => handleInputChange('hero', 'backgroundType', 'image')}
                        className="text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Image</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={settings.hero.backgroundType === 'themeColor'}
                        onChange={() => handleInputChange('hero', 'backgroundType', 'themeColor')}
                        className="text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Theme Color</span>
                    </label>
                  </div>
                  {settings.hero.backgroundType === 'image' && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Upload a high resolution landscape image (JPEG or PNG)</p>
                      {settings.hero.backgroundImage ? (
                        <div className="relative mb-4">
                          <img
                            src={settings.hero.backgroundImage}
                            alt="Hero background"
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleDeleteImage('hero')}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null}
                      <button
                        onClick={() => document.getElementById('hero-image-upload').click()}
                        className="w-full py-2 px-4 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                      >
                        UPLOAD IMAGE
                      </button>
                      <input
                        id="hero-image-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/gif"
                        onChange={(e) => handleImageUpload(e.target.files[0], 'hero')}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-4">
                  {renderSectionSaveButton('hero')}
                </div>
              </div>
            )}
          </div>

          {/* Problem Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleSection('problem')}
            >
              <div className="flex items-center space-x-2">
                <ChevronUpIcon 
                  className={`w-5 h-5 text-gray-500 transition-transform ${!expandedSections.problem ? 'rotate-180' : ''}`}
                />
                <h3 className="text-lg font-medium text-gray-900">Problem</h3>
              </div>
            </div>

            {expandedSections.problem && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={settings.problem.headline}
                    onChange={(e) => handleInputChange('problem', 'headline', e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subhead
                  </label>
                  <input
                    type="text"
                    value={settings.problem.subheadline}
                    onChange={(e) => handleInputChange('problem', 'subheadline', e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label 1
                  </label>
                  <input
                    type="text"
                    value={settings.problem.label1}
                    onChange={(e) => handleInputChange('problem', 'label1', e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Copy 1
                  </label>
                  <textarea
                    value={settings.problem.copy1}
                    onChange={(e) => handleInputChange('problem', 'copy1', e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div className="flex justify-end mt-4">
                  {renderSectionSaveButton('problem')}
                </div>
              </div>
            )}
          </div>

          {/* Guide Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleSection('guide')}
            >
              <div className="flex items-center space-x-2">
                <ChevronUpIcon 
                  className={`w-5 h-5 text-gray-500 transition-transform ${!expandedSections.guide ? 'rotate-180' : ''}`}
                />
                <h3 className="text-lg font-medium text-gray-900">Guide</h3>
              </div>
            </div>

            {expandedSections.guide && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headshot
                  </label>
                  <p className="text-sm text-gray-500 mb-2">Your image must be high resolution (less than 10mb) and in JPEG or PNG format</p>
                  {settings.guide.headshot ? (
                    <div className="relative mb-4">
                      <img
                        src={settings.guide.headshot}
                        alt="Guide headshot"
                        className="w-32 h-32 mx-auto rounded-full object-cover"
                      />
                      <button
                        onClick={() => handleDeleteImage('guide')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                  <button
                    onClick={() => document.getElementById('guide-headshot-upload').click()}
                    className="w-full py-2 px-4 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                  >
                    UPLOAD IMAGE
                  </button>
                  <input
                    id="guide-headshot-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    onChange={(e) => handleImageUpload(e.target.files[0], 'guide')}
                    className="hidden"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={settings.guide.headline}
                    onChange={(e) => handleInputChange('guide', 'headline', e.target.value)}
                    placeholder="We Understand Chiropractors"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body Copy
                  </label>
                  <textarea
                    value={settings.guide.bodyCopy}
                    onChange={(e) => handleInputChange('guide', 'bodyCopy', e.target.value)}
                    placeholder="Having worked with hundreds of chiropractors, we've seen firsthand the challenges of maintaining an effective online presence while running a practice. That's why we've created ChiroSites Pro - a specialized website solution that helps you attract more patients and grow your practice without the hassle of managing complex technology."
                    rows={6}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div className="flex justify-end mt-4">
                  {renderSectionSaveButton('guide')}
                </div>
              </div>
            )}
          </div>

          {/* Solution Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleSection('solution')}
            >
              <div className="flex items-center space-x-2">
                <ChevronUpIcon 
                  className={`w-5 h-5 text-gray-500 transition-transform ${!expandedSections.solution ? 'rotate-180' : ''}`}
                />
                <h3 className="text-lg font-medium text-gray-900">Solution</h3>
              </div>
            </div>

            {expandedSections.solution && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={settings.solution.headline}
                    onChange={(e) => handleInputChange('solution', 'headline', e.target.value)}
                    placeholder="A Website That Works as Hard as You Do"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={settings.solution.description}
                    onChange={(e) => handleInputChange('solution', 'description', e.target.value)}
                    placeholder="Get a modern, professional website designed to grow your practice"
                    rows={3}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div className="flex justify-end mt-4">
                  {renderSectionSaveButton('solution')}
                </div>
              </div>
            )}
          </div>

          {/* Steps Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div 
              className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
              onClick={() => toggleSection('steps')}
            >
              <div className="flex items-center space-x-2">
                <ChevronUpIcon 
                  className={`w-5 h-5 text-gray-500 transition-transform ${!expandedSections.steps ? 'rotate-180' : ''}`}
                />
                <h3 className="text-lg font-medium text-gray-900">Steps</h3>
              </div>
            </div>

            {expandedSections.steps && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={settings.steps.headline}
                    onChange={(e) => handleInputChange('steps', 'headline', e.target.value)}
                    placeholder="Getting Started Is Easy"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={settings.steps.description}
                    onChange={(e) => handleInputChange('steps', 'description', e.target.value)}
                    placeholder="Follow these simple steps to launch your new chiropractic website"
                    rows={3}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-white text-black"
                  />
                </div>
                <div className="flex justify-end mt-4">
                  {renderSectionSaveButton('steps')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

 