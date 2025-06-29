import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationContext } from './NotificationProvider';
import { toast } from '@/components/ui/sonner';

export function NotificationGenerator() {
  const [type, setType] = useState('system');
  const [content, setContent] = useState('');
  const { createNotification } = useNotificationContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Please enter notification content');
      return;
    }
    
    try {
      const notification = await createNotification(type, content);
      
      if (notification) {
        toast.success('Notification created successfully');
        setContent('');
      } else {
        toast.error('Failed to create notification');
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Failed to create notification');
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm font-pixelated">Create Test Notification</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="font-pixelated text-xs">Notification Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="font-pixelated text-xs">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system" className="font-pixelated text-xs">System</SelectItem>
                <SelectItem value="like" className="font-pixelated text-xs">Like</SelectItem>
                <SelectItem value="comment" className="font-pixelated text-xs">Comment</SelectItem>
                <SelectItem value="friend_request" className="font-pixelated text-xs">Friend Request</SelectItem>
                <SelectItem value="friend_accepted" className="font-pixelated text-xs">Friend Accepted</SelectItem>
                <SelectItem value="message" className="font-pixelated text-xs">Message</SelectItem>
                <SelectItem value="admin" className="font-pixelated text-xs">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content" className="font-pixelated text-xs">Content</Label>
            <Input
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter notification content"
              className="font-pixelated text-xs"
            />
          </div>
          
          <Button type="submit" className="w-full font-pixelated text-xs">
            Create Notification
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}