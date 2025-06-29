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
  Heart
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
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  last_interaction?: string;
  favorite?: boolean;
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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
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
          favorite: !!favoriteData
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

  const openChat = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  const filterUsers = (users: Friend[]) => {
    if (!searchQuery.trim()) {
      // Apply favorites filter if enabled
      if (filterFavorites) {
        return users.filter(user => user.favorite);
      }
      return users;
    }
    
    const query = searchQuery.toLowerCase();
    let filtered = users.filter(user => 
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
    
    // Apply favorites filter if enabled
    if (filterFavorites) {
      filtered = filtered.filter(user => user.favorite);
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

  const UserCard = ({ user, type }: { user: Friend; type: 'friend' | 'request' | 'suggested' }) => (
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
            <div className="flex items-center gap-2">
              <h3 className="font-pixelated text-sm font-medium truncate">{user.name}</h3>
              {type === 'friend' && user.favorite && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <p className="font-pixelated text-xs text-muted-foreground truncate">@{user.username}</p>
            <p className="font-pixelated text-xs text-muted-foreground">
              {type === 'friend' ? (
                user.last_interaction ? (
                  <>Last activity {formatDistanceToNow(new Date(user.last_interaction), { addSuffix: true })}</>
                ) : (
                  <>Friends since {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</>
                )
              ) : type === 'request' ? (
                <>Requested {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</>
              ) : (
                <>
                  Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  {user.mutualFriends && user.mutualFriends > 0 && (
                    <span className="ml-2 text-social-blue">• {user.mutualFriends} mutual friend{user.mutualFriends !== 1 ? 's' : ''}</span>
                  )}
                </>
              )}
            </p>
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
                      <UserMinus className="h-3 w-3 mr-1" />
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
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-pixelated">Sort:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 font-pixelated text-xs">
                  {sortBy === 'name' ? 'Name' : sortBy === 'date' ? 'Date Added' : 'Recent Activity'}
                  <SortAsc className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem 
                  onClick={() => setSortBy('name')}
                  className={`font-pixelated text-xs cursor-pointer ${sortBy === 'name' ? 'bg-muted' : ''}`}
                >
                  <Check className={`h-3 w-3 mr-2 ${sortBy === 'name' ? 'opacity-100' : 'opacity-0'}`} />
                  Name
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('date')}
                  className={`font-pixelated text-xs cursor-pointer ${sortBy === 'date' ? 'bg-muted' : ''}`}
                >
                  <Check className={`h-3 w-3 mr-2 ${sortBy === 'date' ? 'opacity-100' : 'opacity-0'}`} />
                  Date Added
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('activity')}
                  className={`font-pixelated text-xs cursor-pointer ${sortBy === 'activity' ? 'bg-muted' : ''}`}
                >
                  <Check className={`h-3 w-3 mr-2 ${sortBy === 'activity' ? 'opacity-100' : 'opacity-0'}`} />
                  Recent Activity
                </DropdownMenuItem>
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
                <div className="space-y-3 pb-3">
                  {filterUsers(sortFriends(friends)).map((friend) => (
                    <UserCard key={friend.id} user={friend} type="friend" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h2 className="font-pixelated text-sm font-medium mb-2">
                    {searchQuery ? 'No friends found' : filterFavorites ? 'No favorite friends yet' : 'No friends yet'}
                  </h2>
                  <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : filterFavorites
                        ? 'Add friends to your favorites list by clicking the star icon'
                        : 'Start connecting with people by sending friend requests!'
                    }
                  </p>
                  {filterFavorites && friends.length > 0 && (
                    <Button
                      onClick={() => setFilterFavorites(false)}
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
    </DashboardLayout>
  );
}

export default Friends;