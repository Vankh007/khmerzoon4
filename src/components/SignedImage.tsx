import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SignedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  bucket?: string;
  storage?: 'storage1' | 'storage2';
}

/**
 * Image component that automatically handles signed URLs for private iDrive E2 buckets.
 */
export const SignedImage = ({ 
  src, 
  alt, 
  className, 
  fallback,
  bucket = 'user-profiles',
  storage = 'storage1'
}: SignedImageProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!src) {
        setImageUrl(null);
        setLoading(false);
        return;
      }

      // Check if this is an iDrive E2 URL that needs signing
      const isIdriveUrl = src.includes('.e2-') || src.includes('idrive');
      
      if (!isIdriveUrl) {
        // Not an iDrive URL, use as-is
        setImageUrl(src);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        // Extract the file key from the URL
        const urlParts = new URL(src);
        const pathParts = urlParts.pathname.split('/').filter(Boolean);
        
        // Remove bucket name from path to get file key
        if (pathParts.length >= 2) {
          pathParts.shift();
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
            expiresIn: 3600,
          },
        });

        if (fnError) throw fnError;
        if (!data?.success) throw new Error(data?.error || 'Failed to get signed URL');

        setImageUrl(data.signedUrl);
      } catch (err) {
        console.error('Error getting signed URL:', err);
        setError(true);
        // Fallback to original URL
        setImageUrl(src);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [src, bucket, storage]);

  if (loading) {
    return <div className={`${className} bg-muted animate-pulse`} />;
  }

  if (error || !imageUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img 
      src={imageUrl} 
      alt={alt} 
      className={className}
      onError={() => setError(true)}
    />
  );
};
