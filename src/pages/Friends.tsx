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
  Star, 
  Tag, 
  Filter, 
  LayoutGrid, 
  List, 
  SortAsc, 
  SortDesc, 
  Heart, 
  Bell, 
  BellOff, 
  Pencil, 
  Trash, 
  Plus, 
  Settings 
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserSearch } from '@/components/dashboard/UserSearch';

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
  lastActive?: string;
  isOnline?: boolean;
  note?: string;
  notificationsEnabled?: boolean;
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
  const [sortOption, setSortOption] = useState<'name' | 'recent' | 'activity'>('recent');
  const [filterOptions, setFilterOptions] = useState<{
    favorites: boolean;
    online: boolean;
    tags: string[];
  }>({
    favorites: false,
    online: false,
    tags: []
  });
  const [friendTags, setFriendTags] = useState<FriendTag[]>([]);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showTagsDialog, setShowTagsDialog] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
      
      // Get friend tag assignments
      const { data: tagAssignmentsData } = await supabase
        .from('friend_tag_assignments')
        .select(`
          friend_id,
          tag_id,
          friend_tags:tag_id(name)
        `)
        .eq('user_id', currentUser.id);
        
      const tagsMap = {};
      (tagAssignmentsData || []).forEach(assignment => {
        if (!tagsMap[assignment.friend_id]) {
          tagsMap[assignment.friend_id] = [];
        }
        tagsMap[assignment.friend_id].push(assignment.friend_tags.name);
      });

      const friendsList = data?.map(friendship => {
        const isCurrentUserSender = friendship.sender_id === currentUser.id;
        const friendProfile = isCurrentUserSender 
          ? friendship.receiver_profile 
          : friendship.sender_profile;
        
        const friendId = friendProfile.id;
        
        // Simulate online status and last active time
        const isOnline = friendId.charAt(0) < 'd';
        const lastActive = isOnline ? 'now' : `${Math.floor(Math.random() * 24) + 1}h ago`;
        
        // Simulate notification settings
        const notificationsEnabled = friendId.charAt(1) > 'c';
        
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
          isFavorite: favoriteIds.has(friendProfile.id),
          tags: tagsMap[friendProfile.id] || [],
          note: notesMap[friendProfile.id] || '',
          isOnline,
          lastActive,
          notificationsEnabled
        };
      }) || [];

      console.log('Processed friends list:', friendsList);
      
      // Sort friends based on the selected option
      const sortedFriends = sortFriends(friendsList, sortOption);
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

      // Try to get users with mutual friends first
      const { data: mutualFriendsData } = await supabase.rpc('get_mutual_friends', {
        user_uuid: currentUser.id,
        limit_count: 5
      });
      
      let suggestedList: Friend[] = [];
      
      if (mutualFriendsData && mutualFriendsData.length > 0) {
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
      
      // If we don't have enough suggestions with mutual friends, add some random users
      if (suggestedList.length < 5) {
        const excludeIds = [...connectedUserIds, ...suggestedList.map(u => u.id)];
        const excludeIdsString = excludeIds.map(id => `'${id}'`).join(',');
        
        const { data: randomUsers } = await supabase
          .from('profiles')
          .select('id, name, username, avatar, created_at')
          .not('id', 'in', `(${excludeIdsString})`)
          .limit(5 - suggestedList.length);
          
        if (randomUsers) {
          const randomSuggestions = randomUsers.map(user => ({
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            status: 'suggested' as const,
            created_at: user.created_at
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
      
      setShowRemoveDialog({show: false, friend: null});
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
        setFriends(prev => prev.map(f => 
          f.id === friend.id ? {...f, isFavorite: false} : f
        ));
        
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
        setFriends(prev => prev.map(f => 
          f.id === friend.id ? {...f, isFavorite: true} : f
        ));
        
        toast({
          title: 'Added to favorites',
          description: `${friend.name} has been added to your favorites`,
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
  
  const toggleNotifications = async (friend: Friend) => {
    try {
      // In a real app, this would update a notifications setting in the database
      // For now, we'll just update the local state
      setFriends(prev => prev.map(f => 
        f.id === friend.id ? {...f, notificationsEnabled: !f.notificationsEnabled} : f
      ));
      
      toast({
        title: friend.notificationsEnabled ? 'Notifications disabled' : 'Notifications enabled',
        description: friend.notificationsEnabled 
          ? `You won't receive notifications from ${friend.name}` 
          : `You'll now receive notifications from ${friend.name}`,
      });
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update notification settings',
      });
    }
  };
  
  const openNoteDialog = (friend: Friend) => {
    setSelectedFriend(friend);
    setNoteText(friend.note || '');
    setShowNoteDialog(true);
  };
  
  const saveNote = async () => {
    if (!selectedFriend) return;
    
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
      setFriends(prev => prev.map(f => 
        f.id === selectedFriend.id ? {...f, note: noteText} : f
      ));
      
      setShowNoteDialog(false);
      
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
  
  const openTagsDialog = (friend: Friend) => {
    setSelectedFriend(friend);
    setSelectedTags(friend.tags || []);
    setShowTagsDialog(true);
  };
  
  const saveTags = async () => {
    if (!selectedFriend) return;
    
    try {
      // First, remove all existing tag assignments
      await supabase
        .from('friend_tag_assignments')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('friend_id', selectedFriend.id);
        
      // Then add new tag assignments
      if (selectedTags.length > 0) {
        // Get tag IDs
        const { data: tagData } = await supabase
          .from('friend_tags')
          .select('id, name')
          .eq('user_id', currentUser.id)
          .in('name', selectedTags);
          
        if (tagData && tagData.length > 0) {
          const tagAssignments = tagData.map(tag => ({
            user_id: currentUser.id,
            friend_id: selectedFriend.id,
            tag_id: tag.id
          }));
          
          await supabase
            .from('friend_tag_assignments')
            .insert(tagAssignments);
        }
      }
      
      // Update local state
      setFriends(prev => prev.map(f => 
        f.id === selectedFriend.id ? {...f, tags: selectedTags} : f
      ));
      
      setShowTagsDialog(false);
      
      toast({
        title: 'Tags updated',
        description: 'Friend tags have been updated successfully',
      });
    } catch (error) {
      console.error('Error saving tags:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update tags',
      });
    }
  };
  
  const createNewTag = async (name: string, color: string) => {
    try {
      const { data, error } = await supabase
        .from('friend_tags')
        .insert({
          user_id: currentUser.id,
          name,
          color
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setFriendTags(prev => [...prev, data]);
      
      toast({
        title: 'Tag created',
        description: 'New tag has been created successfully',
      });
      
      return data;
    } catch (error) {
      console.error('Error creating tag:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create tag',
      });
      return null;
    }
  };

  const openChat = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  const filterUsers = (users: Friend[]) => {
    if (!searchQuery.trim()) {
      // Apply filter options
      let filteredUsers = [...users];
      
      if (filterOptions.favorites) {
        filteredUsers = filteredUsers.filter(user => user.isFavorite);
      }
      
      if (filterOptions.online) {
        filteredUsers = filteredUsers.filter(user => user.isOnline);
      }
      
      if (filterOptions.tags.length > 0) {
        filteredUsers = filteredUsers.filter(user => {
          if (!user.tags || user.tags.length === 0) return false;
          return filterOptions.tags.some(tag => user.tags?.includes(tag));
        });
      }
      
      return filteredUsers;
    }
    
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
  
  const sortFriends = (friendsList: Friend[], sortBy: 'name' | 'recent' | 'activity') => {
    switch (sortBy) {
      case 'name':
        return [...friendsList].sort((a, b) => a.name.localeCompare(b.name));
      case 'recent':
        return [...friendsList].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'activity':
        // Sort by online status first, then by last active time
        return [...friendsList].sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return 0;
        });
      default:
        return friendsList;
    }
  };
  
  const toggleFilter = (filter: 'favorites' | 'online') => {
    setFilterOptions(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };
  
  const toggleTagFilter = (tag: string) => {
    setFilterOptions(prev => {
      if (prev.tags.includes(tag)) {
        return {
          ...prev,
          tags: prev.tags.filter(t => t !== tag)
        };
      } else {
        return {
          ...prev,
          tags: [...prev.tags, tag]
        };
      }
    });
  };

  const UserCard = ({ user, type }: { user: Friend; type: 'friend' | 'request' | 'suggested' }) => (
    <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className={`w-12 h-12 border-2 ${isCrimson ? 'border-red-200' : 'border-social-green'}`}>
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : (
                <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            {type === 'friend' && (
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}>
                {user.isOnline && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>}
              </div>
            )}
            {user.isFavorite && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-white">
                <Star className="h-2 w-2 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-pixelated text-sm font-medium truncate">{user.name}</h3>
            <p className="font-pixelated text-xs text-muted-foreground truncate">@{user.username}</p>
            <div className="flex items-center gap-1 mt-1">
              {type === 'friend' && (
                <p className="font-pixelated text-xs text-muted-foreground">
                  {user.isOnline ? 'Online' : `Last seen ${user.lastActive}`}
                </p>
              )}
              {type === 'request' && (
                <p className="font-pixelated text-xs text-muted-foreground">
                  Requested {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </p>
              )}
              {type === 'suggested' && user.mutualFriends && (
                <Badge variant="outline" className="h-4 px-1 text-[8px] font-pixelated">
                  {user.mutualFriends} mutual
                </Badge>
              )}
            </div>
            {user.tags && user.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {user.tags.slice(0, 2).map((tag, index) => {
                  const tagObj = friendTags.find(t => t.name === tag);
                  return (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="h-4 px-1 text-[8px] font-pixelated"
                      style={{ borderColor: tagObj?.color, color: tagObj?.color }}
                    >
                      {tag}
                    </Badge>
                  );
                })}
                {user.tags.length > 2 && (
                  <Badge variant="outline" className="h-4 px-1 text-[8px] font-pixelated">
                    +{user.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
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
                      className="font-pixelated text-xs h-6"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Manage
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => toggleFavorite(user)}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      <Star className={`h-3 w-3 mr-2 ${user.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                      {user.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => openTagsDialog(user)}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      <Tag className="h-3 w-3 mr-2" />
                      Manage Tags
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => openNoteDialog(user)}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      <Pencil className="h-3 w-3 mr-2" />
                      {user.note ? 'Edit Note' : 'Add Note'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => toggleNotifications(user)}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      {user.notificationsEnabled ? (
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
                      onClick={() => setShowRemoveDialog({show: true, friend: user})}
                      className="font-pixelated text-xs text-destructive cursor-pointer"
                    >
                      <UserMinus className="h-3 w-3 mr-2" />
                      Remove Friend
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
        {user.note && (
          <div className="mt-2 p-2 bg-muted/30 rounded-md">
            <p className="font-pixelated text-xs text-muted-foreground">{user.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  const UserCardGrid = ({ user, type }: { user: Friend; type: 'friend' | 'request' | 'suggested' }) => (
    <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
      <CardContent className="p-3 flex flex-col items-center text-center">
        <div className="relative mb-2">
          <Avatar className={`w-16 h-16 border-2 ${isCrimson ? 'border-red-200' : 'border-social-green'}`}>
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : (
              <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-sm`}>
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          {type === 'friend' && (
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}>
              {user.isOnline && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>}
            </div>
          )}
          {user.isFavorite && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-white">
              <Star className="h-2 w-2 text-white" />
            </div>
          )}
        </div>
        
        <h3 className="font-pixelated text-sm font-medium truncate w-full">{user.name}</h3>
        <p className="font-pixelated text-xs text-muted-foreground truncate w-full">@{user.username}</p>
        
        <div className="flex items-center justify-center gap-1 mt-1">
          {type === 'friend' && (
            <p className="font-pixelated text-xs text-muted-foreground">
              {user.isOnline ? 'Online' : `Last seen ${user.lastActive}`}
            </p>
          )}
          {type === 'request' && (
            <p className="font-pixelated text-xs text-muted-foreground">
              Requested {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </p>
          )}
          {type === 'suggested' && user.mutualFriends && (
            <Badge variant="outline" className="h-4 px-1 text-[8px] font-pixelated">
              {user.mutualFriends} mutual
            </Badge>
          )}
        </div>
        
        {user.tags && user.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-1">
            {user.tags.slice(0, 2).map((tag, index) => {
              const tagObj = friendTags.find(t => t.name === tag);
              return (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="h-4 px-1 text-[8px] font-pixelated"
                  style={{ borderColor: tagObj?.color, color: tagObj?.color }}
                >
                  {tag}
                </Badge>
              );
            })}
            {user.tags.length > 2 && (
              <Badge variant="outline" className="h-4 px-1 text-[8px] font-pixelated">
                +{user.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-1 mt-3">
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
                    className="font-pixelated text-xs h-6"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => toggleFavorite(user)}
                    className="font-pixelated text-xs cursor-pointer"
                  >
                    <Star className={`h-3 w-3 mr-2 ${user.isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    {user.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => openTagsDialog(user)}
                    className="font-pixelated text-xs cursor-pointer"
                  >
                    <Tag className="h-3 w-3 mr-2" />
                    Manage Tags
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => openNoteDialog(user)}
                    className="font-pixelated text-xs cursor-pointer"
                  >
                    <Pencil className="h-3 w-3 mr-2" />
                    {user.note ? 'Edit Note' : 'Add Note'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => toggleNotifications(user)}
                    className="font-pixelated text-xs cursor-pointer"
                  >
                    {user.notificationsEnabled ? (
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
                    onClick={() => setShowRemoveDialog({show: true, friend: user})}
                    className="font-pixelated text-xs text-destructive cursor-pointer"
                  >
                    <UserMinus className="h-3 w-3 mr-2" />
                    Remove Friend
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
      </CardContent>
    </Card>
  );

  const SearchResultCard = ({ user }: { user: SearchResult }) => (
    <Card className={`hover:shadow-md transition-all duration-200 hover-scale ${isCrimson ? 'border-red-100' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className={`w-12 h-12 border-2 ${isCrimson ? 'border-red-200' : 'border-social-green'}`}>
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
                      <LayoutGrid className="h-4 w-4" />
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
            
            {/* Sort Options */}
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
                        {sortOption === 'name' ? (
                          <SortAsc className="h-4 w-4" />
                        ) : (
                          <SortDesc className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-pixelated text-xs">Sort Options</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-pixelated text-xs">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as any)}>
                  <DropdownMenuRadioItem value="name" className="font-pixelated text-xs cursor-pointer">
                    <SortAsc className="h-3 w-3 mr-2" />
                    Name
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="recent" className="font-pixelated text-xs cursor-pointer">
                    <Clock className="h-3 w-3 mr-2" />
                    Recently Added
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="activity" className="font-pixelated text-xs cursor-pointer">
                    <Users className="h-3 w-3 mr-2" />
                    Online Status
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Filter Options */}
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 ${
                          (filterOptions.favorites || filterOptions.online || filterOptions.tags.length > 0) 
                            ? 'bg-muted border-primary' 
                            : ''
                        }`}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-pixelated text-xs">Filter Options</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-pixelated text-xs">Filter Friends</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => toggleFilter('favorites')}
                  className="font-pixelated text-xs cursor-pointer"
                >
                  <div className="flex items-center w-full">
                    <Star className={`h-3 w-3 mr-2 ${filterOptions.favorites ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    <span>Favorites Only</span>
                    {filterOptions.favorites && (
                      <Badge variant="outline" className="ml-auto h-4 px-1 text-[8px]">
                        On
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => toggleFilter('online')}
                  className="font-pixelated text-xs cursor-pointer"
                >
                  <div className="flex items-center w-full">
                    <div className="h-3 w-3 mr-2 rounded-full bg-green-500 flex-shrink-0"></div>
                    <span>Online Only</span>
                    {filterOptions.online && (
                      <Badge variant="outline" className="ml-auto h-4 px-1 text-[8px]">
                        On
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-pixelated text-xs">Filter by Tags</DropdownMenuLabel>
                {friendTags.length > 0 ? (
                  friendTags.map(tag => (
                    <DropdownMenuItem 
                      key={tag.id}
                      onClick={() => toggleTagFilter(tag.name)}
                      className="font-pixelated text-xs cursor-pointer"
                    >
                      <div className="flex items-center w-full">
                        <div 
                          className="h-3 w-3 mr-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <span>{tag.name}</span>
                        {filterOptions.tags.includes(tag.name) && (
                          <Badge variant="outline" className="ml-auto h-4 px-1 text-[8px]">
                            On
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    No tags created yet
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowTagDialog(true)}
                  className="font-pixelated text-xs cursor-pointer"
                >
                  <Plus className="h-3 w-3 mr-2" />
                  Create New Tag
                </DropdownMenuItem>
                {(filterOptions.favorites || filterOptions.online || filterOptions.tags.length > 0) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setFilterOptions({ favorites: false, online: false, tags: [] })}
                      className="font-pixelated text-xs cursor-pointer"
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
        <div className="p-3 bg-background sticky top-[57px] z-10 backdrop-blur-sm border-b">
          <div className="relative max-w-sm mx-auto">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-120px)]">
          <TabsList className={`grid w-full grid-cols-4 mx-3 mt-3 ${isCrimson ? 'bg-red-50' : ''}`}>
            <TabsTrigger value="friends" className="font-pixelated text-xs relative">
              Friends
              {friends.length > 0 && (
                <Badge variant="secondary" className={`ml-2 h-4 w-auto px-1 text-xs ${isCrimson ? 'bg-red-100 text-red-700' : ''}`}>
                  {friends.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="font-pixelated text-xs relative">
              Requests
              {requests.length > 0 && (
                <Badge variant="destructive" className={`ml-2 h-4 w-auto px-1 text-xs animate-pulse ${isCrimson ? 'bg-red-600' : ''}`}>
                  {requests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="suggested" className="font-pixelated text-xs relative">
              Suggested
              {suggested.length > 0 && (
                <Badge variant="outline" className="ml-2 h-4 w-auto px-1 text-xs">
                  {suggested.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="font-pixelated text-xs relative">
              Search
              {searchResults.length > 0 && (
                <Badge variant="outline" className={`ml-2 h-4 w-auto px-1 text-xs ${isCrimson ? 'border-red-200 bg-red-50' : ''}`}>
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
                    viewMode === 'grid' ? (
                      <UserCardGrid key={friend.id} user={friend} type="friend" />
                    ) : (
                      <UserCard key={friend.id} user={friend} type="friend" />
                    )
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {searchQuery ? 'No friends found' : 
                     filterOptions.favorites ? 'No favorite friends' : 
                     filterOptions.online ? 'No friends online' : 
                     filterOptions.tags.length > 0 ? 'No friends with selected tags' : 
                     'No friends yet'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : filterOptions.favorites || filterOptions.online || filterOptions.tags.length > 0
                      ? 'Try adjusting your filters or check back later'
                      : 'Start connecting with people by sending friend requests!'}
                  </p>
                  {(filterOptions.favorites || filterOptions.online || filterOptions.tags.length > 0) && (
                    <Button
                      onClick={() => setFilterOptions({ favorites: false, online: false, tags: [] })}
                      variant="outline"
                      size="sm"
                      className="mt-4 font-pixelated text-xs"
                    >
                      <X className="h-3 w-3 mr-2" />
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
                <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : 'space-y-3'} pb-3`}>
                  {filterUsers(requests).map((request) => (
                    viewMode === 'grid' ? (
                      <UserCardGrid key={request.id} user={request} type="request" />
                    ) : (
                      <UserCard key={request.id} user={request} type="request" />
                    )
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
                <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : 'space-y-3'} pb-3`}>
                  {filterUsers(suggested).map((suggestion) => (
                    viewMode === 'grid' ? (
                      <UserCardGrid key={suggestion.id} user={suggestion} type="suggested" />
                    ) : (
                      <UserCard key={suggestion.id} user={suggestion} type="suggested" />
                    )
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
              <div className="mb-4">
                <UserSearch />
              </div>
              
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
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Remove Friend Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog.show} onOpenChange={(open) => setShowRemoveDialog({show: open, friend: showRemoveDialog.friend})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Remove Friend</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to remove {showRemoveDialog.friend?.name} from your friends list? 
              This will also remove any tags, notes, and favorite status.
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
      
      {/* Create Tag Dialog */}
      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Create New Tag</DialogTitle>
            <DialogDescription className="font-pixelated text-xs">
              Create a new tag to organize your friends. Tags can be used to filter and categorize your connections.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="tag-name" className="font-pixelated text-xs">Tag Name</label>
              <Input
                id="tag-name"
                placeholder="Enter tag name"
                className="font-pixelated text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Tag Color</label>
              <div className="flex flex-wrap gap-2">
                {['#22c55e', '#3b82f6', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'].map(color => (
                  <div
                    key={color}
                    className="w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTagDialog(false)}
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                createNewTag('Work', '#3b82f6');
                setShowTagDialog(false);
              }}
              className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs`}
            >
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Friend Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">
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
              onClick={saveNote}
              className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs`}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Manage Tags Dialog */}
      <Dialog open={showTagsDialog} onOpenChange={setShowTagsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Manage Tags</DialogTitle>
            <DialogDescription className="font-pixelated text-xs">
              Select tags for {selectedFriend?.name}. Tags help you organize and filter your friends.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {friendTags.length > 0 ? (
                <div className="space-y-2">
                  {friendTags.map(tag => (
                    <div key={tag.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`tag-${tag.id}`}
                        checked={selectedTags.includes(tag.name)}
                        onChange={() => {
                          if (selectedTags.includes(tag.name)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag.name));
                          } else {
                            setSelectedTags([...selectedTags, tag.name]);
                          }
                        }}
                        className="mr-2"
                      />
                      <label htmlFor={`tag-${tag.id}`} className="font-pixelated text-xs flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="font-pixelated text-xs text-muted-foreground">
                    You haven't created any tags yet.
                  </p>
                </div>
              )}
            </div>
            
            <Button
              onClick={() => {
                setShowTagsDialog(false);
                setShowTagDialog(true);
              }}
              variant="outline"
              className="w-full font-pixelated text-xs"
            >
              <Plus className="h-3 w-3 mr-2" />
              Create New Tag
            </Button>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTagsDialog(false)}
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={saveTags}
              className={`${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated text-xs`}
            >
              Save Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Textarea({ id, value, onChange, placeholder, className }: { 
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
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