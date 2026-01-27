/**
 * Utility functions for file handling
 */

/**
 * Convert a File object to base64 string
 * @param file - File object to convert
 * @returns Promise<string> - Base64 encoded string (without data: prefix)
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:*/*;base64, prefix to get pure base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Convert a File object to base64 string with data URI prefix
 * @param file - File object to convert
 * @returns Promise<string> - Base64 encoded string with data:image/...;base64, prefix
 */
export const fileToBase64WithPrefix = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Validate file size
 * @param file - File object to validate
 * @param maxSizeInMB - Maximum file size in megabytes
 * @returns boolean - True if file size is valid
 */
export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

/**
 * Validate file extension
 * @param file - File object to validate
 * @param allowedExtensions - Array of allowed extensions (e.g., ['.pfx', '.p12'])
 * @returns boolean - True if file extension is valid
 */
export const validateFileExtension = (file: File, allowedExtensions: string[]): boolean => {
  const fileName = file.name.toLowerCase();
  return allowedExtensions.some(ext => fileName.endsWith(ext.toLowerCase()));
};

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns string - Formatted file size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
