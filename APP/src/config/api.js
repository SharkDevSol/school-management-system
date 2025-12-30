// Centralized API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://school-management-system-daul.onrender.com/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://school-management-system-daul.onrender.com';
export const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'https://school-management-system-daul.onrender.com';

// Helper function to get full URL for uploaded files
export const getUploadUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `${UPLOADS_URL}${path}`;
  return `${UPLOADS_URL}/Uploads/${path}`;
};

export default {
  API_BASE_URL,
  SOCKET_URL,
  UPLOADS_URL,
  getUploadUrl
};
