'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImagePlus, X, Check, Upload, Loader2 } from 'lucide-react';
import { imageRepository, characterRepository } from '@/lib/db/repositories';
import type { MoodboardImage } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageWithUrl extends MoodboardImage {
  thumbnailUrl?: string;
}

interface CoverImagePickerProps {
  projectId: string;
  currentImageId?: string;
  onImageSelect: (imageId: string | undefined) => void;
  label?: string;
}

/**
 * Cover image picker component for editions
 * Allows selecting from existing project images or uploading a new one
 */
export function CoverImagePicker({
  projectId,
  currentImageId,
  onImageSelect,
  label,
}: CoverImagePickerProps) {
  const t = useTranslations('editions.cover');
  const tCommon = useTranslations('common');
  
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ImageWithUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(currentImageId);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load current cover image URL
  useEffect(() => {
    async function loadCurrentImage() {
      if (currentImageId) {
        const image = await imageRepository.getById(currentImageId);
        if (image) {
          const url = await imageRepository.getThumbnailUrl(image);
          setCurrentImageUrl(url);
        }
      } else {
        setCurrentImageUrl(null);
      }
    }
    loadCurrentImage();
  }, [currentImageId]);

  // Load all images from the project's characters when dialog opens
  const loadProjectImages = useCallback(async () => {
    setLoading(true);
    try {
      // Get all characters in this project
      const characters = await characterRepository.getByProject(projectId);
      
      // Get all images from all characters
      const allImages: ImageWithUrl[] = [];
      for (const character of characters) {
        const charImages = await imageRepository.getByCharacterId(character.id);
        for (const img of charImages) {
          const thumbnailUrl = await imageRepository.getThumbnailUrl(img);
          allImages.push({ ...img, thumbnailUrl: thumbnailUrl || undefined });
        }
      }
      
      setImages(allImages);
    } catch (error) {
      console.error('Failed to load project images:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadProjectImages();
      setSelectedId(currentImageId);
    }
  }, [open, loadProjectImages, currentImageId]);

  const handleSelect = (imageId: string) => {
    setSelectedId(prev => prev === imageId ? undefined : imageId);
  };

  const handleConfirm = () => {
    onImageSelect(selectedId);
    setOpen(false);
  };

  const handleRemoveCover = () => {
    onImageSelect(undefined);
    setCurrentImageUrl(null);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidFile'));
      return;
    }

    setUploading(true);
    try {
      // Get first character in project to associate the image with
      const characters = await characterRepository.getByProject(projectId);
      if (characters.length === 0) {
        toast.error(t('noCharacters'));
        setUploading(false);
        return;
      }

      // Upload image to first character
      const image = await imageRepository.create(file, characters[0].id);
      const thumbnailUrl = await imageRepository.getThumbnailUrl(image);
      
      // Add to images list and select it
      setImages(prev => [{ ...image, thumbnailUrl: thumbnailUrl || undefined }, ...prev]);
      setSelectedId(image.id);
      toast.success(t('uploadSuccess'));
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      
      <div className="flex items-start gap-4">
        {/* Current cover preview */}
        <div
          className={cn(
            'relative w-24 h-32 rounded-lg border-2 border-dashed overflow-hidden flex items-center justify-center bg-muted/50',
            currentImageUrl ? 'border-primary/50' : 'border-muted-foreground/25'
          )}
        >
          {currentImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImageUrl}
                alt={t('currentCover')}
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleRemoveCover}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <ImagePlus className="h-4 w-4 mr-2" />
                {currentImageUrl ? t('changeCover') : t('selectCover')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>{t('dialogTitle')}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Upload button */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {t('uploadNew')}
                  </Button>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <span className="text-xs text-muted-foreground">
                    {t('orSelectBelow')}
                  </span>
                </div>

                {/* Image grid */}
                <ScrollArea className="h-[400px] pr-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{t('noImages')}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t('noImagesHint')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {images.map((image) => (
                        <button
                          key={image.id}
                          type="button"
                          className={cn(
                            'relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all',
                            selectedId === image.id
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-transparent hover:border-muted-foreground/50'
                          )}
                          onClick={() => handleSelect(image.id)}
                        >
                          {image.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <ImagePlus className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          {selectedId === image.id && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-4 w-4 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedId(undefined)}
                    disabled={!selectedId}
                  >
                    {t('clearSelection')}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      {tCommon('actions.cancel')}
                    </Button>
                    <Button onClick={handleConfirm}>
                      {tCommon('actions.confirm')}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {currentImageUrl && (
            <p className="text-xs text-muted-foreground">{t('coverSet')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
