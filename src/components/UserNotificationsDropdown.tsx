import { Bell, Check, CheckCheck, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const UserNotificationsDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useUserNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate to content if available
    if (notification.content_id) {
      if (notification.episode_id) {
        // For episodes, we'd need more info - just navigate to content for now
        navigate(`/watch/series/${notification.content_id}`);
      } else {
        navigate(`/watch/movie/${notification.content_id}`);
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new_episode':
        return <Play className="h-4 w-4 text-primary" />;
      case 'content_update':
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-white hover:bg-white/20"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-accent/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {notification.poster_url ? (
                      <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-primary/20 rounded-md">
                        <AvatarImage src={notification.poster_url} alt="" className="object-cover" />
                        <AvatarFallback className="rounded-md">
                          {getTypeIcon(notification.type)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-12 w-12 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                        {getTypeIcon(notification.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-primary">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
