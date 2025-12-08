'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
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
    collapse?: string;
    expand?: string;
  };
}

/**
 * Sidebar displaying available images to add to the canvas
 * Can be collapsed/expanded to maximize canvas space
 */
export function ImageSidebar({
  images,
  onCanvasImageIds,
  onAddImage,
  labels,
}: ImageSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={cn(
        'border-r bg-background/50 flex flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-10' : 'w-48'
      )}
    >
      {/* Header with collapse toggle */}
      <div className={cn(
        'border-b flex items-center',
        isCollapsed ? 'p-1 justify-center' : 'p-2 justify-between'
      )}>
        {!isCollapsed && (
          <div className="flex-1 min-w-0 mr-1">
            <h3 className="text-sm font-medium truncate">{labels.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{labels.hint}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? labels.expand : labels.collapse}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Collapsed state - show icon and image count */}
      {isCollapsed ? (
        <div className="flex-1 flex flex-col items-center pt-2 gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsCollapsed(false)}
            title={labels.expand}
          >
            <Images className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground font-medium">
            {images.length}
          </span>
        </div>
      ) : (
        /* Expanded state - show image grid */
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
      )}
    </div>
  );
}
