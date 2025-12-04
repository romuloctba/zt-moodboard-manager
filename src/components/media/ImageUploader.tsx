'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, ImagePlus, Clipboard, Loader2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { imageRepository } from '@/lib/db/repositories';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploaderProps {
  characterId: string;
  onUploadComplete?: () => void;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: 'processing' | 'saving' | 'complete' | 'error';
  error?: string;
}

export function ImageUploader({ characterId, onUploadComplete }: ImageUploaderProps) {
  const t = useTranslations('media.uploader');
  const tCommon = useTranslations('common');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file processing
  const processFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 50 * 1024 * 1024 // 50MB max
    );

    if (validFiles.length === 0) {
      toast.error(t('toast.noValidImages'));
      return;
    }

    if (validFiles.length < files.length) {
      toast.warning(t('toast.filesSkipped', { count: files.length - validFiles.length }));
    }

    // Add files to uploading state
    const newUploadingFiles: UploadingFile[] = validFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      progress: 'processing' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Process files sequentially to avoid overwhelming the browser
    let successCount = 0;
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const uploadId = newUploadingFiles[i].id;

      try {
        // Update status to processing
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadId ? { ...f, progress: 'processing' } : f)
        );

        // Use the repository to process and save the image
        await imageRepository.create(file, characterId);

        // Mark as complete
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadId ? { ...f, progress: 'complete' } : f)
        );
        successCount++;
      } catch (error) {
        console.error('Failed to process image:', error);
        setUploadingFiles(prev =>
          prev.map(f => f.id === uploadId ? { 
            ...f, 
            progress: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          } : f)
        );
      }
    }

    if (successCount > 0) {
      toast.success(t('toast.success', { count: successCount }));
      onUploadComplete?.();
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(f => f.progress === 'error'));
    }, 2000);
  }, [characterId, onUploadComplete, t]);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  // Handle clipboard paste
  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const files: File[] = [];

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], `pasted-image-${Date.now()}.${type.split('/')[1]}`, { type });
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        processFiles(files);
      } else {
        toast.error(t('toast.noClipboardImages'));
      }
    } catch {
      // Clipboard API might not be available or permission denied
      toast.error(t('toast.clipboardError'));
    }
  }, [processFiles, t]);

  // Global paste listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        processFiles(files);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [processFiles]);

  const isUploading = uploadingFiles.some(f => f.progress === 'processing' || f.progress === 'saving');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors',
          'flex flex-col items-center justify-center gap-4',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Upload className={cn(
            'h-8 w-8 transition-transform',
            isDragOver ? 'text-primary scale-110' : 'text-muted-foreground'
          )} />
        </div>
        
        <div className="text-center">
          <p className="text-sm font-medium">
            {t('dropzone.title')}{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-primary hover:underline"
              disabled={isUploading}
            >
              {tCommon('actions.browse')}
            </button>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('dropzone.formats')}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            {t('buttons.selectFiles')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePaste}
            disabled={isUploading}
          >
            <Clipboard className="h-4 w-4 mr-2" />
            {t('buttons.pasteClipboard')}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map(file => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg bg-muted/50',
                file.progress === 'error' && 'bg-destructive/10'
              )}
            >
              {file.progress === 'processing' || file.progress === 'saving' ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : file.progress === 'complete' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.progress === 'processing' && t('progress.processing')}
                  {file.progress === 'saving' && t('progress.saving')}
                  {file.progress === 'complete' && t('progress.complete')}
                  {file.progress === 'error' && (file.error || t('progress.error'))}
                </p>
              </div>

              {file.progress === 'error' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setUploadingFiles(prev => prev.filter(f => f.id !== file.id))}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
