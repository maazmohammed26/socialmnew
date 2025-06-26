import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Palette, Sparkles, X } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

interface ThemeHighlightProps {
  onDismiss?: () => void;
}

export function ThemeHighlight({ onDismiss }: ThemeHighlightProps) {
  const { theme, setTheme, confirmThemeChange } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  
  // Check if the highlight has been shown before
  useEffect(() => {
    const hasShown = localStorage.getItem('theme-highlight-shown');
    if (hasShown) {
      setDismissed(true);
    }
  }, []);
  
  // Don't show if already using modern theme or dismissed
  if (theme === 'modern' || dismissed) {
    return null;
  }
  
  const handleTryModernTheme = async () => {
    const confirmed = await confirmThemeChange('modern', 'theme');
    if (confirmed) {
      await setTheme('modern');
      handleDismiss();
    }
  };
  
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('theme-highlight-shown', 'true');
    if (onDismiss) onDismiss();
  };

  return (
    <Card className="relative overflow-hidden border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-teal-50 p-4 shadow-md animate-fade-in">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6 rounded-full"
        onClick={handleDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
      
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0 rounded-full bg-blue-100 p-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="mb-1 font-pixelated text-sm font-medium text-blue-800">
            ✨ Try Our New Modern Theme!
          </h3>
          
          <p className="mb-3 font-pixelated text-xs text-blue-700">
            Experience a fresh, clean look inspired by popular mobile chat apps with smooth animations and modern styling.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleTryModernTheme}
              size="sm"
              className="bg-blue-600 font-pixelated text-xs text-white hover:bg-blue-700"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Try Modern Theme
            </Button>
            
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-blue-300 font-pixelated text-xs text-blue-700 hover:bg-blue-50"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}