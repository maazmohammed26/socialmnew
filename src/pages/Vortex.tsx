import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Send, 
  Plus, 
  UserPlus, 
  Settings, 
  MoreVertical, 
  UserCheck, 
  X, 
  Info,
  MessageSquare,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface GroupMessage {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_name: string;
  sender_username: string;
  sender_avatar: string | null;
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  name: string;
  username: string;
  avatar: string | null;
}

export function Vortex() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [showGroupInfoDialog, setShowGroupInfoDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showJoinRequestsDialog, setShowJoinRequestsDialog] = useState(false);
  const [showLeaveGroupConfirm, setShowLeaveGroupConfirm] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    avatar: '',
    is_private: true
  });
  const [groupSuggestions, setGroupSuggestions] = useState<any[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchUserGroups();
      fetchGroupSuggestions();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers();
      fetchGroupMessages();
      fetchJoinRequests();
      
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
            
            // Fetch the sender's profile information
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name, username, avatar')
              .eq('id', payload.new.sender_id)
              .single();
            
            if (senderProfile) {
              const newMessage: GroupMessage = {
                ...payload.new,
                sender_name: senderProfile.name,
                sender_username: senderProfile.username,
                sender_avatar: senderProfile.avatar
              };
              
              // Add the new message to state
              setGroupMessages(prev => [...prev, newMessage]);
              
              // Scroll to bottom
              setTimeout(() => {
                scrollToBottom();
              }, 100);
            }
          }
        )
        .subscribe();
      
      // Set up real-time subscription for members
      const membersChannel = supabase
        .channel(`group-members-${selectedGroup.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'group_members',
            filter: `group_id=eq.${selectedGroup.id}`
          }, 
          () => {
            fetchGroupMembers();
          }
        )
        .subscribe();
      
      // Set up real-time subscription for join requests
      const requestsChannel = supabase
        .channel(`group-requests-${selectedGroup.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'group_join_requests',
            filter: `group_id=eq.${selectedGroup.id}`
          }, 
          () => {
            fetchJoinRequests();
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(messagesChannel);
        supabase.removeChannel(membersChannel);
        supabase.removeChannel(requestsChannel);
      };
    }
  }, [selectedGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [groupMessages]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        setCurrentUser({ ...user, ...profile });
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      
      // Get groups where user is a member
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups:group_id (
            id,
            name,
            description,
            avatar,
            is_private,
            created_by,
            created_at,
            updated_at,
            member_count,
            max_members
          )
        `)
        .eq('user_id', currentUser.id);
      
      if (memberError) throw memberError;
      
      const formattedGroups = memberGroups.map(item => item.groups);
      
      // Sort groups by updated_at (most recent first)
      formattedGroups.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      setGroups(formattedGroups);
      
      // If there are groups, select the first one
      if (formattedGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(formattedGroups[0]);
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load your groups'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupSuggestions = async () => {
    try {
      const { data, error } = await supabase.rpc('get_group_suggestions', {
        user_uuid: currentUser.id,
        limit_count: 5
      });
      
      if (error) throw error;
      
      setGroupSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching group suggestions:', error);
    }
  };

  const fetchGroupMembers = async () => {
    if (!selectedGroup) return;
    
    try {
      const { data, error } = await supabase.rpc('get_group_members_with_profiles', {
        group_uuid: selectedGroup.id
      });
      
      if (error) throw error;
      
      setGroupMembers(data || []);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const fetchGroupMessages = async () => {
    if (!selectedGroup) return;
    
    try {
      const { data, error } = await supabase.rpc('get_group_messages_with_profiles', {
        group_uuid: selectedGroup.id,
        limit_count: 100,
        offset_count: 0
      });
      
      if (error) throw error;
      
      setGroupMessages(data || []);
      
      // Scroll to bottom after messages load
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Error fetching group messages:', error);
    }
  };

  const fetchJoinRequests = async () => {
    if (!selectedGroup) return;
    
    // Check if user is an admin
    const isAdmin = groupMembers.some(
      member => member.user_id === currentUser.id && member.role === 'admin'
    );
    
    if (!isAdmin) return;
    
    try {
      const { data, error } = await supabase.rpc('get_group_join_requests_with_profiles', {
        group_uuid: selectedGroup.id
      });
      
      if (error) throw error;
      
      setJoinRequests(data || []);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !currentUser || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: selectedGroup.id,
          sender_id: currentUser.id,
          content: newMessage.trim(),
          message_type: 'text'
        })
        .select();
      
      if (error) throw error;
      
      setNewMessage('');
      
      // No need to update messages state as the real-time subscription will handle it
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

  const createGroup = async () => {
    if (!newGroup.name.trim() || processingAction) return;
    
    try {
      setProcessingAction(true);
      
      const { data, error } = await supabase.rpc('create_group_with_admin', {
        p_name: newGroup.name.trim(),
        p_description: newGroup.description.trim(),
        p_avatar: newGroup.avatar.trim() || null,
        p_is_private: newGroup.is_private,
        p_creator_id: currentUser.id
      });
      
      if (error) throw error;
      
      toast({
        title: 'Group created!',
        description: 'Your new group has been created successfully'
      });
      
      // Reset form
      setNewGroup({
        name: '',
        description: '',
        avatar: '',
        is_private: true
      });
      
      setShowCreateGroupDialog(false);
      
      // Refresh groups
      await fetchUserGroups();
      
      // Select the newly created group
      if (data) {
        const { data: newGroupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', data)
          .single();
        
        if (!groupError && newGroupData) {
          setSelectedGroup(newGroupData);
        }
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create group'
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const joinGroup = async () => {
    if (!selectedSuggestion || processingAction) return;
    
    try {
      setProcessingAction(true);
      
      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: selectedSuggestion.id,
          user_id: currentUser.id,
          message: joinMessage.trim() || null,
          status: 'pending'
        });
      
      if (error) throw error;
      
      toast({
        title: 'Request sent!',
        description: 'Your request to join the group has been sent'
      });
      
      setJoinMessage('');
      setSelectedSuggestion(null);
      setShowJoinGroupDialog(false);
      
      // Refresh suggestions
      fetchGroupSuggestions();
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send join request'
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const approveJoinRequest = async (requestId: string) => {
    if (processingAction) return;
    
    try {
      setProcessingAction(true);
      
      const { data, error } = await supabase.rpc('approve_group_join_request', {
        request_uuid: requestId,
        admin_uuid: currentUser.id
      });
      
      if (error) throw error;
      
      if (data) {
        toast({
          title: 'Request approved',
          description: 'The user has been added to the group'
        });
        
        // Refresh join requests and members
        fetchJoinRequests();
        fetchGroupMembers();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to approve request'
        });
      }
    } catch (error) {
      console.error('Error approving join request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve request'
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const rejectJoinRequest = async (requestId: string) => {
    if (processingAction) return;
    
    try {
      setProcessingAction(true);
      
      const { data, error } = await supabase.rpc('reject_group_join_request', {
        request_uuid: requestId,
        admin_uuid: currentUser.id
      });
      
      if (error) throw error;
      
      if (data) {
        toast({
          title: 'Request rejected',
          description: 'The join request has been rejected'
        });
        
        // Refresh join requests
        fetchJoinRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to reject request'
        });
      }
    } catch (error) {
      console.error('Error rejecting join request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject request'
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const leaveGroup = async () => {
    if (!selectedGroup || processingAction) return;
    
    try {
      setProcessingAction(true);
      
      // Check if user is the only admin
      const isAdmin = groupMembers.some(
        member => member.user_id === currentUser.id && member.role === 'admin'
      );
      
      const adminCount = groupMembers.filter(member => member.role === 'admin').length;
      
      if (isAdmin && adminCount === 1 && groupMembers.length > 1) {
        toast({
          variant: 'destructive',
          title: 'Cannot leave group',
          description: 'You are the only admin. Please promote another member to admin before leaving.'
        });
        setShowLeaveGroupConfirm(false);
        return;
      }
      
      // Delete the member record
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
      
      toast({
        title: 'Left group',
        description: 'You have left the group successfully'
      });
      
      setShowLeaveGroupConfirm(false);
      
      // Remove the group from the list and select another group
      setGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
      setSelectedGroup(null);
      
      // Refresh groups
      fetchUserGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to leave group'
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isUserAdmin = () => {
    return groupMembers.some(
      member => member.user_id === currentUser?.id && member.role === 'admin'
    );
  };

  const pendingRequestsCount = joinRequests.length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-60px)] bg-background rounded-lg shadow-lg overflow-hidden">
        <div className="flex h-full">
          {/* Groups List */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedGroup ? 'hidden md:flex' : ''}`}>
            {/* Groups List Header */}
            <div className="p-3 border-b bg-muted/30 flex-shrink-0 flex items-center justify-between">
              <h2 className="font-pixelated text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                Vortex Groups
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCreateGroupDialog(true)}
                  size="icon"
                  className="h-7 w-7 bg-social-green hover:bg-social-light-green text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setShowJoinGroupDialog(true)}
                  size="icon"
                  className="h-7 w-7 bg-social-blue hover:bg-social-blue/90 text-white"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Groups List - Scrollable */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <div className="space-y-2 p-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1">
                          <div className="h-3 w-20 bg-muted rounded mb-1" />
                          <div className="h-2 w-24 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : groups.length > 0 ? (
                  <div className="p-2">
                    {groups.map(group => (
                      <div
                        key={group.id}
                        onClick={() => setSelectedGroup(group)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                          selectedGroup?.id === group.id ? 'bg-accent shadow-md' : ''
                        }`}
                      >
                        <Avatar className="h-10 w-10 border-2 border-background">
                          {group.avatar ? (
                            <AvatarImage src={group.avatar} />
                          ) : (
                            <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                              {group.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm font-pixelated">
                            {group.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate font-pixelated">
                            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 font-pixelated text-sm">No groups yet</p>
                    <Button 
                      onClick={() => setShowCreateGroupDialog(true)}
                      variant="default" 
                      className="font-pixelated text-xs bg-social-green hover:bg-social-light-green text-white"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create Group
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col h-full ${!selectedGroup ? 'hidden md:flex' : ''}`}>
            {selectedGroup ? (
              <>
                {/* Group Header */}
                <div className="flex items-center gap-3 p-3 border-b bg-muted/30 flex-shrink-0">
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
                      <AvatarImage src={selectedGroup.avatar} />
                    ) : (
                      <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                        {selectedGroup.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm font-pixelated">{selectedGroup.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-pixelated">
                      {selectedGroup.member_count} {selectedGroup.member_count === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => setShowGroupInfoDialog(true)}
                        className="font-pixelated text-xs"
                      >
                        <Info className="h-3 w-3 mr-2" />
                        Group Info
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowMembersDialog(true)}
                        className="font-pixelated text-xs"
                      >
                        <Users className="h-3 w-3 mr-2" />
                        Members ({selectedGroup.member_count})
                      </DropdownMenuItem>
                      {isUserAdmin() && (
                        <DropdownMenuItem 
                          onClick={() => setShowJoinRequestsDialog(true)}
                          className="font-pixelated text-xs relative"
                        >
                          <UserPlus className="h-3 w-3 mr-2" />
                          Join Requests
                          {pendingRequestsCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="ml-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
                            >
                              {pendingRequestsCount}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => setShowLeaveGroupConfirm(true)}
                        className="text-destructive font-pixelated text-xs"
                      >
                        <X className="h-3 w-3 mr-2" />
                        Leave Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-3 space-y-3">
                      {groupMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                          <h3 className="font-pixelated text-sm font-medium mb-2">No messages yet</h3>
                          <p className="font-pixelated text-xs text-muted-foreground text-center max-w-xs">
                            Be the first to send a message in this group!
                          </p>
                        </div>
                      ) : (
                        groupMessages.map((message) => {
                          const isCurrentUser = message.sender_id === currentUser?.id;
                          
                          return (
                            <div 
                              key={message.id}
                              className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex gap-2 max-w-[75%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                                  {message.sender_avatar ? (
                                    <AvatarImage src={message.sender_avatar} />
                                  ) : (
                                    <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                                      {message.sender_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div 
                                  className={`p-2 rounded-lg relative ${
                                    isCurrentUser 
                                      ? 'bg-social-green text-white' 
                                      : 'bg-muted'
                                  }`}
                                >
                                  {!isCurrentUser && (
                                    <p className="text-xs font-medium mb-1 font-pixelated">
                                      {message.sender_name}
                                    </p>
                                  )}
                                  <p className="text-xs whitespace-pre-wrap break-words font-pixelated">
                                    {message.content}
                                  </p>
                                  <p className="text-xs opacity-70 mt-1 text-right font-pixelated">
                                    {formatMessageTime(message.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* Message Input */}
                <div className="border-t bg-background p-3">
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Type a message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="min-h-[52px] max-h-[120px] resize-none flex-1 font-pixelated text-xs"
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-social-green hover:bg-social-light-green text-white flex-shrink-0 h-[52px] w-12"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Zap className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-lg font-semibold mb-2 font-pixelated">Welcome to Vortex</h2>
                <p className="text-muted-foreground font-pixelated text-sm mb-6 max-w-md">
                  Create or join groups to start chatting with friends and communities in real-time.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowCreateGroupDialog(true)}
                    className="font-pixelated text-xs bg-social-green hover:bg-social-light-green text-white"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Group
                  </Button>
                  <Button 
                    onClick={() => setShowJoinGroupDialog(true)}
                    variant="outline"
                    className="font-pixelated text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Join Group
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium font-pixelated">Group Name</label>
              <Input
                placeholder="Enter group name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="font-pixelated text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-pixelated">Description</label>
              <Textarea
                placeholder="Enter group description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                className="font-pixelated text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium font-pixelated">Avatar URL (optional)</label>
              <Input
                placeholder="Enter avatar URL"
                value={newGroup.avatar}
                onChange={(e) => setNewGroup({ ...newGroup, avatar: e.target.value })}
                className="font-pixelated text-xs"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_private"
                checked={newGroup.is_private}
                onChange={(e) => setNewGroup({ ...newGroup, is_private: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="is_private" className="text-sm font-pixelated">
                Private Group (members must be approved)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowCreateGroupDialog(false)}
              variant="outline"
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={createGroup}
              disabled={!newGroup.name.trim() || processingAction}
              className="font-pixelated text-xs bg-social-green hover:bg-social-light-green text-white"
            >
              {processingAction ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog open={showJoinGroupDialog} onOpenChange={setShowJoinGroupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Join a Group</DialogTitle>
            <DialogDescription className="font-pixelated text-xs">
              Discover groups with your friends
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {groupSuggestions.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium font-pixelated">Suggested Groups</h3>
                {groupSuggestions.map(group => (
                  <Card 
                    key={group.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedSuggestion?.id === group.id ? 'border-social-green' : ''
                    }`}
                    onClick={() => setSelectedSuggestion(group)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {group.avatar ? (
                            <AvatarImage src={group.avatar} />
                          ) : (
                            <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                              {group.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-pixelated text-sm font-medium">{group.name}</h4>
                          <p className="font-pixelated text-xs text-muted-foreground">
                            {group.member_count} members • {group.mutual_members} mutual friends
                          </p>
                          {group.description && (
                            <p className="font-pixelated text-xs mt-1 line-clamp-1">
                              {group.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {selectedSuggestion && (
                  <div className="space-y-2 pt-2">
                    <h3 className="text-sm font-medium font-pixelated">Join Request Message (Optional)</h3>
                    <Textarea
                      placeholder="Why do you want to join this group?"
                      value={joinMessage}
                      onChange={(e) => setJoinMessage(e.target.value)}
                      className="font-pixelated text-xs"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-pixelated text-sm font-medium mb-1">No suggestions found</h3>
                <p className="font-pixelated text-xs text-muted-foreground">
                  We couldn't find any groups to suggest. Try creating your own group!
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowJoinGroupDialog(false);
                setSelectedSuggestion(null);
                setJoinMessage('');
              }}
              variant="outline"
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={joinGroup}
              disabled={!selectedSuggestion || processingAction}
              className="font-pixelated text-xs bg-social-blue hover:bg-social-blue/90 text-white"
            >
              {processingAction ? 'Sending...' : 'Send Join Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Info Dialog */}
      <Dialog open={showGroupInfoDialog} onOpenChange={setShowGroupInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Group Information</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {selectedGroup.avatar ? (
                    <AvatarImage src={selectedGroup.avatar} />
                  ) : (
                    <AvatarFallback className="bg-social-green text-white font-pixelated text-sm">
                      {selectedGroup.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-pixelated text-lg font-medium">{selectedGroup.name}</h3>
                  <p className="font-pixelated text-xs text-muted-foreground">
                    Created {formatDistanceToNow(new Date(selectedGroup.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-pixelated text-sm font-medium">Description</h4>
                <p className="font-pixelated text-xs bg-muted p-3 rounded-md">
                  {selectedGroup.description || 'No description provided'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted p-3 rounded-md text-center">
                  <p className="font-pixelated text-sm font-medium">{selectedGroup.member_count}</p>
                  <p className="font-pixelated text-xs text-muted-foreground">Members</p>
                </div>
                <div className="bg-muted p-3 rounded-md text-center">
                  <p className="font-pixelated text-sm font-medium">
                    {selectedGroup.is_private ? 'Private' : 'Public'}
                  </p>
                  <p className="font-pixelated text-xs text-muted-foreground">Group Type</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Group Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {groupMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {member.avatar ? (
                      <AvatarImage src={member.avatar} />
                    ) : (
                      <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                        {member.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-pixelated text-sm font-medium">{member.name}</p>
                    <p className="font-pixelated text-xs text-muted-foreground">@{member.username}</p>
                  </div>
                </div>
                <Badge variant={member.role === 'admin' ? 'default' : 'outline'} className="font-pixelated text-xs">
                  {member.role === 'admin' ? 'Admin' : 'Member'}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Requests Dialog */}
      <Dialog open={showJoinRequestsDialog} onOpenChange={setShowJoinRequestsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Join Requests</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {joinRequests.length > 0 ? (
              joinRequests.map(request => (
                <Card key={request.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-8 w-8">
                        {request.avatar ? (
                          <AvatarImage src={request.avatar} />
                        ) : (
                          <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                            {request.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-pixelated text-sm font-medium">{request.name}</p>
                        <p className="font-pixelated text-xs text-muted-foreground">
                          Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    
                    {request.message && (
                      <p className="font-pixelated text-xs bg-muted p-2 rounded-md mb-3">
                        {request.message}
                      </p>
                    )}
                    
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => rejectJoinRequest(request.id)}
                        variant="outline"
                        size="sm"
                        className="font-pixelated text-xs"
                        disabled={processingAction}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => approveJoinRequest(request.id)}
                        size="sm"
                        className="font-pixelated text-xs bg-social-green hover:bg-social-light-green text-white"
                        disabled={processingAction}
                      >
                        <UserCheck className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-6">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-pixelated text-sm font-medium mb-1">No pending requests</h3>
                <p className="font-pixelated text-xs text-muted-foreground">
                  When users request to join your group, they'll appear here.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={showLeaveGroupConfirm} onOpenChange={setShowLeaveGroupConfirm}>
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
              onClick={leaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
              disabled={processingAction}
            >
              {processingAction ? 'Leaving...' : 'Leave Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

export default Vortex;