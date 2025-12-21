/**
 * ProjectStore Test Suite
 *
 * Tests for: src/store/projectStore.ts
 * Reference: TEST_CASES.md - Section 1.2 ProjectStore (PS-001 to PS-037)
 *
 * This tests the Zustand store that manages project and character state.
 * Dependencies (repositories, triggerGlobalSync) are mocked to isolate store logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProjectStore } from '@/store/projectStore'
import type { Project, Character } from '@/types'

// Mock the repositories
vi.mock('@/lib/db/repositories', () => ({
  projectRepository: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    archive: vi.fn(),
    delete: vi.fn(),
  },
  characterRepository: {
    getByProject: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    delete: vi.fn(),
  },
  editionRepository: {
    getByProject: vi.fn().mockResolvedValue([]),
  },
  scriptPageRepository: {
    getByEdition: vi.fn().mockResolvedValue([]),
  },
  panelRepository: {
    getByPage: vi.fn().mockResolvedValue([]),
  },
}))

// Mock triggerGlobalSync
vi.mock('@/lib/sync/globalSyncTrigger', () => ({
  triggerGlobalSync: vi.fn(),
}))

// Mock syncManifest
vi.mock('@/lib/sync/syncManifest', () => ({
  syncManifest: {
    recordDeletion: vi.fn().mockResolvedValue(undefined),
  },
}))

// Import mocked modules after mock setup
import { projectRepository, characterRepository } from '@/lib/db/repositories'
import { triggerGlobalSync } from '@/lib/sync/globalSyncTrigger'

// Helper to create a mock project
function createMockProject(overrides: Partial<Project> = {}): Project {
  const now = new Date()
  return {
    id: `project-${Math.random().toString(36).slice(2)}`,
    name: 'Test Project',
    tags: [],
    settings: {
      defaultView: 'grid',
      gridColumns: 4,
      canvasBackground: '#1a1a1a',
    },
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// Helper to create a mock character
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const now = new Date()
  return {
    id: `char-${Math.random().toString(36).slice(2)}`,
    projectId: 'project-1',
    name: 'Test Character',
    tags: [],
    profile: {},
    metadata: {},
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// Reset Zustand store state before each test
function resetStore() {
  useProjectStore.setState({
    projects: [],
    currentProject: null,
    characters: [],
    currentCharacter: null,
    isLoading: false,
  })
}

describe('ProjectStore', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  // ===========================================
  // Initial State (PS-001)
  // ===========================================
  describe('Initial State', () => {
    it('PS-001: should initialize with empty projects[], null currentProject, empty characters[], null currentCharacter, isLoading=false', () => {
      const state = useProjectStore.getState()

      expect(state.projects).toEqual([])
      expect(state.currentProject).toBeNull()
      expect(state.characters).toEqual([])
      expect(state.currentCharacter).toBeNull()
      expect(state.isLoading).toBe(false)
    })
  })

  // ===========================================
  // loadProjects (PS-002 to PS-004)
  // ===========================================
  describe('loadProjects', () => {
    it('PS-002: should fetch projects from repository and update state', async () => {
      const mockProjects = [
        createMockProject({ id: 'p1', name: 'Project 1' }),
        createMockProject({ id: 'p2', name: 'Project 2' }),
      ]
      vi.mocked(projectRepository.getAll).mockResolvedValue(mockProjects)

      await useProjectStore.getState().loadProjects()

      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(2)
      expect(state.projects[0].name).toBe('Project 1')
      expect(state.projects[1].name).toBe('Project 2')
      expect(projectRepository.getAll).toHaveBeenCalledOnce()
    })

    it('PS-003: should set isLoading=true before fetch, false after', async () => {
      const loadingStates: boolean[] = []

      // Track isLoading during the async operation
      vi.mocked(projectRepository.getAll).mockImplementation(async () => {
        loadingStates.push(useProjectStore.getState().isLoading)
        return []
      })

      await useProjectStore.getState().loadProjects()

      // isLoading should have been true during fetch
      expect(loadingStates[0]).toBe(true)
      // isLoading should be false after fetch
      expect(useProjectStore.getState().isLoading).toBe(false)
    })

    it('PS-004: should set isLoading=false on error, log error, not throw', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(projectRepository.getAll).mockRejectedValue(new Error('DB Error'))

      // Should not throw
      await expect(useProjectStore.getState().loadProjects()).resolves.not.toThrow()

      const state = useProjectStore.getState()
      expect(state.isLoading).toBe(false)
      expect(consoleError).toHaveBeenCalledWith('Failed to load projects:', expect.any(Error))

      consoleError.mockRestore()
    })
  })

  // ===========================================
  // selectProject (PS-005 to PS-008)
  // ===========================================
  describe('selectProject', () => {
    it('PS-005: should set currentProject from repository and return true', async () => {
      const mockProject = createMockProject({ id: 'p1', name: 'Selected Project' })
      vi.mocked(projectRepository.getById).mockResolvedValue(mockProject)
      vi.mocked(characterRepository.getByProject).mockResolvedValue([])

      const result = await useProjectStore.getState().selectProject('p1')

      expect(result).toBe(true)
      const state = useProjectStore.getState()
      expect(state.currentProject).not.toBeNull()
      expect(state.currentProject?.id).toBe('p1')
      expect(state.currentProject?.name).toBe('Selected Project')
    })

    it('PS-006: should set currentCharacter to null when selecting project', async () => {
      // Set up a current character first
      const existingCharacter = createMockCharacter({ id: 'c1', name: 'Old Character' })
      useProjectStore.setState({ currentCharacter: existingCharacter })

      const mockProject = createMockProject({ id: 'p1' })
      vi.mocked(projectRepository.getById).mockResolvedValue(mockProject)
      vi.mocked(characterRepository.getByProject).mockResolvedValue([])

      await useProjectStore.getState().selectProject('p1')

      expect(useProjectStore.getState().currentCharacter).toBeNull()
    })

    it('PS-007: should call loadCharacters after successful selection', async () => {
      const mockProject = createMockProject({ id: 'p1' })
      const mockCharacters = [
        createMockCharacter({ id: 'c1', projectId: 'p1', name: 'Char 1' }),
        createMockCharacter({ id: 'c2', projectId: 'p1', name: 'Char 2' }),
      ]
      vi.mocked(projectRepository.getById).mockResolvedValue(mockProject)
      vi.mocked(characterRepository.getByProject).mockResolvedValue(mockCharacters)

      await useProjectStore.getState().selectProject('p1')

      expect(characterRepository.getByProject).toHaveBeenCalledWith('p1')
      const state = useProjectStore.getState()
      expect(state.characters).toHaveLength(2)
      expect(state.characters[0].name).toBe('Char 1')
    })

    it('PS-008: should return false and set isLoading=false for non-existent ID', async () => {
      vi.mocked(projectRepository.getById).mockResolvedValue(undefined)

      const result = await useProjectStore.getState().selectProject('non-existent')

      expect(result).toBe(false)
      expect(useProjectStore.getState().currentProject).toBeNull()
      expect(useProjectStore.getState().isLoading).toBe(false)
    })
  })

  // ===========================================
  // createProject (PS-009 to PS-011)
  // ===========================================
  describe('createProject', () => {
    it('PS-009: should add new project to beginning of projects array (not end)', async () => {
      // Set up existing projects
      const existingProject = createMockProject({ id: 'existing', name: 'Existing' })
      useProjectStore.setState({ projects: [existingProject] })

      const newProject = createMockProject({ id: 'new', name: 'New Project' })
      vi.mocked(projectRepository.create).mockResolvedValue(newProject)

      await useProjectStore.getState().createProject('New Project')

      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(2)
      expect(state.projects[0].name).toBe('New Project') // First position
      expect(state.projects[1].name).toBe('Existing') // Second position
    })

    it('PS-010: should return created project from repository', async () => {
      const newProject = createMockProject({ id: 'new-id', name: 'Created' })
      vi.mocked(projectRepository.create).mockResolvedValue(newProject)

      const result = await useProjectStore.getState().createProject('Created', 'Description')

      expect(result).toBeDefined()
      expect(result.id).toBe('new-id')
      expect(result.name).toBe('Created')
      expect(projectRepository.create).toHaveBeenCalledWith('Created', 'Description')
    })

    it('PS-011: should call triggerGlobalSync after creation', async () => {
      const newProject = createMockProject()
      vi.mocked(projectRepository.create).mockResolvedValue(newProject)

      await useProjectStore.getState().createProject('New')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // renameProject (PS-012 to PS-015)
  // ===========================================
  describe('renameProject', () => {
    it('PS-012: should update project name in projects array', async () => {
      const project = createMockProject({ id: 'p1', name: 'Old Name' })
      useProjectStore.setState({ projects: [project] })
      vi.mocked(projectRepository.rename).mockResolvedValue()

      await useProjectStore.getState().renameProject('p1', 'New Name')

      const state = useProjectStore.getState()
      expect(state.projects[0].name).toBe('New Name')
    })

    it('PS-013: should update currentProject if renaming current project', async () => {
      const project = createMockProject({ id: 'p1', name: 'Old Name' })
      useProjectStore.setState({
        projects: [project],
        currentProject: project,
      })
      vi.mocked(projectRepository.rename).mockResolvedValue()

      await useProjectStore.getState().renameProject('p1', 'New Name')

      const state = useProjectStore.getState()
      expect(state.currentProject?.name).toBe('New Name')
    })

    it('PS-014: should update updatedAt timestamp in state', async () => {
      const oldDate = new Date('2020-01-01')
      const project = createMockProject({ id: 'p1', name: 'Old', updatedAt: oldDate })
      useProjectStore.setState({ projects: [project] })
      vi.mocked(projectRepository.rename).mockResolvedValue()

      const beforeRename = new Date()
      await useProjectStore.getState().renameProject('p1', 'New')
      const afterRename = new Date()

      const state = useProjectStore.getState()
      expect(state.projects[0].updatedAt.getTime()).toBeGreaterThanOrEqual(beforeRename.getTime())
      expect(state.projects[0].updatedAt.getTime()).toBeLessThanOrEqual(afterRename.getTime())
    })

    it('PS-015: should call triggerGlobalSync after rename', async () => {
      const project = createMockProject({ id: 'p1' })
      useProjectStore.setState({ projects: [project] })
      vi.mocked(projectRepository.rename).mockResolvedValue()

      await useProjectStore.getState().renameProject('p1', 'New')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should not update currentProject if renaming different project', async () => {
      const project1 = createMockProject({ id: 'p1', name: 'Project 1' })
      const project2 = createMockProject({ id: 'p2', name: 'Project 2' })
      useProjectStore.setState({
        projects: [project1, project2],
        currentProject: project1,
      })
      vi.mocked(projectRepository.rename).mockResolvedValue()

      await useProjectStore.getState().renameProject('p2', 'Renamed')

      const state = useProjectStore.getState()
      expect(state.currentProject?.name).toBe('Project 1') // Unchanged
      expect(state.projects[1].name).toBe('Renamed')
    })
  })

  // ===========================================
  // archiveProject (PS-016 to PS-018)
  // ===========================================
  describe('archiveProject', () => {
    it('PS-016: should remove project from projects array', async () => {
      const project1 = createMockProject({ id: 'p1', name: 'To Archive' })
      const project2 = createMockProject({ id: 'p2', name: 'To Keep' })
      useProjectStore.setState({ projects: [project1, project2] })
      vi.mocked(projectRepository.archive).mockResolvedValue()

      await useProjectStore.getState().archiveProject('p1')

      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.projects[0].name).toBe('To Keep')
    })

    it('PS-017: should set currentProject to null if archiving current', async () => {
      const project = createMockProject({ id: 'p1' })
      useProjectStore.setState({
        projects: [project],
        currentProject: project,
      })
      vi.mocked(projectRepository.archive).mockResolvedValue()

      await useProjectStore.getState().archiveProject('p1')

      expect(useProjectStore.getState().currentProject).toBeNull()
    })

    it('PS-018: should call triggerGlobalSync after archive', async () => {
      const project = createMockProject({ id: 'p1' })
      useProjectStore.setState({ projects: [project] })
      vi.mocked(projectRepository.archive).mockResolvedValue()

      await useProjectStore.getState().archiveProject('p1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should not clear currentProject if archiving different project', async () => {
      const project1 = createMockProject({ id: 'p1' })
      const project2 = createMockProject({ id: 'p2' })
      useProjectStore.setState({
        projects: [project1, project2],
        currentProject: project1,
      })
      vi.mocked(projectRepository.archive).mockResolvedValue()

      await useProjectStore.getState().archiveProject('p2')

      expect(useProjectStore.getState().currentProject?.id).toBe('p1')
    })
  })

  // ===========================================
  // deleteProject (PS-019 to PS-022)
  // ===========================================
  describe('deleteProject', () => {
    it('PS-019: should remove project from projects array', async () => {
      const project1 = createMockProject({ id: 'p1', name: 'To Delete' })
      const project2 = createMockProject({ id: 'p2', name: 'To Keep' })
      useProjectStore.setState({ projects: [project1, project2] })
      vi.mocked(projectRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteProject('p1')

      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.projects[0].name).toBe('To Keep')
    })

    it('PS-020: should set currentProject to null if deleting current', async () => {
      const project = createMockProject({ id: 'p1' })
      useProjectStore.setState({
        projects: [project],
        currentProject: project,
      })
      vi.mocked(projectRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteProject('p1')

      expect(useProjectStore.getState().currentProject).toBeNull()
    })

    it('PS-021: should clear characters array if deleting current project', async () => {
      const project = createMockProject({ id: 'p1' })
      const characters = [
        createMockCharacter({ id: 'c1', projectId: 'p1' }),
        createMockCharacter({ id: 'c2', projectId: 'p1' }),
      ]
      useProjectStore.setState({
        projects: [project],
        currentProject: project,
        characters,
      })
      vi.mocked(projectRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteProject('p1')

      expect(useProjectStore.getState().characters).toEqual([])
    })

    it('PS-022: should call triggerGlobalSync after delete', async () => {
      const project = createMockProject({ id: 'p1' })
      useProjectStore.setState({ projects: [project] })
      vi.mocked(projectRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteProject('p1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should not clear characters if deleting different project', async () => {
      const project1 = createMockProject({ id: 'p1' })
      const project2 = createMockProject({ id: 'p2' })
      const characters = [createMockCharacter({ id: 'c1', projectId: 'p1' })]
      useProjectStore.setState({
        projects: [project1, project2],
        currentProject: project1,
        characters,
      })
      vi.mocked(projectRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteProject('p2')

      expect(useProjectStore.getState().characters).toHaveLength(1)
    })
  })

  // ===========================================
  // loadCharacters (PS-023)
  // ===========================================
  describe('loadCharacters', () => {
    it('PS-023: should fetch characters and update state', async () => {
      const mockCharacters = [
        createMockCharacter({ id: 'c1', name: 'Char 1' }),
        createMockCharacter({ id: 'c2', name: 'Char 2' }),
      ]
      vi.mocked(characterRepository.getByProject).mockResolvedValue(mockCharacters)

      await useProjectStore.getState().loadCharacters('p1')

      const state = useProjectStore.getState()
      expect(state.characters).toHaveLength(2)
      expect(state.characters[0].name).toBe('Char 1')
      expect(state.characters[1].name).toBe('Char 2')
      expect(characterRepository.getByProject).toHaveBeenCalledWith('p1')
    })
  })

  // ===========================================
  // createCharacter (PS-024 to PS-026)
  // ===========================================
  describe('createCharacter', () => {
    it('PS-024: should add character to characters array', async () => {
      const project = createMockProject({ id: 'p1' })
      const existingChar = createMockCharacter({ id: 'c1', name: 'Existing' })
      useProjectStore.setState({
        currentProject: project,
        characters: [existingChar],
      })

      const newChar = createMockCharacter({ id: 'c2', name: 'New Character' })
      vi.mocked(characterRepository.create).mockResolvedValue(newChar)

      await useProjectStore.getState().createCharacter('New Character')

      const state = useProjectStore.getState()
      expect(state.characters).toHaveLength(2)
      expect(state.characters[1].name).toBe('New Character')
    })

    it('PS-025: should return null if no currentProject', async () => {
      useProjectStore.setState({ currentProject: null })

      const result = await useProjectStore.getState().createCharacter('Test')

      expect(result).toBeNull()
      expect(characterRepository.create).not.toHaveBeenCalled()
    })

    it('PS-026: should call triggerGlobalSync after creation', async () => {
      const project = createMockProject({ id: 'p1' })
      useProjectStore.setState({ currentProject: project, characters: [] })

      const newChar = createMockCharacter()
      vi.mocked(characterRepository.create).mockResolvedValue(newChar)

      await useProjectStore.getState().createCharacter('Test')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should pass projectId to repository.create', async () => {
      const project = createMockProject({ id: 'project-abc' })
      useProjectStore.setState({ currentProject: project, characters: [] })

      const newChar = createMockCharacter({ projectId: 'project-abc' })
      vi.mocked(characterRepository.create).mockResolvedValue(newChar)

      await useProjectStore.getState().createCharacter('Hero')

      expect(characterRepository.create).toHaveBeenCalledWith('project-abc', 'Hero')
    })
  })

  // ===========================================
  // selectCharacter (PS-027 to PS-028)
  // ===========================================
  describe('selectCharacter', () => {
    it('PS-027: should set currentCharacter and return true', async () => {
      const mockChar = createMockCharacter({ id: 'c1', name: 'Selected' })
      vi.mocked(characterRepository.getById).mockResolvedValue(mockChar)

      const result = await useProjectStore.getState().selectCharacter('c1')

      expect(result).toBe(true)
      const state = useProjectStore.getState()
      expect(state.currentCharacter).not.toBeNull()
      expect(state.currentCharacter?.id).toBe('c1')
      expect(state.currentCharacter?.name).toBe('Selected')
    })

    it('PS-028: should return false for non-existent ID', async () => {
      vi.mocked(characterRepository.getById).mockResolvedValue(undefined)

      const result = await useProjectStore.getState().selectCharacter('non-existent')

      expect(result).toBe(false)
      expect(useProjectStore.getState().currentCharacter).toBeNull()
    })
  })

  // ===========================================
  // renameCharacter (PS-029 to PS-031)
  // ===========================================
  describe('renameCharacter', () => {
    it('PS-029: should update character name in characters array', async () => {
      const character = createMockCharacter({ id: 'c1', name: 'Old Name' })
      useProjectStore.setState({ characters: [character] })
      vi.mocked(characterRepository.rename).mockResolvedValue()

      await useProjectStore.getState().renameCharacter('c1', 'New Name')

      const state = useProjectStore.getState()
      expect(state.characters[0].name).toBe('New Name')
    })

    it('PS-030: should update currentCharacter if renaming current', async () => {
      const character = createMockCharacter({ id: 'c1', name: 'Old Name' })
      useProjectStore.setState({
        characters: [character],
        currentCharacter: character,
      })
      vi.mocked(characterRepository.rename).mockResolvedValue()

      await useProjectStore.getState().renameCharacter('c1', 'New Name')

      expect(useProjectStore.getState().currentCharacter?.name).toBe('New Name')
    })

    it('PS-031: should call triggerGlobalSync after rename', async () => {
      const character = createMockCharacter({ id: 'c1' })
      useProjectStore.setState({ characters: [character] })
      vi.mocked(characterRepository.rename).mockResolvedValue()

      await useProjectStore.getState().renameCharacter('c1', 'New')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should update updatedAt timestamp', async () => {
      const oldDate = new Date('2020-01-01')
      const character = createMockCharacter({ id: 'c1', updatedAt: oldDate })
      useProjectStore.setState({ characters: [character] })
      vi.mocked(characterRepository.rename).mockResolvedValue()

      const beforeRename = new Date()
      await useProjectStore.getState().renameCharacter('c1', 'New')

      const state = useProjectStore.getState()
      expect(state.characters[0].updatedAt.getTime()).toBeGreaterThanOrEqual(beforeRename.getTime())
    })

    it('should not update currentCharacter if renaming different character', async () => {
      const char1 = createMockCharacter({ id: 'c1', name: 'Char 1' })
      const char2 = createMockCharacter({ id: 'c2', name: 'Char 2' })
      useProjectStore.setState({
        characters: [char1, char2],
        currentCharacter: char1,
      })
      vi.mocked(characterRepository.rename).mockResolvedValue()

      await useProjectStore.getState().renameCharacter('c2', 'Renamed')

      expect(useProjectStore.getState().currentCharacter?.name).toBe('Char 1')
    })
  })

  // ===========================================
  // deleteCharacter (PS-032 to PS-034)
  // ===========================================
  describe('deleteCharacter', () => {
    it('PS-032: should remove character from characters array', async () => {
      const char1 = createMockCharacter({ id: 'c1', name: 'To Delete' })
      const char2 = createMockCharacter({ id: 'c2', name: 'To Keep' })
      useProjectStore.setState({ characters: [char1, char2] })
      vi.mocked(characterRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteCharacter('c1')

      const state = useProjectStore.getState()
      expect(state.characters).toHaveLength(1)
      expect(state.characters[0].name).toBe('To Keep')
    })

    it('PS-033: should set currentCharacter to null if deleting current', async () => {
      const character = createMockCharacter({ id: 'c1' })
      useProjectStore.setState({
        characters: [character],
        currentCharacter: character,
      })
      vi.mocked(characterRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteCharacter('c1')

      expect(useProjectStore.getState().currentCharacter).toBeNull()
    })

    it('PS-034: should call triggerGlobalSync after delete', async () => {
      const character = createMockCharacter({ id: 'c1' })
      useProjectStore.setState({ characters: [character] })
      vi.mocked(characterRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteCharacter('c1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should not clear currentCharacter if deleting different character', async () => {
      const char1 = createMockCharacter({ id: 'c1' })
      const char2 = createMockCharacter({ id: 'c2' })
      useProjectStore.setState({
        characters: [char1, char2],
        currentCharacter: char1,
      })
      vi.mocked(characterRepository.delete).mockResolvedValue()

      await useProjectStore.getState().deleteCharacter('c2')

      expect(useProjectStore.getState().currentCharacter?.id).toBe('c1')
    })
  })

  // ===========================================
  // Reset Actions (PS-035 to PS-036)
  // ===========================================
  describe('Reset Actions', () => {
    it('PS-035: clearCurrentProject should set currentProject to null, clear characters and currentCharacter', () => {
      const project = createMockProject({ id: 'p1' })
      const character = createMockCharacter({ id: 'c1' })
      useProjectStore.setState({
        currentProject: project,
        characters: [character],
        currentCharacter: character,
      })

      useProjectStore.getState().clearCurrentProject()

      const state = useProjectStore.getState()
      expect(state.currentProject).toBeNull()
      expect(state.characters).toEqual([])
      expect(state.currentCharacter).toBeNull()
    })

    it('PS-036: clearCurrentCharacter should set currentCharacter to null only', () => {
      const project = createMockProject({ id: 'p1' })
      const character = createMockCharacter({ id: 'c1' })
      useProjectStore.setState({
        currentProject: project,
        characters: [character],
        currentCharacter: character,
      })

      useProjectStore.getState().clearCurrentCharacter()

      const state = useProjectStore.getState()
      expect(state.currentCharacter).toBeNull()
      // Others should remain unchanged
      expect(state.currentProject).not.toBeNull()
      expect(state.characters).toHaveLength(1)
    })
  })

  // ===========================================
  // Edge Cases (PS-037)
  // ===========================================
  describe('Edge Cases', () => {
    it('PS-037: rename should not throw for non-existent project ID', async () => {
      useProjectStore.setState({ projects: [] })
      vi.mocked(projectRepository.rename).mockResolvedValue()

      await expect(
        useProjectStore.getState().renameProject('non-existent', 'New Name')
      ).resolves.not.toThrow()
    })

    it('PS-037: archive should not throw for non-existent project ID', async () => {
      useProjectStore.setState({ projects: [] })
      vi.mocked(projectRepository.archive).mockResolvedValue()

      await expect(
        useProjectStore.getState().archiveProject('non-existent')
      ).resolves.not.toThrow()
    })

    it('PS-037: delete should not throw for non-existent project ID', async () => {
      useProjectStore.setState({ projects: [] })
      vi.mocked(projectRepository.delete).mockResolvedValue()

      await expect(
        useProjectStore.getState().deleteProject('non-existent')
      ).resolves.not.toThrow()
    })

    it('PS-037: renameCharacter should not throw for non-existent character ID', async () => {
      useProjectStore.setState({ characters: [] })
      vi.mocked(characterRepository.rename).mockResolvedValue()

      await expect(
        useProjectStore.getState().renameCharacter('non-existent', 'New')
      ).resolves.not.toThrow()
    })

    it('PS-037: deleteCharacter should not throw for non-existent character ID', async () => {
      useProjectStore.setState({ characters: [] })
      vi.mocked(characterRepository.delete).mockResolvedValue()

      await expect(
        useProjectStore.getState().deleteCharacter('non-existent')
      ).resolves.not.toThrow()
    })
  })

  // ===========================================
  // Documented Design Issues
  // ===========================================
  describe('Documented Design Issues', () => {
    it('ISSUE: selectProject sets isLoading=false on failure but never sets it to true', async () => {
      // BUG: selectProject never sets isLoading=true at the start,
      // but sets isLoading=false when project not found.
      // This is inconsistent with loadProjects which properly manages isLoading.
      vi.mocked(projectRepository.getById).mockResolvedValue(undefined)

      // Verify isLoading is false before
      expect(useProjectStore.getState().isLoading).toBe(false)

      await useProjectStore.getState().selectProject('any-id')

      // isLoading is still false (set explicitly on line 70)
      // but it was never set to true at the start - inconsistent pattern
      expect(useProjectStore.getState().isLoading).toBe(false)
    })

    it('ISSUE: archiveProject does NOT clear characters when archiving current project', async () => {
      // BUG: Inconsistent with deleteProject which DOES clear characters.
      // When a project is archived, the characters still belong to it,
      // but they remain in state even though currentProject becomes null.
      const project = createMockProject({ id: 'p1' })
      const characters = [createMockCharacter({ id: 'c1', projectId: 'p1' })]
      useProjectStore.setState({
        projects: [project],
        currentProject: project,
        characters,
        currentCharacter: characters[0],
      })
      vi.mocked(projectRepository.archive).mockResolvedValue()

      await useProjectStore.getState().archiveProject('p1')

      const state = useProjectStore.getState()
      // currentProject is cleared
      expect(state.currentProject).toBeNull()
      // BUG: characters are NOT cleared (inconsistent with deleteProject)
      expect(state.characters).toHaveLength(1)
      // BUG: currentCharacter is also NOT cleared
      expect(state.currentCharacter).not.toBeNull()
    })

    it('ISSUE: createProject propagates repository errors without handling', async () => {
      // WARNING: No try/catch - errors propagate to caller.
      // This may be intentional, but is inconsistent with loadProjects which catches errors.
      vi.mocked(projectRepository.create).mockRejectedValue(new Error('DB Error'))

      await expect(
        useProjectStore.getState().createProject('Test')
      ).rejects.toThrow('DB Error')

      // triggerGlobalSync was NOT called (good - operation failed)
      expect(triggerGlobalSync).not.toHaveBeenCalled()
    })

    it('ISSUE: renameProject propagates repository errors and does NOT trigger sync', async () => {
      // No error handling - if rename fails, state is unchanged but error propagates
      const project = createMockProject({ id: 'p1', name: 'Original' })
      useProjectStore.setState({ projects: [project] })
      vi.mocked(projectRepository.rename).mockRejectedValue(new Error('DB Error'))

      await expect(
        useProjectStore.getState().renameProject('p1', 'New Name')
      ).rejects.toThrow('DB Error')

      // State is unchanged (good - operation failed before state update)
      expect(useProjectStore.getState().projects[0].name).toBe('Original')
      // Sync not triggered (good)
      expect(triggerGlobalSync).not.toHaveBeenCalled()
    })

    it('ISSUE: deleteProject propagates repository errors and does NOT trigger sync', async () => {
      const project = createMockProject({ id: 'p1' })
      useProjectStore.setState({ projects: [project] })
      vi.mocked(projectRepository.delete).mockRejectedValue(new Error('DB Error'))

      await expect(
        useProjectStore.getState().deleteProject('p1')
      ).rejects.toThrow('DB Error')

      // Project still in state (good - operation failed)
      expect(useProjectStore.getState().projects).toHaveLength(1)
      expect(triggerGlobalSync).not.toHaveBeenCalled()
    })

    it('ISSUE: deleteCharacter propagates repository errors', async () => {
      const character = createMockCharacter({ id: 'c1' })
      useProjectStore.setState({ characters: [character] })
      vi.mocked(characterRepository.delete).mockRejectedValue(new Error('DB Error'))

      await expect(
        useProjectStore.getState().deleteCharacter('c1')
      ).rejects.toThrow('DB Error')

      // Character still in state
      expect(useProjectStore.getState().characters).toHaveLength(1)
      expect(triggerGlobalSync).not.toHaveBeenCalled()
    })

    it('ISSUE: loadCharacters has no error handling - errors propagate', async () => {
      // WARNING: Unlike loadProjects, loadCharacters does NOT catch errors
      vi.mocked(characterRepository.getByProject).mockRejectedValue(new Error('DB Error'))

      await expect(
        useProjectStore.getState().loadCharacters('p1')
      ).rejects.toThrow('DB Error')
    })

    it('ISSUE: selectCharacter has no error handling - errors propagate', async () => {
      vi.mocked(characterRepository.getById).mockRejectedValue(new Error('DB Error'))

      await expect(
        useProjectStore.getState().selectCharacter('c1')
      ).rejects.toThrow('DB Error')
    })
  })

  // ===========================================
  // Additional Behavioral Tests
  // ===========================================
  describe('Additional Behavioral Tests', () => {
    it('createProject should work with undefined description', async () => {
      const newProject = createMockProject({ id: 'new' })
      vi.mocked(projectRepository.create).mockResolvedValue(newProject)

      await useProjectStore.getState().createProject('Name Only')

      expect(projectRepository.create).toHaveBeenCalledWith('Name Only', undefined)
    })

    it('loadProjects should replace existing projects, not append', async () => {
      // Start with existing projects
      useProjectStore.setState({
        projects: [createMockProject({ id: 'old', name: 'Old' })],
      })

      const newProjects = [createMockProject({ id: 'new', name: 'New' })]
      vi.mocked(projectRepository.getAll).mockResolvedValue(newProjects)

      await useProjectStore.getState().loadProjects()

      const state = useProjectStore.getState()
      expect(state.projects).toHaveLength(1)
      expect(state.projects[0].name).toBe('New')
    })

    it('selectProject should not call loadCharacters if project not found', async () => {
      vi.mocked(projectRepository.getById).mockResolvedValue(undefined)

      await useProjectStore.getState().selectProject('non-existent')

      expect(characterRepository.getByProject).not.toHaveBeenCalled()
    })

    it('createCharacter should append to end of characters array (not prepend)', async () => {
      const project = createMockProject({ id: 'p1' })
      const existingChars = [
        createMockCharacter({ id: 'c1', name: 'First' }),
        createMockCharacter({ id: 'c2', name: 'Second' }),
      ]
      useProjectStore.setState({
        currentProject: project,
        characters: existingChars,
      })

      const newChar = createMockCharacter({ id: 'c3', name: 'Third' })
      vi.mocked(characterRepository.create).mockResolvedValue(newChar)

      await useProjectStore.getState().createCharacter('Third')

      const state = useProjectStore.getState()
      expect(state.characters).toHaveLength(3)
      expect(state.characters[2].name).toBe('Third') // Appended at end
    })
  })
})
