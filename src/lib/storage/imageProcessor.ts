/**
 * Image Processor
 * 
 * Handles client-side image processing: WebP conversion, resizing,
 * thumbnail generation, and color palette extraction.
 * 
 * Strategy:
 * - Convert all images to WebP for optimal quality/size ratio
 * - Fall back to JPEG on browsers that don't support WebP encoding (Safari < 17)
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
  /** The actual output format (webp or jpeg) */
  format: 'webp' | 'jpeg';
}

export interface ImageProcessorOptions {
  /** Maximum dimension (width or height) in pixels */
  maxWidthOrHeight?: number;
  /** WebP/JPEG quality (0-1), default 0.92 */
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

// JPEG fallback quality (for browsers without WebP encoding support like Safari < 17)
const JPEG_FALLBACK_QUALITY = 0.65;

const DEFAULT_OPTIONS: Required<ImageProcessorOptions> = {
  maxWidthOrHeight: QUALITY_TIERS.free.maxWidthOrHeight,
  quality: QUALITY_TIERS.free.quality,
  thumbnailSize: 300,
  thumbnailQuality: 0.85,
  extractPalette: true,
};

// Cache the WebP support check result
let webpEncodingSupported: boolean | null = null;

/**
 * Check if the browser supports WebP encoding via canvas.toBlob()
 * Safari < 17 can decode WebP but cannot encode it
 */
async function supportsWebPEncoding(): Promise<boolean> {
  if (webpEncodingSupported !== null) {
    return webpEncodingSupported;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.9);
    });

    // Check if we got a WebP blob (Safari falls back to PNG silently)
    webpEncodingSupported = blob?.type === 'image/webp';

    if (process.env.NODE_ENV === 'development') {
      console.log('[ImageProcessor] WebP encoding supported:', webpEncodingSupported);
    }

    return webpEncodingSupported;
  } catch {
    webpEncodingSupported = false;
    return false;
  }
}

/**
 * Process an image file: convert to WebP (or JPEG fallback), resize if needed, generate thumbnail, extract palette
 */
export async function processImage(
  file: File,
  options: ImageProcessorOptions = {}
): Promise<ProcessedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check WebP encoding support (cached after first check)
  const useWebP = await supportsWebPEncoding();
  const outputFormat = useWebP ? 'webp' : 'jpeg';
  const mimeType = useWebP ? 'image/webp' : 'image/jpeg';

  // Use lower quality for JPEG fallback (Safari/older browsers)
  const outputQuality = useWebP ? opts.quality : JPEG_FALLBACK_QUALITY;

  // Load the image
  const img = await loadImage(file);

  // Calculate dimensions (resize if exceeds max)
  const { width, height } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    opts.maxWidthOrHeight
  );

  // Convert to WebP or JPEG (and resize if needed)
  const processed = await convertToOptimizedFormat(img, width, height, outputQuality, mimeType);

  // Debug: verify conversion
  if (process.env.NODE_ENV === 'development') {
    console.log('[ImageProcessor] Input:', file.type, file.size, 'bytes');
    console.log('[ImageProcessor] Output:', processed.type, processed.size, 'bytes', `(${outputFormat} @ ${Math.round(outputQuality * 100)}%)`);
  }

  // Generate thumbnail (always try WebP first, fall back to JPEG)
  const thumbnail = await generateThumbnail(img, opts.thumbnailSize, opts.thumbnailQuality, mimeType);

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
    format: outputFormat,
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
 * Step-down resize an image for high-quality downsampling
 * When downscaling by more than 2x, browsers (especially Safari) produce
 * aliased/pixelated results. This function resizes in steps of 50% to get
 * much better quality, similar to bicubic interpolation.
 */
function stepDownResize(
  source: HTMLImageElement | HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  let currentWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  let currentHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

  // If we're not downscaling much, just do it in one step
  if (currentWidth <= targetWidth * 2 && currentHeight <= targetHeight * 2) {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    return canvas;
  }

  // Step down by halves until we're close to the target
  let currentSource: HTMLImageElement | HTMLCanvasElement = source;

  while (currentWidth > targetWidth * 2 || currentHeight > targetHeight * 2) {
    // Halve the dimensions (but don't go below target)
    const nextWidth = Math.max(Math.round(currentWidth / 2), targetWidth);
    const nextHeight = Math.max(Math.round(currentHeight / 2), targetHeight);

    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextWidth;
    stepCanvas.height = nextHeight;

    const stepCtx = stepCanvas.getContext('2d')!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentSource, 0, 0, nextWidth, nextHeight);

    currentSource = stepCanvas;
    currentWidth = nextWidth;
    currentHeight = nextHeight;
  }

  // Final step to exact target dimensions
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;

  const finalCtx = finalCanvas.getContext('2d')!;
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(currentSource, 0, 0, targetWidth, targetHeight);

  return finalCanvas;
}

/**
 * Convert image to optimized format (WebP or JPEG) with optional resizing
 * Uses step-down resizing for high-quality results on all browsers
 */
function convertToOptimizedFormat(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  mimeType: 'image/webp' | 'image/jpeg'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Use step-down resizing for high-quality downsampling
    const canvas = stepDownResize(img, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`Failed to convert image to ${mimeType}`));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Generate a thumbnail from an image
 * Uses step-down resizing for high-quality results on all browsers
 */
function generateThumbnail(
  img: HTMLImageElement,
  maxSize: number,
  quality: number,
  mimeType: 'image/webp' | 'image/jpeg' = 'image/webp'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const { width, height } = calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      maxSize
    );

    // Use step-down resizing for high-quality downsampling
    const canvas = stepDownResize(img, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      },
      mimeType,
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
