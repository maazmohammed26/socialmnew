import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShimmerEffect, GlowEffect } from '@/components/ui/crimson-effects';

interface CrimsonCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  shimmer?: boolean;
  glow?: boolean;
  border?: boolean;
}

export function CrimsonCard({
  children,
  className,
  hover = true,
  gradient = true,
  shimmer = false,
  glow = false,
  border = true,
}: CrimsonCardProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <Card className={className}>
        {children}
      </Card>
    );
  }
  
  return (
    <Card
      className={cn(
        hover && 'hover:-translate-y-1 transition-transform',
        gradient && 'bg-gradient-to-br from-white to-red-50',
        border && 'border border-red-100',
        glow && 'shadow-lg shadow-red-100/50',
        className
      )}
    >
      {shimmer ? (
        <ShimmerEffect>
          {children}
        </ShimmerEffect>
      ) : (
        children
      )}
    </Card>
  );
}

interface CrimsonCardHeaderProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}

export function CrimsonCardHeader({
  children,
  className,
  gradient = false,
}: CrimsonCardHeaderProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <CardHeader className={className}>
        {children}
      </CardHeader>
    );
  }
  
  return (
    <CardHeader
      className={cn(
        gradient && 'bg-gradient-to-r from-red-50 to-white',
        className
      )}
    >
      {children}
    </CardHeader>
  );
}

interface CrimsonCardTitleProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  glow?: boolean;
}

export function CrimsonCardTitle({
  children,
  className,
  gradient = true,
  glow = false,
}: CrimsonCardTitleProps) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <CardTitle className={className}>
        {children}
      </CardTitle>
    );
  }
  
  const content = gradient ? (
    <span 
      className="bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent"
    >
      {children}
    </span>
  ) : (
    children
  );
  
  return (
    <CardTitle className={className}>
      {glow ? (
        <GlowEffect color="red" intensity="low">
          {content}
        </GlowEffect>
      ) : (
        content
      )}
    </CardTitle>
  );
}

export function CrimsonCardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CardDescription className={cn('text-gray-500', className)}>
      {children}
    </CardDescription>
  );
}

export function CrimsonCardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CardContent className={className}>
      {children}
    </CardContent>
  );
}

export function CrimsonCardFooter({
  children,
  className,
  gradient = false,
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  if (!isCrimson) {
    return (
      <CardFooter className={className}>
        {children}
      </CardFooter>
    );
  }
  
  return (
    <CardFooter
      className={cn(
        gradient && 'bg-gradient-to-r from-white to-red-50 mt-auto',
        className
      )}
    >
      {children}
    </CardFooter>
  );
}

export function CrimsonGlassCard({
  children,
  className,
  blur = 'md',
}: {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg';
}) {
  // Only apply these effects in crimson theme
  const isCrimson = document.documentElement.classList.contains('crimson');
  
  const blurMap = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
  };
  
  if (!isCrimson) {
    return (
      <Card className={className}>
        {children}
      </Card>
    );
  }
  
  return (
    <Card
      className={cn(
        'bg-white/80 border border-red-100/50',
        blurMap[blur],
        'shadow-lg shadow-red-100/20',
        'hover:-translate-y-1 transition-transform',
        className
      )}
    >
      {children}
    </Card>
  );
}