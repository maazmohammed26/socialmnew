import React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';
import { ShimmerEffect } from '@/components/ui/crimson-effects';

interface CrimsonButtonProps extends ButtonProps {
  shimmer?: boolean;
  glow?: boolean;
  gradient?: boolean;
  animated?: boolean;
}

export function CrimsonButton({
  children,
  className,
  shimmer = true,
  glow = false,
  gradient = true,
  animated = true,
  ...props
}: CrimsonButtonProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <Button className={className} {...props}>
        {children}
      </Button>
    );
  }
  
  return (
    <Button
      className={cn(
        gradient && 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600',
        glow && 'shadow-md shadow-red-600/20',
        animated && 'hover:-translate-y-1 active:translate-y-0',
        className
      )}
      {...props}
    >
      {shimmer ? (
        <ShimmerEffect disabled={props.disabled}>
          {children}
        </ShimmerEffect>
      ) : (
        children
      )}
    </Button>
  );
}

export function CrimsonIconButton({
  children,
  className,
  shimmer = false,
  glow = true,
  gradient = false,
  animated = true,
  ...props
}: CrimsonButtonProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <Button className={className} {...props}>
        {children}
      </Button>
    );
  }
  
  return (
    <Button
      className={cn(
        'rounded-full',
        gradient && 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600',
        glow && 'shadow-md shadow-red-600/20',
        animated && 'hover:scale-110 active:scale-95',
        className
      )}
      {...props}
    >
      {shimmer ? (
        <ShimmerEffect disabled={props.disabled}>
          {children}
        </ShimmerEffect>
      ) : (
        children
      )}
    </Button>
  );
}

export function CrimsonOutlineButton({
  children,
  className,
  shimmer = false,
  glow = false,
  animated = true,
  ...props
}: CrimsonButtonProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <Button variant="outline" className={className} {...props}>
        {children}
      </Button>
    );
  }
  
  return (
    <Button
      variant="outline"
      className={cn(
        'border-red-200 text-red-700 hover:bg-red-50',
        glow && 'shadow-sm shadow-red-200/50',
        animated && 'hover:-translate-y-1 active:translate-y-0',
        className
      )}
      {...props}
    >
      {shimmer ? (
        <ShimmerEffect disabled={props.disabled}>
          {children}
        </ShimmerEffect>
      ) : (
        children
      )}
    </Button>
  );
}

export function CrimsonGhostButton({
  children,
  className,
  shimmer = false,
  animated = true,
  ...props
}: CrimsonButtonProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <Button variant="ghost" className={className} {...props}>
        {children}
      </Button>
    );
  }
  
  return (
    <Button
      variant="ghost"
      className={cn(
        'text-red-700 hover:bg-red-50',
        animated && 'hover:scale-105 active:scale-95',
        className
      )}
      {...props}
    >
      {shimmer ? (
        <ShimmerEffect disabled={props.disabled}>
          {children}
        </ShimmerEffect>
      ) : (
        children
      )}
    </Button>
  );
}

export function CrimsonLinkButton({
  children,
  className,
  ...props
}: CrimsonButtonProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <Button variant="link" className={className} {...props}>
        {children}
      </Button>
    );
  }
  
  return (
    <Button
      variant="link"
      className={cn(
        'text-red-600 hover:text-red-700 p-0 h-auto',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}