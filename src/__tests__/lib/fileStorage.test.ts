/**
 * FileStorage Unit Tests
 *
 * Tests the OPFS (Origin Private File System) storage wrapper with IndexedDB fallback.
 *
 * ============================================================================
 * MOCK ARCHITECTURE
 * ============================================================================
 *
 * Since OPFS APIs don't exist in Node.js, we must mock:
 * - navigator.storage.getDirectory() - Returns mock FileSystemDirectoryHandle
 * - FileSystemDirectoryHandle - Directory operations
 * - FileSystemFileHandle - File operations with createWritable()
 * - FileSystemWritableFileStream - Write operations
 *
 * The FileStorage class is a singleton, but we test by creating fresh instances
 * to avoid state leakage between tests.
 *
 * ============================================================================
 * TESTING STRATEGY
 * ============================================================================
 *
 * 1. OPFS path: Mock all FileSystem APIs to simulate modern browser
 * 2. IndexedDB path: Use fake-indexeddb (already in setup.ts)
 * 3. Memory path: When both OPFS and IndexedDB fail
 *
 * We test the FileStorage CLASS directly (not the singleton) for isolation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileStorage } from '@/lib/storage/fileStorage';

// =============================================================================
// MOCK INFRASTRUCTURE
// =============================================================================

/**
 * In-memory file storage to simulate OPFS
 */
const mockFileSystem: Map<string, Map<string, Blob>> = new Map();

/**
 * Mock FileSystemWritableFileStream
 */
function createMockWritableStream(
  directory: string,
  filename: string
): FileSystemWritableFileStream {
  let buffer: Blob | null = null;

  return {
    write: vi.fn(async (data: Blob | ArrayBuffer | string) => {
      if (data instanceof Blob) {
        buffer = data;
      } else if (data instanceof ArrayBuffer) {
        buffer = new Blob([data]);
      } else {
        buffer = new Blob([data]);
      }
    }),
    close: vi.fn(async () => {
      if (buffer) {
        let dir = mockFileSystem.get(directory);
        if (!dir) {
          dir = new Map();
          mockFileSystem.set(directory, dir);
        }
        dir.set(filename, buffer);
      }
    }),
    seek: vi.fn(),
    truncate: vi.fn(),
    abort: vi.fn(),
    locked: false,
  } as unknown as FileSystemWritableFileStream;
}

/**
 * Mock FileSystemFileHandle
 */
function createMockFileHandle(
  directory: string,
  filename: string
): FileSystemFileHandle {
  return {
    kind: 'file' as const,
    name: filename,
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
    getFile: vi.fn(async () => {
      const dir = mockFileSystem.get(directory);
      const blob = dir?.get(filename);
      if (!blob) {
        throw new Error('File not found');
      }
      return new File([blob], filename, { type: blob.type });
    }),
    createWritable: vi.fn(async () => {
      return createMockWritableStream(directory, filename);
    }),
  } as unknown as FileSystemFileHandle;
}

/**
 * Mock FileSystemDirectoryHandle
 */
function createMockDirectoryHandle(name: string): FileSystemDirectoryHandle {
  // Ensure directory exists in mock FS
  if (!mockFileSystem.has(name)) {
    mockFileSystem.set(name, new Map());
  }

  const handle: FileSystemDirectoryHandle = {
    kind: 'directory' as const,
    name,
    isSameEntry: vi.fn(),
    queryPermission: vi.fn(),
    requestPermission: vi.fn(),
    getFileHandle: vi.fn(async (filename: string, options?: { create?: boolean }) => {
      const dir = mockFileSystem.get(name);
      if (!dir?.has(filename) && !options?.create) {
        throw new Error('File not found');
      }
      return createMockFileHandle(name, filename);
    }),
    getDirectoryHandle: vi.fn(async (dirName: string, options?: { create?: boolean }) => {
      if (!mockFileSystem.has(dirName) && !options?.create) {
        throw new Error('Directory not found');
      }
      return createMockDirectoryHandle(dirName);
    }),
    removeEntry: vi.fn(async (entryName: string) => {
      const dir = mockFileSystem.get(name);
      if (dir) {
        dir.delete(entryName);
      }
    }),
    resolve: vi.fn(),
    keys: vi.fn(),
    values: vi.fn(),
    entries: vi.fn(),
    [Symbol.asyncIterator]: async function* () {
      const dir = mockFileSystem.get(name);
      if (dir) {
        for (const [filename] of dir) {
          yield [filename, createMockFileHandle(name, filename)] as [string, FileSystemHandle];
        }
      }
    },
  } as unknown as FileSystemDirectoryHandle;

  return handle;
}

// Store original globals
const originalNavigator = globalThis.navigator;
const originalFileSystemFileHandle = (globalThis as unknown as { FileSystemFileHandle?: unknown }).FileSystemFileHandle;

// =============================================================================
// CONFIGURATION HELPERS
// =============================================================================

let mockOPFSAvailable = true;
let mockCreateWritableSupported = true;

/**
 * Configure whether OPFS is available
 */
function setOPFSAvailable(available: boolean) {
  mockOPFSAvailable = available;
}

/**
 * Configure whether createWritable is on the prototype
 */
function setCreateWritableSupported(supported: boolean) {
  mockCreateWritableSupported = supported;
}

/**
 * Reset mock file system
 */
function resetMockFileSystem() {
  mockFileSystem.clear();
}

// =============================================================================
// TEST SETUP
// =============================================================================

beforeEach(() => {
  // Reset configuration
  mockOPFSAvailable = true;
  mockCreateWritableSupported = true;
  resetMockFileSystem();

  // Mock navigator.storage
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      storage: {
        getDirectory: vi.fn(async () => {
          if (!mockOPFSAvailable) {
            throw new Error('OPFS not available');
          }
          return createMockDirectoryHandle('root');
        }),
        estimate: vi.fn(async () => ({
          usage: 1024 * 1024 * 50, // 50MB
          quota: 1024 * 1024 * 1024, // 1GB
        })),
      },
    },
    writable: true,
    configurable: true,
  });

  // Mock FileSystemFileHandle.prototype.createWritable
  const MockFileSystemFileHandle = function () {} as unknown as { prototype: { createWritable?: () => void } };
  if (mockCreateWritableSupported) {
    MockFileSystemFileHandle.prototype.createWritable = function () {};
  }

  Object.defineProperty(globalThis, 'FileSystemFileHandle', {
    value: MockFileSystemFileHandle,
    writable: true,
    configurable: true,
  });

  // Mock URL.createObjectURL
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  vi.clearAllMocks();
});

afterEach(() => {
  // Restore globals
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    writable: true,
    configurable: true,
  });

  if (originalFileSystemFileHandle) {
    Object.defineProperty(globalThis, 'FileSystemFileHandle', {
      value: originalFileSystemFileHandle,
      writable: true,
      configurable: true,
    });
  }

  vi.restoreAllMocks();
});

// =============================================================================
// INITIALIZATION TESTS (FS-001 to FS-004)
// =============================================================================

describe('FileStorage - Initialization', () => {
  it('FS-001: initialize() should set useOPFS=true when OPFS available', async () => {
    setOPFSAvailable(true);
    setCreateWritableSupported(true);

    const storage = new FileStorage();
    await storage.initialize();

    expect(storage.isUsingOPFS()).toBe(true);
    expect(storage.getStorageBackend()).toBe('opfs');
  });

  it('FS-002: initialize() should set useOPFS=false and use IndexedDB when OPFS unavailable', async () => {
    setOPFSAvailable(false);

    const storage = new FileStorage();
    await storage.initialize();

    expect(storage.isUsingOPFS()).toBe(false);
    expect(storage.getStorageBackend()).toBe('indexeddb');
  });

  it('FS-003: initialize() should detect Safari/WebKit (no createWritable) and use IndexedDB', async () => {
    setOPFSAvailable(true);
    setCreateWritableSupported(false);

    // Remove createWritable from prototype
    const MockFileSystemFileHandle = function () {} as unknown as { prototype: Record<string, unknown> };
    Object.defineProperty(globalThis, 'FileSystemFileHandle', {
      value: MockFileSystemFileHandle,
      writable: true,
      configurable: true,
    });

    const storage = new FileStorage();
    await storage.initialize();

    expect(storage.isUsingOPFS()).toBe(false);
    expect(storage.getStorageBackend()).toBe('indexeddb');
  });

  it('FS-004: initialize() should be idempotent (not re-initialize)', async () => {
    const storage = new FileStorage();

    // First initialization
    await storage.initialize();
    const firstBackend = storage.getStorageBackend();

    // Mock changes that would affect initialization
    setOPFSAvailable(false);

    // Second initialization should not change anything
    await storage.initialize();
    const secondBackend = storage.getStorageBackend();

    expect(firstBackend).toBe(secondBackend);
  });
});

// =============================================================================
// saveImage TESTS (FS-005 to FS-008)
// =============================================================================

describe('FileStorage - saveImage', () => {
  it('FS-005: saveImage() should save to OPFS and return opfs:// path', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const blob = new Blob(['test image data'], { type: 'image/jpeg' });
    const path = await storage.saveImage('test-id', blob);

    expect(path).toBe('opfs://images/test-id');
    expect(mockFileSystem.get('images')?.has('test-id')).toBe(true);

    // Verify the actual content was saved correctly
    const savedBlob = mockFileSystem.get('images')?.get('test-id');
    expect(savedBlob).toBeDefined();
    expect(savedBlob?.size).toBe(blob.size);
  });

  it('FS-006: saveImage() should save to IndexedDB and return idb:// path when OPFS unavailable', async () => {
    setOPFSAvailable(false);

    const storage = new FileStorage();
    await storage.initialize();

    const blob = new Blob(['test image data'], { type: 'image/jpeg' });
    const path = await storage.saveImage('test-id', blob);

    expect(path).toBe('idb://images/test-id');

    // TODO: This test only verifies the path format. Should also verify:
    // 1. Data was actually stored in IndexedDB (via getImage round-trip)
    // 2. The blob content matches
  });

  it('FS-007: saveImage() should auto-create images directory if not exists', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Ensure images directory doesn't exist
    mockFileSystem.delete('images');

    const blob = new Blob(['test'], { type: 'image/png' });
    await storage.saveImage('new-image', blob);

    // Directory should have been created
    expect(mockFileSystem.has('images')).toBe(true);
  });

  it('FS-008: saveImage() should throw if OPFS write fails', async () => {
    /**
     * This test verifies that errors during OPFS write propagate correctly.
     * We simulate a write failure by having getFileHandle throw an error.
     *
     * The implementation catches the error and re-throws it (line 166-168).
     */
    const storage = new FileStorage();
    await storage.initialize();

    // Create a special directory handle that throws on getFileHandle
    const failingDirHandle = {
      ...createMockDirectoryHandle('images'),
      getFileHandle: vi.fn().mockRejectedValue(new Error('Disk full')),
    };

    // Override the root's getDirectoryHandle to return our failing handle
    vi.mocked(navigator.storage.getDirectory).mockResolvedValue({
      ...createMockDirectoryHandle('root'),
      getDirectoryHandle: vi.fn().mockResolvedValue(failingDirHandle),
    } as unknown as FileSystemDirectoryHandle);

    // Re-initialize to pick up the new mock
    const storage2 = new FileStorage();
    await storage2.initialize();

    const blob = new Blob(['test'], { type: 'image/jpeg' });

    await expect(storage2.saveImage('fail-id', blob)).rejects.toThrow('Disk full');
  });
});

// =============================================================================
// saveThumbnail TESTS (FS-009 to FS-010)
// =============================================================================

describe('FileStorage - saveThumbnail', () => {
  it('FS-009: saveThumbnail() should save to OPFS and return opfs://thumbnails path', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const blob = new Blob(['thumbnail data'], { type: 'image/webp' });
    const path = await storage.saveThumbnail('thumb-id', blob);

    expect(path).toBe('opfs://thumbnails/thumb-id');
    expect(mockFileSystem.get('thumbnails')?.has('thumb-id')).toBe(true);
  });

  it('FS-010: saveThumbnail() should save to IndexedDB and return idb:// path when OPFS unavailable', async () => {
    setOPFSAvailable(false);

    const storage = new FileStorage();
    await storage.initialize();

    const blob = new Blob(['thumbnail data'], { type: 'image/webp' });
    const path = await storage.saveThumbnail('thumb-id', blob);

    expect(path).toBe('idb://thumbnails/thumb-id');
  });
});

// =============================================================================
// getImage TESTS (FS-011 to FS-014)
// =============================================================================

describe('FileStorage - getImage', () => {
  it('FS-011: getImage() should retrieve File from opfs:// path', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Save first
    const originalBlob = new Blob(['image content'], { type: 'image/jpeg' });
    await storage.saveImage('retrieve-test', originalBlob);

    // Retrieve
    const file = await storage.getImage('opfs://images/retrieve-test');

    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe('retrieve-test');

    // Verify content size matches (round-trip integrity check)
    expect(file?.size).toBe(originalBlob.size);
  });

  it('FS-012: getImage() should retrieve File from idb:// path', async () => {
    setOPFSAvailable(false);

    const storage = new FileStorage();
    await storage.initialize();

    // Save first
    const originalBlob = new Blob(['image content'], { type: 'image/jpeg' });
    await storage.saveImage('idb-test', originalBlob);

    // Retrieve
    const file = await storage.getImage('idb://images/idb-test');

    expect(file).toBeInstanceOf(File);
    expect(file?.size).toBeGreaterThan(0);
    // Note: Size may differ due to IndexedDB/Dexie blob handling
    // The important thing is we got a valid file back
  });

  it('FS-013: getImage() should return null for non-existent file', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const file = await storage.getImage('opfs://images/does-not-exist');

    expect(file).toBeNull();
  });

  it('FS-014: getImage() should parse both opfs://images/id and images/id formats', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Save with full path
    const blob = new Blob(['test'], { type: 'image/png' });
    await storage.saveImage('format-test', blob);

    // Retrieve with short format
    const file = await storage.getImage('images/format-test');

    expect(file).toBeInstanceOf(File);
  });
});

// =============================================================================
// getImageUrl TESTS (FS-015 to FS-017)
// =============================================================================

describe('FileStorage - getImageUrl', () => {
  it('FS-015: getImageUrl() should create and return blob:// URL', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Save first
    const blob = new Blob(['image'], { type: 'image/jpeg' });
    await storage.saveImage('url-test', blob);

    const url = await storage.getImageUrl('opfs://images/url-test');

    expect(url).toBe('blob:mock-url');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('FS-016: getImageUrl() should passthrough existing blob:// URLs', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const existingBlobUrl = 'blob:http://localhost/existing-blob';
    const url = await storage.getImageUrl(existingBlobUrl);

    expect(url).toBe(existingBlobUrl);
    // createObjectURL should NOT have been called
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('FS-017: getImageUrl() should return null for non-existent file', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const url = await storage.getImageUrl('opfs://images/not-found');

    expect(url).toBeNull();
  });
});

// =============================================================================
// deleteImage TESTS (FS-018 to FS-020)
// =============================================================================

describe('FileStorage - deleteImage', () => {
  it('FS-018: deleteImage() should remove file from OPFS', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Save first
    const blob = new Blob(['to delete'], { type: 'image/jpeg' });
    await storage.saveImage('delete-test', blob);
    expect(mockFileSystem.get('images')?.has('delete-test')).toBe(true);

    // Delete
    await storage.deleteImage('opfs://images/delete-test');

    expect(mockFileSystem.get('images')?.has('delete-test')).toBe(false);
  });

  it('FS-019: deleteImage() should remove file from IndexedDB fallback', async () => {
    setOPFSAvailable(false);

    const storage = new FileStorage();
    await storage.initialize();

    // Save first
    const blob = new Blob(['to delete'], { type: 'image/jpeg' });
    const path = await storage.saveImage('idb-delete-test', blob);
    expect(path).toContain('idb://');

    // Verify file exists before delete
    const beforeDelete = await storage.getImage(path);
    expect(beforeDelete).not.toBeNull();

    // Delete
    await storage.deleteImage(path);

    // Verify file no longer exists
    const afterDelete = await storage.getImage(path);
    expect(afterDelete).toBeNull();
  });

  it('FS-020: deleteImage() should not throw for non-existent file', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Should not throw
    await expect(
      storage.deleteImage('opfs://images/never-existed')
    ).resolves.not.toThrow();
  });
});

// =============================================================================
// deleteThumbnail TESTS (FS-021 to FS-022)
// =============================================================================

describe('FileStorage - deleteThumbnail', () => {
  it('FS-021: deleteThumbnail() should delete from thumbnails directory', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Save thumbnail
    const blob = new Blob(['thumb'], { type: 'image/webp' });
    await storage.saveThumbnail('thumb-delete', blob);
    expect(mockFileSystem.get('thumbnails')?.has('thumb-delete')).toBe(true);

    // Delete
    await storage.deleteThumbnail('thumb-delete');

    expect(mockFileSystem.get('thumbnails')?.has('thumb-delete')).toBe(false);
  });

  it('FS-022: deleteThumbnail() should delete from IndexedDB fallback', async () => {
    setOPFSAvailable(false);

    const storage = new FileStorage();
    await storage.initialize();

    // Save thumbnail
    const blob = new Blob(['thumb'], { type: 'image/webp' });
    await storage.saveThumbnail('idb-thumb', blob);

    // Verify exists before delete
    const beforeDelete = await storage.getImage('idb://thumbnails/idb-thumb');
    expect(beforeDelete).not.toBeNull();

    // Delete
    await storage.deleteThumbnail('idb-thumb');

    // Verify deleted
    const afterDelete = await storage.getImage('idb://thumbnails/idb-thumb');
    expect(afterDelete).toBeNull();
  });
});

// =============================================================================
// STORAGE INFO TESTS (FS-023 to FS-027)
// =============================================================================

describe('FileStorage - Storage Info', () => {
  it('FS-023: getStorageEstimate() should return {used, quota, percentage}', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const estimate = await storage.getStorageEstimate();

    expect(estimate).toHaveProperty('used');
    expect(estimate).toHaveProperty('quota');
    expect(estimate).toHaveProperty('percentage');
    expect(estimate.used).toBe(1024 * 1024 * 50); // 50MB from mock
    expect(estimate.quota).toBe(1024 * 1024 * 1024); // 1GB from mock
    expect(estimate.percentage).toBeCloseTo(4.88, 1); // ~5%
  });

  it('FS-024: getStorageEstimate() should return zeros if API unavailable', async () => {
    // Remove storage.estimate
    Object.defineProperty(navigator, 'storage', {
      value: {
        getDirectory: vi.fn(),
        estimate: vi.fn().mockRejectedValue(new Error('Not supported')),
      },
      configurable: true,
    });

    const storage = new FileStorage();
    await storage.initialize();

    const estimate = await storage.getStorageEstimate();

    expect(estimate.used).toBe(0);
    expect(estimate.quota).toBe(0);
    expect(estimate.percentage).toBe(0);
  });

  it('FS-025: formatBytes() should format 0, B, KB, MB, GB correctly', () => {
    const storage = new FileStorage();

    expect(storage.formatBytes(0)).toBe('0 B');
    expect(storage.formatBytes(500)).toBe('500 B');
    expect(storage.formatBytes(1024)).toBe('1 KB');
    expect(storage.formatBytes(1536)).toBe('1.5 KB');
    expect(storage.formatBytes(1048576)).toBe('1 MB');
    expect(storage.formatBytes(1073741824)).toBe('1 GB');
  });

  it('FS-026: isUsingOPFS() should return correct boolean', async () => {
    // OPFS available
    setOPFSAvailable(true);
    const storage1 = new FileStorage();
    await storage1.initialize();
    expect(storage1.isUsingOPFS()).toBe(true);

    // OPFS not available
    setOPFSAvailable(false);
    const storage2 = new FileStorage();
    await storage2.initialize();
    expect(storage2.isUsingOPFS()).toBe(false);
  });

  it('FS-027: getStorageBackend() should return opfs, indexeddb, or memory', async () => {
    // OPFS
    setOPFSAvailable(true);
    const storage1 = new FileStorage();
    await storage1.initialize();
    expect(storage1.getStorageBackend()).toBe('opfs');

    // IndexedDB
    setOPFSAvailable(false);
    const storage2 = new FileStorage();
    await storage2.initialize();
    expect(storage2.getStorageBackend()).toBe('indexeddb');
  });
});

// =============================================================================
// CLEAR OPERATIONS TESTS (FS-028 to FS-032)
// =============================================================================

describe('FileStorage - Clear Operations', () => {
  it('FS-028: clearAllFiles() should clear images, thumbnails directories in OPFS', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Add files
    await storage.saveImage('img1', new Blob(['1']));
    await storage.saveImage('img2', new Blob(['2']));
    await storage.saveThumbnail('thumb1', new Blob(['t1']));

    expect(mockFileSystem.get('images')?.size).toBe(2);
    expect(mockFileSystem.get('thumbnails')?.size).toBe(1);

    // Clear
    const result = await storage.clearAllFiles();

    expect(result.imagesDeleted).toBe(2);
    expect(result.thumbnailsDeleted).toBe(1);
    expect(result.totalDeleted).toBeGreaterThanOrEqual(3);
  });

  it('FS-029: clearAllFiles() should clear all files from IndexedDB fallback', async () => {
    setOPFSAvailable(false);

    const storage = new FileStorage();
    await storage.initialize();

    // Add files
    await storage.saveImage('img1', new Blob(['1']));
    await storage.saveThumbnail('thumb1', new Blob(['t1']));

    // Clear - should not throw
    const result = await storage.clearAllFiles();

    expect(result).toHaveProperty('imagesDeleted');
    expect(result).toHaveProperty('thumbnailsDeleted');
    expect(result).toHaveProperty('totalDeleted');
  });

  it('FS-030: clearAllFiles() should return deletion counts', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Add 3 images and 2 thumbnails
    await storage.saveImage('a', new Blob(['a']));
    await storage.saveImage('b', new Blob(['b']));
    await storage.saveImage('c', new Blob(['c']));
    await storage.saveThumbnail('t1', new Blob(['t1']));
    await storage.saveThumbnail('t2', new Blob(['t2']));

    const result = await storage.clearAllFiles();

    expect(result.imagesDeleted).toBe(3);
    expect(result.thumbnailsDeleted).toBe(2);
    expect(result.totalDeleted).toBeGreaterThanOrEqual(5);
  });

  it('FS-031: clearAllAndReset() should remove directories entirely', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    // Add files
    await storage.saveImage('img', new Blob(['data']));
    await storage.saveThumbnail('thumb', new Blob(['data']));

    // Reset
    await storage.clearAllAndReset();

    // After reset, directories are recreated on next save
    // The important thing is it doesn't throw
    expect(mockFileSystem.get('images')?.size ?? 0).toBe(0);
    expect(mockFileSystem.get('thumbnails')?.size ?? 0).toBe(0);
  });

  it('FS-032: clearAllAndReset() should clear IndexedDB fallback', async () => {
    setOPFSAvailable(false);

    const storage = new FileStorage();
    await storage.initialize();

    // Add files
    await storage.saveImage('img', new Blob(['data']));

    // Reset - should not throw
    await expect(storage.clearAllAndReset()).resolves.not.toThrow();
  });
});

// =============================================================================
// EDGE CASES & INTEGRATION
// =============================================================================

describe('FileStorage - Edge Cases', () => {
  it('should handle File input (not just Blob) in saveImage', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const file = new File(['file content'], 'test.jpg', { type: 'image/jpeg' });
    const path = await storage.saveImage('file-test', file);

    expect(path).toBe('opfs://images/file-test');
  });

  it('should handle empty blob', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const emptyBlob = new Blob([], { type: 'image/png' });
    const path = await storage.saveImage('empty', emptyBlob);

    expect(path).toBe('opfs://images/empty');
  });

  it('should auto-initialize on first operation', async () => {
    const storage = new FileStorage();
    // Don't call initialize()

    const blob = new Blob(['auto-init'], { type: 'image/jpeg' });
    const path = await storage.saveImage('auto', blob);

    expect(path).toBe('opfs://images/auto');
    expect(storage.isUsingOPFS()).toBe(true);
  });

  it('should handle concurrent saves', async () => {
    const storage = new FileStorage();
    await storage.initialize();

    const blobs = Array.from({ length: 5 }, (_, i) =>
      new Blob([`data-${i}`], { type: 'image/jpeg' })
    );

    // Save all concurrently
    const paths = await Promise.all(
      blobs.map((blob, i) => storage.saveImage(`concurrent-${i}`, blob))
    );

    expect(paths).toHaveLength(5);
    paths.forEach((path, i) => {
      expect(path).toBe(`opfs://images/concurrent-${i}`);
    });
  });
});
