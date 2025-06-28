import { useState, useEffect, useCallback } from 'react';
import { 
  isOnline, 
  setupOfflineListeners, 
  saveOfflineSetting, 
  getOfflineSetting,
  saveOfflineMessage,
  getPendingMessages,
  syncPendingMessages
} from '@/lib/offline-storage';
import { useToast } from '@/hooks/use-toast';

export function useOfflineMode() {
  const [online, setOnline] = useState<boolean>(isOnline());
  const [offlineEnabled, setOfflineEnabled] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const { toast } = useToast();

  // Load offline mode setting
  useEffect(() => {
    const loadOfflineSetting = async () => {
      const enabled = await getOfflineSetting('offlineEnabled');
      setOfflineEnabled(enabled === true);
    };
    
    loadOfflineSetting();
  }, []);

  // Set up online/offline listeners
  useEffect(() => {
    const cleanup = setupOfflineListeners(
      // Online callback
      async () => {
        setOnline(true);
        
        if (offlineEnabled) {
          toast({
            title: 'You are back online',
            description: 'Syncing your offline data...',
            duration: 3000,
          });
          
          // Sync pending messages
          await syncPendingData();
        }
      },
      // Offline callback
      () => {
        setOnline(false);
        
        if (offlineEnabled) {
          toast({
            title: 'You are offline',
            description: 'Your changes will be saved locally and synced when you reconnect.',
            duration: 5000,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'You are offline',
            description: 'Some features may not work until you reconnect.',
            duration: 5000,
          });
        }
      }
    );
    
    return cleanup;
  }, [offlineEnabled, toast]);

  // Check pending messages count
  useEffect(() => {
    const checkPendingCount = async () => {
      if (offlineEnabled) {
        const pendingMessages = await getPendingMessages();
        setPendingCount(pendingMessages.length);
      }
    };
    
    checkPendingCount();
    
    // Set up interval to check pending count
    const interval = setInterval(checkPendingCount, 30000);
    
    return () => clearInterval(interval);
  }, [offlineEnabled]);

  // Toggle offline mode
  const toggleOfflineMode = useCallback(async (enabled: boolean) => {
    setOfflineEnabled(enabled);
    await saveOfflineSetting('offlineEnabled', enabled);
    
    toast({
      title: enabled ? 'Offline mode enabled' : 'Offline mode disabled',
      description: enabled 
        ? 'Your data will be saved locally when offline and synced when you reconnect.' 
        : 'Your data will not be saved when offline.',
      duration: 3000,
    });
  }, [toast]);

  // Save message for offline use
  const saveMessageOffline = useCallback(async (message: any) => {
    if (!offlineEnabled) return;
    
    await saveOfflineMessage(message);
    setPendingCount(prev => prev + 1);
  }, [offlineEnabled]);

  // Sync pending data
  const syncPendingData = useCallback(async () => {
    if (!online || !offlineEnabled || syncing) return;
    
    try {
      setSyncing(true);
      
      // This is a placeholder - in a real app, you would pass a function
      // that knows how to sync messages with your backend
      await syncPendingMessages(async (message) => {
        console.log('Syncing message:', message);
        // In a real app, this would call your API to send the message
        return message;
      });
      
      // Update pending count
      const pendingMessages = await getPendingMessages();
      setPendingCount(pendingMessages.length);
      
      if (pendingCount > 0 && pendingMessages.length === 0) {
        toast({
          title: 'Sync complete',
          description: 'All your offline data has been synced.',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error syncing pending data:', error);
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: 'Failed to sync some offline data. Will try again later.',
        duration: 5000,
      });
    } finally {
      setSyncing(false);
    }
  }, [online, offlineEnabled, syncing, pendingCount, toast]);

  return {
    online,
    offlineEnabled,
    syncing,
    pendingCount,
    toggleOfflineMode,
    saveMessageOffline,
    syncPendingData
  };
}