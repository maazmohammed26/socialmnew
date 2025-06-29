import React, { createContext, useContext, useEffect } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useNotificationService } from '@/hooks/use-notification-service';

interface NotificationContextType {
  notifications: any[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  createNotification: (type: string, content: string, referenceId?: string) => Promise<any>;
  createTestNotification: (type: string, content: string) => Promise<any>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const notificationsHook = useNotifications();
  const notificationService = useNotificationService();

  // Update document title with unread count
  useEffect(() => {
    if (notificationsHook.unreadCount > 0) {
      document.title = `(${notificationsHook.unreadCount}) SocialChat`;
    } else {
      document.title = "SocialChat";
    }
    
    return () => {
      document.title = "SocialChat";
    };
  }, [notificationsHook.unreadCount]);

  return (
    <NotificationContext.Provider value={{
      ...notificationsHook,
      createTestNotification: notificationService.createTestNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}