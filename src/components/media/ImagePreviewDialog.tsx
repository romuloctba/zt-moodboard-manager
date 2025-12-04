'use client';

import { useTranslations } from 'next-intl';
import { ImageOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TagInput } from '@/components/ui/tag-input';
import { toast } from 'sonner';
import type { ImageWithUrl } from '@/hooks/useImageData';

interface ImagePreviewDialogProps {
  /** Image to preview, or null if dialog should be closed */
  image: ImageWithUrl | null;
  /** Called when dialog should be closed */
  onClose: () => void;
  /** All available tags for suggestions */
  allTags: string[];
  /** Called when tags are updated */
  onTagsUpdate: (tags: string[]) => void;
}

/**
 * Dialog for previewing an image with full size and managing tags
 */
export function ImagePreviewDialog({
  image,
  onClose,
  allTags,
  onTagsUpdate,
}: ImagePreviewDialogProps) {
  const tPreview = useTranslations('media.preview');
  const tCommon = useTranslations('common');

  if (!image) return null;

  return (
    <Dialog open={!!image} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="text-sm font-medium truncate">
            {image.originalName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 pt-0 min-h-0">
          {image.fullUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.fullUrl}
              alt={image.originalName}
              className="w-full h-auto rounded-lg"
            />
          ) : image.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.thumbnailUrl}
              alt={image.originalName}
              className="w-full h-auto rounded-lg"
            />
          ) : (
            <div className="aspect-video flex items-center justify-center bg-muted rounded-lg">
              <ImageOff className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Image details */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{image.width} × {image.height}</span>
            <span>{formatFileSize(image.size)}</span>
            <span>{image.mimeType}</span>
          </div>

          {/* Tags */}
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">{tPreview('tags')}</p>
            <TagInput
              tags={image.tags}
              onTagsChange={onTagsUpdate}
              suggestions={allTags}
              placeholder={tPreview('tagsPlaceholder')}
            />
          </div>

          {/* Color palette */}
          {image.palette && image.palette.colors.length > 0 && (
            <div className="mt-4 pb-2">
              <p className="text-sm font-medium mb-2">{tPreview('colorPalette')}</p>
              <div className="flex gap-2 flex-wrap">
                {image.palette.colors.map((color, i) => (
                  <button
                    key={i}
                    className="group relative w-10 h-10 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      navigator.clipboard.writeText(color);
                      toast.success(tCommon('actions.copyToClipboard', { value: color }));
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded-lg text-[10px] text-white font-mono">
                      {color}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
