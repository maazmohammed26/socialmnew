import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  MessageCircle, 
  UserMinus, 
  Clock, 
  X, 
  AlertTriangle, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  RefreshCw,
  UserX,
  Check,
  Star,
  Heart,
  Bell,
  Share2,
  MoreHorizontal,
  Zap,
  Bookmark,
  Tag,
  Shield,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GradientText, GlowEffect } from '@/components/ui/crimson-effects';
import { CrimsonSearchInput } from '@/components/ui/crimson-input';
import { UserSearch } from '@/components/dashboard/UserSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserProfileDialog } from '@/components/user/UserProfileDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  status: 'accepted' | 'pending' | 'suggested';
  created_at: string;
  friend_id?: string;
  sender_id?: string;
  receiver_id?: string;
  last_interaction?: string;
  favorite?: boolean;
  tags?: string[];
  notes?: string;
  online_status?: 'online' | 'offline' | 'away' | 'busy';
  last_seen?: string;
}

interface SearchResult {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  created_at: string;
  isFriend: boolean;
  isPending: boolean;
  mutualFriends?: number;
}

interface FriendTag {
  id: string;
  name: string;
  color: string;
}

export function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [suggested, setSuggested] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState<{show: boolean, friend: Friend | null}>({show: false, friend: null});
  const [removingFriend, setRemovingFriend] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('friends');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'activity'>('activity');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [friendTags, setFriendTags] = useState<FriendTag[]>([
    { id: '1', name: 'Close Friends', color: '#22c55e' },
    { id: '2', name: 'Work', color: '#3b82f6' },
    { id: '3', name: 'Family', color: '#ec4899' },
    { id: '4', name: 'School', color: '#f59e0b' }
  ]);
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [showNotesDialog, setShowNotesDialog] = useState<{show: boolean, friend: Friend | null}>({show: false, friend: null});
  const [friendNote, setFriendNote] = useState('');
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Check if we're in crimson theme
  const [isCrimson, setIsCrimson] = useState(false);
  
  useEffect(() => {
    // Safely check for crimson theme
    const checkTheme = () => {
      if (typeof document !== 'undefined') {
        setIsCrimson(document.documentElement.classList.contains('crimson'));
      }
    };
    
    // Check initially
    checkTheme();
    
    // Set up observer to detect theme changes
    const observer = new MutationObserver(checkTheme);
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['class'] 
      });
    }
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchFriendRequests();
      fetchSuggestedFriends();
      
      // Set up real-time subscriptions with enhanced error handling
      const friendsChannel = supabase
        .channel('friends-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'friends' }, 
          (payload) => {
            console.log('Friends table change:', payload);
            // Refresh all friend data when any change occurs
            setTimeout(() => {
              fetchFriends();
              fetchFriendRequests();
              fetchSuggestedFriends();
            }, 500);
          }
        )
        .subscribe();

      // Subscribe to favorite_friends changes
      const favoritesChannel = supabase
        .channel('favorites-realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'favorite_friends' },
          (payload) => {
            console.log('Favorites change detected:', payload);
            fetchFriends();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(friendsChannel);
        supabase.removeChannel(favoritesChannel);
      };
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchFriends = async () => {
    try {
      if (!currentUser) return;

      console.log('Fetching friends for user:', currentUser.id);

      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          sender_id,
          receiver_id,
          status,
          sender_profile:profiles!friends_sender_id_fkey(id, name, username, avatar),
          receiver_profile:profiles!friends_receiver_id_fkey(id, name, username, avatar)
        `)
        .eq('status', 'accepted')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      if (error) {
        console.error('Error fetching friends:', error);
        throw error;
      }

      console.log('Raw friends data:', data);

      // Get last interaction data for each friend
      const friendsList = await Promise.all((data || []).map(async friendship => {
        const isCurrentUserSender = friendship.sender_id === currentUser.id;
        const friendProfile = isCurrentUserSender 
          ? friendship.receiver_profile 
          : friendship.sender_profile;
        
        const friendId = friendProfile.id;
        
        // Get last message between users
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('created_at')
          .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        // Check if friend is favorited
        const { data: favoriteData } = await supabase
          .from('favorite_friends')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('friend_id', friendId)
          .maybeSingle();
          
        // Get friend tags (simulated for now)
        const tags = [];
        if (friendId.charAt(0) < 'c') tags.push('1'); // Close Friends
        if (friendId.charAt(1) > 'f') tags.push('2'); // Work
        if (friendId.charAt(2) < '5') tags.push('3'); // Family
        if (friendId.charAt(3) > '7') tags.push('4'); // School
        
        // Simulate online status
        const randomStatus = Math.random();
        let onlineStatus: 'online' | 'offline' | 'away' | 'busy' = 'offline';
        if (randomStatus < 0.3) onlineStatus = 'online';
        else if (randomStatus < 0.5) onlineStatus = 'away';
        else if (randomStatus < 0.6) onlineStatus = 'busy';
        
        return {
          id: friendProfile.id,
          name: friendProfile.name,
          username: friendProfile.username,
          avatar: friendProfile.avatar,
          status: 'accepted' as const,
          created_at: friendship.created_at,
          friend_id: friendship.id,
          sender_id: friendship.sender_id,
          receiver_id: friendship.receiver_id,
          last_interaction: lastMessage?.created_at || friendship.created_at,
          favorite: !!favoriteData,
          tags,
          notes: friendId.charAt(0) < 'd' ? 'Met through work conference' : undefined,
          online_status: onlineStatus,
          last_seen: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString()
        };
      }));

      console.log('Processed friends list:', friendsList);
      setFriends(friendsList);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          sender_id,
          sender_profile:profiles!friends_sender_id_fkey(id, name, username, avatar)
        `)
        .eq('status', 'pending')
        .eq('receiver_id', currentUser.id);

      if (error) throw error;

      const requestsList = data?.map(request => ({
        id: request.sender_profile.id,
        name: request.sender_profile.name,
        username: request.sender_profile.username,
        avatar: request.sender_profile.avatar,
        status: 'pending' as const,
        created_at: request.created_at,
        friend_id: request.id,
        sender_id: request.sender_id
      })) || [];

      setRequests(requestsList);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const fetchSuggestedFriends = async () => {
    try {
      if (!currentUser) return;

      // Get users with mutual friends
      const { data: mutualFriendsData } = await supabase.rpc('get_mutual_friends', {
        user_uuid: currentUser.id,
        limit_count: 10
      });

      if (mutualFriendsData && mutualFriendsData.length > 0) {
        const suggestedList = mutualFriendsData.map(profile => ({
          id: profile.id,
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar,
          status: 'suggested' as const,
          created_at: profile.created_at,
          mutualFriends: profile.mutual_friends_count
        }));
        
        setSuggested(suggestedList);
        setLoading(false);
        return;
      }

      // Fallback to regular suggestions if no mutual friends
      // Get users who are not already friends or have pending requests
      const { data: existingConnections } = await supabase
        .from('friends')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      const connectedUserIds = new Set();
      existingConnections?.forEach(conn => {
        connectedUserIds.add(conn.sender_id);
        connectedUserIds.add(conn.receiver_id);
      });
      connectedUserIds.add(currentUser.id); // Exclude current user

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, created_at')
        .not('id', 'in', `(${Array.from(connectedUserIds).join(',')})`)
        .limit(10);

      if (error) throw error;

      const suggestedList = data?.map(profile => ({
        id: profile.id,
        name: profile.name,
        username: profile.username,
        avatar: profile.avatar,
        status: 'suggested' as const,
        created_at: profile.created_at
      })) || [];

      setSuggested(suggestedList);
    } catch (error) {
      console.error('Error fetching suggested friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, created_at')
        .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('id', currentUser?.id)
        .limit(20);

      if (error) throw error;

      // Check if each user is already a friend or has a pending request
      const results = await Promise.all(
        (data || []).map(async (user) => {
          // Check if already friends
          const { data: friendData } = await supabase
            .from('friends')
            .select('id')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUser.id})`)
            .eq('status', 'accepted')
            .maybeSingle();

          // Check if pending request exists
          const { data: pendingData } = await supabase
            .from('friends')
            .select('id')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUser.id})`)
            .eq('status', 'pending')
            .maybeSingle();
            
          // Get mutual friends count
          const { data: mutualData } = await supabase.rpc('get_mutual_friends_count', {
            user_uuid: currentUser.id,
            friend_uuid: user.id
          });

          return {
            ...user,
            isFriend: !!friendData,
            isPending: !!pendingData,
            mutualFriends: mutualData || 0
          };
        })
      );

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Failed to search for users',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      if (!currentUser) return;

      const { error } = await supabase
        .from('friends')
        .insert({
          sender_id: currentUser.id,
          receiver_id: userId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            variant: 'destructive',
            title: 'Request already sent',
            description: 'You have already sent a friend request to this user',
          });
        } else {
          throw error;
        }
      } else {
        // Remove from suggested list
        setSuggested(prev => prev.filter(user => user.id !== userId));
        
        // Remove from search results or update status
        setSearchResults(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, isPending: true } 
              : user
          )
        );

        toast({
          title: 'Friend request sent!',
          description: 'Your friend request has been sent successfully',
        });
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send friend request',
      });
    }
  };

  const acceptFriendRequest = async (request: Friend) => {
    try {
      if (!request.friend_id) return;
      
      setProcessingRequest(request.id);

      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', request.friend_id);

      if (error) throw error;

      // Create notification for the requester
      try {
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', currentUser.id)
          .single();

        const userName = currentUserProfile?.name || 'Someone';

        await supabase
          .from('notifications')
          .insert({
            user_id: request.sender_id,
            type: 'friend_accepted',
            content: `${userName} accepted your friend request`,
            reference_id: request.friend_id,
            read: false
          });
      } catch (notifError) {
        console.log('Notification creation handled:', notifError);
      }

      // Refresh all lists
      await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
        fetchSuggestedFriends()
      ]);

      toast({
        title: 'Friend request accepted',
        description: 'You are now friends!',
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to accept friend request',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const rejectFriendRequest = async (request: Friend) => {
    try {
      if (!request.friend_id) return;
      
      setProcessingRequest(request.id);

      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', request.friend_id);

      if (error) throw error;

      // Create notification for the requester
      try {
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', currentUser.id)
          .single();

        const userName = currentUserProfile?.name || 'Someone';

        await supabase
          .from('notifications')
          .insert({
            user_id: request.sender_id,
            type: 'friend_rejected',
            content: `${userName} declined your friend request`,
            reference_id: request.friend_id,
            read: false
          });
      } catch (notifError) {
        console.log('Notification creation handled:', notifError);
      }

      // Remove from requests list
      setRequests(prev => prev.filter(req => req.friend_id !== request.friend_id));

      toast({
        title: 'Friend request rejected',
        description: 'The friend request has been declined',
      });
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject friend request',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRemoveFriend = async (friend: Friend) => {
    try {
      if (!friend.friend_id) return;
      
      setRemovingFriend(friend.id);
      
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friend.friend_id);
        
      if (error) throw error;
      
      // Remove from favorites if exists
      await supabase
        .from('favorite_friends')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('friend_id', friend.id);
      
      // Remove from friends list
      setFriends(prev => prev.filter(f => f.id !== friend.id));
      
      setShowRemoveDialog({show: false, friend: null});
      
      toast({
        title: 'Friend removed',
        description: `${friend.name} has been removed from your friends list`,
      });
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove friend',
      });
    } finally {
      setRemovingFriend(null);
    }
  };

  const toggleFavoriteFriend = async (friendId: string, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from('favorite_friends')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', friendId);
          
        // Update local state
        setFriends(prev => 
          prev.map(friend => 
            friend.id === friendId 
              ? { ...friend, favorite: false } 
              : friend
          )
        );
        
        toast({
          title: 'Removed from favorites',
          description: 'Friend removed from favorites',
        });
      } else {
        // Add to favorites
        await supabase
          .from('favorite_friends')
          .insert({
            user_id: currentUser.id,
            friend_id: friendId
          });
          
        // Update local state
        setFriends(prev => 
          prev.map(friend => 
            friend.id === friendId 
              ? { ...friend, favorite: true } 
              : friend
          )
        );
        
        toast({
          title: 'Added to favorites',
          description: 'Friend added to favorites',
        });
      }
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update favorite status',
      });
    }
  };

  const updateFriendTags = (friendId: string, tags: string[]) => {
    setFriends(prev => 
      prev.map(friend => 
        friend.id === friendId 
          ? { ...friend, tags } 
          : friend
      )
    );
    
    toast({
      title: 'Tags updated',
      description: 'Friend tags have been updated',
    });
  };

  const updateFriendNote = (friendId: string, note: string) => {
    setFriends(prev => 
      prev.map(friend => 
        friend.id === friendId 
          ? { ...friend, notes: note } 
          : friend
      )
    );
    
    setShowNotesDialog({show: false, friend: null});
    
    toast({
      title: 'Note saved',
      description: 'Friend note has been saved',
    });
  };

  const openChat = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  const filterUsers = (users: Friend[]) => {
    if (!searchQuery.trim() && !filterFavorites && filterTags.length === 0) {
      return users;
    }
    
    let filtered = users;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
      );
    }
    
    // Apply favorites filter
    if (filterFavorites) {
      filtered = filtered.filter(user => user.favorite);
    }
    
    // Apply tags filter
    if (filterTags.length > 0) {
      filtered = filtered.filter(user => 
        user.tags && filterTags.some(tag => user.tags?.includes(tag))
      );
    }
    
    return filtered;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      searchUsers(query);
      setActiveTab('search');
    } else {
      setSearchResults([]);
    }
  };
  
  const sortFriends = (friendsList: Friend[]) => {
    let sorted = [...friendsList];
    
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'date':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'activity':
        sorted.sort((a, b) => {
          const dateA = a.last_interaction ? new Date(a.last_interaction).getTime() : new Date(a.created_at).getTime();
          const dateB = b.last_interaction ? new Date(b.last_interaction).getTime() : new Date(b.created_at).getTime();
          return dateB - dateA; // Most recent first
        });
        break;
    }
    
    // Apply sort order
    if (sortOrder === 'asc' && sortBy !== 'activity') {
      return sorted;
    } else if (sortOrder === 'desc' && sortBy !== 'activity') {
      return sorted.reverse();
    }
    
    return sorted;
  };
  
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFriends(),
      fetchFriendRequests(),
      fetchSuggestedFriends()
    ]);
    setRefreshing(false);
    
    toast({
      title: 'Refreshed',
      description: 'Friend data has been refreshed',
    });
  };
  
  const handleUserClick = (user: any) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };
  
  const handleTagsClick = () => {
    setShowTagsDialog(true);
  };
  
  const handleNotesClick = (friend: Friend) => {
    setFriendNote(friend.notes || '');
    setShowNotesDialog({show: true, friend});
  };
  
  const toggleTagFilter = (tagId: string) => {
    setFilterTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };
  
  const getTagName = (tagId: string) => {
    const tag = friendTags.find(t => t.id === tagId);
    return tag ? tag.name : '';
  };
  
  const getTagColor = (tagId: string) => {
    const tag = friendTags.find(t => t.id === tagId);
    return tag ? tag.color : '#888888';
  };
  
  const getOnlineStatusColor = (status?: 'online' | 'offline' | 'away' | 'busy') => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };
  
  const getOnlineStatusText = (status?: 'online' | 'offline' | 'away' | 'busy', lastSeen?: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      default: return lastSeen ? `Last seen ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true })}` : 'Offline';
    }
  };

  const UserCard = ({ user, type }: { user: Friend; type: 'friend' | 'request' | 'suggested' }) => (
    <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar 
              className={`w-12 h-12 border-2 ${isCrimson ? 'border-red-200' : 'border-social-green'} cursor-pointer`}
              onClick={() => handleUserClick(user)}
            >
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : (
                <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            {type === 'friend' && (
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${getOnlineStatusColor(user.online_status)} border border-white`}></div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleUserClick(user)}>
            <div className="flex items-center gap-2">
              <h3 className="font-pixelated text-sm font-medium truncate">{user.name}</h3>
              {type === 'friend' && user.favorite && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <p className="font-pixelated text-xs text-muted-foreground truncate">@{user.username}</p>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {type === 'friend' && (
                <>
                  <span className={`inline-flex items-center h-4 px-1 rounded-full text-[8px] font-pixelated ${getOnlineStatusColor(user.online_status)} bg-opacity-20 text-foreground`}>
                    {getOnlineStatusText(user.online_status, user.last_seen)}
                  </span>
                  
                  {user.tags && user.tags.length > 0 && user.tags.map(tagId => (
                    <span 
                      key={tagId}
                      className="inline-flex items-center h-4 px-1 rounded-full text-[8px] font-pixelated"
                      style={{ backgroundColor: `${getTagColor(tagId)}20`, color: getTagColor(tagId) }}
                    >
                      {getTagName(tagId)}
                    </span>
                  ))}
                </>
              )}
              
              {type === 'friend' ? (
                user.last_interaction ? (
                  <span className="text-[8px] text-muted-foreground font-pixelated">
                    • {formatDistanceToNow(new Date(user.last_interaction), { addSuffix: true })}
                  </span>
                ) : null
              ) : type === 'request' ? (
                <span className="text-[8px] text-muted-foreground font-pixelated">
                  • Requested {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </span>
              ) : (
                <>
                  {user.mutualFriends && user.mutualFriends > 0 && (
                    <span className="text-[8px] text-social-blue font-pixelated">
                      • {user.mutualFriends} mutual friend{user.mutualFriends !== 1 ? 's' : ''}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {type === 'friend' && (
              <>
                <Button
                  onClick={() => openChat(user.id)}
                  size="sm"
                  className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs h-6`}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Chat
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-pixelated text-xs h-6 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
                    >
                      <MoreHorizontal className="h-3 w-3 mr-1" />
                      Manage
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => toggleFavoriteFriend(user.id, !!user.favorite)}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      {user.favorite ? (
                        <>
                          <Star className="h-3 w-3 mr-2 text-yellow-500 fill-yellow-500" />
                          Remove from favorites
                        </>
                      ) : (
                        <>
                          <Star className="h-3 w-3 mr-2" />
                          Add to favorites
                        </>
                      )}
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      onClick={() => handleNotesClick(user)}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      <Bookmark className="h-3 w-3 mr-2" />
                      {user.notes ? 'Edit note' : 'Add note'}
                    </DropdownMenuItem>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 font-pixelated">
                          <Tag className="h-3 w-3 mr-2" />
                          Manage tags
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        <DropdownMenuLabel className="font-pixelated text-xs">Assign Tags</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {friendTags.map(tag => (
                          <DropdownMenuCheckboxItem
                            key={tag.id}
                            checked={user.tags?.includes(tag.id)}
                            onCheckedChange={(checked) => {
                              const newTags = user.tags ? [...user.tags] : [];
                              if (checked) {
                                if (!newTags.includes(tag.id)) newTags.push(tag.id);
                              } else {
                                const index = newTags.indexOf(tag.id);
                                if (index !== -1) newTags.splice(index, 1);
                              }
                              updateFriendTags(user.id, newTags);
                            }}
                            className="font-pixelated text-xs cursor-pointer"
                          >
                            <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tag.color }}></span>
                            {tag.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={handleTagsClick}
                          className="font-pixelated text-xs cursor-pointer"
                        >
                          <Settings className="h-3 w-3 mr-2" />
                          Manage all tags
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      onClick={() => setShowRemoveDialog({show: true, friend: user})}
                      className="font-pixelated text-xs text-destructive cursor-pointer"
                    >
                      <UserMinus className="h-3 w-3 mr-2" />
                      Remove friend
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            
            {type === 'request' && (
              <>
                <Button
                  onClick={() => acceptFriendRequest(user)}
                  size="sm"
                  disabled={processingRequest === user.id}
                  className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs h-6`}
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  {processingRequest === user.id ? 'Processing...' : 'Accept'}
                </Button>
                <Button
                  onClick={() => rejectFriendRequest(user)}
                  size="sm"
                  variant="destructive"
                  disabled={processingRequest === user.id}
                  className="font-pixelated text-xs h-6"
                >
                  <X className="h-3 w-3 mr-1" />
                  {processingRequest === user.id ? 'Processing...' : 'Reject'}
                </Button>
              </>
            )}
            
            {type === 'suggested' && (
              <Button
                onClick={() => sendFriendRequest(user.id)}
                size="sm"
                className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-blue hover:bg-social-blue/90'} text-white font-pixelated text-xs h-6`}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add Friend
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const UserGridCard = ({ user }: { user: Friend }) => (
    <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
      <CardContent className="p-3 flex flex-col items-center text-center">
        <div className="relative mb-2">
          <Avatar 
            className={`w-16 h-16 border-2 ${isCrimson ? 'border-red-200' : 'border-social-green'} cursor-pointer`}
            onClick={() => handleUserClick(user)}
          >
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : (
              <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${getOnlineStatusColor(user.online_status)} border border-white`}></div>
          {user.favorite && (
            <div className="absolute -top-1 -right-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            </div>
          )}
        </div>
        
        <h3 className="font-pixelated text-sm font-medium truncate w-full">{user.name}</h3>
        <p className="font-pixelated text-xs text-muted-foreground truncate w-full">@{user.username}</p>
        
        <div className="flex flex-wrap justify-center gap-1 mt-2 mb-3">
          {user.tags && user.tags.length > 0 && user.tags.map(tagId => (
            <span 
              key={tagId}
              className="inline-flex items-center h-4 px-1 rounded-full text-[8px] font-pixelated"
              style={{ backgroundColor: `${getTagColor(tagId)}20`, color: getTagColor(tagId) }}
            >
              {getTagName(tagId)}
            </span>
          ))}
        </div>
        
        <div className="flex gap-1 mt-auto">
          <Button
            onClick={() => openChat(user.id)}
            size="sm"
            className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs h-6 flex-1`}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Chat
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="font-pixelated text-xs h-6 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => toggleFavoriteFriend(user.id, !!user.favorite)}
                className="font-pixelated text-xs cursor-pointer"
              >
                {user.favorite ? (
                  <>
                    <Star className="h-3 w-3 mr-2 text-yellow-500 fill-yellow-500" />
                    Remove from favorites
                  </>
                ) : (
                  <>
                    <Star className="h-3 w-3 mr-2" />
                    Add to favorites
                  </>
                )}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => handleNotesClick(user)}
                className="font-pixelated text-xs cursor-pointer"
              >
                <Bookmark className="h-3 w-3 mr-2" />
                {user.notes ? 'Edit note' : 'Add note'}
              </DropdownMenuItem>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 font-pixelated">
                    <Tag className="h-3 w-3 mr-2" />
                    Manage tags
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuLabel className="font-pixelated text-xs">Assign Tags</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {friendTags.map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag.id}
                      checked={user.tags?.includes(tag.id)}
                      onCheckedChange={(checked) => {
                        const newTags = user.tags ? [...user.tags] : [];
                        if (checked) {
                          if (!newTags.includes(tag.id)) newTags.push(tag.id);
                        } else {
                          const index = newTags.indexOf(tag.id);
                          if (index !== -1) newTags.splice(index, 1);
                        }
                        updateFriendTags(user.id, newTags);
                      }}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tag.color }}></span>
                      {tag.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => setShowRemoveDialog({show: true, friend: user})}
                className="font-pixelated text-xs text-destructive cursor-pointer"
              >
                <UserMinus className="h-3 w-3 mr-2" />
                Remove friend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const SearchResultCard = ({ user }: { user: SearchResult }) => (
    <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar 
            className={`w-12 h-12 border-2 ${isCrimson ? 'border-red-200' : 'border-social-green'} cursor-pointer`}
            onClick={() => handleUserClick(user)}
          >
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : (
              <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleUserClick(user)}>
            <h3 className="font-pixelated text-sm font-medium truncate">{user.name}</h3>
            <p className="font-pixelated text-xs text-muted-foreground truncate">@{user.username}</p>
            <div className="flex items-center">
              <p className="font-pixelated text-xs text-muted-foreground">
                Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
              </p>
              {user.mutualFriends && user.mutualFriends > 0 && (
                <div className="flex items-center ml-2">
                  <span className="text-xs text-social-blue font-pixelated">• {user.mutualFriends} mutual</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {user.isFriend ? (
              <>
                <Button
                  onClick={() => openChat(user.id)}
                  size="sm"
                  className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs h-6`}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Chat
                </Button>
                <Button
                  onClick={() => {
                    const friend = friends.find(f => f.id === user.id);
                    if (friend) {
                      setShowRemoveDialog({show: true, friend});
                    }
                  }}
                  size="sm"
                  variant="outline"
                  className="font-pixelated text-xs h-6 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
                >
                  <UserMinus className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              </>
            ) : user.isPending ? (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="font-pixelated text-xs h-6"
              >
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Button>
            ) : (
              <Button
                onClick={() => sendFriendRequest(user.id)}
                size="sm"
                className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-blue hover:bg-social-blue/90'} text-white font-pixelated text-xs h-6`}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Add Friend
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-3">
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto relative h-[calc(100vh-60px)] animate-fade-in">
        {/* Header */}
        <div className={`flex items-center justify-between p-3 border-b bg-background sticky top-0 z-10 backdrop-blur-sm ${isCrimson ? 'border-red-100' : ''}`}>
          <div className="flex items-center gap-2">
            <Users className={`h-5 w-5 ${isCrimson ? 'text-red-600' : 'text-primary'}`} />
            <h1 className="font-pixelated text-base">
              {isCrimson ? (
                <GradientText gradientColors={['#dc2626', '#b91c1c']}>Friends</GradientText>
              ) : (
                'Friends'
              )}
            </h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowInfoDialog(true)}
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-pixelated text-xs">About Friends</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={refreshData}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-pixelated text-xs">Refresh</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="relative max-w-sm">
              {isCrimson ? (
                <CrimsonSearchInput
                  placeholder="Search by name or username..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="font-pixelated text-xs h-8"
                />
              ) : (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or username..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="font-pixelated text-xs h-8 pl-8"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center justify-between p-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 font-pixelated text-xs ${filterFavorites ? 'bg-yellow-100 text-yellow-700' : ''}`}
              onClick={() => setFilterFavorites(!filterFavorites)}
            >
              <Star className={`h-3 w-3 mr-1 ${filterFavorites ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              {filterFavorites ? 'All Friends' : 'Favorites'}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 font-pixelated text-xs ${filterTags.length > 0 ? 'bg-blue-100 text-blue-700' : ''}`}
                >
                  <Tag className={`h-3 w-3 mr-1 ${filterTags.length > 0 ? 'text-blue-500' : ''}`} />
                  {filterTags.length > 0 ? `${filterTags.length} Tag${filterTags.length !== 1 ? 's' : ''}` : 'Tags'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel className="font-pixelated text-xs">Filter by Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {friendTags.map(tag => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={filterTags.includes(tag.id)}
                    onCheckedChange={() => toggleTagFilter(tag.id)}
                    className="font-pixelated text-xs cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tag.color }}></span>
                    {tag.name}
                  </DropdownMenuCheckboxItem>
                ))}
                {filterTags.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setFilterTags([])}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      <X className="h-3 w-3 mr-2" />
                      Clear all filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 font-pixelated text-xs"
                    onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                  >
                    {viewMode === 'list' ? (
                      <LayoutGrid className="h-3 w-3" />
                    ) : (
                      <List className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-pixelated text-xs">
                    Switch to {viewMode === 'list' ? 'Grid' : 'List'} View
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-pixelated">Sort:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 font-pixelated text-xs">
                  {sortBy === 'name' ? 'Name' : sortBy === 'date' ? 'Date Added' : 'Recent Activity'}
                  {sortOrder === 'asc' ? (
                    <SortAsc className="h-3 w-3 ml-1" />
                  ) : (
                    <SortDesc className="h-3 w-3 ml-1" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <DropdownMenuRadioItem value="name" className="font-pixelated text-xs cursor-pointer">
                    Name
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="date" className="font-pixelated text-xs cursor-pointer">
                    Date Added
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="activity" className="font-pixelated text-xs cursor-pointer">
                    Recent Activity
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="font-pixelated text-xs cursor-pointer"
                >
                  {sortOrder === 'asc' ? (
                    <>
                      <SortAsc className="h-3 w-3 mr-2" />
                      Ascending
                    </>
                  ) : (
                    <>
                      <SortDesc className="h-3 w-3 mr-2" />
                      Descending
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-160px)]">
          <TabsList className={`grid w-full grid-cols-4 mx-3 mt-3 ${isCrimson ? 'bg-red-50' : ''}`}>
            <TabsTrigger value="friends" className="font-pixelated text-xs relative">
              Friends
              {friends.length > 0 && (
                <Badge variant="secondary" className={`ml-2 h-4 w-4 p-0 text-xs ${isCrimson ? 'bg-red-100 text-red-700' : ''}`}>
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="font-pixelated text-xs relative">
              Requests
              {requests.length > 0 && (
                <Badge variant="destructive" className={`ml-2 h-4 w-4 p-0 text-xs animate-pulse ${isCrimson ? 'bg-red-600' : ''}`}>
                  {requests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggested" className="font-pixelated text-xs relative">
              Suggested
              {suggested.length > 0 && (
                <Badge variant="outline" className="ml-2 h-4 w-4 p-0 text-xs">
                  {suggested.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="font-pixelated text-xs relative">
              Search
              {searchResults.length > 0 && (
                <Badge variant="outline" className={`ml-2 h-4 w-4 p-0 text-xs ${isCrimson ? 'border-red-200 bg-red-50' : ''}`}>
                  {searchResults.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="h-[calc(100%-60px)] mt-3">
            <ScrollArea className="h-full px-3 scroll-container">
              {filterUsers(sortFriends(friends)).length > 0 ? (
                viewMode === 'list' ? (
                  <div className="space-y-3 pb-3">
                    {filterUsers(sortFriends(friends)).map((friend) => (
                      <UserCard key={friend.id} user={friend} type="friend" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3">
                    {filterUsers(sortFriends(friends)).map((friend) => (
                      <UserGridCard key={friend.id} user={friend} />
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {searchQuery ? 'No friends found' : filterFavorites ? 'No favorite friends yet' : filterTags.length > 0 ? 'No friends with selected tags' : 'No friends yet'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : filterFavorites
                        ? 'Add friends to your favorites list by clicking the star icon'
                        : filterTags.length > 0
                          ? 'Try selecting different tags or clear the tag filter'
                          : 'Start connecting with people by sending friend requests!'
                    }
                  </p>
                  {(filterFavorites || filterTags.length > 0) && friends.length > 0 && (
                    <Button
                      onClick={() => {
                        setFilterFavorites(false);
                        setFilterTags([]);
                      }}
                      variant="outline"
                      size="sm"
                      className="mt-4 font-pixelated text-xs"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Show All Friends
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="h-[calc(100%-60px)] mt-3">
            <ScrollArea className="h-full px-3 scroll-container">
              {filterUsers(requests).length > 0 ? (
                <div className="space-y-3 pb-3">
                  {filterUsers(requests).map((request) => (
                    <UserCard key={request.id} user={request} type="request" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Clock className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {searchQuery ? 'No requests found' : 'No friend requests'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'When people send you friend requests, they\'ll appear here.'
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="suggested" className="h-[calc(100%-60px)] mt-3">
            <ScrollArea className="h-full px-3 scroll-container">
              {filterUsers(suggested).length > 0 ? (
                <div className="space-y-3 pb-3">
                  {filterUsers(suggested).map((suggestion) => (
                    <UserCard key={suggestion.id} user={suggestion} type="suggested" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <UserPlus className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {searchQuery ? 'No suggestions found' : 'No suggestions available'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'Check back later for new friend suggestions!'
                    }
                  </p>
                  <Button
                    onClick={refreshData}
                    variant="outline"
                    size="sm"
                    className="mt-4 font-pixelated text-xs"
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Suggestions
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="h-[calc(100%-60px)] mt-3">
            <ScrollArea className="h-full px-3 scroll-container">
              {isSearching ? (
                <div className="space-y-3 pb-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-muted" />
                          <div className="flex-1">
                            <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                            <div className="h-3 w-1/2 bg-muted rounded" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3 pb-3">
                  {searchResults.map((user) => (
                    <SearchResultCard key={user.id} user={user} />
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    No users found
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Try searching with a different name or username
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    Search for friends
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Enter a name or username to find people
                  </p>
                  <div className="mt-6 w-full max-w-sm">
                    <UserSearch />
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Remove Friend Confirmation Dialog */}
      <AlertDialog 
        open={showRemoveDialog.show} 
        onOpenChange={(open) => setShowRemoveDialog({show: open, friend: showRemoveDialog.friend})}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Remove Friend</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to remove {showRemoveDialog.friend?.name} from your friends list? 
              You'll need to send a new friend request if you want to connect again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showRemoveDialog.friend && handleRemoveFriend(showRemoveDialog.friend)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
              disabled={!!removingFriend}
            >
              {removingFriend ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Profile Dialog */}
      <UserProfileDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        user={selectedUser}
      />
      
      {/* Tags Management Dialog */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Manage Tags</DialogTitle>
            <DialogDescription className="font-pixelated text-xs">
              Create and manage tags to categorize your friends.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="font-pixelated text-sm font-medium">Your Tags</h3>
              <div className="space-y-2">
                {friendTags.map(tag => (
                  <div key={tag.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }}></div>
                      <span className="font-pixelated text-xs">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-pixelated text-sm font-medium">Add New Tag</h3>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Tag name" 
                  className="font-pixelated text-xs h-8"
                />
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500 cursor-pointer"></div>
                  <div className="w-6 h-6 rounded-full bg-green-500 cursor-pointer"></div>
                  <div className="w-6 h-6 rounded-full bg-red-500 cursor-pointer"></div>
                  <div className="w-6 h-6 rounded-full bg-yellow-500 cursor-pointer"></div>
                  <div className="w-6 h-6 rounded-full bg-purple-500 cursor-pointer"></div>
                </div>
                <Button size="sm" className="h-8 font-pixelated text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowTagsDialog(false)}
              className="font-pixelated text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Friend Notes Dialog */}
      <Dialog 
        open={showNotesDialog.show} 
        onOpenChange={(open) => setShowNotesDialog({show: open, friend: showNotesDialog.friend})}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">
              {showNotesDialog.friend?.notes ? 'Edit Note' : 'Add Note'}
            </DialogTitle>
            <DialogDescription className="font-pixelated text-xs">
              {showNotesDialog.friend?.notes 
                ? 'Edit your personal note about this friend.' 
                : 'Add a personal note about this friend.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {showNotesDialog.friend?.avatar ? (
                  <AvatarImage src={showNotesDialog.friend.avatar} alt={showNotesDialog.friend.name} />
                ) : (
                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                    {showNotesDialog.friend?.name.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="font-pixelated text-sm font-medium">{showNotesDialog.friend?.name}</h3>
                <p className="font-pixelated text-xs text-muted-foreground">@{showNotesDialog.friend?.username}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note" className="font-pixelated text-xs">Note</Label>
              <Textarea 
                id="note"
                placeholder="Add a personal note about this friend..."
                value={friendNote}
                onChange={(e) => setFriendNote(e.target.value)}
                className="font-pixelated text-xs min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNotesDialog({show: false, friend: null})}
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => showNotesDialog.friend && updateFriendNote(showNotesDialog.friend.id, friendNote)}
              className="font-pixelated text-xs"
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* About Friends Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">
              {isCrimson ? (
                <GradientText gradientColors={['#dc2626', '#b91c1c']}>
                  About Friends
                </GradientText>
              ) : (
                'About Friends'
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <p className="font-pixelated text-xs text-muted-foreground">
              The Friends feature allows you to connect with other users, manage your relationships, and stay in touch.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-pixelated text-xs font-medium">Favorites</h3>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Mark friends as favorites for quick access. Filter to show only your favorite friends.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="font-pixelated text-xs font-medium">Tags</h3>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Organize friends with custom tags like "Close Friends," "Work," or "Family."
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Bookmark className="h-4 w-4 text-purple-500 mt-0.5" />
                <div>
                  <h3 className="font-pixelated text-xs font-medium">Notes</h3>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Add personal notes about your friends that only you can see.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-pixelated text-xs font-medium">Chat</h3>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Start conversations directly from the friends list.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-pixelated text-xs font-medium">Privacy</h3>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Your friend list is private. Only you can see your connections and notes.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowInfoDialog(false)}
              className="font-pixelated text-xs"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default Friends;