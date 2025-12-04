'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, Expand, ImageOff, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { imageRepository } from '@/lib/db/repositories';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { MoodboardImage } from '@/types';

interface ImageGridProps {
  characterId: string;
  className?: string;
}

interface ImageWithUrl extends MoodboardImage {
  thumbnailUrl?: string;
  fullUrl?: string;
}

export function ImageGrid({ characterId, className }: ImageGridProps) {
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageWithUrl | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Load images for this character
  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const characterImages = await imageRepository.getByCharacterId(characterId);
      
      // Load thumbnail URLs for each image
      const imagesWithUrls = await Promise.all(
        characterImages.map(async (img) => {
          const thumbnailUrl = await imageRepository.getThumbnailUrl(img);
          return {
            ...img,
            thumbnailUrl: thumbnailUrl || undefined,
          };
        })
      );

      setImages(imagesWithUrls);
    } catch (error) {
      console.error('Failed to load images:', error);
      toast.error('Failed to load images');
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  // Toggle image selection
  const toggleImageSelection = (imageId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  // Select all images
  const selectAll = () => {
    setSelectedIds(new Set(images.map(img => img.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete selected images
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} selected image${count > 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }

    try {
      setBulkDeleting(true);
      await imageRepository.deleteMany(Array.from(selectedIds));
      setImages(prev => prev.filter(img => !selectedIds.has(img.id)));
      toast.success(`${count} image${count > 1 ? 's' : ''} deleted`);
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Failed to delete images:', error);
      toast.error('Failed to delete some images');
    } finally {
      setBulkDeleting(false);
    }
  };

  // Handle single image deletion
  const handleDelete = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deletingId) return;
    
    try {
      setDeletingId(imageId);
      await imageRepository.delete(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image deleted');
      
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error('Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle image click for preview or selection
  const handleImageClick = async (image: ImageWithUrl) => {
    if (selectionMode) {
      toggleImageSelection(image.id);
      return;
    }
    
    // Load full-size URL if not already loaded
    if (!image.fullUrl) {
      const fullUrl = await imageRepository.getImageUrl(image);
      if (fullUrl) {
        image.fullUrl = fullUrl;
      }
    }
    setSelectedImage(image);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ImageOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-1">No images yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload some reference images to get started
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Selection Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {images.length} image{images.length !== 1 ? 's' : ''}
          </span>
          {selectionMode && selectedIds.size > 0 && (
            <span className="text-sm font-medium text-primary">
              • {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
              >
                {bulkDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete ({selectedIds.size})
              </Button>
              <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Select
            </Button>
          )}
        </div>
      </div>

      {/* Masonry Grid */}
      <div
        className={cn(
          'columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3',
          className
        )}
      >
        {images.map((image) => (
          <div
            key={image.id}
            className={cn(
              'relative group break-inside-avoid mb-3 cursor-pointer',
              selectionMode && selectedIds.has(image.id) && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg'
            )}
            onClick={() => handleImageClick(image)}
          >
            {/* Selection checkbox */}
            {selectionMode && (
              <div className={cn(
                'absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                selectedIds.has(image.id)
                  ? 'bg-primary border-primary'
                  : 'bg-background/80 border-muted-foreground/50'
              )}>
                {selectedIds.has(image.id) && (
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
            )}

            {/* Image */}
            <div className="relative overflow-hidden rounded-lg bg-muted">
              {image.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.thumbnailUrl}
                  alt={image.originalName}
                  className="w-full h-auto object-cover transition-transform group-hover:scale-105"
                  style={{
                    aspectRatio: `${image.width} / ${image.height}`,
                  }}
                />
              ) : (
                <div
                  className="w-full bg-muted flex items-center justify-center"
                  style={{
                    aspectRatio: `${image.width} / ${image.height}`,
                  }}
                >
                  <ImageOff className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              {/* Overlay on hover (only when not in selection mode) */}
              {!selectionMode && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageClick(image);
                    }}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => handleDelete(image.id, e)}
                    disabled={deletingId === image.id}
                  >
                    {deletingId === image.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Color palette indicator */}
              {image.palette && image.palette.colors.length > 0 && !selectionMode && (
                <div className="absolute bottom-2 left-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {image.palette.colors.slice(0, 5).map((color, i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-sm font-medium truncate">
              {selectedImage?.originalName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="relative flex-1 overflow-auto p-4 pt-0">
              {selectedImage.fullUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImage.fullUrl}
                  alt={selectedImage.originalName}
                  className="w-full h-auto rounded-lg"
                />
              ) : selectedImage.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImage.thumbnailUrl}
                  alt={selectedImage.originalName}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-muted rounded-lg">
                  <ImageOff className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              {/* Image details */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{selectedImage.width} × {selectedImage.height}</span>
                <span>{formatFileSize(selectedImage.size)}</span>
                <span>{selectedImage.mimeType}</span>
              </div>

              {/* Color palette */}
              {selectedImage.palette && selectedImage.palette.colors.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Color Palette</p>
                  <div className="flex gap-2">
                    {selectedImage.palette.colors.map((color, i) => (
                      <button
                        key={i}
                        className="group relative w-10 h-10 rounded-lg border border-border shadow-sm"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          navigator.clipboard.writeText(color);
                          toast.success(`Copied ${color} to clipboard`);
                        }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded-lg text-[10px] text-white font-mono">
                          {color}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
