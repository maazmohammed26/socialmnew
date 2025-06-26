import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'light' | 'dark' | 'win95' | 'modern' | 'crimson';
type ColorTheme = 'green' | 'blue' | 'red' | 'orange' | 'purple';

interface ThemeStore {
  theme: Theme;
  colorTheme: ColorTheme;
  setTheme: (theme: Theme) => Promise<void>;
  setColorTheme: (colorTheme: ColorTheme) => Promise<void>;
  confirmThemeChange: (theme: Theme | ColorTheme, type: 'theme' | 'color') => Promise<boolean>;
  hasShownThemePrompt: boolean;
  setHasShownThemePrompt: (value: boolean) => void;
}

// Create a custom storage object that syncs with both localStorage and database
const customStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // First try to get from localStorage
    const localTheme = localStorage.getItem(name);
    if (localTheme) return localTheme;

    // If not in localStorage, try to get from database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if the columns exist first
        const { data: columnsExist, error: columnsError } = await supabase.rpc('check_theme_columns_exist');
        
        if (columnsError || !columnsExist) {
          console.log('Theme columns do not exist yet, using defaults');
          return JSON.stringify({ state: { theme: 'light', colorTheme: 'green', hasShownThemePrompt: false } });
        }
        
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_preference, color_theme')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching theme from database:', error);
          return JSON.stringify({ state: { theme: 'light', colorTheme: 'green', hasShownThemePrompt: false } });
        }

        if (data?.theme_preference) {
          // Save to localStorage for faster access next time
          localStorage.setItem(name, JSON.stringify({ 
            state: { 
              theme: data.theme_preference,
              colorTheme: data.color_theme || 'green',
              hasShownThemePrompt: false
            } 
          }));
          return JSON.stringify({ 
            state: { 
              theme: data.theme_preference,
              colorTheme: data.color_theme || 'green',
              hasShownThemePrompt: false
            } 
          });
        }
      }
    } catch (error) {
      console.error('Error fetching theme from database:', error);
    }

    // Default to light theme and green color theme if nothing is found
    return JSON.stringify({ state: { theme: 'light', colorTheme: 'green', hasShownThemePrompt: false } });
  },

  setItem: async (name: string, value: string): Promise<void> => {
    // Save to localStorage
    localStorage.setItem(name, value);

    // Save to database if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { theme, colorTheme } = JSON.parse(value).state;
        
        // Check if the columns exist first
        const { data: columnsExist, error: columnsError } = await supabase.rpc('check_theme_columns_exist');
        
        if (columnsError || !columnsExist) {
          console.log('Theme columns do not exist yet, skipping database update');
          return;
        }
        
        await supabase
          .from('profiles')
          .update({ 
            theme_preference: theme,
            color_theme: colorTheme
          })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error saving theme to database:', error);
    }
  },

  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      colorTheme: 'green',
      hasShownThemePrompt: false,
      setTheme: async (theme) => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'win95', 'modern', 'crimson');
        root.classList.add(theme);
        set({ theme });
      },
      setColorTheme: async (colorTheme) => {
        const root = window.document.documentElement;
        root.classList.remove('theme-green', 'theme-blue', 'theme-red', 'theme-orange', 'theme-purple');
        if (colorTheme !== 'green') {
          root.classList.add(`theme-${colorTheme}`);
        }
        set({ colorTheme });
      },
      setHasShownThemePrompt: (value) => {
        set({ hasShownThemePrompt: value });
      },
      confirmThemeChange: async (theme, type) => {
        return new Promise((resolve) => {
          const dialog = document.createElement('div');
          
          // Special confirmation for modern theme
          const isModernTheme = theme === 'modern';
          const isCrimsonTheme = theme === 'crimson';
          
          let confirmationText = '';
          let title = '';
          
          if (isModernTheme) {
            title = '🎨 Switch to Modern Theme';
            confirmationText = 'Are you sure you want to switch to the Modern theme? This will change the font across the entire application to a clean, modern typeface similar to popular social media apps.';
          } else if (isCrimsonTheme) {
            title = '🔥 Switch to Crimson Theme';
            confirmationText = 'Are you sure you want to switch to the Crimson theme? This will apply a sleek, dark red design with smooth animations across the entire application.';
          } else {
            title = `Change ${type === 'theme' ? 'Theme' : 'Color'}`;
            confirmationText = `Are you sure you want to change the ${type === 'theme' ? 'theme' : 'color theme'} to ${theme}? This will be saved as your preference.`;
          }
          
          dialog.innerHTML = `
            <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div class="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4 border">
                <h3 class="text-lg font-medium mb-4 font-pixelated ${isModernTheme ? 'text-blue-600' : isCrimsonTheme ? 'text-red-600' : ''}">
                  ${title}
                </h3>
                <p class="text-sm text-muted-foreground mb-6 font-pixelated leading-relaxed">
                  ${confirmationText}
                </p>
                ${isModernTheme ? `
                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p class="text-xs text-blue-800 font-pixelated">
                      <strong>✨ New Feature:</strong> The Modern theme uses a contemporary font that's easier to read and provides a fresh, clean look across all pages.
                    </p>
                  </div>
                ` : isCrimsonTheme ? `
                  <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p class="text-xs text-red-800 font-pixelated">
                      <strong>🔥 New Feature:</strong> The Crimson theme offers a bold, dark red design with smooth animations and enhanced visual effects.
                    </p>
                  </div>
                ` : ''}
                <div class="flex justify-end gap-3">
                  <button
                    onClick="this.closest('.fixed').remove(); window.resolveTheme(false);"
                    class="bg-muted text-foreground px-3 py-1 rounded text-sm hover:bg-muted/80 transition-colors font-pixelated"
                  >
                    Cancel
                  </button>
                  <button
                    onClick="this.closest('.fixed').remove(); window.resolveTheme(true);"
                    class="${isModernTheme ? 'bg-blue-600 hover:bg-blue-700' : isCrimsonTheme ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'} text-white px-3 py-1 rounded text-sm transition-colors font-pixelated"
                  >
                    ${isModernTheme ? 'Switch to Modern' : isCrimsonTheme ? 'Switch to Crimson' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          `;
          
          document.body.appendChild(dialog);
          
          (window as any).resolveTheme = (confirmed: boolean) => {
            delete (window as any).resolveTheme;
            resolve(confirmed);
          };
        });
      }
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({ 
        theme: state.theme, 
        colorTheme: state.colorTheme,
        hasShownThemePrompt: state.hasShownThemePrompt
      }),
    }
  )
);