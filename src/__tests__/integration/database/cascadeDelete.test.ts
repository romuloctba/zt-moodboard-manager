/**
 * Database Integration Tests - Cascade Delete Operations
 *
 * These tests verify that deleting a parent entity correctly cascades
 * to delete all related child entities across multiple repository layers.
 *
 * Test IDs: DI-001 to DI-013
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db/database'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { characterRepository } from '@/lib/db/repositories/characterRepository'
import { imageRepository } from '@/lib/db/repositories/imageRepository'
import { editionRepository } from '@/lib/db/repositories/editionRepository'
import { scriptPageRepository } from '@/lib/db/repositories/scriptPageRepository'
import { panelRepository } from '@/lib/db/repositories/panelRepository'
import type { MoodboardImage, Section, CanvasItem, Panel } from '@/types'

// Mock fileStorage to track cleanup calls without actual file operations
vi.mock('@/lib/storage/fileStorage', () => ({
  fileStorage: {
    saveImage: vi.fn().mockResolvedValue('opfs://images/test'),
    saveThumbnail: vi.fn().mockResolvedValue('opfs://thumbnails/test'),
    deleteImage: vi.fn().mockResolvedValue(undefined),
    deleteThumbnail: vi.fn().mockResolvedValue(undefined),
    getImage: vi.fn().mockResolvedValue(new Blob()),
    getThumbnail: vi.fn().mockResolvedValue(new Blob()),
  },
}))

// Import the mock after defining it
import { fileStorage } from '@/lib/storage/fileStorage'

/**
 * Helper to create a complete test project with all related entities
 */
async function createFullProjectHierarchy() {
  // Create project
  const project = await projectRepository.create('Test Project', 'A test project')

  // Create characters
  const char1 = await characterRepository.create(project.id, 'Character 1')
  const char2 = await characterRepository.create(project.id, 'Character 2')

  // Create sections for char1
  const section1: Section = {
    id: crypto.randomUUID(),
    characterId: char1.id,
    type: 'moodboard',
    name: 'Moodboard',
    sortOrder: 0,
  }
  const section2: Section = {
    id: crypto.randomUUID(),
    characterId: char1.id,
    type: 'references',
    name: 'References',
    sortOrder: 1,
  }
  await db.sections.bulkAdd([section1, section2])

  // Create canvas items for sections
  const canvasItem1: CanvasItem = {
    id: crypto.randomUUID(),
    sectionId: section1.id,
    type: 'image',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 0,
    locked: false,
    createdAt: new Date(),
  }
  const canvasItem2: CanvasItem = {
    id: crypto.randomUUID(),
    sectionId: section2.id,
    type: 'image',
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    rotation: 0,
    zIndex: 1,
    locked: false,
    createdAt: new Date(),
  }
  await db.canvasItems.bulkAdd([canvasItem1, canvasItem2])

  // Create images for characters (directly, bypassing imageRepository.create to avoid mocking complexities)
  const image1: MoodboardImage = {
    id: crypto.randomUUID(),
    characterId: char1.id,
    filename: 'image1.jpg',
    originalName: 'original1.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    width: 800,
    height: 600,
    storagePath: 'opfs://images/image1',
    thumbnailPath: 'opfs://thumbnails/image1',
    tags: [],
    notes: '',
    createdAt: new Date(),
  }
  const image2: MoodboardImage = {
    id: crypto.randomUUID(),
    characterId: char1.id,
    filename: 'image2.jpg',
    originalName: 'original2.jpg',
    mimeType: 'image/jpeg',
    size: 2048,
    width: 1024,
    height: 768,
    storagePath: 'opfs://images/image2',
    thumbnailPath: 'opfs://thumbnails/image2',
    tags: [],
    notes: '',
    createdAt: new Date(),
  }
  const image3: MoodboardImage = {
    id: crypto.randomUUID(),
    characterId: char2.id,
    filename: 'image3.jpg',
    originalName: 'original3.jpg',
    mimeType: 'image/jpeg',
    size: 512,
    width: 640,
    height: 480,
    storagePath: 'opfs://images/image3',
    thumbnailPath: 'opfs://thumbnails/image3',
    tags: [],
    notes: '',
    createdAt: new Date(),
  }
  await db.images.bulkAdd([image1, image2, image3])

  return {
    project,
    characters: [char1, char2],
    sections: [section1, section2],
    canvasItems: [canvasItem1, canvasItem2],
    images: [image1, image2, image3],
  }
}

/**
 * Helper to create a complete edition hierarchy with pages and panels
 */
async function createFullEditionHierarchy(projectId: string) {
  const edition = await editionRepository.create(projectId, 'Test Edition')

  const page1 = await scriptPageRepository.create(edition.id)
  const page2 = await scriptPageRepository.create(edition.id)

  const panel1 = await panelRepository.create(page1.id)
  const panel2 = await panelRepository.create(page1.id)
  const panel3 = await panelRepository.create(page2.id)

  // Add dialogues to panels
  await panelRepository.addDialogue(panel1.id, 'char1', 'Character 1', 'Hello!')
  await panelRepository.addDialogue(panel2.id, 'char2', 'Character 2', 'World!')

  return {
    edition,
    pages: [page1, page2],
    panels: [panel1, panel2, panel3],
  }
}

describe('Database Integration - Cascade Delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // PROJECT CASCADE TESTS (DI-001 to DI-004)
  // ==========================================================================

  describe('Project Cascade Delete', () => {
    it('DI-001: Deleting project should delete all its characters', async () => {
      const { project, characters } = await createFullProjectHierarchy()

      // Verify characters exist
      const charsBefore = await characterRepository.getByProject(project.id)
      expect(charsBefore).toHaveLength(2)

      // Delete project
      await projectRepository.delete(project.id)

      // Verify project is gone
      const projectAfter = await projectRepository.getById(project.id)
      expect(projectAfter).toBeUndefined()

      // Verify all characters are gone
      for (const char of characters) {
        const charAfter = await characterRepository.getById(char.id)
        expect(charAfter).toBeUndefined()
      }
    })

    it('DI-002: Deleting project should cascade delete through characters to images', async () => {
      const { project, images } = await createFullProjectHierarchy()

      // Verify images exist
      const imagesBefore = await db.images.toArray()
      expect(imagesBefore.length).toBeGreaterThanOrEqual(3)

      // Delete project
      await projectRepository.delete(project.id)

      // Verify all images are gone
      for (const image of images) {
        const imageAfter = await imageRepository.getById(image.id)
        expect(imageAfter).toBeUndefined()
      }
    })

    it('DI-003: Deleting project should cascade delete character sections', async () => {
      const { project, sections } = await createFullProjectHierarchy()

      // Verify sections exist
      for (const section of sections) {
        const sectionBefore = await db.sections.get(section.id)
        expect(sectionBefore).toBeDefined()
      }

      // Delete project
      await projectRepository.delete(project.id)

      // Verify all sections are gone
      for (const section of sections) {
        const sectionAfter = await db.sections.get(section.id)
        expect(sectionAfter).toBeUndefined()
      }
    })

    it('DI-004: Deleting project should cascade delete canvas items via sections', async () => {
      const { project, canvasItems } = await createFullProjectHierarchy()

      // Verify canvas items exist
      for (const item of canvasItems) {
        const itemBefore = await db.canvasItems.get(item.id)
        expect(itemBefore).toBeDefined()
      }

      // Delete project
      await projectRepository.delete(project.id)

      // Verify all canvas items are gone
      for (const item of canvasItems) {
        const itemAfter = await db.canvasItems.get(item.id)
        expect(itemAfter).toBeUndefined()
      }
    })
  })

  // ==========================================================================
  // CHARACTER CASCADE TESTS (DI-005 to DI-007)
  // ==========================================================================

  describe('Character Cascade Delete', () => {
    it('DI-005: Deleting character should delete all its images', async () => {
      const { characters, images } = await createFullProjectHierarchy()
      const char1 = characters[0]

      // Get char1's images
      const char1Images = images.filter((img) => img.characterId === char1.id)
      expect(char1Images).toHaveLength(2)

      // Delete character
      await characterRepository.delete(char1.id)

      // Verify character is gone
      const charAfter = await characterRepository.getById(char1.id)
      expect(charAfter).toBeUndefined()

      // Verify char1's images are gone
      for (const image of char1Images) {
        const imageAfter = await imageRepository.getById(image.id)
        expect(imageAfter).toBeUndefined()
      }

      // Verify char2's images still exist
      const char2Images = images.filter((img) => img.characterId === characters[1].id)
      for (const image of char2Images) {
        const imageAfter = await imageRepository.getById(image.id)
        expect(imageAfter).toBeDefined()
      }
    })

    it('DI-006: Deleting character should delete all its sections', async () => {
      const { characters, sections } = await createFullProjectHierarchy()
      const char1 = characters[0]

      // Verify sections belong to char1
      expect(sections.every((s) => s.characterId === char1.id)).toBe(true)

      // Delete character
      await characterRepository.delete(char1.id)

      // Verify all sections are gone
      for (const section of sections) {
        const sectionAfter = await db.sections.get(section.id)
        expect(sectionAfter).toBeUndefined()
      }
    })

    it('DI-007: Deleting character should delete canvas items via sections', async () => {
      const { characters, canvasItems } = await createFullProjectHierarchy()
      const char1 = characters[0]

      // Verify canvas items exist
      expect(canvasItems).toHaveLength(2)

      // Delete character
      await characterRepository.delete(char1.id)

      // Verify all canvas items are gone
      for (const item of canvasItems) {
        const itemAfter = await db.canvasItems.get(item.id)
        expect(itemAfter).toBeUndefined()
      }
    })
  })

  // ==========================================================================
  // EDITION CASCADE TESTS (DI-008 to DI-010)
  // ==========================================================================

  describe('Edition Cascade Delete', () => {
    it('DI-008: Deleting edition should delete all its pages', async () => {
      const project = await projectRepository.create('Test Project')
      const { edition, pages } = await createFullEditionHierarchy(project.id)

      // Verify pages exist
      const pagesBefore = await scriptPageRepository.getByEdition(edition.id)
      expect(pagesBefore).toHaveLength(2)

      // Delete edition
      await editionRepository.delete(edition.id)

      // Verify edition is gone
      const editionAfter = await editionRepository.getById(edition.id)
      expect(editionAfter).toBeUndefined()

      // Verify all pages are gone
      for (const page of pages) {
        const pageAfter = await scriptPageRepository.getById(page.id)
        expect(pageAfter).toBeUndefined()
      }
    })

    it('DI-009: Deleting edition should cascade delete through pages to panels', async () => {
      const project = await projectRepository.create('Test Project')
      const { edition, panels } = await createFullEditionHierarchy(project.id)

      // Verify panels exist
      expect(panels).toHaveLength(3)
      for (const panel of panels) {
        const panelBefore = await panelRepository.getById(panel.id)
        expect(panelBefore).toBeDefined()
      }

      // Delete edition
      await editionRepository.delete(edition.id)

      // Verify all panels are gone
      for (const panel of panels) {
        const panelAfter = await panelRepository.getById(panel.id)
        expect(panelAfter).toBeUndefined()
      }
    })

    it('DI-010: Deleting page should delete all its panels', async () => {
      const project = await projectRepository.create('Test Project')
      const { pages, panels } = await createFullEditionHierarchy(project.id)
      const page1 = pages[0]

      // Get page1's panels
      const page1Panels = panels.filter((p) => p.pageId === page1.id)
      expect(page1Panels).toHaveLength(2)

      // Delete page
      await scriptPageRepository.delete(page1.id)

      // Verify page is gone
      const pageAfter = await scriptPageRepository.getById(page1.id)
      expect(pageAfter).toBeUndefined()

      // Verify page1's panels are gone
      for (const panel of page1Panels) {
        const panelAfter = await panelRepository.getById(panel.id)
        expect(panelAfter).toBeUndefined()
      }

      // Verify page2's panels still exist
      const page2Panels = panels.filter((p) => p.pageId === pages[1].id)
      for (const panel of page2Panels) {
        const panelAfter = await panelRepository.getById(panel.id)
        expect(panelAfter).toBeDefined()
      }
    })
  })

  // ==========================================================================
  // FILE STORAGE CLEANUP TESTS (DI-011 to DI-013)
  // ==========================================================================

  describe('File Storage Cleanup via Cascade', () => {
    it('DI-011: Deleting image should remove files from fileStorage', async () => {
      const { images } = await createFullProjectHierarchy()
      const image = images[0]

      // Delete image
      await imageRepository.delete(image.id)

      // Verify fileStorage cleanup was called
      expect(fileStorage.deleteImage).toHaveBeenCalledWith(image.storagePath)
      expect(fileStorage.deleteThumbnail).toHaveBeenCalledWith(image.id)
    })

    it('DI-012: Deleting character should clean up all image files', async () => {
      const { characters, images } = await createFullProjectHierarchy()
      const char1 = characters[0]
      const char1Images = images.filter((img) => img.characterId === char1.id)

      // Clear mocks to count only this delete
      vi.clearAllMocks()

      // Delete character
      await characterRepository.delete(char1.id)

      // Verify fileStorage cleanup was called for each image
      expect(fileStorage.deleteImage).toHaveBeenCalledTimes(char1Images.length)
      expect(fileStorage.deleteThumbnail).toHaveBeenCalledTimes(char1Images.length)

      for (const image of char1Images) {
        expect(fileStorage.deleteImage).toHaveBeenCalledWith(image.storagePath)
        expect(fileStorage.deleteThumbnail).toHaveBeenCalledWith(image.id)
      }
    })

    it('DI-013: Deleting project should clean up all image files (deep cascade)', async () => {
      const { project, images } = await createFullProjectHierarchy()

      // Clear mocks to count only this delete
      vi.clearAllMocks()

      // Delete project
      await projectRepository.delete(project.id)

      // Verify fileStorage cleanup was called for ALL images
      expect(fileStorage.deleteImage).toHaveBeenCalledTimes(images.length)
      expect(fileStorage.deleteThumbnail).toHaveBeenCalledTimes(images.length)

      for (const image of images) {
        expect(fileStorage.deleteImage).toHaveBeenCalledWith(image.storagePath)
        expect(fileStorage.deleteThumbnail).toHaveBeenCalledWith(image.id)
      }
    })
  })
})
