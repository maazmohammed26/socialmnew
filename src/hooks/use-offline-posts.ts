import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineMode } from './use-offline-mode';

export interface OfflinePost {
  id: string;
  content: string;
  image_url?: string;
  created_at: string;
  user_id: string;
  synced: boolean;
}

export function useOfflinePosts() {
  const [offlinePosts, setOfflinePosts] = useState<OfflinePost[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = useOfflineMode();

  // Load offline posts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('offline_posts');
    if (stored) {
      try {
        const posts = JSON.parse(stored);
        setOfflinePosts(posts);
      } catch (error) {
        console.error('Error loading offline posts:', error);
      }
    }
  }, []);

  // Save offline posts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('offline_posts', JSON.stringify(offlinePosts));
  }, [offlinePosts]);

  // Sync offline posts when coming back online
  useEffect(() => {
    if (isOnline && offlinePosts.some(post => !post.synced)) {
      syncOfflinePosts();
    }
  }, [isOnline, offlinePosts]);

  const addOfflinePost = (content: string, imageUrl?: string) => {
    const newPost: OfflinePost = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      user_id: '', // Will be set when syncing
      synced: false
    };

    setOfflinePosts(prev => [newPost, ...prev]);
    return newPost;
  };

  const syncOfflinePosts = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    const unsyncedPosts = offlinePosts.filter(post => !post.synced);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user for syncing posts');
        setIsSyncing(false);
        return;
      }

      for (const post of unsyncedPosts) {
        try {
          const { error } = await supabase
            .from('posts')
            .insert({
              content: post.content,
              image_url: post.image_url,
              user_id: user.id,
              created_at: post.created_at
            });

          if (!error) {
            // Mark as synced
            setOfflinePosts(prev => 
              prev.map(p => 
                p.id === post.id 
                  ? { ...p, synced: true, user_id: user.id }
                  : p
              )
            );
          } else {
            console.error('Error syncing post:', error);
          }
        } catch (error) {
          console.error('Error syncing individual post:', error);
        }
      }
    } catch (error) {
      console.error('Error during sync process:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearSyncedPosts = () => {
    setOfflinePosts(prev => prev.filter(post => !post.synced));
  };

  const getPendingSyncCount = () => {
    return offlinePosts.filter(post => !post.synced).length;
  };

  return {
    offlinePosts,
    addOfflinePost,
    syncOfflinePosts,
    clearSyncedPosts,
    isSyncing,
    getPendingSyncCount
  };
}