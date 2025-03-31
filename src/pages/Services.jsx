import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { ChevronUpIcon, QuestionMarkCircleIcon, PlusIcon, TrashIcon, PencilIcon, ArrowUpIcon, ArrowDownIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile, validateFile, deleteFile } from '../utils/uploadUtils';
import { showNotification } from '../utils/notification';

// Add icon options
const iconOptions = [
  '👨‍⚕️', '👩‍⚕️', '👶', '👴', '👵', '👨‍🦽', '👩‍🦽', '🧘', '🏃', '🏋️',
  '💪', '🦴', '🦷', '🧠', '❤️', '🩺', '💊', '🏥', '⚕️', '🔬',
  '📋', '📊', '🎯', '🎨', '🌟', '💫', '✨', '💡', '🎉', '🎊'
];

const Services = ({ readOnly, initialData }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [services, setServices] = useState(initialData?.services || []);
  const [editingService, setEditingService] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [currentService, setCurrentService] = useState({
    id: '',
    name: '',
    description: '',
    imageUrl: '',
    icon: '',
    customIcon: null,
    ctaText: '',
    isFeatured: false,
    order: 0
  });

  // Add new state for icon picker
  const [showIconPicker, setShowIconPicker] = useState(false);

  const { currentUser } = useAuth();

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const docRef = doc(db, 'pages', 'services');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setServices(docSnap.data().services || []);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setCurrentService(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleServiceImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate the file
    const error = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/png', 'image/jpeg', 'image/gif']
    });

    if (error) {
      showNotification(error, 'error');
      return;
    }

    try {
      // Upload to Firebase Storage
      const { url, filename } = await uploadFile(file, 'service-images', currentUser.uid);
      
      setServices(prev => prev.map(service => 
        service.id === currentService.id 
          ? { ...service, imageUrl: url, imageFilename: filename }
          : service
      ));
    } catch (error) {
      console.error('Error uploading service image:', error);
      showNotification('Error uploading service image. Please try again.', 'error');
    }
  };

  const handleDeleteServiceImage = async (filename) => {
    try {
      // Delete from Firebase Storage
      await deleteFile(filename, 'service-images', currentUser.uid);
      
      setServices(prev => prev.map(service => 
        service.id === currentService.id 
          ? { ...service, imageUrl: '', imageFilename: '' }
          : service
      ));
    } catch (error) {
      console.error('Error deleting service image:', error);
      showNotification('Error deleting service image. Please try again.', 'error');
    }
  };

  const handleCustomIconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate the file
    const error = validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/png', 'image/svg+xml']
    });

    if (error) {
      showNotification(error, 'error');
      return;
    }

    try {
      // Upload to Firebase Storage
      const { url, filename } = await uploadFile(file, 'service-icons', currentUser.uid);
      
      setServices(prev => prev.map(service => 
        service.id === currentService.id 
          ? { ...service, customIcon: url, customIconFilename: filename }
          : service
      ));
    } catch (error) {
      console.error('Error uploading custom icon:', error);
      showNotification('Error uploading custom icon. Please try again.', 'error');
    }
  };

  const handleDeleteCustomIcon = async (filename) => {
    try {
      // Delete from Firebase Storage
      await deleteFile(filename, 'service-icons', currentUser.uid);
      
      setServices(prev => prev.map(service => 
        service.id === currentService.id 
          ? { ...service, customIcon: null, customIconFilename: '' }
          : service
      ));
    } catch (error) {
      console.error('Error deleting custom icon:', error);
      showNotification('Error deleting custom icon. Please try again.', 'error');
    }
  };

  const handleSave = async () => {
    if (!currentUser) {
      showNotification('You must be logged in to save changes', 'error');
      return;
    }

    if (!currentUser.uid) {
      showNotification('User ID not found. Please try logging in again.', 'error');
      return;
    }

    try {
      setIsSaving(true);

      // Debug logging
      console.log('Starting save process...');
      console.log('Current services state:', services);
      console.log('Current service being saved:', currentService);

      // Create the new or updated service
      let updatedServices;
      if (!currentService.id) {
        console.log('Adding new service...');
        const newService = {
          ...currentService,
          id: Date.now().toString(), // Generate a unique ID
          order: services.length // Add to the end of the list
        };
        
        // Create new array with the new service
        updatedServices = [...services, newService];
        console.log('New service created:', newService);
      } else {
        // If this is an existing service, update it in the array
        console.log('Updating existing service...');
        updatedServices = services.map(service => 
          service.id === currentService.id ? currentService : service
        );
      }

      // Debug logging
      console.log('Updated services array:', updatedServices);

      // Prepare the data for Firestore
      const servicesData = {
        services: updatedServices.map(service => ({
          id: service?.id || '',
          name: service?.name || '',
          description: service?.description || '',
          imageUrl: service?.imageUrl || '',
          imageFilename: service?.imageFilename || '',
          icon: service?.icon || '',
          customIcon: service?.customIcon || null,
          customIconFilename: service?.customIconFilename || '',
          ctaText: service?.ctaText || '',
          isFeatured: service?.isFeatured || false,
          order: service?.order || 0
        })),
        updatedAt: new Date().toISOString()
      };

      // Debug logging
      console.log('Final services data to save:', servicesData);

      // Save to Firestore using the correct path
      const docRef = doc(db, 'pages', 'services');
      await setDoc(docRef, servicesData);
      
      // Update local state after successful save
      setServices(updatedServices);
      
      console.log('Successfully saved to Firestore');
      showNotification('Changes saved successfully!', 'success');
      
      // Reset form and reload services
      setShowForm(false);
      setEditingService(null);
      setCurrentService({
        id: '',
        name: '',
        description: '',
        imageUrl: '',
        icon: '',
        customIcon: null,
        ctaText: '',
        isFeatured: false,
        order: 0
      });
    } catch (error) {
      console.error('Error saving services settings:', error);
      console.error('Error stack:', error.stack);
      showNotification('Failed to save changes. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        const updatedServices = services.filter(service => service.id !== serviceId);
        await setDoc(doc(db, 'pages', 'services'), {
          services: updatedServices,
          updatedAt: new Date().toISOString()
        });
        setServices(updatedServices);
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setCurrentService(service);
    setShowForm(true);
  };

  const handleReorder = async (serviceId, direction) => {
    const currentIndex = services.findIndex(service => service.id === serviceId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < services.length) {
      const updatedServices = [...services];
      const [movedService] = updatedServices.splice(currentIndex, 1);
      updatedServices.splice(newIndex, 0, movedService);

      // Update order numbers
      const reorderedServices = updatedServices.map((service, index) => ({
        ...service,
        order: index
      }));

      try {
        await setDoc(doc(db, 'pages', 'services'), {
          services: reorderedServices,
          updatedAt: new Date().toISOString()
        });
        setServices(reorderedServices);
      } catch (error) {
        console.error('Error reordering services:', error);
      }
    }
  };

  return (
    <div className="p-4 lg:p-8">
      <div className="max-w-[1000px] mx-auto">
        {/* Welcome Message and Audio - Only show if not readOnly */}
        {!readOnly && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <p className="text-gray-600 mb-4">
              Welcome! On this page you'll manage the services offered at your chiropractic practice. To get started, click the play button below.
            </p>
            <div>
              <audio controls className="w-full">
                <source src="/services-intro.mp3" type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Services</h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Services List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-700">Your Services</h4>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setEditingService(null);
                    setCurrentService({
                      id: '',
                      name: '',
                      description: '',
                      imageUrl: '',
                      icon: '',
                      customIcon: null,
                      ctaText: '',
                      isFeatured: false,
                      order: 0
                    });
                  }}
                  className="flex items-center px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add New Service
                </button>
              </div>

              <div className="space-y-4">
                {services.sort((a, b) => a.order - b.order).map((service) => (
                  <div key={service.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {/* Service Image/Icon */}
                        <div className="flex-shrink-0">
                          {service.imageUrl ? (
                            <div className="relative mb-4">
                              <img
                                src={service.imageUrl}
                                alt={service.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => handleDeleteServiceImage(service.imageFilename)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ) : service.customIcon ? (
                            <img 
                              src={service.customIcon} 
                              alt={service.name}
                              className="w-16 h-16 object-contain rounded-lg"
                            />
                          ) : service.icon ? (
                            <div className="w-16 h-16 flex items-center justify-center bg-teal-100 rounded-lg">
                              <span className="text-2xl">{service.icon}</span>
                            </div>
                          ) : (
                            <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-lg">
                              <span className="text-gray-400">No image</span>
                            </div>
                          )}
                        </div>

                        {/* Service Details */}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-gray-900">{service.name}</h5>
                            {service.isFeatured && (
                              <span className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          {service.ctaText && (
                            <button className="mt-2 text-sm text-teal-600 hover:text-teal-700">
                              {service.ctaText} →
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleReorder(service.id, 'up')}
                            disabled={service.order === 0}
                            className="p-1 text-gray-500 hover:text-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowUpIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReorder(service.id, 'down')}
                            disabled={service.order === services.length - 1}
                            className="p-1 text-gray-500 hover:text-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ArrowDownIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-1 text-gray-500 hover:text-teal-500"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="p-1 text-gray-500 hover:text-red-500"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service Form */}
            {showForm && (
              <div className="mt-8 space-y-6">
                <h4 className="text-lg font-medium text-gray-900">
                  {editingService ? 'Edit Service' : 'Create New Service'}
                </h4>

                {/* Service Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Service Name
                    </label>
                  </div>
                  <input
                    type="text"
                    value={currentService.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Prenatal Chiropractic"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                  </div>
                  <textarea
                    value={currentService.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="e.g., Safe and gentle chiropractic care for expectant mothers, helping to relieve pregnancy-related discomfort and promote optimal fetal positioning."
                    rows={3}
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Service Image
                    </label>
                  </div>
                  {currentService.imageUrl ? (
                    <div className="relative mb-4">
                      <img
                        src={currentService.imageUrl}
                        alt={currentService.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleDeleteServiceImage(currentService.imageFilename)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    onChange={handleServiceImageUpload}
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

                {/* Icon Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Icon (Optional)
                    </label>
                  </div>
                  
                  {/* Icon Type Selection */}
                  <div className="mb-4 space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="iconType"
                        value="emoji"
                        checked={currentService.customIcon === null}
                        onChange={() => {
                          handleInputChange('customIcon', null);
                          setShowIconPicker(true);
                        }}
                        className="text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Choose from emoji icons</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="iconType"
                        value="custom"
                        checked={currentService.customIcon !== null}
                        onChange={() => {
                          handleInputChange('customIcon', '');
                          setShowIconPicker(false);
                        }}
                        className="text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Upload custom icon</span>
                    </label>
                  </div>

                  {/* Emoji Picker */}
                  {currentService.customIcon === null && (
                    <div className="relative">
                      <div 
                        onClick={() => setShowIconPicker(!showIconPicker)}
                        className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black cursor-pointer flex items-center justify-between"
                      >
                        <span className="text-xl">{currentService.icon || 'Select an icon'}</span>
                        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${showIconPicker ? 'rotate-180' : ''}`} />
                      </div>
                      
                      {showIconPicker && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                          <div className="grid grid-cols-8 gap-1">
                            {iconOptions.map((icon) => (
                              <button
                                key={icon}
                                onClick={() => {
                                  handleInputChange('icon', icon);
                                  setShowIconPicker(false);
                                }}
                                className={`p-1.5 rounded-lg text-xl hover:bg-teal-50 hover:border-teal-500 border border-transparent transition-colors ${
                                  currentService.icon === icon ? 'bg-teal-50 border-2 border-teal-500' : 'bg-transparent'
                                }`}
                              >
                                {icon}
                              </button>
                            ))}
                          </div>
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={() => setShowIconPicker(false)}
                              className="px-4 py-2 text-sm bg-transparent text-black hover:bg-teal-500 hover:text-white rounded-lg transition-all"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Icon Upload */}
                  {currentService.customIcon !== null && (
                    <div className="space-y-2">
                      {currentService.customIcon ? (
                        <div className="relative mb-4">
                          <img
                            src={currentService.customIcon}
                            alt="Custom icon preview"
                            className="w-16 h-16 object-contain rounded-lg"
                          />
                          <button
                            onClick={() => handleDeleteCustomIcon(currentService.customIconFilename)}
                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null}
                      <input
                        type="file"
                        accept="image/png,image/svg+xml"
                        onChange={handleCustomIconUpload}
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
                  )}
                </div>

                {/* CTA Text */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      CTA Button Text (Optional)
                    </label>
                  </div>
                  <input
                    type="text"
                    value={currentService.ctaText}
                    onChange={(e) => handleInputChange('ctaText', e.target.value)}
                    placeholder="e.g., Learn More"
                    className="w-full p-2 border border-gray-200 rounded-lg outline-none focus:outline-none focus:ring-0 focus:border-2 focus:border-teal-500 bg-transparent text-black"
                  />
                </div>

                {/* Featured Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Featured Service
                    </label>
                  </div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={currentService.isFeatured}
                      onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                      className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Show this service on the homepage</span>
                  </label>
                </div>

                {/* Save Button */}
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingService(null);
                      setCurrentService({
                        id: '',
                        name: '',
                        description: '',
                        imageUrl: '',
                        icon: '',
                        customIcon: null,
                        ctaText: '',
                        isFeatured: false,
                        order: 0
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

export default Services; 