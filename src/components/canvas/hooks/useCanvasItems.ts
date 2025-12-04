'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { CanvasImageItem, CanvasViewport } from '@/types';
import type { ImageWithUrl } from '../types';
import { DEFAULT_IMAGE_MAX_SIZE, MIN_IMAGE_SIZE } from '../constants';

interface UseCanvasItemsOptions {
  initialItems?: CanvasImageItem[];
}

interface UseCanvasItemsReturn {
  items: CanvasImageItem[];
  selectedId: string | null;
  selectedItem: CanvasImageItem | undefined;
  setSelectedId: (id: string | null) => void;
  addItem: (image: ImageWithUrl, viewport: CanvasViewport) => void;
  updateItemPosition: (id: string, x: number, y: number) => void;
  updateItemSize: (id: string, width: number, height: number) => void;
  updateItemRotation: (id: string, rotation: number) => void;
  rotateItem: (id: string, delta: number) => void;
  resetItemRotation: (id: string) => void;
  toggleItemLock: (id: string) => void;
  deleteItem: (id: string) => void;
  bringToFront: (id: string) => void;
  isImageOnCanvas: (imageId: string) => boolean;
}

/**
 * Hook to manage canvas items state and operations
 */
export function useCanvasItems(
  alreadyOnCanvasMessage: string,
  options: UseCanvasItemsOptions = {}
): UseCanvasItemsReturn {
  const [items, setItems] = useState<CanvasImageItem[]>(options.initialItems || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Track highest z-index for layering
  const maxZIndex = useRef(
    items.length > 0 ? Math.max(...items.map((i) => i.zIndex)) : 0
  );

  const selectedItem = items.find((i) => i.id === selectedId);

  const isImageOnCanvas = useCallback(
    (imageId: string): boolean => {
      return items.some((item) => item.imageId === imageId);
    },
    [items]
  );

  const addItem = useCallback(
    (image: ImageWithUrl, viewport: CanvasViewport) => {
      // Check if already on canvas
      if (isImageOnCanvas(image.id)) {
        toast.error(alreadyOnCanvasMessage);
        return;
      }

      maxZIndex.current += 1;

      // Calculate size (max DEFAULT_IMAGE_MAX_SIZE on longest side, maintain aspect ratio)
      let width = image.width;
      let height = image.height;

      if (width > height) {
        if (width > DEFAULT_IMAGE_MAX_SIZE) {
          height = (height * DEFAULT_IMAGE_MAX_SIZE) / width;
          width = DEFAULT_IMAGE_MAX_SIZE;
        }
      } else {
        if (height > DEFAULT_IMAGE_MAX_SIZE) {
          width = (width * DEFAULT_IMAGE_MAX_SIZE) / height;
          height = DEFAULT_IMAGE_MAX_SIZE;
        }
      }

      const newItem: CanvasImageItem = {
        id: crypto.randomUUID(),
        imageId: image.id,
        x: -viewport.x / viewport.zoom + 100 + Math.random() * 200,
        y: -viewport.y / viewport.zoom + 100 + Math.random() * 200,
        width,
        height,
        rotation: 0,
        zIndex: maxZIndex.current,
      };

      setItems((prev) => [...prev, newItem]);
      setSelectedId(newItem.id);
    },
    [isImageOnCanvas, alreadyOnCanvasMessage]
  );

  const updateItemPosition = useCallback((id: string, x: number, y: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x, y } : item))
    );
  }, []);

  const updateItemSize = useCallback((id: string, width: number, height: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            width: Math.max(MIN_IMAGE_SIZE, width),
            height: Math.max(MIN_IMAGE_SIZE, height),
          }
          : item
      )
    );
  }, []);

  const updateItemRotation = useCallback((id: string, rotation: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rotation } : item))
    );
  }, []);

  const rotateItem = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, rotation: (item.rotation + delta) % 360 } : item
      )
    );
  }, []);

  const resetItemRotation = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rotation: 0 } : item))
    );
  }, []);

  const toggleItemLock = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, locked: !item.locked } : item
      )
    );
  }, []);

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [selectedId]
  );

  const bringToFront = useCallback((id: string) => {
    maxZIndex.current += 1;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, zIndex: maxZIndex.current } : item
      )
    );
  }, []);

  return {
    items,
    selectedId,
    selectedItem,
    setSelectedId,
    addItem,
    updateItemPosition,
    updateItemSize,
    updateItemRotation,
    rotateItem,
    resetItemRotation,
    toggleItemLock,
    deleteItem,
    bringToFront,
    isImageOnCanvas,
  };
}
