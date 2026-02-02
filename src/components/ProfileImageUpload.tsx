import { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ProfileImageUploadProps {
  type: 'profile' | 'cover';
  currentImage?: string;
  onUploadSuccess: (url: string) => void;
}

export const ProfileImageUpload = ({ type, currentImage, onUploadSuccess }: ProfileImageUploadProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    
    try {
      setUploading(true);

      // Convert file to base64 for iDrive E2 upload
      const arrayBuffer = await selectedFile.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Generate unique filename for iDrive E2 (relative to bucket, no bucket prefix)
      const fileExt = selectedFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${user.id}/${type}-${timestamp}.${fileExt}`;
      // Upload to iDrive E2 via edge function
      const { data, error } = await supabase.functions.invoke('upload-to-idrive', {
        body: {
          fileName,
          fileData: base64Data,
          bucket: 'user-profiles',
          contentType: selectedFile.type,
          storage: 'storage1'
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');

      const publicUrl = data.url;

      // Update profile in database
      const column = type === 'profile' ? 'profile_image' : 'cover_image';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [column]: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onUploadSuccess(publicUrl);
      setIsDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
      toast.success(`${type === 'profile' ? 'Profile' : 'Cover'} image updated successfully`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        className="p-2.5 rounded-full bg-background/95 backdrop-blur-sm hover:bg-background hover:scale-110 transition-all shadow-lg border border-border/50"
        onClick={() => setIsDialogOpen(true)}
        aria-label={`Edit ${type} image`}
      >
        <Camera className="h-5 w-5 text-foreground" />
      </button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {type === 'profile' ? 'Profile' : 'Cover'} Image
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className={type === 'cover' ? 'w-full aspect-video object-cover' : 'w-32 h-32 mx-auto rounded-full object-cover'}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  file:cursor-pointer cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">
                Maximum file size: 5MB. Supported formats: JPG, PNG, WEBP
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setSelectedFile(null);
                  setPreviewUrl('');
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
