import React from 'react';
import { Badge } from '@/components/ui/badge';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count <= 0) return null;
  
  return (
    <Badge 
      variant="destructive" 
      className={`absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center animate-pulse ${className}`}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}