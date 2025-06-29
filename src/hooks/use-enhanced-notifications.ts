import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOneSignalNotifications } from '@/hooks/use-onesignal-notifications';

interface NotificationData {
  id: string;
  type: string;
  content: string;
  reference_id?: string;
  read: boolean;
  created_at: string;
  user_id: string;
}

export function useEnhancedNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isGranted, setIsGranted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasShownSystemNotification, setHasShownSystemNotification] = useState(true); // Set to true to prevent showing
  const { toast } = useToast();
  const { oneSignalUser, sendNotificationToUser } = useOneSignalNotifications();

  // Initialize user and permissions
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          
          // Check notification permission (both browser and OneSignal)
          if ('Notification' in window) {
            setIsGranted(Notification.permission === 'granted' || oneSignalUser.subscribed);
          }
          
          // Load initial notifications
          await fetchNotifications(user.id);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [oneSignalUser.subscribed, hasShownSystemNotification]);

  // Update permission status when OneSignal status changes
  useEffect(() => {
    if ('Notification' in window) {
      setIsGranted(Notification.permission === 'granted' || oneSignalUser.subscribed);
    }
  }, [oneSignalUser.subscribed]);

  // Create system notification about theme customization
  const createSystemNotification = useCallback(async (userId: string) => {
    try {
      // Create sample notifications
      const sampleNotifications = [
        {
          id: 'founder-message',
          user_id: userId,
          type: 'system',
          content: "👋 Hello! I'm Mohammed Maaz A, the developer of SocialChat. This platform was created by me alone, so there might be some loading issues - please ignore them. Thank you for your support and patience!",
          read: false,
          created_at: new Date(Date.now() - 1000).toISOString(),
        }
      ];
      
      setNotifications(sampleNotifications);
      setUnreadCount(1);
    } catch (error) {
      console.error('Error creating system notification:', error);
    }
  }, [toast]);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async (userId: string) => {
    try {
      // Create sample notifications
      const sampleNotifications = [
        {
          id: 'founder-message',
          user_id: userId,
          type: 'system',
          content: "👋 Hello! I'm Mohammed Maaz A, the developer of SocialChat. This platform was created by me alone, so there might be some loading issues - please ignore them. Thank you for your support and patience!",
          read: false,
          created_at: new Date(Date.now() - 1000).toISOString(),
        }
      ];
      
      setNotifications(sampleNotifications);
      setUnreadCount(1);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  // Create notification in database
  const createNotification = useCallback(async (
    type: string, 
    content: string, 
    referenceId?: string
  ) => {
    try {
      if (!currentUser) return null;
      
      const newNotification = {
        id: `notification-${Date.now()}`,
        user_id: currentUser.id,
        type,
        content,
        reference_id: referenceId,
        read: false,
        created_at: new Date().toISOString()
      };

      // Update local state
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }, [currentUser]);

  // Send browser notification (fallback)
  const sendBrowserNotification = useCallback((title: string, options?: NotificationOptions) => {
    // If OneSignal is handling notifications, don't send browser notifications
    if (oneSignalUser.subscribed) return null;

    if (!isGranted || !('Notification' in window)) return null;

    try {
      const notification = new Notification(title, {
        ...options,
        icon: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
        badge: '/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png',
        requireInteraction: false,
        silent: false,
        tag: options?.tag || 'socialchat'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [isGranted, oneSignalUser.subscribed]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;

    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [currentUser]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if needed
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [notifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    if (!currentUser) return;

    try {
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [currentUser]);

  // Request notification permission (browser fallback)
  const requestPermission = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      setIsGranted(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: 'Browser notifications enabled',
          description: 'You will now receive browser notifications',
          duration: 3000
        });

        // Send test notification
        sendBrowserNotification('Notifications Enabled!', {
          body: 'You will now receive browser notifications',
          tag: 'test'
        });
      }
      
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [sendBrowserNotification, toast]);

  // Update document title with unread count
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) SocialChat`;
    } else {
      document.title = "SocialChat";
    }
    
    return () => {
      document.title = "SocialChat";
    };
  }, [unreadCount]);

  return {
    notifications,
    unreadCount,
    isGranted: isGranted || oneSignalUser.subscribed,
    isOnline,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    requestPermission,
    createNotification,
    fetchNotifications: () => currentUser && fetchNotifications(currentUser.id),
    oneSignalEnabled: oneSignalUser.subscribed
  };
}