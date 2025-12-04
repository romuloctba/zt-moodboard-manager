'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Trash2, Expand, ImageOff, CheckCircle2, X, Download, Tag, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { imageRepository } from '@/lib/db/repositories';
import { exportSelectedImages } from '@/lib/export/exportService';
import { TagInput } from '@/components/ui/tag-input';
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
  const t = useTranslations('media.grid');
  const tPreview = useTranslations('media.preview');
  const tCommon = useTranslations('common');
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageWithUrl | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // Tag filtering
  const [allTags, setAllTags] = useState<string[]>([]);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  
  // Export state
  const [exporting, setExporting] = useState(false);

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
      
      // Extract all unique tags
      const tags = new Set<string>();
      imagesWithUrls.forEach(img => img.tags.forEach(tag => tags.add(tag)));
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Failed to load images:', error);
      toast.error(t('toast.loadFailed'));
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
    if (!confirm(t('confirmBulkDelete', { count }))) {
      return;
    }

    try {
      setBulkDeleting(true);
      await imageRepository.deleteMany(Array.from(selectedIds));
      setImages(prev => prev.filter(img => !selectedIds.has(img.id)));
      toast.success(t('toast.deleted', { count }));
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Failed to delete images:', error);
      toast.error(t('toast.deleteFailed'));
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
      toast.success(t('toast.deleted', { count: 1 }));
      
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast.error(t('toast.deleteFailed'));
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

  // Handle tag update for selected image
  const handleTagsUpdate = async (newTags: string[]) => {
    if (!selectedImage) return;
    
    try {
      await imageRepository.update(selectedImage.id, { tags: newTags });
      
      // Update local state
      setImages(prev => prev.map(img => 
        img.id === selectedImage.id ? { ...img, tags: newTags } : img
      ));
      setSelectedImage(prev => prev ? { ...prev, tags: newTags } : null);
      
      // Update all tags list
      const allTagsSet = new Set<string>();
      images.forEach(img => {
        if (img.id === selectedImage.id) {
          newTags.forEach(t => allTagsSet.add(t));
        } else {
          img.tags.forEach(t => allTagsSet.add(t));
        }
      });
      setAllTags(Array.from(allTagsSet).sort());
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast.error(t('toast.deleteFailed'));
    }
  };

  // Export selected images
  const handleExportSelected = async () => {
    if (selectedIds.size === 0) return;
    
    const selectedImages = images.filter(img => selectedIds.has(img.id));
    
    try {
      setExporting(true);
      await exportSelectedImages(selectedImages, 'selected-images');
      toast.success(t('toast.exported', { count: selectedImages.length }));
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(t('toast.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  // Filter images by tag
  const filteredImages = filterTag 
    ? images.filter(img => img.tags.includes(filterTag))
    : images;

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
        <h3 className="font-medium text-lg mb-1">{t('empty.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('empty.description')}
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
            {t('imageCount', { count: filteredImages.length })}
            {filterTag && ` ${t('withTag', { tag: filterTag })}`}
          </span>
          {selectionMode && selectedIds.size > 0 && (
            <span className="text-sm font-medium text-primary">
              • {t('selected', { count: selectedIds.size })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Tag filter dropdown */}
          {allTags.length > 0 && !selectionMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {filterTag || tCommon('actions.filter')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {filterTag && (
                  <>
                    <DropdownMenuItem onClick={() => setFilterTag(null)}>
                      {tCommon('actions.clearFilter')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {allTags.map(tag => (
                  <DropdownMenuItem 
                    key={tag} 
                    onClick={() => setFilterTag(tag)}
                    className={filterTag === tag ? 'bg-accent' : ''}
                  >
                    <Tag className="h-3 w-3 mr-2" />
                    {tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {selectionMode ? (
            <>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {t('toolbar.selectAll')}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                {tCommon('actions.clear')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
                disabled={selectedIds.size === 0 || exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('toolbar.export', { count: selectedIds.size })}
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
                {t('toolbar.delete', { count: selectedIds.size })}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                <X className="h-4 w-4 mr-2" />
                {t('toolbar.cancel')}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t('toolbar.select')}
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
        {filteredImages.map((image) => (
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
              
              {/* Tag badges (show on top) */}
              {image.tags.length > 0 && !selectionMode && (
                <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {image.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {tag}
                    </Badge>
                  ))}
                  {image.tags.length > 3 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      +{image.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle className="text-sm font-medium truncate">
              {selectedImage?.originalName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="flex-1 overflow-y-auto p-4 pt-0 min-h-0">
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

              {/* Tags */}
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">{tPreview('tags')}</p>
                <TagInput
                  tags={selectedImage.tags}
                  onTagsChange={handleTagsUpdate}
                  suggestions={allTags}
                  placeholder={tPreview('tagsPlaceholder')}
                />
              </div>

              {/* Color palette */}
              {selectedImage.palette && selectedImage.palette.colors.length > 0 && (
                <div className="mt-4 pb-2">
                  <p className="text-sm font-medium mb-2">{tPreview('colorPalette')}</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedImage.palette.colors.map((color, i) => (
                      <button
                        key={i}
                        className="group relative w-10 h-10 rounded-lg border border-border shadow-sm"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          navigator.clipboard.writeText(color);
                          toast.success(tCommon('actions.copyToClipboard', { value: color }));
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
