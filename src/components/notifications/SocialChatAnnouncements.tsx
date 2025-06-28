import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, X, Palette, ExternalLink, Heart } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

interface SocialChatAnnouncementProps {
  onDismiss: () => void;
}

export function SocialChatAnnouncement({ onDismiss }: SocialChatAnnouncementProps) {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const { theme } = useTheme();
  
  useEffect(() => {
    // Check if announcement was already shown
    const announcementShown = localStorage.getItem('socialchat_announcement_shown');
    if (!announcementShown) {
      // Show different announcements based on theme
      if (theme === 'modern' || theme === 'crimson') {
        setAnnouncement('You\'re using our new modern theme! Try exploring other themes in your profile settings.');
      } else {
        setAnnouncement('Try our modern themes for a sleek experience! Visit your profile to change themes.');
      }
    }
  }, [theme]);

  const handleDismiss = () => {
    localStorage.setItem('socialchat_announcement_shown', 'true');
    onDismiss();
  };

  if (!announcement) return null;

  return (
    <Card className="mb-4 border-l-4 border-l-social-green">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5 text-social-green" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <h3 className="font-pixelated text-sm font-medium mb-1">SocialChat Tip</h3>
              <Button
                onClick={handleDismiss}
                size="icon"
                variant="ghost"
                className="h-6 w-6 -mt-1 -mr-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="font-pixelated text-xs text-muted-foreground mb-3">
              {announcement}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => window.location.href = '/profile'}
                size="sm"
                className="h-7 px-2 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
              >
                <Palette className="h-3 w-3 mr-1" />
                Change Theme
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}