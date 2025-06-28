import { openDB, IDBPDatabase } from 'idb';

// Database name and version
const DB_NAME = 'socialchat-offline';
const DB_VERSION = 1;

// Store names
export const OFFLINE_STORES = {
  MESSAGES: 'offline-messages',
  POSTS: 'offline-posts',
  PROFILE: 'offline-profile',
  FRIENDS: 'offline-friends',
  SETTINGS: 'offline-settings'
};

// Initialize IndexedDB
export const initOfflineDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(OFFLINE_STORES.MESSAGES)) {
        const messagesStore = db.createObjectStore(OFFLINE_STORES.MESSAGES, { keyPath: 'id' });
        messagesStore.createIndex('conversation', 'conversationId', { unique: false });
        messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        messagesStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(OFFLINE_STORES.POSTS)) {
        const postsStore = db.createObjectStore(OFFLINE_STORES.POSTS, { keyPath: 'id' });
        postsStore.createIndex('timestamp', 'timestamp', { unique: false });
        postsStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(OFFLINE_STORES.PROFILE)) {
        db.createObjectStore(OFFLINE_STORES.PROFILE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(OFFLINE_STORES.FRIENDS)) {
        const friendsStore = db.createObjectStore(OFFLINE_STORES.FRIENDS, { keyPath: 'id' });
        friendsStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(OFFLINE_STORES.SETTINGS)) {
        db.createObjectStore(OFFLINE_STORES.SETTINGS, { keyPath: 'key' });
      }
    },
  });
};

// Save message for offline use
export const saveOfflineMessage = async (message: any): Promise<void> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.MESSAGES, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORES.MESSAGES);
    
    // Add status field to track sync state
    const messageWithStatus = {
      ...message,
      status: 'pending', // 'pending', 'synced', 'failed'
      timestamp: message.timestamp || Date.now()
    };
    
    await store.put(messageWithStatus);
    await tx.done;
  } catch (error) {
    console.error('Error saving offline message:', error);
  }
};

// Get all pending messages
export const getPendingMessages = async (): Promise<any[]> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.MESSAGES, 'readonly');
    const store = tx.objectStore(OFFLINE_STORES.MESSAGES);
    const index = store.index('status');
    
    return await index.getAll('pending');
  } catch (error) {
    console.error('Error getting pending messages:', error);
    return [];
  }
};

// Update message status
export const updateMessageStatus = async (id: string, status: 'pending' | 'synced' | 'failed'): Promise<void> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.MESSAGES, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORES.MESSAGES);
    
    const message = await store.get(id);
    if (message) {
      message.status = status;
      await store.put(message);
    }
    
    await tx.done;
  } catch (error) {
    console.error('Error updating message status:', error);
  }
};

// Get messages for a conversation
export const getOfflineMessages = async (conversationId: string): Promise<any[]> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.MESSAGES, 'readonly');
    const store = tx.objectStore(OFFLINE_STORES.MESSAGES);
    const index = store.index('conversation');
    
    return await index.getAll(conversationId);
  } catch (error) {
    console.error('Error getting offline messages:', error);
    return [];
  }
};

// Save user profile for offline use
export const saveOfflineProfile = async (profile: any): Promise<void> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.PROFILE, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORES.PROFILE);
    
    await store.put(profile);
    await tx.done;
  } catch (error) {
    console.error('Error saving offline profile:', error);
  }
};

// Get user profile
export const getOfflineProfile = async (userId: string): Promise<any | null> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.PROFILE, 'readonly');
    const store = tx.objectStore(OFFLINE_STORES.PROFILE);
    
    return await store.get(userId);
  } catch (error) {
    console.error('Error getting offline profile:', error);
    return null;
  }
};

// Save friends list for offline use
export const saveOfflineFriends = async (friends: any[]): Promise<void> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.FRIENDS, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORES.FRIENDS);
    
    // Clear existing friends
    await store.clear();
    
    // Add all friends
    for (const friend of friends) {
      await store.add(friend);
    }
    
    await tx.done;
  } catch (error) {
    console.error('Error saving offline friends:', error);
  }
};

// Get all friends
export const getOfflineFriends = async (): Promise<any[]> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.FRIENDS, 'readonly');
    const store = tx.objectStore(OFFLINE_STORES.FRIENDS);
    
    return await store.getAll();
  } catch (error) {
    console.error('Error getting offline friends:', error);
    return [];
  }
};

// Save app settings
export const saveOfflineSetting = async (key: string, value: any): Promise<void> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.SETTINGS, 'readwrite');
    const store = tx.objectStore(OFFLINE_STORES.SETTINGS);
    
    await store.put({ key, value });
    await tx.done;
  } catch (error) {
    console.error('Error saving offline setting:', error);
  }
};

// Get app setting
export const getOfflineSetting = async (key: string): Promise<any | null> => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction(OFFLINE_STORES.SETTINGS, 'readonly');
    const store = tx.objectStore(OFFLINE_STORES.SETTINGS);
    
    const setting = await store.get(key);
    return setting ? setting.value : null;
  } catch (error) {
    console.error('Error getting offline setting:', error);
    return null;
  }
};

// Check if app is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Sync pending messages when back online
export const syncPendingMessages = async (syncFunction: (message: any) => Promise<any>): Promise<void> => {
  try {
    if (!isOnline()) return;
    
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
      try {
        await syncFunction(message);
        await updateMessageStatus(message.id, 'synced');
      } catch (error) {
        console.error('Error syncing message:', error);
        await updateMessageStatus(message.id, 'failed');
      }
    }
  } catch (error) {
    console.error('Error syncing pending messages:', error);
  }
};

// Listen for online/offline events
export const setupOfflineListeners = (
  onlineCallback: () => void,
  offlineCallback: () => void
): () => void => {
  const handleOnline = () => {
    console.log('App is online');
    onlineCallback();
  };
  
  const handleOffline = () => {
    console.log('App is offline');
    offlineCallback();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};