/**
 * ProjectRepository Test Suite
 *
 * Tests for: src/lib/db/repositories/projectRepository.ts
 * Reference: TEST_CASES.md - Section 1.1 ProjectRepository (PR-001 to PR-018)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { db } from '@/lib/db/database'
import { DEFAULT_PROJECT_SETTINGS } from '@/types'

describe('ProjectRepository', () => {
  // Database is automatically reset before each test via setup.ts

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
  })

  describe('getById', () => {
    it('PR-003: should return complete project object for valid ID', async () => {
      const created = await projectRepository.create('Findable Project', 'Description')
      const found = await projectRepository.getById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('Findable Project')
      expect(found?.description).toBe('Description')
    })

    it('PR-004: should return undefined for non-existing ID', async () => {
      const found = await projectRepository.getById('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('PR-005: should return empty array when no projects exist', async () => {
      const projects = await projectRepository.getAll()

      expect(projects).toEqual([])
    })

    it('PR-006: should return only non-archived projects by default', async () => {
      const active1 = await projectRepository.create('Active 1')
      const active2 = await projectRepository.create('Active 2')
      const archived = await projectRepository.create('Archived')
      await projectRepository.archive(archived.id)

      const projects = await projectRepository.getAll()

      expect(projects).toHaveLength(2)
      expect(projects.map((p) => p.name)).toContain('Active 1')
      expect(projects.map((p) => p.name)).toContain('Active 2')
      expect(projects.map((p) => p.name)).not.toContain('Archived')
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
  })

  describe('delete', () => {
    it('PR-015: should remove project and return success', async () => {
      const project = await projectRepository.create('To Delete')

      await projectRepository.delete(project.id)
      const deleted = await projectRepository.getById(project.id)

      expect(deleted).toBeUndefined()
    })

    it('PR-016: should trigger deletion of related characters when project is deleted', async () => {
      const project = await projectRepository.create('Project with Characters')

      // Add a character directly to the database
      await db.characters.add({
        id: 'char-1',
        projectId: project.id,
        name: 'Test Character',
        description: '',
        tags: [],
        profile: {},
        metadata: {},
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Verify character exists
      const charBefore = await db.characters.get('char-1')
      expect(charBefore).toBeDefined()

      // Delete project
      await projectRepository.delete(project.id)

      // Character should be deleted
      const charAfter = await db.characters.get('char-1')
      expect(charAfter).toBeUndefined()
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
      ]

      for (const name of specialNames) {
        const project = await projectRepository.create(name)
        const retrieved = await projectRepository.getById(project.id)

        expect(retrieved?.name).toBe(name)
      }
    })
  })
})
