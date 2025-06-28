import React from 'react';
import { WifiOff, Wifi, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useOfflineMode } from '@/hooks/use-offline-mode';
import { Button } from '@/components/ui/button';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { online, offlineEnabled, pendingCount, toggleOfflineMode, syncPendingData } = useOfflineMode();

  if (online && !pendingCount) {
    return null;
  }

  return (
    <div className={`fixed bottom-16 right-4 z-50 ${className}`}>
      <div className="bg-background border rounded-lg shadow-lg p-3 max-w-xs animate-in slide-in-from-bottom-5">
        <div className="flex items-start gap-3">
          {online ? (
            <Wifi className="h-5 w-5 text-social-green mt-0.5" />
          ) : (
            <WifiOff className="h-5 w-5 text-amber-500 mt-0.5" />
          )}
          
          <div className="flex-1">
            <h3 className="font-pixelated text-sm font-medium mb-1">
              {online ? 'Online' : 'Offline Mode'}
            </h3>
            
            <p className="font-pixelated text-xs text-muted-foreground mb-2">
              {online && pendingCount > 0 
                ? `You have ${pendingCount} pending message${pendingCount > 1 ? 's' : ''} to sync` 
                : 'Enable offline mode to use SocialChat while offline'}
            </p>
            
            <div className="flex items-center justify-between space-x-2 mb-2">
              <Label htmlFor="offline-mode" className="font-pixelated text-xs cursor-pointer">
                Offline Mode
              </Label>
              <Switch
                id="offline-mode"
                checked={offlineEnabled}
                onCheckedChange={toggleOfflineMode}
              />
            </div>
            
            {online && pendingCount > 0 && (
              <Button 
                onClick={syncPendingData}
                size="sm" 
                className="w-full font-pixelated text-xs bg-social-green hover:bg-social-light-green text-white"
              >
                <Save className="h-3 w-3 mr-1" />
                Sync {pendingCount} Pending Message{pendingCount > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}