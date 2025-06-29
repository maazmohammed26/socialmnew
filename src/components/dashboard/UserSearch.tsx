import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserProfileDialog } from '@/components/user/UserProfileDialog';
import { CrimsonSearchInput } from '@/components/ui/crimson-input';
import { GlowEffect } from '@/components/ui/crimson-effects';

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
}

export function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
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
  }, []);

  const searchUsers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, created_at')
        .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq('id', currentUserId)
        .limit(10);

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
      setIsLoading(false);
    }
  }, [currentUserId, toast]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchUsers(searchTerm);
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
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="relative">
          {isCrimson ? (
            <CrimsonSearchInput
              type="text"
              placeholder="Find Friends"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full font-pixelated text-xs h-8 transition-all duration-200"
            />
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Find Friends"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full font-pixelated text-xs h-8 pl-9 pr-9 transition-all duration-200 focus:ring-2 focus:ring-social-green"
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