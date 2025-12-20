/**
 * ScriptPageRepository Test Suite
 *
 * Tests for: src/lib/db/repositories/scriptPageRepository.ts
 * Reference: TEST_CASES.md - Section 1.1 ScriptPageRepository (SP-001 to SP-010)
 */

import { describe, it, expect } from 'vitest'
import { scriptPageRepository } from '@/lib/db/repositories/scriptPageRepository'
import { editionRepository } from '@/lib/db/repositories/editionRepository'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { db } from '@/lib/db/database'
import type { PageStatus, Panel } from '@/types'

describe('ScriptPageRepository', () => {
  // Database is automatically cleaned after each test via setup.ts

  // Helper to create a project
  async function createTestProject(name = 'Test Project') {
    return projectRepository.create(name)
  }

  // Helper to create an edition for page tests
  async function createTestEdition(title = 'Test Edition') {
    const project = await createTestProject()
    return editionRepository.create(project.id, title)
  }

  // Helper to create a panel directly in DB
  async function createTestPanel(
    pageId: string,
    options: Partial<Panel> = {}
  ): Promise<Panel> {
    const now = new Date()
    const id = crypto.randomUUID()
    const panel: Panel = {
      id,
      pageId,
      panelNumber: options.panelNumber ?? 1,
      description: options.description,
      cameraAngle: options.cameraAngle,
      dialogues: options.dialogues ?? [],
      sortOrder: options.sortOrder ?? 0,
      createdAt: options.createdAt ?? now,
      updatedAt: options.updatedAt ?? now,
    }
    await db.panels.add(panel)
    return panel
  }

  describe('create', () => {
    it('SP-001: should auto-increment pageNumber', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id)
      const page2 = await scriptPageRepository.create(edition.id)
      const page3 = await scriptPageRepository.create(edition.id)

      expect(page1.pageNumber).toBe(1)
      expect(page2.pageNumber).toBe(2)
      expect(page3.pageNumber).toBe(3)
    })

    it('should create page with all required fields', async () => {
      const edition = await createTestEdition()

      const page = await scriptPageRepository.create(edition.id)

      expect(page).toBeDefined()
      expect(page.id).toBeDefined()
      expect(page.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      expect(page.editionId).toBe(edition.id)
      expect(page.pageNumber).toBe(1)
      expect(page.status).toBe('draft')
      expect(page.sortOrder).toBe(0)
      expect(page.createdAt).toBeInstanceOf(Date)
      expect(page.updatedAt).toBeInstanceOf(Date)
    })

    it('should create page with optional fields', async () => {
      const edition = await createTestEdition()

      const page = await scriptPageRepository.create(edition.id, {
        title: 'The Beginning',
        goal: 'Introduce the hero',
        setting: 'City rooftop at night',
      })

      expect(page.title).toBe('The Beginning')
      expect(page.goal).toBe('Introduce the hero')
      expect(page.setting).toBe('City rooftop at night')
    })

    it('should auto-increment sortOrder for each new page', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id)
      const page2 = await scriptPageRepository.create(edition.id)
      const page3 = await scriptPageRepository.create(edition.id)

      expect(page1.sortOrder).toBe(0)
      expect(page2.sortOrder).toBe(1)
      expect(page3.sortOrder).toBe(2)
    })

    it('should auto-increment pageNumber and sortOrder independently per edition', async () => {
      const project = await createTestProject()
      const edition1 = await editionRepository.create(project.id, 'Edition 1')
      const edition2 = await editionRepository.create(project.id, 'Edition 2')

      const page1E1 = await scriptPageRepository.create(edition1.id)
      const page1E2 = await scriptPageRepository.create(edition2.id)
      const page2E1 = await scriptPageRepository.create(edition1.id)
      const page2E2 = await scriptPageRepository.create(edition2.id)

      // pageNumber per edition
      expect(page1E1.pageNumber).toBe(1)
      expect(page2E1.pageNumber).toBe(2)
      expect(page1E2.pageNumber).toBe(1)
      expect(page2E2.pageNumber).toBe(2)

      // sortOrder per edition
      expect(page1E1.sortOrder).toBe(0)
      expect(page2E1.sortOrder).toBe(1)
      expect(page1E2.sortOrder).toBe(0)
      expect(page2E2.sortOrder).toBe(1)
    })

    it('should persist page to database', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id, {
        title: 'Persisted Page',
      })

      const fromDb = await db.scriptPages.get(page.id)
      expect(fromDb).toBeDefined()
      expect(fromDb?.title).toBe('Persisted Page')
      expect(fromDb?.editionId).toBe(edition.id)
    })

    it('should allow creation with non-existent editionId (no FK validation)', async () => {
      // NOTE: Repository does NOT validate editionId exists - this is by design.
      // IndexedDB has no foreign key constraints.
      const page = await scriptPageRepository.create('non-existent-edition')

      expect(page).toBeDefined()
      expect(page.editionId).toBe('non-existent-edition')
    })

    it('should calculate next pageNumber correctly when there are gaps', async () => {
      const edition = await createTestEdition()

      // Create 3 pages
      const page1 = await scriptPageRepository.create(edition.id)
      const page2 = await scriptPageRepository.create(edition.id)
      await scriptPageRepository.create(edition.id)

      // Delete middle page
      await scriptPageRepository.delete(page2.id)

      // Create new page - should use max + 1
      const newPage = await scriptPageRepository.create(edition.id)
      expect(newPage.pageNumber).toBe(4) // Not 2, because we use max + 1
    })
  })

  describe('getById', () => {
    it('SP-003: should return complete page data', async () => {
      const edition = await createTestEdition()
      const created = await scriptPageRepository.create(edition.id, {
        title: 'Action Scene',
        goal: 'High tension moment',
        setting: 'Abandoned warehouse',
      })

      await scriptPageRepository.updatePageInfo(created.id, {
        timeOfDay: 'night',
        mood: 'tense',
        notes: 'Key dramatic moment',
      })

      const found = await scriptPageRepository.getById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.title).toBe('Action Scene')
      expect(found?.goal).toBe('High tension moment')
      expect(found?.setting).toBe('Abandoned warehouse')
      expect(found?.timeOfDay).toBe('night')
      expect(found?.mood).toBe('tense')
      expect(found?.notes).toBe('Key dramatic moment')
    })

    it('should return undefined for non-existing ID', async () => {
      const found = await scriptPageRepository.getById('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('getByEdition', () => {
    it('SP-004: should return pages sorted by sortOrder', async () => {
      const edition = await createTestEdition()

      await scriptPageRepository.create(edition.id, { title: 'First' })
      await scriptPageRepository.create(edition.id, { title: 'Second' })
      await scriptPageRepository.create(edition.id, { title: 'Third' })

      const pages = await scriptPageRepository.getByEdition(edition.id)

      expect(pages).toHaveLength(3)
      expect(pages[0].title).toBe('First')
      expect(pages[0].sortOrder).toBe(0)
      expect(pages[1].title).toBe('Second')
      expect(pages[1].sortOrder).toBe(1)
      expect(pages[2].title).toBe('Third')
      expect(pages[2].sortOrder).toBe(2)
    })

    it('should return empty array when edition has no pages', async () => {
      const edition = await createTestEdition()

      const pages = await scriptPageRepository.getByEdition(edition.id)

      expect(pages).toEqual([])
    })

    it('should return empty array for non-existent edition', async () => {
      const pages = await scriptPageRepository.getByEdition('non-existent')

      expect(pages).toEqual([])
    })

    it('should only return pages for specified edition', async () => {
      const project = await createTestProject()
      const edition1 = await editionRepository.create(project.id, 'Edition 1')
      const edition2 = await editionRepository.create(project.id, 'Edition 2')

      await scriptPageRepository.create(edition1.id, { title: 'E1 Page' })
      await scriptPageRepository.create(edition2.id, { title: 'E2 Page 1' })
      await scriptPageRepository.create(edition2.id, { title: 'E2 Page 2' })

      const e1Pages = await scriptPageRepository.getByEdition(edition1.id)
      const e2Pages = await scriptPageRepository.getByEdition(edition2.id)

      expect(e1Pages).toHaveLength(1)
      expect(e1Pages[0].title).toBe('E1 Page')
      expect(e2Pages).toHaveLength(2)
    })

    it('should return empty array after all pages are deleted', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id)
      const page2 = await scriptPageRepository.create(edition.id)

      await scriptPageRepository.delete(page1.id)
      await scriptPageRepository.delete(page2.id)

      const remaining = await scriptPageRepository.getByEdition(edition.id)
      expect(remaining).toEqual([])
      expect(Array.isArray(remaining)).toBe(true)
    })

    it('should respect custom sortOrder after reordering', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id, { title: 'First' })
      await scriptPageRepository.create(edition.id, { title: 'Second' })
      await scriptPageRepository.create(edition.id, { title: 'Third' })

      // Move First to the end
      await scriptPageRepository.reorder(page1.id, 10)

      const pages = await scriptPageRepository.getByEdition(edition.id)
      expect(pages[0].title).toBe('Second')
      expect(pages[1].title).toBe('Third')
      expect(pages[2].title).toBe('First')
    })
  })

  describe('update', () => {
    it('should update page fields', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      await scriptPageRepository.update(page.id, {
        title: 'Updated Title',
        goal: 'New goal',
        setting: 'New setting',
      })

      const updated = await scriptPageRepository.getById(page.id)
      expect(updated?.title).toBe('Updated Title')
      expect(updated?.goal).toBe('New goal')
      expect(updated?.setting).toBe('New setting')
    })

    it('should update updatedAt timestamp', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)
      const originalUpdatedAt = page.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await scriptPageRepository.update(page.id, { title: 'Changed' })

      const updated = await scriptPageRepository.getById(page.id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should preserve createdAt on update', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)
      const originalCreatedAt = page.createdAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await scriptPageRepository.update(page.id, { title: 'Changed' })

      const updated = await scriptPageRepository.getById(page.id)
      expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime())
    })

    it('should not throw when updating non-existent page and not create garbage', async () => {
      const countBefore = await db.scriptPages.count()

      await expect(
        scriptPageRepository.update('non-existent', { title: 'Test' })
      ).resolves.not.toThrow()

      const countAfter = await db.scriptPages.count()
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('updateStatus', () => {
    it('SP-006: should transition between status values', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      expect(page.status).toBe('draft')

      await scriptPageRepository.updateStatus(page.id, 'scripted')
      let updated = await scriptPageRepository.getById(page.id)
      expect(updated?.status).toBe('scripted')

      await scriptPageRepository.updateStatus(page.id, 'review')
      updated = await scriptPageRepository.getById(page.id)
      expect(updated?.status).toBe('review')

      await scriptPageRepository.updateStatus(page.id, 'approved')
      updated = await scriptPageRepository.getById(page.id)
      expect(updated?.status).toBe('approved')
    })

    it('should accept all valid PageStatus values', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      const validStatuses: PageStatus[] = ['draft', 'scripted', 'review', 'approved']

      for (const status of validStatuses) {
        await scriptPageRepository.updateStatus(page.id, status)
        const updated = await scriptPageRepository.getById(page.id)
        expect(updated?.status).toBe(status)
      }
    })

    it('should not throw when updating status of non-existent page', async () => {
      const countBefore = await db.scriptPages.count()

      await expect(
        scriptPageRepository.updateStatus('non-existent', 'approved')
      ).resolves.not.toThrow()

      const countAfter = await db.scriptPages.count()
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('updatePageInfo', () => {
    it('SP-005: should update goal, setting, timeOfDay, mood, notes', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      await scriptPageRepository.updatePageInfo(page.id, {
        title: 'Scene Title',
        goal: 'Build tension',
        setting: 'Dark alley',
        timeOfDay: 'midnight',
        mood: 'suspenseful',
        notes: 'Use dramatic lighting',
      })

      const updated = await scriptPageRepository.getById(page.id)
      expect(updated?.title).toBe('Scene Title')
      expect(updated?.goal).toBe('Build tension')
      expect(updated?.setting).toBe('Dark alley')
      expect(updated?.timeOfDay).toBe('midnight')
      expect(updated?.mood).toBe('suspenseful')
      expect(updated?.notes).toBe('Use dramatic lighting')
    })

    it('should update only specified fields', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id, {
        title: 'Original Title',
        goal: 'Original Goal',
      })

      await scriptPageRepository.updatePageInfo(page.id, {
        mood: 'happy',
      })

      const updated = await scriptPageRepository.getById(page.id)
      expect(updated?.title).toBe('Original Title')
      expect(updated?.goal).toBe('Original Goal')
      expect(updated?.mood).toBe('happy')
    })

    it('should do nothing when page does not exist and not create garbage', async () => {
      const countBefore = await db.scriptPages.count()

      await expect(
        scriptPageRepository.updatePageInfo('non-existent', { mood: 'Test' })
      ).resolves.not.toThrow()

      const countAfter = await db.scriptPages.count()
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('reorder', () => {
    it('SP-007: should update sortOrder for page', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      expect(page.sortOrder).toBe(0)

      await scriptPageRepository.reorder(page.id, 5)

      const updated = await scriptPageRepository.getById(page.id)
      expect(updated?.sortOrder).toBe(5)
    })

    it('should allow negative sortOrder', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      await scriptPageRepository.reorder(page.id, -1)

      const updated = await scriptPageRepository.getById(page.id)
      expect(updated?.sortOrder).toBe(-1)
    })
  })

  describe('renumber', () => {
    it('should renumber all pages in edition sequentially', async () => {
      const edition = await createTestEdition()

      // Create 3 pages
      await scriptPageRepository.create(edition.id, { title: 'First' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Second' })
      await scriptPageRepository.create(edition.id, { title: 'Third' })

      // Delete middle page (creates gap)
      await scriptPageRepository.delete(page2.id)

      // Renumber
      await scriptPageRepository.renumber(edition.id)

      const pages = await scriptPageRepository.getByEdition(edition.id)
      expect(pages).toHaveLength(2)
      expect(pages[0].pageNumber).toBe(1)
      expect(pages[0].sortOrder).toBe(0)
      expect(pages[1].pageNumber).toBe(2)
      expect(pages[1].sortOrder).toBe(1)
    })

    it('should work on edition with no pages', async () => {
      const edition = await createTestEdition()

      await expect(scriptPageRepository.renumber(edition.id)).resolves.not.toThrow()
    })

    it('should reset sortOrder based on current order', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id, { title: 'First' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Second' })
      const page3 = await scriptPageRepository.create(edition.id, { title: 'Third' })

      // Manually reorder to create gaps
      await scriptPageRepository.reorder(page1.id, 10)
      await scriptPageRepository.reorder(page2.id, 5)
      await scriptPageRepository.reorder(page3.id, 7)

      // Renumber
      await scriptPageRepository.renumber(edition.id)

      // Should be renumbered based on sortOrder: page2(5), page3(7), page1(10)
      const pages = await scriptPageRepository.getByEdition(edition.id)
      expect(pages[0].title).toBe('Second')
      expect(pages[0].pageNumber).toBe(1)
      expect(pages[0].sortOrder).toBe(0)
      expect(pages[1].title).toBe('Third')
      expect(pages[1].pageNumber).toBe(2)
      expect(pages[1].sortOrder).toBe(1)
      expect(pages[2].title).toBe('First')
      expect(pages[2].pageNumber).toBe(3)
      expect(pages[2].sortOrder).toBe(2)
    })
  })

  describe('delete', () => {
    it('should remove page from database', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      await scriptPageRepository.delete(page.id)

      const deleted = await scriptPageRepository.getById(page.id)
      expect(deleted).toBeUndefined()
    })

    it('SP-008: should cascade delete to panels', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      // Create panels
      await createTestPanel(page.id, { panelNumber: 1 })
      await createTestPanel(page.id, { panelNumber: 2 })
      await createTestPanel(page.id, { panelNumber: 3 })

      // Verify panels exist
      expect(await db.panels.where('pageId').equals(page.id).count()).toBe(3)

      // Delete page
      await scriptPageRepository.delete(page.id)

      // Panels should be deleted
      expect(await db.panels.where('pageId').equals(page.id).count()).toBe(0)
    })

    it('should not throw when deleting non-existent page', async () => {
      const countBefore = await db.scriptPages.count()

      await expect(scriptPageRepository.delete('non-existent')).resolves.not.toThrow()

      const countAfter = await db.scriptPages.count()
      expect(countAfter).toBe(countBefore)
    })

    it('should not affect other pages in the same edition', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id, { title: 'Keep Me' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Delete Me' })

      await scriptPageRepository.delete(page2.id)

      const remaining = await scriptPageRepository.getByEdition(edition.id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].title).toBe('Keep Me')
    })

    it('should only delete panels belonging to the page', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id)
      const page2 = await scriptPageRepository.create(edition.id)

      await createTestPanel(page1.id, { panelNumber: 1 })
      await createTestPanel(page2.id, { panelNumber: 1 })

      // Delete page2
      await scriptPageRepository.delete(page2.id)

      // page1's panel should remain
      expect(await db.panels.where('pageId').equals(page1.id).count()).toBe(1)
    })

    it('should preserve sortOrder gaps after deletion', async () => {
      const edition = await createTestEdition()

      await scriptPageRepository.create(edition.id, { title: 'First' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Second' })
      await scriptPageRepository.create(edition.id, { title: 'Third' })

      await scriptPageRepository.delete(page2.id)

      const pages = await scriptPageRepository.getByEdition(edition.id)
      expect(pages).toHaveLength(2)
      expect(pages[0].title).toBe('First')
      expect(pages[0].sortOrder).toBe(0)
      expect(pages[1].title).toBe('Third')
      expect(pages[1].sortOrder).toBe(2) // Gap preserved
    })
  })

  describe('duplicate', () => {
    it('SP-009: should copy with all panels', async () => {
      const edition = await createTestEdition()
      const original = await scriptPageRepository.create(edition.id, {
        title: 'Original Page',
        goal: 'Hero introduction',
        setting: 'City skyline',
      })

      await scriptPageRepository.updatePageInfo(original.id, {
        timeOfDay: 'dawn',
        mood: 'hopeful',
        notes: 'Use warm colors',
      })

      // Create panels with dialogues
      await createTestPanel(original.id, {
        panelNumber: 1,
        description: 'Wide establishing shot',
        cameraAngle: 'wide',
        dialogues: [
          { id: 'd1', characterName: 'Narrator', type: 'caption', text: 'A new day...', sortOrder: 0 },
        ],
      })
      await createTestPanel(original.id, {
        panelNumber: 2,
        description: 'Close-up of hero',
        cameraAngle: 'close-up',
      })

      const duplicated = await scriptPageRepository.duplicate(original.id)

      expect(duplicated).toBeDefined()
      expect(duplicated?.id).not.toBe(original.id)
      expect(duplicated?.editionId).toBe(original.editionId)

      // Content copied
      expect(duplicated?.title).toBe('Original Page')
      expect(duplicated?.goal).toBe('Hero introduction')
      expect(duplicated?.setting).toBe('City skyline')
      expect(duplicated?.timeOfDay).toBe('dawn')
      expect(duplicated?.mood).toBe('hopeful')
      expect(duplicated?.notes).toBe('Use warm colors')

      // Verify panels were duplicated
      const originalPanels = await db.panels.where('pageId').equals(original.id).toArray()
      const duplicatedPanels = await db.panels.where('pageId').equals(duplicated!.id).toArray()

      expect(originalPanels).toHaveLength(2)
      expect(duplicatedPanels).toHaveLength(2)

      // Panels have different IDs
      expect(duplicatedPanels[0].id).not.toBe(originalPanels[0].id)
      expect(duplicatedPanels[0].pageId).toBe(duplicated!.id)

      // Panel content preserved
      const dupWideShot = duplicatedPanels.find((p) => p.description === 'Wide establishing shot')
      expect(dupWideShot).toBeDefined()
      expect(dupWideShot?.cameraAngle).toBe('wide')
      expect(dupWideShot?.dialogues).toHaveLength(1)
      expect(dupWideShot?.dialogues[0].text).toBe('A new day...')
    })

    it('should reset status to draft', async () => {
      const edition = await createTestEdition()
      const original = await scriptPageRepository.create(edition.id)
      await scriptPageRepository.updateStatus(original.id, 'approved')

      const duplicated = await scriptPageRepository.duplicate(original.id)

      expect(duplicated?.status).toBe('draft')
    })

    it('should get next pageNumber and sortOrder', async () => {
      const edition = await createTestEdition()
      await scriptPageRepository.create(edition.id)
      await scriptPageRepository.create(edition.id)
      const original = await scriptPageRepository.create(edition.id)

      const duplicated = await scriptPageRepository.duplicate(original.id)

      expect(duplicated?.pageNumber).toBe(4)
      expect(duplicated?.sortOrder).toBe(3)
    })

    it('should create new timestamps', async () => {
      const edition = await createTestEdition()
      const original = await scriptPageRepository.create(edition.id)

      await new Promise((resolve) => setTimeout(resolve, 10))
      const duplicated = await scriptPageRepository.duplicate(original.id)

      expect(duplicated?.createdAt.getTime()).toBeGreaterThan(original.createdAt.getTime())
      expect(duplicated?.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime())
    })

    it('should return undefined for non-existent ID', async () => {
      const result = await scriptPageRepository.duplicate('non-existent')

      expect(result).toBeUndefined()
    })

    it('should work for page with no panels', async () => {
      const edition = await createTestEdition()
      const original = await scriptPageRepository.create(edition.id, {
        title: 'Empty Page',
      })

      const duplicated = await scriptPageRepository.duplicate(original.id)

      expect(duplicated).toBeDefined()
      expect(duplicated?.title).toBe('Empty Page')

      const panels = await db.panels.where('pageId').equals(duplicated!.id).toArray()
      expect(panels).toHaveLength(0)
    })
  })

  describe('getPanelCount', () => {
    it('SP-010: should return correct panel count', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      await createTestPanel(page.id, { panelNumber: 1 })
      await createTestPanel(page.id, { panelNumber: 2 })
      await createTestPanel(page.id, { panelNumber: 3 })

      const count = await scriptPageRepository.getPanelCount(page.id)

      expect(count).toBe(3)
    })

    it('should return 0 for page with no panels', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      const count = await scriptPageRepository.getPanelCount(page.id)

      expect(count).toBe(0)
    })

    it('should return 0 for non-existent page', async () => {
      const count = await scriptPageRepository.getPanelCount('non-existent')

      expect(count).toBe(0)
    })
  })

  describe('getNextPage', () => {
    it('should return the next page in sortOrder', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id, { title: 'First' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Second' })
      await scriptPageRepository.create(edition.id, { title: 'Third' })

      const next = await scriptPageRepository.getNextPage(page1.id)

      expect(next).toBeDefined()
      expect(next?.id).toBe(page2.id)
      expect(next?.title).toBe('Second')
    })

    it('should return undefined for last page', async () => {
      const edition = await createTestEdition()

      await scriptPageRepository.create(edition.id, { title: 'First' })
      await scriptPageRepository.create(edition.id, { title: 'Second' })
      const lastPage = await scriptPageRepository.create(edition.id, { title: 'Third' })

      const next = await scriptPageRepository.getNextPage(lastPage.id)

      expect(next).toBeUndefined()
    })

    it('should return undefined for non-existent page', async () => {
      const next = await scriptPageRepository.getNextPage('non-existent')

      expect(next).toBeUndefined()
    })

    it('should respect custom sortOrder', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id, { title: 'First' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Second' })
      const page3 = await scriptPageRepository.create(edition.id, { title: 'Third' })

      // Reorder: move First to the end
      await scriptPageRepository.reorder(page1.id, 10)

      // Next after Second should be Third
      const nextAfterSecond = await scriptPageRepository.getNextPage(page2.id)
      expect(nextAfterSecond?.title).toBe('Third')

      // Next after Third should be First (now at end)
      const nextAfterThird = await scriptPageRepository.getNextPage(page3.id)
      expect(nextAfterThird?.title).toBe('First')
    })
  })

  describe('getPreviousPage', () => {
    it('should return the previous page in sortOrder', async () => {
      const edition = await createTestEdition()

      await scriptPageRepository.create(edition.id, { title: 'First' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Second' })
      const page3 = await scriptPageRepository.create(edition.id, { title: 'Third' })

      const prev = await scriptPageRepository.getPreviousPage(page3.id)

      expect(prev).toBeDefined()
      expect(prev?.id).toBe(page2.id)
      expect(prev?.title).toBe('Second')
    })

    it('should return undefined for first page', async () => {
      const edition = await createTestEdition()

      const firstPage = await scriptPageRepository.create(edition.id, { title: 'First' })
      await scriptPageRepository.create(edition.id, { title: 'Second' })

      const prev = await scriptPageRepository.getPreviousPage(firstPage.id)

      expect(prev).toBeUndefined()
    })

    it('should return undefined for non-existent page', async () => {
      const prev = await scriptPageRepository.getPreviousPage('non-existent')

      expect(prev).toBeUndefined()
    })

    it('should respect custom sortOrder', async () => {
      const edition = await createTestEdition()

      const page1 = await scriptPageRepository.create(edition.id, { title: 'First' })
      const page2 = await scriptPageRepository.create(edition.id, { title: 'Second' })
      const page3 = await scriptPageRepository.create(edition.id, { title: 'Third' })

      // Reorder: move First to the end
      await scriptPageRepository.reorder(page1.id, 10)

      // Previous of Third should be Second
      const prevOfThird = await scriptPageRepository.getPreviousPage(page3.id)
      expect(prevOfThird?.title).toBe('Second')

      // Previous of First (now at end) should be Third
      const prevOfFirst = await scriptPageRepository.getPreviousPage(page1.id)
      expect(prevOfFirst?.title).toBe('Third')
    })
  })

  describe('special characters', () => {
    it('should handle unicode, emojis, and special characters in title', async () => {
      const edition = await createTestEdition()

      const specialTitles = [
        'Página en Español',
        'Страница на русском',
        '日本語ページ',
        'Page #1: The Beginning 🎬',
        'Title with "quotes" & <special> chars',
      ]

      for (const title of specialTitles) {
        const page = await scriptPageRepository.create(edition.id, { title })
        const retrieved = await scriptPageRepository.getById(page.id)
        expect(retrieved?.title).toBe(title)
      }
    })

    it('should handle special characters in all text fields', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id, {
        title: 'Título: "La Aventura" 🌟',
        goal: 'Build <tension> & "mystery"',
        setting: 'Café Parisién — 1920s',
      })

      await scriptPageRepository.updatePageInfo(page.id, {
        timeOfDay: 'L\'heure bleue (twilight)',
        mood: 'Romântico & Nostálgico',
        notes: '⚠️ Important: Use émotional lighting',
      })

      const retrieved = await scriptPageRepository.getById(page.id)
      expect(retrieved?.title).toBe('Título: "La Aventura" 🌟')
      expect(retrieved?.goal).toBe('Build <tension> & "mystery"')
      expect(retrieved?.setting).toBe('Café Parisién — 1920s')
      expect(retrieved?.timeOfDay).toBe('L\'heure bleue (twilight)')
      expect(retrieved?.mood).toBe('Romântico & Nostálgico')
      expect(retrieved?.notes).toBe('⚠️ Important: Use émotional lighting')
    })
  })

  describe('edge cases', () => {
    it('should handle very long title', async () => {
      const edition = await createTestEdition()
      const longTitle = 'A'.repeat(1000)

      const page = await scriptPageRepository.create(edition.id, { title: longTitle })

      expect(page.title).toBe(longTitle)
      expect(page.title?.length).toBe(1000)
    })

    it('should handle page with many panels', async () => {
      const edition = await createTestEdition()
      const page = await scriptPageRepository.create(edition.id)

      // Create 20 panels
      for (let i = 0; i < 20; i++) {
        await createTestPanel(page.id, { panelNumber: i + 1, sortOrder: i })
      }

      const count = await scriptPageRepository.getPanelCount(page.id)
      expect(count).toBe(20)
    })

    it('should handle edition with many pages', async () => {
      const edition = await createTestEdition()

      // Create 50 pages
      for (let i = 0; i < 50; i++) {
        await scriptPageRepository.create(edition.id, { title: `Page ${i + 1}` })
      }

      const pages = await scriptPageRepository.getByEdition(edition.id)
      expect(pages).toHaveLength(50)
      expect(pages[49].pageNumber).toBe(50)
    })

    it('should handle simultaneous pages across editions', async () => {
      const project = await createTestProject()
      const edition1 = await editionRepository.create(project.id, 'E1')
      const edition2 = await editionRepository.create(project.id, 'E2')

      // Create pages in alternating order
      const page1E1 = await scriptPageRepository.create(edition1.id, { title: 'E1-P1' })
      const page1E2 = await scriptPageRepository.create(edition2.id, { title: 'E2-P1' })
      const page2E1 = await scriptPageRepository.create(edition1.id, { title: 'E1-P2' })
      const page2E2 = await scriptPageRepository.create(edition2.id, { title: 'E2-P2' })

      // Verify isolation
      const e1Pages = await scriptPageRepository.getByEdition(edition1.id)
      const e2Pages = await scriptPageRepository.getByEdition(edition2.id)

      expect(e1Pages).toHaveLength(2)
      expect(e2Pages).toHaveLength(2)
      expect(e1Pages.map((p) => p.title)).toEqual(['E1-P1', 'E1-P2'])
      expect(e2Pages.map((p) => p.title)).toEqual(['E2-P1', 'E2-P2'])
    })

    it('should handle navigation when only one page exists', async () => {
      const edition = await createTestEdition()
      const onlyPage = await scriptPageRepository.create(edition.id, { title: 'Only' })

      const next = await scriptPageRepository.getNextPage(onlyPage.id)
      const prev = await scriptPageRepository.getPreviousPage(onlyPage.id)

      expect(next).toBeUndefined()
      expect(prev).toBeUndefined()
    })
  })
})
