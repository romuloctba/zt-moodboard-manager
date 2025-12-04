'use client';

import { useState, useEffect } from 'react';
import { imageRepository } from '@/lib/db/repositories';
import { toast } from 'sonner';
import type { ImageWithUrl } from '../types';

interface UseCanvasImagesOptions {
  onError?: (error: Error) => void;
}

interface UseCanvasImagesReturn {
  images: ImageWithUrl[];
  loading: boolean;
  getImageUrl: (imageId: string) => string | undefined;
  getImageInfo: (imageId: string) => ImageWithUrl | undefined;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage loading and accessing character images for the canvas
 */
export function useCanvasImages(
  characterId: string,
  errorMessage: string,
  options: UseCanvasImagesOptions = {}
): UseCanvasImagesReturn {
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  const loadImages = async () => {
    try {
      setLoading(true);
      const characterImages = await imageRepository.getByCharacterId(characterId);

      const imagesWithUrls = await Promise.all(
        characterImages.map(async (img) => {
          const thumbnailUrl = await imageRepository.getThumbnailUrl(img);
          return { ...img, thumbnailUrl: thumbnailUrl || undefined };
        })
      );

      setImages(imagesWithUrls);
    } catch (error) {
      console.error('Failed to load images:', error);
      toast.error(errorMessage);
      options.onError?.(error as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const getImageUrl = (imageId: string): string | undefined => {
    return images.find((img) => img.id === imageId)?.thumbnailUrl;
  };

  const getImageInfo = (imageId: string): ImageWithUrl | undefined => {
    return images.find((img) => img.id === imageId);
  };

  return {
    images,
    loading,
    getImageUrl,
    getImageInfo,
    refetch: loadImages,
  };
}
