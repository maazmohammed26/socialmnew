import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Eye, ChevronLeft, ChevronRight, Save, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCachedImage, cacheImage } from '@/lib/cache-utils';

interface Story {
  id: string;
  user_id: string;
  image_url: string | null;
  photo_urls: string[] | null;
  photo_metadata: any[] | null;
  created_at: string;
  expires_at: string;
  views_count: number;
  profiles: {
    name: string;
    username: string;
    avatar: string | null;
  };
}

interface StoryViewerProps {
  story: Story;
  onClose: () => void;
  currentUserId: string;
  onStoryUpdated: () => void;
}

export function StoryViewer({ story, onClose, currentUserId, onStoryUpdated }: StoryViewerProps) {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const photos = story.photo_urls && story.photo_urls.length > 0 
    ? story.photo_urls 
    : story.image_url 
    ? [story.image_url] 
    : [];

  const totalPhotos = photos.length;
  const isOwnStory = story.user_id === currentUserId;

  // Load image with caching
  useEffect(() => {
    if (!photos[currentPhotoIndex]) return;
    
    const loadImage = async () => {
      setLoading(true);
      try {
        // Try to get from cache first
        const cachedImage = await getCachedImage(photos[currentPhotoIndex]);
        
        if (cachedImage) {
          // Create object URL from cached blob
          setImageSrc(URL.createObjectURL(cachedImage));
          setLoading(false);
          return;
        }
        
        // If not in cache, fetch and cache
        const response = await fetch(photos[currentPhotoIndex]);
        const blob = await response.blob();
        await cacheImage(photos[currentPhotoIndex], blob);
        
        setImageSrc(URL.createObjectURL(blob));
      } catch (error) {
        console.error('Error loading story image:', error);
        // Use original source as fallback
        setImageSrc(photos[currentPhotoIndex]);
      } finally {
        setLoading(false);
      }
    };
    
    loadImage();
    
    // Clean up object URL on unmount or when changing photos
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [currentPhotoIndex, photos]);

  // Preload next image
  useEffect(() => {
    if (currentPhotoIndex < totalPhotos - 1) {
      const nextImageUrl = photos[currentPhotoIndex + 1];
      if (nextImageUrl) {
        const preloadImage = async () => {
          try {
            // Check if already cached
            const cachedImage = await getCachedImage(nextImageUrl);
            if (!cachedImage) {
              // If not cached, fetch and cache
              const response = await fetch(nextImageUrl);
              const blob = await response.blob();
              await cacheImage(nextImageUrl, blob);
            }
          } catch (error) {
            console.error('Error preloading next image:', error);
          }
        };
        
        preloadImage();
      }
    }
  }, [currentPhotoIndex, photos, totalPhotos]);

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + (100 / 120);
          if (newProgress >= 100) {
            if (currentPhotoIndex < totalPhotos - 1) {
              setCurrentPhotoIndex(prev => prev + 1);
              setProgress(0);
              setTimeLeft(12);
              return 0;
            } else {
              onClose();
              return 100;
            }
          }
          return newProgress;
        });

        setTimeLeft((prev) => {
          const newTime = prev - 0.1;
          if (newTime <= 0) {
            return 12;
          }
          return newTime;
        });
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, onClose, currentPhotoIndex, totalPhotos]);

  const timeAgo = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const goToPreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
      setProgress(0);
      setTimeLeft(12);
    }
  };

  const goToNextPhoto = () => {
    if (currentPhotoIndex < totalPhotos - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
      setProgress(0);
      setTimeLeft(12);
    } else {
      onClose();
    }
  };

  const handleLongPressStart = () => {
    longPressRef.current = setTimeout(() => {
      setIsPaused(true);
    }, 200);
  };

  const handleLongPressEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
    }
    setIsPaused(false);
  };

  const handleDownload = async () => {
    try {
      if (!imageSrc) return;
      
      const link = document.createElement('a');
      link.href = imageSrc;
      link.download = `story-${currentPhotoIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Image saved',
        description: 'The image has been saved to your device',
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save image'
      });
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto p-0 bg-black border-none overflow-hidden">
        <div className="relative w-full h-[600px] flex flex-col">
          {/* Progress Bars */}
          <div className="absolute top-2 left-2 right-2 z-10 flex gap-1">
            {photos.map((_, index) => (
              <div key={index} className="flex-1 h-1 bg-white/30 rounded-full">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-100 ease-linear"
                  style={{ 
                    width: index < currentPhotoIndex ? '100%' : 
                           index === currentPhotoIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-2 right-2 z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-white">
                {story.profiles.avatar ? (
                  <AvatarImage src={story.profiles.avatar} alt={story.profiles.name} />
                ) : (
                  <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                    {story.profiles.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="text-white font-pixelated text-xs">
                  {story.profiles.name}
                </p>
                <p className="text-white/70 font-pixelated text-xs">
                  {timeAgo(story.created_at)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isOwnStory && (
                <Button
                  onClick={handleDownload}
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-6 w-6"
                >
                  <Download className="h-3 w-3" />
                </Button>
              )}
              <Button
                onClick={onClose}
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 h-6 w-6"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Navigation Areas */}
          <div className="absolute inset-0 flex">
            <div 
              className="flex-1 cursor-pointer z-10"
              onClick={goToPreviousPhoto}
              style={{ display: currentPhotoIndex > 0 ? 'block' : 'none' }}
            />
            <div 
              className="flex-1 cursor-pointer z-10"
              onClick={goToNextPhoto}
            />
          </div>

          {/* Story Image with Long Press */}
          <div 
            className="flex-1 flex items-center justify-center"
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-t-white border-white/30 rounded-full animate-spin"></div>
                <p className="text-white mt-4 font-pixelated text-xs">Loading...</p>
              </div>
            ) : imageSrc ? (
              <img
                src={imageSrc}
                alt="Story"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="flex items-center justify-center">
                <p className="text-white font-pixelated text-xs">Image not available</p>
              </div>
            )}
            
            {isPaused && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="text-white font-pixelated text-sm bg-black/50 px-3 py-1 rounded-full">
                  Paused
                </div>
              </div>
            )}
          </div>

          {/* Photo Counter */}
          {totalPhotos > 1 && (
            <div className="absolute bottom-12 left-2 right-2 z-10">
              <div className="flex items-center justify-center">
                <span className="text-white/80 font-pixelated text-xs bg-black/30 px-2 py-1 rounded-full">
                  {currentPhotoIndex + 1} / {totalPhotos}
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          {isOwnStory && (
            <div className="absolute bottom-2 left-2 right-2 z-10">
              <div className="flex items-center justify-center gap-1 text-white/80">
                <Eye className="h-3 w-3" />
                <span className="font-pixelated text-xs">
                  {story.views_count} {story.views_count === 1 ? 'view' : 'views'}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}