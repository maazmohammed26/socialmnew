import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, X, Palette, ExternalLink, Heart } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

interface SocialChatAnnouncementProps {
  onDismiss: () => void;
}

export function SocialChatAnnouncement({ onDismiss }: SocialChatAnnouncementProps) {
  // Always keep this component hidden
  const [announcement, setAnnouncement] = useState<string | null>(null);
  
  useEffect(() => {
    // Set that we've shown the announcement to prevent it from appearing
    localStorage.setItem('socialchat_announcement_shown', 'true');
  }, []);

  // This component will never be visible
  return null;
}