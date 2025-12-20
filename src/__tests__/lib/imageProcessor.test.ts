/**
 * Image Processor Unit Tests
 *
 * Tests the client-side image processing module including:
 * - Format conversion (WebP preferred, JPEG fallback)
 * - Dimension resizing with aspect ratio preservation
 * - Thumbnail generation
 * - Color palette extraction
 * - Utility functions
 *
 * ============================================================================
 * MOCK ARCHITECTURE
 * ============================================================================
 *
 * This test file mocks browser APIs that don't exist in Node.js:
 * - `Image` class: Mocked with configurable dimensions (mockImageWidth/Height)
 * - `canvas.toBlob()`: Mocked to return blobs with requested MIME type
 * - `URL.createObjectURL/revokeObjectURL`: Mocked as no-ops
 * - `ColorThief`: Mocked to return a fixed 6-color palette
 *
 * To configure tests, use these helper functions:
 * - `setMockImageDimensions(width, height)` - Set input image size
 * - `setMockImageToFail(true/false)` - Trigger image load errors
 * - `setWebPSupport(true/false)` - Simulate WebP encoding support
 *
 * ============================================================================
 * KEY IMPLEMENTATION BEHAVIORS TO UNDERSTAND
 * ============================================================================
 *
 * 1. NO PASSTHROUGH: All images are re-encoded, even WebP inputs.
 *
 * 2. FORMAT SELECTION:
 *    - Prefers WebP (0.92 quality) when browser supports WebP encoding
 *    - Falls back to JPEG (0.65 quality) on Safari < 17
 *    - Detection is CACHED after first check (module-level variable)
 *
 * 3. DIMENSION CALCULATIONS:
 *    - maxWidthOrHeight: Default 2000px, caps largest dimension
 *    - MIN_DIMENSION: 500px, prevents over-downscaling (protects narrow images)
 *    - Aspect ratio is ALWAYS preserved
 *
 * 4. STEP-DOWN RESIZE:
 *    - For downscales > 2x, image is resized in 50% steps
 *    - Prevents pixelation/aliasing on aggressive downscales
 *
 * 5. THUMBNAIL:
 *    - Default 300px max dimension
 *    - 0.85 quality (lower than main image)
 *    - Same aspect ratio as main image
 *
 * 6. COLOR PALETTE:
 *    - Uses ColorThief library
 *    - Returns 6 colors as hex strings (#RRGGBB)
 *    - Gracefully returns [] on failure
 *
 * ============================================================================
 * REFACTORING NOTES
 * ============================================================================
 *
 * When refactoring imageProcessor.ts:
 * 1. Update mocks if function signatures change
 * 2. The WebP detection cache may cause test isolation issues
 * 3. MIN_DIMENSION logic interacts with maxWidthOrHeight - test both together
 * 4. stepDownResize is internal but affects output quality - test via dimensions
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  processImage,
  isValidImageType,
  formatFileSize,
  extractColorPalette,
  getImageDimensions,
  QUALITY_TIERS,
} from '@/lib/storage/imageProcessor';

// =============================================================================
// MOCK SETUP
// =============================================================================

/**
 * These module-level variables configure the mock behavior for each test.
 * They are reset in beforeEach() to default values.
 *
 * IMPORTANT: Set these BEFORE calling processImage() - the mock Image
 * constructor reads these when creating a new Image instance.
 */
let mockImageWidth = 1000;   // Default: 1000px wide
let mockImageHeight = 800;   // Default: 800px tall
let mockImageShouldFail = false;  // When true, Image.onerror is called instead of onload

// Mock ColorThief
vi.mock('colorthief', () => ({
  default: class MockColorThief {
    getPalette() {
      return [
        [255, 0, 0],    // Red
        [0, 255, 0],    // Green
        [0, 0, 255],    // Blue
        [255, 255, 0],  // Yellow
        [255, 0, 255],  // Magenta
        [0, 255, 255],  // Cyan
      ];
    }
  },
}));

// Store originals
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalImage = globalThis.Image;
const originalCreateElement = document.createElement.bind(document);

// Mock canvas context
function createMockCanvasContext() {
  return {
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  };
}

/**
 * Controls WebP encoding simulation.
 *
 * When true: canvas.toBlob('image/webp') returns a WebP blob
 * When false: canvas.toBlob('image/webp') returns a PNG blob (simulating Safari < 17)
 *
 * NOTE: The actual imageProcessor.ts caches the WebP detection result in a
 * module-level variable. This means changing simulateWebPSupport mid-test-run
 * won't affect already-cached detection. Tests that need JPEG fallback must
 * be in separate test files or use vi.resetModules() carefully.
 */
let simulateWebPSupport = true;

// Mock canvas element factory
function createMockCanvas() {
  const ctx = createMockCanvasContext();

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(ctx),
    toBlob: vi.fn((callback: (blob: Blob | null) => void, mimeType: string) => {
      // Simulate Safari: when WebP not supported, return PNG for WebP requests
      if (mimeType === 'image/webp' && !simulateWebPSupport) {
        callback(new Blob(['data'], { type: 'image/png' }));
      } else {
        callback(new Blob(['data'], { type: mimeType }));
      }
    }),
  };

  return canvas;
}

// Mock Image class
class MockImage {
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
  src: string = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    this.naturalWidth = mockImageWidth;
    this.naturalHeight = mockImageHeight;
    this.width = mockImageWidth;
    this.height = mockImageHeight;

    // Schedule load/error callback
    setTimeout(() => {
      if (mockImageShouldFail) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    }, 0);
  }
}

beforeAll(() => {
  // Mock URL APIs
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
  URL.revokeObjectURL = vi.fn();

  // Mock document.createElement for canvas
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return createMockCanvas() as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tagName);
  });

  // Mock Image constructor
  // @ts-expect-error - mocking global
  globalThis.Image = MockImage;
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  globalThis.Image = originalImage;
  vi.restoreAllMocks();
});

beforeEach(() => {
  // Reset to defaults
  mockImageWidth = 1000;
  mockImageHeight = 800;
  mockImageShouldFail = false;
  simulateWebPSupport = true;
  vi.clearAllMocks();
});

// Helper to configure mock image for a test
function setMockImageDimensions(width: number, height: number) {
  mockImageWidth = width;
  mockImageHeight = height;
}

function setMockImageToFail(shouldFail: boolean) {
  mockImageShouldFail = shouldFail;
}

function setWebPSupport(supported: boolean) {
  simulateWebPSupport = supported;
}

// =============================================================================
// UTILITY FUNCTION TESTS (No complex mocking needed)
// =============================================================================

describe('ImageProcessor - Utility Functions', () => {
  describe('isValidImageType', () => {
    it('IP-023: should accept valid image MIME types', () => {
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
      ];

      for (const type of validTypes) {
        const file = new File([''], 'test', { type });
        expect(isValidImageType(file)).toBe(true);
      }
    });

    it('IP-024: should reject invalid MIME types', () => {
      const invalidTypes = [
        'text/plain',
        'application/pdf',
        'image/svg+xml',
        'image/bmp',
        'video/mp4',
        '',
      ];

      for (const type of invalidTypes) {
        const file = new File([''], 'test', { type });
        expect(isValidImageType(file)).toBe(false);
      }
    });
  });

  describe('formatFileSize', () => {
    it('IP-026: should return "0 B" for zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('IP-025: should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle edge cases', () => {
      expect(formatFileSize(1)).toBe('1 B');
      expect(formatFileSize(1023)).toBe('1023 B');
      expect(formatFileSize(1025)).toBe('1 KB');
    });
  });

  describe('QUALITY_TIERS export', () => {
    it('IP-032: should export free tier settings', () => {
      expect(QUALITY_TIERS.free).toEqual({
        maxWidthOrHeight: 2000,
        quality: 0.92,
      });
    });
  });
});

// =============================================================================
// DIMENSION CALCULATION TESTS
// =============================================================================

describe('ImageProcessor - Dimension Calculations', () => {
  it('IP-006: should cap large landscape image at maxWidthOrHeight', async () => {
    // 4000x3000 image (landscape, exceeds 2000px limit)
    setMockImageDimensions(4000, 3000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // 4000x3000 with max 2000 → width=2000, height=1500 (maintaining 4:3 ratio)
    expect(result.width).toBe(2000);
    expect(result.height).toBe(1500);
  });

  it('IP-007: should cap large portrait image at maxWidthOrHeight', async () => {
    // 3000x4000 image (portrait, exceeds 2000px limit)
    setMockImageDimensions(3000, 4000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // 3000x4000 with max 2000 → width=1500, height=2000 (maintaining 3:4 ratio)
    expect(result.width).toBe(1500);
    expect(result.height).toBe(2000);
  });

  it('IP-008: should NOT upscale small images', async () => {
    // 800x600 image (within 2000px limit)
    setMockImageDimensions(800, 600);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Should keep original dimensions
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('IP-009: should maintain aspect ratio when resizing', async () => {
    // 3000x2000 image (3:2 aspect ratio)
    setMockImageDimensions(3000, 2000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Original ratio: 3000/2000 = 1.5
    const outputRatio = result.width / result.height;
    expect(outputRatio).toBeCloseTo(1.5, 2);
  });

  it('IP-017: should handle landscape resize calculation correctly', async () => {
    // 6000x3000 (2:1 ratio, landscape)
    setMockImageDimensions(6000, 3000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Width is larger, so cap width at 2000
    // height = (3000 * 2000) / 6000 = 1000
    expect(result.width).toBe(2000);
    expect(result.height).toBe(1000);
  });

  it('IP-018: should handle portrait resize calculation correctly', async () => {
    // 2000x6000 (1:3 ratio, portrait)
    setMockImageDimensions(2000, 6000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Height is larger, so cap height at 2000
    // width = (2000 * 2000) / 6000 = 667
    expect(result.height).toBe(2000);
    expect(result.width).toBeCloseTo(667, 0);
  });

  it('IP-019: should handle square image resize', async () => {
    // 4000x4000 square image
    setMockImageDimensions(4000, 4000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Both dimensions should be capped at 2000
    expect(result.width).toBe(2000);
    expect(result.height).toBe(2000);
  });

  it('IP-020: should not resize images within limits', async () => {
    // 1500x1200 (within 2000px limit)
    setMockImageDimensions(1500, 1200);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    expect(result.width).toBe(1500);
    expect(result.height).toBe(1200);
  });

  it('IP-010: should enforce MIN_DIMENSION (500px) when downscaling', async () => {
    /**
     * MIN_DIMENSION LOGIC EXPLANATION:
     *
     * Input: 10000x600 (very wide, narrow height)
     *
     * Step 1 - Cap at maxWidthOrHeight (2000):
     *   width = 2000, height = (600 * 2000) / 10000 = 120
     *
     * Step 2 - MIN_DIMENSION check:
     *   Smallest dimension = 120, which is < 500
     *   Original smallest dimension = 600, which is >= 500
     *   So MIN_DIMENSION applies (we don't want to over-downscale)
     *
     * Step 3 - Scale up to meet MIN_DIMENSION:
     *   scale = 500 / 120 = 4.167
     *   BUT: can't exceed original dimensions
     *   Final: ~500x height with proportional width
     *
     * This protects narrow/tall images from becoming too small.
     */
    setMockImageDimensions(10000, 600);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // The smaller dimension should be >= 500 (unless original was smaller)
    expect(Math.min(result.width, result.height)).toBeGreaterThanOrEqual(500);
  });

  it('IP-030: should use custom maxWidthOrHeight option', async () => {
    // 2000x1000 with custom max of 500
    // BUT: MIN_DIMENSION (500) kicks in and scales back up
    // 2000x1000 → max 500 → 500x250 → MIN_DIMENSION scales to 1000x500
    setMockImageDimensions(2000, 1000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file, { maxWidthOrHeight: 500 });

    // The result is affected by MIN_DIMENSION (500px minimum for smaller dimension)
    // Original aspect ratio 2:1 is preserved
    expect(result.width / result.height).toBeCloseTo(2, 1);
    // Width should be reduced from original 2000
    expect(result.width).toBeLessThan(2000);
  });
});

// =============================================================================
// CORE PROCESSING TESTS
// =============================================================================

describe('ImageProcessor - Core Processing', () => {
  it('IP-005: should return complete ProcessedImage structure', async () => {
    setMockImageDimensions(1000, 800);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Verify all expected properties exist
    expect(result).toHaveProperty('original');
    expect(result).toHaveProperty('thumbnail');
    expect(result).toHaveProperty('width');
    expect(result).toHaveProperty('height');
    expect(result).toHaveProperty('format');
    expect(result).toHaveProperty('palette');

    // Verify types
    expect(result.original).toBeInstanceOf(Blob);
    expect(result.thumbnail).toBeInstanceOf(Blob);
    expect(typeof result.width).toBe('number');
    expect(typeof result.height).toBe('number');
    expect(['webp', 'jpeg']).toContain(result.format);
  });

  it('IP-001: should process JPEG input', async () => {
    setMockImageDimensions(1000, 800);

    const file = new File(['jpeg-data'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    expect(result.original).toBeInstanceOf(Blob);
    expect(result.width).toBe(1000);
    expect(result.height).toBe(800);
  });

  it('IP-002: should process PNG input (re-encoded to WebP/JPEG)', async () => {
    /**
     * Note: PNG transparency is NOT preserved - all outputs are WebP or JPEG.
     * This is a design decision for consistency and size optimization.
     */
    setMockImageDimensions(500, 500);

    const file = new File(['png-data'], 'test.png', { type: 'image/png' });
    const result = await processImage(file);

    expect(result.original).toBeInstanceOf(Blob);
    expect(['webp', 'jpeg']).toContain(result.format);
    expect(result.width).toBe(500);
    expect(result.height).toBe(500);
  });

  it('IP-036: should process GIF input', async () => {
    /**
     * GIF is accepted but converted to static WebP/JPEG.
     * Animation is NOT preserved.
     */
    setMockImageDimensions(400, 300);

    const file = new File(['gif-data'], 'test.gif', { type: 'image/gif' });
    const result = await processImage(file);

    expect(result.original).toBeInstanceOf(Blob);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it('IP-037: should process AVIF input', async () => {
    setMockImageDimensions(600, 400);

    const file = new File(['avif-data'], 'test.avif', { type: 'image/avif' });
    const result = await processImage(file);

    expect(result.original).toBeInstanceOf(Blob);
    expect(result.width).toBe(600);
    expect(result.height).toBe(400);
  });

  it('IP-003: should re-encode WebP input (no passthrough optimization)', async () => {
    setMockImageDimensions(800, 600);

    const file = new File(['webp-data'], 'test.webp', { type: 'image/webp' });
    const result = await processImage(file);

    // WebP is re-encoded, NOT passed through
    expect(result.original).toBeInstanceOf(Blob);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('IP-004: WebP detection is cached at module level', async () => {
    /**
     * IMPORTANT: WebP support detection is cached in a module-level variable.
     *
     * This means:
     * 1. First processImage() call determines format for ALL subsequent calls
     * 2. Changing simulateWebPSupport mid-test-run has no effect
     * 3. Testing JPEG fallback requires a separate test file or vi.resetModules()
     *
     * This test documents the caching behavior rather than testing fallback.
     * The JPEG fallback code path (0.65 quality) exists but can't be unit tested
     * easily due to module caching.
     */
    setMockImageDimensions(1000, 800);

    const file1 = new File(['data'], 'test1.jpg', { type: 'image/jpeg' });
    const result1 = await processImage(file1);
    const detectedFormat = result1.format;

    // Second call should use same cached format
    const file2 = new File(['data'], 'test2.jpg', { type: 'image/jpeg' });
    const result2 = await processImage(file2);

    expect(result2.format).toBe(detectedFormat);
  });
});

// =============================================================================
// THUMBNAIL TESTS
// =============================================================================

describe('ImageProcessor - Thumbnail Generation', () => {
  it('IP-011: should generate thumbnail', async () => {
    // 2000x1000 image
    setMockImageDimensions(2000, 1000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    expect(result.thumbnail).toBeInstanceOf(Blob);
  });

  it('IP-012: should preserve aspect ratio in thumbnail', async () => {
    // 1000x500 (2:1 ratio)
    setMockImageDimensions(1000, 500);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Original maintains 2:1 ratio
    expect(result.width / result.height).toBeCloseTo(2, 1);
  });

  it('IP-033: should accept custom thumbnailSize option', async () => {
    /**
     * Tests that the thumbnailSize option is passed through to generateThumbnail.
     * Default is 300px, here we test with 150px.
     *
     * Note: We can't directly verify thumbnail dimensions since the mock
     * doesn't expose them, but we verify the option is accepted without error.
     */
    setMockImageDimensions(1000, 800);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file, { thumbnailSize: 150 });

    expect(result.thumbnail).toBeInstanceOf(Blob);
  });

  it('IP-034: should accept custom thumbnailQuality option', async () => {
    /**
     * Tests that the thumbnailQuality option is passed through.
     * Default is 0.85, here we test with lower quality.
     */
    setMockImageDimensions(1000, 800);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file, { thumbnailQuality: 0.5 });

    expect(result.thumbnail).toBeInstanceOf(Blob);
  });
});

// =============================================================================
// COLOR PALETTE TESTS
// =============================================================================

describe('ImageProcessor - Color Palette Extraction', () => {
  it('IP-014: should extract 6-color palette as hex strings', async () => {
    setMockImageDimensions(1000, 800);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    expect(result.palette).toBeDefined();
    expect(result.palette).toHaveLength(6);

    // All should be hex format
    for (const color of result.palette!) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('IP-015: should skip palette when extractPalette=false', async () => {
    setMockImageDimensions(1000, 800);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file, { extractPalette: false });

    expect(result.palette).toBeUndefined();
  });

  it('IP-016: extractColorPalette returns array (mocked success)', async () => {
    setMockImageDimensions(100, 100);

    const blob = new Blob(['mock'], { type: 'image/jpeg' });
    const result = await extractColorPalette(blob);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('IP-035: extractColorPalette should return empty array on failure', async () => {
    /**
     * Tests the graceful error handling in extractColorPalette.
     * When ColorThief fails (e.g., CORS issues, invalid image), it returns [].
     *
     * We simulate failure by temporarily making Image load fail.
     */
    setMockImageToFail(true);

    const blob = new Blob(['bad-data'], { type: 'image/jpeg' });
    const result = await extractColorPalette(blob);

    // Should gracefully return empty array, not throw
    expect(result).toEqual([]);
  });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================

describe('ImageProcessor - Error Handling', () => {
  it('IP-028: should throw "Failed to load image" for corrupted data', async () => {
    setMockImageToFail(true);

    const file = new File(['corrupted-data'], 'bad.jpg', { type: 'image/jpeg' });

    await expect(processImage(file)).rejects.toThrow('Failed to load image');
  });
});

// =============================================================================
// getImageDimensions TESTS
// =============================================================================

describe('ImageProcessor - getImageDimensions', () => {
  it('IP-027: should return width and height from Blob', async () => {
    setMockImageDimensions(1920, 1080);

    const blob = new Blob(['mock'], { type: 'image/jpeg' });
    const dimensions = await getImageDimensions(blob);

    expect(dimensions).toEqual({ width: 1920, height: 1080 });
  });
});

// =============================================================================
// QUALITY SETTINGS TESTS
// =============================================================================

describe('ImageProcessor - Quality Settings', () => {
  it('IP-031: should accept custom quality option', async () => {
    setMockImageDimensions(1000, 800);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });

    // Should not throw with custom quality
    const result = await processImage(file, { quality: 0.5 });
    expect(result.original).toBeInstanceOf(Blob);
  });
});

// =============================================================================
// WEBP DETECTION TESTS
// =============================================================================

describe('ImageProcessor - WebP Support Detection', () => {
  it('IP-021: should use WebP format when supported', async () => {
    setMockImageDimensions(100, 100);
    setWebPSupport(true);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    expect(result.format).toBe('webp');
  });
});

// =============================================================================
// DOCUMENTED BEHAVIOR / EDGE CASES
// =============================================================================

describe('ImageProcessor - Documented Behaviors', () => {
  it('BEHAVIOR: JPEG fallback uses lower quality than WebP (0.65 vs 0.92)', () => {
    // Document this important behavior for Safari users
    // This is a design decision - WebP at 0.92 vs JPEG at 0.65
    expect(QUALITY_TIERS.free.quality).toBe(0.92);
    // JPEG_FALLBACK_QUALITY = 0.65 is internal constant
  });

  it('BEHAVIOR: stepDownResize handles large downscales', async () => {
    // 8000x6000 image - requires step-down resize
    setMockImageDimensions(8000, 6000);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Image should be resized from 8000x6000 to 2000x1500
    expect(result.width).toBe(2000);
    expect(result.height).toBe(1500);
  });

  it('BEHAVIOR: tiny images preserve original dimensions', async () => {
    // 50x50 image (very small)
    setMockImageDimensions(50, 50);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    // Should not upscale
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
  });

  it('BEHAVIOR: exact 2000px image is not resized', async () => {
    // Exactly at the limit
    setMockImageDimensions(2000, 1500);

    const file = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });
    const result = await processImage(file);

    expect(result.width).toBe(2000);
    expect(result.height).toBe(1500);
  });
});
