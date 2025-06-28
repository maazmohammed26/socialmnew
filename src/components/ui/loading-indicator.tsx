import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'primary' | 'secondary' | 'green' | 'blue' | 'red';
  className?: string;
}

export function LoadingIndicator({ 
  size = 'md', 
  color = 'default',
  className 
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };
  
  const colorClasses = {
    default: 'border-muted-foreground/20 border-t-muted-foreground/60',
    primary: 'border-primary/20 border-t-primary/60',
    secondary: 'border-secondary/20 border-t-secondary/60',
    green: 'border-social-green/20 border-t-social-green/60',
    blue: 'border-social-blue/20 border-t-social-blue/60',
    red: 'border-red-300/20 border-t-red-500/60'
  };
  
  return (
    <div className={cn(
      'rounded-full animate-spin',
      sizeClasses[size],
      colorClasses[color],
      className
    )} />
  );
}

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <LoadingIndicator size="lg" color="green" className="mb-4" />
      <p className="font-pixelated text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] z-10 rounded-lg">
      <LoadingIndicator size="md" color="green" className="mb-2" />
      <p className="font-pixelated text-xs text-muted-foreground">{message}</p>
    </div>
  );
}