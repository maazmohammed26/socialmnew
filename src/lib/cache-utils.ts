import { openDB, IDBPDatabase } from 'idb';

// Database name and version
const DB_NAME = 'socialchat-cache';
const DB_VERSION = 1;

// Store names
export const STORES = {
  POSTS: 'posts',
  PROFILES: 'profiles',
  MESSAGES: 'messages',
  GROUPS: 'groups',
  STORIES: 'stories',
  NOTIFICATIONS: 'notifications'
};

// Cache expiration times (in milliseconds)
export const CACHE_EXPIRATION = {
  POSTS: 5 * 60 * 1000, // 5 minutes
  PROFILES: 30 * 60 * 1000, // 30 minutes
  MESSAGES: 1 * 60 * 1000, // 1 minute
  GROUPS: 5 * 60 * 1000, // 5 minutes
  STORIES: 2 * 60 * 1000, // 2 minutes
  NOTIFICATIONS: 1 * 60 * 1000 // 1 minute
};

// Initialize IndexedDB
export const initDB = async (): Promise<IDBPDatabase> => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.POSTS)) {
        db.createObjectStore(STORES.POSTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PROFILES)) {
        db.createObjectStore(STORES.PROFILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.GROUPS)) {
        const groupsStore = db.createObjectStore(STORES.GROUPS, { keyPath: 'id' });
        groupsStore.createIndex('created_by', 'created_by', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.STORIES)) {
        db.createObjectStore(STORES.STORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notificationsStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
        notificationsStore.createIndex('user_id', 'user_id', { unique: false });
      }
    },
  });
};

// Cache a single item
export const cacheItem = async (storeName: string, item: any): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    // Add timestamp for expiration
    const itemWithTimestamp = {
      ...item,
      _timestamp: Date.now()
    };
    
    await store.put(itemWithTimestamp);
    await tx.done;
  } catch (error) {
    console.error(`Error caching item in ${storeName}:`, error);
  }
};

// Cache multiple items
export const cacheItems = async (storeName: string, items: any[]): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    // Add timestamp for expiration
    const timestamp = Date.now();
    const itemsWithTimestamp = items.map(item => ({
      ...item,
      _timestamp: timestamp
    }));
    
    await Promise.all(itemsWithTimestamp.map(item => store.put(item)));
    await tx.done;
  } catch (error) {
    console.error(`Error caching items in ${storeName}:`, error);
  }
};

// Get a single item from cache
export const getCachedItem = async (storeName: string, id: string): Promise<any | null> => {
  try {
    const db = await initDB();
    const item = await db.get(storeName, id);
    
    if (!item) return null;
    
    // Check if item is expired
    const expirationTime = CACHE_EXPIRATION[storeName.toUpperCase()];
    if (Date.now() - item._timestamp > expirationTime) {
      // Item is expired, delete it
      await db.delete(storeName, id);
      return null;
    }
    
    // Remove timestamp before returning
    const { _timestamp, ...itemWithoutTimestamp } = item;
    return itemWithoutTimestamp;
  } catch (error) {
    console.error(`Error getting cached item from ${storeName}:`, error);
    return null;
  }
};

// Get all items from a store
export const getCachedItems = async (storeName: string): Promise<any[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const items = await store.getAll();
    
    // Filter out expired items
    const expirationTime = CACHE_EXPIRATION[storeName.toUpperCase()];
    const now = Date.now();
    const validItems = items.filter(item => now - item._timestamp <= expirationTime);
    
    // Remove timestamps before returning
    return validItems.map(item => {
      const { _timestamp, ...itemWithoutTimestamp } = item;
      return itemWithoutTimestamp;
    });
  } catch (error) {
    console.error(`Error getting cached items from ${storeName}:`, error);
    return [];
  }
};

// Get items by index
export const getCachedItemsByIndex = async (storeName: string, indexName: string, value: any): Promise<any[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const items = await index.getAll(value);
    
    // Filter out expired items
    const expirationTime = CACHE_EXPIRATION[storeName.toUpperCase()];
    const now = Date.now();
    const validItems = items.filter(item => now - item._timestamp <= expirationTime);
    
    // Remove timestamps before returning
    return validItems.map(item => {
      const { _timestamp, ...itemWithoutTimestamp } = item;
      return itemWithoutTimestamp;
    });
  } catch (error) {
    console.error(`Error getting cached items by index from ${storeName}:`, error);
    return [];
  }
};

// Clear a specific store
export const clearCache = async (storeName: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.clear();
    await tx.done;
  } catch (error) {
    console.error(`Error clearing cache for ${storeName}:`, error);
  }
};

// Clear all caches
export const clearAllCaches = async (): Promise<void> => {
  try {
    const db = await initDB();
    const storeNames = Object.values(STORES);
    
    for (const storeName of storeNames) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      await store.clear();
      await tx.done;
    }
  } catch (error) {
    console.error('Error clearing all caches:', error);
  }
};

// Clear expired items from all stores
export const clearExpiredItems = async (): Promise<void> => {
  try {
    const db = await initDB();
    const storeNames = Object.values(STORES);
    const now = Date.now();
    
    for (const storeName of storeNames) {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const items = await store.getAll();
      const expirationTime = CACHE_EXPIRATION[storeName.toUpperCase()];
      
      // Delete expired items
      const expiredItems = items.filter(item => now - item._timestamp > expirationTime);
      await Promise.all(expiredItems.map(item => store.delete(item.id)));
      
      await tx.done;
    }
  } catch (error) {
    console.error('Error clearing expired items:', error);
  }
};