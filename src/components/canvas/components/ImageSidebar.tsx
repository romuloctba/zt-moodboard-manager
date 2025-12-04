'use client';

import { cn } from '@/lib/utils';
import type { ImageWithUrl } from '../types';

interface ImageSidebarProps {
  images: ImageWithUrl[];
  onCanvasImageIds: string[];
  onAddImage: (image: ImageWithUrl) => void;
  labels: {
    title: string;
    hint: string;
    onCanvas: string;
    noImages: string;
  };
}

/**
 * Sidebar displaying available images to add to the canvas
 */
export function ImageSidebar({
  images,
  onCanvasImageIds,
  onAddImage,
  labels,
}: ImageSidebarProps) {
  return (
    <div className="w-48 border-r bg-background/50 flex flex-col">
      <div className="p-2 border-b">
        <h3 className="text-sm font-medium">{labels.title}</h3>
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {images.map((image) => {
          const isOnCanvas = onCanvasImageIds.includes(image.id);
          return (
            <div
              key={image.id}
              className={cn(
                'relative rounded-md overflow-hidden cursor-pointer border-2 transition-colors',
                isOnCanvas
                  ? 'border-primary/50 opacity-50'
                  : 'border-transparent hover:border-primary'
              )}
              onClick={() => onAddImage(image)}
            >
              {image.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.thumbnailUrl}
                  alt={image.originalName}
                  className="w-full h-auto"
                  draggable={false}
                />
              )}
              {isOnCanvas && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                  <span className="text-xs font-medium">{labels.onCanvas}</span>
                </div>
              )}
            </div>
          );
        })}
        {images.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            {labels.noImages}
          </p>
        )}
      </div>
    </div>
  );
}
