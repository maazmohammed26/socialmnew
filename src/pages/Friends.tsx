import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, UserCheck, MessageCircle, UserMinus, Clock, X, AlertTriangle, Search, Star, Filter, Grid2X2, List, SortAsc, Tag, Heart, Bookmark, Pencil } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  tags?: string[];
  note?: string;
  mutualFriends?: number;
  lastActive?: string;
  isOnline?: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  created_at: string;
  isFriend: boolean;
  isPending: boolean;
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'online'>('name');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterOnline, setFilterOnline] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [friendTags, setFriendTags] = useState<FriendTag[]>([]);
  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [noteText, setNoteText] = useState('');
  const [showManageTagsDialog, setShowManageTagsDialog] = useState(false);
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
      fetchFriendTags();
      
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

      // Get favorite friends
      const { data: favoritesData } = await supabase
        .from('favorite_friends')
        .select('friend_id')
        .eq('user_id', currentUser.id);
        
      const favoriteIds = new Set((favoritesData || []).map(f => f.friend_id));

      // Get friend notes
      const { data: notesData } = await supabase
        .from('friend_notes')
        .select('friend_id, note')
        .eq('user_id', currentUser.id);
        
      const notesMap = (notesData || []).reduce((map, item) => {
        map[item.friend_id] = item.note;
        return map;
      }, {});
      
      // Get friend tags
      const { data: tagAssignmentsData } = await supabase
        .from('friend_tag_assignments')
        .select(`
          friend_id,
          tag:friend_tags(id, name, color)
        `)
        .eq('user_id', currentUser.id);
        
      const tagsMap = {};
      (tagAssignmentsData || []).forEach(item => {
        if (!tagsMap[item.friend_id]) {
          tagsMap[item.friend_id] = [];
        }
        if (item.tag) {
          tagsMap[item.friend_id].push(item.tag.name);
        }
      });

      // Simulate online status and last active time
      const getRandomOnlineStatus = (id) => {
        // Use the first character of the ID to determine online status
        // This ensures consistent behavior for the same user
        return id.charAt(0) < 'd';
      };
      
      const getRandomLastActive = (id) => {
        // Use the second character of the ID to determine last active time
        // This ensures consistent behavior for the same user
        const char = id.charAt(1);
        const minutes = (char.charCodeAt(0) % 10) * 10;
        const date = new Date();
        date.setMinutes(date.getMinutes() - minutes);
        return date.toISOString();
      };
      
      // Get mutual friends counts
      const friendsList = await Promise.all(data.map(async friendship => {
        const isCurrentUserSender = friendship.sender_id === currentUser.id;
        const friendProfile = isCurrentUserSender 
          ? friendship.receiver_profile 
          : friendship.sender_profile;
          
        const friendId = friendProfile.id;
        
        // Get mutual friends count
        const { data: mutualCount } = await supabase.rpc('get_mutual_friends_count', {
          user_uuid: currentUser.id,
          friend_uuid: friendId
        });
        
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
          isFavorite: favoriteIds.has(friendId),
          note: notesMap[friendId] || '',
          tags: tagsMap[friendId] || [],
          mutualFriends: mutualCount || 0,
          isOnline: getRandomOnlineStatus(friendId),
          lastActive: getRandomLastActive(friendId)
        };
      }));

      console.log('Processed friends list:', friendsList);
      
      // Apply sorting
      const sortedFriends = sortFriends(friendsList, sortBy);
      
      // Apply filters
      const filteredFriends = filterFriends(sortedFriends);
      
      setFriends(filteredFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
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

      // Try to get users with mutual friends first
      const { data: mutualFriendsData } = await supabase.rpc('get_mutual_friends_suggestions', {
        user_uuid: currentUser.id,
        limit_count: 5
      });
      
      let suggestedList = [];
      
      if (mutualFriendsData && mutualFriendsData.length > 0) {
        // Convert to our Friend interface
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
      
      // If we don't have enough suggestions, add some random users
      if (suggestedList.length < 5) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, username, avatar, created_at')
          .not('id', 'in', `(${Array.from(connectedUserIds).join(',')})`)
          .limit(5 - suggestedList.length);

        if (error) throw error;

        const randomSuggestions = data?.map(profile => ({
          id: profile.id,
          name: profile.name,
          username: profile.username,
          avatar: profile.avatar,
          status: 'suggested' as const,
          created_at: profile.created_at,
          mutualFriends: 0
        })) || [];
        
        suggestedList = [...suggestedList, ...randomSuggestions];
      }

      setSuggested(suggestedList);
    } catch (error) {
      console.error('Error fetching suggested friends:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFriendTags = async () => {
    try {
      if (!currentUser) return;
      
      const { data, error } = await supabase
        .from('friend_tags')
        .select('id, name, color')
        .eq('user_id', currentUser.id);
        
      if (error) throw error;
      
      setFriendTags(data || []);
    } catch (error) {
      console.error('Error fetching friend tags:', error);
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

          return {
            ...user,
            isFriend: !!friendData,
            isPending: !!pendingData
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
        const { error } = await supabase
          .from('favorite_friends')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', friend.id);
          
        if (error) throw error;
        
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
        const { error } = await supabase
          .from('favorite_friends')
          .insert({
            user_id: currentUser.id,
            friend_id: friend.id
          });
          
        if (error) throw error;
        
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
      const { data } = await supabase
        .from('friend_notes')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('friend_id', selectedFriend.id)
        .maybeSingle();
        
      if (data) {
        // Update existing note
        await supabase
          .from('friend_notes')
          .update({ 
            note: noteText,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id);
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
      
      setShowAddNoteDialog(false);
      setNoteText('');
      setSelectedFriend(null);
      
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
  
  const handleManageTags = async (friend: Friend, tagName: string, isAdding: boolean) => {
    try {
      const tag = friendTags.find(t => t.name === tagName);
      if (!tag) return;
      
      if (isAdding) {
        // Add tag to friend
        await supabase
          .from('friend_tag_assignments')
          .insert({
            user_id: currentUser.id,
            friend_id: friend.id,
            tag_id: tag.id
          });
          
        // Update local state
        setFriends(prev => 
          prev.map(f => 
            f.id === friend.id 
              ? { ...f, tags: [...(f.tags || []), tagName] } 
              : f
          )
        );
      } else {
        // Remove tag from friend
        await supabase
          .from('friend_tag_assignments')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', friend.id)
          .eq('tag_id', tag.id);
          
        // Update local state
        setFriends(prev => 
          prev.map(f => 
            f.id === friend.id 
              ? { ...f, tags: (f.tags || []).filter(t => t !== tagName) } 
              : f
          )
        );
      }
      
      toast({
        title: isAdding ? 'Tag added' : 'Tag removed',
        description: `Tag has been ${isAdding ? 'added to' : 'removed from'} ${friend.name}`,
      });
    } catch (error) {
      console.error('Error managing tags:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update tags',
      });
    }
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
  
  const sortFriends = (friendsList: Friend[], sortType: string) => {
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
  
  const filterFriends = (friendsList: Friend[]) => {
    let filtered = [...friendsList];
    
    // Filter by favorites
    if (filterFavorites) {
      filtered = filtered.filter(friend => friend.isFavorite);
    }
    
    // Filter by online status
    if (filterOnline) {
      filtered = filtered.filter(friend => friend.isOnline);
    }
    
    // Filter by tags
    if (filterTags.length > 0) {
      filtered = filtered.filter(friend => {
        if (!friend.tags || friend.tags.length === 0) return false;
        return filterTags.some(tag => friend.tags.includes(tag));
      });
    }
    
    return filtered;
  };
  
  const hasActiveFilters = filterFavorites || filterOnline || filterTags.length > 0;
  
  const clearFilters = () => {
    setFilterFavorites(false);
    setFilterOnline(false);
    setFilterTags([]);
    
    toast({
      title: 'Filters cleared',
      description: 'All filters have been reset',
    });
  };

  const FriendCard = ({ friend, type }: { friend: Friend; type: 'friend' | 'request' | 'suggested' }) => {
    const isOnline = friend.isOnline;
    const hasTags = friend.tags && friend.tags.length > 0;
    const hasNote = friend.note && friend.note.length > 0;
    
    if (viewMode === 'grid' && type === 'friend') {
      return (
        <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
          <CardContent className="p-4 flex flex-col items-center text-center">
            <div className="relative mb-2">
              <Avatar className={`w-16 h-16 ${isCrimson ? 'border-2 border-red-200' : 'border-2 border-social-green'}`}>
                {friend.avatar ? (
                  <AvatarImage src={friend.avatar} alt={friend.name} />
                ) : (
                  <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                    {friend.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              
              {/* Online status indicator */}
              <div className="absolute bottom-0 right-0">
                <div className={`w-3 h-3 rounded-full border border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
              
              {/* Favorite indicator */}
              {friend.isFavorite && (
                <div className="absolute -top-1 -right-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
              )}
            </div>
            
            <h3 className="font-pixelated text-sm font-medium mb-1">{friend.name}</h3>
            <p className="font-pixelated text-xs text-muted-foreground mb-2">@{friend.username}</p>
            
            {/* Tags */}
            {hasTags && (
              <div className="flex flex-wrap justify-center gap-1 mb-2">
                {friend.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[8px] h-4 px-1 font-pixelated">
                    {tag}
                  </Badge>
                ))}
                {friend.tags.length > 2 && (
                  <Badge variant="outline" className="text-[8px] h-4 px-1 font-pixelated">
                    +{friend.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
            
            {/* Mutual friends */}
            {friend.mutualFriends > 0 && (
              <p className="font-pixelated text-xs text-muted-foreground mb-2">
                {friend.mutualFriends} mutual friend{friend.mutualFriends !== 1 ? 's' : ''}
              </p>
            )}
            
            <div className="flex gap-1 mt-2">
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
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 font-pixelated text-xs"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => toggleFavorite(friend)}
                    className="font-pixelated text-xs cursor-pointer"
                  >
                    {friend.isFavorite ? (
                      <>
                        <Star className="h-3 w-3 mr-2 fill-yellow-500 text-yellow-500" />
                        Remove from favorites
                      </>
                    ) : (
                      <>
                        <Star className="h-3 w-3 mr-2" />
                        Add to favorites
                      </>
                    )}
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      setSelectedFriend(friend);
                      setNoteText(friend.note || '');
                      setShowAddNoteDialog(true);
                    }}
                    className="font-pixelated text-xs cursor-pointer"
                  >
                    <Pencil className="h-3 w-3 mr-2" />
                    {hasNote ? 'Edit note' : 'Add note'}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuLabel className="font-pixelated text-xs">
                    <Tag className="h-3 w-3 mr-2 inline-block" />
                    Tags
                  </DropdownMenuLabel>
                  
                  {friendTags.map(tag => (
                    <DropdownMenuCheckboxItem
                      key={tag.id}
                      checked={friend.tags?.includes(tag.name)}
                      onCheckedChange={(checked) => handleManageTags(friend, tag.name, checked)}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      <div className="flex items-center">
                        <div 
                          className="w-2 h-2 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        {tag.name}
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={() => setShowRemoveDialog({show: true, friend})}
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
    }
    
    return (
      <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className={`w-12 h-12 ${isCrimson ? 'border-2 border-red-200' : 'border-2 border-social-green'}`}>
                {friend.avatar ? (
                  <AvatarImage src={friend.avatar} alt={friend.name} />
                ) : (
                  <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                    {friend.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              
              {/* Online status indicator for friends */}
              {type === 'friend' && (
                <div className="absolute -bottom-1 -right-1">
                  <div className={`w-3 h-3 rounded-full border border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
              )}
              
              {/* Favorite indicator */}
              {type === 'friend' && friend.isFavorite && (
                <div className="absolute -top-1 -right-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="font-pixelated text-sm font-medium truncate">{friend.name}</h3>
                {type === 'friend' && friend.isFavorite && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              <p className="font-pixelated text-xs text-muted-foreground truncate">@{friend.username}</p>
              
              {/* Tags */}
              {type === 'friend' && hasTags && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {friend.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[8px] h-4 px-1 font-pixelated">
                      {tag}
                    </Badge>
                  ))}
                  {friend.tags.length > 2 && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1 font-pixelated">
                      +{friend.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Note indicator */}
              {type === 'friend' && hasNote && (
                <div className="flex items-center gap-1 mt-1">
                  <Pencil className="h-2 w-2 text-muted-foreground" />
                  <p className="font-pixelated text-xs text-muted-foreground truncate">
                    {friend.note.length > 20 ? `${friend.note.substring(0, 20)}...` : friend.note}
                  </p>
                </div>
              )}
              
              {/* Mutual friends for suggested */}
              {type === 'suggested' && friend.mutualFriends > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-2 w-2 text-social-blue" />
                  <p className="font-pixelated text-xs text-social-blue">
                    {friend.mutualFriends} mutual friend{friend.mutualFriends !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
              
              {/* Time info */}
              <p className="font-pixelated text-xs text-muted-foreground mt-1">
                {type === 'friend' ? (
                  isOnline ? 'Online now' : `Last seen ${formatDistanceToNow(new Date(friend.lastActive), { addSuffix: true })}` 
                ) : type === 'request' ? (
                  `Requested ${formatDistanceToNow(new Date(friend.created_at), { addSuffix: true })}`
                ) : (
                  `Joined ${formatDistanceToNow(new Date(friend.created_at), { addSuffix: true })}`
                )}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {type === 'friend' && (
                <>
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
                        variant="outline"
                        size="sm"
                        className="h-6 font-pixelated text-xs"
                      >
                        <MoreVertical className="h-3 w-3 mr-1" />
                        Options
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => toggleFavorite(friend)}
                        className="font-pixelated text-xs cursor-pointer"
                      >
                        {friend.isFavorite ? (
                          <>
                            <Star className="h-3 w-3 mr-2 fill-yellow-500 text-yellow-500" />
                            Remove from favorites
                          </>
                        ) : (
                          <>
                            <Star className="h-3 w-3 mr-2" />
                            Add to favorites
                          </>
                        )}
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedFriend(friend);
                          setNoteText(friend.note || '');
                          setShowAddNoteDialog(true);
                        }}
                        className="font-pixelated text-xs cursor-pointer"
                      >
                        <Pencil className="h-3 w-3 mr-2" />
                        {hasNote ? 'Edit note' : 'Add note'}
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="font-pixelated text-xs">
                        <Tag className="h-3 w-3 mr-2 inline-block" />
                        Tags
                      </DropdownMenuLabel>
                      
                      {friendTags.map(tag => (
                        <DropdownMenuCheckboxItem
                          key={tag.id}
                          checked={friend.tags?.includes(tag.name)}
                          onCheckedChange={(checked) => handleManageTags(friend, tag.name, checked)}
                          className="font-pixelated text-xs cursor-pointer"
                        >
                          <div className="flex items-center">
                            <div 
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: tag.color }}
                            ></div>
                            {tag.name}
                          </div>
                        </DropdownMenuCheckboxItem>
                      ))}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => setShowRemoveDialog({show: true, friend})}
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
                    onClick={() => acceptFriendRequest(friend)}
                    size="sm"
                    disabled={processingRequest === friend.id}
                    className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs h-6`}
                  >
                    <UserCheck className="h-3 w-3 mr-1" />
                    {processingRequest === friend.id ? 'Processing...' : 'Accept'}
                  </Button>
                  <Button
                    onClick={() => rejectFriendRequest(friend)}
                    size="sm"
                    variant="destructive"
                    disabled={processingRequest === friend.id}
                    className="font-pixelated text-xs h-6"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {processingRequest === friend.id ? 'Processing...' : 'Reject'}
                  </Button>
                </>
              )}
              
              {type === 'suggested' && (
                <Button
                  onClick={() => sendFriendRequest(friend.id)}
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
  };

  const SearchResultCard = ({ user }: { user: SearchResult }) => (
    <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className={`w-12 h-12 ${isCrimson ? 'border-2 border-red-200' : 'border-2 border-social-green'}`}>
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : (
              <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-pixelated text-sm font-medium truncate">{user.name}</h3>
            <p className="font-pixelated text-xs text-muted-foreground truncate">@{user.username}</p>
            <p className="font-pixelated text-xs text-muted-foreground">
              Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </p>
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
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
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
                      <Grid2X2 className="h-4 w-4" />
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
            
            {/* Sort Dropdown */}
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
                        <SortAsc className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-pixelated text-xs">Sort Friends</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-pixelated text-xs">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => {
                  setSortBy(value as any);
                  // Re-sort friends
                  setFriends(prev => sortFriends([...prev], value as any));
                }}>
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
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Filter Dropdown */}
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={hasActiveFilters ? "default" : "outline"}
                        size="icon"
                        className={`h-8 w-8 ${hasActiveFilters ? (isCrimson ? 'bg-red-600' : 'bg-social-green') : ''}`}
                      >
                        <Filter className="h-4 w-4" />
                        {hasActiveFilters && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white"></span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-pixelated text-xs">Filter Friends</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-pixelated text-xs">Filter Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuCheckboxItem
                  checked={filterFavorites}
                  onCheckedChange={setFilterFavorites}
                  className="font-pixelated text-xs cursor-pointer"
                >
                  <Star className="h-3 w-3 mr-2" />
                  Favorites Only
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuCheckboxItem
                  checked={filterOnline}
                  onCheckedChange={setFilterOnline}
                  className="font-pixelated text-xs cursor-pointer"
                >
                  <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                  Online Only
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-pixelated text-xs">
                  <Tag className="h-3 w-3 mr-2 inline-block" />
                  Filter by Tags
                </DropdownMenuLabel>
                
                {friendTags.map(tag => (
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
                    <div className="flex items-center">
                      <div 
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: tag.color }}
                      ></div>
                      {tag.name}
                    </div>
                  </DropdownMenuCheckboxItem>
                ))}
                
                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={clearFilters}
                      className="font-pixelated text-xs cursor-pointer text-destructive"
                    >
                      <X className="h-3 w-3 mr-2" />
                      Clear All Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-background">
          <div className="relative max-w-full">
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
          
          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              <span className="font-pixelated text-xs text-muted-foreground">Filters:</span>
              
              {filterFavorites && (
                <Badge variant="outline" className="h-5 font-pixelated text-xs flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  Favorites
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-3 w-3 ml-1 hover:bg-muted/50"
                    onClick={() => setFilterFavorites(false)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}
              
              {filterOnline && (
                <Badge variant="outline" className="h-5 font-pixelated text-xs flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Online
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-3 w-3 ml-1 hover:bg-muted/50"
                    onClick={() => setFilterOnline(false)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )}
              
              {filterTags.map(tag => (
                <Badge key={tag} variant="outline" className="h-5 font-pixelated text-xs flex items-center gap-1">
                  <Tag className="h-2 w-2" />
                  {tag}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-3 w-3 ml-1 hover:bg-muted/50"
                    onClick={() => setFilterTags(prev => prev.filter(t => t !== tag))}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 px-2 font-pixelated text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-180px)]">
          <TabsList className="grid w-full grid-cols-4 mx-3 mt-3 bg-muted">
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
              {filterUsers(friends).length > 0 ? (
                <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : 'space-y-3'} pb-3`}>
                  {filterUsers(friends).map((friend) => (
                    <FriendCard key={friend.id} friend={friend} type="friend" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {hasActiveFilters 
                      ? 'No friends match your filters' 
                      : searchQuery 
                        ? 'No friends found' 
                        : 'No friends yet'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {hasActiveFilters 
                      ? 'Try adjusting your filter settings or clear all filters'
                      : searchQuery 
                        ? 'Try adjusting your search terms'
                        : 'Start connecting with people by sending friend requests!'}
                  </p>
                  
                  {hasActiveFilters && (
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      size="sm"
                      className="mt-4 font-pixelated text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear Filters
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
                    <FriendCard key={request.id} friend={request} type="request" />
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
                      : 'When people send you friend requests, they\'ll appear here.'}
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
                    <FriendCard key={suggestion.id} friend={suggestion} type="suggested" />
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
                      : 'Check back later for new friend suggestions!'}
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="h-[calc(100%-60px)] mt-3">
            <ScrollArea className="h-full px-3 scroll-container">
              <UserSearch />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Remove Friend Confirmation */}
      <AlertDialog open={showRemoveDialog.show} onOpenChange={(open) => setShowRemoveDialog({show: open, friend: showRemoveDialog.friend})}>
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
      <Dialog open={showAddNoteDialog} onOpenChange={setShowAddNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-sm">
              {selectedFriend?.note ? 'Edit Note' : 'Add Note'}
            </DialogTitle>
            <DialogDescription className="font-pixelated text-xs">
              {selectedFriend?.note 
                ? 'Update your personal note about this friend.' 
                : 'Add a personal note about this friend. Only you can see this.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-10 h-10">
                {selectedFriend?.avatar ? (
                  <AvatarImage src={selectedFriend.avatar} alt={selectedFriend?.name} />
                ) : (
                  <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-xs`}>
                    {selectedFriend?.name.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-pixelated text-sm font-medium">{selectedFriend?.name}</p>
                <p className="font-pixelated text-xs text-muted-foreground">@{selectedFriend?.username}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="note" className="font-pixelated text-xs">Note</Label>
              <Textarea
                id="note"
                placeholder="Write your personal note here..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="font-pixelated text-xs min-h-[100px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddNoteDialog(false)}
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs`}
              disabled={!noteText.trim()}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function MoreVertical({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

export default Friends;