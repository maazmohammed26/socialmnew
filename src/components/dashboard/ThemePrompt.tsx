import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Flame, X } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { GradientText, GlowEffect } from '@/components/ui/crimson-effects';
import { CrimsonButton } from '@/components/ui/crimson-button';

export function ThemePrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const { theme, setTheme, hasShownThemePrompt, setHasShownThemePrompt } = useTheme();

  useEffect(() => {
    // Only show the prompt if it hasn't been shown before and user is not already using modern or crimson theme
    if (!hasShownThemePrompt && theme !== 'modern' && theme !== 'crimson') {
      // Show the prompt after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [hasShownThemePrompt, theme]);

  const handleTryTheme = async (newTheme: 'modern' | 'crimson') => {
    await setTheme(newTheme);
    setIsVisible(false);
    setHasShownThemePrompt(true);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setHasShownThemePrompt(true);
  };

  if (!isVisible) return null;

  // Check if we're in crimson theme
  const isCrimson = theme === 'crimson';

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pointer-events-none">
      <div className={`w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg border animate-fade-in pointer-events-auto ${isCrimson ? 'border-red-200 shadow-red-100/50' : ''}`}>
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-pixelated text-sm font-medium">
              {isCrimson ? (
                <GradientText gradientColors={['#dc2626', '#b91c1c']} animated>
                  Try Our New Themes
                </GradientText>
              ) : (
                "Try Our New Themes"
              )}
            </h3>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 -mt-1 -mr-1" 
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <p className="font-pixelated text-xs text-muted-foreground mb-4">
            Enhance your experience with our new modern themes featuring improved readability and smooth animations.
          </p>
          
          <div className="flex gap-2">
            {isCrimson ? (
              <>
                <CrimsonButton 
                  onClick={() => handleTryTheme('modern')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-pixelated text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Try Modern
                </CrimsonButton>
                <CrimsonButton 
                  onClick={() => handleTryTheme('crimson')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-pixelated text-xs"
                  gradient
                  glow
                >
                  <GlowEffect color="red" intensity="medium">
                    <Flame className="h-3 w-3 mr-1" />
                  </GlowEffect>
                  Try Crimson
                </CrimsonButton>
                <CrimsonButton 
                  variant="outline" 
                  onClick={handleDismiss}
                  className="font-pixelated text-xs"
                >
                  Later
                </CrimsonButton>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => handleTryTheme('modern')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-pixelated text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Try Modern
                </Button>
                <Button 
                  onClick={() => handleTryTheme('crimson')}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-pixelated text-xs"
                >
                  <Flame className="h-3 w-3 mr-1" />
                  Try Crimson
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDismiss}
                  className="font-pixelated text-xs"
                >
                  Later
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}