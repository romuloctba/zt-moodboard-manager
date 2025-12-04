/**
 * Export Service
 * 
 * Handles exporting images and project data to ZIP files
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { imageRepository } from '@/lib/db/repositories';
import { fileStorage } from '@/lib/storage/fileStorage';
import type { MoodboardImage, Character } from '@/types';

export interface ExportProgress {
  current: number;
  total: number;
  status: string;
}

export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * Export all images for a character as a ZIP file
 */
export async function exportCharacterImages(
  character: Character,
  onProgress?: ProgressCallback
): Promise<void> {
  const images = await imageRepository.getByCharacterId(character.id);

  if (images.length === 0) {
    throw new Error('No images to export');
  }

  const zip = new JSZip();
  const folder = zip.folder(sanitizeFilename(character.name)) as JSZip;

  // Add images to ZIP
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    onProgress?.({
      current: i + 1,
      total: images.length,
      status: `Adding ${image.originalName}...`,
    });

    try {
      const file = await fileStorage.getImage(image.storagePath);
      if (file) {
        // Use original filename or generate one
        const filename = getUniqueFilename(folder, image.originalName);
        folder.file(filename, file);
      }
    } catch (error) {
      console.warn(`Failed to add ${image.originalName} to ZIP:`, error);
    }
  }

  // Add metadata JSON
  const metadata = {
    character: {
      name: character.name,
      description: character.description,
      tags: character.tags,
    },
    images: images.map(img => ({
      originalName: img.originalName,
      width: img.width,
      height: img.height,
      tags: img.tags,
      notes: img.notes,
      palette: img.palette,
      createdAt: img.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  };
  folder.file('_metadata.json', JSON.stringify(metadata, null, 2));

  // Generate ZIP
  onProgress?.({
    current: images.length,
    total: images.length,
    status: 'Creating ZIP file...',
  });

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Download
  const zipFilename = `${sanitizeFilename(character.name)}-references.zip`;
  saveAs(blob, zipFilename);
}

/**
 * Export selected images as a ZIP file
 */
export async function exportSelectedImages(
  images: MoodboardImage[],
  filename: string = 'selected-images',
  onProgress?: ProgressCallback
): Promise<void> {
  if (images.length === 0) {
    throw new Error('No images to export');
  }

  const zip = new JSZip();

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    onProgress?.({
      current: i + 1,
      total: images.length,
      status: `Adding ${image.originalName}...`,
    });

    try {
      const file = await fileStorage.getImage(image.storagePath);
      if (file) {
        const uniqueName = getUniqueFilename(zip, image.originalName);
        zip.file(uniqueName, file);
      }
    } catch (error) {
      console.warn(`Failed to add ${image.originalName} to ZIP:`, error);
    }
  }

  onProgress?.({
    current: images.length,
    total: images.length,
    status: 'Creating ZIP file...',
  });

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  saveAs(blob, `${sanitizeFilename(filename)}.zip`);
}

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * Get a unique filename within a ZIP folder
 */
function getUniqueFilename(folder: JSZip, originalName: string): string {
  let name = originalName;
  let counter = 1;

  while (folder.file(name)) {
    const ext = originalName.lastIndexOf('.');
    if (ext > 0) {
      name = `${originalName.substring(0, ext)}_${counter}${originalName.substring(ext)}`;
    } else {
      name = `${originalName}_${counter}`;
    }
    counter++;
  }

  return name;
}
