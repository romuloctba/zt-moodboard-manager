'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ImageOff } from 'lucide-react';
import { toast } from 'sonner';

// Components
import { LoadingSpinner, EmptyState, ConfirmDialog } from '@/components/common';
import { ImageGridItem } from './ImageGridItem';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { ImageSelectionToolbar } from './ImageSelectionToolbar';

// Hooks
import { useImageData, type ImageWithUrl } from '@/hooks/useImageData';
import { useImageActions } from '@/hooks/useImageActions';
import { useSelection } from '@/hooks/useSelection';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

import { cn } from '@/lib/utils';

interface ImageGridProps {
  characterId: string;
  className?: string;
}

/**
 * Displays a masonry grid of images for a character with selection,
 * filtering, preview, and bulk operations support.
 */
export function ImageGrid({ characterId, className }: ImageGridProps) {
  const t = useTranslations('media.grid');

  // Data fetching
  const {
    images,
    loading,
    allTags,
    updateImage,
    removeImage,
    removeImages,
  } = useImageData({ characterId });

  // Selection state
  const selection = useSelection<string>();

  // Image actions
  const imageActions = useImageActions({
    onDelete: removeImage,
    onDeleteMany: (ids) => {
      removeImages(ids);
      selection.exitSelectionMode();
    },
    onTagsUpdate: (id, tags) => {
      updateImage(id, { tags });
    },
  });

  // Confirm dialog for deletions
  const confirmDialog = useConfirmDialog();

  // Preview dialog state
  const [previewImage, setPreviewImage] = useState<ImageWithUrl | null>(null);

  // Tag filtering
  const [filterTag, setFilterTag] = useState<string | null>(null);

  // Filter images by tag
  const filteredImages = useMemo(() => 
    filterTag 
      ? images.filter(img => img.tags.includes(filterTag))
      : images,
    [images, filterTag]
  );

  // Handle image click (preview or selection toggle)
  const handleImageClick = useCallback(async (image: ImageWithUrl) => {
    if (selection.selectionMode) {
      selection.toggle(image.id);
      return;
    }
    
    // Load full-size URL if not already loaded
    const fullUrl = await imageActions.loadFullUrl(image);
    if (fullUrl && !image.fullUrl) {
      updateImage(image.id, { fullUrl });
    }
    setPreviewImage({ ...image, fullUrl: fullUrl || image.fullUrl });
  }, [selection, imageActions, updateImage]);

  // Handle single image delete
  const handleDeleteSingle = useCallback((imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    confirmDialog.confirm({
      title: t('confirmSingleDeleteTitle'),
      description: t('confirmSingleDelete'),
      variant: 'destructive',
      confirmLabel: t('toolbar.delete', { count: 1 }),
      action: async () => {
        const success = await imageActions.deleteImage(imageId);
        if (success) {
          toast.success(t('toast.deleted', { count: 1 }));
          if (previewImage?.id === imageId) {
            setPreviewImage(null);
          }
        } else {
          toast.error(t('toast.deleteFailed'));
        }
      },
    });
  }, [confirmDialog, imageActions, previewImage, t]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    const count = selection.count;
    if (count === 0) return;
    
    confirmDialog.confirm({
      title: t('confirmBulkDeleteTitle'),
      description: t('confirmBulkDelete', { count }),
      variant: 'destructive',
      confirmLabel: t('toolbar.delete', { count }),
      action: async () => {
        const success = await imageActions.deleteMany(selection.selectedArray);
        if (success) {
          toast.success(t('toast.deleted', { count }));
        } else {
          toast.error(t('toast.deleteFailed'));
        }
      },
    });
  }, [confirmDialog, imageActions, selection, t]);

  // Handle export
  const handleExport = useCallback(async () => {
    const selectedImages = images.filter(img => selection.selectedIds.has(img.id));
    const success = await imageActions.exportImages(selectedImages);
    if (success) {
      toast.success(t('toast.exported', { count: selectedImages.length }));
    } else {
      toast.error(t('toast.exportFailed'));
    }
  }, [imageActions, images, selection.selectedIds, t]);

  // Handle tags update in preview
  const handleTagsUpdate = useCallback(async (tags: string[]) => {
    if (!previewImage) return;
    
    const success = await imageActions.updateTags(previewImage.id, tags);
    if (success) {
      setPreviewImage(prev => prev ? { ...prev, tags } : null);
    } else {
      toast.error(t('toast.deleteFailed'));
    }
  }, [imageActions, previewImage, t]);

  // Loading state
  if (loading) {
    return <LoadingSpinner size="lg" fullPage />;
  }

  // Empty state
  if (images.length === 0) {
    return (
      <EmptyState
        icon={<ImageOff className="h-8 w-8 text-muted-foreground" />}
        title={t('empty.title')}
        description={t('empty.description')}
      />
    );
  }

  return (
    <>
      {/* Selection Toolbar */}
      <ImageSelectionToolbar
        totalCount={filteredImages.length}
        selectedCount={selection.count}
        selectionMode={selection.selectionMode}
        isDeleting={imageActions.isDeleting}
        isExporting={imageActions.isExporting}
        allTags={allTags}
        filterTag={filterTag}
        filterText={filterTag ? t('withTag', { tag: filterTag }) : undefined}
        onToggleSelectionMode={selection.toggleSelectionMode}
        onSelectAll={() => selection.selectAll(filteredImages.map(img => img.id))}
        onClearSelection={selection.clear}
        onDeleteSelected={handleBulkDelete}
        onExportSelected={handleExport}
        onFilterChange={setFilterTag}
      />

      {/* Masonry Grid */}
      <div
        className={cn(
          'columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3',
          className
        )}
      >
        {filteredImages.map((image) => (
          <ImageGridItem
            key={image.id}
            image={image}
            selectionMode={selection.selectionMode}
            isSelected={selection.isSelected(image.id)}
            isDeleting={imageActions.deletingId === image.id}
            onClick={() => handleImageClick(image)}
            onDelete={(e) => handleDeleteSingle(image.id, e)}
          />
        ))}
      </div>

      {/* Image Preview Dialog */}
      <ImagePreviewDialog
        image={previewImage}
        onClose={() => setPreviewImage(null)}
        allTags={allTags}
        onTagsUpdate={handleTagsUpdate}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setIsOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.execute}
        loading={confirmDialog.isLoading}
      />
    </>
  );
}
