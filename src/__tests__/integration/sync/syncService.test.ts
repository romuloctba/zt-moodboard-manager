/**
 * Sync Service Integration Tests
 *
 * These tests verify the sync orchestration flow including:
 * - Full sync cycle with mocked Google Drive
 * - Conflict resolution strategies
 *
 * Test IDs: SY-001, SY-004
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db/database'
import { projectRepository } from '@/lib/db/repositories/projectRepository'
import { characterRepository } from '@/lib/db/repositories/characterRepository'
import { editionRepository } from '@/lib/db/repositories/editionRepository'
import type { SyncManifest, SyncProgress, SyncConflict, ItemSyncMeta } from '@/lib/sync/types'
import { SYNC_CONSTANTS } from '@/lib/sync/types'

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock googleAuth
vi.mock('@/lib/sync/googleAuth', () => ({
  googleAuth: {
    isSignedIn: vi.fn(() => true),
    getAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
    getUserEmail: vi.fn(() => 'test@example.com'),
    getUserId: vi.fn(() => 'user-123'),
    getTokenExpiry: vi.fn(() => new Date(Date.now() + 3600000)),
    signIn: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
  },
}))

// Mock deviceId
vi.mock('@/lib/sync/deviceId', () => ({
  getDeviceId: vi.fn(() => 'test-device-id'),
  getDeviceName: vi.fn(() => 'Test Device'),
}))

// Mock fileStorage
vi.mock('@/lib/storage/fileStorage', () => ({
  fileStorage: {
    initialize: vi.fn(() => Promise.resolve()),
    saveImage: vi.fn(() => Promise.resolve('opfs://images/test')),
    saveThumbnail: vi.fn(() => Promise.resolve('opfs://thumbnails/test')),
    getImage: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/webp' }))),
    deleteImage: vi.fn(() => Promise.resolve()),
    deleteThumbnail: vi.fn(() => Promise.resolve()),
  },
}))

// Store for mock Google Drive data
let mockDriveManifest: SyncManifest | null = null
const mockDriveProjects: Map<string, unknown> = new Map()
const mockDriveCharacters: Map<string, unknown> = new Map()
const mockDriveEditions: Map<string, unknown> = new Map()

// Mock googleDrive
vi.mock('@/lib/sync/googleDriveService', () => ({
  googleDrive: {
    initialize: vi.fn(() => Promise.resolve()),
    getManifest: vi.fn(() => Promise.resolve(mockDriveManifest)),
    saveManifest: vi.fn((manifest: SyncManifest) => {
      mockDriveManifest = manifest
      return Promise.resolve({ id: 'manifest-file-id' })
    }),
    getProject: vi.fn((id: string) => Promise.resolve(mockDriveProjects.get(id) || null)),
    saveProject: vi.fn((id: string, data: unknown) => {
      mockDriveProjects.set(id, data)
      return Promise.resolve({ id: `project-file-${id}` })
    }),
    deleteProject: vi.fn((id: string) => {
      mockDriveProjects.delete(id)
      return Promise.resolve()
    }),
    getCharacter: vi.fn((id: string) => Promise.resolve(mockDriveCharacters.get(id) || null)),
    saveCharacter: vi.fn((id: string, data: unknown) => {
      mockDriveCharacters.set(id, data)
      return Promise.resolve({ id: `character-file-${id}` })
    }),
    deleteCharacter: vi.fn((id: string) => {
      mockDriveCharacters.delete(id)
      return Promise.resolve()
    }),
    getEdition: vi.fn((id: string) => Promise.resolve(mockDriveEditions.get(id) || null)),
    saveEdition: vi.fn((id: string, data: unknown) => {
      mockDriveEditions.set(id, data)
      return Promise.resolve({ id: `edition-file-${id}` })
    }),
    deleteEdition: vi.fn((id: string) => {
      mockDriveEditions.delete(id)
      return Promise.resolve()
    }),
    getImageMeta: vi.fn(() => Promise.resolve(null)),
    saveImageMeta: vi.fn(() => Promise.resolve({ id: 'image-meta-id' })),
    deleteImageMeta: vi.fn(() => Promise.resolve()),
    getImageFile: vi.fn(() => Promise.resolve(null)),
    saveImageFile: vi.fn(() => Promise.resolve({ id: 'image-file-id' })),
    deleteImageFile: vi.fn(() => Promise.resolve()),
    getThumbnailFile: vi.fn(() => Promise.resolve(null)),
    saveThumbnailFile: vi.fn(() => Promise.resolve({ id: 'thumb-file-id' })),
    deleteThumbnailFile: vi.fn(() => Promise.resolve()),
    getScriptPage: vi.fn(() => Promise.resolve(null)),
    saveScriptPage: vi.fn(() => Promise.resolve({ id: 'page-file-id' })),
    deleteScriptPage: vi.fn(() => Promise.resolve()),
    getPanel: vi.fn(() => Promise.resolve(null)),
    savePanel: vi.fn(() => Promise.resolve({ id: 'panel-file-id' })),
    deletePanel: vi.fn(() => Promise.resolve()),
  },
}))

// Import after mocks are set up
import { syncService } from '@/lib/sync/syncService'
import { googleDrive } from '@/lib/sync/googleDriveService'

// Mock localStorage
const mockStorage: Map<string, string> = new Map()
const originalLocalStorage = globalThis.localStorage

const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
  clear: vi.fn(() => mockStorage.clear()),
  length: 0,
  key: vi.fn(() => null),
}

// =============================================================================
// TEST HELPERS
// =============================================================================

function createItemMeta(id: string, hash: string, updatedAt: Date): ItemSyncMeta {
  return {
    id,
    hash,
    updatedAt: updatedAt.toISOString(),
    version: 1,
  }
}

function createRemoteManifest(overrides: Partial<SyncManifest> = {}): SyncManifest {
  return {
    version: 1,
    schemaVersion: SYNC_CONSTANTS.SCHEMA_VERSION,
    lastModified: new Date().toISOString(),
    lastModifiedDeviceId: 'remote-device-id',
    lastModifiedDeviceName: 'Remote Device',
    projects: {},
    characters: {},
    images: {},
    editions: {},
    scriptPages: {},
    panels: {},
    deletedItems: [],
    ...overrides,
  }
}

// =============================================================================
// TEST SETUP
// =============================================================================

beforeEach(() => {
  // Reset mock stores
  mockDriveManifest = null
  mockDriveProjects.clear()
  mockDriveCharacters.clear()
  mockDriveEditions.clear()
  mockStorage.clear()

  vi.clearAllMocks()

  // Apply localStorage mock
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  })

  // Initialize sync settings so isConnected() returns true
  mockStorage.set('moodboard-sync-settings', JSON.stringify({
    id: 'sync-settings',
    enabled: true,
    provider: 'google-drive',
    deviceId: 'test-device-id',
    deviceName: 'Test Device',
    autoSyncEnabled: true,
    syncIntervalMinutes: 15,
    syncOnStartup: true,
    conflictStrategy: 'newest-wins',
  }))
})

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
    configurable: true,
  })
})

// =============================================================================
// SY-001: FULL SYNC CYCLE TESTS
// =============================================================================

describe('Sync Integration - Full Sync Cycle (SY-001)', () => {
  it('SY-001a: First sync should upload all local items to empty remote', async () => {
    // Create local data
    const project = await projectRepository.create('Test Project', 'Description')
    const character = await characterRepository.create(project.id, 'Hero')
    const edition = await editionRepository.create(project.id, 'Volume 1')

    // No remote manifest (first sync)
    mockDriveManifest = null

    // Perform sync
    const result = await syncService.performSync({ force: true })

    // Verify success
    expect(result.success).toBe(true)
    expect(result.direction).toBe('push')

    // Verify uploads happened
    expect(googleDrive.saveProject).toHaveBeenCalledWith(project.id, expect.any(Object))
    expect(googleDrive.saveCharacter).toHaveBeenCalledWith(character.id, expect.any(Object))
    expect(googleDrive.saveEdition).toHaveBeenCalledWith(edition.id, expect.any(Object))

    // Verify manifest was saved
    expect(googleDrive.saveManifest).toHaveBeenCalled()
  })

  it('SY-001b: Sync with no changes should return direction=none', async () => {
    // Create local data
    const project = await projectRepository.create('Test Project')

    // Create matching remote manifest
    const projectData = await db.projects.get(project.id)
    mockDriveManifest = createRemoteManifest({
      lastModifiedDeviceId: 'test-device-id', // Same device
      projects: {
        [project.id]: createItemMeta(
          project.id,
          // We need to match the hash - use a real hash by syncing first
          'placeholder',
          projectData!.updatedAt
        ),
      },
    })

    // First sync to establish baseline
    await syncService.performSync({ force: true })

    // Clear mocks
    vi.clearAllMocks()

    // Second sync should find no changes
    const result = await syncService.performSync({ force: true })

    expect(result.success).toBe(true)
    expect(result.direction).toBe('none')
    expect(result.itemsSynced.projects.added).toBe(0)
  })

  it('SY-001c: Sync should download items only in remote', async () => {
    // Set up remote project
    const remoteProjectId = 'remote-proj-1'
    const remoteProject = {
      id: remoteProjectId,
      name: 'Remote Project',
      description: 'Created on another device',
      tags: [],
      settings: { defaultView: 'grid', gridColumns: 4, canvasBackground: '#ffffff' },
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockDriveProjects.set(remoteProjectId, remoteProject)

    mockDriveManifest = createRemoteManifest({
      projects: {
        [remoteProjectId]: createItemMeta(remoteProjectId, 'remote-hash', new Date()),
      },
    })

    // Perform sync
    const result = await syncService.performSync({ force: true })

    // Verify download
    expect(result.success).toBe(true)
    expect(result.direction).toBe('pull')
    expect(googleDrive.getProject).toHaveBeenCalledWith(remoteProjectId)

    // Verify project was added to local DB
    const localProject = await projectRepository.getById(remoteProjectId)
    expect(localProject).toBeDefined()
    expect(localProject?.name).toBe('Remote Project')
  })

  it('SY-001d: Sync should handle bidirectional changes (merge)', async () => {
    // Create local project
    const localProject = await projectRepository.create('Local Project')

    // Set up remote project
    const remoteProjectId = 'remote-proj-1'
    const remoteProject = {
      id: remoteProjectId,
      name: 'Remote Project',
      tags: [],
      settings: { defaultView: 'grid', gridColumns: 4, canvasBackground: '#ffffff' },
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockDriveProjects.set(remoteProjectId, remoteProject)

    mockDriveManifest = createRemoteManifest({
      projects: {
        [remoteProjectId]: createItemMeta(remoteProjectId, 'remote-hash', new Date()),
      },
    })

    // Perform sync
    const result = await syncService.performSync({ force: true })

    // Should be a merge (both upload and download)
    expect(result.success).toBe(true)
    expect(result.direction).toBe('merge')

    // Verify both operations
    expect(googleDrive.saveProject).toHaveBeenCalledWith(localProject.id, expect.any(Object))
    expect(googleDrive.getProject).toHaveBeenCalledWith(remoteProjectId)
  })

  it('SY-001e: Sync should track progress through phases', async () => {
    // Create local data
    await projectRepository.create('Test Project')

    const progressUpdates: SyncProgress[] = []

    // Perform sync with progress callback
    await syncService.performSync({
      force: true,
      onProgress: (progress) => {
        progressUpdates.push({ ...progress })
      },
    })

    // Verify progress phases
    const phases = progressUpdates.map((p) => p.phase)

    // Should include connecting, analyzing, checking/comparing, uploading/downloading, finalizing, complete
    expect(phases).toContain('connecting')
    expect(phases).toContain('analyzing')
    expect(phases).toContain('complete')
  })

  it('SY-001f: Sync should process deletions from remote', async () => {
    // Create local project
    const project = await projectRepository.create('Will be deleted')

    // Set up remote manifest with deletion record
    mockDriveManifest = createRemoteManifest({
      deletedItems: [
        {
          id: project.id,
          type: 'project',
          deletedAt: new Date().toISOString(),
          deletedByDeviceId: 'other-device',
        },
      ],
    })

    // Perform sync
    const result = await syncService.performSync({ force: true })

    expect(result.success).toBe(true)

    // Verify project was deleted locally
    const deletedProject = await projectRepository.getById(project.id)
    expect(deletedProject).toBeUndefined()
  })
})

// =============================================================================
// SY-004: CONFLICT RESOLUTION STRATEGY TESTS
// =============================================================================

describe('Sync Integration - Conflict Resolution Strategies (SY-004)', () => {
  it('SY-004a: newest-wins strategy should use newer timestamp', async () => {
    // Create local project with older timestamp
    const project = await projectRepository.create('Local Version')
    const oldDate = new Date('2024-01-01T10:00:00Z')
    await db.projects.update(project.id, { updatedAt: oldDate })

    // Set up remote with newer timestamp
    const newDate = new Date('2024-01-01T12:00:00Z')
    const remoteProject = {
      id: project.id,
      name: 'Remote Version (newer)',
      tags: [],
      settings: { defaultView: 'grid', gridColumns: 4, canvasBackground: '#ffffff' },
      isArchived: false,
      createdAt: oldDate.toISOString(),
      updatedAt: newDate.toISOString(),
    }
    mockDriveProjects.set(project.id, remoteProject)

    mockDriveManifest = createRemoteManifest({
      lastModifiedDeviceId: 'different-device', // Different device to trigger conflict
      projects: {
        [project.id]: createItemMeta(project.id, 'different-hash', newDate),
      },
    })

    // Set strategy to newest-wins
    mockStorage.set('moodboard-sync-settings', JSON.stringify({
      id: 'sync-settings',
      enabled: true,
      provider: 'google-drive',
      deviceId: 'test-device-id',
      deviceName: 'Test Device',
      conflictStrategy: 'newest-wins',
    }))

    // Perform sync
    const result = await syncService.performSync({ force: true })

    expect(result.success).toBe(true)

    // Remote was newer, so local should be updated
    const updatedProject = await projectRepository.getById(project.id)
    expect(updatedProject?.name).toBe('Remote Version (newer)')
  })

  it('SY-004b: local-wins strategy should keep local version', async () => {
    // Create local project
    const project = await projectRepository.create('Local Version')
    const localDate = new Date('2024-01-01T10:00:00Z')
    await db.projects.update(project.id, { updatedAt: localDate })

    // Set up conflicting remote
    const remoteProject = {
      id: project.id,
      name: 'Remote Version',
      tags: [],
      settings: { defaultView: 'grid', gridColumns: 4, canvasBackground: '#ffffff' },
      isArchived: false,
      createdAt: localDate.toISOString(),
      updatedAt: new Date('2024-01-01T12:00:00Z').toISOString(), // Remote is newer
    }
    mockDriveProjects.set(project.id, remoteProject)

    mockDriveManifest = createRemoteManifest({
      lastModifiedDeviceId: 'different-device',
      projects: {
        [project.id]: createItemMeta(project.id, 'different-hash', new Date('2024-01-01T12:00:00Z')),
      },
    })

    // Set strategy to local-wins
    mockStorage.set('moodboard-sync-settings', JSON.stringify({
      id: 'sync-settings',
      enabled: true,
      provider: 'google-drive',
      deviceId: 'test-device-id',
      deviceName: 'Test Device',
      conflictStrategy: 'local-wins',
    }))

    // Perform sync
    const result = await syncService.performSync({ force: true })

    expect(result.success).toBe(true)

    // Local version should be preserved
    const updatedProject = await projectRepository.getById(project.id)
    expect(updatedProject?.name).toBe('Local Version')

    // Local version should have been uploaded
    expect(googleDrive.saveProject).toHaveBeenCalledWith(project.id, expect.objectContaining({
      name: 'Local Version',
    }))
  })

  it('SY-004c: remote-wins strategy should use remote version', async () => {
    // Create local project
    const project = await projectRepository.create('Local Version')

    // Set up conflicting remote
    const remoteProject = {
      id: project.id,
      name: 'Remote Version',
      tags: [],
      settings: { defaultView: 'grid', gridColumns: 4, canvasBackground: '#ffffff' },
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockDriveProjects.set(project.id, remoteProject)

    mockDriveManifest = createRemoteManifest({
      lastModifiedDeviceId: 'different-device',
      projects: {
        [project.id]: createItemMeta(project.id, 'different-hash', new Date()),
      },
    })

    // Set strategy to remote-wins
    mockStorage.set('moodboard-sync-settings', JSON.stringify({
      id: 'sync-settings',
      enabled: true,
      provider: 'google-drive',
      deviceId: 'test-device-id',
      deviceName: 'Test Device',
      conflictStrategy: 'remote-wins',
    }))

    // Perform sync
    const result = await syncService.performSync({ force: true })

    expect(result.success).toBe(true)

    // Remote version should be used
    const updatedProject = await projectRepository.getById(project.id)
    expect(updatedProject?.name).toBe('Remote Version')
  })

  it('SY-004d: ask strategy with callback should resolve via user choice', async () => {
    // Create local project
    const project = await projectRepository.create('Local Version')
    const localDate = new Date('2024-01-01T10:00:00Z')
    await db.projects.update(project.id, { updatedAt: localDate })

    // Set up conflicting remote
    const remoteProject = {
      id: project.id,
      name: 'Remote Version',
      tags: [],
      settings: { defaultView: 'grid', gridColumns: 4, canvasBackground: '#ffffff' },
      isArchived: false,
      createdAt: localDate.toISOString(),
      updatedAt: new Date('2024-01-01T12:00:00Z').toISOString(),
    }
    mockDriveProjects.set(project.id, remoteProject)

    mockDriveManifest = createRemoteManifest({
      lastModifiedDeviceId: 'different-device',
      projects: {
        [project.id]: createItemMeta(project.id, 'different-hash', new Date('2024-01-01T12:00:00Z')),
      },
    })

    // Set strategy to ask
    mockStorage.set('moodboard-sync-settings', JSON.stringify({
      id: 'sync-settings',
      enabled: true,
      provider: 'google-drive',
      deviceId: 'test-device-id',
      deviceName: 'Test Device',
      conflictStrategy: 'ask',
    }))

    // Perform sync with conflict callback that chooses local
    const result = await syncService.performSync({
      force: true,
      onConflict: async (conflicts: SyncConflict[]) => {
        // Resolve all conflicts as 'local'
        return conflicts.map((c) => ({ ...c, resolution: 'local' as const }))
      },
    })

    expect(result.success).toBe(true)

    // Local version should be preserved (user chose local)
    const updatedProject = await projectRepository.getById(project.id)
    expect(updatedProject?.name).toBe('Local Version')
  })

  it('SY-004e: skip resolution should not sync the conflicted item', async () => {
    // Create local project
    const project = await projectRepository.create('Local Version')

    // Set up conflicting remote
    mockDriveProjects.set(project.id, {
      id: project.id,
      name: 'Remote Version',
      tags: [],
      settings: { defaultView: 'grid', gridColumns: 4, canvasBackground: '#ffffff' },
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    mockDriveManifest = createRemoteManifest({
      lastModifiedDeviceId: 'different-device',
      projects: {
        [project.id]: createItemMeta(project.id, 'different-hash', new Date()),
      },
    })

    // Set strategy to ask
    mockStorage.set('moodboard-sync-settings', JSON.stringify({
      id: 'sync-settings',
      enabled: true,
      provider: 'google-drive',
      deviceId: 'test-device-id',
      deviceName: 'Test Device',
      conflictStrategy: 'ask',
    }))

    // Clear mocks before sync
    vi.clearAllMocks()

    // Perform sync with conflict callback that skips
    const result = await syncService.performSync({
      force: true,
      onConflict: async (conflicts: SyncConflict[]) => {
        return conflicts.map((c) => ({ ...c, resolution: 'skip' as const }))
      },
    })

    expect(result.success).toBe(true)

    // Neither upload nor download should have happened for this project
    // (Only manifest operations should occur)
    expect(googleDrive.saveProject).not.toHaveBeenCalled()
    expect(googleDrive.getProject).not.toHaveBeenCalled()
  })
})

// =============================================================================
// EDGE CASES AND ERROR HANDLING
// =============================================================================

describe('Sync Integration - Edge Cases', () => {
  it('should prevent concurrent syncs', async () => {
    await projectRepository.create('Test Project')

    // Start two syncs simultaneously
    const sync1 = syncService.performSync({ force: true })
    const sync2 = syncService.performSync({ force: true })

    const [result1, result2] = await Promise.all([sync1, sync2])

    // One should succeed, one should fail with already-in-progress
    const successCount = [result1, result2].filter((r) => r.success).length
    const failedResults = [result1, result2].filter((r) => !r.success)

    expect(successCount).toBe(1)
    expect(failedResults).toHaveLength(1)
    expect(failedResults[0].errors?.[0]?.message).toContain('progress')
  })

  it('should respect rate limiting', async () => {
    await projectRepository.create('Test Project')

    // First sync
    const result1 = await syncService.performSync({ force: true })
    expect(result1.success).toBe(true)

    // Immediate second sync without force should be rate limited
    const result2 = await syncService.performSync({ force: false })
    expect(result2.success).toBe(false)
    expect(result2.errors?.[0]?.message).toContain('wait')
  })

  it('should fail gracefully when not connected', async () => {
    // Clear sync settings to simulate not connected
    mockStorage.clear()

    const result = await syncService.performSync({ force: true })

    expect(result.success).toBe(false)
    expect(result.errors?.[0]?.message).toContain('connect')
  })
})
