import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, MessageCircle, Heart, UserPlus, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

interface NotificationSettings {
  likes: boolean;
  comments: boolean;
  messages: boolean;
  friendRequests: boolean;
  system: boolean;
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    likes: true,
    comments: true,
    messages: true,
    friendRequests: true,
    system: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try to get settings from database
        const { data, error } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading notification settings:', error);
          return;
        }

        // If settings exist, use them
        if (data) {
          setSettings({
            likes: data.likes,
            comments: data.comments,
            messages: data.messages,
            friendRequests: data.friend_requests,
            system: data.system
          });
        } else {
          // Otherwise, create default settings
          const { error: insertError } = await supabase
            .from('notification_settings')
            .insert({
              user_id: user.id,
              likes: true,
              comments: true,
              messages: true,
              friend_requests: true,
              system: true
            });

          if (insertError) {
            console.error('Error creating notification settings:', insertError);
          }
        }
      } catch (error) {
        console.error('Error in loadSettings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Map settings key to database column name
      const columnMap: Record<keyof NotificationSettings, string> = {
        likes: 'likes',
        comments: 'comments',
        messages: 'messages',
        friendRequests: 'friend_requests',
        system: 'system'
      };

      const { error } = await supabase
        .from('notification_settings')
        .update({ [columnMap[key]]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(`Error updating ${key} setting:`, error);
      toast.error(`Failed to update ${key} setting`);
      
      // Revert the setting change in the UI
      setSettings(prev => ({ ...prev, [key]: !value }));
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-36 bg-muted rounded"></div>
                <div className="h-6 w-10 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-pixelated flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-social-magenta" />
              <Label htmlFor="likes" className="font-pixelated text-xs">
                Likes
              </Label>
            </div>
            <Switch
              id="likes"
              checked={settings.likes}
              onCheckedChange={(checked) => updateSetting('likes', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-social-purple" />
              <Label htmlFor="comments" className="font-pixelated text-xs">
                Comments
              </Label>
            </div>
            <Switch
              id="comments"
              checked={settings.comments}
              onCheckedChange={(checked) => updateSetting('comments', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-social-green" />
              <Label htmlFor="messages" className="font-pixelated text-xs">
                Messages
              </Label>
            </div>
            <Switch
              id="messages"
              checked={settings.messages}
              onCheckedChange={(checked) => updateSetting('messages', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-social-blue" />
              <Label htmlFor="friendRequests" className="font-pixelated text-xs">
                Friend Requests
              </Label>
            </div>
            <Switch
              id="friendRequests"
              checked={settings.friendRequests}
              onCheckedChange={(checked) => updateSetting('friendRequests', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <Label htmlFor="system" className="font-pixelated text-xs">
                System Notifications
              </Label>
            </div>
            <Switch
              id="system"
              checked={settings.system}
              onCheckedChange={(checked) => updateSetting('system', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}