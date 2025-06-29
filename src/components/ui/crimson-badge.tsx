import React from 'react';
import { cn } from '@/lib/utils';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { GlowEffect } from '@/components/ui/crimson-effects';

interface CrimsonBadgeProps extends BadgeProps {
  glow?: boolean;
  gradient?: boolean;
  pulse?: boolean;
}

export function CrimsonBadge({
  children,
  className,
  variant = 'default',
  glow = false,
  gradient = false,
  pulse = false,
  ...props
}: CrimsonBadgeProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <Badge className={className} variant={variant} {...props}>
        {children}
      </Badge>
    );
  }
  
  const badgeContent = (
    <Badge
      className={cn(
        gradient && variant === 'default' && 'bg-gradient-to-r from-red-600 to-red-700',
        gradient && variant === 'secondary' && 'bg-gradient-to-r from-gray-200 to-gray-300',
        gradient && variant === 'destructive' && 'bg-gradient-to-r from-red-700 to-red-800',
        gradient && variant === 'outline' && 'border-red-200 text-red-700',
        pulse && 'animate-pulse',
        className
      )}
      variant={variant}
      {...props}
    >
      {children}
    </Badge>
  );
  
  if (glow) {
    return (
      <GlowEffect color="red" intensity="low">
        {badgeContent}
      </GlowEffect>
    );
  }
  
  return badgeContent;
}

export function CrimsonStatusBadge({
  status,
  className,
  pulse = true,
}: {
  status: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
  pulse?: boolean;
}) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  const statusConfig = {
    online: {
      color: 'bg-green-500',
      text: 'Online',
      pulseColor: 'bg-green-500'
    },
    offline: {
      color: 'bg-gray-400',
      text: 'Offline',
      pulseColor: 'bg-gray-400'
    },
    away: {
      color: 'bg-yellow-500',
      text: 'Away',
      pulseColor: 'bg-yellow-500'
    },
    busy: {
      color: 'bg-red-500',
      text: 'Busy',
      pulseColor: 'bg-red-500'
    }
  };
  
  if (!isCrimson) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <div className={cn('w-2 h-2 rounded-full', statusConfig[status].color)} />
        <span className="text-xs">{statusConfig[status].text}</span>
      </div>
    );
  }
  
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="relative">
        <div className={cn('w-2 h-2 rounded-full', statusConfig[status].color)} />
        {pulse && status === 'online' && (
          <div className={cn(
            'absolute inset-0 rounded-full',
            statusConfig[status].pulseColor,
            'animate-ping opacity-75'
          )} />
        )}
      </div>
      <span className="text-xs font-medium">{statusConfig[status].text}</span>
    </div>
  );
}

export function CrimsonNotificationBadge({
  count,
  max = 99,
  className,
  glow = true,
}: {
  count: number;
  max?: number;
  className?: string;
  glow?: boolean;
}) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (count <= 0) return null;
  
  const displayCount = count > max ? `${max}+` : count;
  
  if (!isCrimson) {
    return (
      <Badge variant="destructive" className={className}>
        {displayCount}
      </Badge>
    );
  }
  
  const badgeContent = (
    <Badge
      variant="destructive"
      className={cn(
        'bg-gradient-to-r from-red-600 to-red-700',
        'animate-pulse',
        className
      )}
    >
      {displayCount}
    </Badge>
  );
  
  if (glow) {
    return (
      <GlowEffect color="red" intensity="medium">
        {badgeContent}
      </GlowEffect>
    );
  }
  
  return badgeContent;
}