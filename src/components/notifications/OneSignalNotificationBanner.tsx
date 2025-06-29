import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X, Smartphone, Monitor } from 'lucide-react';

interface OneSignalNotificationBannerProps {
  onDismiss?: () => void;
}

export function OneSignalNotificationBanner({ onDismiss }: OneSignalNotificationBannerProps) {
  // This component will never be shown
  return null;
}