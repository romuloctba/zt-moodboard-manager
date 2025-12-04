'use client';

import { memo } from 'react';
import { Loader2, Trash2, Expand, ImageOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ImageWithUrl } from '@/hooks/useImageData';

interface ImageGridItemProps {
  /** Image data to display */
  image: ImageWithUrl;
  /** Whether selection mode is active */
  selectionMode: boolean;
  /** Whether this image is selected */
  isSelected: boolean;
  /** Whether this image is being deleted */
  isDeleting: boolean;
  /** Called when the image is clicked */
  onClick: () => void;
  /** Called when delete button is clicked */
  onDelete: (e: React.MouseEvent) => void;
}

/**
 * Single image card in the ImageGrid
 * Displays thumbnail, selection state, tags, and color palette
 */
export const ImageGridItem = memo(function ImageGridItem({
  image,
  selectionMode,
  isSelected,
  isDeleting,
  onClick,
  onDelete,
}: ImageGridItemProps) {
  return (
    <div
      className={cn(
        'relative group break-inside-avoid mb-3 cursor-pointer',
        selectionMode && isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg'
      )}
      onClick={onClick}
    >
      {/* Selection checkbox */}
      {selectionMode && (
        <div className={cn(
          'absolute top-2 left-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          isSelected
            ? 'bg-primary border-primary'
            : 'bg-background/80 border-muted-foreground/50'
        )}>
          {isSelected && (
            <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
          )}
        </div>
      )}

      {/* Image */}
      <div className="relative overflow-hidden rounded-lg bg-muted">
        {image.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.thumbnailUrl}
            alt={image.originalName}
            className="w-full h-auto object-cover transition-transform group-hover:scale-105"
            style={{
              aspectRatio: `${image.width} / ${image.height}`,
            }}
          />
        ) : (
          <div
            className="w-full bg-muted flex items-center justify-center"
            style={{
              aspectRatio: `${image.width} / ${image.height}`,
            }}
          >
            <ImageOff className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Overlay on hover (only when not in selection mode) */}
        {!selectionMode && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Expand className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Color palette indicator */}
        {image.palette && image.palette.colors.length > 0 && !selectionMode && (
          <div className="absolute bottom-2 left-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {image.palette.colors.slice(0, 5).map((color, i) => (
              <div
                key={i}
                className="h-2 flex-1 rounded-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
        
        {/* Tag badges (show on top) */}
        {image.tags.length > 0 && !selectionMode && (
          <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {image.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {tag}
              </Badge>
            ))}
            {image.tags.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                +{image.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
