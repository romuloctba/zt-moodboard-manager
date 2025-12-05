'use client';

import { useState, useCallback } from 'react';
import { imageRepository } from '@/lib/db/repositories';
import type { MoodboardImage } from '@/types';

interface UseCanvasDropUploadOptions {
  characterId: string;
  onImageUploaded?: (image: MoodboardImage) => void;
  onError?: (error: string) => void;
}

interface UseCanvasDropUploadReturn {
  isDraggingFiles: boolean;
  isUploading: boolean;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

/**
 * Hook to handle drag-and-drop file uploads on the canvas
 * Distinguishes between file drops and canvas item drags
 */
export function useCanvasDropUpload({
  characterId,
  onImageUploaded,
  onError,
}: UseCanvasDropUploadOptions): UseCanvasDropUploadReturn {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check if the drag event contains files
  const hasFiles = useCallback((e: React.DragEvent): boolean => {
    if (e.dataTransfer.types.includes('Files')) {
      // Check if any items are image files
      const items = e.dataTransfer.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          return true;
        }
      }
      // If items don't have type info yet (common during dragover), check types
      return e.dataTransfer.types.includes('Files');
    }
    return false;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      // Only handle if dragging files (not canvas items)
      if (hasFiles(e)) {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFiles(true);
      }
    },
    [hasFiles]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only reset if leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDraggingFiles(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      // Only handle file drops
      if (!hasFiles(e)) return;

      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFiles(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (file) => file.type.startsWith('image/') && file.size <= 50 * 1024 * 1024
      );

      if (files.length === 0) {
        onError?.('No valid image files found');
        return;
      }

      setIsUploading(true);

      try {
        // Process files sequentially
        for (const file of files) {
          try {
            const image = await imageRepository.create(file, characterId);
            onImageUploaded?.(image);
          } catch (error) {
            console.error('Failed to upload image:', error);
            onError?.(error instanceof Error ? error.message : 'Failed to upload image');
          }
        }
      } finally {
        setIsUploading(false);
      }
    },
    [characterId, hasFiles, onImageUploaded, onError]
  );

  return {
    isDraggingFiles,
    isUploading,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
