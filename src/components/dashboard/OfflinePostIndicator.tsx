import React from 'react';
import { Wifi, WifiOff, Upload, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOfflineMode } from '@/hooks/use-offline-mode';
import { useOfflinePosts } from '@/hooks/use-offline-posts';

export function OfflinePostIndicator() {
  const { isOnline } = useOfflineMode();
  const { getPendingSyncCount, syncOfflinePosts, isSyncing } = useOfflinePosts();
  
  const pendingCount = getPendingSyncCount();

  if (isOnline && pendingCount === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <Wifi className="h-4 w-4" />
        <span>Online</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-orange-600 text-sm">
        <WifiOff className="h-4 w-4" />
        <span>Offline Mode</span>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {pendingCount} pending
          </Badge>
        )}
      </div>
    );
  }

  if (isOnline && pendingCount > 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <Clock className="h-4 w-4" />
          <span>{pendingCount} posts to sync</span>
        </div>
        <Button
          onClick={syncOfflinePosts}
          disabled={isSyncing}
          size="sm"
          variant="outline"
          className="h-8"
        >
          {isSyncing ? (
            <>
              <Upload className="h-3 w-3 mr-1 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <Upload className="h-3 w-3 mr-1" />
              Sync Now
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}