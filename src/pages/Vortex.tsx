import React, { useState, useEffect, useCallback } from 'react';
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
  User
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

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender_name: string;
  sender_username: string;
  sender_avatar: string | null;
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
    is_private: true,
    avatar: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

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
            
          setCurrentUser({ ...user, ...profile });
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real groups from database if the table exists
      try {
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .order('updated_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          setGroups(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('Groups table may not exist yet:', err);
      }
      
      // If no real data, don't show any groups
      setGroups([]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load groups'
      });
      setGroups([]);
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      // Try to fetch real group members from database if the table exists
      try {
        const { data, error } = await supabase
          .rpc('get_group_members_with_profiles', { group_uuid: groupId });
        
        if (!error && data && data.length > 0) {
          setGroupMembers(data);
          return;
        }
      } catch (err) {
        console.log('Group members function may not exist yet:', err);
      }
      
      // If no real data, set empty array
      setGroupMembers([]);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load group members'
      });
      setGroupMembers([]);
    }
  };

  const fetchGroupMessages = async (groupId: string) => {
    try {
      // Try to fetch real group messages from database if the table exists
      try {
        const { data, error } = await supabase
          .rpc('get_group_messages_with_profiles', { 
            group_uuid: groupId,
            limit_count: 50,
            offset_count: 0
          });
        
        if (!error && data) {
          setMessages(data);
          return;
        }
      } catch (err) {
        console.log('Group messages function may not exist yet:', err);
      }
      
      // If no real data, set empty array
      setMessages([]);
    } catch (error) {
      console.error('Error fetching group messages:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load messages'
      });
      setMessages([]);
    }
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    fetchGroupMembers(group.id);
    fetchGroupMessages(group.id);
  };

  const handleCreateGroup = async () => {
    try {
      if (!newGroupData.name.trim()) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Group name is required'
        });
        return;
      }
      
      // Try to create a real group if the function exists
      try {
        const { data, error } = await supabase
          .rpc('create_group_with_admin', {
            p_name: newGroupData.name.trim(),
            p_description: newGroupData.description.trim(),
            p_avatar: newGroupData.avatar,
            p_is_private: newGroupData.is_private,
            p_creator_id: currentUser.id
          });
        
        if (!error && data) {
          toast({
            title: 'Group created',
            description: 'Your group has been created successfully!'
          });
          
          fetchGroups();
          setShowCreateDialog(false);
          setNewGroupData({
            name: '',
            description: '',
            is_private: true,
            avatar: ''
          });
          return;
        }
      } catch (err) {
        console.log('Group creation function may not exist yet:', err);
      }
      
      // If function doesn't exist, show coming soon message
      toast({
        title: 'Coming Soon',
        description: 'Group creation will be available in the next update!'
      });
      
      setShowCreateDialog(false);
      setNewGroupData({
        name: '',
        description: '',
        is_private: true,
        avatar: ''
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup || !currentUser) return;
    
    try {
      // Try to send a real message if the table exists
      try {
        const { data, error } = await supabase
          .from('group_messages')
          .insert({
            group_id: selectedGroup.id,
            sender_id: currentUser.id,
            content: newMessage.trim(),
            message_type: 'text'
          })
          .select();
        
        if (!error && data) {
          // Message sent successfully
          setNewMessage('');
          fetchGroupMessages(selectedGroup.id);
          return;
        }
      } catch (err) {
        console.log('Group messages table may not exist yet:', err);
      }
      
      // If table doesn't exist, show coming soon message
      toast({
        title: 'Coming Soon',
        description: 'Messaging will be available in the next update!'
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
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

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Set up real-time subscriptions for groups and messages
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to group changes
    const groupsChannel = supabase
      .channel('groups-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'groups' }, 
        () => {
          fetchGroups();
        }
      )
      .subscribe();

    // Subscribe to group messages if a group is selected
    let messagesChannel: any;
    if (selectedGroup) {
      messagesChannel = supabase
        .channel(`group-messages-${selectedGroup.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'group_messages',
            filter: `group_id=eq.${selectedGroup.id}`
          }, 
          () => {
            fetchGroupMessages(selectedGroup.id);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(groupsChannel);
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
      }
    };
  }, [currentUser, selectedGroup]);

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
                            {group.is_private && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs truncate font-pixelated text-muted-foreground">
                              {group.last_message ? (
                                group.last_message.substring(0, 20) + (group.last_message.length > 20 ? '...' : '')
                              ) : (
                                `${group.member_count} members`
                              )}
                            </p>
                            
                            {group.last_message_time && (
                              <span className="text-xs text-muted-foreground font-pixelated">
                                {formatTime(group.last_message_time)}
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
                      {selectedGroup.is_private ? (
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
                      {selectedGroup.member_count} members
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="font-pixelated text-xs cursor-pointer">
                        <Users className="h-4 w-4 mr-2" />
                        View Members
                      </DropdownMenuItem>
                      <DropdownMenuItem className="font-pixelated text-xs cursor-pointer">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite People
                      </DropdownMenuItem>
                      <DropdownMenuItem className="font-pixelated text-xs cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Group Settings
                      </DropdownMenuItem>
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
                    <div className="flex-1 overflow-y-auto p-3" id="group-messages-container">
                      {messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages.map((message, index) => {
                            const isCurrentUser = message.sender_id === currentUser?.id;
                            const showDate = index === 0 || 
                              formatDate(messages[index-1].created_at) !== formatDate(message.created_at);
                            
                            return (
                              <React.Fragment key={message.id}>
                                {showDate && (
                                  <div className="flex justify-center my-2">
                                    <Badge variant="outline" className="font-pixelated text-xs">
                                      {formatDate(message.created_at)}
                                    </Badge>
                                  </div>
                                )}
                                <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`flex gap-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                    <Avatar className="h-8 w-8 mt-1">
                                      {message.sender_avatar ? (
                                        <AvatarImage src={message.sender_avatar} />
                                      ) : (
                                        <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                                          {message.sender_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      )}
                                    </Avatar>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-pixelated font-medium">
                                          {isCurrentUser ? 'You' : message.sender_name}
                                        </p>
                                        <span className="text-xs text-muted-foreground font-pixelated">
                                          {formatTime(message.created_at)}
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
                              </React.Fragment>
                            );
                          })}
                        </div>
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
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className="bg-social-green hover:bg-social-light-green text-white flex-shrink-0 h-[60px] w-12"
                        >
                          <Send className="h-4 w-4" />
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
                        <Button size="sm" className="h-8 font-pixelated text-xs">
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
                                  {member.name} {member.user_id === currentUser?.id && '(You)'}
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
                      >
                        Browse Groups
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg max-w-md">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-pixelated text-sm font-medium mb-1">Coming Soon</h3>
                      <p className="font-pixelated text-xs text-muted-foreground">
                        Vortex Groups is a new feature currently in development. Stay tuned for updates as we roll out more functionality!
                      </p>
                    </div>
                  </div>
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
              <Input
                placeholder="Enter group name"
                value={newGroupData.name}
                onChange={(e) => setNewGroupData({...newGroupData, name: e.target.value})}
                className="font-pixelated text-xs"
              />
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
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              className="font-pixelated text-xs"
            >
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

export default Vortex;