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
  NOTIFICATIONS: 'notifications',
  IMAGES: 'images' // New store for image caching
};

// Cache expiration times (in milliseconds)
export const CACHE_EXPIRATION = {
  POSTS: 5 * 60 * 1000, // 5 minutes
  PROFILES: 30 * 60 * 1000, // 30 minutes
  MESSAGES: 1 * 60 * 1000, // 1 minute
  GROUPS: 5 * 60 * 1000, // 5 minutes
  STORIES: 2 * 60 * 1000, // 2 minutes
  NOTIFICATIONS: 1 * 60 * 1000, // 1 minute
  IMAGES: 24 * 60 * 60 * 1000 // 24 hours for images
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
      if (!db.objectStoreNames.contains(STORES.IMAGES)) {
        const imagesStore = db.createObjectStore(STORES.IMAGES, { keyPath: 'url' });
        imagesStore.createIndex('timestamp', '_timestamp', { unique: false });
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
      await Promise.all(expiredItems.map(item => store.delete(item.id || item.url)));
      
      await tx.done;
    }
  } catch (error) {
    console.error('Error clearing expired items:', error);
  }
};

// Cache an image
export const cacheImage = async (url: string, blob: Blob): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORES.IMAGES, 'readwrite');
    const store = tx.objectStore(STORES.IMAGES);
    
    await store.put({
      url,
      blob,
      _timestamp: Date.now()
    });
    
    await tx.done;
  } catch (error) {
    console.error('Error caching image:', error);
  }
};

// Get a cached image
export const getCachedImage = async (url: string): Promise<Blob | null> => {
  try {
    const db = await initDB();
    const item = await db.get(STORES.IMAGES, url);
    
    if (!item) return null;
    
    // Check if item is expired
    if (Date.now() - item._timestamp > CACHE_EXPIRATION.IMAGES) {
      // Item is expired, delete it
      await db.delete(STORES.IMAGES, url);
      return null;
    }
    
    return item.blob;
  } catch (error) {
    console.error('Error getting cached image:', error);
    return null;
  }
};

// Preload and cache an image
export const preloadAndCacheImage = async (url: string): Promise<void> => {
  try {
    // Check if already cached
    const cachedImage = await getCachedImage(url);
    if (cachedImage) return;
    
    // Fetch the image
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Cache the image
    await cacheImage(url, blob);
  } catch (error) {
    console.error('Error preloading and caching image:', error);
  }
};

// Get image from cache or network with fallback
export const getImageWithCache = async (url: string): Promise<string> => {
  try {
    // Try to get from cache first
    const cachedImage = await getCachedImage(url);
    
    if (cachedImage) {
      // Create object URL from cached blob
      return URL.createObjectURL(cachedImage);
    }
    
    // If not in cache, fetch and cache
    const response = await fetch(url);
    const blob = await response.blob();
    await cacheImage(url, blob);
    
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error getting image with cache:', error);
    // Return original URL as fallback
    return url;
  }
};