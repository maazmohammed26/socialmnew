import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserPlus, 
  MessageSquare, 
  Globe, 
  Search, 
  Plus, 
  Send, 
  Lock, 
  Settings, 
  MoreVertical, 
  Trash2, 
  LogOut, 
  UserCheck,
  X,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
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
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
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

interface JoinRequest {
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

interface GroupSuggestion {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  member_count: number;
  created_by: string;
  created_at: string;
  mutual_members: number;
}

export function Vortex() {
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<GroupSuggestion[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showJoinRequestsDialog, setShowJoinRequestsDialog] = useState(false);
  const [showGroupInfoDialog, setShowGroupInfoDialog] = useState(false);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState<{show: boolean, group: GroupSuggestion | null}>({show: false, group: null});
  const [joinMessage, setJoinMessage] = useState('');
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    avatar: '',
    is_private: true
  });
  const [loading, setLoading] = useState({
    myGroups: true,
    suggestedGroups: true,
    groupDetails: false,
    createGroup: false,
    sendMessage: false,
    joinGroup: false,
    leaveGroup: false,
    deleteGroup: false,
    approveRequest: false,
    rejectRequest: false
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
          
          setCurrentUser(profile);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch my groups
  useEffect(() => {
    const fetchMyGroups = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(prev => ({ ...prev, myGroups: true }));
        
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
        
        if (memberError) {
          console.error('Error fetching my groups:', memberError);
          setMyGroups([]);
          setLoading(prev => ({ ...prev, myGroups: false }));
          return;
        }
        
        // Format groups data
        const formattedGroups = memberGroups?.map(item => ({
          ...item.groups,
          unread_count: 0, // Will be updated with actual count
          last_message: '',
          last_message_time: item.groups.updated_at
        })) || [];
        
        // Sort by last activity
        formattedGroups.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        
        setMyGroups(formattedGroups);
      } catch (error) {
        console.error('Error fetching my groups:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load your groups'
        });
      } finally {
        setLoading(prev => ({ ...prev, myGroups: false }));
      }
    };

    fetchMyGroups();
  }, [currentUser, toast]);

  // Fetch suggested groups
  useEffect(() => {
    const fetchSuggestedGroups = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(prev => ({ ...prev, suggestedGroups: true }));
        
        // Get groups the user is not a member of
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .not('id', 'in', `(
            SELECT group_id FROM group_members 
            WHERE user_id = '${currentUser.id}'
          )`)
          .limit(10);
        
        if (error) {
          console.error('Error fetching suggested groups:', error);
          setSuggestedGroups([]);
          setLoading(prev => ({ ...prev, suggestedGroups: false }));
          return;
        }
        
        // Format as group suggestions
        const suggestions = data.map(group => ({
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          member_count: group.member_count,
          created_by: group.created_by,
          created_at: group.created_at,
          mutual_members: 0 // Placeholder, would be calculated in a real implementation
        }));
        
        setSuggestedGroups(suggestions);
      } catch (error) {
        console.error('Error fetching suggested groups:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load suggested groups'
        });
      } finally {
        setLoading(prev => ({ ...prev, suggestedGroups: false }));
      }
    };

    fetchSuggestedGroups();
  }, [currentUser, toast]);

  // Fetch group details when a group is selected
  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!selectedGroup || !currentUser) return;
      
      try {
        setLoading(prev => ({ ...prev, groupDetails: true }));
        
        // Fetch group members
        const { data: members, error: membersError } = await supabase
          .from('group_members')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            profiles:user_id (
              name,
              username,
              avatar
            )
          `)
          .eq('group_id', selectedGroup.id);
        
        if (membersError) throw membersError;
        
        // Format members data
        const formattedMembers = members.map(member => ({
          id: member.id,
          user_id: member.user_id,
          role: member.role as 'admin' | 'member',
          joined_at: member.joined_at,
          name: member.profiles.name,
          username: member.profiles.username,
          avatar: member.profiles.avatar
        }));
        
        setGroupMembers(formattedMembers);
        
        // Check if current user is admin
        const isUserAdmin = formattedMembers.some(
          member => member.user_id === currentUser.id && member.role === 'admin'
        );
        
        setIsAdmin(isUserAdmin);
        
        // If user is admin, fetch join requests
        if (isUserAdmin) {
          const { data: requests, error: requestsError } = await supabase
            .from('group_join_requests')
            .select(`
              id,
              user_id,
              status,
              message,
              created_at,
              profiles:user_id (
                name,
                username,
                avatar
              )
            `)
            .eq('group_id', selectedGroup.id)
            .eq('status', 'pending');
          
          if (requestsError) throw requestsError;
          
          // Format join requests data
          const formattedRequests = requests.map(request => ({
            id: request.id,
            user_id: request.user_id,
            status: request.status as 'pending',
            message: request.message,
            created_at: request.created_at,
            name: request.profiles.name,
            username: request.profiles.username,
            avatar: request.profiles.avatar
          }));
          
          setJoinRequests(formattedRequests);
        }
        
        // Fetch group messages
        const { data: messages, error: messagesError } = await supabase
          .from('group_messages')
          .select(`
            id,
            sender_id,
            content,
            message_type,
            created_at,
            profiles:sender_id (
              name,
              username,
              avatar
            )
          `)
          .eq('group_id', selectedGroup.id)
          .order('created_at', { ascending: true });
        
        if (messagesError) throw messagesError;
        
        // Format messages data
        const formattedMessages = messages.map(message => ({
          id: message.id,
          sender_id: message.sender_id,
          content: message.content,
          message_type: message.message_type as 'text' | 'image' | 'file',
          created_at: message.created_at,
          sender_name: message.profiles.name,
          sender_username: message.profiles.username,
          sender_avatar: message.profiles.avatar
        }));
        
        setGroupMessages(formattedMessages);
        
        // Scroll to bottom of messages
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
      } finally {
        setLoading(prev => ({ ...prev, groupDetails: false }));
      }
    };

    fetchGroupDetails();
  }, [selectedGroup, currentUser, toast]);

  // Set up real-time subscriptions for group messages
  useEffect(() => {
    if (!selectedGroup || !currentUser) return;
    
    // Subscribe to new messages
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
          
          // Fetch sender details
          const { data: sender } = await supabase
            .from('profiles')
            .select('name, username, avatar')
            .eq('id', payload.new.sender_id)
            .single();
          
          // Add new message to state
          const newMessage: GroupMessage = {
            id: payload.new.id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            message_type: payload.new.message_type,
            created_at: payload.new.created_at,
            sender_name: sender?.name || 'Unknown',
            sender_username: sender?.username || 'unknown',
            sender_avatar: sender?.avatar || null
          };
          
          setGroupMessages(prev => [...prev, newMessage]);
          
          // Scroll to bottom
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      )
      .subscribe();
    
    // Subscribe to join requests if admin
    let joinRequestsChannel;
    if (isAdmin) {
      joinRequestsChannel = supabase
        .channel(`group-requests-${selectedGroup.id}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'group_join_requests',
            filter: `group_id=eq.${selectedGroup.id}`
          }, 
          async (payload) => {
            console.log('New join request:', payload);
            
            // Fetch requester details
            const { data: requester } = await supabase
              .from('profiles')
              .select('name, username, avatar')
              .eq('id', payload.new.user_id)
              .single();
            
            // Add new request to state
            const newRequest: JoinRequest = {
              id: payload.new.id,
              user_id: payload.new.user_id,
              status: payload.new.status,
              message: payload.new.message,
              created_at: payload.new.created_at,
              name: requester?.name || 'Unknown',
              username: requester?.username || 'unknown',
              avatar: requester?.avatar || null
            };
            
            setJoinRequests(prev => [...prev, newRequest]);
            
            // Show notification
            toast({
              title: 'New Join Request',
              description: `${requester?.name} wants to join the group`,
            });
          }
        )
        .subscribe();
    }
    
    // Subscribe to member changes
    const membersChannel = supabase
      .channel(`group-members-${selectedGroup.id}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'group_members',
          filter: `group_id=eq.${selectedGroup.id}`
        }, 
        async () => {
          // Refetch members on any change
          const { data: members } = await supabase
            .from('group_members')
            .select(`
              id,
              user_id,
              role,
              joined_at,
              profiles:user_id (
                name,
                username,
                avatar
              )
            `)
            .eq('group_id', selectedGroup.id);
          
          if (members) {
            const formattedMembers = members.map(member => ({
              id: member.id,
              user_id: member.user_id,
              role: member.role as 'admin' | 'member',
              joined_at: member.joined_at,
              name: member.profiles.name,
              username: member.profiles.username,
              avatar: member.profiles.avatar
            }));
            
            setGroupMembers(formattedMembers);
            
            // Update admin status
            const isUserAdmin = formattedMembers.some(
              member => member.user_id === currentUser.id && member.role === 'admin'
            );
            
            setIsAdmin(isUserAdmin);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(messagesChannel);
      if (joinRequestsChannel) supabase.removeChannel(joinRequestsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [selectedGroup, currentUser, isAdmin, toast]);

  const handleCreateGroup = async () => {
    if (!currentUser) return;
    
    if (!newGroupData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Group name is required'
      });
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, createGroup: true }));
      
      // Call the RPC function to create a group and add creator as admin
      const { data, error } = await supabase.rpc('create_group_with_admin', {
        p_name: newGroupData.name.trim(),
        p_description: newGroupData.description.trim(),
        p_avatar: newGroupData.avatar.trim(),
        p_is_private: newGroupData.is_private,
        p_creator_id: currentUser.id
      });
      
      if (error) throw error;
      
      // Refresh my groups
      const { data: newGroup } = await supabase
        .from('groups')
        .select('*')
        .eq('id', data)
        .single();
      
      if (newGroup) {
        const formattedGroup = {
          ...newGroup,
          unread_count: 0,
          last_message: '',
          last_message_time: newGroup.updated_at
        };
        
        setMyGroups(prev => [formattedGroup, ...prev]);
        setSelectedGroup(formattedGroup);
      }
      
      // Reset form and close dialog
      setNewGroupData({
        name: '',
        description: '',
        avatar: '',
        is_private: true
      });
      
      setShowCreateDialog(false);
      
      toast({
        title: 'Group Created',
        description: 'Your new group has been created successfully'
      });
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create group'
      });
    } finally {
      setLoading(prev => ({ ...prev, createGroup: false }));
    }
  };

  const handleSendMessage = async () => {
    if (!selectedGroup || !currentUser || !newMessage.trim() || loading.sendMessage) return;
    
    try {
      setLoading(prev => ({ ...prev, sendMessage: true }));
      
      // Insert message
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: selectedGroup.id,
          sender_id: currentUser.id,
          content: newMessage.trim(),
          message_type: 'text'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Clear input
      setNewMessage('');
      
      // Update group's last message in the list
      setMyGroups(prev => 
        prev.map(group => 
          group.id === selectedGroup.id 
            ? { 
                ...group, 
                last_message: newMessage.trim(),
                last_message_time: data.created_at,
                updated_at: data.created_at
              } 
            : group
        ).sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      );
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
    } finally {
      setLoading(prev => ({ ...prev, sendMessage: false }));
    }
  };

  const handleJoinGroup = async () => {
    if (!showJoinGroupDialog.group || !currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, joinGroup: true }));
      
      // Create join request
      const { error } = await supabase
        .from('group_join_requests')
        .insert({
          group_id: showJoinGroupDialog.group.id,
          user_id: currentUser.id,
          message: joinMessage.trim(),
          status: 'pending'
        });
      
      if (error) throw error;
      
      // Remove from suggested groups
      setSuggestedGroups(prev => 
        prev.filter(group => group.id !== showJoinGroupDialog.group?.id)
      );
      
      // Reset and close dialog
      setJoinMessage('');
      setShowJoinGroupDialog({ show: false, group: null });
      
      toast({
        title: 'Request Sent',
        description: 'Your request to join the group has been sent'
      });
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send join request'
      });
    } finally {
      setLoading(prev => ({ ...prev, joinGroup: false }));
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!currentUser || !isAdmin) return;
    
    try {
      setLoading(prev => ({ ...prev, approveRequest: true }));
      
      // Call RPC function to approve request
      const { data, error } = await supabase.rpc('approve_group_join_request', {
        request_uuid: requestId,
        admin_uuid: currentUser.id
      });
      
      if (error) throw error;
      
      if (data) {
        // Remove from requests list
        setJoinRequests(prev => 
          prev.filter(request => request.id !== requestId)
        );
        
        // Update group member count
        if (selectedGroup) {
          setSelectedGroup(prev => 
            prev ? { ...prev, member_count: prev.member_count + 1 } : null
          );
          
          setMyGroups(prev => 
            prev.map(group => 
              group.id === selectedGroup.id 
                ? { ...group, member_count: group.member_count + 1 } 
                : group
            )
          );
        }
        
        toast({
          title: 'Request Approved',
          description: 'The user has been added to the group'
        });
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve join request'
      });
    } finally {
      setLoading(prev => ({ ...prev, approveRequest: false }));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!currentUser || !isAdmin) return;
    
    try {
      setLoading(prev => ({ ...prev, rejectRequest: true }));
      
      // Call RPC function to reject request
      const { data, error } = await supabase.rpc('reject_group_join_request', {
        request_uuid: requestId,
        admin_uuid: currentUser.id
      });
      
      if (error) throw error;
      
      if (data) {
        // Remove from requests list
        setJoinRequests(prev => 
          prev.filter(request => request.id !== requestId)
        );
        
        toast({
          title: 'Request Rejected',
          description: 'The join request has been rejected'
        });
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject join request'
      });
    } finally {
      setLoading(prev => ({ ...prev, rejectRequest: false }));
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup || !currentUser) return;
    
    try {
      setLoading(prev => ({ ...prev, leaveGroup: true }));
      
      // Get member record
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', selectedGroup.id)
        .eq('user_id', currentUser.id)
        .single();
      
      if (memberError) throw memberError;
      
      // Delete member record
      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberData.id);
      
      if (deleteError) throw deleteError;
      
      // Update group member count
      const { error: updateError } = await supabase
        .from('groups')
        .update({ member_count: selectedGroup.member_count - 1 })
        .eq('id', selectedGroup.id);
      
      if (updateError) throw updateError;
      
      // Remove from my groups
      setMyGroups(prev => 
        prev.filter(group => group.id !== selectedGroup.id)
      );
      
      // Clear selected group
      setSelectedGroup(null);
      
      setShowLeaveGroupDialog(false);
      
      toast({
        title: 'Left Group',
        description: 'You have left the group successfully'
      });
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to leave group'
      });
    } finally {
      setLoading(prev => ({ ...prev, leaveGroup: false }));
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup || !currentUser || !isAdmin) return;
    
    try {
      setLoading(prev => ({ ...prev, deleteGroup: true }));
      
      // Delete group
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', selectedGroup.id)
        .eq('created_by', currentUser.id);
      
      if (error) throw error;
      
      // Remove from my groups
      setMyGroups(prev => 
        prev.filter(group => group.id !== selectedGroup.id)
      );
      
      // Clear selected group
      setSelectedGroup(null);
      
      setShowDeleteGroupDialog(false);
      
      toast({
        title: 'Group Deleted',
        description: 'The group has been deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete group'
      });
    } finally {
      setLoading(prev => ({ ...prev, deleteGroup: false }));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
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

  const filterSuggestions = (groups: GroupSuggestion[]) => {
    if (!searchQuery.trim()) return groups;
    
    const query = searchQuery.toLowerCase();
    return groups.filter(group => 
      group.name.toLowerCase().includes(query) || 
      (group.description && group.description.toLowerCase().includes(query))
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-60px)] bg-background rounded-lg shadow-lg overflow-hidden">
        <div className="flex h-full">
          {/* Groups List */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedGroup ? 'hidden md:flex' : ''}`}>
            {/* Header */}
            <div className="p-3 border-b bg-muted/30 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-social-green" />
                  <h2 className="font-pixelated text-sm font-medium">Vortex Groups</h2>
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="sm"
                  className="h-8 w-8 p-0 bg-social-green hover:bg-social-light-green text-white rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 font-pixelated text-xs"
                />
              </div>
            </div>

            {/* Groups Tabs */}
            <Tabs defaultValue="myGroups" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 mx-3 mt-3">
                <TabsTrigger value="myGroups" className="font-pixelated text-xs">
                  My Groups
                </TabsTrigger>
                <TabsTrigger value="suggested" className="font-pixelated text-xs">
                  Suggested
                </TabsTrigger>
              </TabsList>

              {/* My Groups Tab */}
              <TabsContent value="myGroups" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2">
                    {loading.myGroups ? (
                      // Loading skeleton
                      Array(3).fill(0).map((_, i) => (
                        <div key={i} className="p-3 border rounded-lg animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted"></div>
                            <div className="flex-1">
                              <div className="h-4 w-24 bg-muted rounded mb-2"></div>
                              <div className="h-3 w-32 bg-muted rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : filterGroups(myGroups).length > 0 ? (
                      // My groups list
                      filterGroups(myGroups).map(group => (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroup(group)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                            selectedGroup?.id === group.id ? 'bg-muted border-social-green' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {group.avatar ? (
                                <AvatarImage src={group.avatar} alt={group.name} />
                              ) : (
                                <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                                  {group.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <h3 className="font-pixelated text-xs font-medium truncate">{group.name}</h3>
                                {group.is_private && (
                                  <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                )}
                              </div>
                              <p className="font-pixelated text-xs text-muted-foreground truncate">
                                {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                              </p>
                              {group.last_message && (
                                <p className="font-pixelated text-xs text-muted-foreground truncate mt-1">
                                  {group.last_message.length > 20 
                                    ? group.last_message.substring(0, 20) + '...' 
                                    : group.last_message}
                                </p>
                              )}
                            </div>
                            {group.unread_count > 0 && (
                              <Badge className="bg-social-green text-white h-5 w-5 rounded-full p-0 flex items-center justify-center">
                                {group.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      // Empty state
                      <div className="text-center py-8">
                        <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <h3 className="font-pixelated text-sm font-medium mb-2">No groups yet</h3>
                        <p className="font-pixelated text-xs text-muted-foreground mb-4">
                          Create a new group or join suggested groups to get started
                        </p>
                        <Button
                          onClick={() => setShowCreateDialog(true)}
                          size="sm"
                          className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Group
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Suggested Groups Tab */}
              <TabsContent value="suggested" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-2">
                    {loading.suggestedGroups ? (
                      // Loading skeleton
                      Array(3).fill(0).map((_, i) => (
                        <div key={i} className="p-3 border rounded-lg animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted"></div>
                            <div className="flex-1">
                              <div className="h-4 w-24 bg-muted rounded mb-2"></div>
                              <div className="h-3 w-32 bg-muted rounded"></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : filterSuggestions(suggestedGroups).length > 0 ? (
                      // Suggested groups list
                      filterSuggestions(suggestedGroups).map(group => (
                        <div
                          key={group.id}
                          className="p-3 border rounded-lg transition-all duration-200 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              {group.avatar ? (
                                <AvatarImage src={group.avatar} alt={group.name} />
                              ) : (
                                <AvatarFallback className="bg-social-blue text-white font-pixelated text-xs">
                                  {group.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-pixelated text-xs font-medium truncate">{group.name}</h3>
                              <p className="font-pixelated text-xs text-muted-foreground truncate">
                                {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                              </p>
                              {group.description && (
                                <p className="font-pixelated text-xs text-muted-foreground truncate mt-1">
                                  {group.description.length > 30 
                                    ? group.description.substring(0, 30) + '...' 
                                    : group.description}
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => setShowJoinGroupDialog({ show: true, group })}
                              size="sm"
                              className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs h-7"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Join
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      // Empty state
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <h3 className="font-pixelated text-sm font-medium mb-2">No suggested groups</h3>
                        <p className="font-pixelated text-xs text-muted-foreground mb-4">
                          Create your own group or check back later for suggestions
                        </p>
                        <Button
                          onClick={() => setShowCreateDialog(true)}
                          size="sm"
                          className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Group
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col h-full ${!selectedGroup ? 'hidden md:flex' : ''}`}>
            {selectedGroup ? (
              <>
                {/* Group Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedGroup(null)}
                      className="md:hidden h-8 w-8"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                    </Button>
                    <Avatar 
                      className="h-8 w-8 cursor-pointer"
                      onClick={() => setShowGroupInfoDialog(true)}
                    >
                      {selectedGroup.avatar ? (
                        <AvatarImage src={selectedGroup.avatar} alt={selectedGroup.name} />
                      ) : (
                        <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                          {selectedGroup.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <h2 
                          className="font-pixelated text-sm font-medium cursor-pointer hover:text-social-green transition-colors"
                          onClick={() => setShowGroupInfoDialog(true)}
                        >
                          {selectedGroup.name}
                        </h2>
                        {selectedGroup.is_private && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="font-pixelated text-xs text-muted-foreground">
                        {selectedGroup.member_count} {selectedGroup.member_count === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowMembersDialog(true)}
                      variant="ghost"
                      size="sm"
                      className="h-8 font-pixelated text-xs"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Members
                    </Button>
                    
                    {isAdmin && joinRequests.length > 0 && (
                      <Button
                        onClick={() => setShowJoinRequestsDialog(true)}
                        variant="ghost"
                        size="sm"
                        className="h-8 font-pixelated text-xs relative"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Requests
                        <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[8px] bg-social-green text-white flex items-center justify-center">
                          {joinRequests.length}
                        </Badge>
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="font-pixelated text-xs">Group Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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
                          View Members
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem 
                            onClick={() => setShowDeleteGroupDialog(true)}
                            className="font-pixelated text-xs text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete Group
                          </DropdownMenuItem>
                        )}
                        {!isAdmin && (
                          <DropdownMenuItem 
                            onClick={() => setShowLeaveGroupDialog(true)}
                            className="font-pixelated text-xs text-destructive"
                          >
                            <LogOut className="h-3 w-3 mr-2" />
                            Leave Group
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-3">
                    {groupMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                        <h3 className="font-pixelated text-sm font-medium mb-2">No messages yet</h3>
                        <p className="font-pixelated text-xs text-muted-foreground max-w-xs">
                          Be the first to send a message in this group!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Group messages by date */}
                        {(() => {
                          const messagesByDate: { [key: string]: GroupMessage[] } = {};
                          
                          groupMessages.forEach(message => {
                            const date = formatDate(message.created_at);
                            if (!messagesByDate[date]) {
                              messagesByDate[date] = [];
                            }
                            messagesByDate[date].push(message);
                          });
                          
                          return Object.entries(messagesByDate).map(([date, messages]) => (
                            <div key={date} className="space-y-3">
                              <div className="flex items-center justify-center">
                                <div className="bg-muted px-2 py-1 rounded-full">
                                  <p className="font-pixelated text-xs text-muted-foreground">{date}</p>
                                </div>
                              </div>
                              
                              {messages.map(message => {
                                const isCurrentUser = message.sender_id === currentUser?.id;
                                
                                return (
                                  <div 
                                    key={message.id}
                                    className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                  >
                                    {!isCurrentUser && (
                                      <Avatar className="h-6 w-6 mt-1">
                                        {message.sender_avatar ? (
                                          <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                                        ) : (
                                          <AvatarFallback className="bg-social-blue text-white font-pixelated text-xs">
                                            {message.sender_name.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        )}
                                      </Avatar>
                                    )}
                                    
                                    <div className={`max-w-[75%] ${isCurrentUser ? 'message-bubble-sent' : 'message-bubble-received'}`}>
                                      {!isCurrentUser && (
                                        <p className="font-pixelated text-xs font-medium mb-1">
                                          {message.sender_name}
                                        </p>
                                      )}
                                      <p className="font-pixelated text-xs whitespace-pre-wrap break-words">
                                        {message.content}
                                      </p>
                                      <p className="font-pixelated text-xs opacity-70 text-right mt-1">
                                        {formatTime(message.created_at)}
                                      </p>
                                    </div>
                                    
                                    {isCurrentUser && (
                                      <Avatar className="h-6 w-6 mt-1">
                                        {message.sender_avatar ? (
                                          <AvatarImage src={message.sender_avatar} alt={message.sender_name} />
                                        ) : (
                                          <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                                            {message.sender_name.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                        )}
                                      </Avatar>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ));
                        })()}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Message Input */}
                <div className="border-t p-3">
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
                      className="min-h-[60px] max-h-[120px] font-pixelated text-xs resize-none"
                      disabled={loading.sendMessage}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || loading.sendMessage}
                      className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Globe className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h2 className="font-pixelated text-lg font-medium mb-2">Welcome to Vortex</h2>
                <p className="font-pixelated text-sm text-muted-foreground mb-6 max-w-md">
                  Create or join groups to chat with friends, colleagues, or communities with shared interests.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
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
            <DialogTitle className="font-pixelated text-lg">Create New Group</DialogTitle>
            <DialogDescription className="font-pixelated text-sm">
              Create a group to chat with friends or colleagues
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-pixelated text-xs">Group Name</Label>
              <Input
                id="name"
                value={newGroupData.name}
                onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                placeholder="Enter group name"
                className="font-pixelated text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="font-pixelated text-xs">Description (optional)</Label>
              <Textarea
                id="description"
                value={newGroupData.description}
                onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                placeholder="What's this group about?"
                className="font-pixelated text-xs min-h-[80px]"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="private"
                checked={newGroupData.is_private}
                onChange={(e) => setNewGroupData({ ...newGroupData, is_private: e.target.checked })}
                className="rounded border-gray-300 text-social-green focus:ring-social-green"
              />
              <Label htmlFor="private" className="font-pixelated text-xs">
                Private Group (requires approval to join)
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupData.name.trim() || loading.createGroup}
              className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
            >
              {loading.createGroup ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Group Dialog */}
      <Dialog 
        open={showJoinGroupDialog.show} 
        onOpenChange={(open) => !open && setShowJoinGroupDialog({ show: false, group: null })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Join Group</DialogTitle>
            <DialogDescription className="font-pixelated text-sm">
              Send a request to join {showJoinGroupDialog.group?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                {showJoinGroupDialog.group?.avatar ? (
                  <AvatarImage src={showJoinGroupDialog.group.avatar} alt={showJoinGroupDialog.group.name} />
                ) : (
                  <AvatarFallback className="bg-social-blue text-white font-pixelated text-sm">
                    {showJoinGroupDialog.group?.name.substring(0, 2).toUpperCase() || 'G'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="font-pixelated text-sm font-medium">{showJoinGroupDialog.group?.name}</h3>
                <p className="font-pixelated text-xs text-muted-foreground">
                  {showJoinGroupDialog.group?.member_count} {showJoinGroupDialog.group?.member_count === 1 ? 'member' : 'members'}
                </p>
              </div>
            </div>
            
            {showJoinGroupDialog.group?.description && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="font-pixelated text-xs">{showJoinGroupDialog.group.description}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="joinMessage" className="font-pixelated text-xs">Message (optional)</Label>
              <Textarea
                id="joinMessage"
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="Why do you want to join this group?"
                className="font-pixelated text-xs min-h-[80px]"
              />
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-yellow-500 mt-0.5" />
                <p className="font-pixelated text-xs text-yellow-700">
                  This is a private group. Your request will need to be approved by an admin before you can join.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowJoinGroupDialog({ show: false, group: null })}
              className="font-pixelated text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoinGroup}
              disabled={loading.joinGroup}
              className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs"
            >
              {loading.joinGroup ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Group Members</DialogTitle>
            <DialogDescription className="font-pixelated text-sm">
              {selectedGroup?.member_count} {selectedGroup?.member_count === 1 ? 'member' : 'members'} in {selectedGroup?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {groupMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {member.avatar ? (
                        <AvatarImage src={member.avatar} alt={member.name} />
                      ) : (
                        <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-pixelated text-xs font-medium">{member.name}</p>
                      <p className="font-pixelated text-xs text-muted-foreground">@{member.username}</p>
                    </div>
                  </div>
                  <Badge variant={member.role === 'admin' ? 'default' : 'outline'} className="font-pixelated text-xs">
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Requests Dialog */}
      <Dialog open={showJoinRequestsDialog} onOpenChange={setShowJoinRequestsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Join Requests</DialogTitle>
            <DialogDescription className="font-pixelated text-sm">
              {joinRequests.length} pending {joinRequests.length === 1 ? 'request' : 'requests'} for {selectedGroup?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {joinRequests.length === 0 ? (
              <div className="text-center py-4">
                <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="font-pixelated text-sm font-medium mb-2">No pending requests</p>
                <p className="font-pixelated text-xs text-muted-foreground">
                  All join requests have been handled
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {joinRequests.map(request => (
                  <div key={request.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-8 w-8">
                        {request.avatar ? (
                          <AvatarImage src={request.avatar} alt={request.name} />
                        ) : (
                          <AvatarFallback className="bg-social-blue text-white font-pixelated text-xs">
                            {request.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <p className="font-pixelated text-xs font-medium">{request.name}</p>
                        <p className="font-pixelated text-xs text-muted-foreground">@{request.username}</p>
                      </div>
                    </div>
                    
                    {request.message && (
                      <div className="bg-muted/30 p-2 rounded-lg mb-3">
                        <p className="font-pixelated text-xs">{request.message}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => handleRejectRequest(request.id)}
                        variant="outline"
                        size="sm"
                        className="font-pixelated text-xs h-7"
                        disabled={loading.rejectRequest}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleApproveRequest(request.id)}
                        size="sm"
                        className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-7"
                        disabled={loading.approveRequest}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Info Dialog */}
      <Dialog open={showGroupInfoDialog} onOpenChange={setShowGroupInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-lg">Group Info</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                {selectedGroup?.avatar ? (
                  <AvatarImage src={selectedGroup.avatar} alt={selectedGroup.name} />
                ) : (
                  <AvatarFallback className="bg-social-green text-white font-pixelated text-lg">
                    {selectedGroup?.name.substring(0, 2).toUpperCase() || 'G'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="font-pixelated text-sm font-medium">{selectedGroup?.name}</h3>
                <div className="flex items-center gap-1">
                  <p className="font-pixelated text-xs text-muted-foreground">
                    {selectedGroup?.is_private ? 'Private Group' : 'Public Group'}
                  </p>
                  {selectedGroup?.is_private && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="font-pixelated text-xs text-muted-foreground">
                  Created {selectedGroup && new Date(selectedGroup.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {selectedGroup?.description && (
              <div className="mb-4">
                <h4 className="font-pixelated text-xs font-medium mb-1">Description</h4>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <p className="font-pixelated text-xs">{selectedGroup.description}</p>
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <h4 className="font-pixelated text-xs font-medium mb-1">Members</h4>
              <p className="font-pixelated text-xs text-muted-foreground">
                {selectedGroup?.member_count} {selectedGroup?.member_count === 1 ? 'member' : 'members'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  onClick={() => {
                    setShowGroupInfoDialog(false);
                    setShowMembersDialog(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="font-pixelated text-xs h-7"
                >
                  <Users className="h-3 w-3 mr-1" />
                  View Members
                </Button>
                
                {isAdmin && joinRequests.length > 0 && (
                  <Button
                    onClick={() => {
                      setShowGroupInfoDialog(false);
                      setShowJoinRequestsDialog(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="font-pixelated text-xs h-7 relative"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Join Requests
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[8px] bg-social-green text-white flex items-center justify-center">
                      {joinRequests.length}
                    </Badge>
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t">
              {isAdmin ? (
                <Button
                  onClick={() => {
                    setShowGroupInfoDialog(false);
                    setShowDeleteGroupDialog(true);
                  }}
                  variant="destructive"
                  size="sm"
                  className="font-pixelated text-xs h-8"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Group
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setShowGroupInfoDialog(false);
                    setShowLeaveGroupDialog(true);
                  }}
                  variant="destructive"
                  size="sm"
                  className="font-pixelated text-xs h-8"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Leave Group
                </Button>
              )}
              
              <Button
                onClick={() => setShowGroupInfoDialog(false)}
                variant="outline"
                size="sm"
                className="font-pixelated text-xs h-8"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated text-lg">Delete Group</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-sm">
              Are you sure you want to delete this group? This action cannot be undone and all messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
            >
              {loading.deleteGroup ? 'Deleting...' : 'Delete Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Group Confirmation */}
      <AlertDialog open={showLeaveGroupDialog} onOpenChange={setShowLeaveGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated text-lg">Leave Group</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-sm">
              Are you sure you want to leave this group? You'll need to request to join again if you want to come back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
            >
              {loading.leaveGroup ? 'Leaving...' : 'Leave Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

export default Vortex;