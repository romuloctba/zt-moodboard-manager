import { db, generateId } from '../database';
import type { MoodboardImage, ColorPalette } from '@/types';
import { fileStorage } from '@/lib/storage/fileStorage';
import { processImage } from '@/lib/storage/imageProcessor';

export const imageRepository = {
  async create(file: File, characterId: string): Promise<MoodboardImage> {
    const id = generateId();

    // Process the image (convert to WebP or JPEG, resize if needed, thumbnail, palette)
    const processed = await processImage(file);

    // Save files to OPFS
    const storagePath = await fileStorage.saveImage(id, processed.original);

    let thumbnailPath: string;
    try {
      thumbnailPath = await fileStorage.saveThumbnail(id, processed.thumbnail);
    } catch (error) {
      // Clean up orphaned image before re-throwing
      await fileStorage.deleteImage(storagePath);
      throw error;
    }

    // Build palette object
    const palette: ColorPalette | undefined = processed.palette?.length
      ? {
        dominant: processed.palette[0],
        vibrant: processed.palette[1] || processed.palette[0],
        muted: processed.palette[2] || processed.palette[0],
        colors: processed.palette,
      }
      : undefined;

    // Use the actual output format (webp or jpeg depending on browser support)
    const mimeType = processed.format === 'webp' ? 'image/webp' : 'image/jpeg';
    const extension = processed.format;

    const image: MoodboardImage = {
      id,
      characterId,
      filename: `${id}.${extension}`,
      originalName: file.name,
      mimeType,
      size: processed.original.size,
      width: processed.width,
      height: processed.height,
      storagePath,
      thumbnailPath,
      palette,
      tags: [],
      createdAt: new Date(),
    };

    try {
      await db.images.add(image);
    } catch (error) {
      // Clean up orphaned files before re-throwing
      await fileStorage.deleteImage(storagePath);
      await fileStorage.deleteThumbnail(id);
      throw error;
    }

    return image;
  },

  async getById(id: string): Promise<MoodboardImage | undefined> {
    return db.images.get(id);
  },

  async getAll(): Promise<MoodboardImage[]> {
    return db.images.orderBy('createdAt').reverse().toArray();
  },

  async getByCharacterId(characterId: string): Promise<MoodboardImage[]> {
    return db.images.where('characterId').equals(characterId).reverse().sortBy('createdAt');
  },

  async getByIds(ids: string[]): Promise<MoodboardImage[]> {
    return db.images.where('id').anyOf(ids).toArray();
  },

  async update(id: string, updates: Partial<Omit<MoodboardImage, 'id' | 'createdAt'>>): Promise<void> {
    await db.images.update(id, updates);
  },

  async addTag(id: string, tag: string): Promise<void> {
    const image = await this.getById(id);
    if (image && !image.tags.includes(tag)) {
      await this.update(id, { tags: [...image.tags, tag] });
    }
  },

  async removeTag(id: string, tag: string): Promise<void> {
    const image = await this.getById(id);
    if (image) {
      await this.update(id, { tags: image.tags.filter(t => t !== tag) });
    }
  },

  async delete(id: string): Promise<void> {
    const image = await this.getById(id);
    if (image) {
      // Delete files from storage
      await fileStorage.deleteImage(image.storagePath);
      await fileStorage.deleteThumbnail(id);

      // Delete from database
      await db.images.delete(id);
    }
  },

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.delete(id);
    }
  },

  /**
   * Get URL for displaying an image
   */
  async getImageUrl(image: MoodboardImage): Promise<string | null> {
    return fileStorage.getImageUrl(image.storagePath);
  },

  /**
   * Get URL for displaying a thumbnail
   */
  async getThumbnailUrl(image: MoodboardImage): Promise<string | null> {
    return fileStorage.getImageUrl(image.thumbnailPath);
  },

  /**
   * Search images by tag
   */
  async searchByTag(tag: string): Promise<MoodboardImage[]> {
    const all = await this.getAll();
    return all.filter(img => img.tags.includes(tag));
  },

  /**
   * Get all unique tags
   */
  async getAllTags(): Promise<string[]> {
    const all = await this.getAll();
    const tags = new Set<string>();
    all.forEach(img => img.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  },
};
