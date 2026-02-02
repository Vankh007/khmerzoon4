import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Send, Image, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ContentItem {
  id: string;
  title: string;
  poster_path?: string | null;
  content_type?: string;
  overview?: string | null;
}

interface PushNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentItem | null;
}

export function PushNotificationDialog({
  open,
  onOpenChange,
  content,
}: PushNotificationDialogProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [topic, setTopic] = useState('all');

  // Pre-fill with content data when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && content) {
      setTitle(`🎬 ${content.title}`);
      setBody(content.overview?.substring(0, 150) || `Check out "${content.title}" now!`);
      setImageUrl(content.poster_path || '');
      setTopic('all');
    }
    onOpenChange(isOpen);
  };

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title,
          body,
          imageUrl: imageUrl || undefined,
          topic,
          data: content ? {
            content_id: content.id,
            content_type: content.content_type || 'content',
          } : {},
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      toast.success('Push notification sent successfully!');
      onOpenChange(false);
      // Reset form
      setTitle('');
      setBody('');
      setImageUrl('');
      setTopic('all');
    },
    onError: (error: Error) => {
      console.error('Failed to send notification:', error);
      toast.error(`Failed to send notification: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please fill in title and message');
      return;
    }
    sendNotificationMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Send Push Notification
          </DialogTitle>
          <DialogDescription>
            Send a push notification to all app users about this content.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content Preview */}
          {content && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {content.poster_path ? (
                <img
                  src={content.poster_path}
                  alt={content.title}
                  className="w-12 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">{content.title}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {content.content_type?.replace('-', ' ')}
                </p>
              </div>
            </div>
          )}

          {/* Notification Title */}
          <div className="space-y-2">
            <Label htmlFor="notification-title">Notification Title</Label>
            <Input
              id="notification-title"
              placeholder="Enter notification title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/100
            </p>
          </div>

          {/* Notification Body */}
          <div className="space-y-2">
            <Label htmlFor="notification-body">Message</Label>
            <Textarea
              id="notification-body"
              placeholder="Enter notification message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={250}
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length}/250
            </p>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="notification-image">Image URL (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="notification-image"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1"
              />
              {imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setImageUrl('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {imageUrl && (
              <div className="mt-2">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-20 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Topic Selection */}
          <div className="space-y-2">
            <Label htmlFor="notification-topic">Target Audience</Label>
            <select
              id="notification-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="all">All Users</option>
              <option value="movies">Movie Subscribers</option>
              <option value="series">Series Subscribers</option>
              <option value="anime">Anime Subscribers</option>
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sendNotificationMutation.isPending}
          >
            {sendNotificationMutation.isPending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
