import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Flame, X } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { GradientText, GlowEffect } from '@/components/ui/crimson-effects';
import { CrimsonButton } from '@/components/ui/crimson-button';

export function ThemePrompt() {
  // Always keep this component hidden
  const [isVisible, setIsVisible] = useState(false);
  const { theme, setTheme, hasShownThemePrompt, setHasShownThemePrompt } = useTheme();

  useEffect(() => {
    // Set that we've shown the prompt to prevent it from appearing
    setHasShownThemePrompt(true);
  }, [setHasShownThemePrompt]);

  // This component will never be visible
  return null;
}