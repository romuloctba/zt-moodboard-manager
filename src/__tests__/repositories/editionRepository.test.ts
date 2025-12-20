/**
 * EditionRepository Test Suite
 *
 * Tests for: src/lib/db/repositories/editionRepository.ts
 * Reference: TEST_CASES.md - Section 1.1 EditionRepository (ED-001 to ED-013)
 */

import { describe, it, expect } from 'vitest'
import { editionRepository } from '@/lib/db/repositories/editionRepository'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { db } from '@/lib/db/database'
import type { EditionStatus, EditionMetadata, ScriptPage, Panel } from '@/types'

describe('EditionRepository', () => {
  // Database is automatically cleaned after each test via setup.ts

  // Helper to create a project for edition tests
  async function createTestProject(name = 'Test Project') {
    return projectRepository.create(name)
  }

  // Helper to create a test edition
  async function createTestEdition(projectId: string, title = 'Test Edition') {
    return editionRepository.create(projectId, title)
  }

  // Helper to create a script page directly in DB
  async function createTestPage(
    editionId: string,
    options: Partial<ScriptPage> = {}
  ): Promise<ScriptPage> {
    const now = new Date()
    const id = crypto.randomUUID()
    const page: ScriptPage = {
      id,
      editionId,
      pageNumber: options.pageNumber ?? 1,
      title: options.title,
      goal: options.goal,
      setting: options.setting,
      status: options.status ?? 'draft',
      sortOrder: options.sortOrder ?? 0,
      createdAt: options.createdAt ?? now,
      updatedAt: options.updatedAt ?? now,
    }
    await db.scriptPages.add(page)
    return page
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
    it('ED-001: should auto-increment issueNumber if not provided', async () => {
      const project = await createTestProject()

      const ed1 = await editionRepository.create(project.id, 'Issue 1')
      const ed2 = await editionRepository.create(project.id, 'Issue 2')
      const ed3 = await editionRepository.create(project.id, 'Issue 3')

      expect(ed1.issueNumber).toBe(1)
      expect(ed2.issueNumber).toBe(2)
      expect(ed3.issueNumber).toBe(3)
    })

    it('ED-002: should use provided issueNumber', async () => {
      const project = await createTestProject()

      const edition = await editionRepository.create(project.id, 'Special Issue', {
        issueNumber: 100,
      })

      expect(edition.issueNumber).toBe(100)
    })

    it('should create edition with all required fields', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'My Edition')

      expect(edition).toBeDefined()
      expect(edition.id).toBeDefined()
      expect(edition.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      expect(edition.projectId).toBe(project.id)
      expect(edition.title).toBe('My Edition')
      expect(edition.status).toBe('draft')
      expect(edition.metadata).toEqual({})
      expect(edition.sortOrder).toBe(0)
      expect(edition.createdAt).toBeInstanceOf(Date)
      expect(edition.updatedAt).toBeInstanceOf(Date)
    })

    it('should create edition with optional fields', async () => {
      const project = await createTestProject()

      const edition = await editionRepository.create(project.id, 'Full Edition', {
        issueNumber: 5,
        volume: 2,
        synopsis: 'An exciting adventure',
      })

      expect(edition.issueNumber).toBe(5)
      expect(edition.volume).toBe(2)
      expect(edition.synopsis).toBe('An exciting adventure')
    })

    it('should auto-increment sortOrder for each new edition', async () => {
      const project = await createTestProject()

      const ed1 = await editionRepository.create(project.id, 'First')
      const ed2 = await editionRepository.create(project.id, 'Second')
      const ed3 = await editionRepository.create(project.id, 'Third')

      expect(ed1.sortOrder).toBe(0)
      expect(ed2.sortOrder).toBe(1)
      expect(ed3.sortOrder).toBe(2)
    })

    it('should auto-increment sortOrder and issueNumber independently per project', async () => {
      const project1 = await createTestProject('Project 1')
      const project2 = await createTestProject('Project 2')

      const ed1P1 = await editionRepository.create(project1.id, 'P1 Ed1')
      const ed1P2 = await editionRepository.create(project2.id, 'P2 Ed1')
      const ed2P1 = await editionRepository.create(project1.id, 'P1 Ed2')
      const ed2P2 = await editionRepository.create(project2.id, 'P2 Ed2')

      // sortOrder per project
      expect(ed1P1.sortOrder).toBe(0)
      expect(ed2P1.sortOrder).toBe(1)
      expect(ed1P2.sortOrder).toBe(0)
      expect(ed2P2.sortOrder).toBe(1)

      // issueNumber per project
      expect(ed1P1.issueNumber).toBe(1)
      expect(ed2P1.issueNumber).toBe(2)
      expect(ed1P2.issueNumber).toBe(1)
      expect(ed2P2.issueNumber).toBe(2)
    })

    it('should persist edition to database', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Persisted')

      const fromDb = await db.editions.get(edition.id)
      expect(fromDb).toBeDefined()
      expect(fromDb?.title).toBe('Persisted')
      expect(fromDb?.projectId).toBe(project.id)
    })

    it('should allow creation with non-existent projectId (no FK validation)', async () => {
      // NOTE: Repository does NOT validate projectId exists - this is by design.
      // IndexedDB has no foreign key constraints.
      const edition = await editionRepository.create('non-existent-project', 'Orphan')

      expect(edition).toBeDefined()
      expect(edition.projectId).toBe('non-existent-project')
    })

    it('should calculate next issueNumber correctly when there are gaps', async () => {
      const project = await createTestProject()

      // Create editions with explicit issue numbers
      await editionRepository.create(project.id, 'Issue 1', { issueNumber: 1 })
      await editionRepository.create(project.id, 'Issue 5', { issueNumber: 5 })
      await editionRepository.create(project.id, 'Issue 10', { issueNumber: 10 })

      // Auto-assign should use max + 1
      const nextEdition = await editionRepository.create(project.id, 'Next Issue')
      expect(nextEdition.issueNumber).toBe(11)
    })
  })

  describe('getById', () => {
    it('ED-003: should return complete edition with metadata', async () => {
      const project = await createTestProject()
      const created = await editionRepository.create(project.id, 'Full Edition', {
        issueNumber: 1,
        volume: 1,
        synopsis: 'Epic saga',
      })

      await editionRepository.updateMetadata(created.id, {
        genre: 'Fantasy',
        targetAudience: 'Young Adult',
        estimatedPageCount: 24,
      })

      const found = await editionRepository.getById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.title).toBe('Full Edition')
      expect(found?.issueNumber).toBe(1)
      expect(found?.volume).toBe(1)
      expect(found?.synopsis).toBe('Epic saga')
      expect(found?.metadata.genre).toBe('Fantasy')
      expect(found?.metadata.targetAudience).toBe('Young Adult')
      expect(found?.metadata.estimatedPageCount).toBe(24)
    })

    it('should return undefined for non-existing ID', async () => {
      const found = await editionRepository.getById('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('getByProject', () => {
    it('ED-004: should return all editions sorted by sortOrder', async () => {
      const project = await createTestProject()

      await editionRepository.create(project.id, 'First')
      await editionRepository.create(project.id, 'Second')
      await editionRepository.create(project.id, 'Third')

      const editions = await editionRepository.getByProject(project.id)

      expect(editions).toHaveLength(3)
      expect(editions[0].title).toBe('First')
      expect(editions[0].sortOrder).toBe(0)
      expect(editions[1].title).toBe('Second')
      expect(editions[1].sortOrder).toBe(1)
      expect(editions[2].title).toBe('Third')
      expect(editions[2].sortOrder).toBe(2)
    })

    it('should return empty array when project has no editions', async () => {
      const project = await createTestProject()

      const editions = await editionRepository.getByProject(project.id)

      expect(editions).toEqual([])
    })

    it('should return empty array for non-existent project', async () => {
      const editions = await editionRepository.getByProject('non-existent')

      expect(editions).toEqual([])
    })

    it('should only return editions for specified project', async () => {
      const project1 = await createTestProject('Project 1')
      const project2 = await createTestProject('Project 2')

      await editionRepository.create(project1.id, 'P1 Edition')
      await editionRepository.create(project2.id, 'P2 Edition 1')
      await editionRepository.create(project2.id, 'P2 Edition 2')

      const p1Editions = await editionRepository.getByProject(project1.id)
      const p2Editions = await editionRepository.getByProject(project2.id)

      expect(p1Editions).toHaveLength(1)
      expect(p1Editions[0].title).toBe('P1 Edition')
      expect(p2Editions).toHaveLength(2)
    })

    it('should return empty array after all editions are deleted', async () => {
      const project = await createTestProject()

      const ed1 = await editionRepository.create(project.id, 'First')
      const ed2 = await editionRepository.create(project.id, 'Second')

      await editionRepository.delete(ed1.id)
      await editionRepository.delete(ed2.id)

      const remaining = await editionRepository.getByProject(project.id)
      expect(remaining).toEqual([])
      expect(Array.isArray(remaining)).toBe(true)
    })

    it('should respect custom sortOrder after reordering', async () => {
      const project = await createTestProject()

      const ed1 = await editionRepository.create(project.id, 'First')
      const ed2 = await editionRepository.create(project.id, 'Second')
      const ed3 = await editionRepository.create(project.id, 'Third')

      // Reorder: move First to the end
      await editionRepository.reorder(ed1.id, 10)

      const editions = await editionRepository.getByProject(project.id)
      expect(editions[0].title).toBe('Second')
      expect(editions[1].title).toBe('Third')
      expect(editions[2].title).toBe('First')
    })
  })

  describe('update', () => {
    it('should update edition fields', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Original')

      await editionRepository.update(edition.id, {
        title: 'Updated',
        synopsis: 'New synopsis',
        volume: 3,
      })

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.title).toBe('Updated')
      expect(updated?.synopsis).toBe('New synopsis')
      expect(updated?.volume).toBe(3)
    })

    it('should update updatedAt timestamp', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Test')
      const originalUpdatedAt = edition.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await editionRepository.update(edition.id, { title: 'Changed' })

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should preserve createdAt on update', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Test')
      const originalCreatedAt = edition.createdAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await editionRepository.update(edition.id, { title: 'Changed' })

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime())
    })

    it('should not throw when updating non-existent edition and not create garbage', async () => {
      const countBefore = await db.editions.count()

      await expect(
        editionRepository.update('non-existent', { title: 'Test' })
      ).resolves.not.toThrow()

      const countAfter = await db.editions.count()
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('updateTitle', () => {
    it('ED-005: should update title and updatedAt', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Old Title')
      const originalUpdatedAt = edition.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await editionRepository.updateTitle(edition.id, 'New Title')

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.title).toBe('New Title')
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('updateStatus', () => {
    it('ED-006: should update status correctly', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Status Test')

      expect(edition.status).toBe('draft')

      await editionRepository.updateStatus(edition.id, 'in-progress')
      let updated = await editionRepository.getById(edition.id)
      expect(updated?.status).toBe('in-progress')

      await editionRepository.updateStatus(edition.id, 'review')
      updated = await editionRepository.getById(edition.id)
      expect(updated?.status).toBe('review')

      await editionRepository.updateStatus(edition.id, 'complete')
      updated = await editionRepository.getById(edition.id)
      expect(updated?.status).toBe('complete')
    })

    it('ED-007: should accept all valid EditionStatus values', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Test')

      const validStatuses: EditionStatus[] = ['draft', 'in-progress', 'review', 'complete']

      for (const status of validStatuses) {
        await editionRepository.updateStatus(edition.id, status)
        const updated = await editionRepository.getById(edition.id)
        expect(updated?.status).toBe(status)
      }
    })

    it('should not throw when updating status of non-existent edition', async () => {
      const countBefore = await db.editions.count()

      await expect(
        editionRepository.updateStatus('non-existent', 'complete')
      ).resolves.not.toThrow()

      const countAfter = await db.editions.count()
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('updateCoverInfo', () => {
    it('ED-008: should update coverDescription and coverImageId', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Cover Test')

      await editionRepository.updateCoverInfo(
        edition.id,
        'A dramatic battle scene',
        'image-123'
      )

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.coverDescription).toBe('A dramatic battle scene')
      expect(updated?.coverImageId).toBe('image-123')
    })

    it('should update only coverDescription when coverImageId not provided', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Cover Test')

      await editionRepository.updateCoverInfo(edition.id, 'Description only')

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.coverDescription).toBe('Description only')
      expect(updated?.coverImageId).toBeUndefined()
    })

    it('should clear cover info when called with undefined', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Cover Test')

      // Set cover info
      await editionRepository.updateCoverInfo(edition.id, 'Description', 'image-123')

      // Clear it
      await editionRepository.updateCoverInfo(edition.id, undefined, undefined)

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.coverDescription).toBeUndefined()
      expect(updated?.coverImageId).toBeUndefined()
    })
  })

  describe('updateMetadata', () => {
    it('ED-009: should update genre, targetAudience, estimatedPageCount', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Metadata Test')

      await editionRepository.updateMetadata(edition.id, {
        genre: 'Sci-Fi',
        targetAudience: 'Adults',
        estimatedPageCount: 48,
      })

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.metadata.genre).toBe('Sci-Fi')
      expect(updated?.metadata.targetAudience).toBe('Adults')
      expect(updated?.metadata.estimatedPageCount).toBe(48)
    })

    it('should merge metadata with existing values', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Merge Test')

      await editionRepository.updateMetadata(edition.id, {
        genre: 'Fantasy',
        notes: 'Initial notes',
      })

      await editionRepository.updateMetadata(edition.id, {
        targetAudience: 'Young Adult',
      })

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.metadata.genre).toBe('Fantasy')
      expect(updated?.metadata.targetAudience).toBe('Young Adult')
      expect(updated?.metadata.notes).toBe('Initial notes')
    })

    it('should overwrite metadata fields when provided', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Overwrite Test')

      await editionRepository.updateMetadata(edition.id, { genre: 'Original' })
      await editionRepository.updateMetadata(edition.id, { genre: 'Updated' })

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.metadata.genre).toBe('Updated')
    })

    it('should do nothing when edition does not exist and not create garbage', async () => {
      const countBefore = await db.editions.count()

      await expect(
        editionRepository.updateMetadata('non-existent', { genre: 'Test' })
      ).resolves.not.toThrow()

      const countAfter = await db.editions.count()
      expect(countAfter).toBe(countBefore)
    })
  })

  describe('reorder', () => {
    it('ED-010: should update sortOrder for edition', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Reorder')

      expect(edition.sortOrder).toBe(0)

      await editionRepository.reorder(edition.id, 5)

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.sortOrder).toBe(5)
    })

    it('should allow negative sortOrder', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Test')

      await editionRepository.reorder(edition.id, -1)

      const updated = await editionRepository.getById(edition.id)
      expect(updated?.sortOrder).toBe(-1)
    })
  })

  describe('delete', () => {
    it('should remove edition from database', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'To Delete')

      await editionRepository.delete(edition.id)

      const deleted = await editionRepository.getById(edition.id)
      expect(deleted).toBeUndefined()
    })

    it('ED-011: should cascade delete to pages and panels', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'With Children')

      // Create pages with panels
      const page1 = await createTestPage(edition.id, { pageNumber: 1 })
      const page2 = await createTestPage(edition.id, { pageNumber: 2 })
      await createTestPanel(page1.id, { panelNumber: 1 })
      await createTestPanel(page1.id, { panelNumber: 2 })
      await createTestPanel(page2.id, { panelNumber: 1 })

      // Verify they exist
      expect(await db.scriptPages.count()).toBe(2)
      expect(await db.panels.count()).toBe(3)

      // Delete edition
      await editionRepository.delete(edition.id)

      // All should be deleted
      expect(await db.editions.get(edition.id)).toBeUndefined()
      expect(await db.scriptPages.count()).toBe(0)
      expect(await db.panels.count()).toBe(0)
    })

    it('should not throw when deleting non-existent edition', async () => {
      const countBefore = await db.editions.count()

      await expect(editionRepository.delete('non-existent')).resolves.not.toThrow()

      const countAfter = await db.editions.count()
      expect(countAfter).toBe(countBefore)
    })

    it('should not affect other editions in the same project', async () => {
      const project = await createTestProject()

      const ed1 = await editionRepository.create(project.id, 'Keep Me')
      const ed2 = await editionRepository.create(project.id, 'Delete Me')

      await editionRepository.delete(ed2.id)

      const remaining = await editionRepository.getByProject(project.id)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].title).toBe('Keep Me')
    })

    it('should only delete pages and panels belonging to the edition', async () => {
      const project = await createTestProject()

      const ed1 = await editionRepository.create(project.id, 'Keep')
      const ed2 = await editionRepository.create(project.id, 'Delete')

      // Create pages for both editions
      const page1 = await createTestPage(ed1.id, { pageNumber: 1 })
      const page2 = await createTestPage(ed2.id, { pageNumber: 1 })
      await createTestPanel(page1.id)
      await createTestPanel(page2.id)

      // Delete ed2
      await editionRepository.delete(ed2.id)

      // ed1's page and panel should remain
      expect(await db.scriptPages.get(page1.id)).toBeDefined()
      expect(await db.panels.where('pageId').equals(page1.id).count()).toBe(1)

      // ed2's page and panel should be gone
      expect(await db.scriptPages.get(page2.id)).toBeUndefined()
    })

    it('should preserve sortOrder gaps after deletion', async () => {
      const project = await createTestProject()

      await editionRepository.create(project.id, 'First')
      const ed2 = await editionRepository.create(project.id, 'Second')
      await editionRepository.create(project.id, 'Third')

      await editionRepository.delete(ed2.id)

      const editions = await editionRepository.getByProject(project.id)
      expect(editions).toHaveLength(2)
      expect(editions[0].title).toBe('First')
      expect(editions[0].sortOrder).toBe(0)
      expect(editions[1].title).toBe('Third')
      expect(editions[1].sortOrder).toBe(2) // Gap preserved
    })
  })

  describe('duplicate', () => {
    it('ED-012: should create deep copy with new ID and provided title', async () => {
      const project = await createTestProject()
      const original = await editionRepository.create(project.id, 'Original', {
        issueNumber: 5,
        volume: 2,
        synopsis: 'An epic tale',
      })

      await editionRepository.updateMetadata(original.id, {
        genre: 'Fantasy',
        targetAudience: 'Adults',
      })

      await editionRepository.updateCoverInfo(original.id, 'Cool cover', 'img-1')

      const duplicated = await editionRepository.duplicate(original.id, 'Copy of Original')

      expect(duplicated).toBeDefined()
      expect(duplicated?.id).not.toBe(original.id)
      expect(duplicated?.title).toBe('Copy of Original')
      expect(duplicated?.projectId).toBe(original.projectId)
      // issueNumber, volume, synopsis are copied from original
      expect(duplicated?.issueNumber).toBe(original.issueNumber)
      expect(duplicated?.volume).toBe(original.volume)
      expect(duplicated?.synopsis).toBe(original.synopsis)
      // coverDescription and coverImageId are also copied
      expect(duplicated?.coverDescription).toBe('Cool cover')
      expect(duplicated?.coverImageId).toBe('img-1')
      // metadata is copied
      expect(duplicated?.metadata.genre).toBe('Fantasy')
      expect(duplicated?.metadata.targetAudience).toBe('Adults')
    })

    it('should reset status to draft', async () => {
      const project = await createTestProject()
      const original = await editionRepository.create(project.id, 'Complete Edition')
      await editionRepository.updateStatus(original.id, 'complete')

      const duplicated = await editionRepository.duplicate(original.id, 'Copy')

      expect(duplicated?.status).toBe('draft')
    })

    it('should get next sortOrder', async () => {
      const project = await createTestProject()
      await editionRepository.create(project.id, 'First')
      await editionRepository.create(project.id, 'Second')
      const original = await editionRepository.create(project.id, 'Third')

      const duplicated = await editionRepository.duplicate(original.id, 'Fourth')

      expect(duplicated?.sortOrder).toBe(3)
    })

    it('should create new timestamps', async () => {
      const project = await createTestProject()
      const original = await editionRepository.create(project.id, 'Original')

      await new Promise((resolve) => setTimeout(resolve, 10))
      const duplicated = await editionRepository.duplicate(original.id, 'Copy')

      expect(duplicated?.createdAt.getTime()).toBeGreaterThan(original.createdAt.getTime())
      expect(duplicated?.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime())
    })

    it('should duplicate pages and panels with new IDs', async () => {
      const project = await createTestProject()
      const original = await editionRepository.create(project.id, 'With Script')

      // Create pages with panels
      const page1 = await createTestPage(original.id, {
        pageNumber: 1,
        title: 'Page One',
        goal: 'Introduction',
      })
      const page2 = await createTestPage(original.id, {
        pageNumber: 2,
        title: 'Page Two',
        sortOrder: 1,
      })

      await createTestPanel(page1.id, {
        panelNumber: 1,
        description: 'Wide shot',
        cameraAngle: 'wide',
      })
      await createTestPanel(page1.id, {
        panelNumber: 2,
        description: 'Close-up',
        sortOrder: 1,
      })
      await createTestPanel(page2.id, {
        panelNumber: 1,
        description: 'Action shot',
      })

      // Duplicate
      const duplicated = await editionRepository.duplicate(original.id, 'Copy')

      // Verify pages were duplicated
      const originalPages = await db.scriptPages.where('editionId').equals(original.id).toArray()
      const duplicatedPages = await db.scriptPages.where('editionId').equals(duplicated!.id).toArray()

      expect(originalPages).toHaveLength(2)
      expect(duplicatedPages).toHaveLength(2)

      // Pages should have different IDs
      expect(duplicatedPages[0].id).not.toBe(originalPages[0].id)
      expect(duplicatedPages[0].editionId).toBe(duplicated!.id)

      // Page content preserved
      expect(duplicatedPages.find((p) => p.title === 'Page One')).toBeDefined()
      expect(duplicatedPages.find((p) => p.goal === 'Introduction')).toBeDefined()

      // Verify panels were duplicated
      const originalPanels = await db.panels.toArray()
      expect(originalPanels.length).toBeGreaterThanOrEqual(6) // 3 original + 3 duplicated

      const dupPage1 = duplicatedPages.find((p) => p.title === 'Page One')
      const panelsForDupPage1 = await db.panels.where('pageId').equals(dupPage1!.id).toArray()
      expect(panelsForDupPage1).toHaveLength(2)

      // Panel content preserved
      expect(panelsForDupPage1.find((p) => p.description === 'Wide shot')).toBeDefined()
      expect(panelsForDupPage1.find((p) => p.cameraAngle === 'wide')).toBeDefined()
    })

    it('should return undefined for non-existent ID', async () => {
      const result = await editionRepository.duplicate('non-existent', 'Copy')

      expect(result).toBeUndefined()
    })

    it('should work for edition with no pages', async () => {
      const project = await createTestProject()
      const original = await editionRepository.create(project.id, 'Empty Edition')

      const duplicated = await editionRepository.duplicate(original.id, 'Copy')

      expect(duplicated).toBeDefined()
      expect(duplicated?.title).toBe('Copy')

      // Verify no pages created
      const pages = await db.scriptPages.where('editionId').equals(duplicated!.id).toArray()
      expect(pages).toHaveLength(0)
    })
  })

  describe('getPageCount', () => {
    it('should return 0 for edition with no pages', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Empty')

      const count = await editionRepository.getPageCount(edition.id)

      expect(count).toBe(0)
    })

    it('should return correct page count', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'With Pages')

      await createTestPage(edition.id, { pageNumber: 1 })
      await createTestPage(edition.id, { pageNumber: 2 })
      await createTestPage(edition.id, { pageNumber: 3 })

      const count = await editionRepository.getPageCount(edition.id)

      expect(count).toBe(3)
    })

    it('should return 0 for non-existent edition', async () => {
      const count = await editionRepository.getPageCount('non-existent')

      expect(count).toBe(0)
    })
  })

  describe('getStats', () => {
    it('ED-013: should return correct page and panel counts', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Stats Test')

      const page1 = await createTestPage(edition.id, { pageNumber: 1 })
      const page2 = await createTestPage(edition.id, { pageNumber: 2 })

      // Page 1: 3 panels
      await createTestPanel(page1.id, { panelNumber: 1 })
      await createTestPanel(page1.id, { panelNumber: 2 })
      await createTestPanel(page1.id, { panelNumber: 3 })

      // Page 2: 2 panels
      await createTestPanel(page2.id, { panelNumber: 1 })
      await createTestPanel(page2.id, { panelNumber: 2 })

      const stats = await editionRepository.getStats(edition.id)

      expect(stats.pages).toBe(2)
      expect(stats.panels).toBe(5)
    })

    it('should return zeros for edition with no pages', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Empty')

      const stats = await editionRepository.getStats(edition.id)

      expect(stats.pages).toBe(0)
      expect(stats.panels).toBe(0)
    })

    it('should return zeros for non-existent edition', async () => {
      const stats = await editionRepository.getStats('non-existent')

      expect(stats.pages).toBe(0)
      expect(stats.panels).toBe(0)
    })

    it('should return correct stats with pages that have no panels', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Mixed')

      const page1 = await createTestPage(edition.id, { pageNumber: 1 })
      await createTestPage(edition.id, { pageNumber: 2 }) // No panels
      const page3 = await createTestPage(edition.id, { pageNumber: 3 })

      await createTestPanel(page1.id)
      await createTestPanel(page3.id)
      await createTestPanel(page3.id)

      const stats = await editionRepository.getStats(edition.id)

      expect(stats.pages).toBe(3)
      expect(stats.panels).toBe(3)
    })
  })

  describe('special characters', () => {
    it('should handle unicode, emojis, and special characters in title', async () => {
      const project = await createTestProject()

      const specialTitles = [
        'Edição em Português',
        'Издание на русском',
        '日本語版',
        'Issue #1: The Beginning 🦸',
        'Title with "quotes" & <special> chars',
      ]

      for (const title of specialTitles) {
        const edition = await editionRepository.create(project.id, title)
        const retrieved = await editionRepository.getById(edition.id)
        expect(retrieved?.title).toBe(title)
      }
    })

    it('should handle special characters in synopsis and metadata', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Special', {
        synopsis: 'A tale of adventure & mystery... "Who knows?" 🔍',
      })

      await editionRepository.updateMetadata(edition.id, {
        notes: 'Note with émojis 🎨 and spëcial châractérs',
      })

      const retrieved = await editionRepository.getById(edition.id)
      expect(retrieved?.synopsis).toBe('A tale of adventure & mystery... "Who knows?" 🔍')
      expect(retrieved?.metadata.notes).toBe('Note with émojis 🎨 and spëcial châractérs')
    })
  })

  describe('edge cases', () => {
    it('should handle very long title', async () => {
      const project = await createTestProject()
      const longTitle = 'A'.repeat(1000)

      const edition = await editionRepository.create(project.id, longTitle)

      expect(edition.title).toBe(longTitle)
      expect(edition.title.length).toBe(1000)
    })

    it('should handle edition with many pages', async () => {
      const project = await createTestProject()
      const edition = await editionRepository.create(project.id, 'Many Pages')

      // Create 50 pages
      for (let i = 0; i < 50; i++) {
        await createTestPage(edition.id, { pageNumber: i + 1, sortOrder: i })
      }

      const stats = await editionRepository.getStats(edition.id)
      expect(stats.pages).toBe(50)
    })

    it('should handle issueNumber of 0', async () => {
      const project = await createTestProject()

      const edition = await editionRepository.create(project.id, 'Issue Zero', {
        issueNumber: 0,
      })

      expect(edition.issueNumber).toBe(0)
    })

    it('should handle simultaneous editions across projects', async () => {
      const project1 = await createTestProject('P1')
      const project2 = await createTestProject('P2')

      // Create editions in alternating order
      const ed1P1 = await editionRepository.create(project1.id, 'P1-E1')
      const ed1P2 = await editionRepository.create(project2.id, 'P2-E1')
      const ed2P1 = await editionRepository.create(project1.id, 'P1-E2')
      const ed2P2 = await editionRepository.create(project2.id, 'P2-E2')

      // Verify isolation
      const p1Editions = await editionRepository.getByProject(project1.id)
      const p2Editions = await editionRepository.getByProject(project2.id)

      expect(p1Editions).toHaveLength(2)
      expect(p2Editions).toHaveLength(2)
      expect(p1Editions.map((e) => e.title)).toEqual(['P1-E1', 'P1-E2'])
      expect(p2Editions.map((e) => e.title)).toEqual(['P2-E1', 'P2-E2'])
    })
  })
})
