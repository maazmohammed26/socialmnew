import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap, Sparkles, Star, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Local storage keys
const CACHE_KEYS = {
  GROUPS: 'vortex_groups_cache',
  LAST_FETCH: 'vortex_last_fetch_time'
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

export function Vortex() {
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
        return user.id;
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }, []);

  // Check if cache is valid
  const isCacheValid = useCallback(() => {
    const lastFetchTime = localStorage.getItem(CACHE_KEYS.LAST_FETCH);
    if (!lastFetchTime) return false;
    
    const now = Date.now();
    const timeDiff = now - parseInt(lastFetchTime);
    return timeDiff < CACHE_EXPIRATION;
  }, []);

  // Get cached groups
  const getCachedGroups = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEYS.GROUPS);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error('Error parsing cached groups:', error);
      return null;
    }
  }, []);

  // Cache groups
  const cacheGroups = useCallback((groups) => {
    try {
      localStorage.setItem(CACHE_KEYS.GROUPS, JSON.stringify(groups));
      localStorage.setItem(CACHE_KEYS.LAST_FETCH, Date.now().toString());
    } catch (error) {
      console.error('Error caching groups:', error);
    }
  }, []);

  // Fetch groups from database
  const fetchGroups = useCallback(async (userId) => {
    try {
      // First check if we have a valid cache
      if (isCacheValid()) {
        const cachedGroups = getCachedGroups();
        if (cachedGroups && cachedGroups.length > 0) {
          console.log('Using cached groups data');
          setGroups(cachedGroups);
          setLoading(false);
          return;
        }
      }

      // If no valid cache, fetch from database
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

      // Cache the results
      cacheGroups(data || []);
      setGroups(data || []);
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
  }, [isCacheValid, getCachedGroups, cacheGroups, toast]);

  // Initialize data
  useEffect(() => {
    const initData = async () => {
      const userId = await getCurrentUser();
      if (userId) {
        fetchGroups(userId);
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

  // Memoized theme-specific styles
  const themeStyles = useMemo(() => {
    const root = document.documentElement;
    const isCrimson = root.classList.contains('crimson');
    
    return {
      gradientFrom: isCrimson ? 'from-red-800' : 'from-social-dark-green',
      gradientVia: isCrimson ? 'via-red-600' : 'via-social-green',
      gradientTo: isCrimson ? 'to-red-500' : 'to-social-light-green',
      accentColor: isCrimson ? 'text-red-500' : 'text-social-green',
      accentBg: isCrimson ? 'bg-red-50' : 'bg-social-green/10',
      accentBorder: isCrimson ? 'border-red-200/50' : 'border-social-green/30',
      cardHoverShadow: isCrimson ? 'hover:shadow-red-100/20' : 'hover:shadow-lg',
      iconBg1: isCrimson ? 'bg-red-50' : 'bg-social-green/10',
      iconBg2: isCrimson ? 'bg-red-50' : 'bg-social-purple/10',
      iconColor1: isCrimson ? 'text-red-500' : 'text-social-green',
      iconColor2: isCrimson ? 'text-red-500' : 'text-social-purple'
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 animate-fade-in">
        {/* Coming Soon Banner */}
        <Card className="mb-6 overflow-hidden border-0 shadow-xl crimson:shadow-red-200/30">
          <div className={`bg-gradient-to-r ${themeStyles.gradientFrom} ${themeStyles.gradientVia} ${themeStyles.gradientTo} p-8 text-white`}>
            <div className="flex flex-col items-center text-center">
              <div className="bg-white/20 p-4 rounded-full mb-4 animate-pulse">
                <Zap className="h-12 w-12" />
              </div>
              <h1 className="text-2xl font-bold font-pixelated mb-3">Vortex Groups</h1>
              <p className="font-pixelated text-sm max-w-lg">
                Our advanced group chat system is coming soon! Create private groups, share media, and collaborate with friends in real-time.
              </p>
            </div>
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className={`hover:shadow-lg transition-all duration-300 hover-scale crimson:border-red-100 ${themeStyles.cardHoverShadow} h-full`}>
            <CardContent className="p-6 flex flex-col items-center text-center h-full">
              <div className={`w-16 h-16 rounded-full ${themeStyles.iconBg1} flex items-center justify-center mb-4`}>
                <MessageSquare className={`h-8 w-8 ${themeStyles.iconColor1}`} />
              </div>
              <h3 className="font-pixelated text-base font-medium mb-3">Group Messaging</h3>
              <p className="font-pixelated text-sm text-muted-foreground mb-4 flex-grow">
                Connect with multiple friends in organized group conversations. Share ideas, plan events, and stay connected with your social circles.
              </p>
              <div className={`w-full h-1 bg-gradient-to-r ${themeStyles.gradientFrom}/20 ${themeStyles.gradientTo}/20 rounded-full`}></div>
            </CardContent>
          </Card>

          <Card className={`hover:shadow-lg transition-all duration-300 hover-scale crimson:border-red-100 ${themeStyles.cardHoverShadow} h-full`}>
            <CardContent className="p-6 flex flex-col items-center text-center h-full">
              <div className={`w-16 h-16 rounded-full ${themeStyles.iconBg2} flex items-center justify-center mb-4`}>
                <Sparkles className={`h-8 w-8 ${themeStyles.iconColor2}`} />
              </div>
              <h3 className="font-pixelated text-base font-medium mb-3">Coming Soon</h3>
              <p className="font-pixelated text-sm text-muted-foreground mb-4 flex-grow">
                We're working hard to bring you an amazing group chat experience. The Vortex feature will revolutionize how you connect with friends and communities.
              </p>
              <div className={`w-full h-1 bg-gradient-to-r from-social-purple/20 to-social-blue/20 rounded-full crimson:from-red-100 crimson:to-red-200`}></div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Highlights */}
        <Card className={`mb-8 crimson:border-red-100 crimson:bg-gradient-to-b crimson:from-white crimson:to-red-50/30`}>
          <CardContent className="p-6">
            <h3 className="font-pixelated text-base font-medium mb-4 text-center">Feature Highlights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${themeStyles.iconBg1} flex-shrink-0 flex items-center justify-center`}>
                  <Shield className={`h-4 w-4 ${themeStyles.iconColor1}`} />
                </div>
                <div>
                  <h4 className="font-pixelated text-sm font-medium mb-1">Private Groups</h4>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Create invite-only spaces for your closest friends and family
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full ${themeStyles.iconBg2} flex-shrink-0 flex items-center justify-center`}>
                  <Star className={`h-4 w-4 ${themeStyles.accentColor}`} />
                </div>
                <div>
                  <h4 className="font-pixelated text-sm font-medium mb-1">Rich Media Sharing</h4>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Share photos, videos, and files with your group members
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Message */}
        <Card className={`border-2 border-dashed ${themeStyles.accentBorder} ${themeStyles.accentBg}`}>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className={`font-pixelated text-lg font-medium mb-3 social-gradient bg-clip-text text-transparent crimson:bg-gradient-to-r crimson:from-red-700 crimson:to-red-500`}>
                Coming Soon
              </h3>
              <p className="font-pixelated text-sm text-muted-foreground mb-4">
                We're working hard to bring you the best group chat experience. Stay tuned for updates!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Development Note */}
        <div className="mt-6 text-center">
          <p className="font-pixelated text-xs text-muted-foreground">
            Vortex Groups is currently in development by Mohammed Maaz A.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Vortex;