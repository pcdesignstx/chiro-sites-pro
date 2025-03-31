import React, { useState, useEffect } from 'react';
import { getFirestore, collection, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

const LandingPages = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [landingPages, setLandingPages] = useState([]);
  const [editingPage, setEditingPage] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [currentPage, setCurrentPage] = useState({
    id: '',
    title: '',
    subheadline: '',
    goal: 'New Patient Offer',
    bodyContent: '',
    featuredImage: '',
    includeTestimonials: false,
    formSettings: {
      includeName: true,
      includeEmail: true,
      includePhone: true,
      ctaButtonText: 'Get Started',
      confirmationType: 'message',
      confirmationMessage: 'Thank you! We\'ll be in touch shortly.',
      redirectUrl: ''
    }
  });

  const db = getFirestore();

  useEffect(() => {
    loadLandingPages();
  }, []);

  const loadLandingPages = async () => {
    try {
      const docRef = doc(db, 'pages', 'landingPages');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setLandingPages(docSnap.data().pages || []);
        setIsEnabled(docSnap.data().isEnabled);
      }
    } catch (error) {
      console.error('Error loading landing pages:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setCurrentPage(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFormSettingChange = (field, value) => {
    setCurrentPage(prev => ({
      ...prev,
      formSettings: {
        ...prev.formSettings,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!currentPage.id) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      const updatedPages = editingPage
        ? landingPages.map(page => page.id === currentPage.id ? currentPage : page)
        : [...landingPages, currentPage];

      await setDoc(doc(db, 'pages', 'landingPages'), {
        pages: updatedPages,
        isEnabled,
        updatedAt: new Date().toISOString()
      });

      setLandingPages(updatedPages);
      setShowForm(false);
      setEditingPage(null);
      setCurrentPage({
        id: '',
        title: '',
        subheadline: '',
        goal: 'New Patient Offer',
        bodyContent: '',
        featuredImage: '',
        includeTestimonials: false,
        formSettings: {
          includeName: true,
          includeEmail: true,
          includePhone: true,
          ctaButtonText: 'Get Started',
          confirmationType: 'message',
          confirmationMessage: 'Thank you! We\'ll be in touch shortly.',
          redirectUrl: ''
        }
      });

      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMessage.textContent = 'Landing page saved successfully!';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);
    } catch (error) {
      console.error('Error saving landing page:', error);
      setSaveError('Failed to save landing page. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (pageId) => {
    if (window.confirm('Are you sure you want to delete this landing page?')) {
      try {
        const updatedPages = landingPages.filter(page => page.id !== pageId);
        await setDoc(doc(db, 'pages', 'landingPages'), {
          pages: updatedPages,
          isEnabled,
          updatedAt: new Date().toISOString()
        });
        setLandingPages(updatedPages);
      } catch (error) {
        console.error('Error deleting landing page:', error);
      }
    }
  };

  const handleEdit = (page) => {
    setEditingPage(page);
    setCurrentPage(page);
    setShowForm(true);
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <p className="text-gray-600">
            Welcome! On this page you'll manage your landing pages for different campaigns and offers.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Landing Pages</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Landing Pages List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700">Your Landing Pages</h4>
                <button
                  onClick={() => {
                    setCurrentPage({
                      id: Date.now().toString(),
                      title: '',
                      subheadline: '',
                      goal: 'New Patient Offer',
                      bodyContent: '',
                      featuredImage: '',
                      includeTestimonials: false,
                      formSettings: {
                        includeName: true,
                        includeEmail: true,
                        includePhone: true,
                        ctaButtonText: 'Get Started',
                        confirmationType: 'message',
                        confirmationMessage: 'Thank you! We\'ll be in touch shortly.',
                        redirectUrl: ''
                      }
                    });
                    setShowForm(true);
                    setEditingPage(null);
                  }}
                  className="flex items-center px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Page
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {landingPages.map((page) => (
                  <div key={page.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">{page.title}</h5>
                        <p className="text-sm text-gray-500 mt-1">{page.goal}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(page)}
                          className="text-teal-500 hover:text-teal-600"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Landing Page Form */}
            {showForm && (
              <div className="mt-8 space-y-6">
                <h4 className="text-lg font-medium text-gray-900">
                  {editingPage ? 'Edit Landing Page' : 'Create New Landing Page'}
                </h4>

                {/* Page Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Landing Page Title
                    </label>
                  </div>
                  <input
                    type="text"
                    value={currentPage.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter your landing page title"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>

                {/* Subheadline */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Subheadline
                    </label>
                  </div>
                  <textarea
                    value={currentPage.subheadline}
                    onChange={(e) => handleInputChange('subheadline', e.target.value)}
                    placeholder="Enter your subheadline"
                    rows={3}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>

                {/* Page Goal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Page Goal
                    </label>
                  </div>
                  <select
                    value={currentPage.goal}
                    onChange={(e) => handleInputChange('goal', e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  >
                    <option value="New Patient Offer">New Patient Offer</option>
                    <option value="Event Registration">Event Registration</option>
                    <option value="Free Consultation">Free Consultation</option>
                    <option value="Condition-Specific">Condition-Specific</option>
                  </select>
                </div>

                {/* Body Content */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Body Content
                    </label>
                  </div>
                  <textarea
                    value={currentPage.bodyContent}
                    onChange={(e) => handleInputChange('bodyContent', e.target.value)}
                    placeholder="Enter your landing page content here..."
                    rows={6}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>

                {/* Featured Image Display */}
                {currentPage.featuredImage && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Featured Image
                      </label>
                    </div>
                    <div className="relative">
                      <img
                        src={currentPage.featuredImage}
                        alt="Featured"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Testimonial Section Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Include Testimonial Section
                    </label>
                  </div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentPage.includeTestimonials}
                      onChange={(e) => handleInputChange('includeTestimonials', e.target.checked)}
                      className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Show testimonials on this page</span>
                  </label>
                </div>

                {/* Form Builder Settings */}
                <div className="space-y-4">
                  <h5 className="text-sm font-medium text-gray-700">Form Settings</h5>
                  
                  {/* Form Fields */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={currentPage.formSettings.includeName}
                        onChange={(e) => handleFormSettingChange('includeName', e.target.checked)}
                        className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Include Name field</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={currentPage.formSettings.includeEmail}
                        onChange={(e) => handleFormSettingChange('includeEmail', e.target.checked)}
                        className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Include Email field</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={currentPage.formSettings.includePhone}
                        onChange={(e) => handleFormSettingChange('includePhone', e.target.checked)}
                        className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Include Phone field</span>
                    </label>
                  </div>

                  {/* CTA Button Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={currentPage.formSettings.ctaButtonText}
                      onChange={(e) => handleFormSettingChange('ctaButtonText', e.target.value)}
                      placeholder="Get Started"
                      className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                    />
                  </div>

                  {/* Confirmation Settings */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Confirmation Settings
                      </label>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={currentPage.formSettings.confirmationType === 'message'}
                            onChange={() => handleFormSettingChange('confirmationType', 'message')}
                            className="text-teal-500 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Show Message</span>
                        </label>
                        {currentPage.formSettings.confirmationType === 'message' && (
                          <textarea
                            value={currentPage.formSettings.confirmationMessage}
                            onChange={(e) => handleFormSettingChange('confirmationMessage', e.target.value)}
                            placeholder="Thank you! We'll be in touch shortly."
                            rows={3}
                            className="mt-2 w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                        )}
                      </div>
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={currentPage.formSettings.confirmationType === 'redirect'}
                            onChange={() => handleFormSettingChange('confirmationType', 'redirect')}
                            className="text-teal-500 focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">Redirect to URL</span>
                        </label>
                        {currentPage.formSettings.confirmationType === 'redirect' && (
                          <input
                            type="url"
                            value={currentPage.formSettings.redirectUrl}
                            onChange={(e) => handleFormSettingChange('redirectUrl', e.target.value)}
                            placeholder="https://example.com/thank-you"
                            className="mt-2 w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingPage(null);
                      setCurrentPage({
                        id: '',
                        title: '',
                        subheadline: '',
                        goal: 'New Patient Offer',
                        bodyContent: '',
                        featuredImage: '',
                        includeTestimonials: false,
                        formSettings: {
                          includeName: true,
                          includeEmail: true,
                          includePhone: true,
                          ctaButtonText: 'Get Started',
                          confirmationType: 'message',
                          confirmationMessage: 'Thank you! We\'ll be in touch shortly.',
                          redirectUrl: ''
                        }
                      });
                    }}
                    className="px-6 py-2 text-black hover:text-gray-900 bg-transparent border border-transparent hover:border-teal-500 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
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
    </div>
  );
};

export default LandingPages; 