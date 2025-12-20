/**
 * PanelRepository Test Suite
 *
 * Tests for: src/lib/db/repositories/panelRepository.ts
 * Reference: TEST_CASES.md - Section 1.1 PanelRepository (PN-001 to PN-012)
 */

import { describe, it, expect } from 'vitest'
import { panelRepository } from '@/lib/db/repositories/panelRepository'
import { scriptPageRepository } from '@/lib/db/repositories/scriptPageRepository'
import { editionRepository } from '@/lib/db/repositories/editionRepository'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { db } from '@/lib/db/database'
import type { DialogueType } from '@/types'

describe('PanelRepository', () => {
  // Database is automatically cleaned after each test via setup.ts

  // Helper to create a full hierarchy: project -> edition -> page
  async function createTestPage(title = 'Test Page') {
    const project = await projectRepository.create('Test Project')
    const edition = await editionRepository.create(project.id, 'Test Edition')
    const page = await scriptPageRepository.create(edition.id, { title })
    return { project, edition, page }
  }

  describe('create', () => {
    it('PN-001: should auto-increment panelNumber', async () => {
      const { page } = await createTestPage()

      const panel1 = await panelRepository.create(page.id)
      const panel2 = await panelRepository.create(page.id)
      const panel3 = await panelRepository.create(page.id)

      expect(panel1.panelNumber).toBe(1)
      expect(panel2.panelNumber).toBe(2)
      expect(panel3.panelNumber).toBe(3)
    })

    it('should create panel with all required fields', async () => {
      const { page } = await createTestPage()

      const panel = await panelRepository.create(page.id)

      expect(panel).toBeDefined()
      expect(panel.id).toBeDefined()
      expect(panel.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      expect(panel.pageId).toBe(page.id)
      expect(panel.panelNumber).toBe(1)
      expect(panel.dialogues).toEqual([])
      expect(panel.sortOrder).toBe(0)
      expect(panel.createdAt).toBeInstanceOf(Date)
      expect(panel.updatedAt).toBeInstanceOf(Date)
    })

    it('should create panel with optional fields', async () => {
      const { page } = await createTestPage()

      const panel = await panelRepository.create(page.id, {
        description: 'Wide establishing shot of the city',
        cameraAngle: 'wide',
      })

      expect(panel.description).toBe('Wide establishing shot of the city')
      expect(panel.cameraAngle).toBe('wide')
    })

    it('should auto-increment sortOrder for each new panel', async () => {
      const { page } = await createTestPage()

      const panel1 = await panelRepository.create(page.id)
      const panel2 = await panelRepository.create(page.id)
      const panel3 = await panelRepository.create(page.id)

      expect(panel1.sortOrder).toBe(0)
      expect(panel2.sortOrder).toBe(1)
      expect(panel3.sortOrder).toBe(2)
    })

    it('should auto-increment panelNumber and sortOrder independently per page', async () => {
      const project = await projectRepository.create('Test Project')
      const edition = await editionRepository.create(project.id, 'Test Edition')
      const page1 = await scriptPageRepository.create(edition.id, { title: 'Page 1' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Page 2' })

      const panel1P1 = await panelRepository.create(page1.id)
      const panel1P2 = await panelRepository.create(page2.id)
      const panel2P1 = await panelRepository.create(page1.id)
      const panel2P2 = await panelRepository.create(page2.id)

      // panelNumber per page
      expect(panel1P1.panelNumber).toBe(1)
      expect(panel2P1.panelNumber).toBe(2)
      expect(panel1P2.panelNumber).toBe(1)
      expect(panel2P2.panelNumber).toBe(2)

      // sortOrder per page
      expect(panel1P1.sortOrder).toBe(0)
      expect(panel2P1.sortOrder).toBe(1)
      expect(panel1P2.sortOrder).toBe(0)
      expect(panel2P2.sortOrder).toBe(1)
    })

    it('should persist panel to database', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id, {
        description: 'Persisted Panel',
      })

      const fromDb = await db.panels.get(panel.id)
      expect(fromDb).toBeDefined()
      expect(fromDb?.description).toBe('Persisted Panel')
      expect(fromDb?.pageId).toBe(page.id)
    })

    it('should initialize dialogues as empty array', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      expect(panel.dialogues).toEqual([])
      expect(Array.isArray(panel.dialogues)).toBe(true)
    })

    it('should allow creation with non-existent pageId (no FK validation)', async () => {
      // NOTE: Repository does NOT validate pageId exists - this is by design.
      // IndexedDB has no foreign key constraints.
      const panel = await panelRepository.create('non-existent-page')

      expect(panel).toBeDefined()
      expect(panel.pageId).toBe('non-existent-page')
      expect(panel.panelNumber).toBe(1)
      expect(panel.sortOrder).toBe(0)
    })
  })

  describe('getById', () => {
    it('PN-002: should return panel with dialogues', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id, {
        description: 'Action scene',
        cameraAngle: 'close-up',
      })

      // Add dialogues
      await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'I will save you!',
      })

      const found = await panelRepository.getById(panel.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(panel.id)
      expect(found?.description).toBe('Action scene')
      expect(found?.cameraAngle).toBe('close-up')
      expect(found?.dialogues).toHaveLength(1)
      expect(found?.dialogues[0].text).toBe('I will save you!')
    })

    it('should return undefined for non-existing ID', async () => {
      const found = await panelRepository.getById('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('getByPage', () => {
    it('PN-003: should return panels sorted by sortOrder', async () => {
      const { page } = await createTestPage()

      await panelRepository.create(page.id, { description: 'First' })
      await panelRepository.create(page.id, { description: 'Second' })
      await panelRepository.create(page.id, { description: 'Third' })

      const panels = await panelRepository.getByPage(page.id)

      expect(panels).toHaveLength(3)
      expect(panels[0].description).toBe('First')
      expect(panels[0].sortOrder).toBe(0)
      expect(panels[1].description).toBe('Second')
      expect(panels[1].sortOrder).toBe(1)
      expect(panels[2].description).toBe('Third')
      expect(panels[2].sortOrder).toBe(2)
    })

    it('should return empty array when page has no panels', async () => {
      const { page } = await createTestPage()

      const panels = await panelRepository.getByPage(page.id)

      expect(panels).toEqual([])
    })

    it('should return empty array for non-existent page', async () => {
      const panels = await panelRepository.getByPage('non-existent')

      expect(panels).toEqual([])
    })

    it('should only return panels for specified page', async () => {
      const project = await projectRepository.create('Test Project')
      const edition = await editionRepository.create(project.id, 'Test Edition')
      const page1 = await scriptPageRepository.create(edition.id, { title: 'Page 1' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Page 2' })

      await panelRepository.create(page1.id, { description: 'P1 Panel' })
      await panelRepository.create(page2.id, { description: 'P2 Panel 1' })
      await panelRepository.create(page2.id, { description: 'P2 Panel 2' })

      const p1Panels = await panelRepository.getByPage(page1.id)
      const p2Panels = await panelRepository.getByPage(page2.id)

      expect(p1Panels).toHaveLength(1)
      expect(p1Panels[0].description).toBe('P1 Panel')
      expect(p2Panels).toHaveLength(2)
    })

    it('should respect custom sortOrder after reordering', async () => {
      const { page } = await createTestPage()

      const panel1 = await panelRepository.create(page.id, { description: 'First' })
      await panelRepository.create(page.id, { description: 'Second' })
      await panelRepository.create(page.id, { description: 'Third' })

      // Move First to the end
      await panelRepository.reorder(panel1.id, 10)

      const panels = await panelRepository.getByPage(page.id)
      expect(panels[0].description).toBe('Second')
      expect(panels[1].description).toBe('Third')
      expect(panels[2].description).toBe('First')
    })
  })

  describe('update', () => {
    it('PN-004: should update description and cameraAngle', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      await panelRepository.update(panel.id, {
        description: 'Updated description',
        cameraAngle: 'bird-eye',
      })

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.description).toBe('Updated description')
      expect(updated?.cameraAngle).toBe('bird-eye')
    })

    it('should update updatedAt timestamp', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)
      const originalUpdatedAt = panel.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await panelRepository.update(panel.id, { description: 'Changed' })

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should preserve createdAt on update', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)
      const originalCreatedAt = panel.createdAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await panelRepository.update(panel.id, { description: 'Changed' })

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime())
    })

    it('should not throw when updating non-existent panel and not create garbage', async () => {
      const countBefore = await db.panels.count()

      await expect(
        panelRepository.update('non-existent', { description: 'Test' })
      ).resolves.not.toThrow()

      const countAfter = await db.panels.count()
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('updateDescription', () => {
    it('should update only description', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id, {
        description: 'Original',
        cameraAngle: 'wide',
      })

      await panelRepository.updateDescription(panel.id, 'New description')

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.description).toBe('New description')
      expect(updated?.cameraAngle).toBe('wide') // Preserved
    })
  })

  describe('updatePanelInfo', () => {
    it('PN-005: should update characters array', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      await panelRepository.updatePanelInfo(panel.id, {
        characters: ['hero-id', 'villain-id', 'sidekick-id'],
      })

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.characters).toEqual(['hero-id', 'villain-id', 'sidekick-id'])
    })

    it('should update multiple fields at once', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      await panelRepository.updatePanelInfo(panel.id, {
        description: 'Epic battle',
        cameraAngle: 'dutch-angle',
        characters: ['hero-id'],
        notes: 'Use dramatic lighting',
      })

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.description).toBe('Epic battle')
      expect(updated?.cameraAngle).toBe('dutch-angle')
      expect(updated?.characters).toEqual(['hero-id'])
      expect(updated?.notes).toBe('Use dramatic lighting')
    })

    it('should update only specified fields', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id, {
        description: 'Original description',
        cameraAngle: 'wide',
      })

      await panelRepository.updatePanelInfo(panel.id, {
        notes: 'Added notes',
      })

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.description).toBe('Original description')
      expect(updated?.cameraAngle).toBe('wide')
      expect(updated?.notes).toBe('Added notes')
    })
  })

  describe('addDialogue', () => {
    it('PN-006: should append dialogue with auto sortOrder', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const dialogue1 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'First line',
      })

      const dialogue2 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Villain',
        type: 'speech',
        text: 'Second line',
      })

      expect(dialogue1.sortOrder).toBe(0)
      expect(dialogue2.sortOrder).toBe(1)
      expect(dialogue1.id).toBeDefined()
      expect(dialogue2.id).toBeDefined()
      expect(dialogue1.id).not.toBe(dialogue2.id)

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues).toHaveLength(2)
    })

    it('should throw error when panel does not exist', async () => {
      await expect(
        panelRepository.addDialogue('non-existent', {
          characterName: 'Test',
          type: 'speech',
          text: 'Hello',
        })
      ).rejects.toThrow('Panel not found')
    })

    it('should add dialogue with all fields', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const dialogue = await panelRepository.addDialogue(panel.id, {
        characterId: 'char-123',
        characterName: 'Hero',
        type: 'whisper',
        text: 'Be quiet...',
        direction: '(whispering urgently)',
      })

      expect(dialogue.characterId).toBe('char-123')
      expect(dialogue.characterName).toBe('Hero')
      expect(dialogue.type).toBe('whisper')
      expect(dialogue.text).toBe('Be quiet...')
      expect(dialogue.direction).toBe('(whispering urgently)')
    })

    it('should support all dialogue types', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const dialogueTypes: DialogueType[] = ['speech', 'thought', 'caption', 'sfx', 'narration', 'whisper']

      for (const type of dialogueTypes) {
        const dialogue = await panelRepository.addDialogue(panel.id, {
          characterName: 'Test',
          type,
          text: `${type} text`,
        })
        expect(dialogue.type).toBe(type)
      }

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues).toHaveLength(6)
    })
  })

  describe('updateDialogue', () => {
    it('PN-007: should update dialogue by ID', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const dialogue = await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'Original text',
      })

      await panelRepository.updateDialogue(panel.id, dialogue.id, {
        text: 'Updated text',
        type: 'thought',
      })

      const updated = await panelRepository.getById(panel.id)
      const updatedDialogue = updated?.dialogues.find((d) => d.id === dialogue.id)

      expect(updatedDialogue?.text).toBe('Updated text')
      expect(updatedDialogue?.type).toBe('thought')
      expect(updatedDialogue?.characterName).toBe('Hero') // Preserved
    })

    it('should not affect other dialogues', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const d1 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'First',
      })

      const d2 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Villain',
        type: 'speech',
        text: 'Second',
      })

      await panelRepository.updateDialogue(panel.id, d1.id, { text: 'Updated First' })

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues.find((d) => d.id === d1.id)?.text).toBe('Updated First')
      expect(updated?.dialogues.find((d) => d.id === d2.id)?.text).toBe('Second')
    })

    it('should do nothing when panel does not exist', async () => {
      const countBefore = await db.panels.count()

      await expect(
        panelRepository.updateDialogue('non-existent', 'dialogue-id', { text: 'Test' })
      ).resolves.not.toThrow()

      const countAfter = await db.panels.count()
      expect(countAfter).toBe(countBefore)
    })

    it('should preserve dialogue if dialogueId not found', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'Keep me',
      })

      await panelRepository.updateDialogue(panel.id, 'non-existent-dialogue', { text: 'New' })

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues).toHaveLength(1)
      expect(updated?.dialogues[0].text).toBe('Keep me')
    })
  })

  describe('removeDialogue', () => {
    it('PN-008: should remove dialogue and keep remaining', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const d1 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'Keep',
      })

      const d2 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Villain',
        type: 'speech',
        text: 'Remove',
      })

      const d3 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Sidekick',
        type: 'speech',
        text: 'Also Keep',
      })

      await panelRepository.removeDialogue(panel.id, d2.id)

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues).toHaveLength(2)
      expect(updated?.dialogues.map((d) => d.text)).toEqual(['Keep', 'Also Keep'])
    })

    it('should do nothing when panel does not exist', async () => {
      await expect(
        panelRepository.removeDialogue('non-existent', 'dialogue-id')
      ).resolves.not.toThrow()
    })

    it('should do nothing when dialogue not found', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'Keep me',
      })

      await panelRepository.removeDialogue(panel.id, 'non-existent-dialogue')

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues).toHaveLength(1)
    })

    it('should preserve sortOrder values (with gaps) after removal', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const d1 = await panelRepository.addDialogue(panel.id, {
        characterName: 'First',
        type: 'speech',
        text: 'A',
      })

      const d2 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Second',
        type: 'speech',
        text: 'B',
      })

      const d3 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Third',
        type: 'speech',
        text: 'C',
      })

      // Remove the middle dialogue
      await panelRepository.removeDialogue(panel.id, d2.id)

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues).toHaveLength(2)

      // sortOrder should be preserved with a gap (0 and 2, not 0 and 1)
      const firstDialogue = updated?.dialogues.find((d) => d.id === d1.id)
      const thirdDialogue = updated?.dialogues.find((d) => d.id === d3.id)

      expect(firstDialogue?.sortOrder).toBe(0)
      expect(thirdDialogue?.sortOrder).toBe(2) // Gap preserved, NOT auto-compacted to 1
    })
  })

  describe('reorderDialogues', () => {
    it('PN-009: should update sortOrder for dialogues', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const d1 = await panelRepository.addDialogue(panel.id, {
        characterName: 'First',
        type: 'speech',
        text: 'A',
      })

      const d2 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Second',
        type: 'speech',
        text: 'B',
      })

      const d3 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Third',
        type: 'speech',
        text: 'C',
      })

      // Reorder: C, A, B
      await panelRepository.reorderDialogues(panel.id, [d3.id, d1.id, d2.id])

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues[0].characterName).toBe('Third')
      expect(updated?.dialogues[0].sortOrder).toBe(0)
      expect(updated?.dialogues[1].characterName).toBe('First')
      expect(updated?.dialogues[1].sortOrder).toBe(1)
      expect(updated?.dialogues[2].characterName).toBe('Second')
      expect(updated?.dialogues[2].sortOrder).toBe(2)
    })

    it('should filter out non-existent dialogue IDs', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const d1 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Keep',
        type: 'speech',
        text: 'A',
      })

      // Include a non-existent ID - should be filtered out
      await panelRepository.reorderDialogues(panel.id, [d1.id, 'non-existent'])

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.dialogues).toHaveLength(1)
      expect(updated?.dialogues[0].characterName).toBe('Keep')
    })

    it('should DELETE dialogues not included in dialogueIds array (data loss behavior)', async () => {
      // WARNING: This documents potentially dangerous behavior!
      // If you call reorderDialogues with a partial list, missing dialogues are permanently deleted.
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const d1 = await panelRepository.addDialogue(panel.id, {
        characterName: 'First',
        type: 'speech',
        text: 'A',
      })

      const d2 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Second',
        type: 'speech',
        text: 'B',
      })

      const d3 = await panelRepository.addDialogue(panel.id, {
        characterName: 'Third',
        type: 'speech',
        text: 'C',
      })

      // Only include d1 and d3 - d2 will be DELETED (not just excluded from reorder)
      await panelRepository.reorderDialogues(panel.id, [d3.id, d1.id])

      const updated = await panelRepository.getById(panel.id)

      // d2 is permanently gone - this is the current implementation behavior
      expect(updated?.dialogues).toHaveLength(2)
      expect(updated?.dialogues.map((d) => d.characterName)).toEqual(['Third', 'First'])

      // d2 is not recoverable
      expect(updated?.dialogues.find((d) => d.id === d2.id)).toBeUndefined()
    })

    it('should do nothing when panel does not exist', async () => {
      await expect(
        panelRepository.reorderDialogues('non-existent', ['a', 'b'])
      ).resolves.not.toThrow()
    })
  })

  describe('reorder', () => {
    it('PN-010: should update sortOrder for panel', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      expect(panel.sortOrder).toBe(0)

      await panelRepository.reorder(panel.id, 5)

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.sortOrder).toBe(5)
    })

    it('should allow negative sortOrder', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      await panelRepository.reorder(panel.id, -1)

      const updated = await panelRepository.getById(panel.id)
      expect(updated?.sortOrder).toBe(-1)
    })
  })

  describe('renumber', () => {
    it('should renumber all panels in page sequentially', async () => {
      const { page } = await createTestPage()

      // Create 3 panels
      await panelRepository.create(page.id, { description: 'First' })
      const panel2 = await panelRepository.create(page.id, { description: 'Second' })
      await panelRepository.create(page.id, { description: 'Third' })

      // Delete middle panel (creates gap)
      await panelRepository.delete(panel2.id)

      // Renumber
      await panelRepository.renumber(page.id)

      const panels = await panelRepository.getByPage(page.id)
      expect(panels).toHaveLength(2)
      expect(panels[0].panelNumber).toBe(1)
      expect(panels[0].sortOrder).toBe(0)
      expect(panels[1].panelNumber).toBe(2)
      expect(panels[1].sortOrder).toBe(1)
    })

    it('should work on page with no panels', async () => {
      const { page } = await createTestPage()

      await expect(panelRepository.renumber(page.id)).resolves.not.toThrow()
    })

    it('should reset sortOrder based on current order', async () => {
      const { page } = await createTestPage()

      const panel1 = await panelRepository.create(page.id, { description: 'First' })
      const panel2 = await panelRepository.create(page.id, { description: 'Second' })
      const panel3 = await panelRepository.create(page.id, { description: 'Third' })

      // Manually reorder to create gaps
      await panelRepository.reorder(panel1.id, 10)
      await panelRepository.reorder(panel2.id, 5)
      await panelRepository.reorder(panel3.id, 7)

      // Renumber
      await panelRepository.renumber(page.id)

      // Should be renumbered based on sortOrder: panel2(5), panel3(7), panel1(10)
      const panels = await panelRepository.getByPage(page.id)
      expect(panels[0].description).toBe('Second')
      expect(panels[0].panelNumber).toBe(1)
      expect(panels[0].sortOrder).toBe(0)
      expect(panels[1].description).toBe('Third')
      expect(panels[1].panelNumber).toBe(2)
      expect(panels[1].sortOrder).toBe(1)
      expect(panels[2].description).toBe('First')
      expect(panels[2].panelNumber).toBe(3)
      expect(panels[2].sortOrder).toBe(2)
    })
  })

  describe('delete', () => {
    it('PN-011: should remove panel with all dialogues', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      // Add dialogues
      await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'Line 1',
      })
      await panelRepository.addDialogue(panel.id, {
        characterName: 'Hero',
        type: 'speech',
        text: 'Line 2',
      })

      await panelRepository.delete(panel.id)

      const deleted = await panelRepository.getById(panel.id)
      expect(deleted).toBeUndefined()
    })

    it('should not throw when deleting non-existent panel', async () => {
      const countBefore = await db.panels.count()

      await expect(panelRepository.delete('non-existent')).resolves.not.toThrow()

      const countAfter = await db.panels.count()
      expect(countAfter).toBe(countBefore)
    })

    it('should not affect other panels in the same page', async () => {
      const { page } = await createTestPage()

      const panel1 = await panelRepository.create(page.id, { description: 'Keep Me' })
      const panel2 = await panelRepository.create(page.id, { description: 'Delete Me' })

      await panelRepository.delete(panel2.id)

      const remaining = await panelRepository.getByPage(page.id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].description).toBe('Keep Me')
    })

    it('should preserve sortOrder gaps after deletion', async () => {
      const { page } = await createTestPage()

      await panelRepository.create(page.id, { description: 'First' })
      const panel2 = await panelRepository.create(page.id, { description: 'Second' })
      await panelRepository.create(page.id, { description: 'Third' })

      await panelRepository.delete(panel2.id)

      const panels = await panelRepository.getByPage(page.id)
      expect(panels).toHaveLength(2)
      expect(panels[0].description).toBe('First')
      expect(panels[0].sortOrder).toBe(0)
      expect(panels[1].description).toBe('Third')
      expect(panels[1].sortOrder).toBe(2) // Gap preserved
    })
  })

  describe('duplicate', () => {
    it('PN-012: should copy panel with all dialogues', async () => {
      const { page } = await createTestPage()
      const original = await panelRepository.create(page.id, {
        description: 'Epic battle scene',
        cameraAngle: 'dutch-angle',
      })

      await panelRepository.updatePanelInfo(original.id, {
        characters: ['hero-id', 'villain-id'],
        notes: 'Use dramatic music',
      })

      // Add dialogues
      await panelRepository.addDialogue(original.id, {
        characterId: 'hero-id',
        characterName: 'Hero',
        type: 'speech',
        text: 'I will stop you!',
        direction: '(shouting)',
      })
      await panelRepository.addDialogue(original.id, {
        characterId: 'villain-id',
        characterName: 'Villain',
        type: 'thought',
        text: 'He is stronger than I thought...',
      })

      const duplicated = await panelRepository.duplicate(original.id)

      expect(duplicated).toBeDefined()
      expect(duplicated?.id).not.toBe(original.id)
      expect(duplicated?.pageId).toBe(original.pageId)

      // Content copied
      expect(duplicated?.description).toBe('Epic battle scene')
      expect(duplicated?.cameraAngle).toBe('dutch-angle')
      expect(duplicated?.characters).toEqual(['hero-id', 'villain-id'])
      expect(duplicated?.notes).toBe('Use dramatic music')

      // Dialogues copied with new IDs
      expect(duplicated?.dialogues).toHaveLength(2)
      expect(duplicated?.dialogues[0].id).not.toBe(original.id)
      expect(duplicated?.dialogues[0].text).toBe('I will stop you!')
      expect(duplicated?.dialogues[0].direction).toBe('(shouting)')
      expect(duplicated?.dialogues[1].text).toBe('He is stronger than I thought...')
    })

    it('should get next panelNumber and sortOrder', async () => {
      const { page } = await createTestPage()
      await panelRepository.create(page.id)
      await panelRepository.create(page.id)
      const original = await panelRepository.create(page.id)

      const duplicated = await panelRepository.duplicate(original.id)

      expect(duplicated?.panelNumber).toBe(4)
      expect(duplicated?.sortOrder).toBe(3)
    })

    it('should create new timestamps', async () => {
      const { page } = await createTestPage()
      const original = await panelRepository.create(page.id)

      await new Promise((resolve) => setTimeout(resolve, 10))
      const duplicated = await panelRepository.duplicate(original.id)

      expect(duplicated?.createdAt.getTime()).toBeGreaterThan(original.createdAt.getTime())
      expect(duplicated?.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime())
    })

    it('should return undefined for non-existent ID', async () => {
      const result = await panelRepository.duplicate('non-existent')

      expect(result).toBeUndefined()
    })

    it('should work for panel with no dialogues', async () => {
      const { page } = await createTestPage()
      const original = await panelRepository.create(page.id, {
        description: 'Empty panel',
      })

      const duplicated = await panelRepository.duplicate(original.id)

      expect(duplicated).toBeDefined()
      expect(duplicated?.description).toBe('Empty panel')
      expect(duplicated?.dialogues).toHaveLength(0)
    })

    it('should give dialogues new IDs (not reuse original)', async () => {
      const { page } = await createTestPage()
      const original = await panelRepository.create(page.id)

      const originalDialogue = await panelRepository.addDialogue(original.id, {
        characterName: 'Test',
        type: 'speech',
        text: 'Hello',
      })

      const duplicated = await panelRepository.duplicate(original.id)

      // Verify the duplicated dialogue has a different ID than the original dialogue
      expect(duplicated?.dialogues[0].id).not.toBe(originalDialogue.id)

      // Also verify against the persisted original to be thorough
      const originalPanel = await panelRepository.getById(original.id)
      expect(duplicated?.dialogues[0].id).not.toBe(originalPanel?.dialogues[0].id)
    })
  })

  describe('createDialogueObject', () => {
    it('should create dialogue object with required fields', async () => {
      const dialogue = panelRepository.createDialogueObject('Hero', 'Hello world')

      expect(dialogue.characterName).toBe('Hero')
      expect(dialogue.text).toBe('Hello world')
      expect(dialogue.type).toBe('speech') // Default
      expect(dialogue.characterId).toBeUndefined()
      expect(dialogue.direction).toBeUndefined()
    })

    it('should create dialogue object with all fields', async () => {
      const dialogue = panelRepository.createDialogueObject(
        'Villain',
        'You fool!',
        'whisper',
        'villain-123',
        '(menacingly)'
      )

      expect(dialogue.characterName).toBe('Villain')
      expect(dialogue.text).toBe('You fool!')
      expect(dialogue.type).toBe('whisper')
      expect(dialogue.characterId).toBe('villain-123')
      expect(dialogue.direction).toBe('(menacingly)')
    })
  })

  describe('special characters', () => {
    it('should handle unicode, emojis, and special characters in description', async () => {
      const { page } = await createTestPage()

      const specialDescriptions = [
        'Escena dramática en español',
        'Сцена на русском',
        '日本語のシーン',
        'Scene with "quotes" & <special> chars',
        'Action scene! 💥🔥⚡',
      ]

      for (const description of specialDescriptions) {
        const panel = await panelRepository.create(page.id, { description })
        const retrieved = await panelRepository.getById(panel.id)
        expect(retrieved?.description).toBe(description)
      }
    })

    it('should handle special characters in dialogue text', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const dialogue = await panelRepository.addDialogue(panel.id, {
        characterName: 'Héroe 🦸',
        type: 'speech',
        text: '¿Qué pasa? "Something" & <danger>!',
        direction: '(gritando — urgently)',
      })

      const retrieved = await panelRepository.getById(panel.id)
      const savedDialogue = retrieved?.dialogues.find((d) => d.id === dialogue.id)

      expect(savedDialogue?.characterName).toBe('Héroe 🦸')
      expect(savedDialogue?.text).toBe('¿Qué pasa? "Something" & <danger>!')
      expect(savedDialogue?.direction).toBe('(gritando — urgently)')
    })
  })

  describe('edge cases', () => {
    it('should handle very long description', async () => {
      const { page } = await createTestPage()
      const longDescription = 'A'.repeat(2000)

      const panel = await panelRepository.create(page.id, { description: longDescription })

      expect(panel.description).toBe(longDescription)
      expect(panel.description?.length).toBe(2000)
    })

    it('should handle panel with many dialogues', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      // Create 20 dialogues
      for (let i = 0; i < 20; i++) {
        await panelRepository.addDialogue(panel.id, {
          characterName: `Character ${i + 1}`,
          type: 'speech',
          text: `Line ${i + 1}`,
        })
      }

      const retrieved = await panelRepository.getById(panel.id)
      expect(retrieved?.dialogues).toHaveLength(20)
      expect(retrieved?.dialogues[19].sortOrder).toBe(19)
    })

    it('should handle page with many panels', async () => {
      const { page } = await createTestPage()

      // Create 30 panels
      for (let i = 0; i < 30; i++) {
        await panelRepository.create(page.id, { description: `Panel ${i + 1}` })
      }

      const panels = await panelRepository.getByPage(page.id)
      expect(panels).toHaveLength(30)
      expect(panels[29].panelNumber).toBe(30)
    })

    it('should handle simultaneous panels across pages', async () => {
      const project = await projectRepository.create('Test')
      const edition = await editionRepository.create(project.id, 'Edition')
      const page1 = await scriptPageRepository.create(edition.id, { title: 'P1' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'P2' })

      // Create panels in alternating order
      const p1Panel1 = await panelRepository.create(page1.id, { description: 'P1-Panel1' })
      const p2Panel1 = await panelRepository.create(page2.id, { description: 'P2-Panel1' })
      const p1Panel2 = await panelRepository.create(page1.id, { description: 'P1-Panel2' })
      const p2Panel2 = await panelRepository.create(page2.id, { description: 'P2-Panel2' })

      // Verify isolation
      const p1Panels = await panelRepository.getByPage(page1.id)
      const p2Panels = await panelRepository.getByPage(page2.id)

      expect(p1Panels).toHaveLength(2)
      expect(p2Panels).toHaveLength(2)
      expect(p1Panels.map((p) => p.description)).toEqual(['P1-Panel1', 'P1-Panel2'])
      expect(p2Panels.map((p) => p.description)).toEqual(['P2-Panel1', 'P2-Panel2'])
    })

    it('should handle empty dialogue text', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)

      const dialogue = await panelRepository.addDialogue(panel.id, {
        characterName: 'Silent',
        type: 'speech',
        text: '',
      })

      expect(dialogue.text).toBe('')

      const retrieved = await panelRepository.getById(panel.id)
      expect(retrieved?.dialogues[0].text).toBe('')
    })

    it('should handle dialogue with very long text', async () => {
      const { page } = await createTestPage()
      const panel = await panelRepository.create(page.id)
      const longText = 'B'.repeat(5000)

      const dialogue = await panelRepository.addDialogue(panel.id, {
        characterName: 'Narrator',
        type: 'narration',
        text: longText,
      })

      expect(dialogue.text.length).toBe(5000)

      const retrieved = await panelRepository.getById(panel.id)
      expect(retrieved?.dialogues[0].text.length).toBe(5000)
    })
  })
})
