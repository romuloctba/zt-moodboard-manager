/**
 * EditionStore Test Suite
 *
 * Tests for: src/store/editionStore.ts
 * Reference: TEST_CASES.md - Section 1.2 EditionStore (ES-001 to ES-073)
 *
 * This tests the Zustand store that manages edition, page, panel, and dialogue state.
 * Dependencies (repositories, triggerGlobalSync, syncManifest) are mocked to isolate store logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditionStore } from '@/store/editionStore'
import type { Edition, ScriptPage, Panel, PanelDialogue } from '@/types'

// Mock the repositories
vi.mock('@/lib/db/repositories', () => ({
  editionRepository: {
    getByProject: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    duplicate: vi.fn(),
  },
  scriptPageRepository: {
    getByEdition: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    duplicate: vi.fn(),
    reorder: vi.fn(),
    renumber: vi.fn(),
  },
  panelRepository: {
    getByPage: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    duplicate: vi.fn(),
    reorder: vi.fn(),
    renumber: vi.fn(),
    addDialogue: vi.fn(),
    updateDialogue: vi.fn(),
    removeDialogue: vi.fn(),
  },
}))

// Mock triggerGlobalSync
vi.mock('@/lib/sync/globalSyncTrigger', () => ({
  triggerGlobalSync: vi.fn(),
}))

// Mock syncManifest
vi.mock('@/lib/sync/syncManifest', () => ({
  syncManifest: {
    recordDeletion: vi.fn(),
  },
}))

// Import mocked modules after mock setup
import { editionRepository, scriptPageRepository, panelRepository } from '@/lib/db/repositories'
import { triggerGlobalSync } from '@/lib/sync/globalSyncTrigger'
import { syncManifest } from '@/lib/sync/syncManifest'

// Helper to create a mock edition
function createMockEdition(overrides: Partial<Edition> = {}): Edition {
  const now = new Date()
  return {
    id: `edition-${Math.random().toString(36).slice(2)}`,
    projectId: 'project-1',
    title: 'Test Edition',
    status: 'draft',
    metadata: {},
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// Helper to create a mock page
function createMockPage(overrides: Partial<ScriptPage> = {}): ScriptPage {
  const now = new Date()
  return {
    id: `page-${Math.random().toString(36).slice(2)}`,
    editionId: 'edition-1',
    pageNumber: 1,
    status: 'draft',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// Helper to create a mock panel
function createMockPanel(overrides: Partial<Panel> = {}): Panel {
  const now = new Date()
  return {
    id: `panel-${Math.random().toString(36).slice(2)}`,
    pageId: 'page-1',
    panelNumber: 1,
    dialogues: [],
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// Helper to create a mock dialogue
function createMockDialogue(overrides: Partial<PanelDialogue> = {}): PanelDialogue {
  return {
    id: `dialogue-${Math.random().toString(36).slice(2)}`,
    characterName: 'Test Character',
    type: 'speech',
    text: 'Test dialogue',
    sortOrder: 0,
    ...overrides,
  }
}

// Reset Zustand store state before each test
function resetStore() {
  useEditionStore.setState({
    editions: [],
    currentEdition: null,
    pages: [],
    currentPage: null,
    panels: [],
    isLoading: false,
  })
}

describe('EditionStore', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  // ===========================================
  // Initial State (ES-001)
  // ===========================================
  describe('Initial State', () => {
    it('ES-001: should initialize with empty editions[], null currentEdition, empty pages[], null currentPage, empty panels[], isLoading=false', () => {
      const state = useEditionStore.getState()

      expect(state.editions).toEqual([])
      expect(state.currentEdition).toBeNull()
      expect(state.pages).toEqual([])
      expect(state.currentPage).toBeNull()
      expect(state.panels).toEqual([])
      expect(state.isLoading).toBe(false)
    })
  })

  // ===========================================
  // loadEditions (ES-002 to ES-004)
  // ===========================================
  describe('loadEditions', () => {
    it('ES-002: should fetch editions by projectId and update state', async () => {
      const mockEditions = [
        createMockEdition({ id: 'e1', title: 'Issue 1' }),
        createMockEdition({ id: 'e2', title: 'Issue 2' }),
      ]
      vi.mocked(editionRepository.getByProject).mockResolvedValue(mockEditions)

      await useEditionStore.getState().loadEditions('project-1')

      const state = useEditionStore.getState()
      expect(state.editions).toHaveLength(2)
      expect(state.editions[0].title).toBe('Issue 1')
      expect(editionRepository.getByProject).toHaveBeenCalledWith('project-1')
    })

    it('ES-003: should set isLoading=true before fetch, false after', async () => {
      const loadingStates: boolean[] = []

      vi.mocked(editionRepository.getByProject).mockImplementation(async () => {
        loadingStates.push(useEditionStore.getState().isLoading)
        return []
      })

      await useEditionStore.getState().loadEditions('project-1')

      expect(loadingStates[0]).toBe(true)
      expect(useEditionStore.getState().isLoading).toBe(false)
    })

    it('ES-004: should set isLoading=false on error, log error, not throw', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(editionRepository.getByProject).mockRejectedValue(new Error('DB Error'))

      await expect(useEditionStore.getState().loadEditions('project-1')).resolves.not.toThrow()

      expect(useEditionStore.getState().isLoading).toBe(false)
      expect(consoleError).toHaveBeenCalledWith('Failed to load editions:', expect.any(Error))

      consoleError.mockRestore()
    })
  })

  // ===========================================
  // createEdition (ES-005 to ES-007)
  // ===========================================
  describe('createEdition', () => {
    it('ES-005: should add edition to end of editions array', async () => {
      const existingEdition = createMockEdition({ id: 'existing', title: 'Existing' })
      useEditionStore.setState({ editions: [existingEdition] })

      const newEdition = createMockEdition({ id: 'new', title: 'New Edition' })
      vi.mocked(editionRepository.create).mockResolvedValue(newEdition)

      await useEditionStore.getState().createEdition('project-1', 'New Edition')

      const state = useEditionStore.getState()
      expect(state.editions).toHaveLength(2)
      expect(state.editions[0].title).toBe('Existing') // First position
      expect(state.editions[1].title).toBe('New Edition') // End position
    })

    it('ES-006: should pass issueNumber, volume, synopsis to repository', async () => {
      const newEdition = createMockEdition({ issueNumber: 5, volume: 2 })
      vi.mocked(editionRepository.create).mockResolvedValue(newEdition)

      await useEditionStore.getState().createEdition('project-1', 'Test', {
        issueNumber: 5,
        volume: 2,
        synopsis: 'A great story',
      })

      expect(editionRepository.create).toHaveBeenCalledWith('project-1', 'Test', {
        issueNumber: 5,
        volume: 2,
        synopsis: 'A great story',
      })
    })

    it('ES-007: should call triggerGlobalSync after creation', async () => {
      const newEdition = createMockEdition()
      vi.mocked(editionRepository.create).mockResolvedValue(newEdition)

      await useEditionStore.getState().createEdition('project-1', 'Test')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // selectEdition (ES-008 to ES-011)
  // ===========================================
  describe('selectEdition', () => {
    it('ES-008: should set currentEdition and return true', async () => {
      const mockEdition = createMockEdition({ id: 'e1', title: 'Selected' })
      vi.mocked(editionRepository.getById).mockResolvedValue(mockEdition)
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])

      const result = await useEditionStore.getState().selectEdition('e1')

      expect(result).toBe(true)
      expect(useEditionStore.getState().currentEdition?.id).toBe('e1')
      expect(useEditionStore.getState().currentEdition?.title).toBe('Selected')
    })

    it('ES-009: should set currentPage to null and panels to []', async () => {
      // Set up existing page and panels
      const existingPage = createMockPage({ id: 'p1' })
      const existingPanels = [createMockPanel({ id: 'panel1' })]
      useEditionStore.setState({
        currentPage: existingPage,
        panels: existingPanels,
      })

      const mockEdition = createMockEdition({ id: 'e1' })
      vi.mocked(editionRepository.getById).mockResolvedValue(mockEdition)
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])

      await useEditionStore.getState().selectEdition('e1')

      expect(useEditionStore.getState().currentPage).toBeNull()
      expect(useEditionStore.getState().panels).toEqual([])
    })

    it('ES-010: should call loadPages after successful selection', async () => {
      const mockEdition = createMockEdition({ id: 'e1' })
      const mockPages = [createMockPage({ id: 'p1', editionId: 'e1' })]
      vi.mocked(editionRepository.getById).mockResolvedValue(mockEdition)
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue(mockPages)

      await useEditionStore.getState().selectEdition('e1')

      expect(scriptPageRepository.getByEdition).toHaveBeenCalledWith('e1')
      expect(useEditionStore.getState().pages).toHaveLength(1)
    })

    it('ES-011: should return false for non-existent ID', async () => {
      vi.mocked(editionRepository.getById).mockResolvedValue(undefined)

      const result = await useEditionStore.getState().selectEdition('non-existent')

      expect(result).toBe(false)
      expect(useEditionStore.getState().currentEdition).toBeNull()
    })
  })

  // ===========================================
  // updateEdition (ES-012 to ES-014)
  // ===========================================
  describe('updateEdition', () => {
    it('ES-012: should update edition in editions array', async () => {
      const edition = createMockEdition({ id: 'e1', title: 'Old Title' })
      useEditionStore.setState({ editions: [edition] })
      vi.mocked(editionRepository.update).mockResolvedValue()

      await useEditionStore.getState().updateEdition('e1', { title: 'New Title' })

      expect(useEditionStore.getState().editions[0].title).toBe('New Title')
    })

    it('ES-013: should update currentEdition if updating current', async () => {
      const edition = createMockEdition({ id: 'e1', title: 'Old Title' })
      useEditionStore.setState({ editions: [edition], currentEdition: edition })
      vi.mocked(editionRepository.update).mockResolvedValue()

      await useEditionStore.getState().updateEdition('e1', { title: 'New Title' })

      expect(useEditionStore.getState().currentEdition?.title).toBe('New Title')
    })

    it('ES-014: should call triggerGlobalSync after update', async () => {
      const edition = createMockEdition({ id: 'e1' })
      useEditionStore.setState({ editions: [edition] })
      vi.mocked(editionRepository.update).mockResolvedValue()

      await useEditionStore.getState().updateEdition('e1', { title: 'Updated' })

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should not update currentEdition if updating different edition', async () => {
      const edition1 = createMockEdition({ id: 'e1', title: 'Edition 1' })
      const edition2 = createMockEdition({ id: 'e2', title: 'Edition 2' })
      useEditionStore.setState({ editions: [edition1, edition2], currentEdition: edition1 })
      vi.mocked(editionRepository.update).mockResolvedValue()

      await useEditionStore.getState().updateEdition('e2', { title: 'Updated' })

      expect(useEditionStore.getState().currentEdition?.title).toBe('Edition 1')
      expect(useEditionStore.getState().editions[1].title).toBe('Updated')
    })
  })

  // ===========================================
  // updateEditionStatus (ES-015 to ES-017)
  // ===========================================
  describe('updateEditionStatus', () => {
    it('ES-015: should update status in editions array', async () => {
      const edition = createMockEdition({ id: 'e1', status: 'draft' })
      useEditionStore.setState({ editions: [edition] })
      vi.mocked(editionRepository.updateStatus).mockResolvedValue()

      await useEditionStore.getState().updateEditionStatus('e1', 'in-progress')

      expect(useEditionStore.getState().editions[0].status).toBe('in-progress')
    })

    it('ES-016: should update currentEdition if updating current', async () => {
      const edition = createMockEdition({ id: 'e1', status: 'draft' })
      useEditionStore.setState({ editions: [edition], currentEdition: edition })
      vi.mocked(editionRepository.updateStatus).mockResolvedValue()

      await useEditionStore.getState().updateEditionStatus('e1', 'complete')

      expect(useEditionStore.getState().currentEdition?.status).toBe('complete')
    })

    it('ES-017: should call triggerGlobalSync after update', async () => {
      const edition = createMockEdition({ id: 'e1' })
      useEditionStore.setState({ editions: [edition] })
      vi.mocked(editionRepository.updateStatus).mockResolvedValue()

      await useEditionStore.getState().updateEditionStatus('e1', 'review')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // deleteEdition (ES-018 to ES-021)
  // ===========================================
  describe('deleteEdition', () => {
    it('ES-018: should remove edition from editions array', async () => {
      const edition1 = createMockEdition({ id: 'e1', title: 'To Delete' })
      const edition2 = createMockEdition({ id: 'e2', title: 'To Keep' })
      useEditionStore.setState({ editions: [edition1, edition2] })

      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])
      vi.mocked(editionRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()

      await useEditionStore.getState().deleteEdition('e1')

      const state = useEditionStore.getState()
      expect(state.editions).toHaveLength(1)
      expect(state.editions[0].title).toBe('To Keep')
    })

    it('ES-019: should clear currentEdition, pages, currentPage, panels if deleting current', async () => {
      const edition = createMockEdition({ id: 'e1' })
      const page = createMockPage({ id: 'p1', editionId: 'e1' })
      const panel = createMockPanel({ id: 'panel1', pageId: 'p1' })
      useEditionStore.setState({
        editions: [edition],
        currentEdition: edition,
        pages: [page],
        currentPage: page,
        panels: [panel],
      })

      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([page])
      vi.mocked(panelRepository.getByPage).mockResolvedValue([panel])
      vi.mocked(editionRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()

      await useEditionStore.getState().deleteEdition('e1')

      const state = useEditionStore.getState()
      expect(state.currentEdition).toBeNull()
      expect(state.pages).toEqual([])
      expect(state.currentPage).toBeNull()
      expect(state.panels).toEqual([])
    })

    it('ES-020: should call syncManifest.recordDeletion for edition, pages, and panels', async () => {
      const edition = createMockEdition({ id: 'e1' })
      const page = createMockPage({ id: 'p1', editionId: 'e1' })
      const panel = createMockPanel({ id: 'panel1', pageId: 'p1' })
      useEditionStore.setState({ editions: [edition] })

      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([page])
      vi.mocked(panelRepository.getByPage).mockResolvedValue([panel])
      vi.mocked(editionRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()

      await useEditionStore.getState().deleteEdition('e1')

      // Should record deletions in order: panels first, then pages, then edition
      expect(syncManifest.recordDeletion).toHaveBeenCalledWith('panel1', 'panel')
      expect(syncManifest.recordDeletion).toHaveBeenCalledWith('p1', 'scriptPage')
      expect(syncManifest.recordDeletion).toHaveBeenCalledWith('e1', 'edition')
      expect(syncManifest.recordDeletion).toHaveBeenCalledTimes(3)
    })

    it('ES-021: should call triggerGlobalSync after delete', async () => {
      const edition = createMockEdition({ id: 'e1' })
      useEditionStore.setState({ editions: [edition] })

      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])
      vi.mocked(editionRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()

      await useEditionStore.getState().deleteEdition('e1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should not clear state if deleting different edition', async () => {
      const edition1 = createMockEdition({ id: 'e1' })
      const edition2 = createMockEdition({ id: 'e2' })
      const page = createMockPage({ id: 'p1', editionId: 'e1' })
      useEditionStore.setState({
        editions: [edition1, edition2],
        currentEdition: edition1,
        pages: [page],
      })

      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])
      vi.mocked(editionRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()

      await useEditionStore.getState().deleteEdition('e2')

      const state = useEditionStore.getState()
      expect(state.currentEdition?.id).toBe('e1')
      expect(state.pages).toHaveLength(1)
    })
  })

  // ===========================================
  // duplicateEdition (ES-022 to ES-024)
  // ===========================================
  describe('duplicateEdition', () => {
    it('ES-022: should add duplicated edition to editions array', async () => {
      const original = createMockEdition({ id: 'e1', title: 'Original' })
      useEditionStore.setState({ editions: [original] })

      const duplicate = createMockEdition({ id: 'e2', title: 'Original (Copy)' })
      vi.mocked(editionRepository.duplicate).mockResolvedValue(duplicate)

      const result = await useEditionStore.getState().duplicateEdition('e1', 'Original (Copy)')

      expect(result).not.toBeNull()
      expect(result?.title).toBe('Original (Copy)')
      expect(useEditionStore.getState().editions).toHaveLength(2)
    })

    it('ES-023: should return null if original not found', async () => {
      vi.mocked(editionRepository.duplicate).mockResolvedValue(undefined)

      const result = await useEditionStore.getState().duplicateEdition('non-existent', 'Copy')

      expect(result).toBeNull()
    })

    it('ES-024: should call triggerGlobalSync after duplication', async () => {
      const duplicate = createMockEdition({ id: 'e2' })
      vi.mocked(editionRepository.duplicate).mockResolvedValue(duplicate)

      await useEditionStore.getState().duplicateEdition('e1', 'Copy')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should not call triggerGlobalSync if duplication fails', async () => {
      vi.mocked(editionRepository.duplicate).mockResolvedValue(undefined)

      await useEditionStore.getState().duplicateEdition('non-existent', 'Copy')

      expect(triggerGlobalSync).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // loadPages (ES-025)
  // ===========================================
  describe('loadPages', () => {
    it('ES-025: should fetch pages by editionId and update state', async () => {
      const mockPages = [
        createMockPage({ id: 'p1', pageNumber: 1 }),
        createMockPage({ id: 'p2', pageNumber: 2 }),
      ]
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue(mockPages)

      await useEditionStore.getState().loadPages('e1')

      const state = useEditionStore.getState()
      expect(state.pages).toHaveLength(2)
      expect(state.pages[0].pageNumber).toBe(1)
      expect(scriptPageRepository.getByEdition).toHaveBeenCalledWith('e1')
    })
  })

  // ===========================================
  // createPage (ES-026 to ES-028)
  // ===========================================
  describe('createPage', () => {
    it('ES-026: should add page to end of pages array', async () => {
      const edition = createMockEdition({ id: 'e1' })
      const existingPage = createMockPage({ id: 'p1', pageNumber: 1 })
      useEditionStore.setState({ currentEdition: edition, pages: [existingPage] })

      const newPage = createMockPage({ id: 'p2', pageNumber: 2 })
      vi.mocked(scriptPageRepository.create).mockResolvedValue(newPage)

      await useEditionStore.getState().createPage({ title: 'New Page' })

      const state = useEditionStore.getState()
      expect(state.pages).toHaveLength(2)
      expect(state.pages[1].id).toBe('p2')
    })

    it('ES-027: should return null if no currentEdition', async () => {
      useEditionStore.setState({ currentEdition: null })

      const result = await useEditionStore.getState().createPage()

      expect(result).toBeNull()
      expect(scriptPageRepository.create).not.toHaveBeenCalled()
    })

    it('ES-028: should call triggerGlobalSync after creation', async () => {
      const edition = createMockEdition({ id: 'e1' })
      useEditionStore.setState({ currentEdition: edition, pages: [] })

      const newPage = createMockPage()
      vi.mocked(scriptPageRepository.create).mockResolvedValue(newPage)

      await useEditionStore.getState().createPage()

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should pass options to repository', async () => {
      const edition = createMockEdition({ id: 'e1' })
      useEditionStore.setState({ currentEdition: edition, pages: [] })

      const newPage = createMockPage()
      vi.mocked(scriptPageRepository.create).mockResolvedValue(newPage)

      await useEditionStore.getState().createPage({
        title: 'Test Title',
        goal: 'Test Goal',
        setting: 'Test Setting',
      })

      expect(scriptPageRepository.create).toHaveBeenCalledWith('e1', {
        title: 'Test Title',
        goal: 'Test Goal',
        setting: 'Test Setting',
      })
    })
  })

  // ===========================================
  // selectPage (ES-029 to ES-031)
  // ===========================================
  describe('selectPage', () => {
    it('ES-029: should set currentPage and return true', async () => {
      const mockPage = createMockPage({ id: 'p1', title: 'Selected Page' })
      vi.mocked(scriptPageRepository.getById).mockResolvedValue(mockPage)
      vi.mocked(panelRepository.getByPage).mockResolvedValue([])

      const result = await useEditionStore.getState().selectPage('p1')

      expect(result).toBe(true)
      expect(useEditionStore.getState().currentPage?.id).toBe('p1')
    })

    it('ES-030: should call loadPanels after successful selection', async () => {
      const mockPage = createMockPage({ id: 'p1' })
      const mockPanels = [createMockPanel({ id: 'panel1', pageId: 'p1' })]
      vi.mocked(scriptPageRepository.getById).mockResolvedValue(mockPage)
      vi.mocked(panelRepository.getByPage).mockResolvedValue(mockPanels)

      await useEditionStore.getState().selectPage('p1')

      expect(panelRepository.getByPage).toHaveBeenCalledWith('p1')
      expect(useEditionStore.getState().panels).toHaveLength(1)
    })

    it('ES-031: should return false for non-existent ID', async () => {
      vi.mocked(scriptPageRepository.getById).mockResolvedValue(undefined)

      const result = await useEditionStore.getState().selectPage('non-existent')

      expect(result).toBe(false)
      expect(useEditionStore.getState().currentPage).toBeNull()
    })
  })

  // ===========================================
  // updatePage (ES-032 to ES-034)
  // ===========================================
  describe('updatePage', () => {
    it('ES-032: should update page in pages array', async () => {
      const page = createMockPage({ id: 'p1', title: 'Old Title' })
      useEditionStore.setState({ pages: [page] })
      vi.mocked(scriptPageRepository.update).mockResolvedValue()

      await useEditionStore.getState().updatePage('p1', { title: 'New Title' })

      expect(useEditionStore.getState().pages[0].title).toBe('New Title')
    })

    it('ES-033: should update currentPage if updating current', async () => {
      const page = createMockPage({ id: 'p1', title: 'Old Title' })
      useEditionStore.setState({ pages: [page], currentPage: page })
      vi.mocked(scriptPageRepository.update).mockResolvedValue()

      await useEditionStore.getState().updatePage('p1', { title: 'New Title' })

      expect(useEditionStore.getState().currentPage?.title).toBe('New Title')
    })

    it('ES-034: should call triggerGlobalSync after update', async () => {
      const page = createMockPage({ id: 'p1' })
      useEditionStore.setState({ pages: [page] })
      vi.mocked(scriptPageRepository.update).mockResolvedValue()

      await useEditionStore.getState().updatePage('p1', { title: 'Updated' })

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // updatePageStatus (ES-035 to ES-037)
  // ===========================================
  describe('updatePageStatus', () => {
    it('ES-035: should update status in pages array', async () => {
      const page = createMockPage({ id: 'p1', status: 'draft' })
      useEditionStore.setState({ pages: [page] })
      vi.mocked(scriptPageRepository.updateStatus).mockResolvedValue()

      await useEditionStore.getState().updatePageStatus('p1', 'scripted')

      expect(useEditionStore.getState().pages[0].status).toBe('scripted')
    })

    it('ES-036: should update currentPage if updating current', async () => {
      const page = createMockPage({ id: 'p1', status: 'draft' })
      useEditionStore.setState({ pages: [page], currentPage: page })
      vi.mocked(scriptPageRepository.updateStatus).mockResolvedValue()

      await useEditionStore.getState().updatePageStatus('p1', 'approved')

      expect(useEditionStore.getState().currentPage?.status).toBe('approved')
    })

    it('ES-037: should call triggerGlobalSync after update', async () => {
      const page = createMockPage({ id: 'p1' })
      useEditionStore.setState({ pages: [page] })
      vi.mocked(scriptPageRepository.updateStatus).mockResolvedValue()

      await useEditionStore.getState().updatePageStatus('p1', 'review')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // deletePage (ES-038 to ES-041)
  // ===========================================
  describe('deletePage', () => {
    it('ES-038: should remove page, renumber remaining, and reload', async () => {
      const edition = createMockEdition({ id: 'e1' })
      const page1 = createMockPage({ id: 'p1', pageNumber: 1, editionId: 'e1' })
      const page2 = createMockPage({ id: 'p2', pageNumber: 2, editionId: 'e1' })
      useEditionStore.setState({
        currentEdition: edition,
        pages: [page1, page2],
      })

      // After deletion, p2 becomes p1 (renumbered)
      const renumberedPages = [createMockPage({ id: 'p2', pageNumber: 1, editionId: 'e1' })]

      vi.mocked(panelRepository.getByPage).mockResolvedValue([])
      vi.mocked(scriptPageRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()
      vi.mocked(scriptPageRepository.renumber).mockResolvedValue()
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue(renumberedPages)

      await useEditionStore.getState().deletePage('p1')

      expect(scriptPageRepository.renumber).toHaveBeenCalledWith('e1')
      expect(scriptPageRepository.getByEdition).toHaveBeenCalledWith('e1')
      expect(useEditionStore.getState().pages).toHaveLength(1)
    })

    it('ES-039: should clear currentPage and panels if deleting current', async () => {
      const edition = createMockEdition({ id: 'e1' })
      const page = createMockPage({ id: 'p1', editionId: 'e1' })
      const panel = createMockPanel({ id: 'panel1', pageId: 'p1' })
      useEditionStore.setState({
        currentEdition: edition,
        pages: [page],
        currentPage: page,
        panels: [panel],
      })

      vi.mocked(panelRepository.getByPage).mockResolvedValue([panel])
      vi.mocked(scriptPageRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()
      vi.mocked(scriptPageRepository.renumber).mockResolvedValue()
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])

      await useEditionStore.getState().deletePage('p1')

      expect(useEditionStore.getState().currentPage).toBeNull()
      expect(useEditionStore.getState().panels).toEqual([])
    })

    it('ES-040: should call syncManifest.recordDeletion for page and its panels', async () => {
      const edition = createMockEdition({ id: 'e1' })
      const page = createMockPage({ id: 'p1', editionId: 'e1' })
      const panel = createMockPanel({ id: 'panel1', pageId: 'p1' })
      useEditionStore.setState({ currentEdition: edition, pages: [page] })

      vi.mocked(panelRepository.getByPage).mockResolvedValue([panel])
      vi.mocked(scriptPageRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()
      vi.mocked(scriptPageRepository.renumber).mockResolvedValue()
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])

      await useEditionStore.getState().deletePage('p1')

      expect(syncManifest.recordDeletion).toHaveBeenCalledWith('panel1', 'panel')
      expect(syncManifest.recordDeletion).toHaveBeenCalledWith('p1', 'scriptPage')
    })

    it('ES-041: should call triggerGlobalSync after delete', async () => {
      const edition = createMockEdition({ id: 'e1' })
      const page = createMockPage({ id: 'p1', editionId: 'e1' })
      useEditionStore.setState({ currentEdition: edition, pages: [page] })

      vi.mocked(panelRepository.getByPage).mockResolvedValue([])
      vi.mocked(scriptPageRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()
      vi.mocked(scriptPageRepository.renumber).mockResolvedValue()
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])

      await useEditionStore.getState().deletePage('p1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // duplicatePage (ES-042 to ES-044)
  // ===========================================
  describe('duplicatePage', () => {
    it('ES-042: should add duplicated page to pages array', async () => {
      const original = createMockPage({ id: 'p1', title: 'Original' })
      useEditionStore.setState({ pages: [original] })

      const duplicate = createMockPage({ id: 'p2', title: 'Original (Copy)' })
      vi.mocked(scriptPageRepository.duplicate).mockResolvedValue(duplicate)

      const result = await useEditionStore.getState().duplicatePage('p1')

      expect(result).not.toBeNull()
      expect(useEditionStore.getState().pages).toHaveLength(2)
    })

    it('ES-043: should return null if original not found', async () => {
      vi.mocked(scriptPageRepository.duplicate).mockResolvedValue(undefined)

      const result = await useEditionStore.getState().duplicatePage('non-existent')

      expect(result).toBeNull()
    })

    it('ES-044: should call triggerGlobalSync after duplication', async () => {
      const duplicate = createMockPage({ id: 'p2' })
      vi.mocked(scriptPageRepository.duplicate).mockResolvedValue(duplicate)

      await useEditionStore.getState().duplicatePage('p1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // reorderPages (ES-045 to ES-047)
  // ===========================================
  describe('reorderPages', () => {
    it('ES-045: should reorder, renumber, and reload pages', async () => {
      const edition = createMockEdition({ id: 'e1' })
      const page1 = createMockPage({ id: 'p1', pageNumber: 1, sortOrder: 0 })
      const page2 = createMockPage({ id: 'p2', pageNumber: 2, sortOrder: 1 })
      useEditionStore.setState({ currentEdition: edition, pages: [page1, page2] })

      // After reorder: p2 becomes first, p1 becomes second
      const reorderedPages = [
        createMockPage({ id: 'p2', pageNumber: 1, sortOrder: 0 }),
        createMockPage({ id: 'p1', pageNumber: 2, sortOrder: 1 }),
      ]

      vi.mocked(scriptPageRepository.reorder).mockResolvedValue()
      vi.mocked(scriptPageRepository.renumber).mockResolvedValue()
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue(reorderedPages)

      await useEditionStore.getState().reorderPages(['p2', 'p1'])

      expect(scriptPageRepository.reorder).toHaveBeenCalledWith('p2', 0)
      expect(scriptPageRepository.reorder).toHaveBeenCalledWith('p1', 1)
      expect(scriptPageRepository.renumber).toHaveBeenCalledWith('e1')
      expect(useEditionStore.getState().pages[0].id).toBe('p2')
    })

    it('ES-046: should do nothing if no currentEdition', async () => {
      useEditionStore.setState({ currentEdition: null })

      await useEditionStore.getState().reorderPages(['p1', 'p2'])

      expect(scriptPageRepository.reorder).not.toHaveBeenCalled()
    })

    it('ES-047: should call triggerGlobalSync after reorder', async () => {
      const edition = createMockEdition({ id: 'e1' })
      useEditionStore.setState({ currentEdition: edition, pages: [] })

      vi.mocked(scriptPageRepository.reorder).mockResolvedValue()
      vi.mocked(scriptPageRepository.renumber).mockResolvedValue()
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])

      await useEditionStore.getState().reorderPages([])

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // loadPanels (ES-048)
  // ===========================================
  describe('loadPanels', () => {
    it('ES-048: should fetch panels by pageId and update state', async () => {
      const mockPanels = [
        createMockPanel({ id: 'panel1', panelNumber: 1 }),
        createMockPanel({ id: 'panel2', panelNumber: 2 }),
      ]
      vi.mocked(panelRepository.getByPage).mockResolvedValue(mockPanels)

      await useEditionStore.getState().loadPanels('p1')

      const state = useEditionStore.getState()
      expect(state.panels).toHaveLength(2)
      expect(state.panels[0].panelNumber).toBe(1)
      expect(panelRepository.getByPage).toHaveBeenCalledWith('p1')
    })
  })

  // ===========================================
  // createPanel (ES-049 to ES-051)
  // ===========================================
  describe('createPanel', () => {
    it('ES-049: should add panel to end of panels array', async () => {
      const page = createMockPage({ id: 'p1' })
      const existingPanel = createMockPanel({ id: 'panel1', panelNumber: 1 })
      useEditionStore.setState({ currentPage: page, panels: [existingPanel] })

      const newPanel = createMockPanel({ id: 'panel2', panelNumber: 2 })
      vi.mocked(panelRepository.create).mockResolvedValue(newPanel)

      await useEditionStore.getState().createPanel({ description: 'Action scene' })

      const state = useEditionStore.getState()
      expect(state.panels).toHaveLength(2)
      expect(state.panels[1].id).toBe('panel2')
    })

    it('ES-050: should return null if no currentPage', async () => {
      useEditionStore.setState({ currentPage: null })

      const result = await useEditionStore.getState().createPanel()

      expect(result).toBeNull()
      expect(panelRepository.create).not.toHaveBeenCalled()
    })

    it('ES-051: should call triggerGlobalSync after creation', async () => {
      const page = createMockPage({ id: 'p1' })
      useEditionStore.setState({ currentPage: page, panels: [] })

      const newPanel = createMockPanel()
      vi.mocked(panelRepository.create).mockResolvedValue(newPanel)

      await useEditionStore.getState().createPanel()

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should pass options to repository', async () => {
      const page = createMockPage({ id: 'p1' })
      useEditionStore.setState({ currentPage: page, panels: [] })

      const newPanel = createMockPanel()
      vi.mocked(panelRepository.create).mockResolvedValue(newPanel)

      await useEditionStore.getState().createPanel({
        description: 'Wide shot',
        cameraAngle: 'bird-eye',
      })

      expect(panelRepository.create).toHaveBeenCalledWith('p1', {
        description: 'Wide shot',
        cameraAngle: 'bird-eye',
      })
    })
  })

  // ===========================================
  // updatePanel (ES-052 to ES-053)
  // ===========================================
  describe('updatePanel', () => {
    it('ES-052: should update panel in panels array', async () => {
      const panel = createMockPanel({ id: 'panel1', description: 'Old' })
      useEditionStore.setState({ panels: [panel] })
      vi.mocked(panelRepository.update).mockResolvedValue()

      await useEditionStore.getState().updatePanel('panel1', { description: 'New' })

      expect(useEditionStore.getState().panels[0].description).toBe('New')
    })

    it('ES-053: should call triggerGlobalSync after update', async () => {
      const panel = createMockPanel({ id: 'panel1' })
      useEditionStore.setState({ panels: [panel] })
      vi.mocked(panelRepository.update).mockResolvedValue()

      await useEditionStore.getState().updatePanel('panel1', { description: 'Updated' })

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // deletePanel (ES-054 to ES-056)
  // ===========================================
  describe('deletePanel', () => {
    it('ES-054: should remove panel, renumber remaining, and reload', async () => {
      const page = createMockPage({ id: 'p1' })
      const panel1 = createMockPanel({ id: 'panel1', panelNumber: 1, pageId: 'p1' })
      const panel2 = createMockPanel({ id: 'panel2', panelNumber: 2, pageId: 'p1' })
      useEditionStore.setState({
        currentPage: page,
        panels: [panel1, panel2],
      })

      // After deletion, panel2 becomes panel1 (renumbered)
      const renumberedPanels = [createMockPanel({ id: 'panel2', panelNumber: 1, pageId: 'p1' })]

      vi.mocked(panelRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()
      vi.mocked(panelRepository.renumber).mockResolvedValue()
      vi.mocked(panelRepository.getByPage).mockResolvedValue(renumberedPanels)

      await useEditionStore.getState().deletePanel('panel1')

      expect(panelRepository.renumber).toHaveBeenCalledWith('p1')
      expect(panelRepository.getByPage).toHaveBeenCalledWith('p1')
      expect(useEditionStore.getState().panels).toHaveLength(1)
    })

    it('ES-055: should call syncManifest.recordDeletion for panel', async () => {
      const page = createMockPage({ id: 'p1' })
      const panel = createMockPanel({ id: 'panel1', pageId: 'p1' })
      useEditionStore.setState({ currentPage: page, panels: [panel] })

      vi.mocked(panelRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()
      vi.mocked(panelRepository.renumber).mockResolvedValue()
      vi.mocked(panelRepository.getByPage).mockResolvedValue([])

      await useEditionStore.getState().deletePanel('panel1')

      expect(syncManifest.recordDeletion).toHaveBeenCalledWith('panel1', 'panel')
    })

    it('ES-056: should call triggerGlobalSync after delete', async () => {
      const page = createMockPage({ id: 'p1' })
      const panel = createMockPanel({ id: 'panel1', pageId: 'p1' })
      useEditionStore.setState({ currentPage: page, panels: [panel] })

      vi.mocked(panelRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()
      vi.mocked(panelRepository.renumber).mockResolvedValue()
      vi.mocked(panelRepository.getByPage).mockResolvedValue([])

      await useEditionStore.getState().deletePanel('panel1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // duplicatePanel (ES-057 to ES-059)
  // ===========================================
  describe('duplicatePanel', () => {
    it('ES-057: should add duplicated panel to panels array', async () => {
      const original = createMockPanel({ id: 'panel1', description: 'Original' })
      useEditionStore.setState({ panels: [original] })

      const duplicate = createMockPanel({ id: 'panel2', description: 'Original' })
      vi.mocked(panelRepository.duplicate).mockResolvedValue(duplicate)

      const result = await useEditionStore.getState().duplicatePanel('panel1')

      expect(result).not.toBeNull()
      expect(useEditionStore.getState().panels).toHaveLength(2)
    })

    it('ES-058: should return null if original not found', async () => {
      vi.mocked(panelRepository.duplicate).mockResolvedValue(undefined)

      const result = await useEditionStore.getState().duplicatePanel('non-existent')

      expect(result).toBeNull()
    })

    it('ES-059: should call triggerGlobalSync after duplication', async () => {
      const duplicate = createMockPanel({ id: 'panel2' })
      vi.mocked(panelRepository.duplicate).mockResolvedValue(duplicate)

      await useEditionStore.getState().duplicatePanel('panel1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // reorderPanels (ES-060 to ES-062)
  // ===========================================
  describe('reorderPanels', () => {
    it('ES-060: should reorder, renumber, and reload panels', async () => {
      const page = createMockPage({ id: 'p1' })
      const panel1 = createMockPanel({ id: 'panel1', panelNumber: 1, sortOrder: 0 })
      const panel2 = createMockPanel({ id: 'panel2', panelNumber: 2, sortOrder: 1 })
      useEditionStore.setState({ currentPage: page, panels: [panel1, panel2] })

      // After reorder: panel2 becomes first, panel1 becomes second
      const reorderedPanels = [
        createMockPanel({ id: 'panel2', panelNumber: 1, sortOrder: 0 }),
        createMockPanel({ id: 'panel1', panelNumber: 2, sortOrder: 1 }),
      ]

      vi.mocked(panelRepository.reorder).mockResolvedValue()
      vi.mocked(panelRepository.renumber).mockResolvedValue()
      vi.mocked(panelRepository.getByPage).mockResolvedValue(reorderedPanels)

      await useEditionStore.getState().reorderPanels(['panel2', 'panel1'])

      expect(panelRepository.reorder).toHaveBeenCalledWith('panel2', 0)
      expect(panelRepository.reorder).toHaveBeenCalledWith('panel1', 1)
      expect(panelRepository.renumber).toHaveBeenCalledWith('p1')
      expect(useEditionStore.getState().panels[0].id).toBe('panel2')
    })

    it('ES-061: should do nothing if no currentPage', async () => {
      useEditionStore.setState({ currentPage: null })

      await useEditionStore.getState().reorderPanels(['panel1', 'panel2'])

      expect(panelRepository.reorder).not.toHaveBeenCalled()
    })

    it('ES-062: should call triggerGlobalSync after reorder', async () => {
      const page = createMockPage({ id: 'p1' })
      useEditionStore.setState({ currentPage: page, panels: [] })

      vi.mocked(panelRepository.reorder).mockResolvedValue()
      vi.mocked(panelRepository.renumber).mockResolvedValue()
      vi.mocked(panelRepository.getByPage).mockResolvedValue([])

      await useEditionStore.getState().reorderPanels([])

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // addDialogue (ES-063 to ES-065)
  // ===========================================
  describe('addDialogue', () => {
    it('ES-063: should refresh panel in panels array', async () => {
      const dialogue = createMockDialogue({ id: 'd1', text: 'Hello' })
      const panel = createMockPanel({ id: 'panel1', dialogues: [] })
      const updatedPanel = createMockPanel({ id: 'panel1', dialogues: [dialogue] })
      useEditionStore.setState({ panels: [panel] })

      vi.mocked(panelRepository.addDialogue).mockResolvedValue(dialogue)
      vi.mocked(panelRepository.getById).mockResolvedValue(updatedPanel)

      await useEditionStore.getState().addDialogue('panel1', {
        characterName: 'Hero',
        text: 'Hello',
      })

      expect(useEditionStore.getState().panels[0].dialogues).toHaveLength(1)
    })

    it('ES-064: should return null and log error on failure', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(panelRepository.addDialogue).mockRejectedValue(new Error('DB Error'))

      const result = await useEditionStore.getState().addDialogue('panel1', {
        characterName: 'Hero',
        text: 'Hello',
      })

      expect(result).toBeNull()
      expect(consoleError).toHaveBeenCalledWith('Failed to add dialogue:', expect.any(Error))

      consoleError.mockRestore()
    })

    it('ES-065: should call triggerGlobalSync after addition', async () => {
      const dialogue = createMockDialogue()
      const panel = createMockPanel({ id: 'panel1', dialogues: [dialogue] })
      useEditionStore.setState({ panels: [panel] })

      vi.mocked(panelRepository.addDialogue).mockResolvedValue(dialogue)
      vi.mocked(panelRepository.getById).mockResolvedValue(panel)

      await useEditionStore.getState().addDialogue('panel1', {
        characterName: 'Hero',
        text: 'Hello',
      })

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })

    it('should pass dialogue options to repository', async () => {
      const dialogue = createMockDialogue()
      const panel = createMockPanel({ id: 'panel1' })
      useEditionStore.setState({ panels: [panel] })

      vi.mocked(panelRepository.addDialogue).mockResolvedValue(dialogue)
      vi.mocked(panelRepository.getById).mockResolvedValue(panel)

      await useEditionStore.getState().addDialogue('panel1', {
        characterName: 'Hero',
        text: 'Hello world',
        type: 'thought',
        characterId: 'char-1',
        direction: 'left',
      })

      expect(panelRepository.addDialogue).toHaveBeenCalledWith('panel1', {
        characterName: 'Hero',
        text: 'Hello world',
        type: 'thought',
        characterId: 'char-1',
        direction: 'left',
      })
    })
  })

  // ===========================================
  // updateDialogue (ES-066 to ES-067)
  // ===========================================
  describe('updateDialogue', () => {
    it('ES-066: should refresh panel in panels array', async () => {
      const dialogue = createMockDialogue({ id: 'd1', text: 'Old' })
      const updatedDialogue = createMockDialogue({ id: 'd1', text: 'New' })
      const panel = createMockPanel({ id: 'panel1', dialogues: [dialogue] })
      const updatedPanel = createMockPanel({ id: 'panel1', dialogues: [updatedDialogue] })
      useEditionStore.setState({ panels: [panel] })

      vi.mocked(panelRepository.updateDialogue).mockResolvedValue()
      vi.mocked(panelRepository.getById).mockResolvedValue(updatedPanel)

      await useEditionStore.getState().updateDialogue('panel1', 'd1', { text: 'New' })

      expect(useEditionStore.getState().panels[0].dialogues[0].text).toBe('New')
    })

    it('ES-067: should call triggerGlobalSync after update', async () => {
      const panel = createMockPanel({ id: 'panel1' })
      useEditionStore.setState({ panels: [panel] })

      vi.mocked(panelRepository.updateDialogue).mockResolvedValue()
      vi.mocked(panelRepository.getById).mockResolvedValue(panel)

      await useEditionStore.getState().updateDialogue('panel1', 'd1', { text: 'Updated' })

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // removeDialogue (ES-068 to ES-069)
  // ===========================================
  describe('removeDialogue', () => {
    it('ES-068: should refresh panel in panels array', async () => {
      const dialogue = createMockDialogue({ id: 'd1' })
      const panel = createMockPanel({ id: 'panel1', dialogues: [dialogue] })
      const updatedPanel = createMockPanel({ id: 'panel1', dialogues: [] })
      useEditionStore.setState({ panels: [panel] })

      vi.mocked(panelRepository.removeDialogue).mockResolvedValue()
      vi.mocked(panelRepository.getById).mockResolvedValue(updatedPanel)

      await useEditionStore.getState().removeDialogue('panel1', 'd1')

      expect(useEditionStore.getState().panels[0].dialogues).toHaveLength(0)
    })

    it('ES-069: should call triggerGlobalSync after removal', async () => {
      const panel = createMockPanel({ id: 'panel1' })
      useEditionStore.setState({ panels: [panel] })

      vi.mocked(panelRepository.removeDialogue).mockResolvedValue()
      vi.mocked(panelRepository.getById).mockResolvedValue(panel)

      await useEditionStore.getState().removeDialogue('panel1', 'd1')

      expect(triggerGlobalSync).toHaveBeenCalledOnce()
    })
  })

  // ===========================================
  // Reset Actions (ES-070 to ES-072)
  // ===========================================
  describe('Reset Actions', () => {
    it('ES-070: clearCurrentEdition should clear currentEdition, pages, currentPage, and panels', () => {
      const edition = createMockEdition({ id: 'e1' })
      const page = createMockPage({ id: 'p1' })
      const panel = createMockPanel({ id: 'panel1' })
      useEditionStore.setState({
        editions: [edition],
        currentEdition: edition,
        pages: [page],
        currentPage: page,
        panels: [panel],
      })

      useEditionStore.getState().clearCurrentEdition()

      const state = useEditionStore.getState()
      expect(state.currentEdition).toBeNull()
      expect(state.pages).toEqual([])
      expect(state.currentPage).toBeNull()
      expect(state.panels).toEqual([])
      // editions should remain
      expect(state.editions).toHaveLength(1)
    })

    it('ES-071: clearCurrentPage should clear currentPage and panels only', () => {
      const edition = createMockEdition({ id: 'e1' })
      const page = createMockPage({ id: 'p1' })
      const panel = createMockPanel({ id: 'panel1' })
      useEditionStore.setState({
        currentEdition: edition,
        pages: [page],
        currentPage: page,
        panels: [panel],
      })

      useEditionStore.getState().clearCurrentPage()

      const state = useEditionStore.getState()
      expect(state.currentPage).toBeNull()
      expect(state.panels).toEqual([])
      // currentEdition and pages should remain
      expect(state.currentEdition).not.toBeNull()
      expect(state.pages).toHaveLength(1)
    })

    it('ES-072: clearAll should clear all state and reset isLoading', () => {
      const edition = createMockEdition({ id: 'e1' })
      const page = createMockPage({ id: 'p1' })
      const panel = createMockPanel({ id: 'panel1' })
      useEditionStore.setState({
        editions: [edition],
        currentEdition: edition,
        pages: [page],
        currentPage: page,
        panels: [panel],
        isLoading: true,
      })

      useEditionStore.getState().clearAll()

      const state = useEditionStore.getState()
      expect(state.editions).toEqual([])
      expect(state.currentEdition).toBeNull()
      expect(state.pages).toEqual([])
      expect(state.currentPage).toBeNull()
      expect(state.panels).toEqual([])
      expect(state.isLoading).toBe(false)
    })
  })

  // ===========================================
  // Edge Cases (ES-073)
  // ===========================================
  describe('Edge Cases', () => {
    it('ES-073: updateEdition should not throw for non-existent edition ID', async () => {
      useEditionStore.setState({ editions: [] })
      vi.mocked(editionRepository.update).mockResolvedValue()

      await expect(
        useEditionStore.getState().updateEdition('non-existent', { title: 'New' })
      ).resolves.not.toThrow()
    })

    it('ES-073: deleteEdition should not throw for non-existent edition ID', async () => {
      useEditionStore.setState({ editions: [] })
      vi.mocked(scriptPageRepository.getByEdition).mockResolvedValue([])
      vi.mocked(editionRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()

      await expect(
        useEditionStore.getState().deleteEdition('non-existent')
      ).resolves.not.toThrow()
    })

    it('ES-073: updatePage should not throw for non-existent page ID', async () => {
      useEditionStore.setState({ pages: [] })
      vi.mocked(scriptPageRepository.update).mockResolvedValue()

      await expect(
        useEditionStore.getState().updatePage('non-existent', { title: 'New' })
      ).resolves.not.toThrow()
    })

    it('ES-073: updatePanel should not throw for non-existent panel ID', async () => {
      useEditionStore.setState({ panels: [] })
      vi.mocked(panelRepository.update).mockResolvedValue()

      await expect(
        useEditionStore.getState().updatePanel('non-existent', { description: 'New' })
      ).resolves.not.toThrow()
    })
  })

  // ===========================================
  // Documented Design Issues
  // ===========================================
  describe('Documented Design Issues', () => {
    it('ISSUE: createEdition propagates repository errors without handling', async () => {
      // WARNING: No try/catch - errors propagate to caller.
      // Inconsistent with loadEditions which catches errors.
      vi.mocked(editionRepository.create).mockRejectedValue(new Error('DB Error'))

      await expect(
        useEditionStore.getState().createEdition('project-1', 'Test')
      ).rejects.toThrow('DB Error')

      expect(triggerGlobalSync).not.toHaveBeenCalled()
    })

    it('ISSUE: selectEdition has no isLoading management', async () => {
      // BUG: selectEdition never sets isLoading, unlike loadEditions.
      // This is inconsistent UX - the user sees no loading state.
      vi.mocked(editionRepository.getById).mockResolvedValue(undefined)

      expect(useEditionStore.getState().isLoading).toBe(false)

      await useEditionStore.getState().selectEdition('any-id')

      // isLoading was never set to true during selection
      expect(useEditionStore.getState().isLoading).toBe(false)
    })

    it('ISSUE: loadPages has no error handling - errors propagate', async () => {
      // WARNING: Unlike loadEditions, loadPages does NOT catch errors
      vi.mocked(scriptPageRepository.getByEdition).mockRejectedValue(new Error('DB Error'))

      await expect(
        useEditionStore.getState().loadPages('e1')
      ).rejects.toThrow('DB Error')
    })

    it('ISSUE: loadPanels has no error handling - errors propagate', async () => {
      vi.mocked(panelRepository.getByPage).mockRejectedValue(new Error('DB Error'))

      await expect(
        useEditionStore.getState().loadPanels('p1')
      ).rejects.toThrow('DB Error')
    })

    it('ISSUE: updateDialogue propagates repository errors', async () => {
      vi.mocked(panelRepository.updateDialogue).mockRejectedValue(new Error('DB Error'))

      await expect(
        useEditionStore.getState().updateDialogue('panel1', 'd1', { text: 'New' })
      ).rejects.toThrow('DB Error')
    })

    it('ISSUE: removeDialogue propagates repository errors', async () => {
      vi.mocked(panelRepository.removeDialogue).mockRejectedValue(new Error('DB Error'))

      await expect(
        useEditionStore.getState().removeDialogue('panel1', 'd1')
      ).rejects.toThrow('DB Error')
    })

    it('ISSUE: selectPage has no isLoading management', async () => {
      // Similar to selectEdition - no loading state during selection
      vi.mocked(scriptPageRepository.getById).mockResolvedValue(undefined)

      await useEditionStore.getState().selectPage('any-id')

      expect(useEditionStore.getState().isLoading).toBe(false)
    })

    it('ISSUE: deletePage without currentEdition does not renumber or reload', async () => {
      // BUG: If currentEdition is null, deletePage still calls repository.delete
      // but skips renumber/reload, leaving state potentially inconsistent
      const page = createMockPage({ id: 'p1' })
      useEditionStore.setState({
        currentEdition: null,
        pages: [page],
      })

      vi.mocked(panelRepository.getByPage).mockResolvedValue([])
      vi.mocked(scriptPageRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()

      await useEditionStore.getState().deletePage('p1')

      // Page was deleted from DB but state was NOT updated
      // because renumber/reload only runs if currentEdition exists
      expect(scriptPageRepository.renumber).not.toHaveBeenCalled()
      expect(useEditionStore.getState().pages).toHaveLength(1) // Still in state!
    })

    it('ISSUE: deletePanel without currentPage does not renumber or reload', async () => {
      // Similar issue to deletePage
      const panel = createMockPanel({ id: 'panel1' })
      useEditionStore.setState({
        currentPage: null,
        panels: [panel],
      })

      vi.mocked(panelRepository.delete).mockResolvedValue()
      vi.mocked(syncManifest.recordDeletion).mockResolvedValue()

      await useEditionStore.getState().deletePanel('panel1')

      expect(panelRepository.renumber).not.toHaveBeenCalled()
      expect(useEditionStore.getState().panels).toHaveLength(1) // Still in state!
    })
  })
})
