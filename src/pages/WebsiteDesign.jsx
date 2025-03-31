import { useState, useEffect } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, validateFile, deleteFile } from '../utils/uploadUtils';
import { TrashIcon } from '@heroicons/react/24/outline';
import { showNotification } from '../utils/notification';

const colorPalettes = [
  ['#4A90E2', '#2C3E50', '#F8FAFC'], // Professional Blue
  ['#00BFA6', '#263238', '#FFFFFF'], // Modern Teal
  ['#B22222', '#000000', '#F5F5F5'], // Bold Red
  ['#556B2F', '#2F4F4F', '#F5F5F5']  // Natural Green
];

const fontPairs = [
  { primary: 'Playfair Display', secondary: 'Montserrat' },    // Classic and modern
  { primary: 'Raleway', secondary: 'Open Sans' },              // Clean and professional
  { primary: 'Oswald', secondary: 'Libre Baskerville' },       // Strong and elegant
  { primary: 'Roboto Slab', secondary: 'Roboto' }             // Consistent and readable
];

const WebsitePreview = ({ fonts, colors }) => {
  // Default values for colors and fonts
  const previewColors = {
    color1: colors?.color1 || '#4A90E2', // Default primary color (blue)
    color2: colors?.color2 || '#2C3E50', // Default text color (dark blue/gray)
    color3: colors?.color3 || '#F8FAFC'  // Default background color (light gray)
  };

  const previewFonts = {
    primary: fonts?.primary || 'Raleway',
    secondary: fonts?.secondary || 'Open Sans'
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-gray-100">
        {/* Browser Mock */}
        <div className="mx-auto max-w-[900px] bg-gray-800 rounded-t-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>

        <div className="mx-auto max-w-[900px] bg-white min-h-[300px] shadow-2xl">
          {/* Navigation */}
          <header className="sticky top-0 z-50" style={{ backgroundColor: previewColors.color1 }}>
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex items-center justify-between h-16">
                <div className="text-xl font-bold text-white" style={{ fontFamily: previewFonts.primary }}>
                  ACME Inc.
                </div>
                <nav className="hidden md:flex space-x-8">
                  {['Home', 'About', 'Services', 'Contact'].map((item) => (
                    <a
                      key={item}
                      href="#"
                      className="text-white opacity-90 hover:opacity-100 transition-opacity"
                      style={{ fontFamily: previewFonts.secondary }}
                    >
                      {item}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <div className="relative overflow-hidden" style={{ backgroundColor: previewColors.color3 }}>
            <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
              <div className="text-center max-w-3xl mx-auto">
                <h1 
                  className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
                  style={{ 
                    fontFamily: previewFonts.primary,
                    color: previewColors.color1
                  }}
                >
                  Transform Your Business with Innovation
                </h1>
                <p 
                  className="text-xl mb-8"
                  style={{ 
                    fontFamily: previewFonts.secondary,
                    color: previewColors.color2
                  }}
                >
                  We help businesses grow through digital transformation and innovative solutions that drive real results.
                </p>
                <div className="flex gap-4 justify-center">
                  <button 
                    className="px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90"
                    style={{ 
                      backgroundColor: previewColors.color1,
                      fontFamily: previewFonts.secondary
                    }}
                  >
                    Get Started
                  </button>
                  <button 
                    className="px-6 py-3 rounded-lg font-medium transition-all border-2"
                    style={{ 
                      borderColor: previewColors.color1,
                      color: previewColors.color1,
                      fontFamily: previewFonts.secondary
                    }}
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div 
              className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 transform translate-x-16 -translate-y-16"
              style={{ backgroundColor: previewColors.color1 }}
            ></div>
            <div 
              className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 transform -translate-x-8 translate-y-8"
              style={{ backgroundColor: previewColors.color2 }}
            ></div>
          </div>

          {/* Features Section */}
          <div className="py-16 px-6" style={{ backgroundColor: 'white' }}>
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 
                  className="text-3xl font-bold mb-4"
                  style={{ 
                    fontFamily: previewFonts.primary,
                    color: previewColors.color1
                  }}
                >
                  Why Choose Us
                </h2>
                <p
                  className="text-lg max-w-2xl mx-auto"
                  style={{ 
                    fontFamily: previewFonts.secondary,
                    color: previewColors.color2
                  }}
                >
                  We deliver exceptional results through our commitment to quality, innovation, and customer satisfaction.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    title: 'Expert Team',
                    description: 'Our team of experts brings years of experience and knowledge to every project.'
                  },
                  {
                    title: 'Innovative Solutions',
                    description: 'We leverage cutting-edge technology to deliver innovative solutions that drive growth.'
                  },
                  {
                    title: 'Customer Focus',
                    description: 'Your success is our priority. We work closely with you to achieve your goals.'
                  }
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className="p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: 'white' }}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center"
                      style={{ backgroundColor: previewColors.color3 }}
                    >
                      <div 
                        className="w-6 h-6"
                        style={{ backgroundColor: previewColors.color1 }}
                      ></div>
                    </div>
                    <h3 
                      className="text-xl font-bold mb-3"
                      style={{ 
                        fontFamily: previewFonts.primary,
                        color: previewColors.color1
                      }}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className="mb-4"
                      style={{ 
                        fontFamily: previewFonts.secondary,
                        color: previewColors.color2
                      }}
                    >
                      {feature.description}
                    </p>
                    <a 
                      href="#"
                      className="inline-flex items-center font-medium hover:opacity-80 transition-opacity"
                      style={{ 
                        fontFamily: previewFonts.secondary,
                        color: previewColors.color1
                      }}
                    >
                      Learn More →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="py-16 px-6" style={{ backgroundColor: previewColors.color3 }}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 
                className="text-3xl font-bold mb-6"
                style={{ 
                  fontFamily: previewFonts.primary,
                  color: previewColors.color1
                }}
              >
                Ready to Transform Your Business?
              </h2>
              <p
                className="text-lg mb-8 max-w-2xl mx-auto"
                style={{ 
                  fontFamily: previewFonts.secondary,
                  color: previewColors.color2
                }}
              >
                Join thousands of businesses that have already transformed their operations with our innovative solutions.
              </p>
              <button 
                className="px-8 py-4 rounded-lg text-white font-medium text-lg transition-all hover:opacity-90"
                style={{ 
                  backgroundColor: previewColors.color1,
                  fontFamily: previewFonts.secondary
                }}
              >
                Schedule a Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WebsiteDesign = ({ readOnly, initialData }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isColorsExpanded, setIsColorsExpanded] = useState(true);
  const [isFontsExpanded, setIsFontsExpanded] = useState(true);
  const [selectedColors, setSelectedColors] = useState(initialData?.colors || {
    color1: '#4A90E2',
    color2: '#2C3E50',
    color3: '#F8FAFC'
  });
  const [selectedFonts, setSelectedFonts] = useState(initialData?.fonts || {
    primary: 'Raleway',
    secondary: 'Open Sans'
  });
  const [uploadedFonts, setUploadedFonts] = useState({ primary: null, secondary: null });
  const [fontPreviews, setFontPreviews] = useState({ primary: '', secondary: '' });
  const [saveError, setSaveError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [customColors, setCustomColors] = useState({
    color1: '',
    color2: '',
    color3: ''
  });

  // Load saved settings when component mounts
  useEffect(() => {
    const loadSavedSettings = async () => {
      if (!currentUser) {
        console.log('No user found, skipping settings load');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Loading settings for user:', currentUser.uid);
        // First try to load from user-specific path
        const userSettingsRef = doc(db, 'users', currentUser.uid, 'settings', 'websiteDesign');
        const userSettingsSnap = await getDoc(userSettingsRef);

        if (userSettingsSnap.exists()) {
          console.log('Found user-specific settings');
          const data = userSettingsSnap.data();
          if (data.colors) {
            setSelectedColors(data.colors);
            setCustomColors(data.colors);
          }
          if (data.fonts) {
            setSelectedFonts(data.fonts);
          }
        } else {
          console.log('No user-specific settings found, checking legacy path');
          // Try legacy path as fallback
          const legacyRef = doc(db, 'websiteDesign', 'settings');
          const legacySnap = await getDoc(legacyRef);
          
          if (legacySnap.exists()) {
            console.log('Found legacy settings, copying to user settings');
            const data = legacySnap.data();
            
            // Copy legacy settings to user-specific path
            await setDoc(userSettingsRef, {
              colors: data.colors || selectedColors,
              fonts: data.fonts || selectedFonts,
              updatedAt: new Date().toISOString()
            });

            if (data.colors) {
              setSelectedColors(data.colors);
              setCustomColors(data.colors);
            }
            if (data.fonts) {
              setSelectedFonts(data.fonts);
            }
          } else {
            console.log('No settings found, using defaults');
          }
        }
      } catch (error) {
        console.error('Error loading design settings:', error);
        setSaveError('Failed to load saved settings. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedSettings();
  }, [currentUser]);

  useEffect(() => {
    // Load Google Fonts
    const loadGoogleFonts = async () => {
      const fontFamilies = fontPairs.reduce((acc, pair) => {
        if (!acc.includes(pair.primary)) acc.push(pair.primary);
        if (!acc.includes(pair.secondary)) acc.push(pair.secondary);
        return acc;
      }, []);

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamilies.join('&family=')}&display=swap`;
      document.head.appendChild(link);
    };

    loadGoogleFonts();
  }, []);

  const handleColorSelect = (colors) => {
    setSelectedColors({
      color1: colors[0],
      color2: colors[1],
      color3: colors[2]
    });
  };

  const handleFontSelect = (fonts) => {
    setSelectedFonts({
      primary: fonts.primary,
      secondary: fonts.secondary
    });
  };

  const handleFontUpload = async (type, file) => {
    if (!file) return;

    // Validate the file
    const error = validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['font/ttf', 'font/otf', 'font/woff', 'font/woff2']
    });

    if (error) {
      showNotification(error, 'error');
      return;
    }

    try {
      // Upload to Firebase Storage
      const { url, filename } = await uploadFile(file, 'fonts', currentUser.uid);
      
      setSelectedFonts(prev => ({
        ...prev,
        [type]: {
          url,
          filename,
          name: file.name
        }
      }));
    } catch (error) {
      console.error('Error uploading font:', error);
      showNotification('Error uploading font. Please try again.', 'error');
    }
  };

  const handleDeleteFont = async (type, filename) => {
    try {
      // Delete from Firebase Storage
      await deleteFile(filename, 'fonts', currentUser.uid);
      
      setSelectedFonts(prev => ({
        ...prev,
        [type]: null
      }));
    } catch (error) {
      console.error('Error deleting font:', error);
      showNotification('Error deleting font. Please try again.', 'error');
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
      const designData = {
        colors: selectedColors,
        fonts: {
          primary: selectedFonts.primary,
          secondary: selectedFonts.secondary
        },
        updatedAt: new Date().toISOString()
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'websiteDesign'), designData);
      
      showNotification('Changes saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving design settings:', error);
      showNotification('Failed to save changes. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getFontWeight = (fontName) => {
    switch(fontName) {
      case 'Alfa Slab One':
        return '900'; // Much bolder weight
      case 'AMATIC SC':
        return '700';
      case 'Barlow Condensed':
        return '500';
      case 'Clicker Script':
        return '400';
      default:
        return '400';
    }
  };

  const getFontSize = (fontName) => {
    switch(fontName) {
      case 'Alfa Slab One':
        return '1.5rem';
      case 'AMATIC SC':
        return '1.75rem';
      case 'Clicker Script':
        return '1.5rem';
      case 'Barlow Condensed':
        return '1.4rem';
      default:
        return '1.25rem';
    }
  };

  const handleCustomColorChange = (colorKey, value) => {
    // Validate hex code format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (value === '' || hexRegex.test(value)) {
      setCustomColors(prev => ({
        ...prev,
        [colorKey]: value
      }));
      if (hexRegex.test(value)) {
        setSelectedColors(prev => ({
          ...prev,
          [colorKey]: value
        }));
      }
    }
  };

  const handleColorPickerChange = (colorKey, value) => {
    setSelectedColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
    setCustomColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 max-w-[1500px] mx-auto">
        {/* Left Column - Controls */}
        <div>
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                <span className="ml-2 text-gray-600">Loading saved settings...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Welcome Message and Audio - Only show if not readOnly */}
              {!readOnly && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                  <p className="text-gray-600 mb-4">
                    Welcome to your Website Design page! On this page you'll choose your website colors and your website fonts. To get started, click the play button below.
                  </p>
                  <div>
                    <audio controls className="w-full">
                      <source src="/website-design-intro.mp3" type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              )}

              <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
                <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Website Design</h3>
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>

                <div className="p-6 space-y-6">
                  {/* Website Colors Section */}
                  <div className="bg-white rounded-lg shadow-sm mb-8">
                    <div 
                      className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
                      onClick={() => setIsColorsExpanded(!isColorsExpanded)}
                    >
                      <div className="flex items-center space-x-2">
                        <ChevronUpIcon className={`w-5 h-5 text-gray-500 transition-transform ${!isColorsExpanded ? 'rotate-180' : ''}`} />
                        <h3 className="text-lg font-medium text-gray-900">Website Colors</h3>
                      </div>
                    </div>

                    {isColorsExpanded && (
                      <div className="p-6">
                        {/* Custom Color Section */}
                        <div className="mb-8">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Custom Colors</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                              { key: 'color1', label: 'Primary Color' },
                              { key: 'color2', label: 'Text Color' },
                              { key: 'color3', label: 'Background Color' }
                            ].map(({ key, label }) => (
                              <div key={key} className="space-y-2">
                                <label className="block text-sm text-gray-700">
                                  {label}
                                </label>
                                <div className="flex items-center space-x-2">
                                  <div className="relative w-full">
                                    <input
                                      type="text"
                                      value={customColors[key] || selectedColors[key]}
                                      onChange={(e) => handleCustomColorChange(key, e.target.value.toUpperCase())}
                                      className="w-full px-3 py-2 pr-20 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                      placeholder="#000000"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                      <div
                                        className="w-6 h-6 rounded border border-gray-300"
                                        style={{ backgroundColor: selectedColors[key] }}
                                      />
                                      <input
                                        type="color"
                                        value={selectedColors[key]}
                                        onChange={(e) => handleColorPickerChange(key, e.target.value)}
                                        className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0 m-0 pointer-events-auto"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-gray-200 my-8"></div>

                        <h4 className="text-sm font-medium text-gray-700 mb-4">Preset Color Palettes</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                          {colorPalettes.map((colors, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                handleColorSelect(colors);
                                setCustomColors({
                                  color1: colors[0],
                                  color2: colors[1],
                                  color3: colors[2]
                                });
                              }}
                              className={`h-16 rounded-lg overflow-hidden transition-all shadow-md cursor-pointer hover:shadow-lg ${
                                selectedColors.color1 === colors[0] ? 'ring-2 ring-teal-500' : ''
                              }`}
                            >
                              <div className="flex h-full bg-white rounded-lg">
                                {colors.map((color, colorIndex) => (
                                  <div 
                                    key={colorIndex} 
                                    className={`w-1/3 h-full ${colorIndex === 0 ? 'rounded-l-lg' : ''} ${colorIndex === 2 ? 'rounded-r-lg' : ''}`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Website Fonts Section */}
                  <div className="bg-white rounded-lg shadow-sm mb-8">
                    <div 
                      className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer"
                      onClick={() => setIsFontsExpanded(!isFontsExpanded)}
                    >
                      <div className="flex items-center space-x-2">
                        <ChevronUpIcon className={`w-5 h-5 text-gray-500 transition-transform ${!isFontsExpanded ? 'rotate-180' : ''}`} />
                        <h3 className="text-lg font-medium text-gray-900">Website Fonts</h3>
                      </div>
                    </div>

                    {isFontsExpanded && (
                      <div className="p-6">
                        {/* Preset Font Pairs */}
                        <h4 className="text-sm font-medium text-gray-700 mb-4">Preset Font Pairs</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                          {fontPairs.map((fonts, index) => (
                            <div
                              key={index}
                              onClick={() => handleFontSelect(fonts)}
                              className={`p-4 rounded border border-gray-200 transition-all bg-white ${
                                selectedFonts.primary === fonts.primary 
                                  ? 'ring-2 ring-teal-500' 
                                  : 'hover:border-teal-300'
                              } cursor-pointer`}
                            >
                              <div 
                                className="text-black mb-1" 
                                style={{ 
                                  fontFamily: fonts.primary,
                                  fontWeight: getFontWeight(fonts.primary),
                                  fontSize: getFontSize(fonts.primary),
                                  lineHeight: '1.2'
                                }}
                              >
                                {fonts.primary}
                              </div>
                              <div 
                                className="text-black" 
                                style={{ 
                                  fontFamily: fonts.secondary,
                                  fontSize: '0.875rem',
                                  lineHeight: '1.2'
                                }}
                              >
                                {fonts.secondary}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-gray-200 my-8"></div>

                        {/* Custom Fonts Section */}
                        <h4 className="text-sm font-medium text-gray-700 mb-4">Custom Fonts</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Primary Font Upload */}
                          <div className="space-y-2">
                            <label className="block text-sm text-gray-700">
                              Primary Font
                            </label>
                            <div className="flex flex-col space-y-2">
                              {selectedFonts.primary ? (
                                <div className="relative mb-4">
                                  <p className="text-sm text-gray-600">
                                    Current: {selectedFonts.primary.name}
                                  </p>
                                  <button
                                    onClick={() => handleDeleteFont('primary', selectedFonts.primary.filename)}
                                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : null}
                              <input
                                type="file"
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={(e) => handleFontUpload('primary', e.target.files[0])}
                                className="block w-full text-sm text-gray-900
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-lg file:border-0
                                  file:text-sm file:font-medium
                                  file:bg-teal-50 file:text-teal-700
                                  hover:file:bg-teal-100
                                  cursor-pointer border rounded-lg
                                  focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                          </div>

                          {/* Secondary Font Upload */}
                          <div className="space-y-2">
                            <label className="block text-sm text-gray-700">
                              Secondary Font
                            </label>
                            <div className="flex flex-col space-y-2">
                              {selectedFonts.secondary ? (
                                <div className="relative mb-4">
                                  <p className="text-sm text-gray-600">
                                    Current: {selectedFonts.secondary.name}
                                  </p>
                                  <button
                                    onClick={() => handleDeleteFont('secondary', selectedFonts.secondary.filename)}
                                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : null}
                              <input
                                type="file"
                                accept=".ttf,.otf,.woff,.woff2"
                                onChange={(e) => handleFontUpload('secondary', e.target.files[0])}
                                className="block w-full text-sm text-gray-900
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-lg file:border-0
                                  file:text-sm file:font-medium
                                  file:bg-teal-50 file:text-teal-700
                                  hover:file:bg-teal-100
                                  cursor-pointer border rounded-lg
                                  focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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

                  {/* Error Message */}
                  {saveError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                      {saveError}
                    </div>
                  )}
                </div>
              </details>
            </>
          )}
        </div>

        {/* Right Column - Preview */}
        <div className="hidden lg:block sticky top-0">
          <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
            <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Website Preview</h3>
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="p-6">
              <WebsitePreview fonts={selectedFonts} colors={selectedColors} />
            </div>
          </details>
        </div>

        {/* Mobile Preview (shown below controls) */}
        <div className="lg:hidden mt-8">
          <details className="bg-white rounded-lg shadow-sm mb-8 group" open>
            <summary className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Website Preview</h3>
              <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="p-6">
              <WebsitePreview fonts={selectedFonts} colors={selectedColors} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default WebsiteDesign;