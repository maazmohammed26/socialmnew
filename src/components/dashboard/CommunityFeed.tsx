import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Send, MoreVertical, Edit, Trash2, ArrowUp, ChevronDown, ChevronUp, Save, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImageViewer } from '@/components/ui/image-viewer';
import { UserProfileDialog } from '@/components/user/UserProfileDialog';
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
import { useLocation } from 'react-router-dom';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: {
    name: string;
    username: string;
    avatar: string | null;
  };
  likes: { id: string; user_id: string }[];
  comments: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles: {
      name: string;
      avatar: string | null;
    };
  }[];
  _count?: {
    likes: number;
    comments: number;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    name: string;
    avatar: string | null;
  };
}

// Memoized post component for better performance
const PostCard = memo(({ post, currentUser, onLike, onComment, onEdit, onDelete, onUserClick }: {
  post: Post;
  currentUser: any;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onEdit: (postId: string, content: string) => void;
  onDelete: (postId: string) => void;
  onUserClick: (userId: string, username: string) => void;
}) => {
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [submittingComments, setSubmittingComments] = useState<{ [key: string]: boolean }>({});
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [showCommentBox, setShowCommentBox] = useState<{ [key: string]: boolean }>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isLiked = useMemo(() => post.likes.some(like => like.user_id === currentUser?.id), [post.likes, currentUser?.id]);
  const isOwner = useMemo(() => post.user_id === currentUser?.id, [post.user_id, currentUser?.id]);
  const hasComments = useMemo(() => post.comments && post.comments.length > 0, [post.comments]);
  const isEdited = useMemo(() => post.updated_at !== post.created_at, [post.updated_at, post.created_at]);

  const toggleComments = useCallback((postId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  const toggleCommentBox = useCallback((postId: string) => {
    setShowCommentBox(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
    
    if (!showCommentBox[postId]) {
      setExpandedComments(prev => ({
        ...prev,
        [postId]: true
      }));
    }
  }, [showCommentBox]);

  const handleEditPost = useCallback(async (postId: string) => {
    if (!editContent.trim()) return;
    onEdit(postId, editContent.trim());
    setEditingPost(null);
    setEditContent('');
  }, [editContent, onEdit]);

  return (
    <Card key={post.id} className="card-gradient animate-fade-in shadow-lg hover:shadow-xl transition-all duration-200 card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              className="h-10 w-10 border-2 border-social-green/20 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onUserClick(post.user_id, post.profiles?.username)}
            >
              {post.profiles?.avatar ? (
                <AvatarImage src={post.profiles.avatar} alt={post.profiles.name} />
              ) : (
                <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                  {post.profiles?.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p 
                className="font-pixelated text-xs font-medium cursor-pointer hover:text-social-green transition-colors"
                onClick={() => onUserClick(post.user_id, post.profiles?.username)}
              >
                {post.profiles?.name}
              </p>
              <div className="flex items-center gap-2">
                <p 
                  className="font-pixelated text-xs text-muted-foreground cursor-pointer hover:text-social-green transition-colors"
                  onClick={() => onUserClick(post.user_id, post.profiles?.username)}
                >
                  @{post.profiles?.username} • {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
                {isEdited && (
                  <span className="font-pixelated text-xs text-muted-foreground">
                    (edited)
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingPost(post.id);
                    setEditContent(post.content);
                  }}
                  className="font-pixelated text-xs"
                >
                  <Edit className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(post.id)}
                  className="font-pixelated text-xs text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {editingPost === post.id ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="font-pixelated text-xs"
              placeholder="Edit your post..."
            />
            <div className="flex gap-2">
              <Button
                onClick={() => handleEditPost(post.id)}
                size="sm"
                className="bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditingPost(null);
                  setEditContent('');
                }}
                size="sm"
                variant="outline"
                className="font-pixelated text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-pixelated text-xs mb-4 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>
            
            {post.image_url && (
              <div className="mb-4">
                <img
                  src={post.image_url}
                  alt="Post image"
                  className="w-full max-h-96 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(post.image_url)}
                  loading="lazy"
                />
              </div>
            )}
            
            <div className="flex items-center gap-4 pt-3 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLike(post.id)}
                className={`font-pixelated text-xs hover:bg-social-magenta/10 transition-all duration-200 btn-hover-lift ${
                  isLiked ? 'text-social-magenta' : 'text-muted-foreground'
                }`}
              >
                <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                {post._count?.likes || 0}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCommentBox(post.id)}
                className="font-pixelated text-xs text-muted-foreground hover:bg-social-blue/10 transition-all duration-200 btn-hover-lift"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                {post._count?.comments || 0}
              </Button>

              {hasComments && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleComments(post.id)}
                  className="font-pixelated text-xs text-muted-foreground hover:bg-social-purple/10 transition-all duration-200 btn-hover-lift"
                >
                  {expandedComments[post.id] ? 
                    <ChevronUp className="h-4 w-4 mr-1" /> : 
                    <ChevronDown className="h-4 w-4 mr-1" />
                  }
                  {expandedComments[post.id] ? 'Hide' : 'Show'} Comments
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
      
      {selectedImage && (
        <ImageViewer
          src={selectedImage}
          alt="Post image"
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </Card>
  );
});

export function CommunityFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [likingPosts, setLikingPosts] = useState<{ [key: string]: boolean }>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { toast } = useToast();

  const isHomePage = location.pathname === '/dashboard';

  // Memoize expensive operations
  const memoizedPosts = useMemo(() => posts, [posts]);

  const handleUserClick = async (userId: string, username: string) => {
    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, created_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (userProfile) {
        setSelectedUser(userProfile);
        setShowUserDialog(true);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load user profile'
      });
    }
  };

  // Optimized background fetch with caching
  const fetchPostsInBackground = useCallback(async () => {
    try {
      // Check cache first
      const cacheKey = 'community_feed_cache';
      const cachedData = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (cachedData && cacheTime) {
        const now = Date.now();
        const age = now - parseInt(cacheTime);
        if (age < 2 * 60 * 1000) { // 2 minutes cache
          const cached = JSON.parse(cachedData);
          setPosts(cached);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          created_at,
          updated_at,
          user_id,
          profiles:user_id (
            name,
            username,
            avatar
          )
        `)
        .order('created_at', { ascending: false })
        .limit(15); // Reduce initial load

      if (error) throw error;

      await fetchLikesAndComments(data || []);
      
      // Cache the results
      if (data && data.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      }
    } catch (error) {
      console.error('Background fetch error:', error);
    }
  }, []);

  // Separate function to fetch likes and comments
  const fetchLikesAndComments = async (postsData: any[]) => {
    try {
      const postIds = postsData.map(post => post.id);
      
      if (postIds.length === 0) {
        setPosts([]);
        return;
      }

      const [likesData, commentsData] = await Promise.all([
        supabase
          .from('likes')
          .select('id, user_id, post_id')
          .in('post_id', postIds),
        supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            user_id,
            post_id,
            profiles:user_id (
              name,
              avatar
            )
          `)
          .in('post_id', postIds)
          .order('created_at', { ascending: true })
      ]);

      const formattedPosts = postsData.map(post => {
        const postLikes = likesData.data?.filter(like => like.post_id === post.id) || [];
        const postComments = commentsData.data?.filter(comment => comment.post_id === post.id) || [];

        return {
          ...post,
          likes: postLikes,
          comments: postComments,
          _count: {
            likes: postLikes.length,
            comments: postComments.length
          }
        };
      });

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching likes and comments:', error);
      // Set posts without likes/comments if there's an error
      setPosts(postsData.map(post => ({
        ...post,
        likes: [],
        comments: [],
        _count: { likes: 0, comments: 0 }
      })));
    }
  };

  // Initial fetch with loading state
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      await fetchPostsInBackground();
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load posts'
      });
    } finally {
      setLoading(false);
    }
  }, [fetchPostsInBackground, toast]);

  const getCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  }, []);

  const handleLike = async (postId: string) => {
    if (!currentUser || likingPosts[postId]) return;

    try {
      setLikingPosts(prev => ({ ...prev, [postId]: true }));

      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const existingLike = post.likes.find(like => like.user_id === currentUser.id);

      // Optimistic update first
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? {
                ...p,
                likes: existingLike 
                  ? p.likes.filter(like => like.user_id !== currentUser.id)
                  : [...p.likes, { id: 'temp', user_id: currentUser.id }],
                _count: {
                  ...p._count,
                  likes: existingLike 
                    ? (p._count?.likes || 0) - 1
                    : (p._count?.likes || 0) + 1
                }
              }
            : p
        )
      );

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) throw error;

      } else {
        // Like
        const { data, error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id
          })
          .select()
          .single();

        if (error) throw error;

        // Update with real data
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId
              ? {
                  ...p,
                  likes: p.likes.map(like => 
                    like.id === 'temp' ? { id: data.id, user_id: currentUser.id } : like
                  )
                }
              : p
          )
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? {
                ...p,
                likes: post?.likes || [],
                _count: {
                  ...p._count,
                  likes: post?._count?.likes || 0
                }
              }
            : p
        )
      );
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update like'
      });
    } finally {
      setLikingPosts(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleComment = useCallback(async (postId: string) => {
    // Comment functionality moved to PostCard component
  }, []);

  const handleEditPost = useCallback(async (postId: string, content: string) => {
    if (!content.trim()) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ 
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) throw error;

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, content: content.trim(), updated_at: new Date().toISOString() }
            : post
        )
      );

      toast({
        title: 'Post updated',
        description: 'Your post has been updated successfully'
      });
    } catch (error) {
      console.error('Error updating post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update post'
      });
    }
  }, []);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      setDeletePostId(null);

      toast({
        title: 'Post deleted',
        description: 'Your post has been deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete post'
      });
    }
  }, []);

  const handleDeleteComment = async (commentId: string, postId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      // Update posts to remove the deleted comment
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.filter(comment => comment.id !== commentId),
                _count: {
                  ...post._count,
                  likes: post._count?.likes || 0,
                  comments: Math.max(0, (post._count?.comments || 0) - 1)
                }
              }
            : post
        )
      );

      setDeleteCommentId(null);

      toast({
        title: 'Comment deleted',
        description: 'The comment has been deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete comment'
      });
    }
  };

  const scrollToTop = () => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScroll = useCallback(() => {
    if (feedRef.current) {
      const { scrollTop } = feedRef.current;
      setShowScrollTop(scrollTop > 300);
    }
  }, []);

  useEffect(() => {
    getCurrentUser();
    fetchPosts();

    // Set up real-time subscriptions with debouncing
    let debounceTimer: NodeJS.Timeout;
    
    const postsChannel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'posts' }, 
        (payload) => {
          console.log('Post change detected:', payload);
          // Debounce real-time updates
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchPostsInBackground();
          }, 1000);
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('likes-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'likes' }, 
        (payload) => {
          console.log('Like change detected:', payload);
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchPostsInBackground();
          }, 1000);
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('comments-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'comments' }, 
        (payload) => {
          console.log('Comment change detected:', payload);
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchPostsInBackground();
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [getCurrentUser, fetchPosts, fetchPostsInBackground]);

  useEffect(() => {
    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll);
      return () => feedElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full bg-muted rounded mb-2" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div ref={feedRef} className="space-y-4 relative scroll-container scroll-smooth">
      {/* Scroll to Top Button - Only show on home page */}
      {isHomePage && showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-20 right-4 z-50 h-10 w-10 rounded-full bg-social-green hover:bg-social-light-green text-white shadow-lg btn-hover-lift transition-all duration-200 pixel-border pixel-shadow"
          style={{ 
            fontSize: '8px',
            fontFamily: 'Press Start 2P, cursive'
          }}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      )}

      {posts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-pixelated text-sm font-medium mb-2">No posts yet</h3>
            <p className="font-pixelated text-xs text-muted-foreground">
              Be the first to share something with the community!
            </p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => {
          return (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onLike={handleLike}
              onComment={handleComment}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onUserClick={handleUserClick}
            />
          );
        })
      )}

      {/* User Profile Dialog */}
      <UserProfileDialog
        open={showUserDialog}
        onOpenChange={setShowUserDialog}
        user={selectedUser}
      />

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePostId && handleDeletePost(deletePostId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Comment Confirmation Dialog */}
      <AlertDialog open={!!deleteCommentId} onOpenChange={() => setDeleteCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Delete Comment</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated text-xs">
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteCommentId) {
                  const post = memoizedPosts.find(p => p.comments.some(c => c.id === deleteCommentId));
                  if (post) {
                    handleDeleteComment(deleteCommentId, post.id);
                  }
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated text-xs"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}