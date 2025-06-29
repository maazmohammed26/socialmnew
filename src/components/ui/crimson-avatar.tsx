import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GlowEffect } from '@/components/ui/crimson-effects';

interface CrimsonAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
  glow?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export function CrimsonAvatar({
  src,
  alt,
  fallback,
  className,
  size = 'md',
  border = true,
  glow = false,
  gradient = false,
  onClick
}: CrimsonAvatarProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };
  
  if (!isCrimson) {
    return (
      <Avatar 
        className={cn(sizeClasses[size], className)}
        onClick={onClick}
      >
        {src && <AvatarImage src={src} alt={alt || 'Avatar'} />}
        <AvatarFallback>{fallback || 'U'}</AvatarFallback>
      </Avatar>
    );
  }
  
  const avatarContent = (
    <Avatar 
      className={cn(
        sizeClasses[size],
        border && 'border-2 border-red-200',
        gradient && 'bg-gradient-to-br from-red-500 to-red-700',
        'transition-all duration-300 hover:scale-105',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {src && <AvatarImage src={src} alt={alt || 'Avatar'} />}
      <AvatarFallback className={gradient ? 'bg-gradient-to-br from-red-500 to-red-700 text-white' : ''}>
        {fallback || 'U'}
      </AvatarFallback>
    </Avatar>
  );
  
  if (glow) {
    return (
      <GlowEffect color="red" intensity="low">
        {avatarContent}
      </GlowEffect>
    );
  }
  
  return avatarContent;
}

export function CrimsonAvatarGroup({
  avatars,
  max = 3,
  size = 'md',
  className
}: {
  avatars: Array<{src?: string, fallback: string}>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  const displayAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  
  if (!isCrimson) {
    return (
      <div className={cn('flex -space-x-2', className)}>
        {displayAvatars.map((avatar, i) => (
          <Avatar key={i} className={cn(sizeClasses[size], 'border-2 border-background')}>
            {avatar.src && <AvatarImage src={avatar.src} alt="Avatar" />}
            <AvatarFallback>{avatar.fallback}</AvatarFallback>
          </Avatar>
        ))}
        
        {remainingCount > 0 && (
          <Avatar className={cn(sizeClasses[size], 'border-2 border-background bg-muted')}>
            <AvatarFallback>+{remainingCount}</AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }
  
  return (
    <div className={cn('flex -space-x-3', className)}>
      {displayAvatars.map((avatar, i) => (
        <Avatar 
          key={i} 
          className={cn(
            sizeClasses[size], 
            'border-2 border-white',
            'transition-all duration-300 hover:scale-105 hover:-translate-y-1',
            'shadow-sm'
          )}
        >
          {avatar.src && <AvatarImage src={avatar.src} alt="Avatar" />}
          <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-700 text-white">
            {avatar.fallback}
          </AvatarFallback>
        </Avatar>
      ))}
      
      {remainingCount > 0 && (
        <Avatar 
          className={cn(
            sizeClasses[size], 
            'border-2 border-white',
            'bg-gradient-to-br from-gray-500 to-gray-700 text-white',
            'transition-all duration-300 hover:scale-105 hover:-translate-y-1',
            'shadow-sm'
          )}
        >
          <AvatarFallback>+{remainingCount}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}