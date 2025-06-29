import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, MessageCircle, Heart, UserPlus, UserCheck, Bell, Info, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    content: string;
    reference_id: string | null;
    read: boolean;
    created_at: string;
  };
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const navigate = useNavigate();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="h-4 w-4 text-social-blue" />;
      case 'friend_accepted':
        return <UserCheck className="h-4 w-4 text-social-green" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-social-green" />;
      case 'like':
        return <Heart className="h-4 w-4 text-social-magenta" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-social-purple" />;
      case 'system':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'admin':
        return <Zap className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'border-l-social-blue bg-social-blue/5';
      case 'friend_accepted':
        return 'border-l-social-green bg-social-green/5';
      case 'message':
        return 'border-l-social-green bg-social-green/5';
      case 'like':
        return 'border-l-social-magenta bg-social-magenta/5';
      case 'comment':
        return 'border-l-social-purple bg-social-purple/5';
      case 'system':
        return 'border-l-blue-500 bg-blue-50';
      case 'admin':
        return 'border-l-amber-500 bg-amber-50';
      default:
        return 'border-l-muted-foreground bg-muted/5';
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification type and reference_id
    if (notification.reference_id) {
      switch (notification.type) {
        case 'friend_request':
          navigate('/friends');
          break;
        case 'message':
          navigate(`/messages?user=${notification.reference_id}`);
          break;
        case 'like':
        case 'comment':
          navigate('/dashboard');
          break;
        default:
          // No navigation for other types
          break;
      }
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md border-l-4 ${
        !notification.read 
          ? `${getNotificationColor(notification.type)} shadow-sm` 
          : 'border-l-muted bg-background'
      }`}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0 max-w-[calc(100%-60px)]">
            <p className={`font-pixelated text-sm leading-relaxed break-words ${
              !notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}>
              {notification.content}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <p className="font-pixelated text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
              {!notification.read && (
                <Badge variant="secondary" className="h-4 px-1 text-xs font-pixelated">
                  New
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!notification.read && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-social-green/10"
              >
                <Check className="h-3 w-3 text-social-green" />
              </Button>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-destructive/10"
            >
              <X className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}