import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Edit, Save, X, Heart, Trash2, Palette, Eye, Users, MessageCircle, Bell, Shield, Calendar, Link, ExternalLink, MapPin } from 'lucide-react';
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

export default function UserProfile() {
  const [user, setUser] = useState<UserProfileData | null>(null);
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
  const [accountCreationDate, setAccountCreationDate] = useState<string>('');
  const [profileUrl, setProfileUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (data) {
        setUser(data);
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
        
        // Set profile URL
        setProfileUrl(`${window.location.origin}/profile/${data.username}`);
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploadingAvatar(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
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
        .eq('id', user.id);

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
  
  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: 'Link copied',
        description: 'Your profile link has been copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link to clipboard',
      });
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

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-8">
        <p className="text-muted-foreground font-pixelated text-sm">Profile not found</p>
      </div>
    );
  }

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
            <CardHeader className="text-center pb-3">
              <div className="relative inline-block">
                <Avatar 
                  className="w-24 h-24 mx-auto mb-2 border-4 border-social-green/20 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setShowAvatarViewer(true)}
                >
                  {user?.avatar ? (
                    <AvatarImage src={user.avatar} alt={user.name} />
                  ) : (
                    <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xl">
                      {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
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
                        {user?.name}
                      </GradientText>
                    ) : (
                      user?.name
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-pixelated mb-1">
                    @{user?.username}
                  </p>
                  
                  {/* Bio */}
                  {user.bio && (
                    <p className="text-sm text-muted-foreground font-pixelated mt-3 mb-2 max-w-md mx-auto">
                      {user.bio}
                    </p>
                  )}
                  
                  {/* Location and Website */}
                  <div className="flex items-center justify-center gap-4 mt-2 mb-3">
                    {user.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-pixelated">
                        <MapPin className="h-3 w-3" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    
                    {user.website && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-pixelated">
                        <Link className="h-3 w-3" />
                        <a 
                          href={user.website.startsWith('http') ? user.website : `https://${user.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-social-green"
                        >
                          {user.website.replace(/^https?:\/\//, '')}
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
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={copyProfileLink}
                            className="font-pixelated text-xs h-8"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-pixelated text-xs">Copy your profile link</p>
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
              <h3 className="font-pixelated text-sm font-medium mb-3">Recent Activity</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-social-green mt-0.5" />
                  <div className="flex-1">
                    <p className="font-pixelated text-xs">
                      Posted a new update <span className="text-muted-foreground">2 days ago</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-social-blue mt-0.5" />
                  <div className="flex-1">
                    <p className="font-pixelated text-xs">
                      Commented on a post <span className="text-muted-foreground">5 days ago</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Users className="h-4 w-4 text-social-purple mt-0.5" />
                  <div className="flex-1">
                    <p className="font-pixelated text-xs">
                      Made a new friend <span className="text-muted-foreground">1 week ago</span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Popular Posts */}
          <Card className="card-gradient">
            <CardContent className="p-4">
              <h3 className="font-pixelated text-sm font-medium mb-3">Your Posts</h3>
              
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-pixelated text-xs">
                    "Just had an amazing day at the beach! 🏖️ #summer #fun"
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground font-pixelated">2 days ago</span>
                  </div>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-pixelated text-xs">
                    "Check out this amazing sunset view from my window! 🌅 #nofilter"
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground font-pixelated">1 week ago</span>
                  </div>
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
                <User className="h-4 w-4" />
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
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : (
                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                    {user.name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              {user.name}
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
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.name}'s profile picture`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 rounded-full bg-social-dark-green flex items-center justify-center">
                  <span className="text-white font-pixelated text-4xl">
                    {user.name?.substring(0, 2).toUpperCase() || 'U'}
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