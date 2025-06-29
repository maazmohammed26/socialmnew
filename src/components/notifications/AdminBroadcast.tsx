import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';

export function AdminBroadcast() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast.error('Please enter both title and message');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');
        
      if (usersError) throw usersError;
      
      if (!users || users.length === 0) {
        toast.error('No users found to send notifications to');
        return;
      }
      
      // Create notifications for all users
      const notifications = users.map(user => ({
        user_id: user.id,
        type: 'admin',
        content: `${title}: ${message}`,
        read: false
      }));
      
      const { error: notificationsError } = await supabase
        .from('notifications')
        .insert(notifications);
        
      if (notificationsError) throw notificationsError;
      
      // Dispatch custom event for toast notifications (works for all users regardless of notification settings)
      const event = new CustomEvent('adminBroadcastToast', {
        detail: { title, message }
      });
      window.dispatchEvent(event);
      
      toast.success('Broadcast sent to all users');
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-pixelated flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-amber-500" />
          Admin Broadcast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="font-pixelated text-xs">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Broadcast title"
              className="font-pixelated text-xs"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message" className="font-pixelated text-xs">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Broadcast message"
              className="font-pixelated text-xs min-h-[80px]"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full font-pixelated text-xs bg-amber-500 hover:bg-amber-600 text-white"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Broadcast to All Users'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}