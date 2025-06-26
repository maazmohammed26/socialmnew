import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  Zap, 
  Search, 
  Plus, 
  Users, 
  Send, 
  Info, 
  Settings, 
  Trash2, 
  LogOut, 
  UserPlus, 
  Check, 
  X, 
  MessageSquare,
  Lock,
  Globe,
  ChevronRight
} from 'lucide-react';
import { db, auth } from '@/config/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  setDoc 
} from 'firebase/firestore';

interface Group {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  isPrivate: boolean;
  createdBy: string;
  createdAt: any;
  memberCount: number;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: any;
  profile?: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  createdAt: any;
  senderName?: string;
  senderAvatar?: string;
}

interface JoinRequest {
  id: string;
  groupId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  createdAt: any;
  profile?: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

export function Vortex() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showJoinRequestDialog, setShowJoinRequestDialog] = useState(false);
  const [joinRequestMessage, setJoinRequestMessage] = useState('');
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nameError, setNameError] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          setCurrentUser({ ...user, profile });
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Load user's groups
  useEffect(() => {
    if (!currentUser) return;

    const loadGroups = async () => {
      setLoading(true);
      try {
        // Get groups where user is a member
        const q = query(
          collection(db, 'groupMembers'),
          where('userId', '==', currentUser.id)
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const membershipDocs = snapshot.docs;
          const groupIds = membershipDocs.map(doc => doc.data().groupId);
          
          if (groupIds.length === 0) {
            setMyGroups([]);
            setLoading(false);
            return;
          }
          
          const myGroupsData: Group[] = [];
          
          // Get group details for each group
          for (const groupId of groupIds) {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
              const groupData = groupDoc.data();
              myGroupsData.push({
                id: groupDoc.id,
                name: groupData.name,
                description: groupData.description,
                avatar: groupData.avatar,
                isPrivate: groupData.isPrivate,
                createdBy: groupData.createdBy,
                createdAt: groupData.createdAt,
                memberCount: groupData.memberCount || 1
              });
            }
          }
          
          setMyGroups(myGroupsData);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading groups:', error);
        setLoading(false);
      }
    };
    
    loadGroups();
  }, [currentUser]);

  // Load suggested groups
  useEffect(() => {
    if (!currentUser) return;

    const loadSuggestedGroups = async () => {
      try {
        // Get all public groups
        const q = query(
          collection(db, 'groups'),
          where('isPrivate', '==', false)
        );
        
        const querySnapshot = await getDocs(q);
        const allGroups: Group[] = [];
        
        querySnapshot.forEach((doc) => {
          const groupData = doc.data();
          allGroups.push({
            id: doc.id,
            name: groupData.name,
            description: groupData.description,
            avatar: groupData.avatar,
            isPrivate: groupData.isPrivate,
            createdBy: groupData.createdBy,
            createdAt: groupData.createdAt,
            memberCount: groupData.memberCount || 1
          });
        });
        
        // Filter out groups the user is already a member of
        const myGroupIds = myGroups.map(g => g.id);
        const filteredGroups = allGroups.filter(g => !myGroupIds.includes(g.id));
        
        setSuggestedGroups(filteredGroups);
      } catch (error) {
        console.error('Error loading suggested groups:', error);
      }
    };
    
    if (myGroups.length > 0) {
      loadSuggestedGroups();
    }
  }, [currentUser, myGroups]);

  // Load group members when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;

    const loadGroupMembers = async () => {
      try {
        const q = query(
          collection(db, 'groupMembers'),
          where('groupId', '==', selectedGroup.id)
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const memberDocs = snapshot.docs;
          const membersData: GroupMember[] = [];
          
          for (const memberDoc of memberDocs) {
            const memberData = memberDoc.data();
            
            // Get user profile from Supabase
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, username, avatar')
              .eq('id', memberData.userId)
              .single();
            
            membersData.push({
              id: memberDoc.id,
              groupId: memberData.groupId,
              userId: memberData.userId,
              role: memberData.role,
              joinedAt: memberData.joinedAt,
              profile: profile || undefined
            });
            
            // Check if current user is admin
            if (memberData.userId === currentUser?.id && memberData.role === 'admin') {
              setIsAdmin(true);
            }
          }
          
          setGroupMembers(membersData);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading group members:', error);
      }
    };
    
    loadGroupMembers();
    
    // Reset admin status when changing groups
    setIsAdmin(false);
  }, [selectedGroup, currentUser?.id]);

  // Load messages when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;

    const loadMessages = async () => {
      try {
        const q = query(
          collection(db, 'groupMessages'),
          where('groupId', '==', selectedGroup.id),
          orderBy('createdAt', 'asc')
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const messageDocs = snapshot.docs;
          const messagesData: GroupMessage[] = [];
          
          for (const messageDoc of messageDocs) {
            const messageData = messageDoc.data();
            
            // Get sender profile from Supabase
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, avatar')
              .eq('id', messageData.senderId)
              .single();
            
            messagesData.push({
              id: messageDoc.id,
              groupId: messageData.groupId,
              senderId: messageData.senderId,
              content: messageData.content,
              messageType: messageData.messageType || 'text',
              createdAt: messageData.createdAt,
              senderName: profile?.name || 'Unknown User',
              senderAvatar: profile?.avatar || undefined
            });
          }
          
          setMessages(messagesData);
          
          // Scroll to bottom after messages load
          setTimeout(scrollToBottom, 100);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };
    
    loadMessages();
  }, [selectedGroup]);

  // Load join requests for admin
  useEffect(() => {
    if (!selectedGroup || !isAdmin) return;

    const loadJoinRequests = async () => {
      try {
        const q = query(
          collection(db, 'groupJoinRequests'),
          where('groupId', '==', selectedGroup.id),
          where('status', '==', 'pending')
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const requestDocs = snapshot.docs;
          const requestsData: JoinRequest[] = [];
          
          for (const requestDoc of requestDocs) {
            const requestData = requestDoc.data();
            
            // Get user profile from Supabase
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, username, avatar')
              .eq('id', requestData.userId)
              .single();
            
            requestsData.push({
              id: requestDoc.id,
              groupId: requestData.groupId,
              userId: requestData.userId,
              status: requestData.status,
              message: requestData.message,
              createdAt: requestData.createdAt,
              profile: profile || undefined
            });
          }
          
          setJoinRequests(requestsData);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading join requests:', error);
      }
    };
    
    loadJoinRequests();
  }, [selectedGroup, isAdmin]);

  // Check if group name is unique
  const checkGroupNameUnique = async (name: string) => {
    try {
      const q = query(
        collection(db, 'groups'),
        where('name', '==', name)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking group name:', error);
      return false;
    }
  };

  // Create a new group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setNameError('Group name is required');
      return;
    }
    
    if (newGroupName.length < 3) {
      setNameError('Group name must be at least 3 characters');
      return;
    }
    
    setCreatingGroup(true);
    
    try {
      // Check if group name is unique
      const isUnique = await checkGroupNameUnique(newGroupName.trim());
      
      if (!isUnique) {
        setNameError('Group name already exists');
        setCreatingGroup(false);
        return;
      }
      
      // Create group in Firestore
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        isPrivate: isPrivate,
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
        memberCount: 1
      });
      
      // Add creator as admin member
      await setDoc(doc(db, 'groupMembers', `${currentUser.id}_${groupRef.id}`), {
        groupId: groupRef.id,
        userId: currentUser.id,
        role: 'admin',
        joinedAt: serverTimestamp()
      });
      
      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setIsPrivate(true);
      setShowCreateDialog(false);
      
      toast({
        title: 'Group created',
        description: 'Your group has been created successfully',
      });
      
      // Select the new group
      const newGroup = {
        id: groupRef.id,
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        isPrivate: isPrivate,
        createdBy: currentUser.id,
        createdAt: new Date(),
        memberCount: 1
      };
      
      setSelectedGroup(newGroup);
      setMyGroups(prev => [...prev, newGroup]);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create group. Please try again.',
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || sendingMessage) return;
    
    setSendingMessage(true);
    
    try {
      await addDoc(collection(db, 'groupMessages'), {
        groupId: selectedGroup.id,
        senderId: currentUser.id,
        content: newMessage.trim(),
        messageType: 'text',
        createdAt: serverTimestamp()
      });
      
      setNewMessage('');
      
      // No need to manually update messages as the onSnapshot listener will handle it
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message. Please try again.',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Delete a group
  const handleDeleteGroup = async () => {
    if (!selectedGroup || !isAdmin) return;
    
    try {
      // Delete group messages
      const messagesQuery = query(
        collection(db, 'groupMessages'),
        where('groupId', '==', selectedGroup.id)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const deleteMessagePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteMessagePromises);
      
      // Delete group members
      const membersQuery = query(
        collection(db, 'groupMembers'),
        where('groupId', '==', selectedGroup.id)
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const deleteMemberPromises = membersSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteMemberPromises);
      
      // Delete join requests
      const requestsQuery = query(
        collection(db, 'groupJoinRequests'),
        where('groupId', '==', selectedGroup.id)
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      const deleteRequestPromises = requestsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteRequestPromises);
      
      // Delete group
      await deleteDoc(doc(db, 'groups', selectedGroup.id));
      
      toast({
        title: 'Group deleted',
        description: 'The group has been deleted successfully',
      });
      
      // Update UI
      setSelectedGroup(null);
      setMyGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete group. Please try again.',
      });
    }
  };

  // Leave a group
  const handleLeaveGroup = async () => {
    if (!selectedGroup || !currentUser) return;
    
    try {
      // Delete member record
      await deleteDoc(doc(db, 'groupMembers', `${currentUser.id}_${selectedGroup.id}`));
      
      // Update group member count
      await updateDoc(doc(db, 'groups', selectedGroup.id), {
        memberCount: selectedGroup.memberCount - 1
      });
      
      toast({
        title: 'Left group',
        description: 'You have left the group successfully',
      });
      
      // Update UI
      setSelectedGroup(null);
      setMyGroups(prev => prev.filter(g => g.id !== selectedGroup.id));
      setShowLeaveDialog(false);
    } catch (error) {
      console.error('Error leaving group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to leave group. Please try again.',
      });
    }
  };

  // Join a group
  const handleJoinGroup = async (group: Group) => {
    if (!currentUser) return;
    
    try {
      if (group.isPrivate) {
        // For private groups, create a join request
        setSelectedGroup(group);
        setShowJoinRequestDialog(true);
      } else {
        // For public groups, join directly
        await setDoc(doc(db, 'groupMembers', `${currentUser.id}_${group.id}`), {
          groupId: group.id,
          userId: currentUser.id,
          role: 'member',
          joinedAt: serverTimestamp()
        });
        
        // Update group member count
        await updateDoc(doc(db, 'groups', group.id), {
          memberCount: group.memberCount + 1
        });
        
        toast({
          title: 'Joined group',
          description: 'You have joined the group successfully',
        });
        
        // Update UI
        const updatedGroup = { ...group, memberCount: group.memberCount + 1 };
        setMyGroups(prev => [...prev, updatedGroup]);
        setSuggestedGroups(prev => prev.filter(g => g.id !== group.id));
        setSelectedGroup(updatedGroup);
      }
    } catch (error) {
      console.error('Error joining group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to join group. Please try again.',
      });
    }
  };

  // Send join request
  const handleSendJoinRequest = async () => {
    if (!selectedGroup || !currentUser) return;
    
    try {
      await setDoc(doc(db, 'groupJoinRequests', `${currentUser.id}_${selectedGroup.id}`), {
        groupId: selectedGroup.id,
        userId: currentUser.id,
        status: 'pending',
        message: joinRequestMessage.trim(),
        createdAt: serverTimestamp()
      });
      
      toast({
        title: 'Request sent',
        description: 'Your request to join the group has been sent',
      });
      
      setJoinRequestMessage('');
      setShowJoinRequestDialog(false);
    } catch (error) {
      console.error('Error sending join request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send join request. Please try again.',
      });
    }
  };

  // Handle join request response (approve/reject)
  const handleJoinRequestResponse = async (request: JoinRequest, approve: boolean) => {
    try {
      if (approve) {
        // Add user as member
        await setDoc(doc(db, 'groupMembers', `${request.userId}_${request.groupId}`), {
          groupId: request.groupId,
          userId: request.userId,
          role: 'member',
          joinedAt: serverTimestamp()
        });
        
        // Update group member count
        await updateDoc(doc(db, 'groups', request.groupId), {
          memberCount: selectedGroup!.memberCount + 1
        });
        
        toast({
          title: 'Request approved',
          description: 'The join request has been approved',
        });
      } else {
        toast({
          title: 'Request rejected',
          description: 'The join request has been rejected',
        });
      }
      
      // Update request status
      await updateDoc(doc(db, 'groupJoinRequests', request.id), {
        status: approve ? 'approved' : 'rejected'
      });
      
      // Update UI
      setJoinRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error handling join request:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process join request. Please try again.',
      });
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Filter groups by search query
  const filteredGroups = (groups: Group[]) => {
    if (!searchQuery.trim()) return groups;
    
    return groups.filter(group => 
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
                  <Zap className="h-5 w-5 text-social-purple" />
                  <h2 className="font-pixelated text-sm font-medium">Vortex Groups</h2>
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  size="icon"
                  className="h-7 w-7 rounded-full bg-social-purple hover:bg-social-purple/90 text-white"
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

            {/* Groups List - Tabs */}
            <Tabs defaultValue="myGroups" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-2 mx-3 mt-3">
                <TabsTrigger value="myGroups" className="font-pixelated text-xs">My Groups</TabsTrigger>
                <TabsTrigger value="discover" className="font-pixelated text-xs">Discover</TabsTrigger>
              </TabsList>
              
              {/* My Groups Tab */}
              <TabsContent value="myGroups" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {loading ? (
                    <div className="p-3 space-y-2">
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
                  ) : filteredGroups(myGroups).length > 0 ? (
                    <div className="p-2">
                      {filteredGroups(myGroups).map(group => (
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
                              <AvatarFallback className="bg-social-purple text-white font-pixelated text-xs">
                                {group.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium truncate text-sm font-pixelated">
                                {group.name}
                              </p>
                              {group.isPrivate && (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate font-pixelated">
                              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                          
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4 font-pixelated text-sm">No groups yet</p>
                      <Button 
                        onClick={() => setShowCreateDialog(true)}
                        variant="outline" 
                        className="font-pixelated text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Group
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              {/* Discover Tab */}
              <TabsContent value="discover" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  {suggestedGroups.length > 0 ? (
                    <div className="p-2">
                      {filteredGroups(suggestedGroups).map(group => (
                        <div
                          key={group.id}
                          className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-accent/50"
                        >
                          <Avatar className="h-10 w-10 border-2 border-background">
                            {group.avatar ? (
                              <AvatarImage src={group.avatar} />
                            ) : (
                              <AvatarFallback className="bg-social-purple text-white font-pixelated text-xs">
                                {group.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium truncate text-sm font-pixelated">
                                {group.name}
                              </p>
                              {group.isPrivate ? (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Globe className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate font-pixelated">
                              {group.description || `${group.memberCount} members`}
                            </p>
                          </div>
                          
                          <Button
                            onClick={() => handleJoinGroup(group)}
                            size="sm"
                            className="h-7 bg-social-purple hover:bg-social-purple/90 text-white font-pixelated text-xs"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Join
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4 font-pixelated text-sm">No groups to discover</p>
                      <Button 
                        onClick={() => setShowCreateDialog(true)}
                        variant="outline" 
                        className="font-pixelated text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Group
                      </Button>
                    </div>
                  )}
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
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <Avatar className="h-8 w-8">
                      {selectedGroup.avatar ? (
                        <AvatarImage src={selectedGroup.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-purple text-white font-pixelated text-xs">
                          {selectedGroup.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-medium text-sm font-pixelated">{selectedGroup.name}</p>
                        {selectedGroup.isPrivate && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-pixelated">
                        {groupMembers.length} {groupMembers.length === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-pixelated text-sm">Group Members</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[300px] overflow-y-auto">
                          {groupMembers.map(member => (
                            <div key={member.id} className="flex items-center justify-between py-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  {member.profile?.avatar ? (
                                    <AvatarImage src={member.profile.avatar} />
                                  ) : (
                                    <AvatarFallback className="bg-social-purple text-white font-pixelated text-xs">
                                      {member.profile?.name?.substring(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <p className="font-pixelated text-xs font-medium">
                                    {member.profile?.name || 'Unknown User'}
                                  </p>
                                  <p className="font-pixelated text-xs text-muted-foreground">
                                    @{member.profile?.username || 'unknown'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={member.role === 'admin' ? 'default' : 'outline'} className="font-pixelated text-xs">
                                {member.role}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {isAdmin && joinRequests.length > 0 && (
                      <Button
                        onClick={() => setShowJoinRequestDialog(true)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 relative"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                          {joinRequests.length}
                        </span>
                      </Button>
                    )}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-pixelated text-sm">Group Info</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-pixelated text-xs font-medium mb-1">Description</h3>
                            <p className="font-pixelated text-xs text-muted-foreground">
                              {selectedGroup.description || 'No description provided'}
                            </p>
                          </div>
                          <div>
                            <h3 className="font-pixelated text-xs font-medium mb-1">Created</h3>
                            <p className="font-pixelated text-xs text-muted-foreground">
                              {formatTimestamp(selectedGroup.createdAt)}
                            </p>
                          </div>
                          <div>
                            <h3 className="font-pixelated text-xs font-medium mb-1">Privacy</h3>
                            <div className="flex items-center gap-1">
                              {selectedGroup.isPrivate ? (
                                <>
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                  <p className="font-pixelated text-xs text-muted-foreground">Private</p>
                                </>
                              ) : (
                                <>
                                  <Globe className="h-3 w-3 text-muted-foreground" />
                                  <p className="font-pixelated text-xs text-muted-foreground">Public</p>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="pt-4 flex flex-col gap-2">
                            {isAdmin ? (
                              <Button
                                onClick={() => {
                                  setShowDeleteDialog(true);
                                }}
                                variant="destructive"
                                className="font-pixelated text-xs"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete Group
                              </Button>
                            ) : (
                              <Button
                                onClick={() => {
                                  setShowLeaveDialog(true);
                                }}
                                variant="destructive"
                                className="font-pixelated text-xs"
                              >
                                <LogOut className="h-3 w-3 mr-1" />
                                Leave Group
                              </Button>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full">
                        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                        <h3 className="font-pixelated text-sm font-medium mb-2">No messages yet</h3>
                        <p className="font-pixelated text-xs text-muted-foreground text-center max-w-sm">
                          Be the first to send a message in this group!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isCurrentUser = message.senderId === currentUser?.id;
                          
                          return (
                            <div 
                              key={message.id}
                              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`flex gap-2 max-w-[75%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                                  {message.senderAvatar ? (
                                    <AvatarImage src={message.senderAvatar} />
                                  ) : (
                                    <AvatarFallback className="bg-social-purple text-white font-pixelated text-xs">
                                      {message.senderName?.substring(0, 2).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div 
                                  className={`p-3 rounded-lg relative ${
                                    isCurrentUser 
                                      ? 'bg-social-purple text-white' 
                                      : 'bg-muted'
                                  }`}
                                >
                                  {!isCurrentUser && (
                                    <p className="font-pixelated text-xs font-medium mb-1">
                                      {message.senderName}
                                    </p>
                                  )}
                                  <p className="font-pixelated text-xs whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                  <p className="font-pixelated text-xs opacity-70 mt-1 text-right">
                                    {formatTimestamp(message.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-social-purple hover:bg-social-purple/90 text-white self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Zap className="h-16 w-16 text-social-purple mb-6" />
                <h2 className="text-xl font-bold mb-2 font-pixelated">Welcome to Vortex</h2>
                <p className="text-muted-foreground mb-6 font-pixelated text-sm max-w-md">
                  Create or join groups to chat with multiple people at once. Collaborate with friends, family, or communities.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
                  <Card className="hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-social-purple/10 flex items-center justify-center mb-3">
                          <Plus className="h-6 w-6 text-social-purple" />
                        </div>
                        <h3 className="font-pixelated text-sm font-medium mb-1">Create Group</h3>
                        <p className="font-pixelated text-xs text-muted-foreground mb-3">
                          Start your own community
                        </p>
                        <Button 
                          onClick={() => setShowCreateDialog(true)}
                          className="bg-social-purple hover:bg-social-purple/90 text-white font-pixelated text-xs w-full"
                        >
                          Create Group
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="hover:shadow-md transition-all duration-200">
                    <CardContent className="p-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-social-blue/10 flex items-center justify-center mb-3">
                          <Search className="h-6 w-6 text-social-blue" />
                        </div>
                        <h3 className="font-pixelated text-sm font-medium mb-1">Find Groups</h3>
                        <p className="font-pixelated text-xs text-muted-foreground mb-3">
                          Discover and join communities
                        </p>
                        <Button 
                          onClick={() => {
                            const tabsElement = document.querySelector('[data-state="inactive"][value="discover"]');
                            if (tabsElement) {
                              (tabsElement as HTMLElement).click();
                            }
                          }}
                          variant="outline"
                          className="font-pixelated text-xs w-full"
                        >
                          Browse Groups
                        </Button>
                      </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-pixelated text-xs text-muted-foreground">
              Create a private group to chat with multiple people at once.
            </p>
            
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Group Name</label>
              <Input
                value={newGroupName}
                onChange={(e) => {
                  setNewGroupName(e.target.value);
                  setNameError('');
                }}
                placeholder="Enter group name"
                className="font-pixelated text-xs"
              />
              {nameError && (
                <p className="text-destructive font-pixelated text-xs">{nameError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Description</label>
              <Textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Enter group description"
                className="font-pixelated text-xs resize-none min-h-[80px]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="private"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                  className="h-4 w-4 text-social-purple"
                />
                <label htmlFor="private" className="font-pixelated text-xs flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Private
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="public"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                  className="h-4 w-4 text-social-purple"
                />
                <label htmlFor="public" className="font-pixelated text-xs flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Public
                </label>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="font-pixelated text-xs text-muted-foreground">
                {isPrivate 
                  ? 'Private groups are only visible to members and require an invitation to join.'
                  : 'Public groups can be discovered and joined by anyone.'}
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setNameError('');
                }}
                className="font-pixelated text-xs"
                disabled={creatingGroup}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateGroup}
                className="bg-social-purple hover:bg-social-purple/90 text-white font-pixelated text-xs"
                disabled={!newGroupName.trim() || creatingGroup}
              >
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </div>
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
              Delete
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
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Join Request Dialog */}
      <Dialog open={showJoinRequestDialog} onOpenChange={setShowJoinRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Join Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-pixelated text-xs text-muted-foreground">
              Send a request to join <span className="font-medium">{selectedGroup?.name}</span>. The group admin will need to approve your request.
            </p>
            
            <div className="space-y-2">
              <label className="font-pixelated text-xs">Message (Optional)</label>
              <Textarea
                value={joinRequestMessage}
                onChange={(e) => setJoinRequestMessage(e.target.value)}
                placeholder="Why do you want to join this group?"
                className="font-pixelated text-xs resize-none min-h-[80px]"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowJoinRequestDialog(false);
                  setJoinRequestMessage('');
                }}
                className="font-pixelated text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendJoinRequest}
                className="bg-social-purple hover:bg-social-purple/90 text-white font-pixelated text-xs"
              >
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Requests Dialog */}
      <Dialog open={showJoinRequestDialog && isAdmin && joinRequests.length > 0} onOpenChange={setShowJoinRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixelated">Join Requests</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-pixelated text-xs text-muted-foreground">
              {joinRequests.length} {joinRequests.length === 1 ? 'person' : 'people'} requesting to join {selectedGroup?.name}
            </p>
            
            <div className="max-h-[300px] overflow-y-auto space-y-3">
              {joinRequests.map(request => (
                <div key={request.id} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-8 w-8">
                      {request.profile?.avatar ? (
                        <AvatarImage src={request.profile.avatar} />
                      ) : (
                        <AvatarFallback className="bg-social-purple text-white font-pixelated text-xs">
                          {request.profile?.name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-pixelated text-xs font-medium">
                        {request.profile?.name || 'Unknown User'}
                      </p>
                      <p className="font-pixelated text-xs text-muted-foreground">
                        @{request.profile?.username || 'unknown'}
                      </p>
                    </div>
                  </div>
                  
                  {request.message && (
                    <div className="bg-muted/50 p-2 rounded-md mb-3">
                      <p className="font-pixelated text-xs">
                        {request.message}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => handleJoinRequestResponse(request, false)}
                      variant="outline"
                      size="sm"
                      className="font-pixelated text-xs h-7"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleJoinRequestResponse(request, true)}
                      size="sm"
                      className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-7"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Button
              onClick={() => setShowJoinRequestDialog(false)}
              className="w-full font-pixelated text-xs"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default Vortex;