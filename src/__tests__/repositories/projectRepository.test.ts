/**
 * ProjectRepository Test Suite
 *
 * Tests for: src/lib/db/repositories/projectRepository.ts
 * Reference: TEST_CASES.md - Section 1.1 ProjectRepository (PR-001 to PR-018)
 */

import { describe, it, expect } from 'vitest'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { db } from '@/lib/db/database'
import { DEFAULT_PROJECT_SETTINGS } from '@/types'

describe('ProjectRepository', () => {
  // Database is automatically cleaned after each test via setup.ts

  describe('create', () => {
    it('PR-001: should create a project with all required fields and return valid ID', async () => {
      const project = await projectRepository.create('Test Project', 'A test description')

      expect(project).toBeDefined()
      expect(project.id).toBeDefined()
      expect(project.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      expect(project.name).toBe('Test Project')
      expect(project.description).toBe('A test description')
      expect(project.tags).toEqual([])
      expect(project.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
      expect(project.isArchived).toBe(false)
      expect(project.createdAt).toBeInstanceOf(Date)
      expect(project.updatedAt).toBeInstanceOf(Date)
    })

    it('PR-002: should create project with only name, using defaults for optional fields', async () => {
      const project = await projectRepository.create('Minimal Project')

      expect(project.name).toBe('Minimal Project')
      expect(project.description).toBeUndefined()
      expect(project.genre).toBeUndefined()
      expect(project.theme).toBeUndefined()
      expect(project.tags).toEqual([])
      expect(project.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
      expect(project.isArchived).toBe(false)
    })

    it('should persist project to database', async () => {
      const project = await projectRepository.create('Persisted Project')

      // Verify it's actually in the database
      const fromDb = await db.projects.get(project.id)
      expect(fromDb).toBeDefined()
      expect(fromDb?.name).toBe('Persisted Project')
    })
  })

  describe('getById', () => {
    it('PR-003: should return complete project object for valid ID', async () => {
      const created = await projectRepository.create('Findable Project', 'Description')
      const found = await projectRepository.getById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('Findable Project')
      expect(found?.description).toBe('Description')
      expect(found?.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
      expect(found?.createdAt).toBeInstanceOf(Date)
      expect(found?.updatedAt).toBeInstanceOf(Date)
    })

    it('PR-004: should return undefined for non-existing ID', async () => {
      const found = await projectRepository.getById('non-existent-id')

      expect(found).toBeUndefined()
    })

    it('should return undefined for empty string ID', async () => {
      const found = await projectRepository.getById('')

      expect(found).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('PR-005: should return empty array when no projects exist', async () => {
      const projects = await projectRepository.getAll()

      expect(projects).toEqual([])
      expect(Array.isArray(projects)).toBe(true)
    })

    it('PR-006: should return only non-archived projects by default', async () => {
      await projectRepository.create('Active 1')
      await projectRepository.create('Active 2')
      const archived = await projectRepository.create('Archived')
      await projectRepository.archive(archived.id)

      const projects = await projectRepository.getAll()

      expect(projects).toHaveLength(2)
      expect(projects.map((p) => p.name)).toContain('Active 1')
      expect(projects.map((p) => p.name)).toContain('Active 2')
      expect(projects.map((p) => p.name)).not.toContain('Archived')
    })

    it('should return projects ordered by createdAt descending (newest first)', async () => {
      await projectRepository.create('First')
      await new Promise((resolve) => setTimeout(resolve, 10))
      await projectRepository.create('Second')
      await new Promise((resolve) => setTimeout(resolve, 10))
      await projectRepository.create('Third')

      const projects = await projectRepository.getAll()

      expect(projects).toHaveLength(3)
      expect(projects[0].name).toBe('Third')
      expect(projects[1].name).toBe('Second')
      expect(projects[2].name).toBe('First')
    })
  })

  describe('getArchived', () => {
    it('PR-007: should return only archived projects', async () => {
      await projectRepository.create('Active')
      const archived = await projectRepository.create('Archived')
      await projectRepository.archive(archived.id)

      const projects = await projectRepository.getArchived()

      expect(projects).toHaveLength(1)
      expect(projects[0].name).toBe('Archived')
      expect(projects[0].isArchived).toBe(true)
    })

    it('should return empty array when no archived projects exist', async () => {
      await projectRepository.create('Active 1')
      await projectRepository.create('Active 2')

      const projects = await projectRepository.getArchived()

      expect(projects).toEqual([])
    })
  })

  describe('getAllIncludingArchived', () => {
    it('PR-008: should return both archived and non-archived projects', async () => {
      await projectRepository.create('Active')
      const archived = await projectRepository.create('Archived')
      await projectRepository.archive(archived.id)

      const projects = await projectRepository.getAllIncludingArchived()

      expect(projects).toHaveLength(2)
      const names = projects.map((p) => p.name)
      expect(names).toContain('Active')
      expect(names).toContain('Archived')
    })

    it('should return projects ordered by createdAt descending', async () => {
      await projectRepository.create('First')
      await new Promise((resolve) => setTimeout(resolve, 10))
      await projectRepository.create('Second')

      const projects = await projectRepository.getAllIncludingArchived()

      expect(projects[0].name).toBe('Second')
      expect(projects[1].name).toBe('First')
    })
  })

  describe('update', () => {
    it('PR-009: should update description, genre, theme, tags', async () => {
      const project = await projectRepository.create('Original')

      await projectRepository.update(project.id, {
        description: 'Updated description',
        genre: 'Fantasy',
        theme: 'Adventure',
        tags: ['tag1', 'tag2'],
      })

      const updated = await projectRepository.getById(project.id)

      expect(updated?.description).toBe('Updated description')
      expect(updated?.genre).toBe('Fantasy')
      expect(updated?.theme).toBe('Adventure')
      expect(updated?.tags).toEqual(['tag1', 'tag2'])
    })

    it('PR-010: should update the updatedAt field on any modification', async () => {
      const project = await projectRepository.create('Test')
      const originalUpdatedAt = project.updatedAt

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await projectRepository.update(project.id, { description: 'Changed' })
      const updated = await projectRepository.getById(project.id)

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should preserve createdAt when updating', async () => {
      const project = await projectRepository.create('Test')
      const originalCreatedAt = project.createdAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await projectRepository.update(project.id, { description: 'Changed' })

      const updated = await projectRepository.getById(project.id)

      expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime())
    })

    it('should not throw when updating non-existent project', async () => {
      // Dexie's update on non-existent ID silently does nothing
      await expect(
        projectRepository.update('non-existent', { description: 'Test' })
      ).resolves.not.toThrow()
    })
  })

  describe('rename', () => {
    it('PR-011: should update project name and updatedAt', async () => {
      const project = await projectRepository.create('Old Name')
      const originalUpdatedAt = project.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await projectRepository.rename(project.id, 'New Name')

      const updated = await projectRepository.getById(project.id)

      expect(updated?.name).toBe('New Name')
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should preserve other fields when renaming', async () => {
      const project = await projectRepository.create('Original', 'Description')
      await projectRepository.update(project.id, { genre: 'Fantasy' })

      await projectRepository.rename(project.id, 'Renamed')

      const updated = await projectRepository.getById(project.id)

      expect(updated?.name).toBe('Renamed')
      expect(updated?.description).toBe('Description')
      expect(updated?.genre).toBe('Fantasy')
    })
  })

  describe('archive / unarchive', () => {
    it('PR-012: archive should set isArchived to true', async () => {
      const project = await projectRepository.create('To Archive')

      await projectRepository.archive(project.id)
      const archived = await projectRepository.getById(project.id)

      expect(archived?.isArchived).toBe(true)
    })

    it('PR-013: unarchive should set isArchived to false', async () => {
      const project = await projectRepository.create('To Unarchive')
      await projectRepository.archive(project.id)

      await projectRepository.unarchive(project.id)
      const unarchived = await projectRepository.getById(project.id)

      expect(unarchived?.isArchived).toBe(false)
    })

    it('archive should update updatedAt', async () => {
      const project = await projectRepository.create('Test')
      const originalUpdatedAt = project.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await projectRepository.archive(project.id)

      const archived = await projectRepository.getById(project.id)

      expect(archived?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })
  })

  describe('updateSettings', () => {
    it('PR-014: should merge new settings with existing', async () => {
      const project = await projectRepository.create('Settings Test')

      await projectRepository.updateSettings(project.id, {
        defaultView: 'canvas',
        gridColumns: 6,
      })

      const updated = await projectRepository.getById(project.id)

      expect(updated?.settings.defaultView).toBe('canvas')
      expect(updated?.settings.gridColumns).toBe(6)
      // Original setting should be preserved
      expect(updated?.settings.canvasBackground).toBe(DEFAULT_PROJECT_SETTINGS.canvasBackground)
    })

    it('should do nothing when project does not exist', async () => {
      // Should not throw, just silently do nothing
      await expect(
        projectRepository.updateSettings('non-existent', { gridColumns: 10 })
      ).resolves.not.toThrow()
    })

    it('should update only specified settings', async () => {
      const project = await projectRepository.create('Partial Update')

      await projectRepository.updateSettings(project.id, { gridColumns: 8 })

      const updated = await projectRepository.getById(project.id)

      expect(updated?.settings.gridColumns).toBe(8)
      expect(updated?.settings.defaultView).toBe(DEFAULT_PROJECT_SETTINGS.defaultView)
      expect(updated?.settings.canvasBackground).toBe(DEFAULT_PROJECT_SETTINGS.canvasBackground)
    })
  })

  describe('delete', () => {
    it('PR-015: should remove project and return success', async () => {
      const project = await projectRepository.create('To Delete')

      await projectRepository.delete(project.id)
      const deleted = await projectRepository.getById(project.id)

      expect(deleted).toBeUndefined()
    })

    it('PR-016: should cascade delete related characters', async () => {
      const project = await projectRepository.create('Project with Characters')

      // Add characters directly to the database
      await db.characters.add({
        id: 'char-1',
        projectId: project.id,
        name: 'Character 1',
        description: '',
        tags: [],
        profile: {},
        metadata: {},
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await db.characters.add({
        id: 'char-2',
        projectId: project.id,
        name: 'Character 2',
        description: '',
        tags: [],
        profile: {},
        metadata: {},
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Verify characters exist
      const charsBefore = await db.characters.where('projectId').equals(project.id).count()
      expect(charsBefore).toBe(2)

      // Delete project
      await projectRepository.delete(project.id)

      // Characters should be deleted
      const charsAfter = await db.characters.where('projectId').equals(project.id).count()
      expect(charsAfter).toBe(0)
    })

    it('should cascade delete sections and canvasItems', async () => {
      const project = await projectRepository.create('Project with Sections')

      // Add character with section and canvas items
      await db.characters.add({
        id: 'char-1',
        projectId: project.id,
        name: 'Character',
        description: '',
        tags: [],
        profile: {},
        metadata: {},
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await db.sections.add({
        id: 'section-1',
        characterId: 'char-1',
        name: 'Test Section',
        type: 'costume',
        color: '#8b5cf6',
        sortOrder: 0,
        createdAt: new Date(),
      })

      await db.canvasItems.add({
        id: 'canvas-item-1',
        sectionId: 'section-1',
        type: 'image',
        content: { imageId: 'img-1' },
        position: { x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0 },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Verify they exist
      expect(await db.sections.get('section-1')).toBeDefined()
      expect(await db.canvasItems.get('canvas-item-1')).toBeDefined()

      // Delete project
      await projectRepository.delete(project.id)

      // All related data should be deleted
      expect(await db.characters.get('char-1')).toBeUndefined()
      expect(await db.sections.get('section-1')).toBeUndefined()
      expect(await db.canvasItems.get('canvas-item-1')).toBeUndefined()
    })

    it('should not throw when deleting non-existent project', async () => {
      await expect(projectRepository.delete('non-existent')).resolves.not.toThrow()
    })
  })

  describe('duplicate', () => {
    it('PR-017: should create deep copy with new ID and provided name', async () => {
      const original = await projectRepository.create('Original Project', 'Description')
      await projectRepository.update(original.id, {
        genre: 'Sci-Fi',
        theme: 'Space',
        tags: ['tag1', 'tag2'],
      })

      const duplicated = await projectRepository.duplicate(original.id, 'Original Project (Copy)')

      expect(duplicated).toBeDefined()
      expect(duplicated?.id).not.toBe(original.id)
      expect(duplicated?.name).toBe('Original Project (Copy)')
      expect(duplicated?.description).toBe('Description')
      expect(duplicated?.genre).toBe('Sci-Fi')
      expect(duplicated?.theme).toBe('Space')
      expect(duplicated?.tags).toEqual(['tag1', 'tag2'])
      expect(duplicated?.isArchived).toBe(false)
    })

    it('should return undefined when duplicating non-existent project', async () => {
      const duplicated = await projectRepository.duplicate('non-existent', 'Copy')

      expect(duplicated).toBeUndefined()
    })

    it('should copy settings from original', async () => {
      const original = await projectRepository.create('Original')
      await projectRepository.updateSettings(original.id, {
        defaultView: 'canvas',
        gridColumns: 8,
        canvasBackground: '#ffffff',
      })

      const duplicated = await projectRepository.duplicate(original.id, 'Copy')

      expect(duplicated?.settings.defaultView).toBe('canvas')
      expect(duplicated?.settings.gridColumns).toBe(8)
      expect(duplicated?.settings.canvasBackground).toBe('#ffffff')
    })

    it('should create independent copy (modifying original does not affect duplicate)', async () => {
      const original = await projectRepository.create('Original', 'Description')
      const duplicated = await projectRepository.duplicate(original.id, 'Copy')

      // Modify original
      await projectRepository.update(original.id, { description: 'Modified' })

      // Duplicate should be unchanged
      const duplicatedAfter = await projectRepository.getById(duplicated!.id)
      expect(duplicatedAfter?.description).toBe('Description')
    })

    it('should not duplicate archived status', async () => {
      const original = await projectRepository.create('Original')
      await projectRepository.archive(original.id)

      const duplicated = await projectRepository.duplicate(original.id, 'Copy')

      expect(duplicated?.isArchived).toBe(false)
    })
  })

  describe('special characters', () => {
    it('PR-018: should handle unicode, emojis, and special characters in name', async () => {
      const specialNames = [
        'Proyecto en Español',
        'Проект на русском',
        '日本語プロジェクト',
        '🎨 Art Project 🖼️',
        "Project with 'quotes' and \"double quotes\"",
        'Project/with\\slashes',
        'Project\twith\ttabs',
        'Project\nwith\nnewlines',
      ]

      for (const name of specialNames) {
        const project = await projectRepository.create(name)
        const retrieved = await projectRepository.getById(project.id)

        expect(retrieved?.name).toBe(name)
      }
    })

    it('should handle special characters in description', async () => {
      const project = await projectRepository.create('Test', '描述 with émojis 🎭 and "quotes"')
      const retrieved = await projectRepository.getById(project.id)

      expect(retrieved?.description).toBe('描述 with émojis 🎭 and "quotes"')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string name', async () => {
      const project = await projectRepository.create('')

      expect(project.name).toBe('')
      const retrieved = await projectRepository.getById(project.id)
      expect(retrieved?.name).toBe('')
    })

    it('should handle very long name', async () => {
      const longName = 'A'.repeat(1000)
      const project = await projectRepository.create(longName)

      const retrieved = await projectRepository.getById(project.id)
      expect(retrieved?.name).toBe(longName)
    })

    it('should handle many tags', async () => {
      const project = await projectRepository.create('Tagged')
      const manyTags = Array.from({ length: 100 }, (_, i) => `tag-${i}`)

      await projectRepository.update(project.id, { tags: manyTags })

      const retrieved = await projectRepository.getById(project.id)
      expect(retrieved?.tags).toHaveLength(100)
      expect(retrieved?.tags).toEqual(manyTags)
    })
  })
})
