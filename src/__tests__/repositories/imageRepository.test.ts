/**
 * ImageRepository Test Suite
 *
 * Tests for: src/lib/db/repositories/imageRepository.ts
 * Reference: TEST_CASES.md - Section 1.1 ImageRepository (IM-001 to IM-012)
 *
 * Note: The create() method depends on processImage and fileStorage which require
 * browser APIs (Canvas, OPFS). Those are mocked for unit testing. The database
 * operations are tested against fake-indexeddb.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { imageRepository } from '@/lib/db/repositories/imageRepository'
import { characterRepository } from '@/lib/db/repositories/characterRepository'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { db } from '@/lib/db/database'
import type { MoodboardImage, ColorPalette } from '@/types'

// Mock the external dependencies that require browser APIs
vi.mock('@/lib/storage/imageProcessor', () => ({
  processImage: vi.fn(),
}))

vi.mock('@/lib/storage/fileStorage', () => ({
  fileStorage: {
    saveImage: vi.fn(),
    saveThumbnail: vi.fn(),
    deleteImage: vi.fn(),
    deleteThumbnail: vi.fn(),
    getImageUrl: vi.fn(),
  },
}))

// Import mocked modules
import { processImage } from '@/lib/storage/imageProcessor'
import { fileStorage } from '@/lib/storage/fileStorage'

describe('ImageRepository', () => {
  // Helper to create test project and character
  async function createTestCharacter() {
    const project = await projectRepository.create('Test Project')
    const character = await characterRepository.create(project.id, 'Test Character')
    return { project, character }
  }

  // Helper to create a mock image record directly in the database
  async function createMockImageRecord(
    characterId: string,
    overrides: Partial<MoodboardImage> = {}
  ): Promise<MoodboardImage> {
    const id = overrides.id || crypto.randomUUID()
    const image: MoodboardImage = {
      id,
      characterId,
      filename: `${id}.webp`,
      originalName: 'test-image.jpg',
      mimeType: 'image/webp',
      size: 50000,
      width: 800,
      height: 600,
      storagePath: `opfs://images/${id}`,
      thumbnailPath: `opfs://thumbnails/${id}`,
      palette: {
        dominant: '#4a5568',
        vibrant: '#ed8936',
        muted: '#a0aec0',
        colors: ['#4a5568', '#ed8936', '#a0aec0'],
      },
      tags: [],
      createdAt: new Date(),
      ...overrides,
    }

    await db.images.add(image)
    return image
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('IM-001: should create image with metadata (size, dimensions, MIME)', async () => {
      const { character } = await createTestCharacter()

      // Setup mocks
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
      const mockProcessedBlob = new Blob(['processed'], { type: 'image/webp' })
      const mockThumbnailBlob = new Blob(['thumb'], { type: 'image/webp' })

      vi.mocked(processImage).mockResolvedValue({
        original: mockProcessedBlob,
        thumbnail: mockThumbnailBlob,
        width: 1200,
        height: 800,
        palette: ['#ff0000', '#00ff00', '#0000ff'],
        format: 'webp',
      })

      vi.mocked(fileStorage.saveImage).mockResolvedValue('opfs://images/test-id')
      vi.mocked(fileStorage.saveThumbnail).mockResolvedValue('opfs://thumbnails/test-id')

      const image = await imageRepository.create(mockFile, character.id)

      expect(image).toBeDefined()
      expect(image.id).toBeDefined()
      expect(image.characterId).toBe(character.id)
      expect(image.originalName).toBe('photo.jpg')
      expect(image.mimeType).toBe('image/webp')
      expect(image.width).toBe(1200)
      expect(image.height).toBe(800)
      expect(image.size).toBe(mockProcessedBlob.size)
      expect(image.storagePath).toBe('opfs://images/test-id')
      expect(image.thumbnailPath).toBe('opfs://thumbnails/test-id')
      expect(image.tags).toEqual([])
      expect(image.createdAt).toBeInstanceOf(Date)

      // Verify palette was extracted
      expect(image.palette).toBeDefined()
      expect(image.palette?.dominant).toBe('#ff0000')
      expect(image.palette?.vibrant).toBe('#00ff00')
      expect(image.palette?.muted).toBe('#0000ff')
      expect(image.palette?.colors).toEqual(['#ff0000', '#00ff00', '#0000ff'])

      // Verify processImage was called with the file
      expect(processImage).toHaveBeenCalledWith(mockFile)

      // Verify image was persisted to database
      const fromDb = await db.images.get(image.id)
      expect(fromDb).toBeDefined()
      expect(fromDb?.characterId).toBe(character.id)
    })

    it('should handle JPEG format when WebP is not supported', async () => {
      const { character } = await createTestCharacter()

      const mockFile = new File(['test'], 'photo.png', { type: 'image/png' })
      const mockProcessedBlob = new Blob(['processed'], { type: 'image/jpeg' })
      const mockThumbnailBlob = new Blob(['thumb'], { type: 'image/jpeg' })

      vi.mocked(processImage).mockResolvedValue({
        original: mockProcessedBlob,
        thumbnail: mockThumbnailBlob,
        width: 640,
        height: 480,
        palette: [],
        format: 'jpeg', // Fallback format
      })

      vi.mocked(fileStorage.saveImage).mockResolvedValue('opfs://images/test-id')
      vi.mocked(fileStorage.saveThumbnail).mockResolvedValue('opfs://thumbnails/test-id')

      const image = await imageRepository.create(mockFile, character.id)

      expect(image.mimeType).toBe('image/jpeg')
      expect(image.filename).toContain('.jpeg')
    })

    it('should handle image without color palette', async () => {
      const { character } = await createTestCharacter()

      const mockFile = new File(['test'], 'simple.jpg', { type: 'image/jpeg' })

      vi.mocked(processImage).mockResolvedValue({
        original: new Blob(['data'], { type: 'image/webp' }),
        thumbnail: new Blob(['thumb'], { type: 'image/webp' }),
        width: 100,
        height: 100,
        palette: [], // Empty palette
        format: 'webp',
      })

      vi.mocked(fileStorage.saveImage).mockResolvedValue('opfs://images/test-id')
      vi.mocked(fileStorage.saveThumbnail).mockResolvedValue('opfs://thumbnails/test-id')

      const image = await imageRepository.create(mockFile, character.id)

      expect(image.palette).toBeUndefined()
    })

    it('should propagate error when processImage fails', async () => {
      const { character } = await createTestCharacter()
      const mockFile = new File(['test'], 'corrupt.jpg', { type: 'image/jpeg' })

      const processingError = new Error('Invalid image format')
      vi.mocked(processImage).mockRejectedValue(processingError)

      // Verify error propagates to caller (not swallowed)
      let caughtError: Error | null = null
      try {
        await imageRepository.create(mockFile, character.id)
      } catch (e) {
        caughtError = e as Error
      }

      expect(caughtError).toBe(processingError) // Same error instance
      expect(caughtError?.message).toBe('Invalid image format')

      // Verify no image was saved to database
      const allImages = await db.images.toArray()
      expect(allImages).toHaveLength(0)

      // Verify fileStorage was never called (failed before reaching storage)
      expect(fileStorage.saveImage).not.toHaveBeenCalled()
      expect(fileStorage.saveThumbnail).not.toHaveBeenCalled()
    })

    it('should propagate error when fileStorage.saveImage fails', async () => {
      const { character } = await createTestCharacter()
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

      vi.mocked(processImage).mockResolvedValue({
        original: new Blob(['data'], { type: 'image/webp' }),
        thumbnail: new Blob(['thumb'], { type: 'image/webp' }),
        width: 800,
        height: 600,
        palette: [],
        format: 'webp',
      })

      const storageError = new Error('OPFS quota exceeded')
      vi.mocked(fileStorage.saveImage).mockRejectedValue(storageError)

      // Verify error propagates to caller (not swallowed)
      let caughtError: Error | null = null
      try {
        await imageRepository.create(mockFile, character.id)
      } catch (e) {
        caughtError = e as Error
      }

      expect(caughtError).toBe(storageError) // Same error instance
      expect(caughtError?.message).toBe('OPFS quota exceeded')

      // Verify no image was saved to database
      const allImages = await db.images.toArray()
      expect(allImages).toHaveLength(0)

      // Verify saveThumbnail was never called (failed before reaching it)
      expect(fileStorage.saveThumbnail).not.toHaveBeenCalled()
    })

    it('should propagate error and cleanup orphaned image when saveThumbnail fails', async () => {
      const { character } = await createTestCharacter()
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

      vi.mocked(processImage).mockResolvedValue({
        original: new Blob(['data'], { type: 'image/webp' }),
        thumbnail: new Blob(['thumb'], { type: 'image/webp' }),
        width: 800,
        height: 600,
        palette: [],
        format: 'webp',
      })

      vi.mocked(fileStorage.saveImage).mockResolvedValue('opfs://images/test-id')

      const thumbnailError = new Error('Thumbnail write failed')
      vi.mocked(fileStorage.saveThumbnail).mockRejectedValueOnce(thumbnailError)

      // Verify error propagates to caller (not swallowed)
      let caughtError: Error | null = null
      try {
        await imageRepository.create(mockFile, character.id)
      } catch (e) {
        caughtError = e as Error
      }

      expect(caughtError).toBe(thumbnailError) // Same error instance
      expect(caughtError?.message).toBe('Thumbnail write failed')

      // Verify no image was saved to database
      const allImages = await db.images.toArray()
      expect(allImages).toHaveLength(0)

      // Verify the orphaned image was cleaned up
      expect(fileStorage.saveImage).toHaveBeenCalledTimes(1)
      expect(fileStorage.deleteImage).toHaveBeenCalledWith('opfs://images/test-id')
    })

    it('should propagate error and cleanup orphaned files when db.images.add fails', async () => {
      const { character } = await createTestCharacter()
      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

      vi.mocked(processImage).mockResolvedValue({
        original: new Blob(['data'], { type: 'image/webp' }),
        thumbnail: new Blob(['thumb'], { type: 'image/webp' }),
        width: 800,
        height: 600,
        palette: [],
        format: 'webp',
      })

      vi.mocked(fileStorage.saveImage).mockResolvedValue('opfs://images/test-id')
      vi.mocked(fileStorage.saveThumbnail).mockResolvedValue('opfs://thumbnails/test-id')

      // Spy on db.images.add and make it fail
      const dbError = new Error('Database quota exceeded')
      const addSpy = vi.spyOn(db.images, 'add').mockRejectedValueOnce(dbError)

      // Verify error propagates to caller
      let caughtError: Error | null = null
      try {
        await imageRepository.create(mockFile, character.id)
      } catch (e) {
        caughtError = e as Error
      }

      expect(caughtError).toBe(dbError)
      expect(caughtError?.message).toBe('Database quota exceeded')

      // Verify both orphaned files were cleaned up
      expect(fileStorage.deleteImage).toHaveBeenCalledWith('opfs://images/test-id')
      expect(fileStorage.deleteThumbnail).toHaveBeenCalled()

      // Restore the spy
      addSpy.mockRestore()
    })
  })

  describe('getById', () => {
    it('IM-002: should return complete image record with palette', async () => {
      const { character } = await createTestCharacter()
      const created = await createMockImageRecord(character.id, {
        originalName: 'hero-portrait.jpg',
        width: 1920,
        height: 1080,
        palette: {
          dominant: '#123456',
          vibrant: '#abcdef',
          muted: '#654321',
          colors: ['#123456', '#abcdef', '#654321'],
        },
      })

      const found = await imageRepository.getById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.originalName).toBe('hero-portrait.jpg')
      expect(found?.width).toBe(1920)
      expect(found?.height).toBe(1080)
      expect(found?.palette?.dominant).toBe('#123456')
      expect(found?.palette?.colors).toHaveLength(3)
    })

    it('should return undefined for non-existing ID', async () => {
      const found = await imageRepository.getById('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('getByCharacterId', () => {
    it('IM-003: should return all images for a character ordered by createdAt descending', async () => {
      const { character } = await createTestCharacter()

      const now = new Date()
      await createMockImageRecord(character.id, {
        originalName: 'oldest.jpg',
        createdAt: new Date(now.getTime() - 2000),
      })
      await createMockImageRecord(character.id, {
        originalName: 'middle.jpg',
        createdAt: new Date(now.getTime() - 1000),
      })
      await createMockImageRecord(character.id, {
        originalName: 'newest.jpg',
        createdAt: now,
      })

      const images = await imageRepository.getByCharacterId(character.id)

      expect(images).toHaveLength(3)
      // Verify ordering: newest first (descending by createdAt)
      expect(images[0].originalName).toBe('newest.jpg')
      expect(images[1].originalName).toBe('middle.jpg')
      expect(images[2].originalName).toBe('oldest.jpg')
    })

    it('should return empty array when character has no images', async () => {
      const { character } = await createTestCharacter()

      const images = await imageRepository.getByCharacterId(character.id)

      expect(images).toEqual([])
      expect(Array.isArray(images)).toBe(true)
    })

    it('should not return images from other characters', async () => {
      const { project } = await createTestCharacter()
      const char1 = await characterRepository.create(project.id, 'Character 1')
      const char2 = await characterRepository.create(project.id, 'Character 2')

      await createMockImageRecord(char1.id, { originalName: 'char1-image.jpg' })
      await createMockImageRecord(char2.id, { originalName: 'char2-image.jpg' })

      const char1Images = await imageRepository.getByCharacterId(char1.id)
      const char2Images = await imageRepository.getByCharacterId(char2.id)

      expect(char1Images).toHaveLength(1)
      expect(char1Images[0].originalName).toBe('char1-image.jpg')

      expect(char2Images).toHaveLength(1)
      expect(char2Images[0].originalName).toBe('char2-image.jpg')
    })
  })

  describe('getAll', () => {
    it('should return all images ordered by createdAt descending', async () => {
      const { character } = await createTestCharacter()

      const now = new Date()
      await createMockImageRecord(character.id, {
        originalName: 'oldest.jpg',
        createdAt: new Date(now.getTime() - 2000),
      })
      await createMockImageRecord(character.id, {
        originalName: 'middle.jpg',
        createdAt: new Date(now.getTime() - 1000),
      })
      await createMockImageRecord(character.id, {
        originalName: 'newest.jpg',
        createdAt: now,
      })

      const images = await imageRepository.getAll()

      expect(images).toHaveLength(3)
      expect(images[0].originalName).toBe('newest.jpg')
      expect(images[1].originalName).toBe('middle.jpg')
      expect(images[2].originalName).toBe('oldest.jpg')
    })

    it('should return empty array when no images exist', async () => {
      const images = await imageRepository.getAll()

      expect(images).toEqual([])
    })
  })

  describe('getByIds', () => {
    it('should return images matching the provided IDs', async () => {
      const { character } = await createTestCharacter()

      const img1 = await createMockImageRecord(character.id, { originalName: 'img1.jpg' })
      const img2 = await createMockImageRecord(character.id, { originalName: 'img2.jpg' })
      await createMockImageRecord(character.id, { originalName: 'img3.jpg' })

      const images = await imageRepository.getByIds([img1.id, img2.id])

      expect(images).toHaveLength(2)
      expect(images.map((i) => i.originalName).sort()).toEqual(['img1.jpg', 'img2.jpg'])
    })

    it('should return empty array for non-existent IDs', async () => {
      const images = await imageRepository.getByIds(['non-existent-1', 'non-existent-2'])

      expect(images).toEqual([])
    })

    it('should handle mix of existing and non-existing IDs', async () => {
      const { character } = await createTestCharacter()
      const img = await createMockImageRecord(character.id)

      const images = await imageRepository.getByIds([img.id, 'non-existent'])

      expect(images).toHaveLength(1)
      expect(images[0].id).toBe(img.id)
    })
  })

  describe('update', () => {
    it('should update image fields', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      await imageRepository.update(image.id, {
        notes: 'This is a great reference image',
        tags: ['hero', 'costume'],
      })

      const updated = await imageRepository.getById(image.id)

      expect(updated?.notes).toBe('This is a great reference image')
      expect(updated?.tags).toEqual(['hero', 'costume'])
    })

    it('should not throw when updating non-existent image', async () => {
      // Dexie's update() silently does nothing for non-existent IDs
      await imageRepository.update('non-existent', { notes: 'test' })

      // Verify nothing was created
      const result = await imageRepository.getById('non-existent')
      expect(result).toBeUndefined()
    })
  })

  describe('addTag / removeTag', () => {
    it('IM-005: should add tag to image', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      await imageRepository.addTag(image.id, 'protagonist')

      const updated = await imageRepository.getById(image.id)
      expect(updated?.tags).toContain('protagonist')
    })

    it('should add multiple tags', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      await imageRepository.addTag(image.id, 'hero')
      await imageRepository.addTag(image.id, 'costume')
      await imageRepository.addTag(image.id, 'reference')

      const updated = await imageRepository.getById(image.id)
      expect(updated?.tags).toEqual(['hero', 'costume', 'reference'])
    })

    it('should not add duplicate tags', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      await imageRepository.addTag(image.id, 'hero')
      await imageRepository.addTag(image.id, 'hero')
      await imageRepository.addTag(image.id, 'hero')

      const updated = await imageRepository.getById(image.id)
      expect(updated?.tags).toEqual(['hero'])
    })

    it('should remove tag from image', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id, {
        tags: ['tag1', 'tag2', 'tag3'],
      })

      await imageRepository.removeTag(image.id, 'tag2')

      const updated = await imageRepository.getById(image.id)
      expect(updated?.tags).toEqual(['tag1', 'tag3'])
    })

    it('should handle removing non-existent tag', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id, { tags: ['existing'] })

      await imageRepository.removeTag(image.id, 'non-existent')

      const updated = await imageRepository.getById(image.id)
      expect(updated?.tags).toEqual(['existing'])
    })

    it('should do nothing when adding tag to non-existent image', async () => {
      await imageRepository.addTag('non-existent', 'tag')

      // Verify nothing was created
      const result = await imageRepository.getById('non-existent')
      expect(result).toBeUndefined()
    })

    it('should do nothing when removing tag from non-existent image', async () => {
      await imageRepository.removeTag('non-existent', 'tag')

      // Verify nothing was created
      const result = await imageRepository.getById('non-existent')
      expect(result).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('IM-008: should remove image record from database', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      // Verify image exists before delete
      const beforeDelete = await db.images.get(image.id)
      expect(beforeDelete).toBeDefined()

      await imageRepository.delete(image.id)

      // Verify directly from database, not through repository
      const afterDelete = await db.images.get(image.id)
      expect(afterDelete).toBeUndefined()
    })

    it('should call fileStorage to delete files', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id, {
        storagePath: 'opfs://images/test-id',
        thumbnailPath: 'opfs://thumbnails/test-id',
      })

      await imageRepository.delete(image.id)

      expect(fileStorage.deleteImage).toHaveBeenCalledWith('opfs://images/test-id')
      expect(fileStorage.deleteThumbnail).toHaveBeenCalledWith(image.id)
    })

    it('should not throw when deleting non-existent image and not call fileStorage', async () => {
      await imageRepository.delete('non-existent')

      // Repository should check if image exists before calling fileStorage
      expect(fileStorage.deleteImage).not.toHaveBeenCalled()
      expect(fileStorage.deleteThumbnail).not.toHaveBeenCalled()
    })

    it('should not affect other images', async () => {
      const { character } = await createTestCharacter()

      const img1 = await createMockImageRecord(character.id, { originalName: 'keep.jpg' })
      const img2 = await createMockImageRecord(character.id, { originalName: 'delete.jpg' })

      await imageRepository.delete(img2.id)

      const remaining = await imageRepository.getById(img1.id)
      expect(remaining).toBeDefined()
      expect(remaining?.originalName).toBe('keep.jpg')
    })

    // TODO: Review error handling behavior - currently if fileStorage fails, DB record is kept.
    // This could leave orphaned DB records if OPFS files are manually deleted or corrupted.
    // Consider: wrap storage deletion in try/catch and delete DB record regardless,
    // or at minimum ignore "file not found" errors during deletion.
    it('should propagate error when fileStorage.deleteImage fails (DB record not deleted)', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      const deleteError = new Error('OPFS file not found')
      vi.mocked(fileStorage.deleteImage).mockRejectedValueOnce(deleteError)

      // Verify error propagates
      let caughtError: Error | null = null
      try {
        await imageRepository.delete(image.id)
      } catch (e) {
        caughtError = e as Error
      }

      expect(caughtError).toBe(deleteError)

      // DB record should still exist since delete failed before reaching db.delete()
      const stillExists = await db.images.get(image.id)
      expect(stillExists).toBeDefined()
    })
  })

  describe('deleteMany', () => {
    it('IM-009: should bulk delete images', async () => {
      const { character } = await createTestCharacter()

      const img1 = await createMockImageRecord(character.id)
      const img2 = await createMockImageRecord(character.id)
      const img3 = await createMockImageRecord(character.id)

      await imageRepository.deleteMany([img1.id, img2.id])

      expect(await imageRepository.getById(img1.id)).toBeUndefined()
      expect(await imageRepository.getById(img2.id)).toBeUndefined()
      expect(await imageRepository.getById(img3.id)).toBeDefined()

      // Verify fileStorage was called for each deleted image
      expect(fileStorage.deleteImage).toHaveBeenCalledTimes(2)
    })

    it('should handle empty array without calling fileStorage', async () => {
      await imageRepository.deleteMany([])

      expect(fileStorage.deleteImage).not.toHaveBeenCalled()
      expect(fileStorage.deleteThumbnail).not.toHaveBeenCalled()
    })

    it('should handle mix of existing and non-existing IDs', async () => {
      const { character } = await createTestCharacter()
      const img = await createMockImageRecord(character.id)

      await imageRepository.deleteMany([img.id, 'non-existent'])

      expect(await imageRepository.getById(img.id)).toBeUndefined()
      // Only one call for the existing image
      expect(fileStorage.deleteImage).toHaveBeenCalledTimes(1)
    })
  })

  describe('searchByTag', () => {
    it('IM-012: should filter images by tag', async () => {
      const { character } = await createTestCharacter()

      await createMockImageRecord(character.id, {
        originalName: 'hero1.jpg',
        tags: ['hero', 'costume'],
      })
      await createMockImageRecord(character.id, {
        originalName: 'hero2.jpg',
        tags: ['hero', 'action'],
      })
      await createMockImageRecord(character.id, {
        originalName: 'villain.jpg',
        tags: ['villain'],
      })

      const heroImages = await imageRepository.searchByTag('hero')

      expect(heroImages).toHaveLength(2)
      expect(heroImages.map((i) => i.originalName).sort()).toEqual(['hero1.jpg', 'hero2.jpg'])
    })

    it('should return empty array when no images match tag', async () => {
      const { character } = await createTestCharacter()
      await createMockImageRecord(character.id, { tags: ['other'] })

      const images = await imageRepository.searchByTag('non-existent-tag')

      expect(images).toEqual([])
    })

    it('should search across all characters', async () => {
      const { project } = await createTestCharacter()
      const char1 = await characterRepository.create(project.id, 'Hero')
      const char2 = await characterRepository.create(project.id, 'Villain')

      await createMockImageRecord(char1.id, { tags: ['action'] })
      await createMockImageRecord(char2.id, { tags: ['action'] })

      const actionImages = await imageRepository.searchByTag('action')

      expect(actionImages).toHaveLength(2)
    })
  })

  describe('getAllTags', () => {
    it('should return all unique tags sorted alphabetically', async () => {
      const { character } = await createTestCharacter()

      await createMockImageRecord(character.id, { tags: ['hero', 'costume'] })
      await createMockImageRecord(character.id, { tags: ['hero', 'action'] })
      await createMockImageRecord(character.id, { tags: ['villain', 'costume'] })

      const tags = await imageRepository.getAllTags()

      expect(tags).toEqual(['action', 'costume', 'hero', 'villain'])
    })

    it('should return empty array when no images exist', async () => {
      const tags = await imageRepository.getAllTags()

      expect(tags).toEqual([])
    })

    it('should return empty array when no images have tags', async () => {
      const { character } = await createTestCharacter()
      await createMockImageRecord(character.id, { tags: [] })

      const tags = await imageRepository.getAllTags()

      expect(tags).toEqual([])
    })
  })

  describe('getImageUrl / getThumbnailUrl', () => {
    it('should call fileStorage.getImageUrl with storage path', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id, {
        storagePath: 'opfs://images/my-image',
        thumbnailPath: 'opfs://thumbnails/my-image',
      })

      vi.mocked(fileStorage.getImageUrl).mockResolvedValue('blob:http://localhost/image-url')

      const url = await imageRepository.getImageUrl(image)

      expect(fileStorage.getImageUrl).toHaveBeenCalledWith('opfs://images/my-image')
      expect(url).toBe('blob:http://localhost/image-url')
    })

    it('should call fileStorage.getImageUrl for thumbnail', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id, {
        thumbnailPath: 'opfs://thumbnails/my-thumb',
      })

      vi.mocked(fileStorage.getImageUrl).mockResolvedValue('blob:http://localhost/thumb-url')

      const url = await imageRepository.getThumbnailUrl(image)

      expect(fileStorage.getImageUrl).toHaveBeenCalledWith('opfs://thumbnails/my-thumb')
      expect(url).toBe('blob:http://localhost/thumb-url')
    })

    it('should return null when file not found', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      vi.mocked(fileStorage.getImageUrl).mockResolvedValue(null)

      const url = await imageRepository.getImageUrl(image)

      expect(url).toBeNull()
    })
  })

  describe('special characters', () => {
    it('should handle unicode and special characters in original filename', async () => {
      const { character } = await createTestCharacter()

      const specialNames = [
        '日本語ファイル.jpg',
        'émoji_🎨_art.png',
        "file with 'quotes'.jpg",
        'path/with/slashes.jpg',
      ]

      for (const name of specialNames) {
        const image = await createMockImageRecord(character.id, { originalName: name })
        const retrieved = await imageRepository.getById(image.id)
        expect(retrieved?.originalName).toBe(name)
      }
    })

    it('should handle unicode in tags', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      await imageRepository.addTag(image.id, '主人公')
      await imageRepository.addTag(image.id, 'héros')
      await imageRepository.addTag(image.id, '🔥fire')

      const retrieved = await imageRepository.getById(image.id)
      expect(retrieved?.tags).toEqual(['主人公', 'héros', '🔥fire'])
    })

    it('should handle unicode in notes', async () => {
      const { character } = await createTestCharacter()
      const image = await createMockImageRecord(character.id)

      await imageRepository.update(image.id, {
        notes: '这是一个测试 🎭 with émojis and "quotes"',
      })

      const retrieved = await imageRepository.getById(image.id)
      expect(retrieved?.notes).toBe('这是一个测试 🎭 with émojis and "quotes"')
    })
  })

  describe('edge cases', () => {
    it('should handle very long filename', async () => {
      const { character } = await createTestCharacter()
      const longName = 'a'.repeat(200) + '.jpg'

      const image = await createMockImageRecord(character.id, { originalName: longName })
      const retrieved = await imageRepository.getById(image.id)

      expect(retrieved?.originalName).toBe(longName)
    })

    it('should handle many tags', async () => {
      const { character } = await createTestCharacter()
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`)

      const image = await createMockImageRecord(character.id, { tags: manyTags })
      const retrieved = await imageRepository.getById(image.id)

      expect(retrieved?.tags).toHaveLength(50)
    })

    it('should handle image with minimal data', async () => {
      const { character } = await createTestCharacter()

      const image = await createMockImageRecord(character.id, {
        palette: undefined,
        notes: undefined,
        sectionId: undefined,
      })

      const retrieved = await imageRepository.getById(image.id)
      expect(retrieved?.palette).toBeUndefined()
      expect(retrieved?.notes).toBeUndefined()
    })

    it('should handle large dimensions', async () => {
      const { character } = await createTestCharacter()

      const image = await createMockImageRecord(character.id, {
        width: 8000,
        height: 6000,
        size: 50000000, // 50MB
      })

      const retrieved = await imageRepository.getById(image.id)
      expect(retrieved?.width).toBe(8000)
      expect(retrieved?.height).toBe(6000)
      expect(retrieved?.size).toBe(50000000)
    })

    it('should handle many images for one character', async () => {
      const { character } = await createTestCharacter()

      // Create 50 images
      for (let i = 0; i < 50; i++) {
        await createMockImageRecord(character.id, { originalName: `image-${i}.jpg` })
      }

      const images = await imageRepository.getByCharacterId(character.id)
      expect(images).toHaveLength(50)
    })
  })
})
