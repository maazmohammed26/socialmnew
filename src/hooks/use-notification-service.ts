import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/use-notifications';

export function useNotificationService() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { createNotification } = useNotifications();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    };

    getCurrentUser();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    if (!currentUser) return;

    // Listen for likes on user's posts
    const likesChannel = supabase
      .channel('likes-notifications')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'likes'
        },
        async (payload) => {
          try {
            // Get post details to check if it belongs to current user
            const { data: post } = await supabase
              .from('posts')
              .select('user_id, content')
              .eq('id', payload.new.post_id)
              .single();

            if (post && post.user_id === currentUser.id && payload.new.user_id !== currentUser.id) {
              const { data: likerProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.user_id)
                .single();

              if (likerProfile) {
                await createNotification(
                  'like',
                  `${likerProfile.name} liked your post`,
                  payload.new.post_id
                );
              }
            }
          } catch (error) {
            console.error('Error sending like notification:', error);
          }
        }
      )
      .subscribe();

    // Listen for comments on user's posts
    const commentsChannel = supabase
      .channel('comments-notifications')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        async (payload) => {
          try {
            // Get post details to check if it belongs to current user
            const { data: post } = await supabase
              .from('posts')
              .select('user_id, content')
              .eq('id', payload.new.post_id)
              .single();

            if (post && post.user_id === currentUser.id && payload.new.user_id !== currentUser.id) {
              const { data: commenterProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.user_id)
                .single();

              if (commenterProfile) {
                await createNotification(
                  'comment',
                  `${commenterProfile.name} commented on your post`,
                  payload.new.post_id
                );
              }
            }
          } catch (error) {
            console.error('Error sending comment notification:', error);
          }
        }
      )
      .subscribe();

    // Listen for friend requests
    const friendRequestsChannel = supabase
      .channel('friend-requests-notifications')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friends'
        },
        async (payload) => {
          try {
            if (payload.new.receiver_id === currentUser.id && payload.new.status === 'pending') {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.sender_id)
                .single();

              if (senderProfile) {
                await createNotification(
                  'friend_request',
                  `${senderProfile.name} sent you a friend request`,
                  payload.new.id
                );
              }
            }
          } catch (error) {
            console.error('Error sending friend request notification:', error);
          }
        }
      )
      .subscribe();

    // Listen for friend request acceptances
    const friendAcceptChannel = supabase
      .channel('friend-accept-notifications')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friends',
          filter: `status=eq.accepted`
        },
        async (payload) => {
          try {
            if (payload.new.sender_id === currentUser.id && payload.old.status === 'pending') {
              const { data: receiverProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', payload.new.receiver_id)
                .single();

              if (receiverProfile) {
                await createNotification(
                  'friend_accepted',
                  `${receiverProfile.name} accepted your friend request`,
                  payload.new.id
                );
              }
            }
          } catch (error) {
            console.error('Error sending friend acceptance notification:', error);
          }
        }
      )
      .subscribe();

    // Listen for new messages
    const messagesChannel = supabase
      .channel('messages-notifications')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        async (payload) => {
          try {
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single();

            if (senderProfile) {
              await createNotification(
                'message',
                `${senderProfile.name} sent you a message`,
                payload.new.sender_id
              );
            }
          } catch (error) {
            console.error('Error sending message notification:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(friendRequestsChannel);
      supabase.removeChannel(friendAcceptChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [currentUser, createNotification]);

  // Function to manually create a test notification
  const createTestNotification = useCallback(async (type: string, content: string) => {
    if (!currentUser) return null;
    return await createNotification(type, content);
  }, [currentUser, createNotification]);

  return {
    createTestNotification
  };
}