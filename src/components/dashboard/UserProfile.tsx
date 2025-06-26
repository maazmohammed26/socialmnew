import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Edit, Save, X, Heart, Trash2, Palette, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeleteAccountDialog } from '@/components/user/DeleteAccountDialog';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface UserProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  created_at: string;
  updated_at: string;
}

interface UserStats {
  posts: number;
  friends: number;
  likes: number;
}

export default function UserProfile() {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<UserStats>({ posts: 0, friends: 0, likes: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
    fetchUserStats();
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
          username: data.username || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load profile',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Get posts count
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id);

      // Get friends count
      const { count: friendsCount } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .eq('status', 'accepted');

      // Get likes received count
      const { data: userPosts } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', authUser.id);

      let likesCount = 0;
      if (userPosts && userPosts.length > 0) {
        const { count } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .in('post_id', userPosts.map(post => post.id));
        
        likesCount = count || 0;
      }

      setStats({
        posts: postsCount || 0,
        friends: friendsCount || 0,
        likes: likesCount
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
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

  if (isLoading) {
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
      <Card className="card-gradient">
        <CardHeader className="text-center pb-3">
          <div className="relative inline-block">
            <Avatar 
              className="w-16 h-16 mx-auto mb-2 border-2 border-social-green cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setShowAvatarViewer(true)}
            >
              {user?.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : (
                <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-sm">
                  {user?.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <Button
              size="icon"
              variant="outline"
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border-2 border-social-green hover:bg-social-green hover:text-white"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
            >
              <Camera className="h-2 w-2" />
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
              <CardTitle className="font-pixelated text-sm text-foreground mb-1">
                {user?.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground font-pixelated mb-1">
                @{user?.username}
              </p>
              <p className="text-xs text-muted-foreground font-pixelated mb-3">
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6"
                >
                  <Edit className="h-2 w-2 mr-1" />
                  Edit Profile
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="w-full font-pixelated text-xs h-6"
                >
                  <Trash2 className="h-2 w-2 mr-1" />
                  Delete Account
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-left">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-pixelated">Name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="font-pixelated text-xs h-6"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="username" className="text-xs font-pixelated">Username</Label>
                <Input
                  id="username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="font-pixelated text-xs h-6"
                />
              </div>
              
              <div className="flex gap-1 justify-center pt-2">
                <Button
                  onClick={handleSave}
                  className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-6"
                >
                  <Save className="h-2 w-2 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="font-pixelated text-xs h-6"
                >
                  <X className="h-2 w-2 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Theme Toggle Section */}
          <div className="mt-4 flex justify-center">
            <div className="bg-background/50 p-3 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium font-pixelated">Theme Settings</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Card */}
      <Card className="card-gradient">
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-sm font-pixelated text-social-green">{stats.posts}</p>
              <p className="text-xs text-muted-foreground font-pixelated">Posts</p>
            </div>
            <div>
              <p className="text-sm font-pixelated text-social-green">{stats.friends}</p>
              <p className="text-xs text-muted-foreground font-pixelated">Friends</p>
            </div>
            <div>
              <p className="text-sm font-pixelated text-social-green">{stats.likes}</p>
              <p className="text-xs text-muted-foreground font-pixelated">Likes</p>
            </div>
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