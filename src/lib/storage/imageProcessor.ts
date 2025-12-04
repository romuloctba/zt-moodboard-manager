/**
 * Image Processor
 * 
 * Handles client-side image compression, thumbnail generation,
 * and color palette extraction.
 */

import imageCompression from 'browser-image-compression';
import ColorThief from 'colorthief';

export interface ProcessedImage {
  original: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  palette?: string[];
}

export interface ImageProcessorOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  thumbnailSize?: number;
  extractPalette?: boolean;
}

const DEFAULT_OPTIONS: ImageProcessorOptions = {
  maxSizeMB: 5,
  maxWidthOrHeight: 2000,
  thumbnailSize: 300,
  extractPalette: true,
};

/**
 * Process an image file: compress, generate thumbnail, extract palette
 */
export async function processImage(
  file: File,
  options: ImageProcessorOptions = {}
): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Compress the original image if needed
  let compressed: Blob;
  if (file.size > (opts.maxSizeMB! * 1024 * 1024)) {
    compressed = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB,
      maxWidthOrHeight: opts.maxWidthOrHeight,
      useWebWorker: true,
    });
  } else {
    compressed = file;
  }

  // Get image dimensions
  const dimensions = await getImageDimensions(compressed);

  // Generate thumbnail
  const thumbnail = await generateThumbnail(compressed, opts.thumbnailSize!);

  // Extract color palette
  let palette: string[] | undefined;
  if (opts.extractPalette) {
    palette = await extractColorPalette(compressed);
  }

  return {
    original: compressed,
    thumbnail,
    width: dimensions.width,
    height: dimensions.height,
    palette,
  };
}

/**
 * Get image dimensions from a Blob
 */
export function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Generate a thumbnail from an image blob
 */
export async function generateThumbnail(blob: Blob, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate thumbnail dimensions maintaining aspect ratio
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob (WebP for better compression)
      canvas.toBlob(
        (thumbnailBlob) => {
          if (thumbnailBlob) {
            resolve(thumbnailBlob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        },
        'image/webp',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail'));
    };

    img.src = url;
  });
}

/**
 * Extract color palette from an image
 */
export async function extractColorPalette(blob: Blob): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      try {
        const colorThief = new ColorThief();
        const palette = colorThief.getPalette(img, 6);

        // Convert RGB arrays to hex strings
        const hexColors = palette.map(
          ([r, g, b]: [number, number, number]) =>
            `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        );

        resolve(hexColors);
      } catch (error) {
        console.warn('Failed to extract palette:', error);
        resolve([]);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve([]);
    };

    img.src = url;
  });
}

/**
 * Validate that a file is an accepted image type
 */
export function isValidImageType(file: File): boolean {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ];
  return validTypes.includes(file.type);
}

/**
 * Get a human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
