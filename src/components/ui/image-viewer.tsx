import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { getCachedImage, cacheImage } from '@/lib/cache-utils';

interface ImageViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ src, alt, isOpen, onClose }: ImageViewerProps) {
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string>(src);
  
  useEffect(() => {
    if (!isOpen) return;
    
    const loadImage = async () => {
      setLoading(true);
      try {
        // Try to get from cache first
        const cachedImage = await getCachedImage(src);
        
        if (cachedImage) {
          // Create object URL from cached blob
          setImageSrc(URL.createObjectURL(cachedImage));
          setLoading(false);
          return;
        }
        
        // If not in cache, fetch and cache the full-quality image
        const response = await fetch(src);
        const blob = await response.blob();
        await cacheImage(src, blob);
        
        setImageSrc(URL.createObjectURL(blob));
      } catch (error) {
        console.error('Error loading image:', error);
        // Use original source as fallback
        setImageSrc(src);
      } finally {
        setLoading(false);
      }
    };
    
    loadImage();
    
    // Clean up object URL on unmount
    return () => {
      if (imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [isOpen, src]);
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 bg-black/90">
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button
              onClick={handleDownload}
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <Download className="h-6 w-6" />
            </Button>
            <Button
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-t-white border-white/30 rounded-full animate-spin"></div>
              <p className="text-white mt-4">Loading full resolution image...</p>
            </div>
          ) : (
            <img
              src={imageSrc}
              alt={alt}
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}