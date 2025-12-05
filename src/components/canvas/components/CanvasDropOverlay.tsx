'use client';

import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasDropOverlayProps {
  isDragging: boolean;
  isUploading: boolean;
  dragLabel?: string;
  uploadingLabel?: string;
}

/**
 * Overlay shown when dragging files over the canvas
 * Presentational component - receives all state via props
 */
export function CanvasDropOverlay({
  isDragging,
  isUploading,
  dragLabel = 'Drop images to upload',
  uploadingLabel = 'Uploading...',
}: CanvasDropOverlayProps) {
  if (!isDragging && !isUploading) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex items-center justify-center',
        'bg-background/80 backdrop-blur-sm',
        'border-2 border-dashed rounded-lg transition-colors',
        isDragging ? 'border-primary' : 'border-transparent'
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            isDragging ? 'bg-primary/20' : 'bg-muted'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <Upload
              className={cn(
                'h-8 w-8 transition-transform',
                isDragging && 'text-primary scale-110'
              )}
            />
          )}
        </div>
        <p className="text-sm font-medium">
          {isUploading ? uploadingLabel : dragLabel}
        </p>
      </div>
    </div>
  );
}
