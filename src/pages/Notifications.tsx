import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { OneSignalNotificationBanner } from '@/components/notifications/OneSignalNotificationBanner';
import { SocialChatAnnouncement } from '@/components/notifications/SocialChatAnnouncements';
import { useOneSignalNotifications } from '@/hooks/use-onesignal-notifications';
import { useNotifications } from '@/hooks/use-notifications';

export function Notifications() {
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const { oneSignalUser } = useOneSignalNotifications();
  const { createNotification } = useNotifications();

  // Create a test notification when component mounts
  useEffect(() => {
    const createTestNotification = async () => {
      // Only create test notification if we don't have the flag in localStorage
      if (!localStorage.getItem('test_notification_created')) {
        await createNotification(
          'system',
          'Welcome to the new notifications system! This is a test notification to show you how it works.',
          null
        );
        localStorage.setItem('test_notification_created', 'true');
      }
    };

    createTestNotification();
  }, [createNotification]);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)]">
        {/* OneSignal Notification Banner */}
        {showNotificationBanner && !oneSignalUser.subscribed && (
          <OneSignalNotificationBanner onDismiss={() => setShowNotificationBanner(false)} />
        )}

        {/* SocialChat Announcement */}
        {showAnnouncement && (
          <SocialChatAnnouncement onDismiss={() => setShowAnnouncement(false)} />
        )}

        {/* Notification Center */}
        <NotificationCenter />
      </div>
    </DashboardLayout>
  );
}

export default Notifications;