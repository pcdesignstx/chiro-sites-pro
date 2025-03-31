import { ref, getDownloadURL } from 'firebase/storage';

import { storage } from '../firebase';

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

export const downloadAsJSON = (data, filename) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyAllComponents = async (components) => {
  const allData = JSON.stringify(components, null, 2);
  return await copyToClipboard(allData);
};

export const downloadAllComponents = (components) => {
  downloadAsJSON(components, 'website-components.json');
};

/**
 * Extracts image URLs from an object or array recursively
 * @param {Object|Array} data - The data to extract URLs from
 * @returns {string[]} Array of image URLs
 */
export const extractImageUrls = (data) => {
  const urls = new Set();

  const extract = (item) => {
    if (!item) return;

    if (typeof item === 'string') {
      // Check if string is a URL and points to an image
      if (item.match(/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i) ||
          item.match(/^data:image\//i) ||
          item.includes('firebasestorage.googleapis.com')) {
        urls.add(item);
      }
      return;
    }

    if (Array.isArray(item)) {
      item.forEach(extract);
      return;
    }

    if (typeof item === 'object') {
      Object.values(item).forEach(extract);
    }
  };

  extract(data);
  return Array.from(urls);
};

/**
 * Downloads images and adds them to a ZIP archive
 * @param {JSZip} zip - JSZip instance
 * @param {string[]} imageUrls - Array of image URLs to download
 * @param {string} folderName - Name of the folder in the ZIP to store images
 * @returns {Promise<void>}
 */
export const downloadImagesToZip = async (zip, imageUrls, folderName = 'images') => {
  const imageFolder = zip.folder(folderName);
  let count = 1;
  const errors = [];

  for (const url of imageUrls) {
    if (!url || typeof url !== 'string') continue;

    try {
      // Handle base64 encoded images
      if (url.startsWith('data:image/')) {
        const result = await processBase64Image(url, count);
        if (result.success) {
          imageFolder.file(result.filename, result.blob);
          count++;
        } else {
          errors.push(`Failed to process base64 image: ${result.error}`);
        }
        continue;
      }

      // Handle Firebase Storage URLs
      if (url.includes('firebasestorage.googleapis.com')) {
        const result = await processFirebaseImage(url, count);
        if (result.success) {
          imageFolder.file(result.filename, result.blob);
          count++;
        } else {
          errors.push(`Failed to process Firebase image: ${result.error}`);
        }
        continue;
      }

      // Handle regular URLs
      const result = await processRegularImage(url, count);
      if (result.success) {
        imageFolder.file(result.filename, result.blob);
        count++;
      } else {
        errors.push(`Failed to process image URL: ${result.error}`);
      }
    } catch (err) {
      errors.push(`Unexpected error processing ${url}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Image processing errors:', errors);
  }
};

/**
 * Processes a base64 encoded image
 * @param {string} base64Url - Base64 encoded image URL
 * @param {number} count - Current image counter
 * @returns {Promise<{success: boolean, filename?: string, blob?: Blob, error?: string}>}
 */
const processBase64Image = async (base64Url, count) => {
  try {
    const base64Data = base64Url.split(',')[1];
    const mimeType = base64Url.split(',')[0].split(':')[1].split(';')[0];
    const extension = mimeType.split('/')[1];
    
    // Validate mime type
    if (!mimeType.startsWith('image/')) {
      return { success: false, error: 'Invalid mime type' };
    }

    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: mimeType });
    
    // Validate blob size
    if (blob.size === 0) {
      return { success: false, error: 'Empty blob' };
    }

    return {
      success: true,
      filename: `image-${count}.${extension}`,
      blob
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Processes a Firebase Storage image URL
 * @param {string} url - Firebase Storage URL
 * @param {number} count - Current image counter
 * @returns {Promise<{success: boolean, filename?: string, blob?: Blob, error?: string}>}
 */
const processFirebaseImage = async (url, count) => {
  try {
    const pathMatch = url.match(/\/o\/([^?]+)/);
    if (!pathMatch) {
      return { success: false, error: 'Invalid Firebase Storage URL' };
    }

    const storagePath = decodeURIComponent(pathMatch[1]);
    const fileRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(fileRef);
    
    const response = await fetch(downloadURL);
    if (!response.ok) {
      return { success: false, error: `HTTP error! status: ${response.status}` };
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      return { success: false, error: 'Empty blob' };
    }

    const originalFilename = storagePath.split('/').pop();
    const extension = originalFilename.split('.').pop().toLowerCase() || 'jpg';

    return {
      success: true,
      filename: `image-${count}.${extension}`,
      blob
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Processes a regular image URL
 * @param {string} url - Image URL
 * @param {number} count - Current image counter
 * @returns {Promise<{success: boolean, filename?: string, blob?: Blob, error?: string}>}
 */
const processRegularImage = async (url, count) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, error: `HTTP error! status: ${response.status}` };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return { success: false, error: 'Not an image' };
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      return { success: false, error: 'Empty blob' };
    }

    const extension = url.split('.').pop().split('?')[0].toLowerCase() || 'jpg';

    return {
      success: true,
      filename: `image-${count}.${extension}`,
      blob
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Refreshes a Firebase Storage download URL
 * @param {string} storagePath - The path in Firebase Storage
 * @returns {Promise<string>} A fresh download URL
 */
export const refreshDownloadURL = async (storagePath) => {
  try {
    const storageRef = ref(storage, storagePath);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error refreshing download URL:', error);
    throw error;
  }
};

/**
 * Validates if a URL is accessible and returns an image
 * @param {string} url - The URL to validate
 * @returns {Promise<boolean>} Whether the URL is valid
 */
export const validateImageUrl = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    
    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') || false;
  } catch {
    return false;
  }
};

/**
 * Formats content for export, ensuring image URLs are preserved and clickable
 * @param {Object} data - The content data to format
 * @param {string} sectionName - Name of the section being formatted
 * @returns {string} Formatted content with image URLs
 */
export const formatContentWithImages = (data, sectionName) => {
  const lines = [];
  const imageUrls = new Set();

  // Helper to format a value, extracting image URLs if present
  const formatValue = (key, value, indent = '') => {
    if (!value) return null;

    // Handle arrays
    if (Array.isArray(value)) {
      const arrayLines = value.map(item => {
        if (typeof item === 'object') {
          return formatObject(item, indent + '  ');
        }
        return `${indent}- ${item}`;
      });
      return arrayLines.join('\n');
    }

    // Handle objects
    if (typeof value === 'object') {
      return formatObject(value, indent + '  ');
    }

    // Handle strings that might be image URLs
    if (typeof value === 'string') {
      if (value.match(/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i) ||
          value.match(/^data:image\//i) ||
          value.includes('firebasestorage.googleapis.com')) {
        imageUrls.add(value);
        return `${indent}${key}: ${value}`;
      }
      return `${indent}${key}: ${value}`;
    }

    return `${indent}${key}: ${value}`;
  };

  // Helper to format an object
  const formatObject = (obj, indent = '') => {
    const objLines = [];
    for (const [key, value] of Object.entries(obj)) {
      const formatted = formatValue(key, value, indent);
      if (formatted) {
        objLines.push(formatted);
      }
    }
    return objLines.join('\n');
  };

  // Add section header
  lines.push(`${sectionName.toUpperCase()}`);
  lines.push('='.repeat(sectionName.length));
  lines.push('');

  // Add note about image URLs if any are found
  if (imageUrls.size > 0) {
    lines.push('Note: If images are missing from the ZIP folder, use the clickable links below to manually download them.');
    lines.push('');
  }

  // Format the main content
  if (typeof data === 'object') {
    lines.push(formatObject(data));
  } else {
    lines.push(String(data));
  }

  // Add image URLs section if any were found
  if (imageUrls.size > 0) {
    lines.push('');
    lines.push('IMAGE URLS');
    lines.push('==========');
    lines.push('');
    Array.from(imageUrls).forEach(url => {
      lines.push(`Image: ${url}`);
    });
  }

  return lines.join('\n');
};

/**
 * Creates a README file content for the export
 * @param {string[]} imageUrls - Array of image URLs
 * @param {Array} failedImages - Array of failed image downloads
 * @returns {string} README content
 */
export const createReadmeContent = (imageUrls, failedImages = []) => {
  const lines = [
    'CONTENT EXPORT README',
    '===================',
    '',
    'This export contains content and images from your website submission.',
    '',
    'If any images are missing from the ZIP folders, you can use the URLs below to download them manually:',
    '',
    'Original Image URLs:',
    ...imageUrls.map(url => `Image: ${url}`),
    ''
  ];

  if (failedImages.length > 0) {
    lines.push(
      'Failed Image Downloads:',
      '=====================',
      '',
      ...failedImages.map(({ url, error, message }) => 
        `Image: ${url}\nError: ${error}${message ? `\nNote: ${message}` : ''}\n`
      ),
      ''
    );
  }

  if (failedImages.some(f => f.error === 'CORS_ERROR')) {
    lines.push(
      'CORS Configuration Instructions:',
      '============================',
      '',
      '1. Install Firebase CLI if not already installed: npm install -g firebase-tools',
      '2. Create a cors.json file with the following content:',
      '[',
      '  {',
      '    "origin": ["*"],',
      '    "method": ["GET"],',
      '    "maxAgeSeconds": 3600',
      '  }',
      ']',
      '3. Run the following commands:',
      '   firebase login',
      '   firebase init storage',
      '   firebase storage:cors set cors.json',
      ''
    );
  }

  return lines.join('\n');
}; 