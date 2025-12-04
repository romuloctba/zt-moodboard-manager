/**
 * OPFS (Origin Private File System) Storage Wrapper
 * 
 * Provides fast, persistent file storage in the browser for images.
 * Falls back to IndexedDB blob storage if OPFS is not available.
 */

import Dexie, { type EntityTable } from 'dexie';

// IndexedDB fallback database for storing blobs
interface StoredFile {
  id: string;
  blob: Blob;
  type: 'image' | 'thumbnail';
  mimeType: string;
  createdAt: Date;
}

class FileStorageDatabase extends Dexie {
  files!: EntityTable<StoredFile, 'id'>;

  constructor() {
    super('FileStorageFallback');
    this.version(1).stores({
      files: 'id, type, createdAt',
    });
  }
}

export class FileStorage {
  private root: FileSystemDirectoryHandle | null = null;
  private initialized = false;
  private useOPFS = true;
  private fallbackDb: FileStorageDatabase | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if OPFS is available
      if ('storage' in navigator && 'getDirectory' in navigator.storage) {
        this.root = await navigator.storage.getDirectory();
        this.useOPFS = true;
        console.log('[FileStorage] Using OPFS');
      } else {
        this.useOPFS = false;
        this.fallbackDb = new FileStorageDatabase();
        console.log('[FileStorage] OPFS not available, using IndexedDB fallback');
      }
    } catch (error) {
      console.warn('[FileStorage] Failed to initialize OPFS:', error);
      this.useOPFS = false;
      this.fallbackDb = new FileStorageDatabase();
    }

    this.initialized = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async getOrCreateDirectory(name: string): Promise<FileSystemDirectoryHandle> {
    await this.ensureInitialized();
    if (!this.root) throw new Error('OPFS not available');
    return await this.root.getDirectoryHandle(name, { create: true });
  }

  /**
   * Save an image file to OPFS
   */
  async saveImage(id: string, file: File | Blob): Promise<string> {
    await this.ensureInitialized();

    if (!this.useOPFS || !this.root) {
      // Fallback: Store in IndexedDB
      if (this.fallbackDb) {
        await this.fallbackDb.files.put({
          id,
          blob: file,
          type: 'image',
          mimeType: file.type || 'application/octet-stream',
          createdAt: new Date(),
        });
        return `idb://images/${id}`;
      }
      // Last resort: return a blob URL (not persistent)
      return URL.createObjectURL(file);
    }

    try {
      const imagesDir = await this.getOrCreateDirectory('images');
      const fileHandle = await imagesDir.getFileHandle(id, { create: true });

      // Use createWritable for modern browsers
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      return `opfs://images/${id}`;
    } catch (error) {
      console.error('[FileStorage] Failed to save image:', error);
      throw error;
    }
  }

  /**
   * Save a thumbnail to OPFS
   */
  async saveThumbnail(id: string, blob: Blob): Promise<string> {
    await this.ensureInitialized();

    if (!this.useOPFS || !this.root) {
      // Fallback: Store in IndexedDB
      if (this.fallbackDb) {
        await this.fallbackDb.files.put({
          id,
          blob,
          type: 'thumbnail',
          mimeType: blob.type || 'image/jpeg',
          createdAt: new Date(),
        });
        return `idb://thumbnails/${id}`;
      }
      return URL.createObjectURL(blob);
    }

    try {
      const thumbsDir = await this.getOrCreateDirectory('thumbnails');
      const fileHandle = await thumbsDir.getFileHandle(id, { create: true });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      return `opfs://thumbnails/${id}`;
    } catch (error) {
      console.error('[FileStorage] Failed to save thumbnail:', error);
      throw error;
    }
  }

  /**
   * Get an image file from OPFS
   */
  async getImage(path: string): Promise<File | null> {
    await this.ensureInitialized();

    // Handle IndexedDB fallback paths
    if (path.startsWith('idb://')) {
      if (this.fallbackDb) {
        const cleanPath = path.replace('idb://', '');
        const [, id] = cleanPath.split('/');
        const stored = await this.fallbackDb.files.get(id);
        if (stored) {
          return new File([stored.blob], id, { type: stored.mimeType });
        }
      }
      return null;
    }

    if (!this.useOPFS || !this.root) {
      return null;
    }

    try {
      // Parse path: "opfs://images/uuid" or "images/uuid"
      const cleanPath = path.replace('opfs://', '');
      const [dirName, filename] = cleanPath.split('/');

      const directory = await this.root.getDirectoryHandle(dirName);
      const fileHandle = await directory.getFileHandle(filename);
      return await fileHandle.getFile();
    } catch {
      console.warn('[FileStorage] File not found:', path);
      return null;
    }
  }

  /**
   * Get a URL for displaying an image
   */
  async getImageUrl(path: string): Promise<string | null> {
    // If it's already a blob URL, return it
    if (path.startsWith('blob:')) {
      return path;
    }

    const file = await this.getImage(path);
    if (file) {
      return URL.createObjectURL(file);
    }
    return null;
  }

  /**
   * Delete an image from OPFS
   */
  async deleteImage(path: string): Promise<void> {
    await this.ensureInitialized();

    // Handle IndexedDB fallback paths
    if (path.startsWith('idb://')) {
      if (this.fallbackDb) {
        const cleanPath = path.replace('idb://', '');
        const [, id] = cleanPath.split('/');
        await this.fallbackDb.files.delete(id);
        console.log(`[FileStorage] Deleted from IndexedDB: ${path}`);
      }
      return;
    }

    if (!this.useOPFS || !this.root) return;

    try {
      const cleanPath = path.replace('opfs://', '');
      const parts = cleanPath.split('/');
      const filename = parts.pop()!;
      const dirName = parts.join('/') || 'images';

      console.log(`[FileStorage] Deleting file: ${dirName}/${filename}`);

      const directory = await this.root.getDirectoryHandle(dirName);
      await directory.removeEntry(filename);

      console.log(`[FileStorage] Successfully deleted: ${path}`);
    } catch (error) {
      console.warn('[FileStorage] Failed to delete:', path, error);
    }
  }

  /**
   * Delete a thumbnail from OPFS
   */
  async deleteThumbnail(id: string): Promise<void> {
    await this.ensureInitialized();

    // Check if using fallback
    if (!this.useOPFS && this.fallbackDb) {
      await this.fallbackDb.files.delete(id);
      return;
    }

    await this.deleteImage(`thumbnails/${id}`);
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<{ used: number; quota: number; percentage: number }> {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (used / quota) * 100 : 0;

      return { used, quota, percentage };
    } catch {
      return { used: 0, quota: 0, percentage: 0 };
    }
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Check if OPFS is being used
   */
  isUsingOPFS(): boolean {
    return this.useOPFS;
  }

  /**
   * Clear all files from a specific directory
   */
  private async clearDirectory(dirName: string): Promise<number> {
    if (!this.useOPFS || !this.root) return 0;

    try {
      const directory = await this.root.getDirectoryHandle(dirName);
      let count = 0;

      // Collect all file names first (can't modify while iterating)
      const entries: string[] = [];
      // Use entries() which returns [name, handle] pairs
      for await (const [name] of directory as unknown as AsyncIterable<[string, FileSystemHandle]>) {
        entries.push(name);
      }

      // Delete each file
      for (const name of entries) {
        try {
          await directory.removeEntry(name);
          count++;
        } catch (e) {
          console.warn(`[FileStorage] Failed to delete ${dirName}/${name}:`, e);
        }
      }

      return count;
    } catch {
      // Directory doesn't exist
      return 0;
    }
  }

  /**
   * Clear all files from IndexedDB fallback
   */
  private async clearFallbackDb(): Promise<{ imagesDeleted: number; thumbnailsDeleted: number }> {
    if (!this.fallbackDb) {
      return { imagesDeleted: 0, thumbnailsDeleted: 0 };
    }

    try {
      const images = await this.fallbackDb.files.where('type').equals('image').count();
      const thumbnails = await this.fallbackDb.files.where('type').equals('thumbnail').count();

      await this.fallbackDb.files.clear();

      return { imagesDeleted: images, thumbnailsDeleted: thumbnails };
    } catch (error) {
      console.warn('[FileStorage] Failed to clear IndexedDB fallback:', error);
      return { imagesDeleted: 0, thumbnailsDeleted: 0 };
    }
  }

  /**
   * Clear all files from OPFS (images, thumbnails, exports, backups)
   * Returns the total number of files deleted
   */
  async clearAllFiles(): Promise<{ imagesDeleted: number; thumbnailsDeleted: number; totalDeleted: number }> {
    await this.ensureInitialized();

    // Handle IndexedDB fallback
    if (!this.useOPFS) {
      const result = await this.clearFallbackDb();
      return {
        ...result,
        totalDeleted: result.imagesDeleted + result.thumbnailsDeleted
      };
    }

    if (!this.root) {
      return { imagesDeleted: 0, thumbnailsDeleted: 0, totalDeleted: 0 };
    }

    console.log('[FileStorage] Clearing all OPFS files...');

    const imagesDeleted = await this.clearDirectory('images');
    const thumbnailsDeleted = await this.clearDirectory('thumbnails');
    const exportsDeleted = await this.clearDirectory('exports');
    const backupsDeleted = await this.clearDirectory('backups');

    const totalDeleted = imagesDeleted + thumbnailsDeleted + exportsDeleted + backupsDeleted;

    console.log(`[FileStorage] Cleared ${totalDeleted} files (${imagesDeleted} images, ${thumbnailsDeleted} thumbnails)`);

    return { imagesDeleted, thumbnailsDeleted, totalDeleted };
  }

  /**
   * Clear all files AND remove the directories themselves
   * Use this for a complete reset
   */
  async clearAllAndReset(): Promise<void> {
    await this.ensureInitialized();

    // Handle IndexedDB fallback
    if (!this.useOPFS) {
      await this.clearFallbackDb();
      console.log('[FileStorage] Complete IndexedDB fallback reset done');
      return;
    }

    if (!this.root) return;

    const directories = ['images', 'thumbnails', 'exports', 'backups'];

    for (const dirName of directories) {
      try {
        // First clear the directory contents
        await this.clearDirectory(dirName);
        // Then remove the directory itself
        await this.root.removeEntry(dirName, { recursive: true });
      } catch {
        // Directory doesn't exist, that's fine
      }
    }

    console.log('[FileStorage] Complete OPFS reset done');
  }

  /**
   * Get the storage backend being used
   */
  getStorageBackend(): 'opfs' | 'indexeddb' | 'memory' {
    if (this.useOPFS) return 'opfs';
    if (this.fallbackDb) return 'indexeddb';
    return 'memory';
  }
}

// Singleton instance
export const fileStorage = new FileStorage();
