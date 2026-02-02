import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseSignedImageUrlOptions {
  imageUrl?: string | null;
  bucket?: string;
  storage?: 'storage1' | 'storage2';
  expiresIn?: number;
}

/**
 * Hook to get a signed URL for private iDrive E2 bucket images.
 * Automatically detects if URL is from iDrive E2 and fetches signed URL.
 */
export const useSignedImageUrl = ({ 
  imageUrl, 
  bucket = 'user-profiles',
  storage = 'storage1',
  expiresIn = 3600 
}: UseSignedImageUrlOptions) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!imageUrl) {
        setSignedUrl(null);
        return;
      }

      // Check if this is an iDrive E2 URL that needs signing
      const isIdriveUrl = imageUrl.includes('.e2-') || imageUrl.includes('idrive');
      
      if (!isIdriveUrl) {
        // Not an iDrive URL, use as-is
        setSignedUrl(imageUrl);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Extract the file key from the URL
        // URL format: https://endpoint/bucket/fileKey
        const urlParts = new URL(imageUrl);
        const pathParts = urlParts.pathname.split('/').filter(Boolean);
        
        // Remove bucket name from path to get file key
        if (pathParts.length >= 2) {
          pathParts.shift(); // Remove bucket name
        }
        const fileKey = pathParts.join('/');

        if (!fileKey) {
          throw new Error('Could not extract file key from URL');
        }

        const { data, error: fnError } = await supabase.functions.invoke('get-signed-url', {
          body: {
            fileKey,
            bucket,
            storage,
            expiresIn,
          },
        });

        if (fnError) throw fnError;
        if (!data?.success) throw new Error(data?.error || 'Failed to get signed URL');

        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fallback to original URL
        setSignedUrl(imageUrl);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [imageUrl, bucket, storage, expiresIn]);

  return { signedUrl, loading, error };
};
