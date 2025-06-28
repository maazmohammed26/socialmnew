import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useOptimizedQueries() {
  // Optimized feed fetching with reduced database load
  const fetchOptimizedFeed = useCallback(async (limit = 20, offset = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // First check local cache
      const cacheKey = `feed_cache_${user.id}_${limit}_${offset}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      // Use cache if it's less than 5 minutes old
      if (cachedData && cacheTime) {
        const now = Date.now();
        const cacheAge = now - parseInt(cacheTime);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          return JSON.parse(cachedData);
        }
      }

      // If no valid cache, fetch from database
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          updated_at,
          user_id,
          profiles:user_id (
            name,
            username,
            avatar
          ),
          likes:likes(id, user_id),
          comments:comments(
            id,
            content,
            created_at,
            user_id,
            profiles:user_id(name, avatar)
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Process data to add counts
      const processedData = data.map(post => ({
        ...post,
        _count: {
          likes: post.likes?.length || 0,
          comments: post.comments?.length || 0
        }
      }));

      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(processedData));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      return processedData;
    } catch (error) {
      console.error('Error fetching optimized feed:', error);
      return [];
    }
  }, []);

  // Optimized like toggle with batch operations
  const toggleLikeOptimized = useCallback(async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if post is already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      let result;
      
      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) throw error;
        result = { liked: false };
      } else {
        // Like
        const { data, error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        result = { liked: true, data };
      }

      // Invalidate feed cache
      const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('feed_cache_'));
      cacheKeys.forEach(key => localStorage.removeItem(key));

      return result;
    } catch (error) {
      console.error('Error toggling like:', error);
      return null;
    }
  }, []);

  // Optimized friend suggestions
  const getFriendSuggestions = useCallback(async (limit = 10) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check cache first
      const cacheKey = `friend_suggestions_${user.id}_${limit}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      // Use cache if it's less than 30 minutes old
      if (cachedData && cacheTime) {
        const now = Date.now();
        const cacheAge = now - parseInt(cacheTime);
        if (cacheAge < 30 * 60 * 1000) { // 30 minutes
          return JSON.parse(cachedData);
        }
      }

      // If no valid cache, fetch from database
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar')
        .neq('id', user.id)
        .limit(limit);

      if (error) throw error;

      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      return data || [];
    } catch (error) {
      console.error('Error fetching friend suggestions:', error);
      return [];
    }
  }, []);

  // Batch notification creation
  const createNotificationsBatch = useCallback(async (notifications: any[]) => {
    try {
      // Insert all notifications in one batch
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating notifications batch:', error);
      return false;
    }
  }, []);

  // Optimized story fetching with view tracking
  const fetchStoriesOptimized = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check cache first
      const cacheKey = `stories_cache_${user.id}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      // Use cache if it's less than 5 minutes old
      if (cachedData && cacheTime) {
        const now = Date.now();
        const cacheAge = now - parseInt(cacheTime);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          return JSON.parse(cachedData);
        }
      }

      // If no valid cache, fetch from database
      const { data, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          image_url,
          photo_urls,
          created_at,
          expires_at,
          views_count,
          profiles:user_id (
            name,
            username,
            avatar
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get viewed stories
      const { data: viewedStories } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', user.id);

      // Mark stories as viewed
      const viewedStoryIds = new Set(viewedStories?.map(v => v.story_id) || []);
      const processedData = data?.map(story => ({
        ...story,
        viewed_by_current_user: viewedStoryIds.has(story.id)
      })) || [];

      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(processedData));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      return processedData;
    } catch (error) {
      console.error('Error fetching optimized stories:', error);
      return [];
    }
  }, []);

  // Optimized message fetching with pagination
  const fetchMessagesOptimized = useCallback(async (friendId: string, limit = 50, offset = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check cache first
      const cacheKey = `messages_cache_${user.id}_${friendId}_${limit}_${offset}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      // Use cache if it's less than 1 minute old
      if (cachedData && cacheTime) {
        const now = Date.now();
        const cacheAge = now - parseInt(cacheTime);
        if (cacheAge < 60 * 1000) { // 1 minute
          return JSON.parse(cachedData);
        }
      }

      // If no valid cache, fetch from database
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          read,
          profiles!messages_sender_id_fkey(name, avatar)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      const messages = (data || []).reverse(); // Reverse to show oldest first

      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(messages));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      return messages;
    } catch (error) {
      console.error('Error fetching optimized messages:', error);
      return [];
    }
  }, []);

  // Optimized group fetching
  const fetchGroupsOptimized = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Check cache first
      const cacheKey = `groups_cache_${user.id}`;
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      // Use cache if it's less than 5 minutes old
      if (cachedData && cacheTime) {
        const now = Date.now();
        const cacheAge = now - parseInt(cacheTime);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          return JSON.parse(cachedData);
        }
      }

      // If no valid cache, fetch from database
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          avatar,
          is_private,
          created_by,
          created_at,
          updated_at,
          member_count
        `)
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Cache the results
      localStorage.setItem(cacheKey, JSON.stringify(data || []));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());

      return data || [];
    } catch (error) {
      console.error('Error fetching optimized groups:', error);
      return [];
    }
  }, []);

  // Clear all caches
  const clearAllCaches = useCallback(() => {
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.includes('_cache_') || key.includes('_time')
    );
    
    cacheKeys.forEach(key => localStorage.removeItem(key));
  }, []);

  return {
    fetchOptimizedFeed,
    toggleLikeOptimized,
    getFriendSuggestions,
    createNotificationsBatch,
    fetchStoriesOptimized,
    fetchMessagesOptimized,
    fetchGroupsOptimized,
    clearAllCaches
  };
}