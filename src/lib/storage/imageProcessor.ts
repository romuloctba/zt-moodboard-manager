/**
 * Image Processor
 * 
 * Handles client-side image processing: WebP conversion, resizing,
 * thumbnail generation, and color palette extraction.
 * 
 * Strategy:
 * - Convert all images to WebP for optimal quality/size ratio
 * - Cap resolution at 2000px (longest side) for free tier
 * - High quality (0.92) to preserve visual fidelity
 * - Future: Premium tier can unlock higher resolutions
 */

import ColorThief from 'colorthief';

export interface ProcessedImage {
  original: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  palette?: string[];
}

export interface ImageProcessorOptions {
  /** Maximum dimension (width or height) in pixels */
  maxWidthOrHeight?: number;
  /** WebP quality (0-1), default 0.92 */
  quality?: number;
  /** Thumbnail max dimension in pixels */
  thumbnailSize?: number;
  /** Thumbnail quality (0-1) */
  thumbnailQuality?: number;
  /** Whether to extract color palette */
  extractPalette?: boolean;
}

// Quality tiers for future premium features
export const QUALITY_TIERS = {
  free: { maxWidthOrHeight: 2000, quality: 0.92 },
  // premium: { maxWidthOrHeight: 4000, quality: 0.95 },  // Future
  // original: { maxWidthOrHeight: Infinity, quality: 1 }, // Future
} as const;

const DEFAULT_OPTIONS: Required<ImageProcessorOptions> = {
  maxWidthOrHeight: QUALITY_TIERS.free.maxWidthOrHeight,
  quality: QUALITY_TIERS.free.quality,
  thumbnailSize: 300,
  thumbnailQuality: 0.85,
  extractPalette: true,
};

/**
 * Process an image file: convert to WebP, resize if needed, generate thumbnail, extract palette
 */
export async function processImage(
  file: File,
  options: ImageProcessorOptions = {}
): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Load the image
  const img = await loadImage(file);

  // Calculate dimensions (resize if exceeds max)
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidthOrHeight
  );

  // Convert to WebP (and resize if needed)
  const processed = await convertToWebP(img, width, height, opts.quality);

  // Debug: verify WebP conversion
  if (process.env.NODE_ENV === 'development') {
    console.log('[ImageProcessor] Input:', file.type, file.size, 'bytes');
    console.log('[ImageProcessor] Output:', processed.type, processed.size, 'bytes');
  }

  // Generate thumbnail
  const thumbnail = await generateThumbnail(img, opts.thumbnailSize, opts.thumbnailQuality);

  // Extract color palette
  let palette: string[] | undefined;
  if (opts.extractPalette) {
    palette = await extractColorPalette(img);
  }

  return {
    original: processed,
    thumbnail,
    width,
    height,
    palette,
  };
}

/**
 * Load an image from a File/Blob
 */
function loadImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Calculate output dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Only resize if exceeds max
  if (width > maxSize || height > maxSize) {
    if (width > height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  return { width, height };
}

/**
 * Convert image to WebP format with optional resizing
 */
function convertToWebP(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    // Use high-quality image smoothing for resizing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert image to WebP'));
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Generate a thumbnail from an image
 */
function generateThumbnail(
  img: HTMLImageElement,
  maxSize: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      maxSize
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Get image dimensions from a Blob
 */
export async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const img = await loadImage(blob);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/**
 * Extract color palette from an image
 */
export async function extractColorPalette(source: HTMLImageElement | Blob): Promise<string[]> {
  try {
    const img = source instanceof HTMLImageElement ? source : await loadImage(source);

    const colorThief = new ColorThief();
    const palette = colorThief.getPalette(img, 6);

    // Convert RGB arrays to hex strings
    return palette.map(
      ([r, g, b]: [number, number, number]) =>
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );
  } catch (error) {
    console.warn('Failed to extract palette:', error);
    return [];
  }
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
