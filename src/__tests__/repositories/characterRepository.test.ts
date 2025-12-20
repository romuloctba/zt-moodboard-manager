/**
 * CharacterRepository Test Suite
 *
 * Tests for: src/lib/db/repositories/characterRepository.ts
 * Reference: TEST_CASES.md - Section 1.1 CharacterRepository (CH-001 to CH-013)
 */

import { describe, it, expect } from 'vitest'
import { characterRepository } from '@/lib/db/repositories/characterRepository'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { db } from '@/lib/db/database'
import type { CanvasState, CharacterProfile, CharacterMetadata } from '@/types'

describe('CharacterRepository', () => {
  // Database is automatically cleaned after each test via setup.ts

  // Helper to create a project for character tests
  async function createTestProject(name = 'Test Project') {
    return projectRepository.create(name)
  }

  describe('create', () => {
    it('CH-001: should create character linked to project with sortOrder', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      expect(character).toBeDefined()
      expect(character.id).toBeDefined()
      expect(character.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      expect(character.projectId).toBe(project.id)
      expect(character.name).toBe('Hero')
      expect(character.tags).toEqual([])
      expect(character.profile).toEqual({})
      expect(character.metadata).toEqual({})
      expect(character.sortOrder).toBe(0)
      expect(character.createdAt).toBeInstanceOf(Date)
      expect(character.updatedAt).toBeInstanceOf(Date)
    })

    it('CH-002: should auto-increment sortOrder for each new character', async () => {
      const project = await createTestProject()

      const char1 = await characterRepository.create(project.id, 'First')
      const char2 = await characterRepository.create(project.id, 'Second')
      const char3 = await characterRepository.create(project.id, 'Third')

      expect(char1.sortOrder).toBe(0)
      expect(char2.sortOrder).toBe(1)
      expect(char3.sortOrder).toBe(2)
    })

    it('should auto-increment sortOrder independently per project', async () => {
      const project1 = await createTestProject('Project 1')
      const project2 = await createTestProject('Project 2')

      const char1P1 = await characterRepository.create(project1.id, 'P1 Char 1')
      const char1P2 = await characterRepository.create(project2.id, 'P2 Char 1')
      const char2P1 = await characterRepository.create(project1.id, 'P1 Char 2')
      const char2P2 = await characterRepository.create(project2.id, 'P2 Char 2')

      expect(char1P1.sortOrder).toBe(0)
      expect(char2P1.sortOrder).toBe(1)
      expect(char1P2.sortOrder).toBe(0)
      expect(char2P2.sortOrder).toBe(1)
    })

    it('should persist character to database', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Persisted')

      const fromDb = await db.characters.get(character.id)
      expect(fromDb).toBeDefined()
      expect(fromDb?.name).toBe('Persisted')
      expect(fromDb?.projectId).toBe(project.id)
    })

    it('should allow creation with non-existent projectId (no FK validation)', async () => {
      // NOTE: Repository does NOT validate projectId exists - this is by design.
      // IndexedDB has no foreign key constraints. The application layer
      // should ensure valid projectId before calling create().
      // This test documents current behavior, not necessarily desired behavior.
      const character = await characterRepository.create('non-existent-project', 'Orphan')

      expect(character).toBeDefined()
      expect(character.projectId).toBe('non-existent-project')
    })
  })

  describe('getById', () => {
    it('CH-003: should return complete character with profile and metadata', async () => {
      const project = await createTestProject()
      const created = await characterRepository.create(project.id, 'Test Character')

      // Add profile and metadata
      await characterRepository.updateProfile(created.id, {
        age: '25',
        role: 'Protagonist',
        personality: ['brave', 'kind'],
      })
      await characterRepository.updateMetadata(created.id, {
        archetype: 'Hero',
        version: '1.0',
      })

      const found = await characterRepository.getById(created.id)

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('Test Character')
      expect(found?.profile.age).toBe('25')
      expect(found?.profile.role).toBe('Protagonist')
      expect(found?.profile.personality).toEqual(['brave', 'kind'])
      expect(found?.metadata.archetype).toBe('Hero')
      expect(found?.metadata.version).toBe('1.0')
    })

    it('should return undefined for non-existing ID', async () => {
      const found = await characterRepository.getById('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('getByProject', () => {
    it('CH-004: should return all characters for a project sorted by sortOrder', async () => {
      const project = await createTestProject()

      await characterRepository.create(project.id, 'First')
      await characterRepository.create(project.id, 'Second')
      await characterRepository.create(project.id, 'Third')

      const characters = await characterRepository.getByProject(project.id)

      expect(characters).toHaveLength(3)
      expect(characters[0].name).toBe('First')
      expect(characters[0].sortOrder).toBe(0)
      expect(characters[1].name).toBe('Second')
      expect(characters[1].sortOrder).toBe(1)
      expect(characters[2].name).toBe('Third')
      expect(characters[2].sortOrder).toBe(2)
    })

    it('CH-005: should return empty array when project has no characters', async () => {
      const project = await createTestProject()

      const characters = await characterRepository.getByProject(project.id)

      expect(characters).toEqual([])
      expect(Array.isArray(characters)).toBe(true)
    })

    it('should return empty array for non-existent project', async () => {
      const characters = await characterRepository.getByProject('non-existent')

      expect(characters).toEqual([])
    })

    it('should return empty array after all characters are deleted', async () => {
      const project = await createTestProject()

      const char1 = await characterRepository.create(project.id, 'First')
      const char2 = await characterRepository.create(project.id, 'Second')

      // Verify characters exist
      expect(await characterRepository.getByProject(project.id)).toHaveLength(2)

      // Delete all characters
      await characterRepository.delete(char1.id)
      await characterRepository.delete(char2.id)

      // Should return empty array, not error
      const remaining = await characterRepository.getByProject(project.id)
      expect(remaining).toEqual([])
      expect(Array.isArray(remaining)).toBe(true)
    })

    it('should respect custom sortOrder after reordering', async () => {
      const project = await createTestProject()

      const char1 = await characterRepository.create(project.id, 'First')
      const char2 = await characterRepository.create(project.id, 'Second')
      const char3 = await characterRepository.create(project.id, 'Third')

      // Reorder: move First to the end
      await characterRepository.reorder(char1.id, 10)

      const characters = await characterRepository.getByProject(project.id)

      expect(characters).toHaveLength(3)
      expect(characters[0].name).toBe('Second')
      expect(characters[1].name).toBe('Third')
      expect(characters[2].name).toBe('First')
    })

    it('should not return characters from other projects', async () => {
      const project1 = await createTestProject('Project 1')
      const project2 = await createTestProject('Project 2')

      await characterRepository.create(project1.id, 'P1 Hero')
      await characterRepository.create(project2.id, 'P2 Villain')
      await characterRepository.create(project1.id, 'P1 Sidekick')

      const project1Chars = await characterRepository.getByProject(project1.id)
      const project2Chars = await characterRepository.getByProject(project2.id)

      expect(project1Chars).toHaveLength(2)
      expect(project1Chars.map((c) => c.name)).toEqual(['P1 Hero', 'P1 Sidekick'])

      expect(project2Chars).toHaveLength(1)
      expect(project2Chars[0].name).toBe('P2 Villain')
    })
  })

  describe('update', () => {
    it('should update character fields', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Original')

      await characterRepository.update(character.id, {
        name: 'Updated Name',
        description: 'A brave hero',
        tags: ['hero', 'main'],
      })

      const updated = await characterRepository.getById(character.id)

      expect(updated?.name).toBe('Updated Name')
      expect(updated?.description).toBe('A brave hero')
      expect(updated?.tags).toEqual(['hero', 'main'])
    })

    it('should update updatedAt timestamp', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Test')
      const originalUpdatedAt = character.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await characterRepository.update(character.id, { name: 'Changed' })

      const updated = await characterRepository.getById(character.id)

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should preserve createdAt when updating', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Test')
      const originalCreatedAt = character.createdAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await characterRepository.update(character.id, { name: 'Changed' })

      const updated = await characterRepository.getById(character.id)

      expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime())
    })

    it('should not throw when updating non-existent character', async () => {
      await expect(
        characterRepository.update('non-existent', { name: 'Test' })
      ).resolves.not.toThrow()
    })
  })

  describe('rename', () => {
    it('CH-009: should update name and updatedAt', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Old Name')
      const originalUpdatedAt = character.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))
      await characterRepository.rename(character.id, 'New Name')

      const updated = await characterRepository.getById(character.id)

      expect(updated?.name).toBe('New Name')
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should preserve other fields when renaming', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Original')
      await characterRepository.update(character.id, {
        description: 'A description',
        tags: ['tag1'],
      })

      await characterRepository.rename(character.id, 'Renamed')

      const updated = await characterRepository.getById(character.id)

      expect(updated?.name).toBe('Renamed')
      expect(updated?.description).toBe('A description')
      expect(updated?.tags).toEqual(['tag1'])
    })
  })

  describe('updateProfile', () => {
    it('CH-006: should update age, role, personality, abilities, backstory', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      const profile: Partial<CharacterProfile> = {
        age: '30',
        role: 'Protagonist',
        personality: ['brave', 'loyal'],
        abilities: ['swordfighting', 'magic'],
        backstory: 'A legendary warrior from the northern kingdoms.',
      }

      await characterRepository.updateProfile(character.id, profile)

      const updated = await characterRepository.getById(character.id)

      expect(updated?.profile.age).toBe('30')
      expect(updated?.profile.role).toBe('Protagonist')
      expect(updated?.profile.personality).toEqual(['brave', 'loyal'])
      expect(updated?.profile.abilities).toEqual(['swordfighting', 'magic'])
      expect(updated?.profile.backstory).toBe('A legendary warrior from the northern kingdoms.')
    })

    it('should merge new profile fields with existing (preserving unrelated fields)', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      await characterRepository.updateProfile(character.id, { age: '25', role: 'Hero' })
      await characterRepository.updateProfile(character.id, { personality: ['brave'] })

      const updated = await characterRepository.getById(character.id)

      // New field added
      expect(updated?.profile.personality).toEqual(['brave'])
      // Previous fields preserved
      expect(updated?.profile.age).toBe('25')
      expect(updated?.profile.role).toBe('Hero')
    })

    it('should replace (not deep merge) customFields when updating', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      // Set initial customFields
      await characterRepository.updateProfile(character.id, {
        customFields: { height: '180cm', weight: '75kg' },
      })

      // Update with partial customFields - this REPLACES the entire customFields object
      await characterRepository.updateProfile(character.id, {
        customFields: { eyeColor: 'blue' },
      })

      const updated = await characterRepository.getById(character.id)

      // customFields is replaced entirely, not merged at nested level
      // This tests the ACTUAL behavior - shallow merge at profile level
      expect(updated?.profile.customFields).toEqual({ eyeColor: 'blue' })
      expect(updated?.profile.customFields?.height).toBeUndefined()
    })

    it('should do nothing when character does not exist', async () => {
      await expect(
        characterRepository.updateProfile('non-existent', { age: '25' })
      ).resolves.not.toThrow()
    })

    it('CH-013: should handle character with minimal/empty profile', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Minimal')

      // Character starts with empty profile
      expect(character.profile).toEqual({})

      const retrieved = await characterRepository.getById(character.id)
      expect(retrieved?.profile).toEqual({})
    })
  })

  describe('updateMetadata', () => {
    it('CH-007: should update custom fields and visual metadata', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      const metadata: Partial<CharacterMetadata> = {
        archetype: 'Hero',
        version: '2.0',
        inspirations: ['Aragorn', 'Jon Snow'],
        palette: {
          dominant: '#4a5568',
          vibrant: '#ed8936',
          muted: '#a0aec0',
          colors: ['#4a5568', '#ed8936', '#a0aec0'],
        },
      }

      await characterRepository.updateMetadata(character.id, metadata)

      const updated = await characterRepository.getById(character.id)

      expect(updated?.metadata.archetype).toBe('Hero')
      expect(updated?.metadata.version).toBe('2.0')
      expect(updated?.metadata.inspirations).toEqual(['Aragorn', 'Jon Snow'])
      expect(updated?.metadata.palette?.dominant).toBe('#4a5568')
    })

    it('should merge new metadata fields with existing', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      await characterRepository.updateMetadata(character.id, { archetype: 'Warrior' })
      await characterRepository.updateMetadata(character.id, { version: '1.5' })

      const updated = await characterRepository.getById(character.id)

      expect(updated?.metadata.archetype).toBe('Warrior')
      expect(updated?.metadata.version).toBe('1.5')
    })

    it('should do nothing when character does not exist', async () => {
      await expect(
        characterRepository.updateMetadata('non-existent', { archetype: 'Test' })
      ).resolves.not.toThrow()
    })
  })

  describe('updateCanvasState', () => {
    it('CH-008: should persist viewport and canvas items', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      const canvasState: CanvasState = {
        viewport: { x: 100, y: 200, zoom: 1.5 },
        items: [
          {
            id: 'item-1',
            imageId: 'img-1',
            x: 50,
            y: 100,
            width: 200,
            height: 300,
            rotation: 45,
            zIndex: 1,
          },
          {
            id: 'item-2',
            imageId: 'img-2',
            x: 300,
            y: 150,
            width: 150,
            height: 150,
            rotation: 0,
            zIndex: 2,
            locked: true,
          },
        ],
        updatedAt: new Date(),
      }

      await characterRepository.updateCanvasState(character.id, canvasState)

      const updated = await characterRepository.getById(character.id)

      expect(updated?.canvasState).toBeDefined()
      expect(updated?.canvasState?.viewport).toEqual({ x: 100, y: 200, zoom: 1.5 })
      expect(updated?.canvasState?.items).toHaveLength(2)
      expect(updated?.canvasState?.items[0].imageId).toBe('img-1')
      expect(updated?.canvasState?.items[1].locked).toBe(true)
    })

    it('should update canvas state multiple times', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      const canvasState1: CanvasState = {
        viewport: { x: 0, y: 0, zoom: 1 },
        items: [],
        updatedAt: new Date(),
      }

      const canvasState2: CanvasState = {
        viewport: { x: 500, y: 500, zoom: 2 },
        items: [
          {
            id: 'item-1',
            imageId: 'img-1',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            rotation: 0,
            zIndex: 1,
          },
        ],
        updatedAt: new Date(),
      }

      await characterRepository.updateCanvasState(character.id, canvasState1)
      let updated = await characterRepository.getById(character.id)
      expect(updated?.canvasState?.viewport.zoom).toBe(1)
      expect(updated?.canvasState?.items).toHaveLength(0)

      await characterRepository.updateCanvasState(character.id, canvasState2)
      updated = await characterRepository.getById(character.id)
      expect(updated?.canvasState?.viewport.zoom).toBe(2)
      expect(updated?.canvasState?.items).toHaveLength(1)
    })

    it('should do nothing when updating canvas state for non-existent character', async () => {
      const canvasState: CanvasState = {
        viewport: { x: 0, y: 0, zoom: 1 },
        items: [],
        updatedAt: new Date(),
      }

      // Should not throw - Dexie update on non-existent ID silently does nothing
      await expect(
        characterRepository.updateCanvasState('non-existent', canvasState)
      ).resolves.not.toThrow()
    })
  })

  describe('addTag / removeTag', () => {
    it('should add a tag to character', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      await characterRepository.addTag(character.id, 'protagonist')

      const updated = await characterRepository.getById(character.id)
      expect(updated?.tags).toContain('protagonist')
    })

    it('should add multiple tags', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      await characterRepository.addTag(character.id, 'protagonist')
      await characterRepository.addTag(character.id, 'warrior')
      await characterRepository.addTag(character.id, 'main-character')

      const updated = await characterRepository.getById(character.id)
      expect(updated?.tags).toEqual(['protagonist', 'warrior', 'main-character'])
    })

    it('should not add duplicate tags', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      await characterRepository.addTag(character.id, 'hero')
      await characterRepository.addTag(character.id, 'hero')
      await characterRepository.addTag(character.id, 'hero')

      const updated = await characterRepository.getById(character.id)
      expect(updated?.tags).toEqual(['hero'])
    })

    it('should remove a tag from character', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      await characterRepository.addTag(character.id, 'tag1')
      await characterRepository.addTag(character.id, 'tag2')
      await characterRepository.addTag(character.id, 'tag3')

      await characterRepository.removeTag(character.id, 'tag2')

      const updated = await characterRepository.getById(character.id)
      expect(updated?.tags).toEqual(['tag1', 'tag3'])
    })

    it('should handle removing non-existent tag', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      await characterRepository.addTag(character.id, 'tag1')
      await characterRepository.removeTag(character.id, 'non-existent')

      const updated = await characterRepository.getById(character.id)
      expect(updated?.tags).toEqual(['tag1'])
    })

    it('should do nothing when adding tag to non-existent character', async () => {
      await expect(characterRepository.addTag('non-existent', 'tag')).resolves.not.toThrow()
    })

    it('should do nothing when removing tag from non-existent character', async () => {
      await expect(characterRepository.removeTag('non-existent', 'tag')).resolves.not.toThrow()
    })
  })

  describe('reorder', () => {
    it('CH-012: should update sortOrder for character', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Hero')

      expect(character.sortOrder).toBe(0)

      await characterRepository.reorder(character.id, 5)

      const updated = await characterRepository.getById(character.id)
      expect(updated?.sortOrder).toBe(5)
    })

    it('should allow reordering multiple characters', async () => {
      const project = await createTestProject()

      const char1 = await characterRepository.create(project.id, 'First')
      const char2 = await characterRepository.create(project.id, 'Second')
      const char3 = await characterRepository.create(project.id, 'Third')

      // Reverse the order
      await characterRepository.reorder(char1.id, 2)
      await characterRepository.reorder(char2.id, 1)
      await characterRepository.reorder(char3.id, 0)

      const characters = await characterRepository.getByProject(project.id)

      expect(characters[0].name).toBe('Third')
      expect(characters[1].name).toBe('Second')
      expect(characters[2].name).toBe('First')
    })
  })

  describe('delete', () => {
    it('CH-010: should remove character', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'To Delete')

      await characterRepository.delete(character.id)

      const deleted = await characterRepository.getById(character.id)
      expect(deleted).toBeUndefined()
    })

    it('should cascade delete sections', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'With Sections')

      // Add sections directly to database
      await db.sections.add({
        id: 'section-1',
        characterId: character.id,
        name: 'Costumes',
        type: 'costume',
        color: '#8b5cf6',
        sortOrder: 0,
        createdAt: new Date(),
      })
      await db.sections.add({
        id: 'section-2',
        characterId: character.id,
        name: 'Poses',
        type: 'poses',
        color: '#3b82f6',
        sortOrder: 1,
        createdAt: new Date(),
      })

      // Verify sections exist
      const sectionsBefore = await db.sections.where('characterId').equals(character.id).count()
      expect(sectionsBefore).toBe(2)

      // Delete character
      await characterRepository.delete(character.id)

      // Sections should be deleted
      const sectionsAfter = await db.sections.where('characterId').equals(character.id).count()
      expect(sectionsAfter).toBe(0)
    })

    it('should cascade delete canvasItems through sections', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'With Canvas Items')

      // Add section and canvas items
      await db.sections.add({
        id: 'section-1',
        characterId: character.id,
        name: 'Section',
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
      await db.canvasItems.add({
        id: 'canvas-item-2',
        sectionId: 'section-1',
        type: 'note',
        content: { text: 'Note', backgroundColor: '#fff', textColor: '#000', fontSize: 'md' },
        position: { x: 100, y: 0, width: 100, height: 100, rotation: 0, zIndex: 1 },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Verify canvas items exist
      expect(await db.canvasItems.get('canvas-item-1')).toBeDefined()
      expect(await db.canvasItems.get('canvas-item-2')).toBeDefined()

      // Delete character
      await characterRepository.delete(character.id)

      // All related data should be deleted
      expect(await db.sections.get('section-1')).toBeUndefined()
      expect(await db.canvasItems.get('canvas-item-1')).toBeUndefined()
      expect(await db.canvasItems.get('canvas-item-2')).toBeUndefined()
    })

    it('should handle deleting character with multiple sections and canvas items', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Complex Character')

      // Add multiple sections
      await db.sections.add({
        id: 'section-1',
        characterId: character.id,
        name: 'Section 1',
        type: 'costume',
        color: '#8b5cf6',
        sortOrder: 0,
        createdAt: new Date(),
      })
      await db.sections.add({
        id: 'section-2',
        characterId: character.id,
        name: 'Section 2',
        type: 'poses',
        color: '#3b82f6',
        sortOrder: 1,
        createdAt: new Date(),
      })

      // Add canvas items to each section
      await db.canvasItems.add({
        id: 'item-s1-1',
        sectionId: 'section-1',
        type: 'image',
        content: { imageId: 'img-1' },
        position: { x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0 },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await db.canvasItems.add({
        id: 'item-s1-2',
        sectionId: 'section-1',
        type: 'image',
        content: { imageId: 'img-2' },
        position: { x: 100, y: 0, width: 100, height: 100, rotation: 0, zIndex: 1 },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await db.canvasItems.add({
        id: 'item-s2-1',
        sectionId: 'section-2',
        type: 'image',
        content: { imageId: 'img-3' },
        position: { x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0 },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Verify all exist
      expect(await db.sections.where('characterId').equals(character.id).count()).toBe(2)
      expect(
        await db.canvasItems.where('sectionId').anyOf(['section-1', 'section-2']).count()
      ).toBe(3)

      // Delete character
      await characterRepository.delete(character.id)

      // All should be deleted
      expect(await db.characters.get(character.id)).toBeUndefined()
      expect(await db.sections.get('section-1')).toBeUndefined()
      expect(await db.sections.get('section-2')).toBeUndefined()
      expect(await db.canvasItems.get('item-s1-1')).toBeUndefined()
      expect(await db.canvasItems.get('item-s1-2')).toBeUndefined()
      expect(await db.canvasItems.get('item-s2-1')).toBeUndefined()
    })

    it('should not throw when deleting non-existent character', async () => {
      await expect(characterRepository.delete('non-existent')).resolves.not.toThrow()
    })

    it('should not affect other characters in the same project', async () => {
      const project = await createTestProject()

      const char1 = await characterRepository.create(project.id, 'Keep Me')
      const char2 = await characterRepository.create(project.id, 'Delete Me')

      await characterRepository.delete(char2.id)

      // char1 should still exist
      const remaining = await characterRepository.getById(char1.id)
      expect(remaining).toBeDefined()
      expect(remaining?.name).toBe('Keep Me')

      // Only char2 should be deleted
      expect(await characterRepository.getById(char2.id)).toBeUndefined()
    })

    it('should leave sortOrder gaps but getByProject still works correctly', async () => {
      const project = await createTestProject()

      await characterRepository.create(project.id, 'First') // sortOrder 0
      const char2 = await characterRepository.create(project.id, 'Second') // sortOrder 1
      await characterRepository.create(project.id, 'Third') // sortOrder 2

      // Delete middle character (sortOrder 1)
      await characterRepository.delete(char2.id)

      // getByProject should still return characters in correct order
      // even with gap in sortOrder (0, 2)
      const characters = await characterRepository.getByProject(project.id)

      expect(characters).toHaveLength(2)
      expect(characters[0].name).toBe('First')
      expect(characters[0].sortOrder).toBe(0)
      expect(characters[1].name).toBe('Third')
      expect(characters[1].sortOrder).toBe(2) // Gap preserved
    })

    it('should cascade delete images when deleting character', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'With Images')

      // Add images directly to database (linked to character)
      await db.images.add({
        id: 'img-1',
        characterId: character.id,
        filename: 'test.webp',
        originalName: 'test.jpg',
        mimeType: 'image/webp',
        size: 1000,
        width: 100,
        height: 100,
        storagePath: 'opfs://images/img-1',
        thumbnailPath: 'opfs://thumbnails/img-1',
        tags: [],
        createdAt: new Date(),
      })

      await db.images.add({
        id: 'img-2',
        characterId: character.id,
        filename: 'test2.webp',
        originalName: 'test2.jpg',
        mimeType: 'image/webp',
        size: 2000,
        width: 200,
        height: 200,
        storagePath: 'opfs://images/img-2',
        thumbnailPath: 'opfs://thumbnails/img-2',
        tags: [],
        createdAt: new Date(),
      })

      // Verify images exist
      expect(await db.images.get('img-1')).toBeDefined()
      expect(await db.images.get('img-2')).toBeDefined()

      // Delete character
      await characterRepository.delete(character.id)

      // Character is deleted
      expect(await characterRepository.getById(character.id)).toBeUndefined()

      // Images should also be cascade deleted
      expect(await db.images.get('img-1')).toBeUndefined()
      expect(await db.images.get('img-2')).toBeUndefined()
    })
  })

  describe('duplicate', () => {
    it('CH-011: should create copy with new ID, name, and new sortOrder', async () => {
      const project = await createTestProject()
      const original = await characterRepository.create(project.id, 'Original Hero')
      await characterRepository.update(original.id, {
        description: 'A brave warrior',
        tags: ['hero', 'warrior'],
      })
      await characterRepository.updateProfile(original.id, {
        age: '30',
        role: 'Protagonist',
      })
      await characterRepository.updateMetadata(original.id, {
        archetype: 'Hero',
      })

      const duplicated = await characterRepository.duplicate(original.id, 'Original Hero (Copy)')

      expect(duplicated).toBeDefined()
      expect(duplicated?.id).not.toBe(original.id)
      expect(duplicated?.name).toBe('Original Hero (Copy)')
      expect(duplicated?.projectId).toBe(project.id)
      expect(duplicated?.description).toBe('A brave warrior')
      expect(duplicated?.tags).toEqual(['hero', 'warrior'])
      expect(duplicated?.profile.age).toBe('30')
      expect(duplicated?.profile.role).toBe('Protagonist')
      expect(duplicated?.metadata.archetype).toBe('Hero')
      // New sortOrder should be higher
      expect(duplicated?.sortOrder).toBeGreaterThan(original.sortOrder)
    })

    it('should return undefined when duplicating non-existent character', async () => {
      const duplicated = await characterRepository.duplicate('non-existent', 'Copy')

      expect(duplicated).toBeUndefined()
    })

    it('should create independent copy (modifying original does not affect duplicate)', async () => {
      const project = await createTestProject()
      const original = await characterRepository.create(project.id, 'Original')
      await characterRepository.update(original.id, { description: 'Original description' })

      const duplicated = await characterRepository.duplicate(original.id, 'Copy')

      // Modify original
      await characterRepository.update(original.id, { description: 'Modified' })

      // Duplicate should be unchanged
      const duplicatedAfter = await characterRepository.getById(duplicated!.id)
      expect(duplicatedAfter?.description).toBe('Original description')
    })

    it('should create deep copy of tags array (mutating original tags does not affect duplicate)', async () => {
      const project = await createTestProject()
      const original = await characterRepository.create(project.id, 'Original')
      await characterRepository.update(original.id, { tags: ['hero', 'warrior'] })

      const duplicated = await characterRepository.duplicate(original.id, 'Copy')

      // Modify original tags via update (adding a new tag)
      await characterRepository.addTag(original.id, 'new-tag')

      // Duplicate tags should be unchanged
      const duplicatedAfter = await characterRepository.getById(duplicated!.id)
      expect(duplicatedAfter?.tags).toEqual(['hero', 'warrior'])
      expect(duplicatedAfter?.tags).not.toContain('new-tag')
    })

    it('should copy profile completely', async () => {
      const project = await createTestProject()
      const original = await characterRepository.create(project.id, 'Original')
      await characterRepository.updateProfile(original.id, {
        age: '25',
        role: 'Hero',
        personality: ['brave', 'kind'],
        abilities: ['magic', 'combat'],
        backstory: 'Born in a small village...',
        customFields: { height: '180cm' },
      })

      const duplicated = await characterRepository.duplicate(original.id, 'Copy')

      expect(duplicated?.profile).toEqual({
        age: '25',
        role: 'Hero',
        personality: ['brave', 'kind'],
        abilities: ['magic', 'combat'],
        backstory: 'Born in a small village...',
        customFields: { height: '180cm' },
      })
    })

    it('should copy metadata completely', async () => {
      const project = await createTestProject()
      const original = await characterRepository.create(project.id, 'Original')
      await characterRepository.updateMetadata(original.id, {
        archetype: 'Warrior',
        version: '2.0',
        inspirations: ['Character A', 'Character B'],
        palette: {
          dominant: '#000',
          vibrant: '#fff',
          muted: '#888',
          colors: ['#000', '#fff', '#888'],
        },
      })

      const duplicated = await characterRepository.duplicate(original.id, 'Copy')

      expect(duplicated?.metadata.archetype).toBe('Warrior')
      expect(duplicated?.metadata.version).toBe('2.0')
      expect(duplicated?.metadata.inspirations).toEqual(['Character A', 'Character B'])
      expect(duplicated?.metadata.palette?.dominant).toBe('#000')
    })

    it('should NOT copy canvasState (current behavior - canvas layout is unique per character)', async () => {
      const project = await createTestProject()
      const original = await characterRepository.create(project.id, 'Original')
      await characterRepository.updateCanvasState(original.id, {
        viewport: { x: 100, y: 100, zoom: 2 },
        items: [
          {
            id: 'item-1',
            imageId: 'img-1',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            rotation: 0,
            zIndex: 0,
          },
        ],
        updatedAt: new Date(),
      })

      const duplicated = await characterRepository.duplicate(original.id, 'Copy')

      // NOTE: duplicate() explicitly copies: description, tags, profile, metadata
      // It does NOT copy canvasState - this is intentional as canvas layout
      // references image positions that may not exist for the duplicate.
      // If this behavior should change, update characterRepository.duplicate()
      expect(duplicated?.canvasState).toBeUndefined()
    })
  })

  describe('special characters', () => {
    it('should handle unicode, emojis, and special characters in name', async () => {
      const project = await createTestProject()
      const specialNames = [
        'Héroe Español',
        'Герой на русском',
        '日本語キャラクター',
        '🦸 Super Hero 🦹',
        "Character with 'quotes' and \"double\"",
        'Character/with\\slashes',
      ]

      for (const name of specialNames) {
        const character = await characterRepository.create(project.id, name)
        const retrieved = await characterRepository.getById(character.id)

        expect(retrieved?.name).toBe(name)
      }
    })

    it('should handle special characters in description', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Test')

      await characterRepository.update(character.id, {
        description: '描述 with émojis 🎭 and "quotes" and\nnewlines',
      })

      const retrieved = await characterRepository.getById(character.id)
      expect(retrieved?.description).toBe('描述 with émojis 🎭 and "quotes" and\nnewlines')
    })

    it('should handle special characters in tags', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Test')

      await characterRepository.addTag(character.id, '主人公')
      await characterRepository.addTag(character.id, 'héros')
      await characterRepository.addTag(character.id, '🔥hot')

      const retrieved = await characterRepository.getById(character.id)
      expect(retrieved?.tags).toEqual(['主人公', 'héros', '🔥hot'])
    })
  })

  describe('edge cases', () => {
    it('should handle very long name (realistic user input)', async () => {
      const project = await createTestProject()
      // 200 chars is a reasonable max for a character name
      const longName = 'A'.repeat(200)
      const character = await characterRepository.create(project.id, longName)

      const retrieved = await characterRepository.getById(character.id)
      expect(retrieved?.name).toBe(longName)
    })

    it('should handle many tags (power user scenario)', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Tagged')
      const manyTags = Array.from({ length: 50 }, (_, i) => `tag-${i}`)

      await characterRepository.update(character.id, { tags: manyTags })

      const retrieved = await characterRepository.getById(character.id)
      expect(retrieved?.tags).toHaveLength(50)
    })

    it('should handle very long backstory (novel-length character background)', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Story')
      // ~13KB of text - a realistic long backstory
      const longBackstory = 'Lorem ipsum dolor sit amet. '.repeat(500)

      await characterRepository.updateProfile(character.id, { backstory: longBackstory })

      const retrieved = await characterRepository.getById(character.id)
      expect(retrieved?.profile.backstory).toBe(longBackstory)
    })

    it('should handle canvas state with many items (complex moodboard)', async () => {
      const project = await createTestProject()
      const character = await characterRepository.create(project.id, 'Canvas Heavy')

      // 50 images is a realistic complex moodboard
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        imageId: `img-${i}`,
        x: i * 100,
        y: i * 100,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: i,
      }))

      const canvasState: CanvasState = {
        viewport: { x: 0, y: 0, zoom: 1 },
        items: manyItems,
        updatedAt: new Date(),
      }

      await characterRepository.updateCanvasState(character.id, canvasState)

      const retrieved = await characterRepository.getById(character.id)
      expect(retrieved?.canvasState?.items).toHaveLength(50)
    })

    it('should correctly assign sortOrder after many creations and deletions', async () => {
      const project = await createTestProject()

      // Create 5 characters
      const chars = []
      for (let i = 0; i < 5; i++) {
        chars.push(await characterRepository.create(project.id, `Char ${i}`))
      }
      // sortOrders: 0, 1, 2, 3, 4

      // Delete characters 1 and 3
      await characterRepository.delete(chars[1].id)
      await characterRepository.delete(chars[3].id)

      // Create a new character - should get sortOrder 5 (max + 1)
      const newChar = await characterRepository.create(project.id, 'New Char')
      expect(newChar.sortOrder).toBe(5)

      // Verify all characters are retrievable and in correct order
      const remaining = await characterRepository.getByProject(project.id)
      expect(remaining).toHaveLength(4)
      expect(remaining.map((c) => c.sortOrder)).toEqual([0, 2, 4, 5])
    })
  })
})
