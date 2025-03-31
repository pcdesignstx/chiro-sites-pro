import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Validates a download URL by attempting to fetch it
 * @param {string} url - The URL to validate
 * @returns {Promise<boolean>} Whether the URL is valid and accessible
 */
const validateDownloadURL = async (url) => {
  try {
    const response = await fetch(url);
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch (error) {
    console.warn('URL validation failed:', error);
    return false;
  }
};

/**
 * Validates an image file by attempting to load it
 * @param {File} file - The file to validate
 * @returns {Promise<string|null>} Error message if invalid, null if valid
 */
const validateImageFile = (file) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve('File is not an image');
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('Invalid or corrupted image file');
    };

    img.src = objectUrl;
  });
};

/**
 * Validates a file before upload
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @param {number} options.maxSize - Maximum file size in bytes
 * @param {string[]} options.allowedTypes - Allowed MIME types
 * @returns {Promise<string|null>} Error message if validation fails, null if valid
 */
export const validateFile = async (file, options = {}) => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/*'] } = options;

  if (!file) {
    return 'No file selected';
  }

  if (file.size > maxSize) {
    return `File size should be less than ${maxSize / (1024 * 1024)}MB`;
  }

  if (!allowedTypes.some(type => {
    if (type === 'image/*') return file.type.startsWith('image/');
    return file.type === type;
  })) {
    return 'Invalid file type';
  }

  // Additional image validation if it's an image file
  if (file.type.startsWith('image/')) {
    const imageError = await validateImageFile(file);
    if (imageError) return imageError;
  }

  return null;
};

/**
 * Uploads a file to Firebase Storage with enhanced validation and error handling
 * @param {File} file - The file to upload
 * @param {string} path - The path in storage (e.g., 'logos', 'team-photos', etc.)
 * @param {string} userId - The ID of the user uploading the file
 * @returns {Promise<{url: string, filename: string}>} The download URL and filename
 */
export const uploadFile = async (file, path, userId) => {
  if (!userId) {
    throw new Error('User ID is required for file upload');
  }

  // Validate file before upload
  const validationError = await validateFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const storage = getStorage();
  const timestamp = Date.now();
  const filename = `${timestamp}-${file.name}`;
  const storageRef = ref(storage, `users/${userId}/${path}/${filename}`);

  try {
    // Upload the file
    const uploadResult = await uploadBytes(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000' // Cache for 1 year
    });

    // Get the download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Validate the URL is accessible
    const isValid = await validateDownloadURL(downloadURL);
    if (!isValid) {
      // If URL is not valid, clean up and throw error
      await deleteObject(storageRef);
      throw new Error('Generated URL is not accessible');
    }

    return {
      url: downloadURL,
      filename: filename,
      path: `users/${userId}/${path}/${filename}`,
      contentType: file.type,
      size: file.size
    };
  } catch (error) {
    // If there's an error, try to clean up
    try {
      await deleteObject(storageRef);
    } catch (deleteError) {
      console.warn('Failed to clean up after upload error:', deleteError);
    }
    throw new Error(`Upload failed: ${error.message}`);
  }
};

/**
 * Refreshes a Firebase Storage download URL
 * @param {string} path - The full storage path
 * @returns {Promise<string>} A fresh download URL
 */
export const refreshDownloadURL = async (path) => {
  const storage = getStorage();
  const fileRef = ref(storage, path);
  try {
    return await getDownloadURL(fileRef);
  } catch (error) {
    throw new Error(`Failed to refresh download URL: ${error.message}`);
  }
};

/**
 * Deletes a file from Firebase Storage with enhanced error handling
 * @param {string} filename - The filename to delete
 * @param {string} path - The path in storage
 * @param {string} userId - The ID of the user deleting the file
 */
export const deleteFile = async (filename, path, userId) => {
  if (!userId) {
    throw new Error('User ID is required for file deletion');
  }

  const storage = getStorage();
  const storageRef = ref(storage, `users/${userId}/${path}/${filename}`);

  try {
    await deleteObject(storageRef);
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      console.warn('File already deleted or does not exist');
      return;
    }
    throw new Error(`Deletion failed: ${error.message}`);
  }
}; 