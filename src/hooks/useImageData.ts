'use client';

import { useState, useEffect, useCallback } from 'react';
import { imageRepository } from '@/lib/db/repositories';
import type { MoodboardImage } from '@/types';

export interface ImageWithUrl extends MoodboardImage {
  thumbnailUrl?: string;
  fullUrl?: string;
}

interface UseImageDataOptions {
  /** Character ID to load images for */
  characterId: string;
}

interface UseImageDataReturn {
  /** Array of images with thumbnail URLs */
  images: ImageWithUrl[];
  /** Whether data is loading */
  loading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** All unique tags from loaded images */
  allTags: string[];
  /** Refresh the image list */
  refetch: () => Promise<void>;
  /** Update a specific image in the local state */
  updateImage: (id: string, updates: Partial<ImageWithUrl>) => void;
  /** Remove an image from local state */
  removeImage: (id: string) => void;
  /** Remove multiple images from local state */
  removeImages: (ids: string[]) => void;
  /** Set images directly */
  setImages: React.Dispatch<React.SetStateAction<ImageWithUrl[]>>;
}

/**
 * Hook for loading and managing image data for a character
 */
export function useImageData({ characterId }: UseImageDataOptions): UseImageDataReturn {
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  /** Extract unique tags from images */
  const extractTags = useCallback((imgs: ImageWithUrl[]) => {
    const tags = new Set<string>();
    imgs.forEach(img => img.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, []);

  /** Load images from repository */
  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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
      setAllTags(extractTags(imagesWithUrls));
    } catch (err) {
      console.error('Failed to load images:', err);
      setError(err instanceof Error ? err : new Error('Failed to load images'));
    } finally {
      setLoading(false);
    }
  }, [characterId, extractTags]);

  /** Update a specific image in local state */
  const updateImage = useCallback((id: string, updates: Partial<ImageWithUrl>) => {
    setImages(prev => {
      const updated = prev.map(img =>
        img.id === id ? { ...img, ...updates } : img
      );
      setAllTags(extractTags(updated));
      return updated;
    });
  }, [extractTags]);

  /** Remove an image from local state */
  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      setAllTags(extractTags(filtered));
      return filtered;
    });
  }, [extractTags]);

  /** Remove multiple images from local state */
  const removeImages = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setImages(prev => {
      const filtered = prev.filter(img => !idSet.has(img.id));
      setAllTags(extractTags(filtered));
      return filtered;
    });
  }, [extractTags]);

  // Load images on mount and when characterId changes
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  return {
    images,
    loading,
    error,
    allTags,
    refetch: loadImages,
    updateImage,
    removeImage,
    removeImages,
    setImages,
  };
}

export type { UseImageDataReturn };
