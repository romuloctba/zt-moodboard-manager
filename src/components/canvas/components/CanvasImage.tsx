'use client';

import { useRef } from 'react';
import { Lock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CanvasImageItem } from '@/types';
import type { ImageWithUrl, ResizeCorner } from '../types';
import { useItemInteraction } from '../hooks/useItemInteraction';

interface CanvasImageProps {
  item: CanvasImageItem;
  imageUrl?: string;
  imageInfo?: ImageWithUrl;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onRotationChange: (rotation: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  zoom: number;
}

const RESIZE_CORNERS: { corner: ResizeCorner; position: string; cursor: string }[] = [
  { corner: 'se', position: '-right-6 -bottom-6', cursor: 'cursor-se-resize' },
  { corner: 'sw', position: '-left-6 -bottom-6', cursor: 'cursor-sw-resize' },
  { corner: 'ne', position: '-right-6 -top-6', cursor: 'cursor-ne-resize' },
  { corner: 'nw', position: '-left-6 -top-6', cursor: 'cursor-nw-resize' },
];

/**
 * Individual draggable, resizable, rotatable image on the canvas
 */
export function CanvasImage({
  item,
  imageUrl,
  imageInfo,
  isSelected,
  onSelect,
  onPositionChange,
  onSizeChange,
  onRotationChange,
  onDragStart,
  onDragEnd,
  zoom,
}: CanvasImageProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  const {
    interactionState: { isDragging, isResizing, isRotating },
    handleDragStart,
    handleResize,
    handleRotate,
  } = useItemInteraction({
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
  });

  return (
    <div
      ref={elementRef}
      className={cn(
        'absolute select-none',
        isDragging && 'cursor-grabbing',
        !isDragging && !item.locked && 'cursor-grab',
        item.locked && 'cursor-not-allowed'
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
        transform: `rotate(${item.rotation}deg)`,
        touchAction: 'none',
      }}
      onPointerDown={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Image */}
      <div
        className={cn(
          'w-full h-full rounded-md overflow-hidden shadow-lg',
          isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-transparent'
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        )}
      </div>

      {/* Resize handles (only when selected and not locked) */}
      {isSelected && !item.locked && (
        <>
          {RESIZE_CORNERS.map(({ corner, position, cursor }) => (
            <div
              key={corner}
              className={cn(
                'absolute w-5 h-5 bg-primary rounded-sm',
                position,
                cursor
              )}
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => handleResize(e, corner)}
            />
          ))}

          {/* Rotation handle */}
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 -top-12 flex flex-col items-center',
              isRotating && 'cursor-grabbing'
            )}
            style={{ touchAction: 'none' }}
            onPointerDown={handleRotate}
          >
            <div
              className={cn(
                'w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-grab',
                isRotating && 'cursor-grabbing ring-2 ring-primary/50'
              )}
            >
              <RotateCcw className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="w-0.5 h-4 bg-primary" />
          </div>
        </>
      )}

      {/* Lock indicator */}
      {item.locked && (
        <div className="absolute top-1 right-1 bg-background/80 rounded p-0.5">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}

      {/* Visual feedback for resize/rotate */}
      {(isResizing || isRotating) && (
        <div className="absolute inset-0 border-2 border-primary border-dashed rounded-md pointer-events-none" />
      )}
    </div>
  );
}
