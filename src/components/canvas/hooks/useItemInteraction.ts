'use client';

import { useState, useCallback } from 'react';
import type { CanvasImageItem } from '@/types';
import type { ImageWithUrl, ResizeCorner, ItemInteractionState } from '../types';
import { ROTATION_STEP, MIN_IMAGE_SIZE } from '../constants';

interface UseItemInteractionOptions {
  item: CanvasImageItem;
  imageInfo?: ImageWithUrl;
  zoom: number;
  elementRef: React.RefObject<HTMLDivElement | null>;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onRotationChange: (rotation: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: () => void;
}

interface UseItemInteractionReturn {
  interactionState: ItemInteractionState;
  handleDragStart: (e: React.PointerEvent) => void;
  handleResize: (e: React.PointerEvent, corner: ResizeCorner) => void;
  handleRotate: (e: React.PointerEvent) => void;
}

/**
 * Hook to handle drag, resize, and rotate interactions for canvas items
 */
export function useItemInteraction({
  item,
  imageInfo,
  zoom,
  elementRef,
  onPositionChange,
  onSizeChange,
  onRotationChange,
  onDragStart,
  onDragEnd,
  onSelect,
}: UseItemInteractionOptions): UseItemInteractionReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Drag handler using pointer events
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (item.locked) return;
      e.stopPropagation();
      e.preventDefault();

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      setIsDragging(true);
      onDragStart();
      onSelect();

      const startX = e.clientX;
      const startY = e.clientY;
      const startItemX = item.x;
      const startItemY = item.y;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - startX) / zoom;
        const dy = (moveEvent.clientY - startY) / zoom;
        onPositionChange(startItemX + dx, startItemY + dy);
      };

      const onPointerUp = () => {
        setIsDragging(false);
        onDragEnd();
        target.releasePointerCapture(e.pointerId);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    },
    [item, zoom, onPositionChange, onDragStart, onDragEnd, onSelect]
  );

  // Resize handler using pointer events
  const handleResize = useCallback(
    (e: React.PointerEvent, corner: ResizeCorner) => {
      if (item.locked) return;
      e.stopPropagation();
      e.preventDefault();

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      setIsResizing(true);
      onDragStart(); // Disable canvas panning during resize

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = item.width;
      const startHeight = item.height;
      const aspectRatio = imageInfo ? imageInfo.width / imageInfo.height : 1;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - startX) / zoom;
        const dy = (moveEvent.clientY - startY) / zoom;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (corner.includes('e')) newWidth = Math.max(MIN_IMAGE_SIZE, startWidth + dx);
        if (corner.includes('w')) newWidth = Math.max(MIN_IMAGE_SIZE, startWidth - dx);
        if (corner.includes('s')) newHeight = Math.max(MIN_IMAGE_SIZE, startHeight + dy);
        if (corner.includes('n')) newHeight = Math.max(MIN_IMAGE_SIZE, startHeight - dy);

        // Maintain aspect ratio with shift key (desktop) or always on touch
        if (moveEvent.shiftKey || moveEvent.pointerType === 'touch') {
          newHeight = newWidth / aspectRatio;
        }

        onSizeChange(newWidth, newHeight);
      };

      const onPointerUp = () => {
        setIsResizing(false);
        onDragEnd();
        target.releasePointerCapture(e.pointerId);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    },
    [item, imageInfo, zoom, onSizeChange, onDragStart, onDragEnd]
  );

  // Rotation handler using pointer events
  const handleRotate = useCallback(
    (e: React.PointerEvent) => {
      if (item.locked) return;
      e.stopPropagation();
      e.preventDefault();

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      setIsRotating(true);
      onDragStart(); // Disable canvas panning during rotation

      // Get center of the element
      const rect = elementRef.current?.getBoundingClientRect();
      if (!rect) return;

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate initial angle
      const startAngle =
        Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      const startRotation = item.rotation;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const currentAngle =
          Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) *
          (180 / Math.PI);
        let newRotation = startRotation + (currentAngle - startAngle);

        // Snap to 15° increments when holding shift (desktop only)
        if (moveEvent.shiftKey) {
          newRotation = Math.round(newRotation / ROTATION_STEP) * ROTATION_STEP;
        }

        onRotationChange(newRotation);
      };

      const onPointerUp = () => {
        setIsRotating(false);
        onDragEnd();
        target.releasePointerCapture(e.pointerId);
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    },
    [item, elementRef, onRotationChange, onDragStart, onDragEnd]
  );

  return {
    interactionState: {
      isDragging,
      isResizing,
      isRotating,
    },
    handleDragStart,
    handleResize,
    handleRotate,
  };
}
