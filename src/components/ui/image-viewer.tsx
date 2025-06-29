
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ src, alt, isOpen, onClose }: ImageViewerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 bg-black/90">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
