
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, X, Image as ImageIcon, Trash2, Plus, Settings, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded: () => void;
  currentUser: any;
  existingStory?: any;
}

export function AddStoryDialog({ open, onOpenChange, onStoryAdded, currentUser, existingStory }: AddStoryDialogProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<{
    show: boolean;
    type: 'existing' | 'new';
    index: number;
  }>({ show: false, type: 'existing', index: -1 });
  const [showManageStory, setShowManageStory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const hasExistingPhotos = existingStory?.photo_urls?.length > 0;
  const existingPhotosCount = hasExistingPhotos ? existingStory.photo_urls.length : 0;
  const totalPhotosAfterUpload = existingPhotosCount + selectedImages.length;

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate total number of images (max 10)
    if (totalPhotosAfterUpload + files.length > 10) {
      toast({
        variant: 'destructive',
        title: 'Too many photos',
        description: `You can add up to 10 photos per story. You currently have ${existingPhotosCount} photos.`,
      });
      return;
    }

    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid file type',
          description: 'Please select only image files',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please select images smaller than 10MB each',
        });
        return;
      }

      validFiles.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteExistingPhoto = async (photoIndex: number) => {
    try {
      const { error } = await supabase.rpc('delete_story_photos', {
        story_id: existingStory.id,
        photo_indices: [photoIndex]
      });

      if (error) throw error;

      toast({
        title: 'Photo deleted',
        description: 'The photo has been removed from your story',
      });

      onStoryAdded(); // Refresh the stories
      setShowDeleteConfirmation({ show: false, type: 'existing', index: -1 });

      // If no photos left, close manage story mode
      if (existingStory.photo_urls.length === 1) {
        setShowManageStory(false);
      }

    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete photo',
      });
    }
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0 || !currentUser) return;

    try {
      setUploading(true);

      const uploadedUrls: string[] = [];
      const photoMetadata: any[] = [];
      const currentTime = new Date().toISOString();

      // Upload all images
      for (const image of selectedImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        uploadedUrls.push(data.publicUrl);
        photoMetadata.push({
          uploaded_at: currentTime,
          file_name: fileName
        });
      }

      // Add photos to existing story or create new one
      if (hasExistingPhotos) {
        const { error } = await supabase.rpc('add_photos_to_story', {
          story_user_id: currentUser.id,
          new_photo_urls: uploadedUrls,
          new_photo_metadata: photoMetadata
        });

        if (error) throw error;

        toast({
          title: 'Photos added!',
          description: `Added ${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} to your story`,
        });
      } else {
        // Create new story
        const { error: insertError } = await supabase
          .from('stories')
          .insert({
            user_id: currentUser.id,
            photo_urls: uploadedUrls,
            photo_metadata: photoMetadata,
            image_url: uploadedUrls[0],
          });

        if (insertError) throw insertError;

        toast({
          title: 'Story posted!',
          description: `Your story with ${uploadedUrls.length} photo${uploadedUrls.length > 1 ? 's' : ''} has been shared`,
        });
      }

      resetForm();
      onOpenChange(false);
      onStoryAdded();

    } catch (error) {
      console.error('Error uploading story:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Failed to post your story. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviewUrls([]);
    setShowManageStory(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const toggleManageStory = () => {
    setShowManageStory(prev => !prev);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-300">
          <DialogHeader>
            <DialogTitle className="font-pixelated text-sm social-gradient bg-clip-text text-transparent">
              {hasExistingPhotos ? 'Add More Photos' : 'Add to Your Story'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* User Info with Settings Icon */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  {currentUser?.avatar ? (
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  ) : (
                    <AvatarFallback className="bg-social-dark-green text-white font-pixelated text-xs">
                      {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="font-pixelated text-xs">{currentUser?.name}</span>
              </div>
              
              {/* Settings Icon - Only show if user has existing photos */}
              {hasExistingPhotos && (
                <Button
                  onClick={toggleManageStory}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:bg-gray-100 transition-colors animate-pulse hover:animate-none"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Info Message for Story Management */}
            {hasExistingPhotos && !showManageStory && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-pixelated text-xs text-blue-800 font-medium">Story Management</p>
                  <p className="font-pixelated text-xs text-blue-700 mt-1">
                    To delete individual photos from your story, click the settings icon above.
                  </p>
                </div>
              </div>
            )}

            {/* Manage Story Section */}
            {showManageStory && hasExistingPhotos && (
              <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <p className="font-pixelated text-sm font-medium text-gray-800">Manage Story Photos</p>
                  <Button
                    onClick={() => setShowManageStory(false)}
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {existingStory.photo_urls.map((url: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Story photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md transition-transform group-hover:scale-105"
                      />
                      <Button
                        onClick={() => setShowDeleteConfirmation({ 
                          show: true, 
                          type: 'existing', 
                          index 
                        })}
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 bg-black/60 text-white hover:bg-red-500/90 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-full"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="font-pixelated text-xs text-muted-foreground text-center">
                  Hover over photos to delete them individually
                </p>
              </div>
            )}

            {/* Existing Photos Preview (when not in manage mode) */}
            {hasExistingPhotos && !showManageStory && (
              <div className="space-y-2">
                <p className="font-pixelated text-xs text-muted-foreground">
                  Current story ({existingPhotosCount} photo{existingPhotosCount > 1 ? 's' : ''})
                </p>
                <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
                  {existingStory.photo_urls.slice(0, 6).map((url: string, index: number) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Existing ${index + 1}`}
                        className="w-full h-16 object-cover rounded transition-transform hover:scale-105"
                      />
                      {existingPhotosCount > 6 && index === 5 && (
                        <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                          <span className="text-white font-pixelated text-xs">+{existingPhotosCount - 6}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Image Previews */}
            {previewUrls.length > 0 ? (
              <div className="space-y-3">
                <p className="font-pixelated text-xs text-muted-foreground">
                  New photos to add ({selectedImages.length})
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`New photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg transition-transform group-hover:scale-105 animate-fade-in"
                      />
                      <Button
                        onClick={() => setShowDeleteConfirmation({ 
                          show: true, 
                          type: 'new', 
                          index 
                        })}
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 bg-black/60 text-white hover:bg-red-500/90 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-full"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {totalPhotosAfterUpload < 10 && (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full font-pixelated text-xs h-8 hover:bg-gray-50 transition-colors hover-scale"
                    disabled={uploading}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add More ({totalPhotosAfterUpload}/10)
                  </Button>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-social-green rounded-lg p-8 text-center cursor-pointer hover:border-social-light-green transition-all duration-200 hover:bg-green-50/50 hover-scale"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-social-green/10 flex items-center justify-center animate-pulse">
                    <ImageIcon className="h-6 w-6 text-social-green" />
                  </div>
                  <div>
                    <p className="font-pixelated text-sm font-medium">
                      {hasExistingPhotos ? 'Add more photos' : 'Tap to add photos'}
                    </p>
                    <p className="font-pixelated text-xs text-muted-foreground mt-1">
                      {hasExistingPhotos 
                        ? `${10 - existingPhotosCount} photos remaining`
                        : 'Up to 10 photos, max 10MB each'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {selectedImages.length > 0 ? (
                <>
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="flex-1 font-pixelated text-xs h-9 hover:bg-gray-50 transition-colors"
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    className="flex-1 bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-9 transition-colors hover-scale"
                    disabled={uploading}
                  >
                    {uploading ? 'Adding...' : 
                     hasExistingPhotos ? `Add ${selectedImages.length} Photo${selectedImages.length > 1 ? 's' : ''}` :
                     `Share Story (${selectedImages.length})`
                    }
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-social-green hover:bg-social-light-green text-white font-pixelated text-xs h-9 transition-colors hover-scale"
                >
                  <Camera className="h-3 w-3 mr-2" />
                  {hasExistingPhotos ? 'Add More Photos' : 'Choose Photos'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={showDeleteConfirmation.show} 
        onOpenChange={(open) => setShowDeleteConfirmation({ show: open, type: 'existing', index: -1 })}
      >
        <AlertDialogContent className="animate-in zoom-in-95 duration-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixelated">Delete Photo</AlertDialogTitle>
            <AlertDialogDescription className="font-pixelated">
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-pixelated">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (showDeleteConfirmation.type === 'existing') {
                  handleDeleteExistingPhoto(showDeleteConfirmation.index);
                } else {
                  removeNewImage(showDeleteConfirmation.index);
                  setShowDeleteConfirmation({ show: false, type: 'existing', index: -1 });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-pixelated"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
