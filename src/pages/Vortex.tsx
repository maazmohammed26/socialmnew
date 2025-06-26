import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  MessageSquare, 
  Send, 
  Plus, 
  UserPlus, 
  Lock, 
  Unlock, 
  X, 
  Check, 
  Settings,
  ChevronRight,
  ArrowLeft,
  Globe,
  Shield,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
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
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  isPrivate: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  memberCount: number;
  maxMembers: number;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Timestamp;
  name?: string;
  username?: string;
  avatar?: string;
}

interface GroupJoinRequest {
  id: string;
  groupId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  name?: string;
  username?: string;
  avatar?: string;
}

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  createdAt: Timestamp;
  senderName?: string;
  senderUsername?: string;
  senderAvatar?: string;
}

export function Vortex() {
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupSuggestions, setGroupSuggestions] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [showGroupInfoDialog, setShowGroupInfoDialog] = useState(false);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    avatar: '',
    isPrivate: true
  });
  const [joinGroupMessage, setJoinGroupMessage] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
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
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch user groups
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserGroups = async () => {
      try {
        // Get groups where user is a member
        const groupMembersRef = collection(db, 'groupMembers');
        const q = query(groupMembersRef, where('userId', '==', currentUser.id));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const groupIds = snapshot.docs.map(doc => doc.data().groupId);
          
          if (groupIds.length === 0) {
            setUserGroups([]);
            return;
          }
          
          const groups: Group[] = [];
          
          // For each group ID, get the group details
          for (const groupId of groupIds) {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
              groups.push({
                id: groupDoc.id,
                ...groupDoc.data()
              } as Group);
            }
          }
          
          // Sort groups by updated time (most recent first)
          groups.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis());
          
          setUserGroups(groups);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching user groups:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load your groups'
        });
      }
    };

    fetchUserGroups();
  }, [currentUser, toast]);

  // Fetch group suggestions
  useEffect(() => {
    if (!currentUser) return;

    const fetchGroupSuggestions = async () => {
      try {
        // Get all public groups
        const groupsRef = collection(db, 'groups');
        const q = query(groupsRef, where('isPrivate', '==', false));
        const querySnapshot = await getDocs(q);
        
        // Get user's group IDs
        const userGroupIds = userGroups.map(group => group.id);
        
        // Filter out groups user is already a member of
        const suggestions = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Group))
          .filter(group => !userGroupIds.includes(group.id));
        
        setGroupSuggestions(suggestions);
      } catch (error) {
        console.error('Error fetching group suggestions:', error);
      }
    };

    if (userGroups.length > 0) {
      fetchGroupSuggestions();
    }
  }, [currentUser, userGroups]);

  // Fetch group members when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchGroupMembers = async () => {
      try {
        const membersRef = collection(db, 'groupMembers');
        const q = query(membersRef, where('groupId', '==', selectedGroup.id));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const members: GroupMember[] = [];
          
          for (const doc of snapshot.docs) {
            const memberData = doc.data();
            
            // Get user profile data
            const userDoc = await getDoc(doc(db, 'profiles', memberData.userId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            members.push({
              id: doc.id,
              ...memberData,
              name: userData?.name || 'Unknown User',
              username: userData?.username || 'unknown',
              avatar: userData?.avatar || null
            } as GroupMember);
            
            // Check if current user is admin
            if (memberData.userId === currentUser.id) {
              setUserRole(memberData.role);
            }
          }
          
          // Sort members (admins first, then by join date)
          members.sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            return a.joinedAt.toMillis() - b.joinedAt.toMillis();
          });
          
          setGroupMembers(members);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching group members:', error);
      }
    };

    fetchGroupMembers();
  }, [selectedGroup, currentUser]);

  // Fetch join requests when a group is selected and user is admin
  useEffect(() => {
    if (!selectedGroup || userRole !== 'admin') return;

    const fetchJoinRequests = async () => {
      try {
        const requestsRef = collection(db, 'groupJoinRequests');
        const q = query(
          requestsRef, 
          where('groupId', '==', selectedGroup.id),
          where('status', '==', 'pending')
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const requests: GroupJoinRequest[] = [];
          
          for (const doc of snapshot.docs) {
            const requestData = doc.data();
            
            // Get user profile data
            const userDoc = await getDoc(doc(db, 'profiles', requestData.userId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            requests.push({
              id: doc.id,
              ...requestData,
              name: userData?.name || 'Unknown User',
              username: userData?.username || 'unknown',
              avatar: userData?.avatar || null
            } as GroupJoinRequest);
          }
          
          // Sort by creation date (newest first)
          requests.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
          
          setJoinRequests(requests);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching join requests:', error);
      }
    };

    fetchJoinRequests();
  }, [selectedGroup, userRole]);

  // Fetch messages when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchMessages = async () => {
      try {
        const messagesRef = collection(db, 'groupMessages');
        const q = query(
          messagesRef, 
          where('groupId', '==', selectedGroup.id),
          orderBy('createdAt', 'asc')
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const groupMessages: GroupMessage[] = [];
          
          for (const doc of snapshot.docs) {
            const messageData = doc.data();
            
            // Get sender profile data
            const userDoc = await getDoc(doc(db, 'profiles', messageData.senderId));
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            groupMessages.push({
              id: doc.id,
              ...messageData,
              senderName: userData?.name || 'Unknown User',
              senderUsername: userData?.username || 'unknown',
              senderAvatar: userData?.avatar || null
            } as GroupMessage);
          }
          
          setMessages(groupMessages);
          
          // Scroll to bottom after messages load
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load messages'
        });
      }
    };

    fetchMessages();
  }, [selectedGroup, toast]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !currentUser || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      // Add message to Firestore
      await addDoc(collection(db, 'groupMessages'), {
        groupId: selectedGroup.id,
        senderId: currentUser.id,
        content: newMessage.trim(),
        messageType: 'text',
        createdAt: serverTimestamp()
      });
      
      // Update group's updatedAt timestamp
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        updatedAt: serverTimestamp()
      });
      
      setNewMessage('');
      
      // Scroll to bottom
      setTimeout(() => {
        scrollToBottom();
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

  // Create new group
  const handleCreateGroup = async () => {
    if (!currentUser) return;
    
    try {
      setProcessingAction(true);
      
      // Validate inputs
      if (!newGroupData.name.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Group name is required'
        });
        return;
      }
      
      // Create group in Firestore
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: newGroupData.name.trim(),
        description: newGroupData.description.trim(),
        avatar: newGroupData.avatar.trim() || null,
        isPrivate: newGroupData.isPrivate,
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        memberCount: 1,
        maxMembers: 100
      });
      
      // Add creator as admin member
      await addDoc(collection(db, 'groupMembers'), {
        groupId: groupRef.id,
        userId: currentUser.id,
        role: 'admin',
        joinedAt: serverTimestamp()
      });
      
      toast({
        title: 'Group created',
        description: 'Your group has been created successfully'
      });
      
      // Reset form and close dialog
      setNewGroupData({
        name: '',
        description: '',
        avatar: '',
        isPrivate: true
      });
      setShowCreateGroupDialog(false);
      
      // Select the new group
      const newGroupDoc = await getDoc(groupRef);
      if (newGroupDoc.exists()) {
        setSelectedGroup({
          id: newGroupDoc.id,
          ...newGroupDoc.data()
        } as Group);
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

  // Join group
  const handleJoinGroup = async (groupId: string) => {
    if (!currentUser) return;
    
    try {
      setProcessingAction(true);
      
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (!groupDoc.exists()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Group not found'
        });
        return;
      }
      
      const groupData = groupDoc.data() as Group;
      
      // Check if group is private
      if (groupData.isPrivate) {
        // Create join request
        await addDoc(collection(db, 'groupJoinRequests'), {
          groupId,
          userId: currentUser.id,
          status: 'pending',
          message: joinGroupMessage.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        toast({
          title: 'Request sent',
          description: 'Your request to join the group has been sent'
        });
      } else {
        // Directly join public group
        await addDoc(collection(db, 'groupMembers'), {
          groupId,
          userId: currentUser.id,
          role: 'member',
          joinedAt: serverTimestamp()
        });
        
        // Update member count
        await updateDoc(doc(db, 'groups', groupId), {
          memberCount: (groupData.memberCount || 0) + 1,
          updatedAt: serverTimestamp()
        });
        
        toast({
          title: 'Group joined',
          description: 'You have joined the group successfully'
        });
        
        // Select the joined group
        setSelectedGroup({
          id: groupDoc.id,
          ...groupDoc.data()
        } as Group);
      }
      
      setJoinGroupMessage('');
      setShowJoinGroupDialog(false);
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to join group'
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle join request (approve/reject)
  const handleJoinRequest = async (requestId: string, approve: boolean) => {
    if (!selectedGroup || !currentUser) return;
    
    try {
      setProcessingAction(true);
      
      const requestDoc = await getDoc(doc(db, 'groupJoinRequests', requestId));
      if (!requestDoc.exists()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Request not found'
        });
        return;
      }
      
      const requestData = requestDoc.data() as GroupJoinRequest;
      
      // Update request status
      await updateDoc(doc(db, 'groupJoinRequests', requestId), {
        status: approve ? 'approved' : 'rejected',
        updatedAt: serverTimestamp()
      });
      
      if (approve) {
        // Add user to group members
        await addDoc(collection(db, 'groupMembers'), {
          groupId: selectedGroup.id,
          userId: requestData.userId,
          role: 'member',
          joinedAt: serverTimestamp()
        });
        
        // Update member count
        await updateDoc(doc(db, 'groups', selectedGroup.id), {
          memberCount: (selectedGroup.memberCount || 0) + 1,
          updatedAt: serverTimestamp()
        });
      }
      
      toast({
        title: approve ? 'Request approved' : 'Request rejected',
        description: approve 
          ? 'The user has been added to the group' 
          : 'The join request has been rejected'
      });
    } catch (error) {
      console.error('Error handling join request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process join request'
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!selectedGroup || !currentUser) return;
    
    try {
      setProcessingAction(true);
      
      // Find member document
      const membersRef = collection(db, 'groupMembers');
      const q = query(
        membersRef, 
        where('groupId', '==', selectedGroup.id),
        where('userId', '==', currentUser.id)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'You are not a member of this group'
        });
        return;
      }
      
      // Delete member document
      await deleteDoc(doc(db, 'groupMembers', querySnapshot.docs[0].id));
      
      // Update member count
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        memberCount: Math.max(1, (selectedGroup.memberCount || 1) - 1),
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: 'Group left',
        description: 'You have left the group successfully'
      });
      
      setSelectedGroup(null);
      setShowLeaveGroupDialog(false);
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

  // Delete group
  const handleDeleteGroup = async () => {
    if (!selectedGroup || !currentUser || userRole !== 'admin') return;
    
    try {
      setProcessingAction(true);
      
      // Delete all group messages
      const messagesRef = collection(db, 'groupMessages');
      const messagesQuery = query(messagesRef, where('groupId', '==', selectedGroup.id));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messageDeletePromises = messagesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(messageDeletePromises);
      
      // Delete all group members
      const membersRef = collection(db, 'groupMembers');
      const membersQuery = query(membersRef, where('groupId', '==', selectedGroup.id));
      const membersSnapshot = await getDocs(membersQuery);
      
      const memberDeletePromises = membersSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(memberDeletePromises);
      
      // Delete all join requests
      const requestsRef = collection(db, 'groupJoinRequests');
      const requestsQuery = query(requestsRef, where('groupId', '==', selectedGroup.id));
      const requestsSnapshot = await getDocs(requestsQuery);
      
      const requestDeletePromises = requestsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(requestDeletePromises);
      
      // Delete the group
      await deleteDoc(doc(db, 'groups', selectedGroup.id));
      
      toast({
        title: 'Group deleted',
        description: 'The group has been deleted successfully'
      });
      
      setSelectedGroup(null);
      setShowDeleteGroupDialog(false);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete group'
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return format(date, 'HH:mm');
  };

  // Format date for message groups
  const formatMessageDate = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: GroupMessage[] } = {};
    
    messages.forEach(message => {
      if (!message.createdAt) return;
      
      const dateKey = formatMessageDate(message.createdAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex h-[calc(100vh-120px)] animate-pulse">
            <div className="w-64 bg-muted rounded-l-lg mr-1"></div>
            <div className="flex-1 bg-muted rounded-r-lg"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex h-[calc(100vh-120px)] border rounded-lg overflow-hidden">
          {/* Sidebar */}
          <div className={`w-64 border-r flex flex-col ${selectedGroup ? 'hidden md:flex' : ''}`}>
            {/* Sidebar Header */}
            <div className="p-3 border-b bg-muted/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-pixelated text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Vortex Groups
                </h2>
                <Button
                  onClick={() => setShowCreateGroupDialog(true)}
                  size="icon"
                  className="h-7 w-7 rounded-full bg-social-green hover:bg-social-light-green text-white"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Groups List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2">
                  <h3 className="font-pixelated text-xs text-muted-foreground mb-2 px-2">Your Groups</h3>
                  {userGroups.length > 0 ? (
                    <div className="space-y-1">
                      {userGroups.map(group => (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroup(group)}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedGroup?.id === group.id ? 'bg-muted' : ''
                          }`}
                        >
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {group.avatar ? (
                              <AvatarImage src={group.avatar} alt={group.name} />
                            ) : (
                              <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                                {group.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center">
                              <p className="font-pixelated text-xs font-medium truncate">
                                {group.name}
                              </p>
                              {group.isPrivate ? (
                                <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                              ) : (
                                <Globe className="h-3 w-3 ml-1 text-muted-foreground" />
                              )}
                            </div>
                            <p className="font-pixelated text-xs text-muted-foreground truncate">
                              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="font-pixelated text-xs text-muted-foreground">
                        You haven't joined any groups yet
                      </p>
                      <Button
                        onClick={() => setShowCreateGroupDialog(true)}
                        variant="outline"
                        size="sm"
                        className="mt-2 font-pixelated text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Group
                      </Button>
                    </div>
                  )}

                  {/* Group Suggestions */}
                  {groupSuggestions.length > 0 && (
                    <>
                      <h3 className="font-pixelated text-xs text-muted-foreground mt-4 mb-2 px-2">
                        Suggested Groups
                      </h3>
                      <div className="space-y-1">
                        {groupSuggestions.map(group => (
                          <div
                            key={group.id}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              {group.avatar ? (
                                <AvatarImage src={group.avatar} alt={group.name} />
                              ) : (
                                <AvatarFallback className="bg-social-blue text-white font-pixelated text-xs">
                                  {group.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <p className="font-pixelated text-xs font-medium truncate">
                                  {group.name}
                                </p>
                                <Globe className="h-3 w-3 ml-1 text-muted-foreground" />
                              </div>
                              <p className="font-pixelated text-xs text-muted-foreground truncate">
                                {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                setShowJoinGroupDialog(true);
                                setSelectedGroup(group);
                              }}
                              size="sm"
                              className="h-6 bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Join
                            </Button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Main Content */}
          <div className={`flex-1 flex flex-col ${!selectedGroup ? 'hidden md:flex' : ''}`}>
            {selectedGroup ? (
              <>
                {/* Group Header */}
                <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedGroup(null)}
                    className="md:hidden h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    {selectedGroup.avatar ? (
                      <AvatarImage src={selectedGroup.avatar} alt={selectedGroup.name} />
                    ) : (
                      <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                        {selectedGroup.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="font-pixelated text-sm font-medium truncate">
                        {selectedGroup.name}
                      </p>
                      {selectedGroup.isPrivate ? (
                        <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
                      ) : (
                        <Globe className="h-3 w-3 ml-1 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-pixelated text-xs text-muted-foreground truncate">
                      {selectedGroup.memberCount} {selectedGroup.memberCount === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowGroupInfoDialog(true)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="font-pixelated text-sm font-medium">No messages yet</p>
                        <p className="font-pixelated text-xs text-muted-foreground mt-1">
                          Be the first to send a message in this group!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupMessagesByDate().map((group, groupIndex) => (
                          <div key={groupIndex} className="space-y-2">
                            {/* Date Separator */}
                            <div className="flex items-center justify-center">
                              <div className="bg-muted px-2 py-1 rounded-full">
                                <p className="font-pixelated text-xs text-muted-foreground">
                                  {group.date}
                                </p>
                              </div>
                            </div>
                            
                            {/* Messages */}
                            {group.messages.map((message, messageIndex) => {
                              const isCurrentUser = message.senderId === currentUser?.id;
                              const showAvatar = messageIndex === 0 || 
                                group.messages[messageIndex - 1]?.senderId !== message.senderId;
                              
                              return (
                                <div 
                                  key={message.id}
                                  className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                >
                                  {!isCurrentUser && showAvatar && (
                                    <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                                      {message.senderAvatar ? (
                                        <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                                      ) : (
                                        <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                                          {message.senderName?.substring(0, 2).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                  )}
                                  
                                  <div className={`max-w-[75%] ${!isCurrentUser && !showAvatar ? 'ml-8' : ''}`}>
                                    {showAvatar && (
                                      <p className={`font-pixelated text-xs text-muted-foreground mb-1 ${
                                        isCurrentUser ? 'text-right' : 'text-left'
                                      }`}>
                                        {isCurrentUser ? 'You' : message.senderName}
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
                                      <p className={`text-xs opacity-70 font-pixelated text-right mt-1 ${
                                        isCurrentUser ? 'text-white/70' : 'text-muted-foreground'
                                      }`}>
                                        {message.createdAt && formatTimestamp(message.createdAt)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {isCurrentUser && showAvatar && (
                                    <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                                      {message.senderAvatar ? (
                                        <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                                      ) : (
                                        <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                                          {message.senderName?.substring(0, 2).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
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
                      className="min-h-[40px] max-h-[120px] resize-none flex-1 font-pixelated text-xs"
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-social-green hover:bg-social-light-green text-white flex-shrink-0 h-10 w-10"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2 font-pixelated">Vortex Groups</h2>
                <p className="text-muted-foreground font-pixelated text-sm max-w-md mb-4">
                  Connect with friends and communities in real-time group chats. 
                  Select a group to start messaging or create a new one.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowCreateGroupDialog(true)}
                    className="bg-social-green hover:bg-social-light-green text-white font-pixelated"
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
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="font-pixelated text-sm">Group Name</label>
              <Input
                placeholder="Enter group name"
                value={newGroupData.name}
                onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                className="font-pixelated text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="font-pixelated text-sm">Description</label>
              <Textarea
                placeholder="Enter group description"
                value={newGroupData.description}
                onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                className="font-pixelated text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="font-pixelated text-sm">Avatar URL (optional)</label>
              <Input
                placeholder="Enter avatar URL"
                value={newGroupData.avatar}
                onChange={(e) => setNewGroupData({ ...newGroupData, avatar: e.target.value })}
                className="font-pixelated text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-pixelated text-sm">Private Group</label>
              <Button
                type="button"
                variant={newGroupData.isPrivate ? "default" : "outline"}
                size="sm"
                onClick={() => setNewGroupData({ ...newGroupData, isPrivate: true })}
                className="font-pixelated text-xs"
              >
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Button>
              <Button
                type="button"
                variant={!newGroupData.isPrivate ? "default" : "outline"}
                size="sm"
                onClick={() => setNewGroupData({ ...newGroupData, isPrivate: false })}
                className="font-pixelated text-xs"
              >
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-md">
              <p className="font-pixelated text-xs text-muted-foreground">
                {newGroupData.isPrivate 
                  ? 'Private groups require admin approval to join' 
                  : 'Public groups can be joined by anyone without approval'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateGroupDialog(false)}
              className="font-pixelated text-xs"
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
              disabled={!newGroupData.name.trim() || processingAction}
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
            <DialogTitle className="font-pixelated">Join Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedGroup && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {selectedGroup.avatar ? (
                      <AvatarImage src={selectedGroup.avatar} alt={selectedGroup.name} />
                    ) : (
                      <AvatarFallback className="bg-social-green text-white font-pixelated text-sm">
                        {selectedGroup.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-pixelated text-sm font-medium">{selectedGroup.name}</p>
                    <div className="flex items-center">
                      <p className="font-pixelated text-xs text-muted-foreground">
                        {selectedGroup.memberCount} {selectedGroup.memberCount === 1 ? 'member' : 'members'}
                      </p>
                      {selectedGroup.isPrivate ? (
                        <Badge variant="outline" className="ml-2 font-pixelated text-xs">
                          <Lock className="h-2 w-2 mr-1" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 font-pixelated text-xs">
                          <Globe className="h-2 w-2 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedGroup.description && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="font-pixelated text-xs">{selectedGroup.description}</p>
                  </div>
                )}
                
                {selectedGroup.isPrivate && (
                  <div className="space-y-2">
                    <label className="font-pixelated text-sm">Message (optional)</label>
                    <Textarea
                      placeholder="Why do you want to join this group?"
                      value={joinGroupMessage}
                      onChange={(e) => setJoinGroupMessage(e.target.value)}
                      className="font-pixelated text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowJoinGroupDialog(false)}
              className="font-pixelated text-xs"
              disabled={processingAction}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedGroup && handleJoinGroup(selectedGroup.id)}
              className="bg-social-blue hover:bg-social-blue/90 text-white font-pixelated text-xs"
              disabled={processingAction}
            >
              {processingAction ? 'Processing...' : selectedGroup?.isPrivate ? 'Request to Join' : 'Join Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Info Dialog */}
      <Dialog open={showGroupInfoDialog} onOpenChange={setShowGroupInfoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Group Information</DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {selectedGroup.avatar ? (
                    <AvatarImage src={selectedGroup.avatar} alt={selectedGroup.name} />
                  ) : (
                    <AvatarFallback className="bg-social-green text-white font-pixelated text-sm">
                      {selectedGroup.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-pixelated text-sm font-medium">{selectedGroup.name}</p>
                  <div className="flex items-center">
                    <p className="font-pixelated text-xs text-muted-foreground">
                      {selectedGroup.memberCount} {selectedGroup.memberCount === 1 ? 'member' : 'members'}
                    </p>
                    {selectedGroup.isPrivate ? (
                      <Badge variant="outline" className="ml-2 font-pixelated text-xs">
                        <Lock className="h-2 w-2 mr-1" />
                        Private
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 font-pixelated text-xs">
                        <Globe className="h-2 w-2 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedGroup.description && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-pixelated text-xs">{selectedGroup.description}</p>
                </div>
              )}
              
              {/* Members List */}
              <div className="space-y-2">
                <h3 className="font-pixelated text-sm font-medium">Members</h3>
                <Card>
                  <CardContent className="p-2 max-h-40 overflow-y-auto">
                    {groupMembers.map(member => (
                      <div key={member.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md">
                        <Avatar className="h-6 w-6">
                          {member.avatar ? (
                            <AvatarImage src={member.avatar} alt={member.name} />
                          ) : (
                            <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                              {member.name?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-pixelated text-xs font-medium truncate">
                            {member.name}
                          </p>
                          <p className="font-pixelated text-xs text-muted-foreground truncate">
                            @{member.username}
                          </p>
                        </div>
                        {member.role === 'admin' && (
                          <Badge variant="outline" className="font-pixelated text-xs">
                            <Shield className="h-2 w-2 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              
              {/* Join Requests (for admins) */}
              {userRole === 'admin' && joinRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-pixelated text-sm font-medium">Join Requests</h3>
                  <Card>
                    <CardContent className="p-2 max-h-40 overflow-y-auto">
                      {joinRequests.map(request => (
                        <div key={request.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-md">
                          <Avatar className="h-6 w-6">
                            {request.avatar ? (
                              <AvatarImage src={request.avatar} alt={request.name} />
                            ) : (
                              <AvatarFallback className="bg-social-blue text-white font-pixelated text-xs">
                                {request.name?.substring(0, 2).toUpperCase() || 'U'}
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
                          <div className="flex gap-1">
                            <Button
                              onClick={() => handleJoinRequest(request.id, true)}
                              size="icon"
                              className="h-6 w-6 bg-social-green hover:bg-social-light-green text-white"
                              disabled={processingAction}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => handleJoinRequest(request.id, false)}
                              size="icon"
                              variant="destructive"
                              className="h-6 w-6"
                              disabled={processingAction}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Actions */}
              <div className="space-y-2 pt-2">
                <h3 className="font-pixelated text-sm font-medium">Actions</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowLeaveGroupDialog(true)}
                    variant="outline"
                    className="flex-1 font-pixelated text-xs"
                  >
                    <User className="h-3 w-3 mr-1" />
                    Leave Group
                  </Button>
                  
                  {userRole === 'admin' && (
                    <Button
                      onClick={() => setShowDeleteGroupDialog(true)}
                      variant="destructive"
                      className="flex-1 font-pixelated text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete Group
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Leave Group Confirmation Dialog */}
      <AlertDialog open={showLeaveGroupDialog} onOpenChange={setShowLeaveGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Leave Group</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to leave this group? You'll need to be invited back to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs" disabled={processingAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
              disabled={processingAction}
            >
              {processingAction ? 'Leaving...' : 'Leave Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation Dialog */}
      <AlertDialog open={showDeleteGroupDialog} onOpenChange={setShowDeleteGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Delete Group</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to delete this group? This action cannot be undone and all messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs" disabled={processingAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
              disabled={processingAction}
            >
              {processingAction ? 'Deleting...' : 'Delete Group'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

export default Vortex;