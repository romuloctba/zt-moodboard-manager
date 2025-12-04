'use client';

import { useState, useCallback } from 'react';
import { imageRepository } from '@/lib/db/repositories';
import { exportSelectedImages } from '@/lib/export/exportService';
import type { MoodboardImage } from '@/types';
import type { ImageWithUrl } from './useImageData';

interface UseImageActionsOptions {
  /** Callback when an image is deleted */
  onDelete?: (id: string) => void;
  /** Callback when multiple images are deleted */
  onDeleteMany?: (ids: string[]) => void;
  /** Callback when tags are updated */
  onTagsUpdate?: (id: string, tags: string[]) => void;
}

interface UseImageActionsReturn {
  /** Whether a delete operation is in progress */
  isDeleting: boolean;
  /** ID of the image currently being deleted (for single delete) */
  deletingId: string | null;
  /** Whether an export is in progress */
  isExporting: boolean;
  /** Delete a single image */
  deleteImage: (imageId: string) => Promise<boolean>;
  /** Delete multiple images */
  deleteMany: (ids: string[]) => Promise<boolean>;
  /** Update tags for an image */
  updateTags: (imageId: string, tags: string[]) => Promise<boolean>;
  /** Export selected images as a ZIP file */
  exportImages: (images: MoodboardImage[], filename?: string) => Promise<boolean>;
  /** Load full URL for an image */
  loadFullUrl: (image: ImageWithUrl) => Promise<string | null>;
}

/**
 * Hook for image CRUD operations
 */
export function useImageActions(options: UseImageActionsOptions = {}): UseImageActionsReturn {
  const { onDelete, onDeleteMany, onTagsUpdate } = options;

  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  /** Delete a single image */
  const deleteImage = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      setDeletingId(imageId);
      await imageRepository.delete(imageId);
      onDelete?.(imageId);
      return true;
    } catch (error) {
      console.error('Failed to delete image:', error);
      return false;
    } finally {
      setDeletingId(null);
    }
  }, [onDelete]);

  /** Delete multiple images */
  const deleteMany = useCallback(async (ids: string[]): Promise<boolean> => {
    try {
      setIsDeleting(true);
      await imageRepository.deleteMany(ids);
      onDeleteMany?.(ids);
      return true;
    } catch (error) {
      console.error('Failed to delete images:', error);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleteMany]);

  /** Update tags for an image */
  const updateTags = useCallback(async (imageId: string, tags: string[]): Promise<boolean> => {
    try {
      await imageRepository.update(imageId, { tags });
      onTagsUpdate?.(imageId, tags);
      return true;
    } catch (error) {
      console.error('Failed to update tags:', error);
      return false;
    }
  }, [onTagsUpdate]);

  /** Export selected images as a ZIP file */
  const exportImages = useCallback(async (
    images: MoodboardImage[],
    filename: string = 'selected-images'
  ): Promise<boolean> => {
    try {
      setIsExporting(true);
      await exportSelectedImages(images, filename);
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      return false;
    } finally {
      setIsExporting(false);
    }
  }, []);

  /** Load full URL for an image */
  const loadFullUrl = useCallback(async (image: ImageWithUrl): Promise<string | null> => {
    if (image.fullUrl) {
      return image.fullUrl;
    }
    return imageRepository.getImageUrl(image);
  }, []);

  return {
    isDeleting,
    deletingId,
    isExporting,
    deleteImage,
    deleteMany,
    updateTags,
    exportImages,
    loadFullUrl,
  };
}

export type { UseImageActionsReturn };
