import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  content_id?: string;
  episode_id?: string;
  poster_url?: string;
  is_read: boolean;
  created_at: string;
}

export const useUserNotifications = () => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const previousCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ4NVKzn77BjHAU7k9n0zn0vBSh+zPLaizsIGGS57OihUg8OT6Lj8LhlHQQ2jdXzzIEzBh1qu+rmnlEODlKm5fCsYBoEOI/X88l7LwUme8rx3I1ACRNbte3op1UPCkuf3/bDeiwGMYnU88yAMQYeb73v45xPDwxSpePxrWMdBTmP1/POfDEGKn/M8tyJOwgZZrjt46JUDwxPpOPwtmQcBDmR1/PMfC4GKHzL8dySQQoVXrTp66hTEApHnt/yvmwhBTKH0fLTgjIGHm3A7eSaUQ0OVKzi8K9iHQU5kdj0zn0wBil+y/DbjDsIF2O57OWhURAPT6Xk8bBkHAQ4j9bzyH0wBSh9y/HajDsIF2W56uWiUg8PTqTj8bFjHAU5j9fzy34xBSh/y/DajDwIF2O46uSgUQ8OUKTi8K9kHAU5j9bzyH4yBSh/y/DajTsIF2S56uWiUw8OTaPj8LBlHAU5j9bzyXwwBSiBy/DbjToIF2O46uSiUg8OT6Pj8LBkHQU5j9fzyngwBSeDy/DcizsIF2S46uWhUg8OT6Li8LBkHQQ4kNfzy3kwBSh/y/DajDoIG2S56+WjUg8PTqPj8K9kHAU5j9fzy3kwBSh/y/DajDoIG2O56+WiUg8OT6Pi8LBkHAU5j9fzy3gwBSh+y/DajDoIG2O56+WiUw8OT6Pi8LBlHQU5j9fzy3kxBSh/y/DbjDsIF2O56+SiUg8OT6Pi8K9kHQU5j9fzyHkwBSh/y/DbjDsIF2O56uWiUg8OT6Pi8K9kHQU5j9fzyHkxBSh/y/DbjDsIF2O56uWiUg8OT6Pi8K9kHQQ4j9fzy3gwBSh/y/DajDoIG2O56+WiUg8OT6Pi8LBkHAU5j9fzy3kwBSh/y/DajDoIG2O56+WiUg8OT6Pj8LBkHAU5jtfzyHkwBSh/y/DajDsIG2O56+WiUg8OT6Pi8K9kHQU5j9fzy3gwBSh/y/DbjDsIF2O56+WiUg8OT6Pi8K9kHQU5j9fzy3kwBSh/y/DajDoIG2O56+WiUg8OT6Pi8K9kHAU5j9fzy3kwBSh/y/DajDoIG2O56+WiUg8OT6Pj8LBkHAU5j9fzy3gwBSh/y/DbjDsIF2O56+WiUg8OT6Pi8K9kHQU5j9fzy3gwBSh/y/DbjDsIG2O56+WiUg8OT6Pi8K9kHQU5j9fzy3gwBSh/y/DbjDsIG2O56+WiUg8OT6Pi8K9kHQU5j9fzy3gwBSh/y/DbjDsIG2O56+WiUg8');
    
    if (user) {
      fetchNotifications();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('user-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user]);

  // Play sound when new notifications arrive
  useEffect(() => {
    if (!loading && notifications.length > previousCountRef.current && previousCountRef.current > 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
      }
    }
    previousCountRef.current = notifications.length;
  }, [notifications, loading]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as UserNotification[]);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    await supabase
      .from('user_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    fetchNotifications();
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
