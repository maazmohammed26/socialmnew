import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, User, Calendar, MessageSquare, UserPlus, Clock, UserCheck, UserMinus, Star, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { GradientText, GlowEffect } from '@/components/ui/crimson-effects';
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

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    email?: string;
    created_at?: string;
  } | null;
}

export function UserProfileDialog({ open, onOpenChange, user }: UserProfileDialogProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'friends' | 'pending_sent' | 'pending_received'>('none');
  const [friendId, setFriendId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [mutualFriends, setMutualFriends] = useState<any[]>([]);
  const [mutualCount, setMutualCount] = useState(0);
  const [userStats, setUserStats] = useState({ posts: 0, friends: 0 });
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
    if (open && user) {
      getCurrentUser();
    }
  }, [open, user]);

  useEffect(() => {
    if (currentUser && user) {
      checkFriendStatus();
      checkFavoriteStatus();
      fetchMutualFriends();
      fetchUserStats();
    }
  }, [currentUser, user]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const checkFriendStatus = async () => {
    if (!currentUser || !user) return;
    
    try {
      // Check if already friends
      const { data: friendData } = await supabase
        .from('friends')
        .select('id, sender_id, receiver_id')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUser.id})`)
        .eq('status', 'accepted')
        .maybeSingle();

      if (friendData) {
        setFriendStatus('friends');
        setFriendId(friendData.id);
        return;
      }

      // Check if pending request from current user
      const { data: sentRequest } = await supabase
        .from('friends')
        .select('id')
        .eq('sender_id', currentUser.id)
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (sentRequest) {
        setFriendStatus('pending_sent');
        setFriendId(sentRequest.id);
        return;
      }

      // Check if pending request to current user
      const { data: receivedRequest } = await supabase
        .from('friends')
        .select('id')
        .eq('sender_id', user.id)
        .eq('receiver_id', currentUser.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (receivedRequest) {
        setFriendStatus('pending_received');
        setFriendId(receivedRequest.id);
        return;
      }

      setFriendStatus('none');
      setFriendId(null);
    } catch (error) {
      console.error('Error checking friend status:', error);
    }
  };
  
  const checkFavoriteStatus = async () => {
    if (!currentUser || !user) return;
    
    try {
      const { data } = await supabase
        .from('favorite_friends')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('friend_id', user.id)
        .maybeSingle();
        
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };
  
  const fetchMutualFriends = async () => {
    if (!currentUser || !user) return;
    
    try {
      // Get mutual friends count
      const { data: countData } = await supabase.rpc('get_mutual_friends_count', {
        user_uuid: currentUser.id,
        friend_uuid: user.id
      });
      
      setMutualCount(countData || 0);
      
      // Get mutual friends preview (up to 3)
      const { data: mutualData } = await supabase.rpc('get_mutual_friends', {
        user_uuid: currentUser.id,
        friend_uuid: user.id,
        limit_count: 3
      });
      
      setMutualFriends(mutualData || []);
    } catch (error) {
      console.error('Error fetching mutual friends:', error);
    }
  };
  
  const fetchUserStats = async () => {
    if (!user) return;
    
    try {
      // Get posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      // Get friends count
      const { count: friendsCount } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      setUserStats({
        posts: postsCount || 0,
        friends: friendsCount || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || !user) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('friends')
        .insert({
          sender_id: currentUser.id,
          receiver_id: user.id,
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
        setFriendStatus('pending_sent');
        
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendId) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', friendId);

      if (error) throw error;
      
      setFriendStatus('friends');
      
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
      setIsLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!friendId) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);

      if (error) throw error;
      
      setFriendStatus('none');
      setFriendId(null);
      
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
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendId) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('id', friendId);

      if (error) throw error;
      
      // Also remove from favorites if exists
      if (isFavorite) {
        await supabase
          .from('favorite_friends')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', user?.id);
          
        setIsFavorite(false);
      }
      
      setFriendStatus('none');
      setFriendId(null);
      setShowRemoveDialog(false);
      
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
      setIsLoading(false);
    }
  };
  
  const toggleFavorite = async () => {
    if (!currentUser || !user || friendStatus !== 'friends') return;
    
    try {
      setIsLoading(true);
      
      if (isFavorite) {
        // Remove from favorites
        await supabase
          .from('favorite_friends')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('friend_id', user.id);
          
        setIsFavorite(false);
        
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
            friend_id: user.id
          });
          
        setIsFavorite(true);
        
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!user) return;
    navigate(`/messages?user=${user.id}`);
    onOpenChange(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md mx-auto p-0 overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="relative">
            {/* Close button */}
            <Button
              onClick={() => onOpenChange(false)}
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 z-10 text-gray-600 hover:bg-gray-100 h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Profile Picture - Large View */}
            <div className={`w-full h-40 ${isCrimson ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-social-light-green to-social-blue'} flex items-center justify-center`}>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className={`w-24 h-24 rounded-full ${isCrimson ? 'bg-red-700' : 'bg-social-dark-green'} flex items-center justify-center border-4 border-white shadow-lg`}>
                  <span className="text-white font-pixelated text-2xl">
                    {user.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* User Details */}
            <div className="p-6 bg-background">
              <div className="text-center mb-4">
                <h2 className="font-pixelated text-lg text-foreground mb-1">
                  {isCrimson ? (
                    <GradientText gradientColors={['#dc2626', '#b91c1c']}>
                      {user.name}
                    </GradientText>
                  ) : (
                    user.name
                  )}
                </h2>
                <p className="text-sm text-muted-foreground font-pixelated">
                  @{user.username}
                </p>
              </div>

              <div className="space-y-3">
                {/* User Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className={`flex flex-col items-center justify-center p-3 rounded-lg ${isCrimson ? 'bg-red-50' : 'bg-muted/50'}`}>
                    <p className={`font-pixelated text-lg font-medium ${isCrimson ? 'text-red-600' : 'text-social-green'}`}>{userStats.posts}</p>
                    <p className="font-pixelated text-xs text-muted-foreground">Posts</p>
                  </div>
                  <div className={`flex flex-col items-center justify-center p-3 rounded-lg ${isCrimson ? 'bg-red-50' : 'bg-muted/50'}`}>
                    <p className={`font-pixelated text-lg font-medium ${isCrimson ? 'text-red-600' : 'text-social-green'}`}>{userStats.friends}</p>
                    <p className="font-pixelated text-xs text-muted-foreground">Friends</p>
                  </div>
                </div>
                
                {/* Mutual Friends */}
                {mutualCount > 0 && (
                  <div className={`flex items-center gap-3 p-3 ${isCrimson ? 'bg-red-50' : 'bg-muted/50'} rounded-lg`}>
                    <Users className={`h-4 w-4 ${isCrimson ? 'text-red-600' : 'text-social-blue'}`} />
                    <div className="flex-1">
                      <p className="font-pixelated text-xs text-muted-foreground">
                        <span className="font-medium">{mutualCount} mutual friend{mutualCount !== 1 ? 's' : ''}</span>
                      </p>
                      {mutualFriends.length > 0 && (
                        <div className="flex -space-x-2 mt-1">
                          {mutualFriends.map((friend) => (
                            <Avatar key={friend.id} className="w-6 h-6 border border-background">
                              {friend.avatar ? (
                                <AvatarImage src={friend.avatar} alt={friend.name} />
                              ) : (
                                <AvatarFallback className={`${isCrimson ? 'bg-red-600' : 'bg-social-dark-green'} text-white font-pixelated text-[8px]`}>
                                  {friend.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          ))}
                          {mutualCount > mutualFriends.length && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-background">
                              <span className="text-[8px] font-pixelated">+{mutualCount - mutualFriends.length}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-4 w-4 text-social-purple" />
                  <div>
                    <p className="font-pixelated text-xs text-muted-foreground">Joined</p>
                    <p className="font-pixelated text-sm text-foreground">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2">
                {friendStatus === 'friends' && (
                  <>
                    <Button
                      onClick={handleStartChat}
                      className={`w-full ${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated`}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        onClick={toggleFavorite}
                        variant="outline"
                        className={`flex-1 font-pixelated ${isFavorite ? 'border-yellow-300 bg-yellow-50 text-yellow-700' : ''}`}
                        disabled={isLoading}
                      >
                        <Star className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        {isFavorite ? 'Unfavorite' : 'Favorite'}
                      </Button>
                      <Button
                        onClick={() => setShowRemoveDialog(true)}
                        variant="outline"
                        className="flex-1 text-destructive hover:bg-destructive/10 font-pixelated"
                        disabled={isLoading}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </>
                )}

                {friendStatus === 'none' && (
                  <Button
                    onClick={handleSendFriendRequest}
                    className={`w-full ${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-blue hover:bg-social-blue/90'} text-white font-pixelated`}
                    disabled={isLoading}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isLoading ? 'Sending Request...' : 'Add Friend'}
                  </Button>
                )}

                {friendStatus === 'pending_sent' && (
                  <Button
                    variant="outline"
                    className="w-full font-pixelated"
                    disabled
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Friend Request Sent
                  </Button>
                )}

                {friendStatus === 'pending_received' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAcceptFriendRequest}
                      className={`flex-1 ${isCrimson ? 'bg-red-600 hover:bg-red-700' : 'bg-social-green hover:bg-social-light-green'} text-white font-pixelated`}
                      disabled={isLoading}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {isLoading ? 'Accepting...' : 'Accept'}
                    </Button>
                    <Button
                      onClick={handleRejectFriendRequest}
                      variant="outline"
                      className="flex-1 font-pixelated"
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      {isLoading ? 'Rejecting...' : 'Decline'}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-xs text-muted-foreground font-pixelated flex items-center justify-center gap-1">
                  Developed by Mohammed Maaz with <Heart className="h-2 w-2 text-red-500" fill="currentColor" />
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Friend Confirmation */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Remove Friend</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to remove {user.name} from your friends list? 
              You'll need to send a new friend request if you want to connect again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFriend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
              disabled={isLoading}
            >
              {isLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}