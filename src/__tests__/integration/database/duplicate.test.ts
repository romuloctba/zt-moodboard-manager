/**
 * Database Integration Tests - Duplicate Operations
 *
 * These tests verify that duplicate operations work correctly across repositories,
 * including both shallow copies (project, character) and deep copies (edition, page, panel).
 *
 * Test IDs: DI-014 to DI-026
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/lib/db/database'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { characterRepository } from '@/lib/db/repositories/characterRepository'
import { imageRepository } from '@/lib/db/repositories/imageRepository'
import { editionRepository } from '@/lib/db/repositories/editionRepository'
import { scriptPageRepository } from '@/lib/db/repositories/scriptPageRepository'
import { panelRepository } from '@/lib/db/repositories/panelRepository'
import type { MoodboardImage, Section, CanvasItem } from '@/types'

// Mock fileStorage to avoid actual file operations
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

/**
 * Helper to create a project with full metadata for duplication testing
 */
async function createFullProject() {
  const project = await projectRepository.create('Original Project', 'A test project')
  await projectRepository.update(project.id, {
    genre: 'Fantasy',
    theme: 'Adventure',
    tags: ['tag1', 'tag2'],
    settings: {
      defaultView: 'grid',
      gridColumns: 4,
      canvasBackground: '#ffffff',
    },
  })
  return projectRepository.getById(project.id)
}

/**
 * Helper to create a character with full metadata and related entities
 */
async function createFullCharacter(projectId: string) {
  const character = await characterRepository.create(projectId, 'Original Character')
  await characterRepository.update(character.id, {
    description: 'A brave hero',
    tags: ['protagonist', 'warrior'],
    profile: {
      age: '25',
      role: 'Main Character',
      personality: ['Brave', 'Kind', 'Determined'],
      abilities: ['Sword fighting', 'Archery'],
      backstory: 'Orphaned at young age',
    },
    metadata: {
      archetype: 'Hero',
      version: '1.0',
      inspirations: ['Aragorn', 'Link'],
    },
  })

  // Create sections for this character
  const section1: Section = {
    id: crypto.randomUUID(),
    characterId: character.id,
    type: 'costume',
    name: 'Costumes',
    color: '#ff5733',
    sortOrder: 0,
    createdAt: new Date(),
  }
  const section2: Section = {
    id: crypto.randomUUID(),
    characterId: character.id,
    type: 'references',
    name: 'References',
    color: '#33ff57',
    sortOrder: 1,
    createdAt: new Date(),
  }
  await db.sections.bulkAdd([section1, section2])

  // Create canvas items
  const imageId = crypto.randomUUID()
  const canvasItem: CanvasItem = {
    id: crypto.randomUUID(),
    sectionId: section1.id,
    type: 'image',
    content: { imageId },
    position: { x: 100, y: 100, width: 200, height: 200, rotation: 0, zIndex: 0 },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await db.canvasItems.add(canvasItem)

  // Create images (directly in DB to avoid mocking complexity)
  const image: MoodboardImage = {
    id: crypto.randomUUID(),
    characterId: character.id,
    filename: 'image1.jpg',
    originalName: 'original.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    width: 800,
    height: 600,
    storagePath: 'opfs://images/image1',
    thumbnailPath: 'opfs://thumbnails/image1',
    tags: ['reference'],
    notes: 'Main reference',
    createdAt: new Date(),
  }
  await db.images.add(image)

  return {
    character: (await characterRepository.getById(character.id))!,
    sections: [section1, section2],
    canvasItems: [canvasItem],
    images: [image],
  }
}

/**
 * Helper to create a full edition hierarchy for duplication testing
 */
async function createFullEdition(projectId: string) {
  const edition = await editionRepository.create(projectId, 'Original Edition', {
    issueNumber: 1,
    volume: 1,
    synopsis: 'An epic adventure begins',
  })
  await editionRepository.update(edition.id, {
    coverDescription: 'Hero standing on cliff',
    metadata: {
      genre: 'Action',
      targetAudience: 'Young Adult',
    },
  })

  // Create pages
  const page1 = await scriptPageRepository.create(edition.id, {
    title: 'Opening Scene',
    goal: 'Introduce the hero',
    setting: 'Mountain village',
  })
  await scriptPageRepository.update(page1.id, {
    timeOfDay: 'dawn',
    mood: 'hopeful',
    notes: 'Key establishing shot',
  })

  const page2 = await scriptPageRepository.create(edition.id, {
    title: 'The Call',
    goal: 'Hero receives quest',
  })

  // Create panels for page1
  const panel1 = await panelRepository.create(page1.id, {
    description: 'Wide shot of village',
    cameraAngle: 'aerial',
  })
  await panelRepository.addDialogue(panel1.id, {
    characterName: 'Narrator',
    type: 'caption',
    text: 'In a distant land...',
  })
  await panelRepository.addDialogue(panel1.id, {
    characterName: 'Hero',
    type: 'speech',
    text: 'Another beautiful morning.',
  })

  const panel2 = await panelRepository.create(page1.id, {
    description: 'Close-up of hero',
    cameraAngle: 'close-up',
  })
  await panelRepository.addDialogue(panel2.id, {
    characterName: 'Hero',
    type: 'thought',
    text: 'Something feels different today...',
  })

  // Create panel for page2
  const panel3 = await panelRepository.create(page2.id, {
    description: 'Messenger arrives',
  })

  // Fetch updated entities
  const updatedEdition = (await editionRepository.getById(edition.id))!
  const updatedPage1 = (await scriptPageRepository.getById(page1.id))!
  const updatedPage2 = (await scriptPageRepository.getById(page2.id))!
  const updatedPanel1 = (await panelRepository.getById(panel1.id))!
  const updatedPanel2 = (await panelRepository.getById(panel2.id))!
  const updatedPanel3 = (await panelRepository.getById(panel3.id))!

  return {
    edition: updatedEdition,
    pages: [updatedPage1, updatedPage2],
    panels: [updatedPanel1, updatedPanel2, updatedPanel3],
  }
}

describe('Database Integration - Duplicate Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // PROJECT DUPLICATE TESTS (DI-014 to DI-016)
  // ==========================================================================

  describe('Project Duplicate (Shallow)', () => {
    it('DI-014: Duplicating project copies metadata (description, genre, theme, tags, settings)', async () => {
      const original = await createFullProject()

      const duplicate = await projectRepository.duplicate(original!.id, 'Copied Project')

      expect(duplicate).toBeDefined()
      expect(duplicate!.id).not.toBe(original!.id)
      expect(duplicate!.name).toBe('Copied Project')
      expect(duplicate!.description).toBe(original!.description)
      expect(duplicate!.genre).toBe(original!.genre)
      expect(duplicate!.theme).toBe(original!.theme)
      expect(duplicate!.tags).toEqual(original!.tags)
      expect(duplicate!.settings).toEqual(original!.settings)

      // Verify timestamps are new
      expect(duplicate!.createdAt.getTime()).toBeGreaterThanOrEqual(original!.createdAt.getTime())
    })

    it('DI-015: Should return undefined when duplicating non-existent project', async () => {
      const result = await projectRepository.duplicate('non-existent-id', 'New Name')

      expect(result).toBeUndefined()
    })

    it('DI-016: Project duplicate does NOT copy characters (shallow copy by design)', async () => {
      const original = await createFullProject()

      // Create characters for original project
      await characterRepository.create(original!.id, 'Character 1')
      await characterRepository.create(original!.id, 'Character 2')

      const originalChars = await characterRepository.getByProject(original!.id)
      expect(originalChars).toHaveLength(2)

      // Duplicate the project
      const duplicate = await projectRepository.duplicate(original!.id, 'Copied Project')

      // Verify no characters were copied to the duplicate
      const duplicateChars = await characterRepository.getByProject(duplicate!.id)
      expect(duplicateChars).toHaveLength(0)

      // Original characters should still exist
      const originalCharsAfter = await characterRepository.getByProject(original!.id)
      expect(originalCharsAfter).toHaveLength(2)
    })
  })

  // ==========================================================================
  // CHARACTER DUPLICATE TESTS (DI-017 to DI-019)
  // ==========================================================================

  describe('Character Duplicate (Shallow)', () => {
    it('DI-017: Duplicating character copies description, tags, profile, metadata', async () => {
      const project = await projectRepository.create('Test Project')
      const { character: original } = await createFullCharacter(project.id)

      const duplicate = await characterRepository.duplicate(original.id, 'Copied Character')

      expect(duplicate).toBeDefined()
      expect(duplicate!.id).not.toBe(original.id)
      expect(duplicate!.projectId).toBe(original.projectId)
      expect(duplicate!.name).toBe('Copied Character')
      expect(duplicate!.description).toBe(original.description)
      expect(duplicate!.tags).toEqual(original.tags)
      expect(duplicate!.profile).toEqual(original.profile)
      expect(duplicate!.metadata).toEqual(original.metadata)

      // Verify new sortOrder
      expect(duplicate!.sortOrder).toBeGreaterThan(original.sortOrder)
    })

    it('DI-018: Character duplicate does NOT copy images (by design)', async () => {
      const project = await projectRepository.create('Test Project')
      const { character: original, images } = await createFullCharacter(project.id)

      expect(images).toHaveLength(1)

      const duplicate = await characterRepository.duplicate(original.id, 'Copied Character')

      // Verify no images were copied
      const duplicateImages = await imageRepository.getByCharacterId(duplicate!.id)
      expect(duplicateImages).toHaveLength(0)

      // Original images should still exist
      const originalImages = await imageRepository.getByCharacterId(original.id)
      expect(originalImages).toHaveLength(1)
    })

    it('DI-019: Character duplicate does NOT copy sections/canvasItems (by design)', async () => {
      const project = await projectRepository.create('Test Project')
      const { character: original, sections, canvasItems } = await createFullCharacter(project.id)

      expect(sections).toHaveLength(2)
      expect(canvasItems).toHaveLength(1)

      const duplicate = await characterRepository.duplicate(original.id, 'Copied Character')

      // Verify no sections were copied
      const duplicateSections = await db.sections
        .where('characterId')
        .equals(duplicate!.id)
        .toArray()
      expect(duplicateSections).toHaveLength(0)

      // Original sections should still exist
      const originalSections = await db.sections.where('characterId').equals(original.id).toArray()
      expect(originalSections).toHaveLength(2)
    })
  })

  // ==========================================================================
  // EDITION DUPLICATE TESTS (DI-020 to DI-022)
  // ==========================================================================

  describe('Edition Duplicate (Deep)', () => {
    it('DI-020: Duplicating edition copies metadata, resets status to draft', async () => {
      const project = await projectRepository.create('Test Project')
      const { edition: original } = await createFullEdition(project.id)

      // Change original status to something other than draft
      await editionRepository.updateStatus(original.id, 'in-progress')
      const updatedOriginal = (await editionRepository.getById(original.id))!

      const duplicate = await editionRepository.duplicate(original.id, 'Copied Edition')

      expect(duplicate).toBeDefined()
      expect(duplicate!.id).not.toBe(original.id)
      expect(duplicate!.projectId).toBe(original.projectId)
      expect(duplicate!.title).toBe('Copied Edition')
      expect(duplicate!.synopsis).toBe(original.synopsis)
      expect(duplicate!.volume).toBe(original.volume)
      expect(duplicate!.coverDescription).toBe(original.coverDescription)
      expect(duplicate!.metadata).toEqual(original.metadata)

      // Status should be reset to draft
      expect(updatedOriginal.status).toBe('in-progress')
      expect(duplicate!.status).toBe('draft')

      // sortOrder should be new
      expect(duplicate!.sortOrder).toBeGreaterThan(original.sortOrder)
    })

    it('DI-021: Edition duplicate cascades to pages with new IDs and editionId', async () => {
      const project = await projectRepository.create('Test Project')
      const { edition: original, pages: originalPages } = await createFullEdition(project.id)

      expect(originalPages).toHaveLength(2)

      const duplicate = await editionRepository.duplicate(original.id, 'Copied Edition')
      const duplicatePages = await scriptPageRepository.getByEdition(duplicate!.id)

      expect(duplicatePages).toHaveLength(2)

      // Verify pages have new IDs but same content
      for (let i = 0; i < originalPages.length; i++) {
        const origPage = originalPages[i]
        const dupPage = duplicatePages[i]

        expect(dupPage.id).not.toBe(origPage.id)
        expect(dupPage.editionId).toBe(duplicate!.id)
        expect(dupPage.title).toBe(origPage.title)
        expect(dupPage.goal).toBe(origPage.goal)
        expect(dupPage.setting).toBe(origPage.setting)
        expect(dupPage.pageNumber).toBe(origPage.pageNumber)

        // Status should be preserved (pages don't reset status on duplicate)
        expect(dupPage.status).toBe(origPage.status)
      }

      // Original pages should still exist
      const originalPagesAfter = await scriptPageRepository.getByEdition(original.id)
      expect(originalPagesAfter).toHaveLength(2)
    })

    it('DI-022: Edition duplicate cascades through pages to panels with new IDs', async () => {
      const project = await projectRepository.create('Test Project')
      const { edition: original, pages: originalPages, panels: originalPanels } =
        await createFullEdition(project.id)

      expect(originalPanels).toHaveLength(3) // 2 on page1, 1 on page2

      const duplicate = await editionRepository.duplicate(original.id, 'Copied Edition')
      const duplicatePages = await scriptPageRepository.getByEdition(duplicate!.id)

      // Get all panels for duplicate pages
      let duplicatePanels: Awaited<ReturnType<typeof panelRepository.getByPage>> = []
      for (const page of duplicatePages) {
        const pagePanels = await panelRepository.getByPage(page.id)
        duplicatePanels = [...duplicatePanels, ...pagePanels]
      }

      expect(duplicatePanels).toHaveLength(3)

      // Verify panels have new IDs
      const originalPanelIds = new Set(originalPanels.map((p) => p.id))
      for (const dupPanel of duplicatePanels) {
        expect(originalPanelIds.has(dupPanel.id)).toBe(false)
      }

      // Verify panel content is preserved
      const page1Panels = await panelRepository.getByPage(duplicatePages[0].id)
      expect(page1Panels).toHaveLength(2)
      expect(page1Panels[0].description).toBe('Wide shot of village')
      expect(page1Panels[0].cameraAngle).toBe('aerial')

      // Verify dialogues are copied
      expect(page1Panels[0].dialogues).toHaveLength(2)
      expect(page1Panels[0].dialogues[0].text).toBe('In a distant land...')
      expect(page1Panels[0].dialogues[1].text).toBe('Another beautiful morning.')
    })
  })

  // ==========================================================================
  // SCRIPT PAGE DUPLICATE TESTS (DI-023)
  // ==========================================================================

  describe('ScriptPage Duplicate (Deep)', () => {
    it('DI-023: Duplicating page copies all panels with embedded dialogues', async () => {
      const project = await projectRepository.create('Test Project')
      const { pages: originalPages } = await createFullEdition(project.id)
      const originalPage = originalPages[0] // Page with 2 panels

      const originalPanels = await panelRepository.getByPage(originalPage.id)
      expect(originalPanels).toHaveLength(2)
      expect(originalPanels[0].dialogues).toHaveLength(2)
      expect(originalPanels[1].dialogues).toHaveLength(1)

      const duplicate = await scriptPageRepository.duplicate(originalPage.id)

      expect(duplicate).toBeDefined()
      expect(duplicate!.id).not.toBe(originalPage.id)
      expect(duplicate!.editionId).toBe(originalPage.editionId)
      expect(duplicate!.title).toBe(originalPage.title)
      expect(duplicate!.goal).toBe(originalPage.goal)
      expect(duplicate!.setting).toBe(originalPage.setting)

      // Verify new page number and sortOrder
      expect(duplicate!.pageNumber).toBeGreaterThan(originalPage.pageNumber)
      expect(duplicate!.sortOrder).toBeGreaterThan(originalPage.sortOrder)

      // Verify panels were copied
      const duplicatePanels = await panelRepository.getByPage(duplicate!.id)
      expect(duplicatePanels).toHaveLength(2)

      // Verify panel IDs are new
      expect(duplicatePanels[0].id).not.toBe(originalPanels[0].id)
      expect(duplicatePanels[1].id).not.toBe(originalPanels[1].id)

      // Verify dialogues were copied
      expect(duplicatePanels[0].dialogues).toHaveLength(2)
      expect(duplicatePanels[1].dialogues).toHaveLength(1)

      // Verify dialogue content
      expect(duplicatePanels[0].dialogues[0].text).toBe('In a distant land...')
      expect(duplicatePanels[0].dialogues[1].text).toBe('Another beautiful morning.')
    })
  })

  // ==========================================================================
  // PANEL DUPLICATE TESTS (DI-024)
  // ==========================================================================

  describe('Panel Duplicate', () => {
    it('DI-024: Duplicating panel copies all nested dialogues with new IDs', async () => {
      const project = await projectRepository.create('Test Project')
      const { panels: originalPanels } = await createFullEdition(project.id)
      const originalPanel = originalPanels[0] // Panel with 2 dialogues

      expect(originalPanel.dialogues).toHaveLength(2)

      const duplicate = await panelRepository.duplicate(originalPanel.id)

      expect(duplicate).toBeDefined()
      expect(duplicate!.id).not.toBe(originalPanel.id)
      expect(duplicate!.pageId).toBe(originalPanel.pageId)
      expect(duplicate!.description).toBe(originalPanel.description)
      expect(duplicate!.cameraAngle).toBe(originalPanel.cameraAngle)

      // Verify new panel number and sortOrder
      expect(duplicate!.panelNumber).toBeGreaterThan(originalPanel.panelNumber)
      expect(duplicate!.sortOrder).toBeGreaterThan(originalPanel.sortOrder)

      // Verify dialogues were copied with new IDs
      expect(duplicate!.dialogues).toHaveLength(2)

      const originalDialogueIds = new Set(originalPanel.dialogues.map((d) => d.id))
      for (const dialogue of duplicate!.dialogues) {
        expect(originalDialogueIds.has(dialogue.id)).toBe(false)
      }

      // Verify dialogue content is preserved
      expect(duplicate!.dialogues[0].characterName).toBe(originalPanel.dialogues[0].characterName)
      expect(duplicate!.dialogues[0].text).toBe(originalPanel.dialogues[0].text)
      expect(duplicate!.dialogues[0].type).toBe(originalPanel.dialogues[0].type)

      expect(duplicate!.dialogues[1].characterName).toBe(originalPanel.dialogues[1].characterName)
      expect(duplicate!.dialogues[1].text).toBe(originalPanel.dialogues[1].text)
    })
  })

  // ==========================================================================
  // COMMON DUPLICATE BEHAVIOR TESTS (DI-025 to DI-026)
  // ==========================================================================

  describe('Common Duplicate Behavior', () => {
    it('DI-025: Duplicated entities get correct sortOrder (maxOrder + 1)', async () => {
      const project = await projectRepository.create('Test Project')

      // Create multiple characters
      const char1 = await characterRepository.create(project.id, 'Character 1')
      const char2 = await characterRepository.create(project.id, 'Character 2')
      const char3 = await characterRepository.create(project.id, 'Character 3')

      expect(char1.sortOrder).toBe(0)
      expect(char2.sortOrder).toBe(1)
      expect(char3.sortOrder).toBe(2)

      // Duplicate char1 - should get sortOrder 3
      const duplicate = await characterRepository.duplicate(char1.id, 'Character 1 Copy')

      expect(duplicate!.sortOrder).toBe(3)

      // Verify all characters now
      const allChars = await characterRepository.getByProject(project.id)
      expect(allChars).toHaveLength(4)
      expect(allChars.map((c) => c.sortOrder)).toEqual([0, 1, 2, 3])
    })

    it('DI-026: Duplicated entities get new timestamps', async () => {
      const project = await projectRepository.create('Test Project')
      const edition = await editionRepository.create(project.id, 'Original Edition')

      // Wait a tiny bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      const duplicate = await editionRepository.duplicate(edition.id, 'Copied Edition')

      expect(duplicate!.createdAt.getTime()).toBeGreaterThan(edition.createdAt.getTime())
      expect(duplicate!.updatedAt.getTime()).toBeGreaterThan(edition.updatedAt.getTime())
    })
  })
})
