import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { ref, getBlob, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { auth } from '../../firebase';
import { ArrowDownTrayIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { onAuthStateChanged } from 'firebase/auth';
import JSZip from 'jszip';
import { extractImageUrls, downloadImagesToZip, refreshDownloadURL, formatContentWithImages, createReadmeContent } from '../../utils/exportUtils';

const ContentExport = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [clientData, setClientData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [availableSections, setAvailableSections] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [exportSettings, setExportSettings] = useState({
    includeImages: true,
    exportFormat: 'zip',
    compressionLevel: 'medium'
  });

  // Known sections with preferred order and metadata
  const knownSections = [
    { id: 'websiteIdentity', name: 'Website Identity', description: 'Logo and branding information' },
    { id: 'websiteDesign', name: 'Website Design', description: 'Color scheme and design preferences' },
    { id: 'home', name: 'Home', description: 'Homepage content and hero section' },
    { id: 'about', name: 'About', description: 'About page content and team information' },
    { id: 'services', name: 'Services', description: 'Services and treatments offered' },
    { id: 'contact', name: 'Contact', description: 'Contact information and form settings' },
    { id: 'blog', name: 'Blog', description: 'Blog posts and articles' },
    { id: 'landingPages', name: 'Landing Pages', description: 'Custom landing pages' },
    { id: 'discoveryCall', name: 'Discovery Call', description: 'Consultation booking settings' },
    { id: 'leadGenerator', name: 'Lead Generator', description: 'Lead capture forms and settings' },
    { id: 'faq', name: 'FAQ', description: 'Frequently asked questions' },
    { id: 'promoBar', name: 'Promo Bar', description: 'Promotional banner settings' },
    { id: 'images', name: 'Images', description: 'Additional uploaded images' }
  ];

  // Helper function to format section title
  const formatSectionTitle = (sectionId) => {
    // First check if it's a known section
    const knownSection = knownSections.find(s => s.id === sectionId);
    if (knownSection) return knownSection.name;

    // Otherwise format the camelCase ID
    return sectionId
      // Insert space before capital letters
      .replace(/([A-Z])/g, ' $1')
      // Handle special cases like 'FAQ'
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // Capitalize first letter
      .replace(/^./, str => str.toUpperCase())
      // Clean up extra spaces
      .trim();
  };

  // Helper function to get section description
  const getSectionDescription = (sectionId) => {
    const knownSection = knownSections.find(s => s.id === sectionId);
    return knownSection?.description || 'Custom section content';
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setError('Please sign in to access this page');
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== 'admin' && userData.role !== 'owner') {
            setError('You do not have permission to access this page');
            return;
          }
          setCurrentUser(userData);
        } else {
          setError('User profile not found');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Error loading user data');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'owner')) {
        return;
      }

      try {
        setIsLoading(true);
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        const rawUsers = usersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter for clients only
        const filteredClients = rawUsers.filter(user => user.role === 'client');
        setClients(filteredClients);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setError('Failed to fetch clients');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      if (!selectedClient) {
        setClientData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchClientData(abortController.signal);
        if (isMounted) {
          setClientData(data);
        }
      } catch (error) {
        if (isMounted && error.name !== 'AbortError') {
          console.error('Error fetching client data:', error);
          setError(error.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [selectedClient]);

  useEffect(() => {
    loadExportSettings();
  }, []);

  const loadExportSettings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Try to load from Firestore first
      const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'adminSettings'));
      
      if (settingsDoc.exists() && settingsDoc.data().export) {
        setExportSettings(settingsDoc.data().export);
      } else {
        // If no Firestore settings, try localStorage
        const localSettings = localStorage.getItem('adminSettings');
        if (localSettings) {
          const settings = JSON.parse(localSettings);
          if (settings.export) {
            setExportSettings(settings.export);
          }
        }
      }
    } catch (err) {
      console.error('Error loading export settings:', err);
    }
  };

  const handleConnectionError = (error) => {
    console.error('Firestore connection error:', error);
    setIsConnected(false);
    setError('Lost connection to Firestore. Please refresh the page and try again.');
  };

  const fetchClientData = async (signal) => {
    if (!selectedClient) {
      return null;
    }
    
    try {
      console.log('Fetching data for client:', selectedClient);
      
      // First try to get the client's user document
      const userDoc = await getDoc(doc(db, 'users', selectedClient));

      if (!userDoc.exists()) {
        throw new Error('Client not found');
      }

      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      console.log('User document found:', userDoc.data());

      const clientData = {
        user: userDoc.data(),
        settings: {},
        content: {},
        pages: {}
      };

      // Batch all the document reads
      const batchPromises = [];
      const settingsResults = {};
      const pagesResults = {};
      const contentResults = {};

      // Get settings from the correct location based on the codebase
      const settingsToFetch = [
        'websiteIdentity',
        'websiteDesign',
        'home',
        'about',
        'services',
        'contact',
        'blog',
        'landingPages',
        'discoveryCall',
        'leadGenerator',
        'faq',
        'promoBar',
        'images'
      ];

      console.log('Fetching settings:', settingsToFetch);

      // Create promises for settings
      settingsToFetch.forEach(setting => {
        batchPromises.push(
          getDoc(doc(db, 'users', selectedClient, 'settings', setting))
            .then(doc => {
              if (doc.exists()) {
                clientData.settings[setting] = doc.data();
                settingsResults[setting] = 'found';
                console.log(`Found settings for ${setting}:`, doc.data());
              } else {
                settingsResults[setting] = 'not found';
                console.log(`No settings found for ${setting}`);
              }
            })
            .catch(err => {
              console.warn(`Error fetching setting ${setting}:`, err);
              settingsResults[setting] = `error: ${err.message}`;
            })
        );
      });

      // Create promises for pages
      const pagesToFetch = [
        'home',
        'about',
        'services',
        'contact',
        'blog',
        'landingPages',
        'discoveryCall',
        'leadGenerator',
        'faq'
      ];

      console.log('Fetching pages:', pagesToFetch);

      pagesToFetch.forEach(page => {
        batchPromises.push(
          getDoc(doc(db, 'users', selectedClient, 'pages', page))
            .then(doc => {
              if (doc.exists()) {
                clientData.pages[page] = doc.data();
                pagesResults[page] = 'found';
                console.log(`Found page data for ${page}:`, doc.data());
              } else {
                pagesResults[page] = 'not found';
                console.log(`No page data found for ${page}`);
              }
            })
            .catch(err => {
              console.warn(`Error fetching page ${page}:`, err);
              pagesResults[page] = `error: ${err.message}`;
            })
        );
      });

      // Add special collection promises
      console.log('Fetching special collections');

      // Blog posts
      batchPromises.push(
        getDoc(doc(db, 'users', selectedClient, 'blog', 'posts'))
          .then(doc => {
            if (doc.exists()) {
              clientData.content.blog = doc.data();
              contentResults.blog = 'found';
              console.log('Found blog posts:', doc.data());
            } else {
              contentResults.blog = 'not found';
              console.log('No blog posts found');
            }
          })
          .catch(err => {
            console.warn('Error fetching blog:', err);
            contentResults.blog = `error: ${err.message}`;
          })
      );

      // Landing pages
      batchPromises.push(
        getDoc(doc(db, 'pages', 'landingPages'))
          .then(doc => {
            if (doc.exists()) {
              clientData.content.landingPages = doc.data();
              contentResults.landingPages = 'found';
              console.log('Found landing pages:', doc.data());
            } else {
              contentResults.landingPages = 'not found';
              console.log('No landing pages found');
            }
          })
          .catch(err => {
            console.warn('Error fetching landing pages:', err);
            contentResults.landingPages = `error: ${err.message}`;
          })
      );

      // Discovery Call
      batchPromises.push(
        getDoc(doc(db, 'elements', 'discoveryCall'))
          .then(doc => {
            if (doc.exists()) {
              clientData.content.discoveryCall = doc.data();
              contentResults.discoveryCall = 'found';
              console.log('Found discovery call:', doc.data());
            } else {
              contentResults.discoveryCall = 'not found';
              console.log('No discovery call found');
            }
          })
          .catch(err => {
            console.warn('Error fetching discovery call:', err);
            contentResults.discoveryCall = `error: ${err.message}`;
          })
      );

      // Images
      batchPromises.push(
        getDoc(doc(db, 'users', selectedClient, 'uploads', 'images'))
          .then(doc => {
            if (doc.exists()) {
              clientData.content.images = doc.data();
              contentResults.images = 'found';
              console.log('Found uploaded images:', doc.data());
            } else {
              contentResults.images = 'not found';
              console.log('No uploaded images found');
            }
          })
          .catch(err => {
            console.warn('Error fetching uploads:', err);
            contentResults.images = `error: ${err.message}`;
          })
      );

      // Wait for all promises to settle
      await Promise.allSettled(batchPromises);

      console.log('Fetch results:', {
        settings: settingsResults,
        pages: pagesResults,
        content: contentResults
      });

      // If we have any data, set it
      if (Object.keys(clientData.settings).length > 0 || 
          Object.keys(clientData.content).length > 0 || 
          Object.keys(clientData.pages).length > 0) {
        console.log('Found client data:', {
          settings: Object.keys(clientData.settings),
          pages: Object.keys(clientData.pages),
          content: Object.keys(clientData.content),
          fullData: clientData
        });
        return clientData;
      } else {
        throw new Error('No content found for this client. They may need to complete their submission first.');
      }
    } catch (err) {
      if (err.code === 'permission-denied') {
        throw new Error('You do not have permission to access this client\'s data');
      }
      if (err.code === 'unavailable' || err.code === 'resource-exhausted') {
        handleConnectionError(err);
        throw new Error('Connection to database lost. Please refresh and try again.');
      }
      throw err;
    }
  };

  const formatContent = (data, sectionName) => {
    if (!data) return 'No content available';

    // Use the new formatContentWithImages function
    return formatContentWithImages(data, sectionName);
  };

  const getSectionData = (sectionId) => {
    if (!clientData) return null;
    console.log('Debug: Getting data for section:', sectionId);

    // First check settings
    if (clientData.settings?.[sectionId]) {
      console.log('Debug: Found in settings');
      return clientData.settings[sectionId];
    }

    // Then check pages
    if (clientData.pages?.[sectionId]) {
      console.log('Debug: Found in pages');
      return clientData.pages[sectionId];
    }

    // Check content for blog, landing pages, and images
    if (clientData.content?.[sectionId]) {
      console.log('Debug: Found in content');
      return clientData.content[sectionId];
    }

    // Special cases for nested data
    switch (sectionId) {
      case 'home':
        const homeData = clientData.pages?.home || clientData.settings?.home;
        console.log('Debug: Home data found:', !!homeData);
        return homeData;
      case 'about':
        const aboutData = clientData.pages?.about || clientData.settings?.about;
        console.log('Debug: About data found:', !!aboutData);
        return aboutData;
      case 'services':
        const servicesData = clientData.pages?.services || clientData.settings?.services;
        console.log('Debug: Services data found:', !!servicesData);
        return servicesData;
      case 'contact':
        const contactData = clientData.pages?.contact || clientData.settings?.contact;
        console.log('Debug: Contact data found:', !!contactData);
        return contactData;
      case 'blog':
        const blogData = clientData.content?.blog || clientData.pages?.blog;
        console.log('Debug: Blog data found:', !!blogData);
        return blogData;
      case 'landingPages':
        const landingData = clientData.content?.landingPages || clientData.pages?.landingPages;
        console.log('Debug: Landing pages data found:', !!landingData);
        return landingData;
      case 'faq':
        const faqData = clientData.pages?.faq || clientData.settings?.faq;
        console.log('Debug: FAQ data found:', !!faqData);
        return faqData;
      case 'images':
        const allImages = new Set();
        Object.values(clientData.settings || {}).forEach(data => {
          extractImageUrls(data).forEach(url => allImages.add(url));
        });
        Object.values(clientData.pages || {}).forEach(data => {
          extractImageUrls(data).forEach(url => allImages.add(url));
        });
        Object.values(clientData.content || {}).forEach(data => {
          extractImageUrls(data).forEach(url => allImages.add(url));
        });
        console.log('Debug: Images found:', allImages.size);
        return allImages.size > 0 ? { images: Array.from(allImages) } : null;
      default:
        console.log('Debug: No data found for section:', sectionId);
        return null;
    }
  };

  const hasContent = (section, sectionData) => {
    console.log(`Checking content for section ${section.id}:`, sectionData);
    
    // If the section is marked as having no data, return false
    if (section.hasData === false) return false;
    
    // Special cases first
    switch (section.id) {
      case 'landingPages':
        return !!(clientData?.content?.landingPages?.pages?.length > 0);
      case 'discoveryCall':
        return !!(clientData?.content?.discoveryCall);
      case 'leadGenerator':
        return !!(clientData?.settings?.leadGenerator || clientData?.pages?.leadGenerator);
      case 'faq':
        return !!(clientData?.settings?.faq || clientData?.pages?.faq);
      case 'promoBar':
        return !!(clientData?.settings?.promoBar);
      case 'blog':
        return !!(clientData?.content?.blog || clientData?.settings?.blog || clientData?.pages?.blog);
      case 'images':
        const allImages = extractImageUrls(clientData);
        return allImages.length > 0;
    }
    
    // If we have section data, check its content
    if (sectionData) {
      // Check for image URLs
      const imageUrls = extractImageUrls(sectionData);
      if (imageUrls.length > 0) return true;

      // Check for non-empty text content
      if (typeof sectionData === 'object' && Object.keys(sectionData).length > 0) return true;
      if (typeof sectionData === 'string' && sectionData.trim().length > 0) return true;
    }

    return false;
  };

  const processImage = async (url, imagesFolder) => {
    try {
      // Handle base64 encoded images
      if (url.startsWith('data:image/')) {
        const base64Data = url.split(',')[1];
        const mimeType = url.split(',')[0].split(':')[1].split(';')[0];
        const extension = mimeType.split('/')[1];
        const binaryData = atob(base64Data);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const filename = `image-${Date.now()}.${extension}`;
        imagesFolder.file(filename, blob);
        return { success: true };
      }

      // Handle Firebase Storage URLs
      if (url.includes('firebasestorage.googleapis.com')) {
        const pathMatch = url.match(/\/o\/([^?]+)/);
        if (pathMatch) {
          const storagePath = decodeURIComponent(pathMatch[1]);
          try {
            // Create a reference to the file
            const storageRef = ref(storage, storagePath);
            
            // Get the download URL first
            const downloadURL = await getDownloadURL(storageRef);
            
            // Fetch the image using the download URL
            const response = await fetch(downloadURL);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }

            const blob = await response.blob();
            if (!blob.size) {
              console.warn(`Empty blob received for: ${url}`);
              return { success: false, error: 'EMPTY_BLOB' };
            }

            const originalFilename = storagePath.split('/').pop();
            const extension = originalFilename.split('.').pop().toLowerCase() || 'jpg';
            const filename = `image-${Date.now()}.${extension}`;
            imagesFolder.file(filename, blob);
            return { success: true };
          } catch (error) {
            console.warn(`Failed to process Firebase Storage image: ${url}`, error);
            return { 
              success: false, 
              error: 'PROCESS_ERROR',
              message: error.message
            };
          }
        }
        return { success: false, error: 'INVALID_URL' };
      }

      // Handle regular URLs
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to fetch image: ${url}, Status: ${response.status}`);
          return { success: false, error: 'FETCH_ERROR' };
        }

        const blob = await response.blob();
        if (!blob.size) {
          console.warn(`Empty blob received for: ${url}`);
          return { success: false, error: 'EMPTY_BLOB' };
        }

        const extension = url.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
        const filename = `image-${Date.now()}.${extension}`;
        imagesFolder.file(filename, blob);
        return { success: true };
      } catch (error) {
        console.warn(`Failed to process regular image URL: ${url}`, error);
        return { success: false, error: 'PROCESS_ERROR' };
      }
    } catch (error) {
      console.warn(`Error processing image URL ${url}:`, error);
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  };

  const handleExport = async (sectionId) => {
    try {
      setExporting(true);
      const zip = new JSZip();

      // Get section data
      const sectionData = getSectionData(sectionId);
      if (!sectionData) {
        throw new Error('No data available for this section');
      }

      // Create content based on export format
      let content;
      switch (exportSettings.exportFormat) {
        case 'json':
          content = JSON.stringify(sectionData, null, 2);
          break;
        case 'txt':
          content = formatContentForText(sectionData);
          break;
        default: // zip
          content = await createZipContent(sectionData);
          break;
      }

      // Create and trigger download
      const blob = new Blob([content], { type: getContentType() });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getFileName(sectionId);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExporting(false);
    } catch (err) {
      console.error('Error exporting content:', err);
      setError(err.message);
      setExporting(false);
    }
  };

  const getContentType = () => {
    switch (exportSettings.exportFormat) {
      case 'json':
        return 'application/json';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/zip';
    }
  };

  const getFileName = (sectionId) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    switch (exportSettings.exportFormat) {
      case 'json':
        return `${sectionId}-${timestamp}.json`;
      case 'txt':
        return `${sectionId}-${timestamp}.txt`;
      default:
        return `${sectionId}-${timestamp}.zip`;
    }
  };

  const formatContentForText = (data) => {
    let text = '';
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object') {
        text += `${key}:\n${formatContentForText(value)}\n\n`;
      } else {
        text += `${key}: ${value}\n`;
      }
    }
    return text;
  };

  const createZipContent = async (data) => {
    const zip = new JSZip();
    
    // Add content file
    const content = formatContentForText(data);
    zip.file('content.txt', content);

    // Add images if enabled
    if (exportSettings.includeImages) {
      const images = await extractImageUrls(data);
      for (const [index, imageUrl] of images.entries()) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          zip.file(`images/image-${index + 1}.${getImageExtension(blob.type)}`, blob);
        } catch (err) {
          console.error(`Error adding image to zip: ${err.message}`);
        }
      }
    }

    // Set compression level
    const options = {
      compression: getCompressionLevel(exportSettings.compressionLevel),
      compressionOptions: {
        level: getCompressionLevel(exportSettings.compressionLevel)
      }
    };

    return await zip.generateAsync(options);
  };

  const getCompressionLevel = (level) => {
    switch (level) {
      case 'high':
        return 9;
      case 'medium':
        return 6;
      case 'low':
        return 3;
      default:
        return 0;
    }
  };

  const extractImageUrls = async (data) => {
    const urls = [];
    const processValue = (value) => {
      if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:'))) {
        urls.push(value);
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(processValue);
      }
    };
    Object.values(data).forEach(processValue);
    return urls;
  };

  const getImageExtension = (mimeType) => {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg';
    }
  };

  useEffect(() => {
    if (clientData) {
      // Get all unique section IDs from client data
      const sections = new Set();
      console.log('Debug: Initial clientData:', {
        settings: Object.keys(clientData.settings || {}),
        pages: Object.keys(clientData.pages || {}),
        content: Object.keys(clientData.content || {})
      });

      // First add ALL known sections
      knownSections.forEach(section => {
        sections.add(section.id);
      });

      // Then add any sections found in the data that aren't already known
      Object.keys(clientData.settings || {}).forEach(key => {
        console.log('Debug: Found setting section:', key);
        sections.add(key);
      });
      
      Object.keys(clientData.pages || {}).forEach(key => {
        console.log('Debug: Found page section:', key);
        sections.add(key);
      });
      
      Object.keys(clientData.content || {}).forEach(key => {
        console.log('Debug: Found content section:', key);
        sections.add(key);
      });

      console.log('Debug: All sections to display:', Array.from(sections));

      // Create ordered section list
      const orderedSections = [];

      // First add known sections in their preferred order
      knownSections.forEach(section => {
        // Check if section has data
        const hasData = !!(
          clientData.settings?.[section.id] ||
          clientData.pages?.[section.id] ||
          clientData.content?.[section.id] ||
          (section.id === 'blog' && clientData.content?.blog) ||
          (section.id === 'landingPages' && clientData.content?.landingPages) ||
          (section.id === 'images' && extractImageUrls(clientData).length > 0)
        );

        console.log(`Debug: Known section ${section.id} has data:`, hasData);
        
        orderedSections.push({
          id: section.id,
          name: section.name,
          description: section.description,
          isKnown: true,
          hasData
        });
      });

      // Then add any remaining unknown sections
      Array.from(sections)
        .filter(sectionId => !knownSections.find(s => s.id === sectionId))
        .sort()
        .forEach(sectionId => {
          console.log('Debug: Adding unknown section:', sectionId);
          orderedSections.push({
            id: sectionId,
            name: formatSectionTitle(sectionId),
            description: `Custom ${formatSectionTitle(sectionId).toLowerCase()} content`,
            isKnown: false,
            hasData: true // Unknown sections are only added if they have data
          });
        });

      console.log('Debug: Final orderedSections:', orderedSections);
      setAvailableSections(orderedSections);
    }
  }, [clientData]);

  const writeSectionToFile = (section, content, folder) => {
    let contentText = '';

    // Add section title
    contentText += `${section.name}\n`;
    contentText += '='.repeat(section.name.length) + '\n\n';

    // Add section description if available
    if (section.description) {
      contentText += `${section.description}\n\n`;
    }

    // Process content based on section type
    switch (section.name) {
      case 'Services':
        if (Array.isArray(content)) {
          content.forEach(service => {
            contentText += `${service.name}\n`;
            contentText += '-'.repeat(service.name.length) + '\n';
            if (service.description) contentText += `${service.description}\n\n`;
            if (service.price) contentText += `Price: ${service.price}\n\n`;
            if (service.imageUrl) contentText += `Image URL: ${service.imageUrl}\n\n`;
            if (service.customIcon) contentText += `Icon URL: ${service.customIcon}\n\n`;
            contentText += '\n';
          });
        } else if (content && typeof content === 'object') {
          // Handle single service object
          contentText += `${content.name || 'Unnamed Service'}\n`;
          contentText += '-'.repeat((content.name || 'Unnamed Service').length) + '\n';
          if (content.description) contentText += `${content.description}\n\n`;
          if (content.price) contentText += `Price: ${content.price}\n\n`;
          if (content.imageUrl) contentText += `Image URL: ${content.imageUrl}\n\n`;
          if (content.customIcon) contentText += `Icon URL: ${content.customIcon}\n\n`;
          contentText += '\n';
        }
        break;

      case 'About':
        if (content.description) contentText += `${content.description}\n\n`;
        if (content.imageUrl) contentText += `Image URL: ${content.imageUrl}\n\n`;
        if (content.videoUrl) contentText += `Video URL: ${content.videoUrl}\n\n`;
        break;

      case 'Contact':
        if (content.address) contentText += `Address: ${content.address}\n\n`;
        if (content.phone) contentText += `Phone: ${content.phone}\n\n`;
        if (content.email) contentText += `Email: ${content.email}\n\n`;
        if (content.website) contentText += `Website URL: ${content.website}\n\n`;
        if (content.hours) contentText += `Hours: ${content.hours}\n\n`;
        if (content.mapUrl) contentText += `Map URL: ${content.mapUrl}\n\n`;
        break;

      default:
        if (typeof content === 'object') {
          Object.entries(content).forEach(([key, value]) => {
            if (value) {
              if (Array.isArray(value)) {
                contentText += `${key}:\n`;
                value.forEach((item, index) => {
                  contentText += `  Item ${index + 1}:\n`;
                  if (typeof item === 'object') {
                    Object.entries(item).forEach(([subKey, subValue]) => {
                      if (subValue) {
                        if (typeof subValue === 'string' && subValue.startsWith('http')) {
                          contentText += `    ${subKey} URL: ${subValue}\n`;
                        } else {
                          contentText += `    ${subKey}: ${subValue}\n`;
                        }
                      }
                    });
                  } else {
                    contentText += `    ${item}\n`;
                  }
                });
                contentText += '\n';
              } else if (typeof value === 'object') {
                contentText += `${key}:\n`;
                Object.entries(value).forEach(([subKey, subValue]) => {
                  if (subValue) {
                    if (typeof subValue === 'string' && subValue.startsWith('http')) {
                      contentText += `  ${subKey} URL: ${subValue}\n`;
                    } else {
                      contentText += `  ${subKey}: ${subValue}\n`;
                    }
                  }
                });
                contentText += '\n';
              } else if (typeof value === 'string' && value.startsWith('http')) {
                contentText += `${key} URL: ${value}\n\n`;
              } else {
                contentText += `${key}: ${value}\n\n`;
              }
            }
          });
        } else if (content) {
          contentText += content;
        }
    }

    folder.file(`${section.name.toLowerCase()}.txt`, contentText);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-black">Content Export</h1>
      
      {!isConnected && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Connection to database lost. Please refresh the page to reconnect.
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Client
          </label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md bg-white text-black"
          >
            <option value="">Select a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name || client.displayName || 'Unnamed Client'} ({client.email})
              </option>
            ))}
          </select>
        </div>

        {/* Sections List */}
        {clientData && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Available Sections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableSections.map(section => {
                const sectionData = getSectionData(section.id);
                const hasContentData = hasContent(section, sectionData);
                
                return (
                  <div key={section.id} 
                       className={`border rounded-lg p-4 bg-white shadow-sm ${!hasContentData ? 'opacity-75' : ''} ${!section.isKnown ? 'border-blue-200' : ''}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {section.name}
                          {!section.isKnown && (
                            <span className="ml-2 text-xs text-blue-600 font-normal">Custom</span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">{section.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        {!hasContentData && (
                          <div className="text-gray-400 flex items-center" title="No content available">
                            <ExclamationCircleIcon className="h-5 w-5" />
                          </div>
                        )}
                        <button
                          onClick={() => handleExport(section.id)}
                          disabled={isLoading || !hasContentData}
                          className={`p-1 ${hasContentData ? 'text-teal-600 hover:text-teal-700' : 'text-gray-300'}`}
                          title={hasContentData ? "Download content" : "No content to download"}
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Export All Button */}
            <button
              onClick={exportAllContent}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export Entire Submission
            </button>
          </div>
        )}

        {isLoading && (
          <div className="text-center text-gray-600">
            Processing...
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentExport; 