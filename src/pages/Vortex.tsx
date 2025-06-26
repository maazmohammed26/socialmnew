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
  Zap,
  ArrowLeft
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
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
  createdAt: any;
  updatedAt: any;
  memberCount: number;
  maxMembers: number;
}

interface GroupMember {
  id: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: any;
  name: string;
  username: string;
  avatar: string | null;
}

interface GroupMessage {
  id: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: any;
  senderName: string;
  senderUsername: string;
  senderAvatar: string | null;
}

interface JoinRequest {
  id: string;
  userId: string;
  status: string;
  message: string | null;
  createdAt: any;
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
    isPrivate: true
  });
  const [groupSuggestions, setGroupSuggestions] = useState<any[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [unsubscribeMessages, setUnsubscribeMessages] = useState<any>(null);
  const [unsubscribeMembers, setUnsubscribeMembers] = useState<any>(null);
  const [unsubscribeRequests, setUnsubscribeRequests] = useState<any>(null);

  useEffect(() => {
    fetchCurrentUser();
    return () => {
      // Clean up subscriptions
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeMembers) unsubscribeMembers();
      if (unsubscribeRequests) unsubscribeRequests();
    };
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
    }
    
    return () => {
      // Clean up subscriptions when group changes
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeMembers) unsubscribeMembers();
      if (unsubscribeRequests) unsubscribeRequests();
    };
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
      
      // Get groups where user is a member from Firebase
      const groupsRef = collection(db, 'groupMembers');
      const q = query(groupsRef, where('userId', '==', currentUser.id));
      const querySnapshot = await getDocs(q);
      
      const memberGroupIds = querySnapshot.docs.map(doc => doc.data().groupId);
      
      if (memberGroupIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }
      
      const groupsData: Group[] = [];
      
      for (const groupId of memberGroupIds) {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          groupsData.push({
            id: groupDoc.id,
            name: groupData.name,
            description: groupData.description,
            avatar: groupData.avatar,
            isPrivate: groupData.isPrivate,
            createdBy: groupData.createdBy,
            createdAt: groupData.createdAt,
            updatedAt: groupData.updatedAt,
            memberCount: groupData.memberCount,
            maxMembers: groupData.maxMembers
          });
        }
      }
      
      // Sort groups by updatedAt (most recent first)
      groupsData.sort((a, b) => {
        const timeA = a.updatedAt?.toDate?.() || new Date(0);
        const timeB = b.updatedAt?.toDate?.() || new Date(0);
        return timeB.getTime() - timeA.getTime();
      });
      
      setGroups(groupsData);
      
      // If there are groups, select the first one
      if (groupsData.length > 0 && !selectedGroup) {
        setSelectedGroup(groupsData[0]);
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
      // Get all groups
      const groupsRef = collection(db, 'groups');
      const groupsSnapshot = await getDocs(groupsRef);
      
      // Get user's groups
      const userGroupsRef = collection(db, 'groupMembers');
      const q = query(userGroupsRef, where('userId', '==', currentUser.id));
      const userGroupsSnapshot = await getDocs(q);
      
      const userGroupIds = new Set(userGroupsSnapshot.docs.map(doc => doc.data().groupId));
      
      // Get user's join requests
      const requestsRef = collection(db, 'groupJoinRequests');
      const requestsQuery = query(requestsRef, where('userId', '==', currentUser.id));
      const requestsSnapshot = await getDocs(requestsQuery);
      
      const requestedGroupIds = new Set(requestsSnapshot.docs.map(doc => doc.data().groupId));
      
      // Filter groups that user is not a member of and hasn't requested to join
      const suggestedGroups = groupsSnapshot.docs
        .filter(doc => !userGroupIds.has(doc.id) && !requestedGroupIds.has(doc.id))
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            avatar: data.avatar,
            memberCount: data.memberCount,
            createdBy: data.createdBy,
            createdAt: data.createdAt,
            mutualMembers: 0 // We'll calculate this later
          };
        });
      
      // Sort by member count for now (could implement mutual friends later)
      suggestedGroups.sort((a, b) => b.memberCount - a.memberCount);
      
      setGroupSuggestions(suggestedGroups.slice(0, 5));
    } catch (error) {
      console.error('Error fetching group suggestions:', error);
    }
  };

  const fetchGroupMembers = async () => {
    if (!selectedGroup) return;
    
    try {
      // Set up real-time listener for group members
      const membersRef = collection(db, 'groupMembers');
      const q = query(membersRef, where('groupId', '==', selectedGroup.id));
      
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const membersData: GroupMember[] = [];
        
        for (const memberDoc of querySnapshot.docs) {
          const memberData = memberDoc.data();
          
          // Get user profile
          const userDoc = await getDoc(doc(db, 'profiles', memberData.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            membersData.push({
              id: memberDoc.id,
              userId: memberData.userId,
              role: memberData.role,
              joinedAt: memberData.joinedAt,
              name: userData.name || 'Unknown User',
              username: userData.username || 'unknown',
              avatar: userData.avatar
            });
          }
        }
        
        // Sort members: admins first, then by join date
        membersData.sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          
          const timeA = a.joinedAt?.toDate?.() || new Date(0);
          const timeB = b.joinedAt?.toDate?.() || new Date(0);
          return timeA.getTime() - timeB.getTime();
        });
        
        setGroupMembers(membersData);
      });
      
      setUnsubscribeMembers(() => unsubscribe);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const fetchGroupMessages = async () => {
    if (!selectedGroup) return;
    
    try {
      // Set up real-time listener for messages
      const messagesRef = collection(db, 'groupMessages');
      const q = query(
        messagesRef, 
        where('groupId', '==', selectedGroup.id),
        orderBy('createdAt', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const messagesData: GroupMessage[] = [];
        
        for (const messageDoc of querySnapshot.docs) {
          const messageData = messageDoc.data();
          
          // Get sender profile
          const userDoc = await getDoc(doc(db, 'profiles', messageData.senderId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            messagesData.push({
              id: messageDoc.id,
              senderId: messageData.senderId,
              content: messageData.content,
              messageType: messageData.messageType,
              createdAt: messageData.createdAt,
              senderName: userData.name || 'Unknown User',
              senderUsername: userData.username || 'unknown',
              senderAvatar: userData.avatar
            });
          }
        }
        
        setGroupMessages(messagesData);
        
        // Scroll to bottom after messages load
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      });
      
      setUnsubscribeMessages(() => unsubscribe);
    } catch (error) {
      console.error('Error fetching group messages:', error);
    }
  };

  const fetchJoinRequests = async () => {
    if (!selectedGroup) return;
    
    // Check if user is an admin
    const isAdmin = groupMembers.some(
      member => member.userId === currentUser.id && member.role === 'admin'
    );
    
    if (!isAdmin) return;
    
    try {
      // Set up real-time listener for join requests
      const requestsRef = collection(db, 'groupJoinRequests');
      const q = query(
        requestsRef, 
        where('groupId', '==', selectedGroup.id),
        where('status', '==', 'pending')
      );
      
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const requestsData: JoinRequest[] = [];
        
        for (const requestDoc of querySnapshot.docs) {
          const requestData = requestDoc.data();
          
          // Get user profile
          const userDoc = await getDoc(doc(db, 'profiles', requestData.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            requestsData.push({
              id: requestDoc.id,
              userId: requestData.userId,
              status: requestData.status,
              message: requestData.message,
              createdAt: requestData.createdAt,
              name: userData.name || 'Unknown User',
              username: userData.username || 'unknown',
              avatar: userData.avatar
            });
          }
        }
        
        // Sort by creation date (newest first)
        requestsData.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(0);
          const timeB = b.createdAt?.toDate?.() || new Date(0);
          return timeB.getTime() - timeA.getTime();
        });
        
        setJoinRequests(requestsData);
      });
      
      setUnsubscribeRequests(() => unsubscribe);
    } catch (error) {
      console.error('Error fetching join requests:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !currentUser || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      // Add message to Firebase
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
      
      // Create group in Firebase
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: newGroup.name.trim(),
        description: newGroup.description.trim(),
        avatar: newGroup.avatar.trim() || null,
        isPrivate: newGroup.isPrivate,
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        memberCount: 1,
        maxMembers: 100
      });
      
      // Add creator as admin
      await addDoc(collection(db, 'groupMembers'), {
        groupId: groupRef.id,
        userId: currentUser.id,
        role: 'admin',
        joinedAt: serverTimestamp()
      });
      
      toast({
        title: 'Group created!',
        description: 'Your new group has been created successfully'
      });
      
      // Reset form
      setNewGroup({
        name: '',
        description: '',
        avatar: '',
        isPrivate: true
      });
      
      setShowCreateGroupDialog(false);
      
      // Refresh groups
      await fetchUserGroups();
      
      // Select the newly created group
      const groupDoc = await getDoc(groupRef);
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        setSelectedGroup({
          id: groupDoc.id,
          name: groupData.name,
          description: groupData.description,
          avatar: groupData.avatar,
          isPrivate: groupData.isPrivate,
          createdBy: groupData.createdBy,
          createdAt: groupData.createdAt,
          updatedAt: groupData.updatedAt,
          memberCount: groupData.memberCount,
          maxMembers: groupData.maxMembers
        });
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
      
      // Add join request to Firebase
      await addDoc(collection(db, 'groupJoinRequests'), {
        groupId: selectedSuggestion.id,
        userId: currentUser.id,
        message: joinMessage.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
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

  const approveJoinRequest = async (requestId: string, userId: string) => {
    if (processingAction) return;
    
    try {
      setProcessingAction(true);
      
      // Get the request document
      const requestDoc = await getDoc(doc(db, 'groupJoinRequests', requestId));
      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }
      
      const requestData = requestDoc.data();
      const groupId = requestData.groupId;
      
      // Update request status
      await updateDoc(doc(db, 'groupJoinRequests', requestId), {
        status: 'approved'
      });
      
      // Add user to group members
      await addDoc(collection(db, 'groupMembers'), {
        groupId: groupId,
        userId: userId,
        role: 'member',
        joinedAt: serverTimestamp()
      });
      
      // Update group member count
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        await updateDoc(doc(db, 'groups', groupId), {
          memberCount: (groupData.memberCount || 0) + 1
        });
      }
      
      // Create notification for the user
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'group_join_approved',
        content: `Your request to join ${selectedGroup?.name} has been approved`,
        referenceId: groupId,
        read: false,
        createdAt: serverTimestamp()
      });
      
      toast({
        title: 'Request approved',
        description: 'The user has been added to the group'
      });
      
      // Refresh join requests and members will happen automatically via listeners
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

  const rejectJoinRequest = async (requestId: string, userId: string) => {
    if (processingAction) return;
    
    try {
      setProcessingAction(true);
      
      // Get the request document
      const requestDoc = await getDoc(doc(db, 'groupJoinRequests', requestId));
      if (!requestDoc.exists()) {
        throw new Error('Request not found');
      }
      
      const requestData = requestDoc.data();
      const groupId = requestData.groupId;
      
      // Update request status
      await updateDoc(doc(db, 'groupJoinRequests', requestId), {
        status: 'rejected'
      });
      
      // Create notification for the user
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'group_join_rejected',
        content: `Your request to join ${selectedGroup?.name} has been rejected`,
        referenceId: groupId,
        read: false,
        createdAt: serverTimestamp()
      });
      
      toast({
        title: 'Request rejected',
        description: 'The join request has been rejected'
      });
      
      // Refresh join requests will happen automatically via listener
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
      
      // Find the member document for this user
      const membersRef = collection(db, 'groupMembers');
      const q = query(
        membersRef, 
        where('groupId', '==', selectedGroup.id),
        where('userId', '==', currentUser.id)
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        throw new Error('Member record not found');
      }
      
      // Check if user is the only admin
      const isAdmin = groupMembers.some(
        member => member.userId === currentUser.id && member.role === 'admin'
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
      await deleteDoc(doc(db, 'groupMembers', querySnapshot.docs[0].id));
      
      // Update group member count
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        memberCount: Math.max(0, selectedGroup.memberCount - 1)
      });
      
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

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isUserAdmin = () => {
    return groupMembers.some(
      member => member.userId === currentUser?.id && member.role === 'admin'
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
                            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
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
                    <ArrowLeft className="h-4 w-4" />
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
                      {selectedGroup.memberCount} {selectedGroup.memberCount === 1 ? 'member' : 'members'}
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
                        Members ({selectedGroup.memberCount})
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
                          const isCurrentUser = message.senderId === currentUser?.id;
                          
                          return (
                            <div 
                              key={message.id}
                              className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex gap-2 max-w-[75%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                                  {message.senderAvatar ? (
                                    <AvatarImage src={message.senderAvatar} />
                                  ) : (
                                    <AvatarFallback className="bg-social-green text-white font-pixelated text-xs">
                                      {message.senderName.substring(0, 2).toUpperCase()}
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
                                      {message.senderName}
                                    </p>
                                  )}
                                  <p className="text-xs whitespace-pre-wrap break-words font-pixelated">
                                    {message.content}
                                  </p>
                                  <p className="text-xs opacity-70 mt-1 text-right font-pixelated">
                                    {formatMessageTime(message.createdAt)}
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
                checked={newGroup.isPrivate}
                onChange={(e) => setNewGroup({ ...newGroup, isPrivate: e.target.checked })}
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
                            {group.memberCount} members
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
                    Created {formatDistanceToNow(selectedGroup.createdAt?.toDate?.() || new Date(selectedGroup.createdAt), { addSuffix: true })}
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
                  <p className="font-pixelated text-sm font-medium">{selectedGroup.memberCount}</p>
                  <p className="font-pixelated text-xs text-muted-foreground">Members</p>
                </div>
                <div className="bg-muted p-3 rounded-md text-center">
                  <p className="font-pixelated text-sm font-medium">
                    {selectedGroup.isPrivate ? 'Private' : 'Public'}
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
                          Requested {formatDistanceToNow(request.createdAt?.toDate?.() || new Date(request.createdAt), { addSuffix: true })}
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
                        onClick={() => rejectJoinRequest(request.id, request.userId)}
                        variant="outline"
                        size="sm"
                        className="font-pixelated text-xs"
                        disabled={processingAction}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => approveJoinRequest(request.id, request.userId)}
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