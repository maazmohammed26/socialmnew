import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  cacheItems, 
  getCachedItemsByIndex, 
  clearCache,
  STORES 
} from '@/lib/cache-utils';

export function useVortexGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  // Get current user
  const getCurrentUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }, []);

  // Fetch groups from database with IndexedDB caching
  const fetchGroups = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // First try to get from cache
      const cachedGroups = await getCachedItemsByIndex(STORES.GROUPS, 'created_by', userId);
      
      if (cachedGroups && cachedGroups.length > 0) {
        console.log('Using cached groups data');
        setGroups(cachedGroups);
        setLoading(false);
      }

      // Always fetch fresh data from database (for real-time updates)
      console.log('Fetching groups from database');
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
        .eq('created_by', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Update state with fresh data
      setGroups(data || []);
      
      // Update cache with fresh data
      if (data && data.length > 0) {
        await cacheItems(STORES.GROUPS, data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load groups. Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initialize data
  useEffect(() => {
    const initData = async () => {
      const user = await getCurrentUser();
      if (user) {
        fetchGroups(user.id);
      } else {
        setLoading(false);
      }
    };

    initData();
  }, [getCurrentUser, fetchGroups]);

  // Set up real-time subscription for groups
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('groups-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'groups',
          filter: `created_by=eq.${currentUser.id}`
        }, 
        (payload) => {
          console.log('Group change detected:', payload);
          fetchGroups(currentUser.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchGroups]);

  // Clear cache
  const clearGroupsCache = useCallback(async () => {
    await clearCache(STORES.GROUPS);
    fetchGroups(currentUser?.id);
  }, [currentUser, fetchGroups]);

  return {
    groups,
    loading,
    currentUser,
    fetchGroups,
    clearGroupsCache
  };
}