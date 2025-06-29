import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Edit, Save, X, Heart, Trash2, Palette, Users, MessageCircle, Bell, Shield, Calendar, Link, MapPin, ChevronDown, ChevronUp, ArrowUp, Clock, Star, Bookmark, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteAccountDialog } from '@/components/user/DeleteAccountDialog';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GradientText, GlowEffect } from '@/components/ui/crimson-effects';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  created_at: string;
  updated_at: string;
  bio?: string;
  location?: string;
  website?: string;
  theme_preference?: string;
  color_theme?: string;
}

interface UserActivity {
  type: 'post' | 'comment' | 'like' | 'friend' | 'profile';
  content: string;
  timestamp: string;
  postId?: string;
}

export default function UserProfile() {
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    bio: '',
    location: '',
    website: ''
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [accountCreationDate, setAccountCreationDate] = useState<string>('');
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activityScrollRef = useRef<HTMLDivElement>(null);
  const postsScrollRef = useRef<HTMLDivElement>(null);
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
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (data) {
        setUserData(data);
        setEditForm({
          name: data.name || '',
          username: data.username || '',
          bio: data.bio || '',
          location: data.location || '',
          website: data.website || ''
        });
        
        // Format account creation date
        const creationDate = new Date(data.created_at);
        setAccountCreationDate(creationDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }));
        
        // After profile is loaded, fetch activity and posts
        fetchRecentActivity(authUser.id);
        fetchUserPosts(authUser.id);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load profile',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRecentActivity = async (userId: string) => {
    try {
      // Get recent posts
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('id, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
        
      // Get recent comments
      const { data: recentComments } = await supabase
        .from('comments')
        .select('id, content, post_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      // Get recent friend connections
      const { data: recentFriends } = await supabase
        .from('friends')
        .select(`
          id,
          created_at,
          profiles:sender_id!inner(name),
          profiles2:receiver_id!inner(name)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(3);
        
      // Combine and sort activities
      const activities: UserActivity[] = [];
      
      if (recentPosts) {
        recentPosts.forEach(post => {
          activities.push({
            type: 'post',
            content: post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content,
            timestamp: post.created_at,
            postId: post.id
          });
        });
      }
      
      if (recentComments) {
        recentComments.forEach(comment => {
          activities.push({
            type: 'comment',
            content: comment.content.length > 50 ? comment.content.substring(0, 50) + '...' : comment.content,
            timestamp: comment.created_at,
            postId: comment.post_id
          });
        });
      }
      
      if (recentFriends) {
        recentFriends.forEach(friend => {
          const friendName = friend.sender_id === userId ? friend.profiles2.name : friend.profiles.name;
          activities.push({
            type: 'friend',
            content: `You became friends with ${friendName}`,
            timestamp: friend.created_at
          });
        });
      }
      
      // Sort by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };
  
  const fetchUserPosts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (error) throw error;
      
      setUserPosts(data || []);
    } catch (error) {
      console.error('Error fetching user posts:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userData) return;

    try {
      setIsUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar: data.publicUrl })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      await fetchUserProfile();

      toast({
        title: 'Profile picture updated',
        description: 'Your profile picture has been updated successfully',
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile picture',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          username: editForm.username,
          bio: editForm.bio,
          location: editForm.location,
          website: editForm.website,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id);

      if (error) throw error;

      await fetchUserProfile();
      setIsEditing(false);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile',
      });
    }
  };

  const handleAccountDeleted = () => {
    navigate('/login');
  };
  
  const handlePostClick = (postId: string) => {
    // Navigate to the dashboard instead of a specific post
    navigate('/dashboard');
  };

  const handleScroll = useCallback((ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const { scrollTop } = ref.current;
      setShowScrollTop(scrollTop > 100);
    }
  }, []);

  const scrollToTop = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="animate-pulse">
          <CardHeader className="text-center">
            <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-4"></div>
            <div className="h-6 w-32 bg-muted rounded mx-auto mb-2"></div>
            <div className="h-4 w-24 bg-muted rounded mx-auto"></div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p className="text-muted-foreground font-pixelated text-sm">Profile not found</p>
      </div>
    );
  }

  // Filter activities to show only last week by default
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const filteredActivity = showAllActivity 
    ? recentActivity 
    : recentActivity.filter(activity => new Date(activity.timestamp) > oneWeekAgo);

  return (
    <div className="max-w-2xl mx-auto space-y-3 p-3">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="font-pixelated text-xs">Profile</TabsTrigger>
          <TabsTrigger value="activity" className="font-pixelated text-xs">Activity</TabsTrigger>
          <TabsTrigger value="settings" className="font-pixelated text-xs">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-3 mt-3">
          <Card className="card-gradient">
            <CardHeader className="pb-3">
              <div className="relative inline-block">
                <Avatar 
                  className="w-24 h-24 mx-auto mb-2 border-4 border-social-green/20 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setShowAvatarViewer(true)}
                >
                  {userData?.avatar ? (
                    <AvatarImage src={userData.avatar} alt={userData.name} />
                  ) : (
                    <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xl">
                      {userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border-2 border-social-green hover:bg-social-green hover:text-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              
              {!isEditing ? (
                <>
                  <CardTitle className="font-pixelated text-xl text-foreground mb-1">
                    {isCrimson ? (
                      <GradientText gradientColors={['#dc2626', '#b91c1c']}>
                        {userData?.name}
                      </GradientText>
                    ) : (
                      userData?.name
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-pixelated mb-1">
                    @{userData?.username}
                  </p>
                  
                  {/* Bio */}
                  {userData.bio && (
                    <p className="text-sm text-muted-foreground font-pixelated mt-3 mb-2 max-w-md mx-auto">
                      {userData.bio}
                    </p>
                  )}
                  
                  {/* Location and Website */}
                  <div className="flex items-center justify-center gap-4 mt-2 mb-3">
                    {userData.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-pixelated">
                        <MapPin className="h-3 w-3" />
                        <span>{userData.location}</span>
                      </div>
                    )}
                    
                    {userData.website && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-pixelated">
                        <Link className="h-3 w-3" />
                        <a 
                          href={userData.website.startsWith('http') ? userData.website : `https://${userData.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-social-green"
                        >
                          {userData.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => setIsEditing(true)}
                            className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit Profile
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-pixelated text-xs">Edit your profile information</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </>
              ) : (
                <div className="space-y-3 text-left max-w-md mx-auto">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs font-pixelated">Name</Label>
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="font-pixelated text-xs h-8"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="username" className="text-xs font-pixelated">Username</Label>
                    <Input
                      id="username"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="font-pixelated text-xs h-8"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="bio" className="text-xs font-pixelated">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="font-pixelated text-xs min-h-[80px]"
                      placeholder="Tell us about yourself"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="location" className="text-xs font-pixelated">Location</Label>
                    <Input
                      id="location"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="font-pixelated text-xs h-8"
                      placeholder="City, Country"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="website" className="text-xs font-pixelated">Website</Label>
                    <Input
                      id="website"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      className="font-pixelated text-xs h-8"
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-center pt-2">
                    <Button
                      onClick={handleSave}
                      className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      className="font-pixelated text-xs h-8"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Account Info */}
          <Card className="card-gradient">
            <CardContent className="p-4">
              <h3 className="font-pixelated text-sm font-medium mb-3">Account Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="h-4 w-4 text-social-blue" />
                  <div>
                    <p className="font-pixelated text-xs text-muted-foreground">Member since</p>
                    <p className="font-pixelated text-sm">{accountCreationDate}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Shield className="h-4 w-4 text-social-green" />
                  <div>
                    <p className="font-pixelated text-xs text-muted-foreground">Account status</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-pixelated text-xs bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                      <Badge variant="outline" className="font-pixelated text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Verified
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Bell className="h-4 w-4 text-social-purple" />
                  <div>
                    <p className="font-pixelated text-xs text-muted-foreground">Notifications</p>
                    <p className="font-pixelated text-sm">Enabled for all activities</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-3 mt-3">
          {/* Recent Activity */}
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-pixelated text-sm font-medium">Recent Activity</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllActivity(!showAllActivity)}
                  className="h-7 px-2 font-pixelated text-xs flex items-center gap-1"
                >
                  {showAllActivity ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show All
                    </>
                  )}
                </Button>
              </div>
              
              <ScrollArea 
                className="h-[300px] pr-4" 
                viewportRef={activityScrollRef}
                onScrollCapture={() => handleScroll(activityScrollRef)}
              >
                {filteredActivity.length > 0 ? (
                  <div className="space-y-3">
                    {filteredActivity.map((activity, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all duration-200 ${activity.postId ? 'cursor-pointer' : ''}`}
                        onClick={activity.postId ? () => handlePostClick(activity.postId!) : undefined}
                      >
                        {activity.type === 'post' && <MessageCircle className="h-4 w-4 text-social-green mt-0.5" />}
                        {activity.type === 'comment' && <MessageCircle className="h-4 w-4 text-social-blue mt-0.5" />}
                        {activity.type === 'like' && <Heart className="h-4 w-4 text-social-magenta mt-0.5" />}
                        {activity.type === 'friend' && <Users className="h-4 w-4 text-social-purple mt-0.5" />}
                        
                        <div className="flex-1">
                          <p className="font-pixelated text-xs">{activity.content}</p>
                          <p className="font-pixelated text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(new Date(activity.timestamp))}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show scroll to top button when needed */}
                    {showScrollTop && (
                      <Button
                        onClick={() => scrollToTop(activityScrollRef)}
                        size="icon"
                        className="sticky bottom-4 left-[calc(100%-2rem)] z-10 h-8 w-8 rounded-full bg-social-green hover:bg-social-light-green text-white shadow-lg transition-all duration-200"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="font-pixelated text-sm text-muted-foreground">No recent activity to show</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* User Posts */}
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-pixelated text-sm font-medium">Your Posts</h3>
                {userPosts.length > 0 && (
                  <Badge variant="outline" className="font-pixelated text-xs">
                    {userPosts.length} posts
                  </Badge>
                )}
              </div>
              
              <ScrollArea 
                className="h-[350px] pr-4" 
                viewportRef={postsScrollRef}
                onScrollCapture={() => handleScroll(postsScrollRef)}
              >
                {userPosts.length > 0 ? (
                  <div className="space-y-4">
                    {userPosts.map((post) => (
                      <div 
                        key={post.id} 
                        className="p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors hover:shadow-md"
                        onClick={() => handlePostClick(post.id)}
                      >
                        <p className="font-pixelated text-xs mb-3 leading-relaxed">
                          {post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content}
                        </p>
                        
                        {post.image_url && (
                          <div className="mt-2 mb-3">
                            <img 
                              src={post.image_url} 
                              alt="Post" 
                              className="w-full h-32 object-cover rounded-md"
                            />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground font-pixelated flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(new Date(post.created_at))}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {post.updated_at !== post.created_at && (
                              <span className="text-xs text-muted-foreground font-pixelated">(edited)</span>
                            )}
                            
                            <div className="flex items-center gap-1 text-social-magenta">
                              <Heart className="h-3 w-3" />
                              <span className="text-xs font-pixelated">{Math.floor(Math.random() * 10)}</span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-social-blue">
                              <MessageCircle className="h-3 w-3" />
                              <span className="text-xs font-pixelated">{Math.floor(Math.random() * 5)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show scroll to top button when needed */}
                    {showScrollTop && (
                      <Button
                        onClick={() => scrollToTop(postsScrollRef)}
                        size="icon"
                        className="sticky bottom-4 left-[calc(100%-2rem)] z-10 h-8 w-8 rounded-full bg-social-green hover:bg-social-light-green text-white shadow-lg transition-all duration-200"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                    <p className="font-pixelated text-sm text-muted-foreground">You haven't created any posts yet</p>
                    <Button
                      onClick={() => navigate('/dashboard')}
                      variant="outline"
                      size="sm"
                      className="mt-2 font-pixelated text-xs"
                    >
                      Create Your First Post
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* User Stats Card */}
          <Card className="card-gradient">
            <CardContent className="p-4">
              <h3 className="font-pixelated text-sm font-medium mb-3">Your Stats</h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 p-3 rounded-lg text-center">
                  <div className="flex flex-col items-center">
                    <MessageCircle className="h-5 w-5 text-social-green mb-1" />
                    <p className="font-pixelated text-lg font-medium">{userPosts.length}</p>
                    <p className="font-pixelated text-xs text-muted-foreground">Posts</p>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-lg text-center">
                  <div className="flex flex-col items-center">
                    <Users className="h-5 w-5 text-social-blue mb-1" />
                    <p className="font-pixelated text-lg font-medium">{recentActivity.filter(a => a.type === 'friend').length}</p>
                    <p className="font-pixelated text-xs text-muted-foreground">Friends</p>
                  </div>
                </div>
                
                <div className="bg-muted/30 p-3 rounded-lg text-center">
                  <div className="flex flex-col items-center">
                    <Heart className="h-5 w-5 text-social-magenta mb-1" />
                    <p className="font-pixelated text-lg font-medium">{Math.floor(Math.random() * 50)}</p>
                    <p className="font-pixelated text-xs text-muted-foreground">Likes</p>
                  </div>
                </div>
              </div>
              
              {/* Achievements */}
              <div className="mt-4">
                <h4 className="font-pixelated text-xs font-medium mb-2">Achievements</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="font-pixelated text-xs bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    Early Adopter
                  </Badge>
                  <Badge variant="outline" className="font-pixelated text-xs bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Trendsetter
                  </Badge>
                  <Badge variant="outline" className="font-pixelated text-xs bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                    <Bookmark className="h-3 w-3" />
                    Collector
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-3 mt-3">
          {/* Theme Settings */}
          <Card className="card-gradient">
            <CardContent className="p-4">
              <h3 className="font-pixelated text-sm font-medium mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Theme Settings
              </h3>
              
              <div className="bg-muted/30 p-4 rounded-lg">
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
          
          {/* Account Settings */}
          <Card className="card-gradient">
            <CardContent className="p-4">
              <h3 className="font-pixelated text-sm font-medium mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Account Settings
              </h3>
              
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start font-pixelated text-xs h-8"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3 mr-2" />
                  Edit Profile Information
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start font-pixelated text-xs h-8"
                  onClick={() => navigate('/settings')}
                >
                  <Bell className="h-3 w-3 mr-2" />
                  Notification Preferences
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start font-pixelated text-xs h-8"
                  onClick={() => navigate('/settings')}
                >
                  <Shield className="h-3 w-3 mr-2" />
                  Privacy Settings
                </Button>
                
                <Button
                  variant="destructive"
                  className="w-full justify-start font-pixelated text-xs h-8"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Copyright */}
          <Card className="card-gradient">
            <CardContent className="p-2 text-center">
              <p className="text-xs text-muted-foreground font-pixelated flex items-center justify-center gap-1">
                Developed by Mohammed Maaz with <Heart className="h-2 w-2 text-red-500" fill="currentColor" />
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Avatar Viewer Dialog */}
      <Dialog open={showAvatarViewer} onOpenChange={setShowAvatarViewer}>
        <DialogContent className="max-w-lg mx-auto p-0 bg-black border-none overflow-hidden">
          <DialogHeader className="absolute top-4 left-4 right-4 z-10 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-white font-pixelated text-sm flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-white">
                {userData.avatar ? (
                  <AvatarImage src={userData.avatar} alt={userData.name} />
                ) : (
                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                    {userData.name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              {userData.name}
            </DialogTitle>
            <Button
              onClick={() => setShowAvatarViewer(false)}
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="relative w-full h-[500px] flex flex-col">
            {/* Profile Picture */}
            <div className="flex-1 flex items-center justify-center p-4">
              {userData.avatar ? (
                <img
                  src={userData.avatar}
                  alt={`${userData.name}'s profile picture`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 rounded-full bg-social-dark-green flex items-center justify-center">
                  <span className="text-white font-pixelated text-4xl">
                    {userData.name?.substring(0, 2).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onAccountDeleted={handleAccountDeleted}
      />
    </div>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''} ago`;
}