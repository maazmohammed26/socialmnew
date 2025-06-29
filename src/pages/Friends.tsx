import React, { useState, useEffect, useRef } from 'react';
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
  Star, 
  Tag, 
  Heart, 
  Grid, 
  List, 
  SlidersHorizontal, 
  Bell, 
  BellOff, 
  Bookmark, 
  Pencil, 
  Check, 
  ChevronDown, 
  ChevronUp 
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserProfileDialog } from '@/components/user/UserProfileDialog';

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
  isFavorite?: boolean;
  isOnline?: boolean;
  lastActive?: string;
  tags?: string[];
  note?: string;
  mutualFriends?: number;
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

interface Tag {
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'online'>('name');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterOnline, setFilterOnline] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
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
    
    // Load view preferences from localStorage
    const savedViewMode = localStorage.getItem('friendsViewMode');
    if (savedViewMode === 'list' || savedViewMode === 'grid') {
      setViewMode(savedViewMode);
    }
    
    const savedSortBy = localStorage.getItem('friendsSortBy');
    if (savedSortBy === 'name' || savedSortBy === 'recent' || savedSortBy === 'online') {
      setSortBy(savedSortBy);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchFriendRequests();
      fetchSuggestedFriends();
      fetchTags();
      
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

      return () => {
        supabase.removeChannel(friendsChannel);
      };
    }
  }, [currentUser]);
  
  // Save view preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('friendsViewMode', viewMode);
  }, [viewMode]);
  
  useEffect(() => {
    localStorage.setItem('friendsSortBy', sortBy);
  }, [sortBy]);

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

      // Process friends data
      const friendsList = await Promise.all((data || []).map(async friendship => {
        const isCurrentUserSender = friendship.sender_id === currentUser.id;
        const friendProfile = isCurrentUserSender 
          ? friendship.receiver_profile 
          : friendship.sender_profile;
        
        // Check if friend is favorite
        const { data: favoriteData } = await supabase
          .from('favorite_friends')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('friend_id', friendProfile.id)
          .maybeSingle();
          
        // Get friend note if exists
        const { data: noteData } = await supabase
          .from('friend_notes')
          .select('note')
          .eq('user_id', currentUser.id)
          .eq('friend_id', friendProfile.id)
          .maybeSingle();
          
        // Get friend tags
        const { data: tagAssignments } = await supabase
          .from('friend_tag_assignments')
          .select(`
            tag_id,
            friend_tags:tag_id(name, color)
          `)
          .eq('user_id', currentUser.id)
          .eq('friend_id', friendProfile.id);
          
        const tags = tagAssignments?.map(assignment => assignment.friend_tags.name) || [];
        
        // Get mutual friends count
        const { data: mutualCount } = await supabase.rpc('get_mutual_friends_count', {
          user_uuid: currentUser.id,
          friend_uuid: friendProfile.id
        });
        
        // Simulate online status based on user ID
        const isOnline = friendProfile.id.charAt(0) < 'd';
        const lastActive = isOnline ? 'now' : ['2h ago', '1d ago', '3d ago', '1w ago'][Math.floor(Math.random() * 4)];
        
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
          isFavorite: !!favoriteData,
          isOnline,
          lastActive,
          tags,
          note: noteData?.note || '',
          mutualFriends: mutualCount || 0
        };
      }));

      console.log('Processed friends list:', friendsList);
      
      // Sort friends based on current sort preference
      const sortedFriends = sortFriends(friendsList, sortBy);
      setFriends(sortedFriends);
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

      // First try to get users with mutual friends
      const { data: mutualFriendsData } = await supabase.rpc('get_mutual_friends', {
        user_uuid: currentUser.id,
        limit_count: 5
      });
      
      let suggestedList: Friend[] = [];
      
      if (mutualFriendsData && mutualFriendsData.length > 0) {
        // Convert mutual friends data to our Friend type
        suggestedList = mutualFriendsData.map(user => ({
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          status: 'suggested' as const,
          created_at: user.created_at,
          mutualFriends: user.mutual_friends_count
        }));
      }
      
      // If we don't have enough suggestions from mutual friends, add some random users
      if (suggestedList.length < 5) {
        const excludeIds = [...connectedUserIds, ...suggestedList.map(u => u.id)];
        
        const { data: randomUsers, error } = await supabase
          .from('profiles')
          .select('id, name, username, avatar, created_at')
          .not('id', 'in', `(${Array.from(excludeIds).join(',')})`)
          .limit(5 - suggestedList.length);
          
        if (!error && randomUsers) {
          const randomSuggestions = randomUsers.map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            status: 'suggested' as const,
            created_at: user.created_at,
            mutualFriends: 0
          }));
          
          suggestedList = [...suggestedList, ...randomSuggestions];
        }
      }

      setSuggested(suggestedList);
    } catch (error) {
      console.error('Error fetching suggested friends:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTags = async () => {
    try {
      if (!currentUser) return;
      
      const { data, error } = await supabase
        .from('friend_tags')
        .select('id, name, color')
        .eq('user_id', currentUser.id);
        
      if (error) throw error;
      
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
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
        .limit(10);

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
          const { data: mutualCount } = await supabase.rpc('get_mutual_friends_count', {
            user_uuid: currentUser.id,
            friend_uuid: user.id
          });

          return {
            ...user,
            isFriend: !!friendData,
            isPending: !!pendingData,
            mutualFriends: mutualCount || 0
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

  const handleRemoveFriend = async () => {
    if (!showRemoveDialog.friend?.friend_id) return;
    
    try {
      setRemovingFriend(showRemoveDialog.friend.id);
      
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', showRemoveDialog.friend.friend_id);
        
      if (error) throw error;
      
      // Also remove from favorites if exists
      if (showRemoveDialog.friend.isFavorite) {
        await supabase
          .from('favorite_friends')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', showRemoveDialog.friend.id);
      }
      
      // Remove any notes
      await supabase
        .from('friend_notes')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('friend_id', showRemoveDialog.friend.id);
        
      // Remove any tag assignments
      await supabase
        .from('friend_tag_assignments')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('friend_id', showRemoveDialog.friend.id);
      
      // Update friends list
      setFriends(prev => prev.filter(friend => friend.id !== showRemoveDialog.friend?.id));
      
      toast({
        title: 'Friend removed',
        description: 'This user has been removed from your friends list',
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
      setShowRemoveDialog({show: false, friend: null});
    }
  };
  
  const toggleFavorite = async (friend: Friend) => {
    try {
      if (friend.isFavorite) {
        // Remove from favorites
        await supabase
          .from('favorite_friends')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', friend.id);
          
        // Update local state
        setFriends(prev => 
          prev.map(f => 
            f.id === friend.id ? { ...f, isFavorite: false } : f
          )
        );
        
        toast({
          title: 'Removed from favorites',
          description: `${friend.name} has been removed from your favorites`,
        });
      } else {
        // Add to favorites
        await supabase
          .from('favorite_friends')
          .insert({
            user_id: currentUser.id,
            friend_id: friend.id
          });
          
        // Update local state
        setFriends(prev => 
          prev.map(f => 
            f.id === friend.id ? { ...f, isFavorite: true } : f
          )
        );
        
        toast({
          title: 'Added to favorites',
          description: `${friend.name} has been added to your favorites`,
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update favorites',
      });
    }
  };
  
  const handleAddNote = async () => {
    if (!selectedFriend || !noteText.trim()) return;
    
    try {
      // Check if note already exists
      const { data: existingNote } = await supabase
        .from('friend_notes')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('friend_id', selectedFriend.id)
        .maybeSingle();
        
      if (existingNote) {
        // Update existing note
        await supabase
          .from('friend_notes')
          .update({ note: noteText, updated_at: new Date().toISOString() })
          .eq('id', existingNote.id);
      } else {
        // Create new note
        await supabase
          .from('friend_notes')
          .insert({
            user_id: currentUser.id,
            friend_id: selectedFriend.id,
            note: noteText
          });
      }
      
      // Update local state
      setFriends(prev => 
        prev.map(f => 
          f.id === selectedFriend.id ? { ...f, note: noteText } : f
        )
      );
      
      setShowNoteDialog(false);
      setNoteText('');
      
      toast({
        title: 'Note saved',
        description: 'Your note has been saved successfully',
      });
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save note',
      });
    }
  };
  
  const handleManageTags = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowTagDialog(true);
  };
  
  const handleUserClick = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowUserDialog(true);
  };

  const openChat = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  const filterUsers = (users: Friend[]) => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
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
  
  const sortFriends = (friendsList: Friend[], sortType: 'name' | 'recent' | 'online') => {
    switch (sortType) {
      case 'name':
        return [...friendsList].sort((a, b) => a.name.localeCompare(b.name));
      case 'recent':
        return [...friendsList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'online':
        return [...friendsList].sort((a, b) => {
          if (a.isOnline === b.isOnline) {
            return a.name.localeCompare(b.name);
          }
          return a.isOnline ? -1 : 1;
        });
      default:
        return friendsList;
    }
  };
  
  const applyFilters = (friendsList: Friend[]) => {
    let filtered = [...friendsList];
    
    // Apply favorite filter
    if (filterFavorites) {
      filtered = filtered.filter(friend => friend.isFavorite);
    }
    
    // Apply online filter
    if (filterOnline) {
      filtered = filtered.filter(friend => friend.isOnline);
    }
    
    // Apply tag filters
    if (filterTags.length > 0) {
      filtered = filtered.filter(friend => {
        if (!friend.tags) return false;
        return filterTags.some(tag => friend.tags?.includes(tag));
      });
    }
    
    return filtered;
  };
  
  const toggleNotifications = (friend: Friend) => {
    toast({
      title: 'Notification settings updated',
      description: `You will ${friend.isOnline ? 'no longer' : 'now'} receive notifications from ${friend.name}`,
    });
  };

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
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                  >
                    {viewMode === 'list' ? (
                      <Grid className="h-4 w-4" />
                    ) : (
                      <List className="h-4 w-4" />
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
            
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-pixelated text-xs">Sort & Filter</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-pixelated text-xs">Sort By</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <DropdownMenuRadioItem value="name" className="font-pixelated text-xs cursor-pointer">
                    Name
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="recent" className="font-pixelated text-xs cursor-pointer">
                    Recently Added
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="online" className="font-pixelated text-xs cursor-pointer">
                    Online Status
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel className="font-pixelated text-xs">Filter</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={filterFavorites}
                  onCheckedChange={setFilterFavorites}
                  className="font-pixelated text-xs cursor-pointer"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Favorites Only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filterOnline}
                  onCheckedChange={setFilterOnline}
                  className="font-pixelated text-xs cursor-pointer"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                  Online Only
                </DropdownMenuCheckboxItem>
                
                {availableTags.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="font-pixelated text-xs">Filter by Tag</DropdownMenuLabel>
                    {availableTags.map(tag => (
                      <DropdownMenuCheckboxItem
                        key={tag.id}
                        checked={filterTags.includes(tag.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilterTags(prev => [...prev, tag.name]);
                          } else {
                            setFilterTags(prev => prev.filter(t => t !== tag.name));
                          }
                        }}
                        className="font-pixelated text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="relative max-w-sm">
              {isCrimson ? (
                <CrimsonSearchInput
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="font-pixelated text-xs h-8 w-[180px]"
                />
              ) : (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="font-pixelated text-xs h-8 pl-8 w-[180px]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div ref={tabsRef} className="sticky top-[57px] bg-background z-10 border-b">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`w-full grid grid-cols-4 p-0 h-auto bg-transparent ${isCrimson ? 'bg-red-50' : ''}`}>
              <TabsTrigger 
                value="friends" 
                className="font-pixelated text-xs relative py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Friends
                {friends.length > 0 && (
                  <Badge variant="secondary" className={`ml-2 h-5 px-1.5 text-xs ${isCrimson ? 'bg-red-100 text-red-700' : ''}`}>
                    {friends.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="requests" 
                className="font-pixelated text-xs relative py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Requests
                {requests.length > 0 && (
                  <Badge variant="destructive" className={`ml-2 h-5 px-1.5 text-xs animate-pulse ${isCrimson ? 'bg-red-600' : ''}`}>
                    {requests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="suggested" 
                className="font-pixelated text-xs relative py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Suggested
                {suggested.length > 0 && (
                  <Badge variant="outline" className="ml-2 h-5 px-1.5 text-xs">
                    {suggested.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="search" 
                className="font-pixelated text-xs relative py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Search
                {searchResults.length > 0 && (
                  <Badge variant="outline" className={`ml-2 h-5 px-1.5 text-xs ${isCrimson ? 'border-red-200 bg-red-50' : ''}`}>
                    {searchResults.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Applied Filters Summary */}
        {(filterFavorites || filterOnline || filterTags.length > 0) && activeTab === 'friends' && (
          <div className="p-3 bg-muted/20 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <p className="font-pixelated text-xs text-muted-foreground">
                  Filters:
                </p>
                <div className="flex flex-wrap gap-1">
                  {filterFavorites && (
                    <Badge variant="outline" className="h-5 px-1.5 text-xs font-pixelated flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      Favorites
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-3 w-3 ml-1 hover:bg-transparent p-0"
                        onClick={() => setFilterFavorites(false)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  )}
                  {filterOnline && (
                    <Badge variant="outline" className="h-5 px-1.5 text-xs font-pixelated flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      Online
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-3 w-3 ml-1 hover:bg-transparent p-0"
                        onClick={() => setFilterOnline(false)}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    </Badge>
                  )}
                  {filterTags.map(tag => {
                    const tagData = availableTags.find(t => t.name === tag);
                    return (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="h-5 px-1.5 text-xs font-pixelated flex items-center gap-1"
                      >
                        {tagData && (
                          <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: tagData.color }}
                          />
                        )}
                        {tag}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-3 w-3 ml-1 hover:bg-transparent p-0"
                          onClick={() => setFilterTags(prev => prev.filter(t => t !== tag))}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 font-pixelated text-xs"
                onClick={() => {
                  setFilterFavorites(false);
                  setFilterOnline(false);
                  setFilterTags([]);
                }}
              >
                Clear All
              </Button>
            </div>
          </div>
        )}

        <div className="h-[calc(100%-110px)] mt-0">
          <TabsContent value="friends" className="h-full m-0">
            <ScrollArea className="h-full px-3 scroll-container">
              {friends.length > 0 ? (
                <div className="space-y-3 pb-3">
                  {applyFilters(filterUsers(friends)).length > 0 ? (
                    viewMode === 'list' ? (
                      // List View
                      applyFilters(filterUsers(friends)).map((friend) => (
                        <Card key={friend.id} className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar 
                                  className={`w-12 h-12 cursor-pointer ${isCrimson ? 'border-2 border-red-200' : 'border-2 border-social-green'}`}
                                  onClick={() => handleUserClick(friend)}
                                >
                                  {friend.avatar ? (
                                    <AvatarImage src={friend.avatar} alt={friend.name} />
                                  ) : (
                                    <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                                      {friend.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                {friend.isOnline && (
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <h3 
                                    className="font-pixelated text-sm font-medium truncate cursor-pointer hover:text-social-green transition-colors"
                                    onClick={() => handleUserClick(friend)}
                                  >
                                    {friend.name}
                                  </h3>
                                  {friend.isFavorite && (
                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  )}
                                </div>
                                <p 
                                  className="font-pixelated text-xs text-muted-foreground truncate cursor-pointer hover:text-social-green transition-colors"
                                  onClick={() => handleUserClick(friend)}
                                >
                                  @{friend.username}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="font-pixelated text-xs text-muted-foreground">
                                    {friend.isOnline ? (
                                      <span className="text-green-500">Online</span>
                                    ) : (
                                      <span>Last active {friend.lastActive}</span>
                                    )}
                                  </p>
                                  
                                  {friend.mutualFriends > 0 && (
                                    <Badge variant="outline" className="h-4 px-1 text-[8px] font-pixelated">
                                      {friend.mutualFriends} mutual
                                    </Badge>
                                  )}
                                  
                                  {friend.tags && friend.tags.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Tag className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-pixelated text-xs text-muted-foreground">
                                        {friend.tags.length}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {friend.note && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Bookmark className="h-3 w-3 text-blue-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-pixelated text-xs max-w-[200px]">{friend.note}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <Button
                                  onClick={() => openChat(friend.id)}
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
                                      <SlidersHorizontal className="h-3 w-3 mr-1" />
                                      Manage
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={() => toggleFavorite(friend)}
                                      className="font-pixelated text-xs cursor-pointer"
                                    >
                                      <Star className={`h-3 w-3 mr-2 ${friend.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                      {friend.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedFriend(friend);
                                        setNoteText(friend.note || '');
                                        setShowNoteDialog(true);
                                      }}
                                      className="font-pixelated text-xs cursor-pointer"
                                    >
                                      <Pencil className="h-3 w-3 mr-2" />
                                      {friend.note ? 'Edit Note' : 'Add Note'}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem 
                                      onClick={() => handleManageTags(friend)}
                                      className="font-pixelated text-xs cursor-pointer"
                                    >
                                      <Tag className="h-3 w-3 mr-2" />
                                      Manage Tags
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem 
                                      onClick={() => toggleNotifications(friend)}
                                      className="font-pixelated text-xs cursor-pointer"
                                    >
                                      {friend.isOnline ? (
                                        <>
                                          <BellOff className="h-3 w-3 mr-2" />
                                          Mute Notifications
                                        </>
                                      ) : (
                                        <>
                                          <Bell className="h-3 w-3 mr-2" />
                                          Enable Notifications
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem 
                                      onClick={() => setShowRemoveDialog({show: true, friend})}
                                      className="font-pixelated text-xs text-destructive cursor-pointer"
                                    >
                                      <UserMinus className="h-3 w-3 mr-2" />
                                      Remove Friend
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      // Grid View
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-3">
                        {applyFilters(filterUsers(friends)).map((friend) => (
                          <Card key={friend.id} className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
                            <CardContent className="p-3 flex flex-col items-center text-center">
                              <div className="relative mb-2">
                                <Avatar 
                                  className={`w-16 h-16 cursor-pointer ${isCrimson ? 'border-2 border-red-200' : 'border-2 border-social-green'}`}
                                  onClick={() => handleUserClick(friend)}
                                >
                                  {friend.avatar ? (
                                    <AvatarImage src={friend.avatar} alt={friend.name} />
                                  ) : (
                                    <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                                      {friend.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                {friend.isOnline && (
                                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                )}
                                {friend.isFavorite && (
                                  <div className="absolute -top-1 -right-1">
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                  </div>
                                )}
                              </div>
                              
                              <h3 
                                className="font-pixelated text-sm font-medium truncate cursor-pointer hover:text-social-green transition-colors"
                                onClick={() => handleUserClick(friend)}
                              >
                                {friend.name}
                              </h3>
                              <p 
                                className="font-pixelated text-xs text-muted-foreground truncate cursor-pointer hover:text-social-green transition-colors"
                                onClick={() => handleUserClick(friend)}
                              >
                                @{friend.username}
                              </p>
                              
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <div className={`h-2 w-2 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <p className="font-pixelated text-xs text-muted-foreground">
                                  {friend.isOnline ? 'Online' : 'Offline'}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-1 mt-3">
                                <Button
                                  onClick={() => openChat(friend.id)}
                                  size="sm"
                                  className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs h-7 px-2`}
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  Chat
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="font-pixelated text-xs h-7 w-7 p-0"
                                    >
                                      <SlidersHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem 
                                      onClick={() => toggleFavorite(friend)}
                                      className="font-pixelated text-xs cursor-pointer"
                                    >
                                      <Star className={`h-3 w-3 mr-2 ${friend.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                      {friend.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedFriend(friend);
                                        setNoteText(friend.note || '');
                                        setShowNoteDialog(true);
                                      }}
                                      className="font-pixelated text-xs cursor-pointer"
                                    >
                                      <Pencil className="h-3 w-3 mr-2" />
                                      {friend.note ? 'Edit Note' : 'Add Note'}
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuItem 
                                      onClick={() => handleManageTags(friend)}
                                      className="font-pixelated text-xs cursor-pointer"
                                    >
                                      <Tag className="h-3 w-3 mr-2" />
                                      Manage Tags
                                    </DropdownMenuItem>
                                    
                                    <DropdownMenuSeparator />
                                    
                                    <DropdownMenuItem 
                                      onClick={() => setShowRemoveDialog({show: true, friend})}
                                      className="font-pixelated text-xs text-destructive cursor-pointer"
                                    >
                                      <UserMinus className="h-3 w-3 mr-2" />
                                      Remove
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Filter className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                      <h2 className="font-pixelated text-sm font-medium mb-2">No matching friends</h2>
                      <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                        No friends match your current filters. Try adjusting your search or filter settings.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilterFavorites(false);
                          setFilterOnline(false);
                          setFilterTags([]);
                          setSearchQuery('');
                        }}
                        className="mt-4 font-pixelated text-xs"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                    <h2 className="font-pixelated text-sm font-medium mb-2">
                      {searchQuery ? 'No friends found' : 'No friends yet'}
                    </h2>
                    <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                      {searchQuery 
                        ? 'Try adjusting your search terms'
                        : 'Start connecting with people by sending friend requests!'
                      }
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="requests" className="h-full m-0">
              <ScrollArea className="h-full px-3 scroll-container">
                {filterUsers(requests).length > 0 ? (
                  <div className="space-y-3 pb-3">
                    {filterUsers(requests).map((request) => (
                      <Card key={request.id} className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              className={`w-12 h-12 cursor-pointer ${isCrimson ? 'border-2 border-red-200' : 'border-2 border-social-green'}`}
                              onClick={() => handleUserClick(request)}
                            >
                              {request.avatar ? (
                                <AvatarImage src={request.avatar} alt={request.name} />
                              ) : (
                                <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                                  {request.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <h3 
                                className="font-pixelated text-sm font-medium truncate cursor-pointer hover:text-social-green transition-colors"
                                onClick={() => handleUserClick(request)}
                              >
                                {request.name}
                              </h3>
                              <p 
                                className="font-pixelated text-xs text-muted-foreground truncate cursor-pointer hover:text-social-green transition-colors"
                                onClick={() => handleUserClick(request)}
                              >
                                @{request.username}
                              </p>
                              <p className="font-pixelated text-xs text-muted-foreground">
                                Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                              </p>
                            </div>

                            <div className="flex flex-col gap-1">
                              <Button
                                onClick={() => acceptFriendRequest(request)}
                                size="sm"
                                disabled={processingRequest === request.id}
                                className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs h-6`}
                              >
                                <UserCheck className="h-3 w-3 mr-1" />
                                {processingRequest === request.id ? 'Processing...' : 'Accept'}
                              </Button>
                              <Button
                                onClick={() => rejectFriendRequest(request)}
                                size="sm"
                                variant="destructive"
                                disabled={processingRequest === request.id}
                                className="font-pixelated text-xs h-6"
                              >
                                <X className="h-3 w-3 mr-1" />
                                {processingRequest === request.id ? 'Processing...' : 'Reject'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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

            <TabsContent value="suggested" className="h-full m-0">
              <ScrollArea className="h-full px-3 scroll-container">
                {filterUsers(suggested).length > 0 ? (
                  <div className="space-y-3 pb-3">
                    {filterUsers(suggested).map((suggestion) => (
                      <Card key={suggestion.id} className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              className={`w-12 h-12 cursor-pointer ${isCrimson ? 'border-2 border-red-200' : 'border-2 border-social-green'}`}
                              onClick={() => handleUserClick(suggestion)}
                            >
                              {suggestion.avatar ? (
                                <AvatarImage src={suggestion.avatar} alt={suggestion.name} />
                              ) : (
                                <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                                  {suggestion.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <h3 
                                className="font-pixelated text-sm font-medium truncate cursor-pointer hover:text-social-green transition-colors"
                                onClick={() => handleUserClick(suggestion)}
                              >
                                {suggestion.name}
                              </h3>
                              <p 
                                className="font-pixelated text-xs text-muted-foreground truncate cursor-pointer hover:text-social-green transition-colors"
                                onClick={() => handleUserClick(suggestion)}
                              >
                                @{suggestion.username}
                              </p>
                              <p className="font-pixelated text-xs text-muted-foreground">
                                Joined {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                              </p>
                              
                              {suggestion.mutualFriends > 0 && (
                                <Badge variant="outline" className="mt-1 h-5 px-1.5 text-xs font-pixelated">
                                  {suggestion.mutualFriends} mutual friend{suggestion.mutualFriends !== 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-col gap-1">
                              <Button
                                onClick={() => sendFriendRequest(suggestion.id)}
                                size="sm"
                                className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-blue hover:bg-social-blue/90'} text-white font-pixelated text-xs h-6`}
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Add Friend
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="search" className="h-full m-0">
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
                      <Card key={user.id} className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar 
                              className={`w-12 h-12 cursor-pointer ${isCrimson ? 'border-2 border-red-200' : 'border-2 border-social-green'}`}
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
                            
                            <div className="flex-1 min-w-0">
                              <h3 
                                className="font-pixelated text-sm font-medium truncate cursor-pointer hover:text-social-green transition-colors"
                                onClick={() => handleUserClick(user)}
                              >
                                {user.name}
                              </h3>
                              <p 
                                className="font-pixelated text-xs text-muted-foreground truncate cursor-pointer hover:text-social-green transition-colors"
                                onClick={() => handleUserClick(user)}
                              >
                                @{user.username}
                              </p>
                              <p className="font-pixelated text-xs text-muted-foreground">
                                Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                              </p>
                              
                              {user.mutualFriends > 0 && (
                                <Badge variant="outline" className="mt-1 h-5 px-1.5 text-xs font-pixelated">
                                  {user.mutualFriends} mutual friend{user.mutualFriends !== 1 ? 's' : ''}
                                </Badge>
                              )}
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
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </div>

        {/* Remove Friend Confirmation Dialog */}
        <AlertDialog open={showRemoveDialog.show} onOpenChange={(open) => setShowRemoveDialog({...showRemoveDialog, show: open})}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-pixelated text-sm flex items-center gap-2">
                <UserMinus className="h-4 w-4 text-destructive" />
                Remove Friend
              </AlertDialogTitle>
              <AlertDialogDescription className="font-pixelated text-xs">
                Are you sure you want to remove {showRemoveDialog.friend?.name} from your friends list? 
                You'll need to send a new friend request if you want to connect again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveFriend}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
                disabled={!!removingFriend}
              >
                {removingFriend ? 'Removing...' : 'Remove'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Add/Edit Note Dialog */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-sm">
                {selectedFriend?.note ? 'Edit Note' : 'Add Note'}
              </DialogTitle>
              <DialogDescription className="font-pixelated text-xs">
                Add a private note about {selectedFriend?.name}. Only you can see this note.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                className="font-pixelated text-xs min-h-[100px]"
              />
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNoteDialog(false)}
                className="font-pixelated text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddNote}
                className={`font-pixelated text-xs ${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white`}
                disabled={!noteText.trim()}
              >
                Save Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Manage Tags Dialog */}
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-pixelated text-sm">
                Manage Tags for {selectedFriend?.name}
              </DialogTitle>
              <DialogDescription className="font-pixelated text-xs">
                Add tags to categorize your friends. Tags help you filter and organize your connections.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="font-pixelated text-xs font-medium">Available Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => {
                    const isSelected = selectedFriend?.tags?.includes(tag.name);
                    return (
                      <Badge 
                        key={tag.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer h-6 px-2 font-pixelated text-xs"
                        style={{
                          backgroundColor: isSelected ? tag.color : 'transparent',
                          borderColor: tag.color,
                          color: isSelected ? 'white' : undefined
                        }}
                        onClick={() => {
                          // Toggle tag selection
                          if (!selectedFriend) return;
                          
                          const updatedTags = isSelected
                            ? selectedFriend.tags?.filter(t => t !== tag.name) || []
                            : [...(selectedFriend.tags || []), tag.name];
                            
                          setFriends(prev => 
                            prev.map(f => 
                              f.id === selectedFriend.id ? { ...f, tags: updatedTags } : f
                            )
                          );
                          
                          setSelectedFriend({
                            ...selectedFriend,
                            tags: updatedTags
                          });
                          
                          // Update in database
                          if (isSelected) {
                            // Remove tag assignment
                            supabase
                              .from('friend_tag_assignments')
                              .delete()
                              .eq('user_id', currentUser.id)
                              .eq('friend_id', selectedFriend.id)
                              .eq('tag_id', tag.id)
                              .then(() => {
                                console.log('Tag removed');
                              })
                              .catch(error => {
                                console.error('Error removing tag:', error);
                              });
                          } else {
                            // Add tag assignment
                            supabase
                              .from('friend_tag_assignments')
                              .insert({
                                user_id: currentUser.id,
                                friend_id: selectedFriend.id,
                                tag_id: tag.id
                              })
                              .then(() => {
                                console.log('Tag added');
                              })
                              .catch(error => {
                                console.error('Error adding tag:', error);
                              });
                          }
                        }}
                      >
                        {tag.name}
                        {isSelected && (
                          <Check className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-pixelated text-xs font-medium">Current Tags</h3>
                {selectedFriend?.tags && selectedFriend.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedFriend.tags.map(tagName => {
                      const tagData = availableTags.find(t => t.name === tagName);
                      return (
                        <Badge 
                          key={tagName}
                          className="h-6 px-2 font-pixelated text-xs"
                          style={{
                            backgroundColor: tagData?.color || '#888888',
                            color: 'white'
                          }}
                        >
                          {tagName}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 ml-1 p-0 hover:bg-transparent"
                            onClick={() => {
                              if (!selectedFriend) return;
                              
                              const updatedTags = selectedFriend.tags?.filter(t => t !== tagName) || [];
                              
                              setFriends(prev => 
                                prev.map(f => 
                                  f.id === selectedFriend.id ? { ...f, tags: updatedTags } : f
                                )
                              );
                              
                              setSelectedFriend({
                                ...selectedFriend,
                                tags: updatedTags
                              });
                              
                              // Remove from database
                              const tagData = availableTags.find(t => t.name === tagName);
                              if (tagData) {
                                supabase
                                  .from('friend_tag_assignments')
                                  .delete()
                                  .eq('user_id', currentUser.id)
                                  .eq('friend_id', selectedFriend.id)
                                  .eq('tag_id', tagData.id)
                                  .then(() => {
                                    console.log('Tag removed');
                                  })
                                  .catch(error => {
                                    console.error('Error removing tag:', error);
                                  });
                              }
                            }}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <p className="font-pixelated text-xs text-muted-foreground">
                    No tags assigned yet. Select from available tags above.
                  </p>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTagDialog(false)}
                className="font-pixelated text-xs"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* User Profile Dialog */}
        <UserProfileDialog
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          user={selectedFriend}
        />
      </div>
    </DashboardLayout>
  );
}

export default Friends;