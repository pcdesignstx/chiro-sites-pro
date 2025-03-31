import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { TrashIcon, DocumentDuplicateIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { copyToClipboard, downloadAsJSON } from '../utils/exportUtils';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { showNotification } from '../utils/notification';

const Blog = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [settings, setSettings] = useState({
    pageTitle: '',
    introText: '',
    featuredImage: null,
    featuredImageUrl: '',
    layout: {
      showSidebar: true,
      postsPerRow: 2
    },
    categories: []
  });

  const db = getFirestore();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'pages', 'blog');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    } catch (error) {
      console.error('Error loading blog settings:', error);
      showNotification('Error loading blog settings. Please try again.', 'error');
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLayoutChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [field]: value
      }
    }));
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

      const { url, filename } = await uploadFile(file, 'blog-images', currentUser.uid);
      
      setSettings(prev => ({
        ...prev,
        featuredImage: {
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
      const filename = settings.featuredImage?.filename;
      if (!filename) return;

      await deleteFile(filename, 'blog-images', currentUser.uid);
      
      setSettings(prev => ({
        ...prev,
        featuredImage: {
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

  const handleCategoryAdd = (category) => {
    if (category && !settings.categories.includes(category)) {
      setSettings(prev => ({
        ...prev,
        categories: [...prev.categories, category.trim()]
      }));
    }
  };

  const handleCategoryRemove = (categoryToRemove) => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.filter(category => category !== categoryToRemove)
    }));
  };

  const handleSave = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'settings', 'blog');
      await setDoc(docRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      showNotification('Blog settings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving blog settings:', error);
      showNotification('Failed to save blog settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(JSON.stringify(settings, null, 2));
    if (success) {
      showNotification('Blog settings copied to clipboard!', 'success');
    }
  };

  const handleDownload = () => {
    downloadAsJSON(settings, 'blog-settings.json');
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <p className="text-gray-600">
            Welcome! On this page you'll configure your blog landing page.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Blog Configuration</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Blog Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blog Page Title
              </label>
              <input
                type="text"
                value={settings.pageTitle}
                onChange={(e) => handleInputChange('pageTitle', e.target.value)}
                placeholder="Insights from Dr. Smith"
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
              />
            </div>

            {/* Blog Intro Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blog Intro Text / Welcome Message
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Let visitors know what to expect from your blog content.
              </p>
              <textarea
                value={settings.introText}
                onChange={(e) => handleInputChange('introText', e.target.value)}
                rows={4}
                className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
              />
            </div>

            {/* Featured Image Display */}
            {settings.featuredImageUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Featured Image
                </label>
                <div className="relative">
                  <img
                    src={settings.featuredImageUrl}
                    alt="Featured"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Layout Preferences */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Layout Preferences</h4>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="show-sidebar"
                    checked={settings.layout.showSidebar}
                    onChange={(e) => handleLayoutChange('showSidebar', e.target.checked)}
                    className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <label htmlFor="show-sidebar" className="ml-2 text-sm text-gray-700">
                    Show Sidebar
                  </label>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Posts Per Row
                  </label>
                  <select
                    value={settings.layout.postsPerRow}
                    onChange={(e) => handleLayoutChange('postsPerRow', parseInt(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-200 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-lg bg-transparent text-black"
                  >
                    <option value={1}>1 Post</option>
                    <option value={2}>2 Posts</option>
                    <option value={3}>3 Posts</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Blog Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Blog Categories
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Type a category and press Enter (e.g., Wellness Tips, Neck Pain, Office News)"
                  className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      handleCategoryAdd(e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {settings.categories.map((category, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800"
                    >
                      {category}
                      <button
                        onClick={() => handleCategoryRemove(category)}
                        className="ml-2 text-teal-600 hover:text-teal-800"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Preview</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{settings.pageTitle || 'Blog Title'}</h1>
                {settings.featuredImageUrl && (
                  <div className="mb-4">
                    <img
                      src={settings.featuredImageUrl}
                      alt="Blog Header"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                <p className="text-gray-600 mb-6">{settings.introText || 'Welcome to our blog...'}</p>
                <div className={`grid gap-6 ${
                  settings.layout.postsPerRow === 1 ? 'grid-cols-1' :
                  settings.layout.postsPerRow === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {/* Mock Posts */}
                  {[1, 2, 3].map((post) => (
                    <div key={post} className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Sample Blog Post {post}</h3>
                      <p className="text-gray-600 text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  isSaving
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog; 