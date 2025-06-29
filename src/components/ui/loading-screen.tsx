import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  className?: string;
}

export function LoadingScreen({ className }: LoadingScreenProps) {
  // Check if we're in crimson theme
  const [isCrimson, setIsCrimson] = useState(false);
  
  useEffect(() => {
    // Safely check for crimson theme
    const checkTheme = () => {
      if (typeof document !== 'undefined') {
        setIsCrimson(document.documentElement.classList.contains('crimson'));
      }
    };
    
    // Check initially
    checkTheme();
    
    // Set up observer to detect theme changes
    const observer = new MutationObserver(checkTheme);
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['class'] 
      });
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn(
      "fixed inset-0 flex items-center justify-center bg-gradient-to-br from-social-light-green/20 to-white dark:from-social-dark-green/20 dark:to-background",
      isCrimson && "from-red-500/10 to-white dark:from-red-800/20 dark:to-background",
      className
    )}>
      <div className="text-center space-y-4">
        <img 
          src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
          alt="SocialChat Logo" 
          className={cn(
            "h-20 w-auto mx-auto",
            isCrimson ? "animate-pulse" : "animate-bounce"
          )}
        />
        <div className="space-y-2">
          <h1 className={cn(
            "text-2xl font-bold font-pixelated",
            isCrimson 
              ? "bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent" 
              : "social-gradient bg-clip-text text-transparent"
          )}>
            SocialChat
          </h1>
          <div className="flex items-center justify-center gap-1">
            <div className={cn(
              "h-2 w-2 rounded-full animate-pulse delay-0",
              isCrimson ? "bg-red-500" : "bg-social-green"
            )}></div>
            <div className={cn(
              "h-2 w-2 rounded-full animate-pulse delay-150",
              isCrimson ? "bg-red-500" : "bg-social-green"
            )}></div>
            <div className={cn(
              "h-2 w-2 rounded-full animate-pulse delay-300",
              isCrimson ? "bg-red-500" : "bg-social-green"
            )}></div>
          </div>
        </div>
      </div>
    </div>
  );
}