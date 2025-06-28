import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, User, ArrowLeft, UserX, Circle, Heart } from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isBlocked?: boolean;
  lastMessageTime?: string;
  lastMessageContent?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender?: {
    name: string;
    avatar: string;
  };
}

interface MessageGroup {
  date: string;
  messages: Message[];
}

export function Messages() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const friendsListRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('name, avatar')
        .eq('id', user.id)
        .single();

      if (userProfile) {
        setCurrentUser({
          id: user.id,
          name: userProfile.name || 'User',
          avatar: userProfile.avatar || ''
        });
      }

      const { data: friendsData, error } = await supabase
        .from('friends')
        .select('id, sender_id, receiver_id, status')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      if (error) throw error;
      
      const formattedFriends: Friend[] = [];
      
      if (friendsData) {
        for (const friend of friendsData) {
          const isSender = friend.sender_id === user.id;
          const friendId = isSender ? friend.receiver_id : friend.sender_id;
          
          const { data: friendProfile } = await supabase
            .from('profiles')
            .select('id, name, username, avatar')
            .eq('id', friendId)
            .single();
          
          if (friendProfile && friendProfile.id) {
            // Get last message and unread count for this friend
            const { data: lastMessage } = await supabase
              .from('messages')
              .select('content, created_at, sender_id, read')
              .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            // Get unread count (messages sent to current user that are unread)
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('sender_id', friendId)
              .eq('receiver_id', user.id)
              .eq('read', false);

            formattedFriends.push({
              id: friendProfile.id,
              name: friendProfile.name || 'User',
              username: friendProfile.username || 'guest',
              avatar: friendProfile.avatar || '',
              isBlocked: false,
              lastMessageTime: lastMessage?.created_at || friend.created_at,
              lastMessageContent: lastMessage?.content || '',
              unreadCount: unreadCount || 0
            });
          }
        }
      }

      // Sort friends by last activity (most recent first)
      formattedFriends.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || 0).getTime();
        const timeB = new Date(b.lastMessageTime || 0).getTime();
        return timeB - timeA;
      });

      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends for messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFriendsStillConnected = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: friendship } = await supabase
        .from('friends')
        .select('id')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .eq('status', 'accepted')
        .single();

      return !!friendship;
    } catch (error) {
      console.log('Friendship check - no longer friends:', error);
      return false;
    }
  };

  const groupMessagesByDate = (messages: Message[]): MessageGroup[] => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const messageDate = new Date(message.created_at);
      let dateKey: string;
      
      if (isToday(messageDate)) {
        dateKey = 'Today';
      } else if (isYesterday(messageDate)) {
        dateKey = 'Yesterday';
      } else {
        dateKey = format(messageDate, 'MMMM d, yyyy');
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages: messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }));
  };

  const fetchMessages = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check if still friends before loading messages
      const stillFriends = await checkIfFriendsStillConnected(friendId);
      console.log('Still friends check:', stillFriends, 'for friend:', friendId);
      
      if (!stillFriends) {
        console.log('No longer friends, marking as blocked');
        // Update friend status to blocked
        setFriends(prev => 
          prev.map(f => 
            f.id === friendId ? { ...f, isBlocked: true } : f
          )
        );
        
        // If this friend is currently selected, show blocked message
        if (selectedFriend?.id === friendId) {
          setSelectedFriend(prev => prev ? { ...prev, isBlocked: true } : null);
        }
        return;
      }

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          read,
          profiles!messages_sender_id_fkey(name, avatar)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order('created_at');
        
      if (error) throw error;

      const formattedMessages: Message[] = messagesData.map((message: any) => ({
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        content: message.content,
        created_at: message.created_at,
        read: message.read,
        sender: {
          name: message.profiles?.name || 'Unknown',
          avatar: message.profiles?.avatar || ''
        }
      }));

      setMessages(formattedMessages);
      setMessageGroups(groupMessagesByDate(formattedMessages));
      
      // Mark messages as read when opening conversation
      await markMessagesAsRead(friendId);
      
      // Only scroll to bottom when initially loading messages
      setShouldScrollToBottom(true);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark all unread messages from this friend as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', friendId)
        .eq('receiver_id', user.id)
        .eq('read', false);

      // Update friends list to remove unread count
      setFriends(prev => 
        prev.map(f => 
          f.id === friendId ? { ...f, unreadCount: 0 } : f
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !currentUser || sendingMessage) return;
    
    // Check if friend is blocked
    if (selectedFriend.isBlocked) {
      toast({
        variant: 'destructive',
        title: 'Cannot send message',
        description: 'You are no longer friends with this user',
      });
      return;
    }

    // Double-check friendship status before sending
    const stillFriends = await checkIfFriendsStillConnected(selectedFriend.id);
    if (!stillFriends) {
      console.log('Friendship ended, blocking chat');
      setSelectedFriend(prev => prev ? { ...prev, isBlocked: true } : null);
      setFriends(prev => 
        prev.map(f => 
          f.id === selectedFriend.id ? { ...f, isBlocked: true } : f
        )
      );
      toast({
        variant: 'destructive',
        title: 'Cannot send message',
        description: 'You are no longer friends with this user',
      });
      return;
    }
    
    try {
      setSendingMessage(true);
      
      const messageData = {
        sender_id: currentUser.id,
        receiver_id: selectedFriend.id,
        content: newMessage.trim(),
        read: false
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
        
      if (error) throw error;

      setNewMessage('');
      
      if (data) {
        const newMessageWithSender = {
          ...data,
          sender: {
            name: currentUser.name,
            avatar: currentUser.avatar
          }
        };
        
        setMessages(prevMessages => {
          const exists = prevMessages.some(msg => msg.id === data.id);
          if (exists) return prevMessages;
          const updatedMessages = [...prevMessages, newMessageWithSender];
          setMessageGroups(groupMessagesByDate(updatedMessages));
          return updatedMessages;
        });
        
        // Update friends list with new last message
        setFriends(prev => 
          prev.map(f => 
            f.id === selectedFriend.id 
              ? { 
                  ...f, 
                  lastMessageTime: data.created_at,
                  lastMessageContent: data.content
                } 
              : f
          ).sort((a, b) => {
            const timeA = new Date(a.lastMessageTime || 0).getTime();
            const timeB = new Date(b.lastMessageTime || 0).getTime();
            return timeB - timeA;
          })
        );
        
        // Only scroll to bottom when sending a new message
        setShouldScrollToBottom(true);
      }
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

  const scrollToBottom = () => {
    if (shouldScrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setShouldScrollToBottom(false);
    }
  };

  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const formatLastMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
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

  useEffect(() => {
    fetchFriends();
    
    const friendsInterval = setInterval(() => {
      fetchFriends();
    }, 30000);

    return () => clearInterval(friendsInterval);
  }, []);

  useEffect(() => {
    if (selectedFriend && currentUser) {
      fetchMessages(selectedFriend.id);
      
      const channel = supabase
        .channel(`messages-${selectedFriend.id}-${currentUser.id}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedFriend.id}),and(sender_id.eq.${selectedFriend.id},receiver_id.eq.${currentUser.id}))`
          }, 
          async (payload) => {
            console.log('Real-time message update:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as Message;
              
              if (newMessage.sender_id !== currentUser.id) {
                const { data } = await supabase
                  .from('profiles')
                  .select('name, avatar')
                  .eq('id', newMessage.sender_id)
                  .single();
                  
                if (data) {
                  setMessages(prevMessages => {
                    const exists = prevMessages.some(msg => msg.id === newMessage.id);
                    if (exists) return prevMessages;
                    
                    const messageWithSender = {
                      ...newMessage,
                      sender: {
                        name: data.name || 'Unknown',
                        avatar: data.avatar || ''
                      }
                    };
                    
                    const updated = [...prevMessages, messageWithSender];
                    setMessageGroups(groupMessagesByDate(updated));
                    
                    // Only scroll to bottom for new incoming messages
                    setShouldScrollToBottom(true);
                    return updated;
                  });
                  
                  // Auto-mark as read since conversation is open
                  await markMessagesAsRead(selectedFriend.id);
                }
              }
            } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              fetchMessages(selectedFriend.id);
            }
          }
        )
        .subscribe();

      // Listen for friend removals in real-time
      const friendsChannel = supabase
        .channel(`friends-status-${selectedFriend.id}-${currentUser.id}`)
        .on('postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'friends'
          },
          (payload) => {
            console.log('Friend deletion detected:', payload);
            // Check if this deletion affects current conversation
            const deletedFriend = payload.old;
            if ((deletedFriend.sender_id === currentUser.id && deletedFriend.receiver_id === selectedFriend.id) ||
                (deletedFriend.sender_id === selectedFriend.id && deletedFriend.receiver_id === currentUser.id)) {
              console.log('Current conversation affected by friend removal');
              // Mark friend as blocked immediately
              setSelectedFriend(prev => prev ? { ...prev, isBlocked: true } : null);
              setFriends(prev => 
                prev.map(f => 
                  f.id === selectedFriend.id ? { ...f, isBlocked: true } : f
                )
              );
            }
          }
        )
        .subscribe();

      const messageInterval = setInterval(() => {
        fetchMessages(selectedFriend.id);
      }, 10000);

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(friendsChannel);
        clearInterval(messageInterval);
      };
    }
  }, [selectedFriend, currentUser]);

  // Only scroll when shouldScrollToBottom is true
  useEffect(() => {
    if (shouldScrollToBottom) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messageGroups, shouldScrollToBottom]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-60px)] bg-background rounded-lg shadow-lg overflow-hidden">
        <div className="flex h-full">
          {/* Friends List */}
          <div className={`w-full md:w-80 border-r flex flex-col ${selectedFriend ? 'hidden md:flex' : ''}`}>
            {/* Friends List Header */}
            <div className="p-3 border-b bg-muted/30 flex-shrink-0">
              <h2 className="font-pixelated text-sm font-medium">Messages</h2>
            </div>

            {/* Friends List - Scrollable with smooth scrolling */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea ref={friendsListRef} className="h-full scroll-smooth">
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
                ) : friends.length > 0 ? (
                  <div className="p-2">
                    {friends.map(friend => (
                      <div
                        key={friend.id}
                        onClick={() => {
                          setSelectedFriend(friend);
                          fetchMessages(friend.id);
                        }}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-accent/50 relative ${
                          selectedFriend?.id === friend.id 
                            ? 'bg-accent shadow-md' 
                            : ''
                        } ${friend.isBlocked ? 'opacity-50' : ''} ${
                          friend.unreadCount && friend.unreadCount > 0 ? 'bg-social-green/5 border-l-4 border-social-green' : ''
                        }`}
                      >
                        <Avatar className="h-10 w-10 border-2 border-background flex-shrink-0">
                          {friend.avatar ? (
                            <AvatarImage src={friend.avatar} />
                          ) : (
                            <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                              {friend.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium truncate text-sm font-pixelated ${
                              friend.unreadCount && friend.unreadCount > 0 ? 'text-foreground' : 'text-foreground'
                            }`}>
                              {friend.name}
                            </p>
                            {friend.lastMessageTime && (
                              <span className="text-xs text-muted-foreground font-pixelated">
                                {formatLastMessageTime(friend.lastMessageTime)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate font-pixelated ${
                              friend.unreadCount && friend.unreadCount > 0 
                                ? 'text-foreground font-medium' 
                                : 'text-muted-foreground'
                            }`}>
                              {friend.isBlocked ? (
                                <span className="text-destructive">• No longer friends</span>
                              ) : friend.lastMessageContent ? (
                                truncateMessage(friend.lastMessageContent)
                              ) : (
                                `Start chatting with @${friend.username}`
                              )}
                            </p>
                            
                            {/* Show unread count badge or grey circle */}
                            <div className="ml-2 flex-shrink-0">
                              {friend.unreadCount && friend.unreadCount > 0 ? (
                                <Badge 
                                  variant="default" 
                                  className="h-5 w-5 p-0 text-xs flex items-center justify-center bg-social-green text-white animate-pulse"
                                >
                                  {friend.unreadCount > 9 ? '9+' : friend.unreadCount}
                                </Badge>
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-gray-300 opacity-60"></div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {friend.isBlocked && (
                          <UserX className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <User className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4 font-pixelated text-sm">No friends yet</p>
                    <Button variant="outline" asChild className="font-pixelated text-xs">
                      <a href="/friends">Find Friends</a>
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col h-full ${!selectedFriend ? 'hidden md:flex' : ''}`}>
            {selectedFriend ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-3 border-b bg-muted/30 flex-shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedFriend(null)}
                    className="md:hidden flex-shrink-0 h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    {selectedFriend.avatar ? (
                      <AvatarImage src={selectedFriend.avatar} />
                    ) : (
                      <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                        {selectedFriend.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm font-pixelated">{selectedFriend.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-pixelated">
                      @{selectedFriend.username}
                      {selectedFriend.isBlocked && (
                        <span className="ml-2 text-destructive font-pixelated">
                          • No longer friends
                        </span>
                      )}
                    </p>
                  </div>
                  {selectedFriend.isBlocked && (
                    <UserX className="h-4 w-4 text-destructive flex-shrink-0" />
                  )}
                </div>

                {/* Messages Area and Input - Fixed layout with proper spacing */}
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Messages Area - Takes remaining space with smooth scrolling */}
                  <div className="flex-1 overflow-hidden">
                    <ScrollArea 
                      ref={messagesContainerRef}
                      className="h-full scroll-smooth"
                    >
                      <div className="p-3 space-y-2">
                        {selectedFriend.isBlocked && (
                          <div className="text-center py-4">
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 max-w-md mx-auto">
                              <UserX className="h-6 w-6 text-destructive mx-auto mb-2" />
                              <p className="font-pixelated text-xs text-destructive font-medium">
                                You are no longer friends
                              </p>
                              <p className="font-pixelated text-xs text-muted-foreground mt-1">
                                You cannot send or receive messages from this user
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Show "Start chatting" message when no messages exist */}
                        {messageGroups.length === 0 && !selectedFriend.isBlocked && (
                          <div className="text-center py-8">
                            <div className="bg-muted/30 border border-muted rounded-lg p-6 max-w-md mx-auto">
                              <Heart className="h-8 w-8 text-social-green mx-auto mb-3" />
                              <p className="font-pixelated text-sm font-medium text-foreground mb-2">
                                Start your conversation
                              </p>
                              <p className="font-pixelated text-xs text-muted-foreground">
                                Say hello to {selectedFriend.name}! This is the beginning of your chat history.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {messageGroups.map((group, groupIndex) => (
                          <div key={groupIndex} className="space-y-2">
                            {/* Date Separator */}
                            <div className="flex items-center justify-center py-1">
                              <div className="bg-muted px-2 py-1 rounded-full">
                                <p className="font-pixelated text-xs text-muted-foreground">
                                  {getDateSeparatorText(group.date)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Messages for this date */}
                            {group.messages.map((message) => (
                              <div 
                                key={message.id}
                                className={`flex gap-2 ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`flex gap-2 max-w-[75%] ${message.sender_id === currentUser?.id ? 'flex-row-reverse' : ''}`}>
                                  <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                                    {message.sender?.avatar ? (
                                      <AvatarImage src={message.sender.avatar} />
                                    ) : (
                                      <AvatarFallback className="bg-primary text-primary-foreground font-pixelated text-xs">
                                        {message.sender?.name.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div 
                                    className={`p-2 rounded-lg relative ${
                                      message.sender_id === currentUser?.id 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted'
                                    }`}
                                  >
                                    <p className="text-xs whitespace-pre-wrap break-words font-pixelated">
                                      {message.content}
                                    </p>
                                    <div className="flex items-center justify-between mt-1">
                                      <p className="text-xs opacity-70 font-pixelated">
                                        {formatMessageTime(message.created_at)}
                                      </p>
                                      {/* Read Status for sent messages */}
                                      {message.sender_id === currentUser?.id && (
                                        <div className="ml-2">
                                          {message.read ? (
                                            <div className="flex">
                                              <Circle className="h-2 w-2 fill-social-green text-social-green" />
                                              <Circle className="h-2 w-2 fill-social-green text-social-green -ml-1" />
                                            </div>
                                          ) : (
                                            <Circle className="h-2 w-2 fill-muted-foreground text-muted-foreground" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                        <div ref={messagesEndRef} className="h-1" />
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Message Input - Fixed at bottom with better spacing */}
                  <div className="border-t bg-background flex-shrink-0 pb-safe">
                    {selectedFriend.isBlocked ? (
                      <div className="text-center py-4">
                        <p className="font-pixelated text-xs text-muted-foreground">
                          You cannot send messages to this user
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-2">
                        <div className="flex gap-2 items-end">
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
                            disabled={sendingMessage || selectedFriend.isBlocked}
                          />
                          <Button
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || sendingMessage || selectedFriend.isBlocked}
                            className="bg-primary hover:bg-primary/90 flex-shrink-0 h-[52px] w-12"
                          >
                            {sendingMessage ? (
                              <LoadingIndicator size="sm" color="default" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground font-pixelated">
                          Press Enter to send, Shift + Enter for new line
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2 font-pixelated">Your Messages</h2>
                <p className="text-muted-foreground font-pixelated text-sm">
                  Select a conversation to start messaging
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Messages;