'use client';

import { useCallback, useState } from 'react';
import { saveAs } from 'file-saver';
import type { CanvasImageItem } from '@/types';
import { CANVAS_SIZE } from '../constants';

interface UseCanvasExportOptions {
  items: CanvasImageItem[];
  getImageUrl: (imageId: string) => string | undefined;
  filename?: string;
}

interface UseCanvasExportReturn {
  exportCanvas: () => Promise<void>;
  isExporting: boolean;
}

/**
 * Hook to handle canvas export as image
 * Renders all canvas items to an offscreen canvas and downloads as PNG
 */
export function useCanvasExport({
  items,
  getImageUrl,
  filename = 'moodboard',
}: UseCanvasExportOptions): UseCanvasExportReturn {
  const [isExporting, setIsExporting] = useState(false);

  const exportCanvas = useCallback(async () => {
    if (items.length === 0 || isExporting) return;

    setIsExporting(true);

    try {
      // Calculate bounding box of all items
      const bounds = calculateBoundingBox(items);

      // Add padding around the content
      const padding = 50;
      const canvasWidth = bounds.width + padding * 2;
      const canvasHeight = bounds.height + padding * 2;

      // Create offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Fill background
      ctx.fillStyle = '#171717'; // neutral-900
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Sort items by z-index to maintain layer order
      const sortedItems = [...items].sort((a, b) => a.zIndex - b.zIndex);

      // Load and draw each image
      await Promise.all(
        sortedItems.map(async (item) => {
          const imageUrl = getImageUrl(item.imageId);
          if (!imageUrl) return;

          try {
            const img = await loadImage(imageUrl);

            // Calculate position relative to bounding box
            const x = item.x - bounds.minX + padding;
            const y = item.y - bounds.minY + padding;

            // Apply transformations
            ctx.save();

            // Move to center of image for rotation
            const centerX = x + item.width / 2;
            const centerY = y + item.height / 2;

            ctx.translate(centerX, centerY);
            ctx.rotate((item.rotation * Math.PI) / 180);
            ctx.translate(-centerX, -centerY);

            // Draw the image
            ctx.drawImage(img, x, y, item.width, item.height);

            ctx.restore();
          } catch (error) {
            console.warn(`Failed to draw image ${item.imageId}:`, error);
          }
        })
      );

      // Convert canvas to blob and download
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const timestamp = new Date().toISOString().slice(0, 10);
            saveAs(blob, `${filename}-${timestamp}.png`);
          }
        },
        'image/png',
        1.0
      );
    } catch (error) {
      console.error('Failed to export canvas:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [items, getImageUrl, filename, isExporting]);

  return { exportCanvas, isExporting };
}

/**
 * Calculate the bounding box of all canvas items
 */
function calculateBoundingBox(items: CanvasImageItem[]) {
  if (items.length === 0) {
    return { minX: 0, minY: 0, maxX: CANVAS_SIZE, maxY: CANVAS_SIZE, width: CANVAS_SIZE, height: CANVAS_SIZE };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    // Account for rotation when calculating bounds
    const corners = getRotatedCorners(item);

    for (const corner of corners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Get the four corners of a rotated rectangle
 */
function getRotatedCorners(item: CanvasImageItem) {
  const { x, y, width, height, rotation } = item;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  const corners = [
    { x: x, y: y },
    { x: x + width, y: y },
    { x: x + width, y: y + height },
    { x: x, y: y + height },
  ];

  return corners.map((corner) => {
    const dx = corner.x - centerX;
    const dy = corner.y - centerY;
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    };
  });
}

/**
 * Load an image from URL and return as HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
