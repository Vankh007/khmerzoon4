import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Component that initializes push notifications on native platforms
 * Place this at the root of your app to auto-register for notifications
 */
export const PushNotificationInit = () => {
  const { isRegistered, token } = usePushNotifications();

  useEffect(() => {
    if (Capacitor.isNativePlatform() && isRegistered) {
      console.log('Push notifications registered successfully');
      console.log('FCM Token:', token);
    }
  }, [isRegistered, token]);

  // This component doesn't render anything
  return null;
};
