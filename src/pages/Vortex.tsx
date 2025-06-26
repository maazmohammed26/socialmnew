import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  MessageSquare, 
  Send, 
  Plus, 
  Lock, 
  Globe, 
  UserPlus, 
  LogOut, 
  Trash2, 
  Settings,
  Info,
  X
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
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

interface Member {
  id: string;
  userId: string;
  groupId: string;
  role: 'admin' | 'member';
  joinedAt: any;
  name?: string;
  username?: string;
  avatar?: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: any;
  groupId: string;
}

export function Vortex() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupIsPrivate, setNewGroupIsPrivate] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
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

  // Fetch user groups
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserGroups = async () => {
      try {
        setLoading(true);
        
        // Get groups where the user is a member
        const groupMembersRef = collection(db, 'groupMembers');
        const q = query(groupMembersRef, where('userId', '==', currentUser.id));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const userGroupIds = snapshot.docs.map(doc => doc.data().groupId);
          
          if (userGroupIds.length === 0) {
            setGroups([]);
            setLoading(false);
            return;
          }
          
          const groupsData: Group[] = [];
          
          // Fetch each group's details
          for (const groupId of userGroupIds) {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            
            if (groupDoc.exists()) {
              const groupData = groupDoc.data();
              const createdAt = groupData.createdAt;
              const updatedAt = groupData.updatedAt;
              
              groupsData.push({
                id: groupDoc.id,
                name: groupData.name,
                description: groupData.description,
                avatar: groupData.avatar,
                isPrivate: groupData.isPrivate,
                createdBy: groupData.createdBy,
                createdAt: createdAt,
                updatedAt: updatedAt,
                memberCount: groupData.memberCount || 1,
                maxMembers: groupData.maxMembers || 100
              });
            }
          }
          
          // Sort groups by last activity (most recent first)
          groupsData.sort((a, b) => {
            const timeA = a.updatedAt ? a.updatedAt.toMillis() : a.createdAt.toMillis();
            const timeB = b.updatedAt ? b.updatedAt.toMillis() : b.createdAt.toMillis();
            return timeB - timeA;
          });
          
          setGroups(groupsData);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching user groups:', error);
        setLoading(false);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load groups'
        });
      }
    };

    fetchUserGroups();
  }, [currentUser, toast]);

  // Fetch group messages when a group is selected
  useEffect(() => {
    if (!selectedGroup) {
      setMessages([]);
      return;
    }

    const fetchGroupMessages = async () => {
      try {
        const messagesRef = collection(db, 'groupMessages');
        const q = query(
          messagesRef,
          where('groupId', '==', selectedGroup.id),
          orderBy('createdAt', 'asc')
        );
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const messagesData: Message[] = [];
          
          for (const doc of snapshot.docs) {
            const messageData = doc.data();
            
            // Get sender info if not already included
            let senderName = messageData.senderName;
            let senderAvatar = messageData.senderAvatar;
            
            if (!senderName || !senderAvatar) {
              try {
                const { data: senderProfile } = await supabase
                  .from('profiles')
                  .select('name, avatar')
                  .eq('id', messageData.senderId)
                  .single();
                
                if (senderProfile) {
                  senderName = senderProfile.name;
                  senderAvatar = senderProfile.avatar;
                }
              } catch (error) {
                console.error('Error fetching sender profile:', error);
              }
            }
            
            messagesData.push({
              id: doc.id,
              content: messageData.content,
              senderId: messageData.senderId,
              senderName: senderName || 'Unknown User',
              senderAvatar: senderAvatar || null,
              createdAt: messageData.createdAt,
              groupId: messageData.groupId
            });
          }
          
          setMessages(messagesData);
          
          // Scroll to bottom after messages load
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching group messages:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load messages'
        });
      }
    };

    // Check if user is admin
    const checkAdminStatus = async () => {
      try {
        if (!currentUser) return;
        
        const membersRef = collection(db, 'groupMembers');
        const q = query(
          membersRef,
          where('groupId', '==', selectedGroup.id),
          where('userId', '==', currentUser.id),
          where('role', '==', 'admin')
        );
        
        const querySnapshot = await getDocs(q);
        setIsAdmin(!querySnapshot.empty);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    // Fetch group members
    const fetchGroupMembers = async () => {
      try {
        const membersRef = collection(db, 'groupMembers');
        const q = query(membersRef, where('groupId', '==', selectedGroup.id));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
          const membersData: Member[] = [];
          
          for (const doc of snapshot.docs) {
            const memberData = doc.data();
            
            // Get member profile info
            try {
              const { data: memberProfile } = await supabase
                .from('profiles')
                .select('name, username, avatar')
                .eq('id', memberData.userId)
                .single();
              
              membersData.push({
                id: doc.id,
                userId: memberData.userId,
                groupId: memberData.groupId,
                role: memberData.role,
                joinedAt: memberData.joinedAt,
                name: memberProfile?.name || 'Unknown User',
                username: memberProfile?.username || 'unknown',
                avatar: memberProfile?.avatar || null
              });
            } catch (error) {
              console.error('Error fetching member profile:', error);
              
              membersData.push({
                id: doc.id,
                userId: memberData.userId,
                groupId: memberData.groupId,
                role: memberData.role,
                joinedAt: memberData.joinedAt
              });
            }
          }
          
          // Sort members (admins first, then by join date)
          membersData.sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            
            const timeA = a.joinedAt ? a.joinedAt.toMillis() : 0;
            const timeB = b.joinedAt ? b.joinedAt.toMillis() : 0;
            return timeA - timeB;
          });
          
          setGroupMembers(membersData);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching group members:', error);
      }
    };

    fetchGroupMessages();
    checkAdminStatus();
    fetchGroupMembers();
  }, [selectedGroup, currentUser, toast]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !currentUser || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      // Add message to Firestore
      await addDoc(collection(db, 'groupMessages'), {
        content: newMessage.trim(),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        groupId: selectedGroup.id,
        createdAt: serverTimestamp()
      });
      
      // Update group's updatedAt timestamp
      const groupRef = doc(db, 'groups', selectedGroup.id);
      await updateDoc(groupRef, {
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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !currentUser || creatingGroup) return;
    
    try {
      setCreatingGroup(true);
      
      // Create new group in Firestore
      const groupRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        avatar: null, // You can add avatar upload functionality later
        isPrivate: newGroupIsPrivate,
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
      
      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupIsPrivate(true);
      setShowCreateGroup(false);
      
      // Select the newly created group
      const newGroupDoc = await getDoc(groupRef);
      if (newGroupDoc.exists()) {
        const groupData = newGroupDoc.data();
        setSelectedGroup({
          id: groupRef.id,
          name: groupData.name,
          description: groupData.description,
          avatar: groupData.avatar,
          isPrivate: groupData.isPrivate,
          createdBy: groupData.createdBy,
          createdAt: groupData.createdAt,
          updatedAt: groupData.updatedAt,
          memberCount: groupData.memberCount || 1,
          maxMembers: groupData.maxMembers || 100
        });
      }
      
      toast({
        title: 'Group created',
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
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup || !isAdmin) return;
    
    try {
      // Delete all group messages
      const messagesRef = collection(db, 'groupMessages');
      const messagesQuery = query(messagesRef, where('groupId', '==', selectedGroup.id));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const deleteMessagePromises = messagesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deleteMessagePromises);
      
      // Delete all group members
      const membersRef = collection(db, 'groupMembers');
      const membersQuery = query(membersRef, where('groupId', '==', selectedGroup.id));
      const membersSnapshot = await getDocs(membersQuery);
      
      const deleteMemberPromises = membersSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      await Promise.all(deleteMemberPromises);
      
      // Delete the group
      await deleteDoc(doc(db, 'groups', selectedGroup.id));
      
      setSelectedGroup(null);
      setShowDeleteConfirm(false);
      
      toast({
        title: 'Group deleted',
        description: 'The group has been deleted successfully'
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
    if (!selectedGroup || !currentUser) return;
    
    try {
      // Find the member document
      const membersRef = collection(db, 'groupMembers');
      const q = query(
        membersRef,
        where('groupId', '==', selectedGroup.id),
        where('userId', '==', currentUser.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Member not found');
      }
      
      // Check if user is the only admin
      if (isAdmin) {
        const adminQuery = query(
          membersRef,
          where('groupId', '==', selectedGroup.id),
          where('role', '==', 'admin')
        );
        
        const adminSnapshot = await getDocs(adminQuery);
        
        if (adminSnapshot.size === 1 && adminSnapshot.docs[0].data().userId === currentUser.id) {
          // User is the only admin, can't leave without appointing a new admin
          toast({
            variant: 'destructive',
            title: 'Cannot leave group',
            description: 'You are the only admin. Please appoint another admin or delete the group.'
          });
          setShowLeaveConfirm(false);
          return;
        }
      }
      
      // Delete the member document
      await deleteDoc(querySnapshot.docs[0].ref);
      
      // Update group member count
      const groupRef = doc(db, 'groups', selectedGroup.id);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists()) {
        const currentCount = groupDoc.data().memberCount || 1;
        await updateDoc(groupRef, {
          memberCount: Math.max(1, currentCount - 1)
        });
      }
      
      setSelectedGroup(null);
      setShowLeaveConfirm(false);
      
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

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Error formatting message time:', error);
      return '';
    }
  };

  const formatMessageDate = (timestamp: any) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      if (isToday(date)) {
        return 'Today';
      } else if (isYesterday(date)) {
        return 'Yesterday';
      } else {
        return format(date, 'MMMM d, yyyy');
      }
    } catch (error) {
      console.error('Error formatting message date:', error);
      return '';
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      if (!message.createdAt) return;
      
      let dateKey;
      try {
        const date = message.createdAt.toDate ? message.createdAt.toDate() : new Date(message.createdAt);
        dateKey = formatMessageDate(date);
      } catch (error) {
        console.error('Error grouping message by date:', error);
        dateKey = 'Unknown Date';
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-60px)] bg-background rounded-lg shadow-lg overflow-hidden">
        <div className="flex h-full">
          {/* Groups List */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedGroup ? 'hidden md:flex' : ''}`}>
            {/* Groups List Header */}
            <div className="p-3 border-b bg-muted/30 flex-shrink-0 flex items-center justify-between">
              <h2 className="font-pixelated text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Vortex Groups
              </h2>
              <Button
                onClick={() => setShowCreateGroup(true)}
                size="sm"
                className="h-8 w-8 p-0 bg-social-green hover:bg-social-light-green text-white"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Groups List */}
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
                          selectedGroup?.id === group.id 
                            ? 'bg-accent shadow-md' 
                            : ''
                        }`}
                      >
                        <Avatar className="h-10 w-10 border-2 border-background">
                          {group.avatar ? (
                            <AvatarImage src={group.avatar} />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
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
                          <p className="text-xs truncate text-muted-foreground font-pixelated">
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
                      onClick={() => setShowCreateGroup(true)}
                      variant="outline" 
                      className="font-pixelated text-xs"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Create Group Dialog */}
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-pixelated">Create New Group</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-pixelated">Group Name</label>
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name"
                      className="font-pixelated text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-pixelated">Description</label>
                    <Textarea
                      value={newGroupDescription}
                      onChange={(e) => setNewGroupDescription(e.target.value)}
                      placeholder="Enter group description"
                      className="font-pixelated text-xs"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={newGroupIsPrivate}
                      onChange={(e) => setNewGroupIsPrivate(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="isPrivate" className="text-sm font-pixelated">
                      Private Group
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateGroup(false)}
                      className="font-pixelated text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim() || creatingGroup}
                      className="font-pixelated text-xs bg-social-green hover:bg-social-light-green text-white"
                    >
                      {creatingGroup ? 'Creating...' : 'Create Group'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col h-full ${!selectedGroup ? 'hidden md:flex' : ''}`}>
            {selectedGroup ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedGroup(null)}
                      className="md:hidden h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Avatar className="h-8 w-8">
                      {selectedGroup.avatar ? (
                        <AvatarImage src={selectedGroup.avatar} />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                          {selectedGroup.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-medium text-sm font-pixelated">{selectedGroup.name}</h3>
                        {selectedGroup.isPrivate ? (
                          <Badge variant="outline" className="text-xs font-pixelated">
                            <Lock className="h-3 w-3 mr-1" />
                            Private
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs font-pixelated">
                            <Globe className="h-3 w-3 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-pixelated">
                        {selectedGroup.memberCount} {selectedGroup.memberCount === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowMembersDialog(true)}
                      className="h-8 w-8"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    {isAdmin ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowLeaveConfirm(true)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="font-pixelated text-sm font-medium mb-2">No messages yet</h3>
                        <p className="font-pixelated text-xs text-muted-foreground">
                          Be the first to send a message in this group!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {groupMessagesByDate().map(([date, dateMessages]) => (
                          <div key={date} className="space-y-2">
                            <div className="flex justify-center">
                              <Badge variant="outline" className="font-pixelated text-xs">
                                {date}
                              </Badge>
                            </div>
                            {dateMessages.map((message) => (
                              <div 
                                key={message.id}
                                className={`flex gap-2 ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                              >
                                {message.senderId !== currentUser?.id && (
                                  <Avatar className="h-8 w-8 mt-1">
                                    {message.senderAvatar ? (
                                      <AvatarImage src={message.senderAvatar} />
                                    ) : (
                                      <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                                        {message.senderName?.substring(0, 2).toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                )}
                                <div 
                                  className={`max-w-[70%] ${
                                    message.senderId === currentUser?.id 
                                      ? 'bg-social-green text-white' 
                                      : 'bg-muted'
                                  } p-3 rounded-lg`}
                                >
                                  {message.senderId !== currentUser?.id && (
                                    <p className="text-xs font-medium mb-1 font-pixelated">
                                      {message.senderName}
                                    </p>
                                  )}
                                  <p className="text-sm font-pixelated whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                  <p className="text-xs opacity-70 mt-1 text-right font-pixelated">
                                    {formatMessageTime(message.createdAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
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
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 font-pixelated text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-social-green hover:bg-social-light-green text-white"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Members Dialog */}
                <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-pixelated">Group Members</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {groupMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                {member.avatar ? (
                                  <AvatarImage src={member.avatar} />
                                ) : (
                                  <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                                    {member.name?.substring(0, 2).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium font-pixelated">{member.name}</p>
                                <p className="text-xs text-muted-foreground font-pixelated">@{member.username}</p>
                              </div>
                            </div>
                            <Badge variant={member.role === 'admin' ? 'default' : 'outline'} className="font-pixelated text-xs">
                              {member.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Delete Group Confirmation */}
                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-pixelated text-destructive">Delete Group</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="font-pixelated text-sm mb-4">
                        Are you sure you want to delete this group? This action cannot be undone and all messages will be permanently deleted.
                      </p>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="font-pixelated text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDeleteGroup}
                          className="font-pixelated text-xs"
                        >
                          Delete Group
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Leave Group Confirmation */}
                <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-pixelated">Leave Group</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="font-pixelated text-sm mb-4">
                        Are you sure you want to leave this group? You'll need to be invited back to rejoin.
                      </p>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowLeaveConfirm(false)}
                          className="font-pixelated text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleLeaveGroup}
                          className="font-pixelated text-xs"
                        >
                          Leave Group
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-social-green/10 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="h-10 w-10 text-social-green" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold mb-2 font-pixelated">Vortex Group Chat</h2>
                <p className="text-muted-foreground max-w-md mb-6 font-pixelated text-sm">
                  Create or select a group to start chatting with your friends in real-time.
                </p>
                <Button 
                  onClick={() => setShowCreateGroup(true)}
                  className="bg-social-green hover:bg-social-light-green text-white font-pixelated"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Group
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Vortex;