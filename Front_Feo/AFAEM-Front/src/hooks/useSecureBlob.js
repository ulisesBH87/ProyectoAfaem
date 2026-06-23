import { useEffect, useState } from 'react';
import { API_BASE } from '../config/config';

export function useSecureBlob(src) {
  const [blobUrl, setBlobUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setBlobUrl('');
      return;
    }
    if (src.startsWith('http') || src.startsWith('data:')) {
      setBlobUrl(src);
      return;
    }

    let isMounted = true;
    let currentBlobUrl = '';

    const fetchBlob = async () => {
      setLoading(true);
      setError(false);
      try {
        const cleanPath = src.replace(/\\/g, '/');
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
          throw new Error(`Failed to fetch secure blob: ${response.status}`);
        }

        const blob = await response.blob();
        if (isMounted) {
          currentBlobUrl = URL.createObjectURL(blob);
          setBlobUrl(currentBlobUrl);
        }
      } catch (err) {
        console.error('Error fetching secure blob:', err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBlob();

    return () => {
      isMounted = false;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [src]);

  return { blobUrl, loading, error };
}

export default useSecureBlob;
