/**
 * Sync Field Validation Integration Tests
 *
 * These tests verify that ALL fields of ALL entities are correctly synced
 * during the full sync cycle. Unlike the orchestration tests in syncService.test.ts,
 * these tests validate the actual data content, not just that operations were called.
 *
 * Test IDs: SY-FV-001 through SY-FV-007
 *
 * CRITICAL: These tests are designed to catch real bugs by:
 * 1. Verifying exact field values, not just that data exists
 * 2. Testing both upload (local→remote) and download (remote→local) paths
 * 3. Validating nested objects and arrays are fully preserved
 * 4. Ensuring Date serialization/deserialization works correctly
 * 5. Confirming local-only fields are handled appropriately
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db/database'
import type {
  Project,
  Character,
  MoodboardImage,
  Edition,
  ScriptPage,
  Panel,
} from '@/types'
import type { SyncManifest, ItemSyncMeta } from '@/lib/sync/types'
import { SYNC_CONSTANTS } from '@/lib/sync/types'
import {
  createFullProject,
  createFullCharacter,
  createFullMoodboardImage,
  createFullEdition,
  createFullScriptPage,
  createFullPanel,
  createCompleteEntityGraph,
  resetIdCounter,
} from './helpers/syncTestFactories'

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

// Mock fileStorage - return objects that behave like Files with arrayBuffer() method
vi.mock('@/lib/storage/fileStorage', () => ({
  fileStorage: {
    initialize: vi.fn(() => Promise.resolve()),
    saveImage: vi.fn((id: string) => Promise.resolve(`opfs://images/${id}.webp`)),
    saveThumbnail: vi.fn((id: string) => Promise.resolve(`opfs://thumbnails/${id}.webp`)),
    getImage: vi.fn(() => {
      // Create an object that mimics File behavior including arrayBuffer()
      // This is needed because Node.js Blob/File may not have arrayBuffer in all environments
      const mockFileData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]) // PNG header bytes
      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(mockFileData.buffer),
        size: mockFileData.length,
        type: 'image/webp',
        name: 'test.webp',
      })
    }),
    deleteImage: vi.fn(() => Promise.resolve()),
    deleteThumbnail: vi.fn(() => Promise.resolve()),
  },
}))

// Enhanced mock stores with proper typing for validation
let mockDriveManifest: SyncManifest | null = null
const mockDriveProjects: Map<string, Project> = new Map()
const mockDriveCharacters: Map<string, Character> = new Map()
const mockDriveImages: Map<string, Omit<MoodboardImage, 'storagePath' | 'thumbnailPath'>> = new Map()
const mockDriveEditions: Map<string, Edition> = new Map()
const mockDriveScriptPages: Map<string, ScriptPage> = new Map()
const mockDrivePanels: Map<string, Panel> = new Map()
const mockDriveImageBlobs: Map<string, Blob> = new Map()
const mockDriveThumbnailBlobs: Map<string, Blob> = new Map()

// Mock googleDrive with enhanced capture
vi.mock('@/lib/sync/googleDriveService', () => ({
  googleDrive: {
    initialize: vi.fn(() => Promise.resolve()),
    getManifest: vi.fn(() => Promise.resolve(mockDriveManifest)),
    saveManifest: vi.fn((manifest: SyncManifest) => {
      mockDriveManifest = manifest
      return Promise.resolve({ id: 'manifest-file-id' })
    }),
    // Project operations
    getProject: vi.fn((id: string) => Promise.resolve(mockDriveProjects.get(id) || null)),
    saveProject: vi.fn((id: string, data: Project) => {
      mockDriveProjects.set(id, data)
      return Promise.resolve({ id: `project-file-${id}` })
    }),
    deleteProject: vi.fn((id: string) => {
      mockDriveProjects.delete(id)
      return Promise.resolve()
    }),
    // Character operations
    getCharacter: vi.fn((id: string) => Promise.resolve(mockDriveCharacters.get(id) || null)),
    saveCharacter: vi.fn((id: string, data: Character) => {
      mockDriveCharacters.set(id, data)
      return Promise.resolve({ id: `character-file-${id}` })
    }),
    deleteCharacter: vi.fn((id: string) => {
      mockDriveCharacters.delete(id)
      return Promise.resolve()
    }),
    // Edition operations
    getEdition: vi.fn((id: string) => Promise.resolve(mockDriveEditions.get(id) || null)),
    saveEdition: vi.fn((id: string, data: Edition) => {
      mockDriveEditions.set(id, data)
      return Promise.resolve({ id: `edition-file-${id}` })
    }),
    deleteEdition: vi.fn((id: string) => {
      mockDriveEditions.delete(id)
      return Promise.resolve()
    }),
    // ScriptPage operations
    getScriptPage: vi.fn((id: string) => Promise.resolve(mockDriveScriptPages.get(id) || null)),
    saveScriptPage: vi.fn((id: string, data: ScriptPage) => {
      mockDriveScriptPages.set(id, data)
      return Promise.resolve({ id: `page-file-${id}` })
    }),
    deleteScriptPage: vi.fn((id: string) => {
      mockDriveScriptPages.delete(id)
      return Promise.resolve()
    }),
    // Panel operations
    getPanel: vi.fn((id: string) => Promise.resolve(mockDrivePanels.get(id) || null)),
    savePanel: vi.fn((id: string, data: Panel) => {
      mockDrivePanels.set(id, data)
      return Promise.resolve({ id: `panel-file-${id}` })
    }),
    deletePanel: vi.fn((id: string) => {
      mockDrivePanels.delete(id)
      return Promise.resolve()
    }),
    // Image metadata operations
    getImageMeta: vi.fn((id: string) => Promise.resolve(mockDriveImages.get(id) || null)),
    saveImageMeta: vi.fn((id: string, data: Omit<MoodboardImage, 'storagePath' | 'thumbnailPath'>) => {
      mockDriveImages.set(id, data)
      return Promise.resolve({ id: `image-meta-${id}` })
    }),
    deleteImageMeta: vi.fn((id: string) => {
      mockDriveImages.delete(id)
      return Promise.resolve()
    }),
    // Image file operations
    getImageFile: vi.fn((id: string) => Promise.resolve(mockDriveImageBlobs.get(id) || null)),
    saveImageFile: vi.fn((id: string, blob: Blob) => {
      mockDriveImageBlobs.set(id, blob)
      return Promise.resolve({ id: `image-file-${id}` })
    }),
    deleteImageFile: vi.fn((id: string) => {
      mockDriveImageBlobs.delete(id)
      return Promise.resolve()
    }),
    // Thumbnail operations
    getThumbnailFile: vi.fn((id: string) => Promise.resolve(mockDriveThumbnailBlobs.get(id) || null)),
    saveThumbnailFile: vi.fn((id: string, blob: Blob) => {
      mockDriveThumbnailBlobs.set(id, blob)
      return Promise.resolve({ id: `thumb-file-${id}` })
    }),
    deleteThumbnailFile: vi.fn((id: string) => {
      mockDriveThumbnailBlobs.delete(id)
      return Promise.resolve()
    }),
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

/**
 * Helper to clear all mock stores
 */
function clearMockStores(): void {
  mockDriveManifest = null
  mockDriveProjects.clear()
  mockDriveCharacters.clear()
  mockDriveImages.clear()
  mockDriveEditions.clear()
  mockDriveScriptPages.clear()
  mockDrivePanels.clear()
  mockDriveImageBlobs.clear()
  mockDriveThumbnailBlobs.clear()
}

/**
 * Helper to serialize dates in an object for remote simulation
 */
function serializeDates<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// =============================================================================
// TEST SETUP
// =============================================================================

beforeEach(async () => {
  // Reset ID counter for predictable test IDs
  resetIdCounter()

  // Reset mock stores
  clearMockStores()
  mockStorage.clear()

  vi.clearAllMocks()

  // Apply localStorage mock
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  })

  // Initialize sync settings
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

  // Clear database tables
  await db.projects.clear()
  await db.characters.clear()
  await db.images.clear()
  await db.editions.clear()
  await db.scriptPages.clear()
  await db.panels.clear()
})

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
    configurable: true,
  })
})

// =============================================================================
// SY-FV-001: PROJECT FIELD VALIDATION
// =============================================================================

describe('Sync Field Validation - Project (SY-FV-001)', () => {
  it('SY-FV-001a: should upload ALL project fields to remote', async () => {
    // Create a fully-populated project in local DB
    const localProject = createFullProject({
      id: 'test-project-upload',
      name: 'Complete Project',
      description: 'Full description with details',
      genre: 'Sci-Fi',
      theme: 'Space Opera',
      tags: ['space', 'adventure', 'epic'],
      settings: {
        defaultView: 'canvas',
        gridColumns: 8,
        canvasBackground: '#1a1a2e',
      },
      coverImageId: 'cover-123',
      isArchived: false,
    })

    await db.projects.add(localProject)

    // First sync (no remote manifest)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    // CRITICAL: Verify the actual data passed to saveProject
    expect(googleDrive.saveProject).toHaveBeenCalledTimes(1)

    const savedProject = mockDriveProjects.get(localProject.id)
    expect(savedProject).toBeDefined()

    // Validate EVERY field individually
    expect(savedProject!.id).toBe(localProject.id)
    expect(savedProject!.name).toBe('Complete Project')
    expect(savedProject!.description).toBe('Full description with details')
    expect(savedProject!.genre).toBe('Sci-Fi')
    expect(savedProject!.theme).toBe('Space Opera')
    expect(savedProject!.tags).toEqual(['space', 'adventure', 'epic'])
    expect(savedProject!.coverImageId).toBe('cover-123')
    expect(savedProject!.isArchived).toBe(false)

    // Validate nested settings object
    expect(savedProject!.settings).toBeDefined()
    expect(savedProject!.settings.defaultView).toBe('canvas')
    expect(savedProject!.settings.gridColumns).toBe(8)
    expect(savedProject!.settings.canvasBackground).toBe('#1a1a2e')

    // Validate dates are present (will be serialized)
    expect(savedProject!.createdAt).toBeDefined()
    expect(savedProject!.updatedAt).toBeDefined()
  })

  it('SY-FV-001b: should download ALL project fields from remote', async () => {
    // Set up a fully-populated remote project
    const remoteProject = createFullProject({
      id: 'test-project-download',
      name: 'Remote Complete Project',
      description: 'Downloaded description',
      genre: 'Fantasy',
      theme: 'Dark Fantasy',
      tags: ['magic', 'dark', 'medieval'],
      settings: {
        defaultView: 'grid',
        gridColumns: 5,
        canvasBackground: '#2d2d44',
      },
      coverImageId: 'remote-cover-456',
      isArchived: true,
    })

    // Simulate what remote storage would have (dates as ISO strings)
    const serializedRemote = serializeDates(remoteProject)
    mockDriveProjects.set(remoteProject.id, serializedRemote)

    mockDriveManifest = createRemoteManifest({
      projects: {
        [remoteProject.id]: createItemMeta(remoteProject.id, 'remote-hash', remoteProject.updatedAt),
      },
    })

    await syncService.performSync({ force: true })

    // Retrieve from local DB and validate ALL fields
    const localProject = await db.projects.get(remoteProject.id)
    expect(localProject).toBeDefined()

    expect(localProject!.id).toBe(remoteProject.id)
    expect(localProject!.name).toBe('Remote Complete Project')
    expect(localProject!.description).toBe('Downloaded description')
    expect(localProject!.genre).toBe('Fantasy')
    expect(localProject!.theme).toBe('Dark Fantasy')
    expect(localProject!.tags).toEqual(['magic', 'dark', 'medieval'])
    expect(localProject!.coverImageId).toBe('remote-cover-456')
    expect(localProject!.isArchived).toBe(true)

    // Validate nested settings
    expect(localProject!.settings.defaultView).toBe('grid')
    expect(localProject!.settings.gridColumns).toBe(5)
    expect(localProject!.settings.canvasBackground).toBe('#2d2d44')

    // Validate dates are Date objects (not strings)
    expect(localProject!.createdAt).toBeInstanceOf(Date)
    expect(localProject!.updatedAt).toBeInstanceOf(Date)
  })

  it('SY-FV-001c: should handle project with optional fields undefined', async () => {
    // Project with minimal fields (optionals undefined)
    const minimalProject: Project = {
      id: 'minimal-project',
      name: 'Minimal',
      // description: undefined,
      // genre: undefined,
      // theme: undefined,
      tags: [],
      settings: {
        defaultView: 'grid',
        gridColumns: 4,
        canvasBackground: '#ffffff',
      },
      // coverImageId: undefined,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await db.projects.add(minimalProject)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    const savedProject = mockDriveProjects.get(minimalProject.id)
    expect(savedProject).toBeDefined()
    expect(savedProject!.name).toBe('Minimal')
    expect(savedProject!.description).toBeUndefined()
    expect(savedProject!.genre).toBeUndefined()
    expect(savedProject!.theme).toBeUndefined()
    expect(savedProject!.coverImageId).toBeUndefined()
    expect(savedProject!.tags).toEqual([])
  })
})

// =============================================================================
// SY-FV-002: CHARACTER FIELD VALIDATION
// =============================================================================

describe('Sync Field Validation - Character (SY-FV-002)', () => {
  it('SY-FV-002a: should upload ALL character fields including nested profile and metadata', async () => {
    // Create project first (required for FK)
    const project = createFullProject({ id: 'char-test-project' })
    await db.projects.add(project)

    // Create fully-populated character
    const localCharacter = createFullCharacter(project.id, {
      id: 'test-char-upload',
      name: 'Full Character',
      description: 'A complete character with all fields',
      tags: ['hero', 'main', 'protagonist'],
      profile: {
        age: '30',
        role: 'Leader',
        personality: ['brave', 'strategic', 'caring'],
        abilities: ['combat', 'magic', 'diplomacy'],
        backstory: 'A legendary warrior who rose from humble beginnings.',
        customFields: {
          birthplace: 'Northern Kingdom',
          favoriteWeapon: 'Longsword',
          rivalName: 'Dark Lord Malachar',
        },
      },
      metadata: {
        palette: {
          dominant: '#ff0000',
          vibrant: '#00ff00',
          muted: '#0000ff',
          colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'],
        },
        archetype: 'The Chosen One',
        version: '3.0',
        inspirations: ['Gandalf', 'Obi-Wan', 'Dumbledore'],
      },
      sortOrder: 5,
    })

    await db.characters.add(localCharacter)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    // Validate the uploaded data
    const savedChar = mockDriveCharacters.get(localCharacter.id)
    expect(savedChar).toBeDefined()

    // Basic fields
    expect(savedChar!.id).toBe(localCharacter.id)
    expect(savedChar!.projectId).toBe(project.id)
    expect(savedChar!.name).toBe('Full Character')
    expect(savedChar!.description).toBe('A complete character with all fields')
    expect(savedChar!.tags).toEqual(['hero', 'main', 'protagonist'])
    expect(savedChar!.sortOrder).toBe(5)

    // Profile (nested object)
    expect(savedChar!.profile).toBeDefined()
    expect(savedChar!.profile.age).toBe('30')
    expect(savedChar!.profile.role).toBe('Leader')
    expect(savedChar!.profile.personality).toEqual(['brave', 'strategic', 'caring'])
    expect(savedChar!.profile.abilities).toEqual(['combat', 'magic', 'diplomacy'])
    expect(savedChar!.profile.backstory).toBe('A legendary warrior who rose from humble beginnings.')
    expect(savedChar!.profile.customFields).toEqual({
      birthplace: 'Northern Kingdom',
      favoriteWeapon: 'Longsword',
      rivalName: 'Dark Lord Malachar',
    })

    // Metadata (nested object with sub-object)
    expect(savedChar!.metadata).toBeDefined()
    expect(savedChar!.metadata.archetype).toBe('The Chosen One')
    expect(savedChar!.metadata.version).toBe('3.0')
    expect(savedChar!.metadata.inspirations).toEqual(['Gandalf', 'Obi-Wan', 'Dumbledore'])

    // Palette within metadata
    expect(savedChar!.metadata.palette).toBeDefined()
    expect(savedChar!.metadata.palette!.dominant).toBe('#ff0000')
    expect(savedChar!.metadata.palette!.vibrant).toBe('#00ff00')
    expect(savedChar!.metadata.palette!.muted).toBe('#0000ff')
    expect(savedChar!.metadata.palette!.colors).toEqual(['#ff0000', '#00ff00', '#0000ff', '#ffff00'])
  })

  it('SY-FV-002b: should upload character with complete canvasState', async () => {
    const project = createFullProject({ id: 'canvas-test-project' })
    await db.projects.add(project)

    const characterWithCanvas = createFullCharacter(project.id, {
      id: 'test-char-canvas',
      canvasState: {
        viewport: {
          x: 250,
          y: 350,
          zoom: 1.75,
        },
        items: [
          {
            id: 'item-1',
            imageId: 'img-abc',
            x: 100,
            y: 200,
            width: 400,
            height: 300,
            rotation: 45,
            zIndex: 1,
            locked: true,
          },
          {
            id: 'item-2',
            imageId: 'img-def',
            x: 500,
            y: 100,
            width: 200,
            height: 200,
            rotation: 0,
            zIndex: 2,
            locked: false,
          },
        ],
        updatedAt: new Date('2024-06-15T10:30:00Z'),
      },
    })

    await db.characters.add(characterWithCanvas)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    const savedChar = mockDriveCharacters.get(characterWithCanvas.id)
    expect(savedChar).toBeDefined()
    expect(savedChar!.canvasState).toBeDefined()

    // Viewport
    expect(savedChar!.canvasState!.viewport.x).toBe(250)
    expect(savedChar!.canvasState!.viewport.y).toBe(350)
    expect(savedChar!.canvasState!.viewport.zoom).toBe(1.75)

    // Items array
    expect(savedChar!.canvasState!.items).toHaveLength(2)

    // First item - all fields
    const item1 = savedChar!.canvasState!.items[0]
    expect(item1.id).toBe('item-1')
    expect(item1.imageId).toBe('img-abc')
    expect(item1.x).toBe(100)
    expect(item1.y).toBe(200)
    expect(item1.width).toBe(400)
    expect(item1.height).toBe(300)
    expect(item1.rotation).toBe(45)
    expect(item1.zIndex).toBe(1)
    expect(item1.locked).toBe(true)

    // Second item
    const item2 = savedChar!.canvasState!.items[1]
    expect(item2.id).toBe('item-2')
    expect(item2.locked).toBe(false)
  })

  it('SY-FV-002c: should download ALL character fields from remote', async () => {
    // Set up project in local DB
    const project = createFullProject({ id: 'char-download-project' })
    await db.projects.add(project)

    // Set up remote character with all fields
    const remoteCharacter = createFullCharacter(project.id, {
      id: 'test-char-download',
      name: 'Downloaded Hero',
      description: 'Character from remote',
      profile: {
        age: '25',
        role: 'Mage',
        personality: ['wise', 'patient'],
        abilities: ['fireball', 'teleport'],
        backstory: 'Trained in ancient arts.',
        customFields: { school: 'Academy of Fire' },
      },
      metadata: {
        palette: {
          dominant: '#ff5500',
          vibrant: '#55ff00',
          muted: '#5500ff',
          colors: ['#ff5500'],
        },
        archetype: 'The Sage',
        version: '1.5',
        inspirations: ['Merlin'],
      },
      canvasState: {
        viewport: { x: 50, y: 75, zoom: 2.0 },
        items: [
          { id: 'remote-item', imageId: 'remote-img', x: 10, y: 20, width: 100, height: 100, rotation: 0, zIndex: 0 },
        ],
        updatedAt: new Date('2024-07-01T12:00:00Z'),
      },
    })

    mockDriveCharacters.set(remoteCharacter.id, serializeDates(remoteCharacter))
    mockDriveManifest = createRemoteManifest({
      projects: {
        [project.id]: createItemMeta(project.id, 'proj-hash', project.updatedAt),
      },
      characters: {
        [remoteCharacter.id]: createItemMeta(remoteCharacter.id, 'char-hash', remoteCharacter.updatedAt),
      },
    })

    await syncService.performSync({ force: true })

    // Validate downloaded character
    const localChar = await db.characters.get(remoteCharacter.id)
    expect(localChar).toBeDefined()

    expect(localChar!.name).toBe('Downloaded Hero')
    expect(localChar!.description).toBe('Character from remote')

    // Profile
    expect(localChar!.profile.age).toBe('25')
    expect(localChar!.profile.role).toBe('Mage')
    expect(localChar!.profile.personality).toEqual(['wise', 'patient'])
    expect(localChar!.profile.abilities).toEqual(['fireball', 'teleport'])
    expect(localChar!.profile.customFields).toEqual({ school: 'Academy of Fire' })

    // Metadata
    expect(localChar!.metadata.archetype).toBe('The Sage')
    expect(localChar!.metadata.palette!.dominant).toBe('#ff5500')

    // Canvas state with proper date deserialization
    expect(localChar!.canvasState).toBeDefined()
    expect(localChar!.canvasState!.viewport.zoom).toBe(2.0)
    expect(localChar!.canvasState!.items).toHaveLength(1)
    expect(localChar!.canvasState!.updatedAt).toBeInstanceOf(Date)
  })
})

// =============================================================================
// SY-FV-003: MOODBOARD IMAGE FIELD VALIDATION
// =============================================================================

describe('Sync Field Validation - MoodboardImage (SY-FV-003)', () => {
  it('SY-FV-003a: should upload ALL image metadata fields (excluding local paths)', async () => {
    // Setup project and character
    const project = createFullProject({ id: 'img-test-project' })
    await db.projects.add(project)
    const character = createFullCharacter(project.id, { id: 'img-test-char' })
    await db.characters.add(character)

    // Create fully-populated image
    const localImage = createFullMoodboardImage(character.id, {
      id: 'test-image-upload',
      sectionId: 'section-123',
      filename: 'test-image-upload.webp',
      originalName: 'my-artwork.png',
      mimeType: 'image/webp',
      size: 512000,
      width: 2560,
      height: 1440,
      storagePath: 'opfs://images/test-image-upload.webp',
      thumbnailPath: 'opfs://thumbnails/test-image-upload.webp',
      palette: {
        dominant: '#123456',
        vibrant: '#654321',
        muted: '#abcdef',
        colors: ['#123456', '#654321', '#abcdef', '#fedcba', '#112233'],
      },
      tags: ['approved', 'final', 'hero-pose'],
      notes: 'This is the final approved artwork for the hero character pose.',
    })

    await db.images.add(localImage)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    // Validate the uploaded metadata
    const savedImageMeta = mockDriveImages.get(localImage.id)
    expect(savedImageMeta).toBeDefined()

    // Basic fields
    expect(savedImageMeta!.id).toBe(localImage.id)
    expect(savedImageMeta!.characterId).toBe(character.id)
    expect(savedImageMeta!.sectionId).toBe('section-123')
    expect(savedImageMeta!.filename).toBe('test-image-upload.webp')
    expect(savedImageMeta!.originalName).toBe('my-artwork.png')
    expect(savedImageMeta!.mimeType).toBe('image/webp')
    expect(savedImageMeta!.size).toBe(512000)
    expect(savedImageMeta!.width).toBe(2560)
    expect(savedImageMeta!.height).toBe(1440)
    expect(savedImageMeta!.tags).toEqual(['approved', 'final', 'hero-pose'])
    expect(savedImageMeta!.notes).toBe('This is the final approved artwork for the hero character pose.')

    // Palette (nested)
    expect(savedImageMeta!.palette).toBeDefined()
    expect(savedImageMeta!.palette!.dominant).toBe('#123456')
    expect(savedImageMeta!.palette!.vibrant).toBe('#654321')
    expect(savedImageMeta!.palette!.muted).toBe('#abcdef')
    expect(savedImageMeta!.palette!.colors).toEqual(['#123456', '#654321', '#abcdef', '#fedcba', '#112233'])

    // CRITICAL: Local-only fields should NOT be synced
    expect((savedImageMeta as Record<string, unknown>).storagePath).toBeUndefined()
    expect((savedImageMeta as Record<string, unknown>).thumbnailPath).toBeUndefined()
  })

  it('SY-FV-003b: should download image metadata and create local paths', async () => {
    // Setup project and character locally
    const project = createFullProject({ id: 'img-download-project' })
    await db.projects.add(project)
    const character = createFullCharacter(project.id, { id: 'img-download-char' })
    await db.characters.add(character)

    // Remote image metadata (no local paths)
    const remoteImageMeta: Omit<MoodboardImage, 'storagePath' | 'thumbnailPath'> = {
      id: 'test-image-download',
      characterId: character.id,
      sectionId: 'remote-section',
      filename: 'remote-image.webp',
      originalName: 'artwork-from-cloud.png',
      mimeType: 'image/webp',
      size: 768000,
      width: 1920,
      height: 1080,
      palette: {
        dominant: '#aabbcc',
        vibrant: '#ddeeff',
        muted: '#112233',
        colors: ['#aabbcc', '#ddeeff'],
      },
      tags: ['downloaded', 'cloud'],
      notes: 'Downloaded from remote device',
      createdAt: new Date('2024-05-01T08:00:00Z'),
    }

    // Set up remote image blob for download
    const imageBlob = new Blob(['fake-image-data'], { type: 'image/webp' })
    const thumbBlob = new Blob(['fake-thumb-data'], { type: 'image/webp' })
    mockDriveImages.set(remoteImageMeta.id, serializeDates(remoteImageMeta))
    mockDriveImageBlobs.set(remoteImageMeta.id, imageBlob)
    mockDriveThumbnailBlobs.set(remoteImageMeta.id, thumbBlob)

    mockDriveManifest = createRemoteManifest({
      projects: {
        [project.id]: createItemMeta(project.id, 'p-hash', project.updatedAt),
      },
      characters: {
        [character.id]: createItemMeta(character.id, 'c-hash', character.updatedAt),
      },
      images: {
        [remoteImageMeta.id]: createItemMeta(remoteImageMeta.id, 'i-hash', new Date()),
      },
    })

    await syncService.performSync({ force: true })

    // Validate downloaded image has ALL fields
    const localImage = await db.images.get(remoteImageMeta.id)
    expect(localImage).toBeDefined()

    expect(localImage!.id).toBe(remoteImageMeta.id)
    expect(localImage!.characterId).toBe(character.id)
    expect(localImage!.sectionId).toBe('remote-section')
    expect(localImage!.filename).toBe('remote-image.webp')
    expect(localImage!.originalName).toBe('artwork-from-cloud.png')
    expect(localImage!.mimeType).toBe('image/webp')
    expect(localImage!.size).toBe(768000)
    expect(localImage!.width).toBe(1920)
    expect(localImage!.height).toBe(1080)
    expect(localImage!.tags).toEqual(['downloaded', 'cloud'])
    expect(localImage!.notes).toBe('Downloaded from remote device')

    // Palette
    expect(localImage!.palette!.dominant).toBe('#aabbcc')
    expect(localImage!.palette!.colors).toEqual(['#aabbcc', '#ddeeff'])

    // CRITICAL: Local paths should be created during download
    expect(localImage!.storagePath).toBeDefined()
    expect(localImage!.thumbnailPath).toBeDefined()
    expect(localImage!.storagePath).toContain(remoteImageMeta.id)
    expect(localImage!.thumbnailPath).toContain(remoteImageMeta.id)

    // Date should be a Date object
    expect(localImage!.createdAt).toBeInstanceOf(Date)
  })
})

// =============================================================================
// SY-FV-004: EDITION FIELD VALIDATION
// =============================================================================

describe('Sync Field Validation - Edition (SY-FV-004)', () => {
  it('SY-FV-004a: should upload ALL edition fields including metadata', async () => {
    const project = createFullProject({ id: 'edition-test-project' })
    await db.projects.add(project)

    const localEdition = createFullEdition(project.id, {
      id: 'test-edition-upload',
      title: 'The Great Adventure - Issue #1',
      issueNumber: 1,
      volume: 2,
      synopsis: 'Our heroes embark on their greatest journey yet, facing challenges that will test their bonds.',
      coverDescription: 'Wide shot of the team standing on a cliff overlooking a vast kingdom at sunset.',
      coverImageId: 'edition-cover-img-123',
      status: 'review',
      metadata: {
        genre: 'Action Adventure',
        targetAudience: 'Teen (13+)',
        estimatedPageCount: 28,
        notes: 'Focus on character development in first half.',
      },
      sortOrder: 3,
    })

    await db.editions.add(localEdition)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    const savedEdition = mockDriveEditions.get(localEdition.id)
    expect(savedEdition).toBeDefined()

    // All fields
    expect(savedEdition!.id).toBe(localEdition.id)
    expect(savedEdition!.projectId).toBe(project.id)
    expect(savedEdition!.title).toBe('The Great Adventure - Issue #1')
    expect(savedEdition!.issueNumber).toBe(1)
    expect(savedEdition!.volume).toBe(2)
    expect(savedEdition!.synopsis).toBe('Our heroes embark on their greatest journey yet, facing challenges that will test their bonds.')
    expect(savedEdition!.coverDescription).toBe('Wide shot of the team standing on a cliff overlooking a vast kingdom at sunset.')
    expect(savedEdition!.coverImageId).toBe('edition-cover-img-123')
    expect(savedEdition!.status).toBe('review')
    expect(savedEdition!.sortOrder).toBe(3)

    // Metadata (nested)
    expect(savedEdition!.metadata).toBeDefined()
    expect(savedEdition!.metadata.genre).toBe('Action Adventure')
    expect(savedEdition!.metadata.targetAudience).toBe('Teen (13+)')
    expect(savedEdition!.metadata.estimatedPageCount).toBe(28)
    expect(savedEdition!.metadata.notes).toBe('Focus on character development in first half.')
  })

  it('SY-FV-004b: should download ALL edition fields from remote', async () => {
    const project = createFullProject({ id: 'edition-download-project' })
    await db.projects.add(project)

    const remoteEdition = createFullEdition(project.id, {
      id: 'test-edition-download',
      title: 'Downloaded Issue',
      issueNumber: 5,
      volume: 3,
      synopsis: 'Remote synopsis',
      coverDescription: 'Remote cover desc',
      coverImageId: 'remote-cover',
      status: 'complete',
      metadata: {
        genre: 'Horror',
        targetAudience: 'Mature',
        estimatedPageCount: 48,
        notes: 'Final issue of the arc',
      },
    })

    mockDriveEditions.set(remoteEdition.id, serializeDates(remoteEdition))
    mockDriveManifest = createRemoteManifest({
      projects: {
        [project.id]: createItemMeta(project.id, 'p-hash', project.updatedAt),
      },
      editions: {
        [remoteEdition.id]: createItemMeta(remoteEdition.id, 'e-hash', remoteEdition.updatedAt),
      },
    })

    await syncService.performSync({ force: true })

    const localEdition = await db.editions.get(remoteEdition.id)
    expect(localEdition).toBeDefined()

    expect(localEdition!.title).toBe('Downloaded Issue')
    expect(localEdition!.issueNumber).toBe(5)
    expect(localEdition!.volume).toBe(3)
    expect(localEdition!.synopsis).toBe('Remote synopsis')
    expect(localEdition!.coverDescription).toBe('Remote cover desc')
    expect(localEdition!.coverImageId).toBe('remote-cover')
    expect(localEdition!.status).toBe('complete')

    expect(localEdition!.metadata.genre).toBe('Horror')
    expect(localEdition!.metadata.targetAudience).toBe('Mature')
    expect(localEdition!.metadata.estimatedPageCount).toBe(48)

    expect(localEdition!.createdAt).toBeInstanceOf(Date)
    expect(localEdition!.updatedAt).toBeInstanceOf(Date)
  })

  it('SY-FV-004c: should handle all edition status types', async () => {
    const project = createFullProject({ id: 'edition-status-project' })
    await db.projects.add(project)

    const statuses = ['draft', 'in-progress', 'review', 'complete'] as const

    for (const status of statuses) {
      const edition = createFullEdition(project.id, {
        id: `edition-status-${status}`,
        title: `${status} Edition`,
        status,
      })
      await db.editions.add(edition)
    }

    mockDriveManifest = null
    await syncService.performSync({ force: true })

    for (const status of statuses) {
      const saved = mockDriveEditions.get(`edition-status-${status}`)
      expect(saved).toBeDefined()
      expect(saved!.status).toBe(status)
    }
  })
})

// =============================================================================
// SY-FV-005: SCRIPT PAGE FIELD VALIDATION
// =============================================================================

describe('Sync Field Validation - ScriptPage (SY-FV-005)', () => {
  it('SY-FV-005a: should upload ALL script page fields', async () => {
    const project = createFullProject({ id: 'page-test-project' })
    await db.projects.add(project)
    const edition = createFullEdition(project.id, { id: 'page-test-edition' })
    await db.editions.add(edition)

    const localPage = createFullScriptPage(edition.id, {
      id: 'test-page-upload',
      pageNumber: 7,
      title: 'The Revelation',
      goal: 'Reveal the main villain identity and set up the final confrontation',
      setting: 'Ancient temple ruins, crumbling pillars, moonlight streaming through gaps',
      timeOfDay: 'Midnight, full moon',
      mood: 'Tense, foreboding, dramatic',
      notes: 'Use heavy shadows. The reveal should be in the last panel for maximum impact.',
      status: 'review',
      sortOrder: 6,
    })

    await db.scriptPages.add(localPage)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    const savedPage = mockDriveScriptPages.get(localPage.id)
    expect(savedPage).toBeDefined()

    expect(savedPage!.id).toBe(localPage.id)
    expect(savedPage!.editionId).toBe(edition.id)
    expect(savedPage!.pageNumber).toBe(7)
    expect(savedPage!.title).toBe('The Revelation')
    expect(savedPage!.goal).toBe('Reveal the main villain identity and set up the final confrontation')
    expect(savedPage!.setting).toBe('Ancient temple ruins, crumbling pillars, moonlight streaming through gaps')
    expect(savedPage!.timeOfDay).toBe('Midnight, full moon')
    expect(savedPage!.mood).toBe('Tense, foreboding, dramatic')
    expect(savedPage!.notes).toBe('Use heavy shadows. The reveal should be in the last panel for maximum impact.')
    expect(savedPage!.status).toBe('review')
    expect(savedPage!.sortOrder).toBe(6)
  })

  it('SY-FV-005b: should download ALL script page fields from remote', async () => {
    const project = createFullProject({ id: 'page-download-project' })
    await db.projects.add(project)
    const edition = createFullEdition(project.id, { id: 'page-download-edition' })
    await db.editions.add(edition)

    const remotePage = createFullScriptPage(edition.id, {
      id: 'test-page-download',
      pageNumber: 12,
      title: 'Remote Page Title',
      goal: 'Remote goal description',
      setting: 'Remote setting',
      timeOfDay: 'Dusk',
      mood: 'Melancholic',
      notes: 'Remote notes',
      status: 'approved',
      sortOrder: 11,
    })

    mockDriveScriptPages.set(remotePage.id, serializeDates(remotePage))
    mockDriveManifest = createRemoteManifest({
      projects: { [project.id]: createItemMeta(project.id, 'p', project.updatedAt) },
      editions: { [edition.id]: createItemMeta(edition.id, 'e', edition.updatedAt) },
      scriptPages: { [remotePage.id]: createItemMeta(remotePage.id, 'sp', remotePage.updatedAt) },
    })

    await syncService.performSync({ force: true })

    const localPage = await db.scriptPages.get(remotePage.id)
    expect(localPage).toBeDefined()

    expect(localPage!.pageNumber).toBe(12)
    expect(localPage!.title).toBe('Remote Page Title')
    expect(localPage!.goal).toBe('Remote goal description')
    expect(localPage!.setting).toBe('Remote setting')
    expect(localPage!.timeOfDay).toBe('Dusk')
    expect(localPage!.mood).toBe('Melancholic')
    expect(localPage!.notes).toBe('Remote notes')
    expect(localPage!.status).toBe('approved')
    expect(localPage!.sortOrder).toBe(11)

    expect(localPage!.createdAt).toBeInstanceOf(Date)
    expect(localPage!.updatedAt).toBeInstanceOf(Date)
  })

  it('SY-FV-005c: should handle all page status types', async () => {
    const project = createFullProject({ id: 'page-status-project' })
    await db.projects.add(project)
    const edition = createFullEdition(project.id, { id: 'page-status-edition' })
    await db.editions.add(edition)

    const statuses = ['draft', 'scripted', 'review', 'approved'] as const

    for (let i = 0; i < statuses.length; i++) {
      const page = createFullScriptPage(edition.id, {
        id: `page-status-${statuses[i]}`,
        pageNumber: i + 1,
        status: statuses[i],
      })
      await db.scriptPages.add(page)
    }

    mockDriveManifest = null
    await syncService.performSync({ force: true })

    for (const status of statuses) {
      const saved = mockDriveScriptPages.get(`page-status-${status}`)
      expect(saved).toBeDefined()
      expect(saved!.status).toBe(status)
    }
  })
})

// =============================================================================
// SY-FV-006: PANEL FIELD VALIDATION
// =============================================================================

describe('Sync Field Validation - Panel (SY-FV-006)', () => {
  it('SY-FV-006a: should upload ALL panel fields including dialogues array', async () => {
    const project = createFullProject({ id: 'panel-test-project' })
    await db.projects.add(project)
    const edition = createFullEdition(project.id, { id: 'panel-test-edition' })
    await db.editions.add(edition)
    const page = createFullScriptPage(edition.id, { id: 'panel-test-page' })
    await db.scriptPages.add(page)

    const localPanel = createFullPanel(page.id, {
      id: 'test-panel-upload',
      panelNumber: 3,
      description: 'Close-up of protagonist face, sweat dripping, eyes wide with realization.',
      cameraAngle: 'Extreme close-up, slight dutch angle, dramatic lighting from below',
      characters: ['Hero', 'Villain (reflection in eyes)'],
      notes: 'This is the pivotal moment. Take extra care with facial expression.',
      dialogues: [
        {
          id: 'dlg-upload-1',
          characterId: 'char-hero-123',
          characterName: 'Hero',
          type: 'speech',
          text: 'It was you... all along.',
          direction: '(voice breaking, barely a whisper)',
          sortOrder: 0,
        },
        {
          id: 'dlg-upload-2',
          characterId: 'char-villain-456',
          characterName: 'Villain',
          type: 'speech',
          text: 'Surprised? You always were naive.',
          direction: '(smirking, cold)',
          sortOrder: 1,
        },
        {
          id: 'dlg-upload-3',
          characterId: undefined,
          characterName: 'SFX',
          type: 'sfx',
          text: 'CRACK!',
          direction: undefined,
          sortOrder: 2,
        },
        {
          id: 'dlg-upload-4',
          characterId: undefined,
          characterName: 'Narrator',
          type: 'caption',
          text: 'In that moment, everything changed.',
          direction: undefined,
          sortOrder: 3,
        },
      ],
      sortOrder: 2,
    })

    await db.panels.add(localPanel)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    const savedPanel = mockDrivePanels.get(localPanel.id)
    expect(savedPanel).toBeDefined()

    // Basic fields
    expect(savedPanel!.id).toBe(localPanel.id)
    expect(savedPanel!.pageId).toBe(page.id)
    expect(savedPanel!.panelNumber).toBe(3)
    expect(savedPanel!.description).toBe('Close-up of protagonist face, sweat dripping, eyes wide with realization.')
    expect(savedPanel!.cameraAngle).toBe('Extreme close-up, slight dutch angle, dramatic lighting from below')
    expect(savedPanel!.characters).toEqual(['Hero', 'Villain (reflection in eyes)'])
    expect(savedPanel!.notes).toBe('This is the pivotal moment. Take extra care with facial expression.')
    expect(savedPanel!.sortOrder).toBe(2)

    // Dialogues array - validate each dialogue completely
    expect(savedPanel!.dialogues).toHaveLength(4)

    // Dialogue 1 - speech with characterId
    const dlg1 = savedPanel!.dialogues[0]
    expect(dlg1.id).toBe('dlg-upload-1')
    expect(dlg1.characterId).toBe('char-hero-123')
    expect(dlg1.characterName).toBe('Hero')
    expect(dlg1.type).toBe('speech')
    expect(dlg1.text).toBe('It was you... all along.')
    expect(dlg1.direction).toBe('(voice breaking, barely a whisper)')
    expect(dlg1.sortOrder).toBe(0)

    // Dialogue 2 - speech with different character
    const dlg2 = savedPanel!.dialogues[1]
    expect(dlg2.characterId).toBe('char-villain-456')
    expect(dlg2.type).toBe('speech')

    // Dialogue 3 - SFX (no characterId)
    const dlg3 = savedPanel!.dialogues[2]
    expect(dlg3.characterId).toBeUndefined()
    expect(dlg3.type).toBe('sfx')
    expect(dlg3.text).toBe('CRACK!')

    // Dialogue 4 - caption/narration
    const dlg4 = savedPanel!.dialogues[3]
    expect(dlg4.type).toBe('caption')
  })

  it('SY-FV-006b: should download ALL panel fields from remote', async () => {
    const project = createFullProject({ id: 'panel-download-project' })
    await db.projects.add(project)
    const edition = createFullEdition(project.id, { id: 'panel-download-edition' })
    await db.editions.add(edition)
    const page = createFullScriptPage(edition.id, { id: 'panel-download-page' })
    await db.scriptPages.add(page)

    const remotePanel = createFullPanel(page.id, {
      id: 'test-panel-download',
      panelNumber: 5,
      description: 'Remote panel description',
      cameraAngle: 'Wide shot',
      characters: ['Character A', 'Character B'],
      notes: 'Remote notes',
      dialogues: [
        {
          id: 'remote-dlg-1',
          characterId: 'remote-char-1',
          characterName: 'Character A',
          type: 'thought',
          text: 'What should I do?',
          direction: '(nervous)',
          sortOrder: 0,
        },
        {
          id: 'remote-dlg-2',
          characterId: undefined,
          characterName: 'Narrator',
          type: 'narration',
          text: 'The choice was clear.',
          direction: undefined,
          sortOrder: 1,
        },
      ],
      sortOrder: 4,
    })

    mockDrivePanels.set(remotePanel.id, serializeDates(remotePanel))
    mockDriveManifest = createRemoteManifest({
      projects: { [project.id]: createItemMeta(project.id, 'p', project.updatedAt) },
      editions: { [edition.id]: createItemMeta(edition.id, 'e', edition.updatedAt) },
      scriptPages: { [page.id]: createItemMeta(page.id, 'sp', page.updatedAt) },
      panels: { [remotePanel.id]: createItemMeta(remotePanel.id, 'pn', remotePanel.updatedAt) },
    })

    await syncService.performSync({ force: true })

    const localPanel = await db.panels.get(remotePanel.id)
    expect(localPanel).toBeDefined()

    expect(localPanel!.panelNumber).toBe(5)
    expect(localPanel!.description).toBe('Remote panel description')
    expect(localPanel!.cameraAngle).toBe('Wide shot')
    expect(localPanel!.characters).toEqual(['Character A', 'Character B'])
    expect(localPanel!.notes).toBe('Remote notes')
    expect(localPanel!.sortOrder).toBe(4)

    // Dialogues
    expect(localPanel!.dialogues).toHaveLength(2)
    expect(localPanel!.dialogues[0].type).toBe('thought')
    expect(localPanel!.dialogues[0].characterId).toBe('remote-char-1')
    expect(localPanel!.dialogues[1].type).toBe('narration')
    expect(localPanel!.dialogues[1].characterId).toBeUndefined()

    expect(localPanel!.createdAt).toBeInstanceOf(Date)
    expect(localPanel!.updatedAt).toBeInstanceOf(Date)
  })

  it('SY-FV-006c: should handle all dialogue types', async () => {
    const project = createFullProject({ id: 'dlg-type-project' })
    await db.projects.add(project)
    const edition = createFullEdition(project.id, { id: 'dlg-type-edition' })
    await db.editions.add(edition)
    const page = createFullScriptPage(edition.id, { id: 'dlg-type-page' })
    await db.scriptPages.add(page)

    const dialogueTypes = ['speech', 'thought', 'caption', 'sfx', 'narration', 'whisper'] as const

    const panel = createFullPanel(page.id, {
      id: 'test-panel-all-types',
      dialogues: dialogueTypes.map((type, index) => ({
        id: `dlg-type-${type}`,
        characterId: type !== 'caption' && type !== 'sfx' && type !== 'narration' ? `char-${type}` : undefined,
        characterName: type === 'sfx' ? 'SFX' : type === 'caption' || type === 'narration' ? 'Narrator' : 'Speaker',
        type,
        text: `This is ${type} text`,
        direction: type === 'speech' || type === 'whisper' ? '(direction)' : undefined,
        sortOrder: index,
      })),
    })

    await db.panels.add(panel)
    mockDriveManifest = null

    await syncService.performSync({ force: true })

    const savedPanel = mockDrivePanels.get(panel.id)
    expect(savedPanel).toBeDefined()
    expect(savedPanel!.dialogues).toHaveLength(6)

    // Verify each dialogue type was saved correctly
    for (const type of dialogueTypes) {
      const dlg = savedPanel!.dialogues.find(d => d.type === type)
      expect(dlg).toBeDefined()
      expect(dlg!.type).toBe(type)
      expect(dlg!.text).toBe(`This is ${type} text`)
    }
  })
})

// =============================================================================
// SY-FV-007: COMPLETE ENTITY GRAPH VALIDATION
// =============================================================================

describe('Sync Field Validation - Complete Entity Graph (SY-FV-007)', () => {
  it('SY-FV-007a: should sync complete entity graph with all relationships intact', async () => {
    // Create the complete interconnected entity graph
    const graph = createCompleteEntityGraph()

    // Add all entities to local DB
    await db.projects.add(graph.project)
    for (const char of graph.characters) {
      await db.characters.add(char)
    }
    for (const img of graph.images) {
      await db.images.add(img)
    }
    for (const edition of graph.editions) {
      await db.editions.add(edition)
    }
    for (const page of graph.scriptPages) {
      await db.scriptPages.add(page)
    }
    for (const panel of graph.panels) {
      await db.panels.add(panel)
    }

    mockDriveManifest = null

    await syncService.performSync({ force: true })

    // Verify all entities were uploaded
    expect(mockDriveProjects.size).toBe(1)
    expect(mockDriveCharacters.size).toBe(2)
    expect(mockDriveImages.size).toBe(3)
    expect(mockDriveEditions.size).toBe(1)
    expect(mockDriveScriptPages.size).toBe(2)
    expect(mockDrivePanels.size).toBe(3)

    // Verify project → character relationship
    const syncedProject = mockDriveProjects.get(graph.project.id)
    expect(syncedProject).toBeDefined()
    expect(syncedProject!.coverImageId).toBe('graph-image-1')

    // Verify character → project FK
    const syncedChar1 = mockDriveCharacters.get(graph.characters[0].id)
    expect(syncedChar1!.projectId).toBe(graph.project.id)

    // Verify character canvasState references real images
    expect(syncedChar1!.canvasState!.items[0].imageId).toBe('graph-image-1')
    expect(syncedChar1!.canvasState!.items[1].imageId).toBe('graph-image-2')

    // Verify image → character FK
    const syncedImg1 = mockDriveImages.get(graph.images[0].id)
    expect(syncedImg1!.characterId).toBe(graph.characters[0].id)

    // Verify edition → project FK
    const syncedEdition = mockDriveEditions.get(graph.editions[0].id)
    expect(syncedEdition!.projectId).toBe(graph.project.id)
    expect(syncedEdition!.coverImageId).toBe('graph-image-1')

    // Verify page → edition FK
    const syncedPage1 = mockDriveScriptPages.get(graph.scriptPages[0].id)
    expect(syncedPage1!.editionId).toBe(graph.editions[0].id)

    // Verify panel → page FK
    const syncedPanel1 = mockDrivePanels.get(graph.panels[0].id)
    expect(syncedPanel1!.pageId).toBe(graph.scriptPages[0].id)

    // Verify dialogue → character references
    expect(syncedPanel1!.dialogues[0].characterId).toBe(graph.characters[0].id)
    expect(syncedPanel1!.dialogues[1].characterId).toBe(graph.characters[1].id)
  })

  it('SY-FV-007b: should download complete entity graph maintaining referential integrity', async () => {
    // Set up complete entity graph on remote
    const graph = createCompleteEntityGraph()

    mockDriveProjects.set(graph.project.id, serializeDates(graph.project))
    for (const char of graph.characters) {
      mockDriveCharacters.set(char.id, serializeDates(char))
    }
    for (const img of graph.images) {
      // Remote doesn't have local paths
      const { storagePath, thumbnailPath, ...remoteMeta } = img
      mockDriveImages.set(img.id, serializeDates(remoteMeta))
      mockDriveImageBlobs.set(img.id, new Blob(['data'], { type: 'image/webp' }))
      mockDriveThumbnailBlobs.set(img.id, new Blob(['thumb'], { type: 'image/webp' }))
    }
    for (const edition of graph.editions) {
      mockDriveEditions.set(edition.id, serializeDates(edition))
    }
    for (const page of graph.scriptPages) {
      mockDriveScriptPages.set(page.id, serializeDates(page))
    }
    for (const panel of graph.panels) {
      mockDrivePanels.set(panel.id, serializeDates(panel))
    }

    // Create manifest with all entities
    mockDriveManifest = createRemoteManifest({
      projects: {
        [graph.project.id]: createItemMeta(graph.project.id, 'p', graph.project.updatedAt),
      },
      characters: Object.fromEntries(
        graph.characters.map(c => [c.id, createItemMeta(c.id, `c-${c.id}`, c.updatedAt)])
      ),
      images: Object.fromEntries(
        graph.images.map(i => [i.id, createItemMeta(i.id, `i-${i.id}`, i.createdAt)])
      ),
      editions: Object.fromEntries(
        graph.editions.map(e => [e.id, createItemMeta(e.id, `e-${e.id}`, e.updatedAt)])
      ),
      scriptPages: Object.fromEntries(
        graph.scriptPages.map(sp => [sp.id, createItemMeta(sp.id, `sp-${sp.id}`, sp.updatedAt)])
      ),
      panels: Object.fromEntries(
        graph.panels.map(pn => [pn.id, createItemMeta(pn.id, `pn-${pn.id}`, pn.updatedAt)])
      ),
    })

    await syncService.performSync({ force: true })

    // Verify all entities were downloaded
    const localProject = await db.projects.get(graph.project.id)
    expect(localProject).toBeDefined()
    expect(localProject!.coverImageId).toBe('graph-image-1')

    const localChars = await db.characters.where('projectId').equals(graph.project.id).toArray()
    expect(localChars).toHaveLength(2)

    const localImages = await db.images.toArray()
    expect(localImages).toHaveLength(3)

    // Verify FK relationships are intact
    const heroChar = localChars.find(c => c.name === 'Hero')
    expect(heroChar).toBeDefined()
    expect(heroChar!.projectId).toBe(graph.project.id)
    expect(heroChar!.canvasState!.items[0].imageId).toBe('graph-image-1')

    const heroImages = localImages.filter(i => i.characterId === heroChar!.id)
    expect(heroImages).toHaveLength(2)

    const localEdition = await db.editions.get(graph.editions[0].id)
    expect(localEdition!.projectId).toBe(graph.project.id)

    const localPages = await db.scriptPages.where('editionId').equals(localEdition!.id).toArray()
    expect(localPages).toHaveLength(2)

    const localPanels = await db.panels.toArray()
    expect(localPanels).toHaveLength(3)

    // Verify panel dialogues maintain character references
    const panel1 = localPanels.find(p => p.id === 'graph-panel-1')
    expect(panel1!.dialogues[0].characterId).toBe('graph-char-1')
    expect(panel1!.dialogues[1].characterId).toBe('graph-char-2')
  })

  it('SY-FV-007c: should handle bidirectional sync preserving all entity fields', async () => {
    // Local has a project with character
    const localProject = createFullProject({
      id: 'bidir-project',
      name: 'Local Project',
      genre: 'Comedy',
    })
    const localCharacter = createFullCharacter(localProject.id, {
      id: 'bidir-local-char',
      name: 'Local Character',
    })

    await db.projects.add(localProject)
    await db.characters.add(localCharacter)

    // Remote has the same project but different character
    const remoteCharacter = createFullCharacter(localProject.id, {
      id: 'bidir-remote-char',
      name: 'Remote Character',
      profile: {
        age: '40',
        role: 'Mentor',
        personality: ['wise'],
        abilities: ['teaching'],
        backstory: 'From the cloud',
      },
    })

    mockDriveCharacters.set(remoteCharacter.id, serializeDates(remoteCharacter))

    mockDriveManifest = createRemoteManifest({
      lastModifiedDeviceId: 'different-device',
      characters: {
        [remoteCharacter.id]: createItemMeta(remoteCharacter.id, 'rc-hash', remoteCharacter.updatedAt),
      },
    })

    await syncService.performSync({ force: true })

    // Both characters should exist locally
    const allLocalChars = await db.characters.where('projectId').equals(localProject.id).toArray()
    expect(allLocalChars).toHaveLength(2)

    const downloadedChar = await db.characters.get(remoteCharacter.id)
    expect(downloadedChar).toBeDefined()
    expect(downloadedChar!.name).toBe('Remote Character')
    expect(downloadedChar!.profile.role).toBe('Mentor')
    expect(downloadedChar!.profile.personality).toEqual(['wise'])

    // Local character should have been uploaded
    const uploadedChar = mockDriveCharacters.get(localCharacter.id)
    expect(uploadedChar).toBeDefined()
    expect(uploadedChar!.name).toBe('Local Character')
  })
})
