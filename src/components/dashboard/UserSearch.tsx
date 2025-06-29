import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Clock, X, UserCheck, Filter, Users, Star, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserProfileDialog } from '@/components/user/UserProfileDialog';
import { CrimsonSearchInput } from '@/components/ui/crimson-input';
import { GlowEffect } from '@/components/ui/crimson-effects';
import { Badge } from '@/components/ui/badge';
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

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  email?: string;
  created_at?: string;
}

interface SearchResult extends User {
  isFriend: boolean;
  isPending: boolean;
  mutualFriends?: number;
  isPopular?: boolean;
  isVerified?: boolean;
}

export function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'new' | 'mutual' | 'popular'>('all');
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const { toast } = useToast();
  
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
    async function getCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    }
    getCurrentUser();
    
    // Load recent searches from localStorage
    const savedSearches = localStorage.getItem('recentUserSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches).slice(0, 5));
      } catch (e) {
        console.error('Error parsing recent searches:', e);
      }
    }
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, created_at')
        .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('id', currentUserId)
        .limit(20);

      if (error) throw error;

      // Check if each user is already a friend or has a pending request
      const results = await Promise.all(
        (data || []).map(async (user) => {
          // Check if already friends
          const { data: friendData } = await supabase
            .from('friends')
            .select('id')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUserId})`)
            .eq('status', 'accepted')
            .maybeSingle();

          // Check if pending request exists
          const { data: pendingData } = await supabase
            .from('friends')
            .select('id')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUserId})`)
            .eq('status', 'pending')
            .maybeSingle();
            
          // Get mutual friends count
          const { data: mutualData } = await supabase.rpc('get_mutual_friends_count', {
            user_uuid: currentUserId,
            friend_uuid: user.id
          });
          
          // Simulate popular and verified users
          const isPopular = user.id.charAt(0) < 'c';
          const isVerified = user.id.charAt(1) > 'f';

          return {
            ...user,
            isFriend: !!friendData,
            isPending: !!pendingData,
            mutualFriends: mutualData || 0,
            isPopular,
            isVerified
          };
        })
      );
      
      // Apply filter if needed
      let filteredResults = results;
      if (searchFilter === 'new') {
        filteredResults = results.filter(user => !user.isFriend && !user.isPending);
      } else if (searchFilter === 'mutual') {
        filteredResults = results.filter(user => (user.mutualFriends || 0) > 0);
      } else if (searchFilter === 'popular') {
        filteredResults = results.filter(user => user.isPopular);
      }

      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: 'destructive',
        title: 'Search failed',
        description: 'Failed to search for users',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, toast, searchFilter]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchUsers(searchTerm);
        setShowRecentSearches(false);
      } else if (searchTerm.trim().length === 0) {
        setShowRecentSearches(true);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, searchUsers]);

  const handleSendFriendRequest = async (userId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          sender_id: currentUserId,
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
        // Update the search results to show pending status
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

  const handleUserClick = (user: User) => {
    // Add to recent searches
    const newSearch = searchResults.find(r => r.id === user.id);
    if (newSearch) {
      const updatedSearches = [newSearch, ...recentSearches.filter(s => s.id !== user.id)].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem('recentUserSearches', JSON.stringify(updatedSearches));
    }
    
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowRecentSearches(true);
  };
  
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentUserSearches');
    toast({
      title: 'Recent searches cleared',
      description: 'Your search history has been cleared',
    });
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {isCrimson ? (
              <CrimsonSearchInput
                type="text"
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full font-pixelated text-xs h-8 transition-all duration-200"
                onFocus={() => {
                  if (searchTerm.trim().length === 0) {
                    setShowRecentSearches(true);
                  }
                }}
              />
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full font-pixelated text-xs h-8 pl-9 pr-9 transition-all duration-200 focus:ring-2 focus:ring-social-green"
                  onFocus={() => {
                    if (searchTerm.trim().length === 0) {
                      setShowRecentSearches(true);
                    }
                  }}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-muted/50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel className="font-pixelated text-xs">Filter Results</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={searchFilter} onValueChange={(value) => setSearchFilter(value as any)}>
                      <DropdownMenuRadioItem value="all" className="font-pixelated text-xs cursor-pointer">
                        <Users className="h-3 w-3 mr-2" />
                        All Users
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="new" className="font-pixelated text-xs cursor-pointer">
                        <UserPlus className="h-3 w-3 mr-2" />
                        New Connections
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="mutual" className="font-pixelated text-xs cursor-pointer">
                        <Users className="h-3 w-3 mr-2" />
                        With Mutual Friends
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="popular" className="font-pixelated text-xs cursor-pointer">
                        <Zap className="h-3 w-3 mr-2" />
                        Popular Users
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-pixelated text-xs">Filter Search</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Recent Searches */}
        {showRecentSearches && recentSearches.length > 0 && !searchTerm && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-pixelated text-xs text-muted-foreground">Recent Searches</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 font-pixelated text-xs"
                onClick={clearRecentSearches}
              >
                Clear
              </Button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentSearches.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2 ${isCrimson ? 'bg-red-50/50' : 'bg-muted/50'} rounded-md hover:bg-muted transition-colors duration-200 hover-scale`}
                >
                  <div 
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => handleUserClick(user)}
                  >
                    <Avatar className={`w-6 h-6 ${isCrimson ? 'border border-red-200' : ''}`}>
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      ) : (
                        <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-xs`}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-pixelated text-xs font-medium truncate">
                        {user.name}
                      </p>
                      <p className="font-pixelated text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-muted/50"
                    onClick={() => {
                      setRecentSearches(prev => prev.filter(s => s.id !== user.id));
                      localStorage.setItem('recentUserSearches', JSON.stringify(
                        recentSearches.filter(s => s.id !== user.id)
                      ));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto animate-fade-in">
            {searchResults.map((user) => (
              <div
                key={user.id}
                className={`flex items-center justify-between p-2 ${isCrimson ? 'bg-red-50/50' : 'bg-muted/50'} rounded-md hover:bg-muted transition-colors duration-200 hover-scale`}
              >
                <div 
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="relative">
                    <Avatar className={`w-6 h-6 ${isCrimson ? 'border border-red-200' : ''}`}>
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      ) : (
                        <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-xs`}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {user.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center border border-white">
                        <Check className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-pixelated text-xs font-medium truncate">
                        {user.name}
                      </p>
                      {user.isPopular && (
                        <Star className="h-2 w-2 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center">
                      <p className="font-pixelated text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                      {user.mutualFriends && user.mutualFriends > 0 && (
                        <Badge variant="outline" className="ml-2 h-4 px-1 text-[8px] font-pixelated">
                          {user.mutualFriends} mutual
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {user.isFriend ? (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-6 w-6 border-green-200 text-green-600"
                    disabled
                  >
                    <UserCheck className="h-3 w-3" />
                  </Button>
                ) : user.isPending ? (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-6 w-6"
                    disabled
                  >
                    <Clock className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSendFriendRequest(user.id)}
                    size="icon"
                    className={`h-6 w-6 ${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white transition-colors hover-scale`}
                  >
                    {isCrimson ? (
                      <GlowEffect color="red" intensity="low">
                        <UserPlus className="h-3 w-3" />
                      </GlowEffect>
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="text-center py-2">
            <p className="font-pixelated text-xs text-muted-foreground animate-pulse">
              Searching...
            </p>
          </div>
        )}

        {searchTerm.length >= 2 && searchResults.length === 0 && !isLoading && (
          <div className="text-center py-2">
            <p className="font-pixelated text-xs text-muted-foreground">
              No users found
            </p>
            <p className="font-pixelated text-xs text-muted-foreground mt-1">
              Try a different search term or filter
            </p>
          </div>
        )}
      </div>

      <UserProfileDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        user={selectedUser}
      />
    </>
  );
}

function Check({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}