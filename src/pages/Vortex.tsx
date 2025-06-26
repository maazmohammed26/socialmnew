import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, 
  Users, 
  Plus, 
  MessageSquare, 
  Settings, 
  UserPlus, 
  Clock, 
  Info, 
  Send, 
  X,
  Lock,
  Globe,
  ChevronRight,
  User,
  Loader2,
  AlertTriangle,
  Check,
  Trash2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  orderBy, 
  onSnapshot,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc
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
  lastMessage?: string;
  lastMessageTime?: any;
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

interface Message {
  id: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: any;
  senderName: string;
  senderUsername: string;
  senderAvatar: string | null;
}

export function Vortex() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    avatar: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showDeleteGroupDialog, setShowDeleteGroupDialog] = useState(false);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);
  const [groupNameExists, setGroupNameExists] = useState(false);
  const [checkingGroupName, setCheckingGroupName] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
            
        if (profile) {
          setCurrentUser({ ...user, ...profile });
          
          // Create user profile in Firebase if it doesn't exist
          const userProfileRef = doc(db, 'userProfiles', user.id);
          const userProfileDoc = await getDoc(userProfileRef);
          
          if (!userProfileDoc.exists()) {
            await setDoc(userProfileRef, {
              name: profile.name || 'User',
              username: profile.username || 'user',
              avatar: profile.avatar || null,
              createdAt: serverTimestamp()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  // Fetch groups when user is loaded
  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Set up real-time listeners for selected group
  useEffect(() => {
    if (!selectedGroup || !currentUser) return;
    
    // Listen for new messages
    const messagesQuery = query(
      collection(db, 'groupMessages'),
      where('groupId', '==', selectedGroup.id),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Convert Firebase timestamp to Date
        const createdAt = data.createdAt ? 
          (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : data.createdAt) : 
          new Date();
          
        newMessages.push({
          id: doc.id,
          senderId: data.senderId,
          content: data.content,
          messageType: data.messageType || 'text',
          createdAt: createdAt,
          senderName: data.senderName || 'Unknown',
          senderUsername: data.senderUsername || 'unknown',
          senderAvatar: data.senderAvatar || null
        });
      });
      
      setMessages(newMessages);
    });
    
    // Fetch group members
    fetchGroupMembers(selectedGroup.id);
    
    return () => {
      unsubscribe();
    };
  }, [selectedGroup, currentUser]);

  // Check if group name exists when typing
  useEffect(() => {
    const checkGroupName = async () => {
      if (!newGroupData.name.trim()) {
        setGroupNameExists(false);
        return;
      }
      
      setCheckingGroupName(true);
      
      try {
        const groupsQuery = query(
          collection(db, 'groups'),
          where('name', '==', newGroupData.name.trim())
        );
        
        const snapshot = await getDocs(groupsQuery);
        setGroupNameExists(!snapshot.empty);
      } catch (error) {
        console.error('Error checking group name:', error);
      } finally {
        setCheckingGroupName(false);
      }
    };
    
    const timeoutId = setTimeout(checkGroupName, 500);
    return () => clearTimeout(timeoutId);
  }, [newGroupData.name]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      // Query groups where the current user is a member
      const memberOfQuery = query(
        collection(db, 'groupMembers'),
        where('userId', '==', currentUser.id)
      );
      
      const membershipSnapshot = await getDocs(memberOfQuery);
      const groupIds = membershipSnapshot.docs.map(doc => doc.data().groupId);
      
      if (groupIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }
      
      // Get all groups the user is a member of
      const groupsData: Group[] = [];
      
      for (const groupId of groupIds) {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        
        if (groupDoc.exists()) {
          const data = groupDoc.data();
          
          // Convert timestamps to Date objects
          const createdAt = data.createdAt ? 
            (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : data.createdAt) : 
            new Date();
            
          const updatedAt = data.updatedAt ? 
            (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt) : 
            new Date();
            
          const lastMessageTime = data.lastMessageTime ? 
            (typeof data.lastMessageTime.toDate === 'function' ? data.lastMessageTime.toDate() : data.lastMessageTime) : 
            null;
            
          groupsData.push({
            id: groupDoc.id,
            name: data.name,
            description: data.description || '',
            avatar: data.avatar || null,
            isPrivate: data.isPrivate,
            createdBy: data.createdBy,
            createdAt: createdAt,
            updatedAt: updatedAt,
            memberCount: data.memberCount || 1,
            maxMembers: data.maxMembers || 100,
            lastMessage: data.lastMessage || '',
            lastMessageTime: lastMessageTime
          });
        }
      }
      
      // Sort by last activity
      groupsData.sort((a, b) => {
        const timeA = a.lastMessageTime ? a.lastMessageTime.getTime() : 
                     a.updatedAt ? a.updatedAt.getTime() : 0;
        const timeB = b.lastMessageTime ? b.lastMessageTime.getTime() : 
                     b.updatedAt ? b.updatedAt.getTime() : 0;
        return timeB - timeA;
      });
      
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load groups'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const membersQuery = query(
        collection(db, 'groupMembers'),
        where('groupId', '==', groupId)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const membersData: GroupMember[] = [];
      
      for (const memberDoc of membersSnapshot.docs) {
        const data = memberDoc.data();
        
        // Get user profile data from Supabase
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name, username, avatar')
          .eq('id', data.userId)
          .single();
        
        // Convert timestamp to Date
        const joinedAt = data.joinedAt ? 
          (typeof data.joinedAt.toDate === 'function' ? data.joinedAt.toDate() : data.joinedAt) : 
          new Date();
        
        membersData.push({
          id: memberDoc.id,
          userId: data.userId,
          role: data.role,
          joinedAt: joinedAt,
          name: userProfile?.name || 'Unknown User',
          username: userProfile?.username || 'unknown',
          avatar: userProfile?.avatar || null
        });
      }
      
      // Sort members (admins first, then by join date)
      membersData.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        
        const timeA = a.joinedAt ? a.joinedAt.getTime() : 0;
        const timeB = b.joinedAt ? b.joinedAt.getTime() : 0;
        return timeA - timeB;
      });
      
      setGroupMembers(membersData);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load group members'
      });
    }
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setMessages([]);
  };

  const handleCreateGroup = async () => {
    if (!newGroupData.name.trim() || !currentUser) return;
    
    // Check if group name already exists
    if (groupNameExists) {
      toast({
        variant: 'destructive',
        title: 'Group name already exists',
        description: 'Please choose a different name for your group'
      });
      return;
    }
    
    try {
      setCreatingGroup(true);
      
      // Create a new group document
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: newGroupData.name.trim(),
        description: newGroupData.description.trim(),
        avatar: newGroupData.avatar || null,
        isPrivate: true, // Always private
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
      
      // Create user profile document if it doesn't exist
      const userProfileRef = doc(db, 'userProfiles', currentUser.id);
      const userProfileDoc = await getDoc(userProfileRef);
      
      if (!userProfileDoc.exists()) {
        await setDoc(userProfileRef, {
          name: currentUser.name || 'User',
          username: currentUser.username || 'user',
          avatar: currentUser.avatar || null,
          createdAt: serverTimestamp()
        });
      }
      
      // Also store group ID in user's groups list
      await updateDoc(userProfileRef, {
        groups: arrayUnion(groupRef.id)
      });
      
      toast({
        title: 'Group created',
        description: 'Your group has been created successfully!'
      });
      
      // Refresh groups list
      fetchGroups();
      
      // Reset form and close dialog
      setNewGroupData({
        name: '',
        description: '',
        avatar: ''
      });
      setShowCreateDialog(false);
      
      // Select the newly created group
      const newGroup = {
        id: groupRef.id,
        name: newGroupData.name.trim(),
        description: newGroupData.description.trim(),
        avatar: newGroupData.avatar || null,
        isPrivate: true,
        createdBy: currentUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberCount: 1,
        maxMembers: 100
      };
      
      setSelectedGroup(newGroup);
      
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create group. Please try again.'
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !currentUser || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      // Add message to Firestore
      const messageData = {
        groupId: selectedGroup.id,
        senderId: currentUser.id,
        content: newMessage.trim(),
        messageType: 'text',
        createdAt: serverTimestamp(),
        senderName: currentUser.name,
        senderUsername: currentUser.username,
        senderAvatar: currentUser.avatar
      };

      const messageRef = await addDoc(collection(db, 'groupMessages'), messageData);
      
      // Update group's last message and time
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        lastMessage: newMessage.trim(),
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Clear input
      setNewMessage('');
      
      // Store in local storage for offline access
      const localMessages = JSON.parse(localStorage.getItem(`group_messages_${selectedGroup.id}`) || '[]');
      localMessages.push({
        id: messageRef.id,
        senderId: currentUser.id,
        content: newMessage.trim(),
        messageType: 'text',
        createdAt: new Date(),
        senderName: currentUser.name,
        senderUsername: currentUser.username,
        senderAvatar: currentUser.avatar
      });
      localStorage.setItem(`group_messages_${selectedGroup.id}`, JSON.stringify(localMessages));
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
      
      // Store in local storage for later sync
      const pendingMessages = JSON.parse(localStorage.getItem('pending_group_messages') || '[]');
      pendingMessages.push({
        groupId: selectedGroup.id,
        content: newMessage.trim(),
        createdAt: new Date()
      });
      localStorage.setItem('pending_group_messages', JSON.stringify(pendingMessages));
      
      // Show in UI optimistically
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        senderId: currentUser.id,
        content: newMessage.trim(),
        messageType: 'text',
        createdAt: new Date(),
        senderName: currentUser.name,
        senderUsername: currentUser.username,
        senderAvatar: currentUser.avatar
      }]);
      
      setNewMessage('');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup || !currentUser || selectedGroup.createdBy !== currentUser.id) return;
    
    try {
      // Delete all group messages
      const messagesQuery = query(
        collection(db, 'groupMessages'),
        where('groupId', '==', selectedGroup.id)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const deleteMessagePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteMessagePromises);
      
      // Delete all group members
      const membersQuery = query(
        collection(db, 'groupMembers'),
        where('groupId', '==', selectedGroup.id)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const deleteMemberPromises = membersSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteMemberPromises);
      
      // Delete the group
      await deleteDoc(doc(db, 'groups', selectedGroup.id));
      
      toast({
        title: 'Group deleted',
        description: 'The group has been permanently deleted'
      });
      
      // Update UI
      setGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
      setSelectedGroup(null);
      setShowDeleteGroupDialog(false);
      
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
    if (!selectedGroup || !currentUser) return;
    
    try {
      // Find the member document
      const membersQuery = query(
        collection(db, 'groupMembers'),
        where('groupId', '==', selectedGroup.id),
        where('userId', '==', currentUser.id)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      
      if (membersSnapshot.empty) {
        throw new Error('Member not found');
      }
      
      // Check if user is the only admin
      if (selectedGroup.createdBy === currentUser.id) {
        // Count other admins
        const adminsQuery = query(
          collection(db, 'groupMembers'),
          where('groupId', '==', selectedGroup.id),
          where('role', '==', 'admin')
        );
        
        const adminsSnapshot = await getDocs(adminsQuery);
        const otherAdmins = adminsSnapshot.docs.filter(doc => doc.data().userId !== currentUser.id);
        
        if (otherAdmins.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Cannot leave group',
            description: 'You are the only admin. Please delete the group or make someone else an admin first.'
          });
          setShowLeaveGroupDialog(false);
          return;
        }
      }
      
      // Delete the member document
      await deleteDoc(membersSnapshot.docs[0].ref);
      
      // Update group member count
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        memberCount: selectedGroup.memberCount - 1
      });
      
      toast({
        title: 'Left group',
        description: 'You have left the group successfully'
      });
      
      // Update UI
      setGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
      setSelectedGroup(null);
      setShowLeaveGroupDialog(false);
      
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to leave group'
      });
    }
  };

  const formatMessageTime = (dateString: any) => {
    if (!dateString) return '';
    
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return 'Today';
    
    const date = dateString instanceof Date ? dateString : new Date(dateString);
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

  const getDateSeparatorText = (date: string) => {
    if (date === 'Today') return 'Today';
    if (date === 'Yesterday') return 'Yesterday';
    return date;
  };

  const truncateMessage = (message: string, maxLength: number = 30) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages by date for better display
  const groupedMessages = React.useMemo(() => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = formatDate(message.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  }, [messages]);

  const isCurrentUserAdmin = selectedGroup && groupMembers.some(
    member => member.userId === currentUser?.id && member.role === 'admin'
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-60px)] bg-background rounded-lg shadow-lg overflow-hidden">
        <div className="flex h-full">
          {/* Groups List */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedGroup ? 'hidden md:flex' : ''}`}>
            {/* Groups List Header */}
            <div className="p-3 border-b bg-muted/30 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-red-500" />
                  <h2 className="font-pixelated text-sm font-medium">Vortex Groups</h2>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowCreateDialog(true)}
                  className="h-8 w-8 p-0 rounded-full bg-social-green hover:bg-social-light-green text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="relative">
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-3 h-8 font-pixelated text-xs"
                />
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
                ) : filteredGroups.length > 0 ? (
                  <div className="p-2">
                    {filteredGroups.map(group => (
                      <div
                        key={group.id}
                        onClick={() => handleSelectGroup(group)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                          selectedGroup?.id === group.id ? 'bg-accent shadow-md' : ''
                        }`}
                      >
                        <Avatar className="h-10 w-10 border-2 border-background flex-shrink-0">
                          {group.avatar ? (
                            <AvatarImage src={group.avatar} />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                              {group.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate text-sm font-pixelated">
                              {group.name}
                            </p>
                            {group.isPrivate && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs truncate font-pixelated text-muted-foreground">
                              {group.lastMessage ? (
                                truncateMessage(group.lastMessage)
                              ) : (
                                `${group.memberCount} members`
                              )}
                            </p>
                            
                            {group.lastMessageTime && (
                              <span className="text-xs text-muted-foreground font-pixelated">
                                {formatMessageTime(group.lastMessageTime)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 font-pixelated text-sm">No groups found</p>
                    <Button 
                      onClick={() => setShowCreateDialog(true)}
                      className="font-pixelated text-xs"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Group Chat Area */}
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
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {selectedGroup.avatar ? (
                      <AvatarImage src={selectedGroup.avatar} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                        {selectedGroup.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate text-sm font-pixelated">
                        {selectedGroup.name}
                      </p>
                      {selectedGroup.isPrivate ? (
                        <Badge variant="outline" className="h-5 px-1 text-xs font-pixelated">
                          <Lock className="h-2 w-2 mr-1" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-5 px-1 text-xs font-pixelated">
                          <Globe className="h-2 w-2 mr-1" />
                          Public
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-pixelated">
                      {selectedGroup.memberCount} members
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="font-pixelated text-xs cursor-pointer"
                        onClick={() => {}}
                        disabled
                      >
                        <Users className="h-4 w-4 mr-2" />
                        View Members
                      </DropdownMenuItem>
                      
                      {selectedGroup.createdBy === currentUser?.id && (
                        <DropdownMenuItem 
                          className="font-pixelated text-xs cursor-pointer text-destructive"
                          onClick={() => setShowDeleteGroupDialog(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Group
                        </DropdownMenuItem>
                      )}
                      
                      {selectedGroup.createdBy !== currentUser?.id && (
                        <DropdownMenuItem 
                          className="font-pixelated text-xs cursor-pointer text-destructive"
                          onClick={() => setShowLeaveGroupDialog(true)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Leave Group
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Group Tabs */}
                <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                  <TabsList className="px-3 pt-2 justify-start border-b rounded-none bg-transparent">
                    <TabsTrigger 
                      value="chat" 
                      className="font-pixelated text-xs data-[state=active]:bg-transparent"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger 
                      value="members" 
                      className="font-pixelated text-xs data-[state=active]:bg-transparent"
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Members
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0">
                    {/* Messages Area */}
                    <div className="flex-1 overflow-hidden">
                      <ScrollArea 
                        ref={messagesContainerRef}
                        className="h-full scroll-smooth"
                      >
                        <div className="p-3 space-y-4">
                          {groupedMessages.length > 0 ? (
                            <>
                              {groupedMessages.map((group, groupIndex) => (
                                <div key={groupIndex} className="space-y-2">
                                  {/* Date Separator */}
                                  <div className="flex justify-center my-2">
                                    <Badge variant="outline" className="font-pixelated text-xs">
                                      {getDateSeparatorText(group.date)}
                                    </Badge>
                                  </div>
                                  
                                  {/* Messages for this date */}
                                  {group.messages.map((message) => {
                                    const isCurrentUser = message.senderId === currentUser?.id;
                                    
                                    return (
                                      <div 
                                        key={message.id}
                                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                      >
                                        <div className={`flex gap-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                          <Avatar className="h-8 w-8 mt-1">
                                            {message.senderAvatar ? (
                                              <AvatarImage src={message.senderAvatar} />
                                            ) : (
                                              <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                                                {message.senderName.substring(0, 2).toUpperCase()}
                                              </AvatarFallback>
                                            )}
                                          </Avatar>
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <p className="text-xs font-pixelated font-medium">
                                                {isCurrentUser ? 'You' : message.senderName}
                                              </p>
                                              <span className="text-xs text-muted-foreground font-pixelated">
                                                {formatMessageTime(message.createdAt)}
                                              </span>
                                            </div>
                                            <div className={`p-3 rounded-lg ${
                                              isCurrentUser 
                                                ? 'bg-social-green text-white' 
                                                : 'bg-muted'
                                            }`}>
                                              <p className="text-sm font-pixelated whitespace-pre-wrap break-words">
                                                {message.content}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                              <div ref={messagesEndRef} />
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                              <h3 className="font-pixelated text-sm font-medium mb-2">No messages yet</h3>
                              <p className="font-pixelated text-xs text-muted-foreground max-w-sm">
                                Be the first to send a message in this group!
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    {/* Message Input */}
                    <div className="p-3 border-t">
                      <div className="flex gap-2 items-end">
                        <Textarea
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1 min-h-[60px] max-h-[120px] font-pixelated text-xs resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={sendingMessage}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim() || sendingMessage}
                          className="bg-social-green hover:bg-social-light-green text-white flex-shrink-0 h-[60px] w-12"
                        >
                          {sendingMessage ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground font-pixelated mt-1">
                        Press Enter to send, Shift + Enter for new line
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="members" className="p-3 m-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-pixelated text-sm font-medium">Members ({groupMembers.length})</h3>
                        <Button 
                          size="sm" 
                          className="h-8 font-pixelated text-xs"
                          disabled
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Invite
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {groupMembers.map(member => (
                          <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {member.avatar ? (
                                  <AvatarImage src={member.avatar} />
                                ) : (
                                  <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                                    {member.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="font-pixelated text-xs font-medium">
                                  {member.name} {member.userId === currentUser?.id && '(You)'}
                                </p>
                                <p className="font-pixelated text-xs text-muted-foreground">
                                  @{member.username}
                                </p>
                              </div>
                            </div>
                            <Badge variant={member.role === 'admin' ? 'default' : 'outline'} className="font-pixelated text-xs">
                              {member.role === 'admin' ? 'Admin' : 'Member'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="mb-6">
                  <Zap className="h-16 w-16 text-red-500 mb-4 mx-auto" />
                  <h2 className="text-2xl font-bold mb-2 font-pixelated">Vortex Groups</h2>
                  <p className="text-muted-foreground font-pixelated text-sm max-w-md mx-auto">
                    Create or join group chats to collaborate with friends, colleagues, or communities.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full mb-6">
                  <Card className="hover:shadow-md transition-all duration-200 hover-scale">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                          <Plus className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <h3 className="font-pixelated text-sm font-medium">Create a Group</h3>
                          <p className="font-pixelated text-xs text-muted-foreground">
                            Start your own community
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => setShowCreateDialog(true)}
                        className="w-full font-pixelated text-xs"
                      >
                        Create Group
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="hover:shadow-md transition-all duration-200 hover-scale">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="font-pixelated text-sm font-medium">Find Groups</h3>
                          <p className="font-pixelated text-xs text-muted-foreground">
                            Discover and join communities
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        className="w-full font-pixelated text-xs"
                        disabled
                      >
                        Browse Groups
                      </Button>
                    </CardContent>
                  </Card>
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
              Create a private group to chat with multiple people at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Group Name</label>
              <div className="relative">
                <Input
                  placeholder="Enter group name"
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData({...newGroupData, name: e.target.value})}
                  className={`font-pixelated text-xs ${groupNameExists ? 'border-red-500' : ''}`}
                />
                {checkingGroupName && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {groupNameExists && !checkingGroupName && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                )}
                {!groupNameExists && newGroupData.name.trim() && !checkingGroupName && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              {groupNameExists && (
                <p className="text-xs text-red-500 font-pixelated">
                  This group name already exists. Please choose another name.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Description</label>
              <Textarea
                placeholder="Enter group description"
                value={newGroupData.description}
                onChange={(e) => setNewGroupData({...newGroupData, description: e.target.value})}
                className="font-pixelated text-xs"
              />
            </div>
            
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="font-pixelated text-xs text-muted-foreground">
                  Private groups are only visible to members and require an invitation to join.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="font-pixelated text-xs"
              disabled={creatingGroup}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              className="font-pixelated text-xs"
              disabled={!newGroupData.name.trim() || creatingGroup || groupNameExists || checkingGroupName}
            >
              {creatingGroup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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