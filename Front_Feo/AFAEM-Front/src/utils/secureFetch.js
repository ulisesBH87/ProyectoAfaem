import { API_BASE } from '../config/config';

/**
 * Fetch a secure resource and return a local Blob URL.
 * The caller is responsible for revoking the URL or scheduling its cleanup.
 */
export const fetchSecureBlobUrl = async (path) => {
  if (!path) return '#';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  
  const cleanPath = path.replace(/\\/g, '/');
  const pathWithSlash = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const fullUrl = `${API_BASE}${pathWithSlash}`;
  
  const token = (typeof window !== 'undefined' && /^\/i\//.test(window.location.pathname))
    ? sessionStorage.getItem('temp_token')
    : (localStorage.getItem('token') || sessionStorage.getItem('temp_token'));
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(fullUrl, { headers });
  if (!response.ok) {
    throw new Error(`Error loading secure file: ${response.status}`);
  }
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

/**
 * Fetch a secure resource and open it in a new window/tab as a local Blob URL,
 * scheduling its revocation after 15 seconds to prevent leaks.
 */
export const openSecurePath = async (path, target = '_blank') => {
  try {
    const blobUrl = await fetchSecureBlobUrl(path);
    const newWindow = window.open(blobUrl, target);
    
    // Revoke the blob URL after 15 seconds to free browser memory
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 15000);
    
    return newWindow;
  } catch (error) {
    console.error('Error opening secure file:', error);
    throw error;
  }
};
