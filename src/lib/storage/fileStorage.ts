/**
 * OPFS (Origin Private File System) Storage Wrapper
 * 
 * Provides fast, persistent file storage in the browser for images.
 * Falls back to IndexedDB blob storage if OPFS is not available.
 */

export class FileStorage {
  private root: FileSystemDirectoryHandle | null = null;
  private initialized = false;
  private useOPFS = true;

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
        console.log('[FileStorage] OPFS not available, using fallback');
      }
    } catch (error) {
      console.warn('[FileStorage] Failed to initialize OPFS:', error);
      this.useOPFS = false;
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
      // Fallback: return a blob URL (not persistent, but works)
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

    if (!this.useOPFS || !this.root) return;

    try {
      const cleanPath = path.replace('opfs://', '');
      const [dirName, filename] = cleanPath.split('/');

      const directory = await this.root.getDirectoryHandle(dirName);
      await directory.removeEntry(filename);
    } catch {
      console.warn('[FileStorage] Failed to delete:', path);
    }
  }

  /**
   * Delete a thumbnail from OPFS
   */
  async deleteThumbnail(id: string): Promise<void> {
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
}

// Singleton instance
export const fileStorage = new FileStorage();
