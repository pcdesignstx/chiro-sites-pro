import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db, storage } from '../../firebase';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, listAll, getMetadata, deleteObject } from 'firebase/storage';
import { 
  Cog6ToothIcon, 
  ArrowDownTrayIcon, 
  CloudIcon, 
  BellIcon, 
  PaintBrushIcon, 
  CommandLineIcon 
} from '@heroicons/react/24/outline';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [settings, setSettings] = useState({
    account: {
      email: '',
      newPassword: '',
      confirmPassword: '',
      currentPassword: '',
    },
    export: {
      includeImages: true,
      exportFormat: 'zip',
      compressionLevel: 'medium',
    },
    storage: {
      usageLimit: '5GB',
      currentUsage: '0GB',
      autoCleanup: true,
      cleanupThreshold: '80',
    },
    notifications: {
      emailNotifications: true,
      notificationEmail: '',
      exportNotifications: true,
      errorNotifications: true,
    },
    branding: {
      primaryColor: '#10B981',
      accentColor: '#3B82F6',
      darkMode: false,
    },
    developer: {
      debugMode: false,
      verboseLogging: false,
      testMode: false,
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [storageUsage, setStorageUsage] = useState({
    total: 0,
    used: 0,
    percentage: 0
  });

  useEffect(() => {
    loadSettings();
    calculateStorageUsage();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setError('No user logged in');
        return;
      }

      // Set current email
      setSettings(prev => ({
        ...prev,
        account: {
          ...prev.account,
          email: user.email || ''
        }
      }));

      // Try to load from Firestore first
      const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'adminSettings'));
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSettings(prevSettings => ({
          ...prevSettings,
          account: {
            ...prevSettings.account,
            email: user.email || '',
            newPassword: '',
            confirmPassword: '',
            currentPassword: '',
          },
          export: {
            ...prevSettings.export,
            ...(data.export || {})
          },
          storage: {
            ...prevSettings.storage,
            ...(data.storage || {})
          },
          notifications: {
            ...prevSettings.notifications,
            ...(data.notifications || {})
          },
          branding: {
            ...prevSettings.branding,
            ...(data.branding || {})
          },
          developer: {
            ...prevSettings.developer,
            ...(data.developer || {})
          }
        }));
      } else {
        // If no Firestore settings, try localStorage
        const localSettings = localStorage.getItem('adminSettings');
        if (localSettings) {
          const data = JSON.parse(localSettings);
          setSettings(prevSettings => ({
            ...prevSettings,
            account: {
              ...prevSettings.account,
              email: user.email || '',
              newPassword: '',
              confirmPassword: '',
              currentPassword: '',
            },
            export: {
              ...prevSettings.export,
              ...(data.export || {})
            },
            storage: {
              ...prevSettings.storage,
              ...(data.storage || {})
            },
            notifications: {
              ...prevSettings.notifications,
              ...(data.notifications || {})
            },
            branding: {
              ...prevSettings.branding,
              ...(data.branding || {})
            },
            developer: {
              ...prevSettings.developer,
              ...(data.developer || {})
            }
          }));
        }
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      // Save to Firestore
      await setDoc(doc(db, 'users', user.uid, 'settings', 'adminSettings'), settings);
      
      // Also save to localStorage as backup
      localStorage.setItem('adminSettings', JSON.stringify(settings));

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateAccountSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      // Handle email update
      if (settings.account.email !== user.email) {
        await updateEmail(user, settings.account.email);
      }

      // Handle password update
      if (settings.account.newPassword) {
        if (settings.account.newPassword !== settings.account.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        // Re-authenticate user before password change
        if (!settings.account.currentPassword) {
          throw new Error('Current password is required to update password');
        }

        const credential = EmailAuthProvider.credential(
          user.email,
          settings.account.currentPassword
        );

        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, settings.account.newPassword);

        // Clear password fields after successful update
        setSettings(prev => ({
          ...prev,
          account: {
            ...prev.account,
            newPassword: '',
            confirmPassword: '',
            currentPassword: ''
          }
        }));
      }

      setSuccess('Account settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating account:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateFolderSize = async (folderRef) => {
    let size = 0;
    const result = await listAll(folderRef);

    // Calculate size of files in current folder
    for (const item of result.items) {
      try {
        const metadata = await getMetadata(item);
        if (metadata) {
          // Add file size
          if (metadata.size) {
            size += parseFloat(metadata.size);
          }
          // Add estimated metadata size (average 1KB per file for metadata)
          size += 1024;
          console.log('File:', item.fullPath);
          console.log('  Content size:', metadata.size, 'bytes');
          console.log('  With metadata:', metadata.size + 1024, 'bytes');
        }
      } catch (err) {
        console.error('Error getting metadata for:', item.fullPath, err);
      }
    }

    // Recursively calculate size of subfolders
    for (const prefix of result.prefixes) {
      try {
        console.log('Processing folder:', prefix.fullPath);
        const subFolderSize = await calculateFolderSize(prefix);
        size += parseFloat(subFolderSize);
        // Add estimated folder metadata size (500 bytes per folder)
        size += 500;
      } catch (err) {
        console.error('Error processing subfolder:', prefix.fullPath, err);
      }
    }

    return size;
  };

  const calculateStorageUsage = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user found');
        return;
      }

      // Use the root storage reference
      const storageRef = ref(storage);
      console.log('Starting storage calculation from root');

      // Calculate total size recursively
      const totalSize = await calculateFolderSize(storageRef);
      console.log('Total size in bytes:', totalSize);

      // Convert to MB with more precision (including metadata overhead)
      const usedMB = (totalSize / (1024 * 1024)).toFixed(2);
      const totalMB = 5120; // 5GB = 5120MB
      const percentage = (totalSize / (5 * 1024 * 1024 * 1024)) * 100;

      console.log('Raw bytes (with metadata):', totalSize);
      console.log('Calculated MB:', usedMB);
      console.log('Percentage:', percentage);

      setStorageUsage({
        total: totalMB,
        used: parseFloat(usedMB).toFixed(2),
        percentage: Math.min(percentage, 100)
      });
    } catch (err) {
      console.error('Error calculating storage usage:', err);
      setError('Failed to calculate storage usage');
    }
  };

  const deleteOrphanedImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');

      // Get all images in storage
      const userStorageRef = ref(storage, `users/${user.uid}`);
      const result = await listAll(userStorageRef);
      
      // Get all image references from Firestore
      const imagesCollection = collection(db, 'users', user.uid, 'images');
      const imagesSnapshot = await getDocs(imagesCollection);
      const validImagePaths = new Set(imagesSnapshot.docs.map(doc => doc.data().path));

      // Delete orphaned images
      let deletedCount = 0;
      for (const item of result.items) {
        if (!validImagePaths.has(item.fullPath)) {
          await deleteObject(item);
          deletedCount++;
        }
      }

      // Recalculate storage usage
      await calculateStorageUsage();

      setSuccess(`Deleted ${deletedCount} orphaned images`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting orphaned images:', err);
      setError('Failed to delete orphaned images');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'account', name: 'Account', icon: Cog6ToothIcon },
    { id: 'export', name: 'Export', icon: ArrowDownTrayIcon },
    { id: 'storage', name: 'Storage', icon: CloudIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'branding', name: 'Branding', icon: PaintBrushIcon },
    { id: 'developer', name: 'Developer', icon: CommandLineIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Settings</h1>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="bg-teal-600">
            <nav className="flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex-1 px-4 py-4 text-center font-medium text-sm bg-teal-600
                    ${activeTab === tab.id
                      ? 'text-white border-b-2 border-white'
                      : 'text-white/80 hover:text-white border-b-2 border-transparent hover:border-black'
                    }
                  `}
                >
                  <tab.icon 
                    className={`w-5 h-5 mx-auto mb-1 ${
                      activeTab === tab.id ? 'text-white' : 'text-white/80'
                    }`}
                  />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Account Settings */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Account Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      type="email"
                      value={settings.account.email}
                      onChange={(e) => handleInputChange('account', 'email', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      value={settings.account.currentPassword}
                      onChange={(e) => handleInputChange('account', 'currentPassword', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                      placeholder="Required for password change"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <input
                      type="password"
                      value={settings.account.newPassword}
                      onChange={(e) => handleInputChange('account', 'newPassword', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                      type="password"
                      value={settings.account.confirmPassword}
                      onChange={(e) => handleInputChange('account', 'confirmPassword', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                    />
                  </div>
                  <button
                    onClick={updateAccountSettings}
                    disabled={loading}
                    className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                  >
                    Update Account
                  </button>
                </div>
              </div>
            )}

            {/* Export Settings */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Export Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Include Images</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.export.includeImages}
                        onChange={(e) => handleInputChange('export', 'includeImages', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Export Format</label>
                    <select
                      value={settings.export.exportFormat}
                      onChange={(e) => handleInputChange('export', 'exportFormat', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                    >
                      <option value="zip">ZIP Archive</option>
                      <option value="json">JSON</option>
                      <option value="txt">Text Files</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Compression Level</label>
                    <select
                      value={settings.export.compressionLevel}
                      onChange={(e) => handleInputChange('export', 'compressionLevel', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                    >
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Storage Management */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Storage Management</h2>
                <div className="space-y-4">
                  <div className="mt-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Storage Usage</span>
                      <span className="text-sm font-medium text-gray-700">
                        {storageUsage.used}MB / {storageUsage.total}MB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          storageUsage.percentage > 80 ? 'bg-red-500' : 'bg-teal-500'
                        }`}
                        style={{ width: `${storageUsage.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Auto Cleanup</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.storage.autoCleanup}
                        onChange={(e) => handleInputChange('storage', 'autoCleanup', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                  <button
                    onClick={deleteOrphanedImages}
                    disabled={loading}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Cleaning up...' : 'Delete Orphaned Images'}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notification Email</label>
                    <input
                      type="email"
                      value={settings.notifications.notificationEmail}
                      onChange={(e) => handleInputChange('notifications', 'notificationEmail', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailNotifications}
                        onChange={(e) => handleInputChange('notifications', 'emailNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Export Notifications</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications.exportNotifications}
                        onChange={(e) => handleInputChange('notifications', 'exportNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Branding */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Branding</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                    <input
                      type="color"
                      value={settings.branding.primaryColor}
                      onChange={(e) => handleInputChange('branding', 'primaryColor', e.target.value)}
                      className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm p-1 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Accent Color</label>
                    <input
                      type="color"
                      value={settings.branding.accentColor}
                      onChange={(e) => handleInputChange('branding', 'accentColor', e.target.value)}
                      className="mt-1 block w-full h-10 border border-gray-300 rounded-md shadow-sm p-1 bg-white text-gray-900"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Dark Mode</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.branding.darkMode}
                        onChange={(e) => handleInputChange('branding', 'darkMode', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Developer Tools */}
            {activeTab === 'developer' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Developer Tools</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Debug Mode</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.developer.debugMode}
                        onChange={(e) => handleInputChange('developer', 'debugMode', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Verbose Logging</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.developer.verboseLogging}
                        onChange={(e) => handleInputChange('developer', 'verboseLogging', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Test Mode</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.developer.testMode}
                        onChange={(e) => handleInputChange('developer', 'testMode', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={saveSettings}
              disabled={loading}
              className="w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings; 