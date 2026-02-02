import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { FCM } from '@capacitor-community/fcm';

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only work on native platforms');
      return;
    }

    const initPushNotifications = async () => {
      try {
        // Request permission
        const permStatus = await PushNotifications.requestPermissions();
        
        if (permStatus.receive !== 'granted') {
          console.log('Push notification permission denied');
          return;
        }

        // Register for push notifications
        await PushNotifications.register();

        // Add listeners
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          setToken(token.value);
          setIsRegistered(true);

          // Subscribe to 'all' topic for broadcast notifications
          try {
            await FCM.subscribeTo({ topic: 'all' });
            console.log('Subscribed to topic: all');
          } catch (err) {
            console.error('Failed to subscribe to topic:', err);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          // Handle foreground notification - you can show a toast or in-app alert
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed:', notification);
          // Handle notification tap - navigate to relevant content
          const data = notification.notification.data;
          if (data?.contentId) {
            window.location.href = `/watch/${data.contentId}`;
          }
        });

      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initPushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  const subscribeToTopic = async (topic: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await FCM.subscribeTo({ topic });
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to subscribe to ${topic}:`, error);
    }
  };

  const unsubscribeFromTopic = async (topic: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await FCM.unsubscribeFrom({ topic });
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to unsubscribe from ${topic}:`, error);
    }
  };

  return {
    token,
    isRegistered,
    subscribeToTopic,
    unsubscribeFromTopic,
  };
};
