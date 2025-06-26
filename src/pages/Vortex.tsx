import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  Globe, 
  Users, 
  Plus, 
  Send, 
  UserPlus, 
  Settings, 
  MoreVertical, 
  Trash2, 
  LogOut, 
  Lock, 
  MessageSquare,
  Image as ImageIcon,
  X,
  Check,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  max_members: number;
  is_admin?: boolean;
}

interface GroupMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  name: string;
  username: string;
  avatar: string | null;
}

interface GroupJoinRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  created_at: string;
  name: string;
  username: string;
  avatar: string | null;
}

interface GroupMessage {
  id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  created_at: string;
  sender_name: string;
  sender_username: string;
  sender_avatar: string | null;
}

export function Vortex() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    is_private: true,
    avatar: ''
  });
  const [joinMessage, setJoinMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          setCurrentUser({
            id: user.id,
            ...profile
          });
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Fetch my groups
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchMyGroups = async () => {
      try {
        // Get groups where user is a member
        const { data: memberships, error: membershipError } = await supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', currentUser.id);
          
        if (membershipError) throw membershipError;
        
        if (!memberships || memberships.length === 0) {
          setMyGroups([]);
          setLoading(false);
          return;
        }
        
        const groupIds = memberships.map(m => m.group_id);
        const adminGroups = new Set(memberships.filter(m => m.role === 'admin').map(m => m.group_id));
        
        // Get group details
        const { data: groups, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds)
          .order('updated_at', { ascending: false });
          
        if (groupsError) throw groupsError;
        
        const formattedGroups = groups?.map(group => ({
          ...group,
          is_admin: adminGroups.has(group.id)
        })) || [];
        
        setMyGroups(formattedGroups);
      } catch (error) {
        console.error('Error fetching my groups:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load your groups'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMyGroups();
  }, [currentUser, toast]);

  // Fetch suggested groups
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchSuggestedGroups = async () => {
      try {
        // Use the RPC function to get group suggestions
        const { data, error } = await supabase.rpc('get_group_suggestions', {
          user_uuid: currentUser.id,
          limit_count: 10
        });
        
        if (error) throw error;
        
        setSuggestedGroups(data || []);
      } catch (error) {
        console.error('Error fetching suggested groups:', error);
        // Don't show error toast for suggestions
      }
    };
    
    fetchSuggestedGroups();
  }, [currentUser]);

  // Fetch group details when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    
    const fetchGroupDetails = async () => {
      try {
        // Fetch group members
        const { data: members, error: membersError } = await supabase.rpc('get_group_members_with_profiles', {
          group_uuid: selectedGroup.id
        });
        
        if (membersError) throw membersError;
        setGroupMembers(members || []);
        
        // Fetch join requests if user is admin
        if (selectedGroup.is_admin) {
          const { data: requests, error: requestsError } = await supabase.rpc('get_group_join_requests_with_profiles', {
            group_uuid: selectedGroup.id
          });
          
          if (requestsError) throw requestsError;
          setJoinRequests(requests || []);
        }
        
        // Fetch messages
        const { data: messages, error: messagesError } = await supabase.rpc('get_group_messages_with_profiles', {
          group_uuid: selectedGroup.id,
          limit_count: 50
        });
        
        if (messagesError) throw messagesError;
        setMessages((messages || []).reverse()); // Reverse to show oldest first
        
        // Scroll to bottom after messages load
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } catch (error) {
        console.error('Error fetching group details:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load group details'
        });
      }
    };
    
    fetchGroupDetails();
    
    // Set up real-time subscription for messages
    const messagesChannel = supabase
      .channel(`group-messages-${selectedGroup.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'group_messages',
          filter: `group_id=eq.${selectedGroup.id}`
        }, 
        async (payload) => {
          console.log('New group message:', payload);
          
          // Fetch the complete message with sender info
          const { data, error } = await supabase.rpc('get_group_messages_with_profiles', {
            group_uuid: selectedGroup.id,
            limit_count: 1
          });
          
          if (error || !data || data.length === 0) {
            console.error('Error fetching new message details:', error);
            return;
          }
          
          const newMessage = data[0];
          
          // Add message to state
          setMessages(prev => [...prev, newMessage]);
          
          // Scroll to bottom
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      )
      .subscribe();
      
    // Set up real-time subscription for join requests
    if (selectedGroup.is_admin) {
      const requestsChannel = supabase
        .channel(`group-requests-${selectedGroup.id}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'group_join_requests',
            filter: `group_id=eq.${selectedGroup.id}`
          }, 
          () => {
            // Refresh join requests
            fetchGroupDetails();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(requestsChannel);
      };
    }
    
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedGroup, toast]);

  const handleCreateGroup = async () => {
    try {
      if (!currentUser) return;
      
      if (!newGroupData.name.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Group name is required'
        });
        return;
      }
      
      // Use the RPC function to create a group with the creator as admin
      const { data: groupId, error } = await supabase.rpc('create_group_with_admin', {
        p_name: newGroupData.name.trim(),
        p_description: newGroupData.description.trim(),
        p_avatar: newGroupData.avatar.trim(),
        p_is_private: newGroupData.is_private,
        p_creator_id: currentUser.id
      });
      
      if (error) throw error;
      
      // Fetch the new group details
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
        
      if (groupError) throw groupError;
      
      // Add to my groups
      setMyGroups(prev => [{
        ...newGroup,
        is_admin: true
      }, ...prev]);
      
      // Reset form and close dialog
      setNewGroupData({
        name: '',
        description: '',
        is_private: true,
        avatar: ''
      });
      setShowCreateDialog(false);
      
      toast({
        title: 'Group created!',
        description: 'Your new group has been created successfully'
      });
      
      // Select the new group
      setSelectedGroup({
        ...newGroup,
        is_admin: true
      });
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create group'
      });
    }
  };

  const handleJoinGroup = async (group: Group) => {
    try {
      if (!currentUser) return;
      
      // Check if already a member
      const isMember = myGroups.some(g => g.id === group.id);
      if (isMember) {
        setSelectedGroup(group);
        return;
      }
      
      // Check if already requested to join
      const { data: existingRequest, error: requestError } = await supabase
        .from('group_join_requests')
        .select('id, status')
        .eq('group_id', group.id)
        .eq('user_id', currentUser.id)
        .single();
        
      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          toast({
            title: 'Request pending',
            description: 'Your request to join this group is still pending approval'
          });
        } else if (existingRequest.status === 'approved') {
          toast({
            title: 'Already a member',
            description: 'You are already a member of this group'
          });
        } else {
          // Create a new request if previously rejected
          await createJoinRequest(group);
        }
        return;
      }
      
      if (requestError && requestError.code !== 'PGRST116') {
        throw requestError;
      }
      
      // If private group, show join dialog
      if (group.is_private) {
        setSelectedGroup(group);
        setShowJoinDialog(true);
      } else {
        // For public groups, join directly
        await createJoinRequest(group);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to join group'
      });
    }
  };

  const createJoinRequest = async (group: Group | null = null) => {
    try {
      if (!currentUser || (!selectedGroup && !group)) return;
      
      const targetGroup = group || selectedGroup;
      
      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: targetGroup!.id,
          user_id: currentUser.id,
          status: 'pending',
          message: joinMessage.trim() || null
        });
        
      if (error) throw error;
      
      setJoinMessage('');
      setShowJoinDialog(false);
      
      toast({
        title: 'Request sent!',
        description: `Your request to join ${targetGroup!.name} has been sent`
      });
      
      // Remove from suggested groups
      setSuggestedGroups(prev => prev.filter(g => g.id !== targetGroup!.id));
    } catch (error) {
      console.error('Error creating join request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send join request'
      });
    }
  };

  const handleApproveRequest = async (request: GroupJoinRequest) => {
    try {
      if (!currentUser || !selectedGroup) return;
      
      // Use the RPC function to approve the request
      const { data: success, error } = await supabase.rpc('approve_group_join_request', {
        request_uuid: request.id,
        admin_uuid: currentUser.id
      });
      
      if (error) throw error;
      
      if (success) {
        // Remove from join requests
        setJoinRequests(prev => prev.filter(r => r.id !== request.id));
        
        // Update member count
        setSelectedGroup(prev => prev ? {
          ...prev,
          member_count: prev.member_count + 1
        } : null);
        
        // Refresh members list
        const { data: members } = await supabase.rpc('get_group_members_with_profiles', {
          group_uuid: selectedGroup.id
        });
        
        if (members) {
          setGroupMembers(members);
        }
        
        toast({
          title: 'Request approved',
          description: `${request.name} has been added to the group`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to approve request'
        });
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve request'
      });
    }
  };

  const handleRejectRequest = async (request: GroupJoinRequest) => {
    try {
      if (!currentUser || !selectedGroup) return;
      
      // Use the RPC function to reject the request
      const { data: success, error } = await supabase.rpc('reject_group_join_request', {
        request_uuid: request.id,
        admin_uuid: currentUser.id
      });
      
      if (error) throw error;
      
      if (success) {
        // Remove from join requests
        setJoinRequests(prev => prev.filter(r => r.id !== request.id));
        
        toast({
          title: 'Request rejected',
          description: `${request.name}'s request has been rejected`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to reject request'
        });
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject request'
      });
    }
  };

  const handleDeleteGroup = async () => {
    try {
      if (!currentUser || !selectedGroup) return;
      
      // Check if user is admin
      if (!selectedGroup.is_admin) {
        toast({
          variant: 'destructive',
          title: 'Permission denied',
          description: 'Only group admins can delete groups'
        });
        return;
      }
      
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', selectedGroup.id);
        
      if (error) throw error;
      
      // Remove from my groups
      setMyGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
      
      // Reset selected group
      setSelectedGroup(null);
      
      setShowDeleteDialog(false);
      
      toast({
        title: 'Group deleted',
        description: 'The group has been permanently deleted'
      });
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete group'
      });
    }
  };

  const handleLeaveGroup = async () => {
    try {
      if (!currentUser || !selectedGroup) return;
      
      // Check if user is the only admin
      if (selectedGroup.is_admin) {
        const adminCount = groupMembers.filter(m => m.role === 'admin').length;
        
        if (adminCount === 1) {
          toast({
            variant: 'destructive',
            title: 'Cannot leave group',
            description: 'You are the only admin. Please delete the group or make someone else an admin first.'
          });
          setShowLeaveDialog(false);
          return;
        }
      }
      
      // Delete membership
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', currentUser.id);
        
      if (error) throw error;
      
      // Update group member count
      await supabase
        .from('groups')
        .update({ member_count: selectedGroup.member_count - 1 })
        .eq('id', selectedGroup.id);
      
      // Remove from my groups
      setMyGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
      
      // Reset selected group
      setSelectedGroup(null);
      
      setShowLeaveDialog(false);
      
      toast({
        title: 'Left group',
        description: 'You have left the group successfully'
      });
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to leave group'
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !selectedGroup || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: selectedGroup.id,
          sender_id: currentUser.id,
          content: newMessage.trim(),
          message_type: 'text'
        });
        
      if (error) throw error;
      
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const filterGroups = (groups: Group[]) => {
    if (!searchQuery.trim()) return groups;
    
    const query = searchQuery.toLowerCase();
    return groups.filter(group => 
      group.name.toLowerCase().includes(query) || 
      (group.description && group.description.toLowerCase().includes(query))
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
              <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 w-24 bg-muted rounded mb-2"></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 w-full bg-muted rounded mb-2"></div>
                    <div className="h-4 w-3/4 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-60px)] bg-background">
        <div className="flex h-full">
          {/* Groups List */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedGroup ? 'hidden md:flex' : ''}`}>
            {/* Header */}
            <div className="p-3 border-b bg-muted/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <h2 className="font-pixelated text-sm font-medium">Vortex Groups</h2>
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="sm"
                  className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Group
                </Button>
              </div>
              <div className="mt-3">
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="font-pixelated text-xs h-8"
                />
              </div>
            </div>

            {/* Groups List */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="my-groups" className="h-full">
                <TabsList className="grid w-full grid-cols-2 px-3 pt-3">
                  <TabsTrigger value="my-groups" className="font-pixelated text-xs">
                    My Groups
                  </TabsTrigger>
                  <TabsTrigger value="suggested" className="font-pixelated text-xs">
                    Suggested
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="my-groups" className="h-[calc(100%-50px)]">
                  <ScrollArea className="h-full px-3 scroll-container">
                    {filterGroups(myGroups).length > 0 ? (
                      <div className="space-y-3 py-3">
                        {filterGroups(myGroups).map(group => (
                          <Card 
                            key={group.id} 
                            className="hover:shadow-md transition-all duration-200 hover-scale cursor-pointer"
                            onClick={() => setSelectedGroup(group)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-social-green">
                                  {group.avatar ? (
                                    <AvatarImage src={group.avatar} alt={group.name} />
                                  ) : (
                                    <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                                      {group.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <h3 className="font-pixelated text-sm font-medium truncate">{group.name}</h3>
                                    {group.is_admin && (
                                      <Badge variant="outline" className="h-4 px-1 text-[8px] font-pixelated">
                                        Admin
                                      </Badge>
                                    )}
                                    {group.is_private && (
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                  <p className="font-pixelated text-xs text-muted-foreground truncate">
                                    {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                                  </p>
                                  <p className="font-pixelated text-xs text-muted-foreground">
                                    Updated {formatDistanceToNow(new Date(group.updated_at), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <Globe className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                        <h2 className="font-pixelated text-sm font-medium mb-2">
                          {searchQuery ? 'No groups found' : 'No groups yet'}
                        </h2>
                        <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                          {searchQuery 
                            ? 'Try adjusting your search terms'
                            : 'Create a new group or join suggested groups to get started!'
                          }
                        </p>
                        <Button
                          onClick={() => setShowCreateDialog(true)}
                          className="mt-4 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Group
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="suggested" className="h-[calc(100%-50px)]">
                  <ScrollArea className="h-full px-3 scroll-container">
                    {filterGroups(suggestedGroups).length > 0 ? (
                      <div className="space-y-3 py-3">
                        {filterGroups(suggestedGroups).map(group => (
                          <Card 
                            key={group.id} 
                            className="hover:shadow-md transition-all duration-200 hover-scale"
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-social-green">
                                  {group.avatar ? (
                                    <AvatarImage src={group.avatar} alt={group.name} />
                                  ) : (
                                    <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                                      {group.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <h3 className="font-pixelated text-sm font-medium truncate">{group.name}</h3>
                                    {group.is_private && (
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                  <p className="font-pixelated text-xs text-muted-foreground truncate">
                                    {group.description || 'No description'}
                                  </p>
                                  <p className="font-pixelated text-xs text-muted-foreground">
                                    {group.member_count} {group.member_count === 1 ? 'member' : 'members'} • 
                                    {group.mutual_members > 0 && ` ${group.mutual_members} mutual ${group.mutual_members === 1 ? 'friend' : 'friends'}`}
                                  </p>
                                </div>
                                
                                <Button
                                  onClick={() => handleJoinGroup(group)}
                                  size="sm"
                                  className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs h-8"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Join
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                        <h2 className="font-pixelated text-sm font-medium mb-2">
                          {searchQuery ? 'No groups found' : 'No suggested groups'}
                        </h2>
                        <p className="font-pixelated text-xs text-muted-foreground max-w-sm leading-relaxed">
                          {searchQuery 
                            ? 'Try adjusting your search terms'
                            : 'We\'ll suggest groups based on your friends and interests'
                          }
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Group Chat Area */}
          <div className={`flex-1 flex flex-col h-full ${!selectedGroup ? 'hidden md:flex' : ''}`}>
            {selectedGroup ? (
              <>
                {/* Group Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/30 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedGroup(null)}
                      className="md:hidden flex-shrink-0 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      {selectedGroup.avatar ? (
                        <AvatarImage src={selectedGroup.avatar} alt={selectedGroup.name} />
                      ) : (
                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                          {selectedGroup.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="font-pixelated text-sm font-medium truncate">{selectedGroup.name}</h3>
                        {selectedGroup.is_private && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-pixelated text-xs text-muted-foreground truncate">
                        {selectedGroup.member_count} {selectedGroup.member_count === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel className="font-pixelated text-xs">Group Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {selectedGroup.is_admin && (
                        <>
                          <DropdownMenuItem 
                            className="font-pixelated text-xs cursor-pointer"
                            onClick={() => setShowDeleteDialog(true)}
                          >
                            <Trash2 className="h-3 w-3 mr-2 text-destructive" />
                            <span className="text-destructive">Delete Group</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      <DropdownMenuItem 
                        className="font-pixelated text-xs cursor-pointer"
                        onClick={() => setShowLeaveDialog(true)}
                      >
                        <LogOut className="h-3 w-3 mr-2" />
                        Leave Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Group Content */}
                <div className="flex-1 flex flex-col md:flex-row">
                  {/* Messages Area */}
                  <div className="flex-1 flex flex-col min-h-0 md:border-r">
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full scroll-smooth">
                        <div className="p-3 space-y-3">
                          {messages.length > 0 ? (
                            messages.map(message => {
                              const isCurrentUser = message.sender_id === currentUser?.id;
                              
                              return (
                                <div 
                                  key={message.id}
                                  className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                >
                                  {!isCurrentUser && (
                                    <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                                      {message.sender_avatar ? (
                                        <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                                      ) : (
                                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                                          {message.sender_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                  )}
                                  
                                  <div className="max-w-[75%]">
                                    {!isCurrentUser && (
                                      <p className="font-pixelated text-xs text-muted-foreground mb-1">
                                        {message.sender_name}
                                      </p>
                                    )}
                                    <div 
                                      className={`p-2 rounded-lg ${
                                        isCurrentUser 
                                          ? 'bg-social-green text-white rounded-tr-none' 
                                          : 'bg-muted rounded-tl-none'
                                      }`}
                                    >
                                      <p className="font-pixelated text-xs whitespace-pre-wrap break-words">
                                        {message.content}
                                      </p>
                                      <p className="text-xs opacity-70 font-pixelated mt-1">
                                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {isCurrentUser && (
                                    <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                                      {message.sender_avatar ? (
                                        <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                                      ) : (
                                        <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                                          {message.sender_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                              <h3 className="font-pixelated text-sm font-medium mb-2">No messages yet</h3>
                              <p className="font-pixelated text-xs text-muted-foreground max-w-sm">
                                Be the first to send a message in this group!
                              </p>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {/* Message Input */}
                    <div className="border-t p-3 flex-shrink-0">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1 min-h-[60px] max-h-[120px] font-pixelated text-xs resize-none"
                          disabled={sendingMessage}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendingMessage}
                          className="bg-social-green hover:bg-social-light-green text-white font-pixelated self-end"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Members & Requests Sidebar (Desktop only) */}
                  <div className="hidden md:flex md:w-64 flex-col border-l">
                    <Tabs defaultValue="members" className="h-full">
                      <TabsList className="grid w-full grid-cols-2 px-3 pt-3">
                        <TabsTrigger value="members" className="font-pixelated text-xs">
                          Members
                        </TabsTrigger>
                        {selectedGroup.is_admin && (
                          <TabsTrigger value="requests" className="font-pixelated text-xs">
                            Requests
                            {joinRequests.length > 0 && (
                              <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground">
                                {joinRequests.length}
                              </span>
                            )}
                          </TabsTrigger>
                        )}
                      </TabsList>
                      
                      <TabsContent value="members" className="h-[calc(100%-50px)]">
                        <ScrollArea className="h-full px-3 scroll-container">
                          <div className="py-3 space-y-3">
                            {groupMembers.map(member => (
                              <div key={member.id} className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {member.avatar ? (
                                    <AvatarImage src={member.avatar} alt={member.name} />
                                  ) : (
                                    <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                                      {member.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-pixelated text-xs font-medium truncate">
                                    {member.name}
                                    {member.role === 'admin' && (
                                      <span className="ml-1 text-[8px] text-muted-foreground">(Admin)</span>
                                    )}
                                  </p>
                                  <p className="font-pixelated text-xs text-muted-foreground truncate">
                                    @{member.username}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                      
                      {selectedGroup.is_admin && (
                        <TabsContent value="requests" className="h-[calc(100%-50px)]">
                          <ScrollArea className="h-full px-3 scroll-container">
                            {joinRequests.length > 0 ? (
                              <div className="py-3 space-y-3">
                                {joinRequests.map(request => (
                                  <Card key={request.id} className="p-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Avatar className="h-6 w-6">
                                        {request.avatar ? (
                                          <AvatarImage src={request.avatar} alt={request.name} />
                                        ) : (
                                          <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                                            {request.name.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        )}
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-pixelated text-xs font-medium truncate">
                                          {request.name}
                                        </p>
                                        <p className="font-pixelated text-xs text-muted-foreground truncate">
                                          @{request.username}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {request.message && (
                                      <p className="font-pixelated text-xs text-muted-foreground mb-2 bg-muted/50 p-1 rounded">
                                        "{request.message}"
                                      </p>
                                    )}
                                    
                                    <div className="flex gap-1">
                                      <Button
                                        onClick={() => handleApproveRequest(request)}
                                        size="sm"
                                        className="flex-1 h-6 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Approve
                                      </Button>
                                      <Button
                                        onClick={() => handleRejectRequest(request)}
                                        size="sm"
                                        variant="outline"
                                        className="flex-1 h-6 font-pixelated text-xs"
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                                <Info className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                                <p className="font-pixelated text-xs text-muted-foreground">
                                  No pending join requests
                                </p>
                              </div>
                            )}
                          </ScrollArea>
                        </TabsContent>
                      )}
                    </Tabs>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Globe className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2 font-pixelated">Welcome to Vortex</h2>
                <p className="text-muted-foreground font-pixelated text-sm max-w-md mb-6">
                  Create or join groups to chat with friends, colleagues, or communities with shared interests.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-social-green hover:bg-social-light-green text-white font-pixelated"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                  <Button
                    onClick={() => document.querySelector('[data-value="suggested"]')?.click()}
                    variant="outline"
                    className="font-pixelated"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Find Groups
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Create New Group</DialogTitle>
            <DialogDescription className="font-pixelated text-xs">
              Create a group to chat with friends or colleagues
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Group Name</label>
              <Input
                value={newGroupData.name}
                onChange={(e) => setNewGroupData({...newGroupData, name: e.target.value})}
                placeholder="Enter group name"
                className="font-pixelated text-xs"
              />
            </div>
            
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Description (optional)</label>
              <Textarea
                value={newGroupData.description}
                onChange={(e) => setNewGroupData({...newGroupData, description: e.target.value})}
                placeholder="What's this group about?"
                className="font-pixelated text-xs resize-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is-private"
                checked={newGroupData.is_private}
                onChange={(e) => setNewGroupData({...newGroupData, is_private: e.target.checked})}
                className="rounded border-gray-300"
              />
              <label htmlFor="is-private" className="font-pixelated text-xs cursor-pointer">
                Private Group (requires approval to join)
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupData.name.trim()}
              className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Join {selectedGroup?.name}</DialogTitle>
            <DialogDescription className="font-pixelated text-xs">
              This is a private group. Send a request to join.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Message (optional)</label>
              <Textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Why do you want to join this group?"
                className="font-pixelated text-xs resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowJoinDialog(false)}
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createJoinRequest()}
              className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Delete Group</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to delete this group? This action cannot be undone and all messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Leave Group</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to leave this group? You'll need to be invited back to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
            >
              Leave Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

export default Vortex;