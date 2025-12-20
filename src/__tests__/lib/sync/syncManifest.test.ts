/**
 * SyncManifest Test Suite
 *
 * Tests for: src/lib/sync/syncManifest.ts
 * Reference: TEST_CASES.md - Sync Manifest (SM-001 to SM-047)
 *
 * ============================================================================
 * ARCHITECTURE
 * ============================================================================
 *
 * SyncManifestService:
 * - Builds manifests from local IndexedDB data
 * - Compares local/remote manifests to produce SyncDelta
 * - Uses SHA-256 hashing (via hash.ts) for content comparison
 * - Uses device identification (via deviceId.ts) for conflict attribution
 *
 * ============================================================================
 * MOCKING STRATEGY
 * ============================================================================
 *
 * - IndexedDB: Uses fake-indexeddb via setup.ts (actual database operations)
 * - localStorage: Mock for deleted items and version storage
 * - deviceId: Mock getDeviceId/getDeviceName for predictable values
 * - hash.ts: Uses real implementation (crypto.subtle provided by JSDOM)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncManifest } from '@/lib/sync/syncManifest';
import { db } from '@/lib/db/database';
import { hashObject } from '@/lib/sync/hash';
import type { SyncManifest, ItemSyncMeta, DeletedItemRecord, SyncDelta } from '@/lib/sync/types';
import { SYNC_CONSTANTS, EMPTY_MANIFEST } from '@/lib/sync/types';

// =============================================================================
// MOCK SETUP
// =============================================================================

// Mock deviceId module for predictable device identification
vi.mock('@/lib/sync/deviceId', () => ({
  getDeviceId: vi.fn(() => 'test-device-id'),
  getDeviceName: vi.fn(() => 'Test Device'),
}));

import { getDeviceId, getDeviceName } from '@/lib/sync/deviceId';

// Mock localStorage
const mockStorage: Map<string, string> = new Map();

const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
  clear: vi.fn(() => mockStorage.clear()),
};

// Store original localStorage
const originalLocalStorage = globalThis.localStorage;

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

function createMockProject(overrides: Partial<{
  id: string;
  name: string;
  description: string;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Project',
    description: overrides.description ?? 'A test project',
    genre: 'Fantasy',
    theme: 'Adventure',
    tags: ['tag1', 'tag2'],
    settings: {
      defaultView: 'grid' as const,
      gridColumns: 4,
      canvasBackground: '#ffffff',
    },
    isArchived: false,
    createdAt: now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function createMockCharacter(projectId: string, overrides: Partial<{
  id: string;
  name: string;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    projectId,
    name: overrides.name ?? 'Test Character',
    role: 'protagonist' as const,
    archetype: 'Hero',
    description: 'A brave hero',
    tags: [],
    order: 0,
    isArchived: false,
    createdAt: now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function createMockImage(characterId: string, overrides: Partial<{
  id: string;
  originalName: string;
  storagePath?: string;
  thumbnailPath?: string;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    characterId,
    sectionId: undefined,
    filename: 'image.jpg',
    originalName: overrides.originalName ?? 'original.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    width: 800,
    height: 600,
    storagePath: overrides.storagePath ?? 'opfs://images/test',
    thumbnailPath: overrides.thumbnailPath ?? 'opfs://thumbnails/test',
    palette: {
      dominant: '#ff0000',
      vibrant: '#00ff00',
      muted: '#888888',
      colors: ['#ff0000', '#00ff00', '#0000ff'],
    },
    tags: [] as string[],
    notes: '',
    createdAt: now,
  };
}

function createMockEdition(projectId: string, overrides: Partial<{
  id: string;
  title: string;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    projectId,
    title: overrides.title ?? 'Test Edition',
    volume: 1,
    status: 'draft' as const,
    createdAt: now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function createMockScriptPage(editionId: string, overrides: Partial<{
  id: string;
  pageNumber: number;
  title: string;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    editionId,
    pageNumber: overrides.pageNumber ?? 1,
    title: overrides.title ?? 'Page 1',
    order: 0,
    createdAt: now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

function createMockPanel(pageId: string, overrides: Partial<{
  id: string;
  panelNumber: number;
  updatedAt: Date;
}> = {}) {
  const now = new Date();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    pageId,
    panelNumber: overrides.panelNumber ?? 1,
    description: 'A panel',
    dialogues: [
      { id: 'dlg1', characterId: 'char1', characterName: 'Hero', type: 'speech' as const, text: 'Hello', sortOrder: 0 },
    ],
    sortOrder: 0,
    createdAt: now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * Create a minimal manifest for testing
 */
function createTestManifest(overrides: Partial<SyncManifest> = {}): SyncManifest {
  return {
    version: 1,
    schemaVersion: SYNC_CONSTANTS.SCHEMA_VERSION,
    lastModified: new Date().toISOString(),
    lastModifiedDeviceId: 'test-device-id',
    lastModifiedDeviceName: 'Test Device',
    projects: {},
    characters: {},
    images: {},
    editions: {},
    scriptPages: {},
    panels: {},
    deletedItems: [],
    ...overrides,
  };
}

/**
 * Create an ItemSyncMeta for testing
 */
function createItemMeta(id: string, hash: string, updatedAt: Date, version = 1): ItemSyncMeta {
  return {
    id,
    hash,
    updatedAt: updatedAt.toISOString(),
    version,
  };
}

// =============================================================================
// TEST SETUP
// =============================================================================

beforeEach(() => {
  // Reset localStorage mock
  mockStorage.clear();
  vi.clearAllMocks();

  // Apply localStorage mock
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  // Restore original localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
    configurable: true,
  });
});

// =============================================================================
// buildLocalManifest TESTS (SM-001 to SM-010)
// =============================================================================

describe('SyncManifest - buildLocalManifest', () => {
  it('SM-001: buildLocalManifest - empty database should return manifest with empty collections', async () => {
    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.projects).toEqual({});
    expect(manifest.characters).toEqual({});
    expect(manifest.images).toEqual({});
    expect(manifest.editions).toEqual({});
    expect(manifest.scriptPages).toEqual({});
    expect(manifest.panels).toEqual({});
    expect(manifest.deletedItems).toEqual([]);
  });

  it('SM-002: buildLocalManifest - with projects should include all projects with correct hashes', async () => {
    const project1 = createMockProject({ id: 'proj-1', name: 'Project 1' });
    const project2 = createMockProject({ id: 'proj-2', name: 'Project 2' });

    await db.projects.bulkAdd([project1, project2]);

    const manifest = await syncManifest.buildLocalManifest();

    expect(Object.keys(manifest.projects)).toHaveLength(2);
    expect(manifest.projects['proj-1']).toBeDefined();
    expect(manifest.projects['proj-2']).toBeDefined();
    expect(manifest.projects['proj-1'].id).toBe('proj-1');
    expect(manifest.projects['proj-2'].id).toBe('proj-2');

    // Verify hash is consistent
    const expectedHash = await hashObject(project1);
    expect(manifest.projects['proj-1'].hash).toBe(expectedHash);
  });

  it('SM-003: buildLocalManifest - with characters should include all characters with correct hashes', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const char1 = createMockCharacter('proj-1', { id: 'char-1', name: 'Hero' });
    const char2 = createMockCharacter('proj-1', { id: 'char-2', name: 'Villain' });
    await db.characters.bulkAdd([char1, char2]);

    const manifest = await syncManifest.buildLocalManifest();

    expect(Object.keys(manifest.characters)).toHaveLength(2);
    expect(manifest.characters['char-1']).toBeDefined();
    expect(manifest.characters['char-2']).toBeDefined();

    const expectedHash = await hashObject(char1);
    expect(manifest.characters['char-1'].hash).toBe(expectedHash);
  });

  it('SM-004: buildLocalManifest - with images should exclude local-only fields from hash', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const char = createMockCharacter('proj-1', { id: 'char-1' });
    await db.characters.add(char);

    // Create an image with specific local paths
    const image = createMockImage('char-1', {
      id: 'img-1',
      originalName: 'test-image.jpg',
      storagePath: 'opfs://images/path-A',
      thumbnailPath: 'opfs://thumbnails/thumb-A',
    });
    await db.images.add(image);

    const manifest1 = await syncManifest.buildLocalManifest();
    const hash1 = manifest1.images['img-1'].hash;

    // Update ONLY local paths (storagePath and thumbnailPath)
    // These are local-only fields and should NOT affect the hash
    await db.images.update('img-1', {
      storagePath: 'opfs://images/path-B-completely-different',
      thumbnailPath: 'opfs://thumbnails/thumb-B-completely-different',
    });

    const manifest2 = await syncManifest.buildLocalManifest();
    const hash2 = manifest2.images['img-1'].hash;

    // Hash should be IDENTICAL because local paths are excluded from hashing
    expect(hash1).toBe(hash2);
  });

  it('SM-005: buildLocalManifest - with editions should include editions with correct hashes', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const edition = createMockEdition('proj-1', { id: 'ed-1', title: 'Volume 1' });
    await db.editions.add(edition);

    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.editions['ed-1']).toBeDefined();
    const expectedHash = await hashObject(edition);
    expect(manifest.editions['ed-1'].hash).toBe(expectedHash);
  });

  it('SM-006: buildLocalManifest - with scriptPages should include script pages with correct hashes', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const edition = createMockEdition('proj-1', { id: 'ed-1' });
    await db.editions.add(edition);

    const page = createMockScriptPage('ed-1', { id: 'page-1', pageNumber: 1 });
    await db.scriptPages.add(page);

    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.scriptPages['page-1']).toBeDefined();
    const expectedHash = await hashObject(page);
    expect(manifest.scriptPages['page-1'].hash).toBe(expectedHash);
  });

  it('SM-007: buildLocalManifest - with panels should include nested dialogues in hash', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const edition = createMockEdition('proj-1', { id: 'ed-1' });
    await db.editions.add(edition);

    const page = createMockScriptPage('ed-1', { id: 'page-1' });
    await db.scriptPages.add(page);

    // Create two panels with same base data but DIFFERENT dialogues
    // This tests that dialogues actually affect the hash
    const sharedUpdatedAt = new Date();

    const panel1 = createMockPanel('page-1', { id: 'panel-1', panelNumber: 1 });
    panel1.updatedAt = sharedUpdatedAt;
    panel1.dialogues = [
      { id: 'dlg1', characterId: 'char1', characterName: 'Hero', type: 'speech' as const, text: 'Hello', sortOrder: 0 },
    ];

    const panel2 = createMockPanel('page-1', { id: 'panel-2', panelNumber: 1 });
    panel2.updatedAt = sharedUpdatedAt;
    panel2.description = panel1.description; // Same description
    panel2.sortOrder = panel1.sortOrder; // Same sortOrder
    panel2.dialogues = [
      { id: 'dlg1', characterId: 'char1', characterName: 'Hero', type: 'speech' as const, text: 'Goodbye', sortOrder: 0 }, // DIFFERENT text
    ];

    await db.panels.bulkAdd([panel1, panel2]);

    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.panels['panel-1']).toBeDefined();
    expect(manifest.panels['panel-2']).toBeDefined();

    // Hashes should be DIFFERENT because dialogues differ
    expect(manifest.panels['panel-1'].hash).not.toBe(manifest.panels['panel-2'].hash);
  });

  it('SM-008: buildLocalManifest - version increment should increment from stored local version', async () => {
    // Set initial version
    mockStorage.set('moodboard-sync-version', '5');

    const manifest = await syncManifest.buildLocalManifest();

    // Should be stored version + 1
    expect(manifest.version).toBe(6);
  });

  it('SM-009: buildLocalManifest - device attribution should include current deviceId and deviceName', async () => {
    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.lastModifiedDeviceId).toBe('test-device-id');
    expect(manifest.lastModifiedDeviceName).toBe('Test Device');
    expect(getDeviceId).toHaveBeenCalled();
    expect(getDeviceName).toHaveBeenCalled();
  });

  it('SM-010: buildLocalManifest - timestamp should set lastModified to current ISO timestamp', async () => {
    const before = new Date().toISOString();
    const manifest = await syncManifest.buildLocalManifest();
    const after = new Date().toISOString();

    expect(manifest.lastModified).toBeDefined();
    expect(manifest.lastModified >= before).toBe(true);
    expect(manifest.lastModified <= after).toBe(true);
  });
});

// =============================================================================
// HASH INTEGRITY TESTS (SM-048 to SM-051)
// These tests verify that content changes actually produce different hashes.
// This is critical - without these, hash tests could pass even if hashObject
// returned a constant value.
// =============================================================================

describe('SyncManifest - Hash Integrity', () => {
  it('SM-048: project content change should produce different hash', async () => {
    const project = createMockProject({ id: 'proj-1', name: 'Original Name' });
    await db.projects.add(project);

    const manifest1 = await syncManifest.buildLocalManifest();
    const hash1 = manifest1.projects['proj-1'].hash;

    // Change the project name
    await db.projects.update('proj-1', { name: 'Changed Name' });

    const manifest2 = await syncManifest.buildLocalManifest();
    const hash2 = manifest2.projects['proj-1'].hash;

    // Hashes MUST be different when content changes
    expect(hash1).not.toBe(hash2);
  });

  it('SM-049: character content change should produce different hash', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const char = createMockCharacter('proj-1', { id: 'char-1', name: 'Original' });
    await db.characters.add(char);

    const manifest1 = await syncManifest.buildLocalManifest();
    const hash1 = manifest1.characters['char-1'].hash;

    // Change the character name
    await db.characters.update('char-1', { name: 'Changed' });

    const manifest2 = await syncManifest.buildLocalManifest();
    const hash2 = manifest2.characters['char-1'].hash;

    expect(hash1).not.toBe(hash2);
  });

  it('SM-050: image metadata change should produce different hash', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const char = createMockCharacter('proj-1', { id: 'char-1' });
    await db.characters.add(char);

    const image = createMockImage('char-1', { id: 'img-1', originalName: 'original.jpg' });
    await db.images.add(image);

    const manifest1 = await syncManifest.buildLocalManifest();
    const hash1 = manifest1.images['img-1'].hash;

    // Change image notes (metadata that affects hash)
    await db.images.update('img-1', { notes: 'New notes added' });

    const manifest2 = await syncManifest.buildLocalManifest();
    const hash2 = manifest2.images['img-1'].hash;

    expect(hash1).not.toBe(hash2);
  });

  it('SM-051: identical content should produce identical hash (deterministic)', async () => {
    // Create two projects with identical content
    const now = new Date();

    const project1 = createMockProject({ id: 'proj-1', name: 'Same Name' });
    project1.createdAt = now;
    project1.updatedAt = now;

    const project2 = createMockProject({ id: 'proj-2', name: 'Same Name' });
    project2.createdAt = now;
    project2.updatedAt = now;
    // Make all other fields identical
    project2.description = project1.description;
    project2.genre = project1.genre;
    project2.theme = project1.theme;
    project2.tags = [...project1.tags];
    project2.settings = { ...project1.settings };
    project2.isArchived = project1.isArchived;

    await db.projects.bulkAdd([project1, project2]);

    const manifest = await syncManifest.buildLocalManifest();

    // Hashes should be different because IDs differ
    // This verifies that the hash function is deterministic but sensitive to content
    expect(manifest.projects['proj-1'].hash).not.toBe(manifest.projects['proj-2'].hash);

    // But building the manifest twice for same data should be identical
    const manifest2 = await syncManifest.buildLocalManifest();
    expect(manifest.projects['proj-1'].hash).toBe(manifest2.projects['proj-1'].hash);
  });
});

// =============================================================================
// recordDeletion / getDeletedItems TESTS (SM-011 to SM-017)
// =============================================================================

describe('SyncManifest - Deletion Tracking', () => {
  it('SM-011: recordDeletion - new item should add deletion record to localStorage', async () => {
    await syncManifest.recordDeletion('proj-1', 'project');

    const stored = mockStorage.get('moodboard-deleted-items');
    expect(stored).toBeDefined();

    const items: DeletedItemRecord[] = JSON.parse(stored!);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('proj-1');
    expect(items[0].type).toBe('project');
    expect(items[0].deletedAt).toBeDefined();
  });

  it('SM-012: recordDeletion - duplicate should not add duplicate deletion records', async () => {
    await syncManifest.recordDeletion('proj-1', 'project');
    await syncManifest.recordDeletion('proj-1', 'project');

    const stored = mockStorage.get('moodboard-deleted-items');
    const items: DeletedItemRecord[] = JSON.parse(stored!);

    expect(items).toHaveLength(1);
  });

  it('SM-013: recordDeletion - device attribution should record deletedByDeviceId', async () => {
    await syncManifest.recordDeletion('char-1', 'character');

    const stored = mockStorage.get('moodboard-deleted-items');
    const items: DeletedItemRecord[] = JSON.parse(stored!);

    expect(items[0].deletedByDeviceId).toBe('test-device-id');
  });

  it('SM-014: getDeletedItems - prune old should filter out items older than 30 days', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31); // 31 days ago

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1); // 1 day ago

    const items: DeletedItemRecord[] = [
      { id: 'old-item', type: 'project', deletedAt: oldDate.toISOString(), deletedByDeviceId: 'dev1' },
      { id: 'recent-item', type: 'project', deletedAt: recentDate.toISOString(), deletedByDeviceId: 'dev1' },
    ];
    mockStorage.set('moodboard-deleted-items', JSON.stringify(items));

    // Build manifest triggers getDeletedItems internally
    const manifest = await syncManifest.buildLocalManifest();

    // Only recent item should be included
    expect(manifest.deletedItems).toHaveLength(1);
    expect(manifest.deletedItems[0].id).toBe('recent-item');
  });

  it('SM-015: getDeletedItems - empty storage should return empty array when no deletions stored', async () => {
    // Don't set anything in storage

    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.deletedItems).toEqual([]);
  });

  it('SM-016: getDeletedItems - invalid JSON should return empty array on parse error', async () => {
    mockStorage.set('moodboard-deleted-items', 'not valid json {{{');

    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.deletedItems).toEqual([]);
  });

  it('SM-017: clearProcessedDeletions should remove specified IDs from deleted items', async () => {
    const items: DeletedItemRecord[] = [
      { id: 'keep-1', type: 'project', deletedAt: new Date().toISOString(), deletedByDeviceId: 'dev1' },
      { id: 'remove-1', type: 'character', deletedAt: new Date().toISOString(), deletedByDeviceId: 'dev1' },
      { id: 'keep-2', type: 'image', deletedAt: new Date().toISOString(), deletedByDeviceId: 'dev1' },
    ];
    mockStorage.set('moodboard-deleted-items', JSON.stringify(items));

    await syncManifest.clearProcessedDeletions(['remove-1']);

    const stored = mockStorage.get('moodboard-deleted-items');
    const remaining: DeletedItemRecord[] = JSON.parse(stored!);

    expect(remaining).toHaveLength(2);
    expect(remaining.map(r => r.id)).toEqual(['keep-1', 'keep-2']);
  });
});

// =============================================================================
// compareManifests - No remote TESTS (SM-018 to SM-019)
// =============================================================================

describe('SyncManifest - compareManifests (no remote)', () => {
  it('SM-018: compareManifests - null remote should mark all local items for upload', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const char = createMockCharacter('proj-1', { id: 'char-1' });
    await db.characters.add(char);

    const localManifest = await syncManifest.buildLocalManifest();
    const delta = await syncManifest.compareManifests(localManifest, null);

    expect(delta.hasChanges).toBe(true);
    expect(delta.toUpload.projects).toContain('proj-1');
    expect(delta.toUpload.characters).toContain('char-1');
    expect(delta.toDownload.projects).toHaveLength(0);
    expect(delta.toDownload.characters).toHaveLength(0);
  });

  it('SM-019: compareManifests - empty local should return hasChanges=false for empty local', async () => {
    const localManifest = await syncManifest.buildLocalManifest();
    const delta = await syncManifest.compareManifests(localManifest, null);

    expect(delta.hasChanges).toBe(false);
  });
});

// =============================================================================
// compareManifests - Items only in local TESTS (SM-020 to SM-022)
// =============================================================================

describe('SyncManifest - compareManifests (local only items)', () => {
  it('SM-020: compareManifests - local-only project should add to toUpload.projects', async () => {
    const localManifest = createTestManifest({
      projects: {
        'proj-1': createItemMeta('proj-1', 'hash-1', new Date()),
      },
    });
    const remoteManifest = createTestManifest();

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toUpload.projects).toContain('proj-1');
    expect(delta.toDownload.projects).not.toContain('proj-1');
  });

  it('SM-021: compareManifests - local-only character should add to toUpload.characters', async () => {
    const localManifest = createTestManifest({
      characters: {
        'char-1': createItemMeta('char-1', 'hash-1', new Date()),
      },
    });
    const remoteManifest = createTestManifest();

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toUpload.characters).toContain('char-1');
  });

  it('SM-022: compareManifests - local-only image should add to both toUpload.images and toUpload.files', async () => {
    const localManifest = createTestManifest({
      images: {
        'img-1': createItemMeta('img-1', 'hash-1', new Date()),
      },
    });
    const remoteManifest = createTestManifest();

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toUpload.images).toContain('img-1');
    expect(delta.toUpload.files).toContain('img-1');
  });
});

// =============================================================================
// compareManifests - Items only in remote TESTS (SM-023 to SM-025)
// =============================================================================

describe('SyncManifest - compareManifests (remote only items)', () => {
  it('SM-023: compareManifests - remote-only project should add to toDownload.projects', async () => {
    const localManifest = createTestManifest();
    const remoteManifest = createTestManifest({
      projects: {
        'proj-1': createItemMeta('proj-1', 'hash-1', new Date()),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toDownload.projects).toContain('proj-1');
    expect(delta.toUpload.projects).not.toContain('proj-1');
  });

  it('SM-024: compareManifests - remote-only character should add to toDownload.characters', async () => {
    const localManifest = createTestManifest();
    const remoteManifest = createTestManifest({
      characters: {
        'char-1': createItemMeta('char-1', 'hash-1', new Date()),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toDownload.characters).toContain('char-1');
  });

  it('SM-025: compareManifests - remote-only image should add to both toDownload.images and toDownload.files', async () => {
    const localManifest = createTestManifest();
    const remoteManifest = createTestManifest({
      images: {
        'img-1': createItemMeta('img-1', 'hash-1', new Date()),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toDownload.images).toContain('img-1');
    expect(delta.toDownload.files).toContain('img-1');
  });
});

// =============================================================================
// compareManifests - Hash comparison TESTS (SM-026 to SM-030)
// =============================================================================

describe('SyncManifest - compareManifests (hash comparison)', () => {
  it('SM-026: compareManifests - matching hashes should not add to upload or download', async () => {
    const now = new Date();
    const sameHash = 'identical-hash-value';

    const localManifest = createTestManifest({
      projects: {
        'proj-1': createItemMeta('proj-1', sameHash, now),
      },
    });
    const remoteManifest = createTestManifest({
      projects: {
        'proj-1': createItemMeta('proj-1', sameHash, now),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toUpload.projects).not.toContain('proj-1');
    expect(delta.toDownload.projects).not.toContain('proj-1');
    expect(delta.conflicts).toHaveLength(0);
  });

  it('SM-027: compareManifests - different hashes, same device, local newer should upload', async () => {
    const olderDate = new Date('2024-01-01T10:00:00Z');
    const newerDate = new Date('2024-01-01T12:00:00Z');

    const localManifest = createTestManifest({
      lastModifiedDeviceId: 'device-A',
      projects: {
        'proj-1': createItemMeta('proj-1', 'local-hash', newerDate),
      },
    });
    const remoteManifest = createTestManifest({
      lastModifiedDeviceId: 'device-A', // Same device
      projects: {
        'proj-1': createItemMeta('proj-1', 'remote-hash', olderDate),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toUpload.projects).toContain('proj-1');
    expect(delta.toDownload.projects).not.toContain('proj-1');
    expect(delta.conflicts).toHaveLength(0);
  });

  it('SM-028: compareManifests - different hashes, same device, remote newer should download', async () => {
    const olderDate = new Date('2024-01-01T10:00:00Z');
    const newerDate = new Date('2024-01-01T12:00:00Z');

    const localManifest = createTestManifest({
      lastModifiedDeviceId: 'device-A',
      projects: {
        'proj-1': createItemMeta('proj-1', 'local-hash', olderDate),
      },
    });
    const remoteManifest = createTestManifest({
      lastModifiedDeviceId: 'device-A', // Same device
      projects: {
        'proj-1': createItemMeta('proj-1', 'remote-hash', newerDate),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toDownload.projects).toContain('proj-1');
    expect(delta.toUpload.projects).not.toContain('proj-1');
    expect(delta.conflicts).toHaveLength(0);
  });

  it('SM-029: compareManifests - different hashes, different devices should create conflict record', async () => {
    const project = createMockProject({ id: 'proj-1', name: 'Conflicted Project' });
    await db.projects.add(project);

    const localDate = new Date('2024-01-01T10:00:00Z');
    const remoteDate = new Date('2024-01-01T11:00:00Z');

    const localManifest = createTestManifest({
      lastModifiedDeviceId: 'device-A',
      lastModifiedDeviceName: 'Device A',
      projects: {
        'proj-1': createItemMeta('proj-1', 'local-hash', localDate),
      },
    });
    const remoteManifest = createTestManifest({
      lastModifiedDeviceId: 'device-B', // Different device!
      lastModifiedDeviceName: 'Device B',
      projects: {
        'proj-1': createItemMeta('proj-1', 'remote-hash', remoteDate),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.conflicts).toHaveLength(1);
    expect(delta.conflicts[0].itemId).toBe('proj-1');
    expect(delta.conflicts[0].type).toBe('project');
    expect(delta.conflicts[0].local.deviceId).toBe('device-A');
    expect(delta.conflicts[0].remote.deviceId).toBe('device-B');
  });

  it('SM-030: compareManifests - conflict contains item name should look up item name from database', async () => {
    const project = createMockProject({ id: 'proj-1', name: 'My Special Project' });
    await db.projects.add(project);

    const localManifest = createTestManifest({
      lastModifiedDeviceId: 'device-A',
      projects: {
        'proj-1': createItemMeta('proj-1', 'hash-A', new Date()),
      },
    });
    const remoteManifest = createTestManifest({
      lastModifiedDeviceId: 'device-B',
      projects: {
        'proj-1': createItemMeta('proj-1', 'hash-B', new Date()),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.conflicts[0].itemName).toBe('My Special Project');
  });
});

// =============================================================================
// compareManifests - Deletions TESTS (SM-031 to SM-033)
// =============================================================================

describe('SyncManifest - compareManifests (deletions)', () => {
  it('SM-031: processDeletions - local deletion exists in remote should add to toDelete.remote', async () => {
    const localDeletion: DeletedItemRecord = {
      id: 'proj-1',
      type: 'project',
      deletedAt: new Date().toISOString(),
      deletedByDeviceId: 'device-A',
    };

    const localManifest = createTestManifest({
      deletedItems: [localDeletion],
    });
    const remoteManifest = createTestManifest({
      projects: {
        'proj-1': createItemMeta('proj-1', 'hash-1', new Date()),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toDelete.remote).toHaveLength(1);
    expect(delta.toDelete.remote[0].id).toBe('proj-1');
  });

  it('SM-032: processDeletions - remote deletion exists in local should add to toDelete.local', async () => {
    const remoteDeletion: DeletedItemRecord = {
      id: 'char-1',
      type: 'character',
      deletedAt: new Date().toISOString(),
      deletedByDeviceId: 'device-B',
    };

    const localManifest = createTestManifest({
      characters: {
        'char-1': createItemMeta('char-1', 'hash-1', new Date()),
      },
    });
    const remoteManifest = createTestManifest({
      deletedItems: [remoteDeletion],
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toDelete.local).toHaveLength(1);
    expect(delta.toDelete.local[0].id).toBe('char-1');
  });

  it('SM-033: processDeletions - deletion for non-existent item should not add to toDelete', async () => {
    const localDeletion: DeletedItemRecord = {
      id: 'non-existent',
      type: 'project',
      deletedAt: new Date().toISOString(),
      deletedByDeviceId: 'device-A',
    };

    const localManifest = createTestManifest({
      deletedItems: [localDeletion],
    });
    const remoteManifest = createTestManifest(); // No 'non-existent' project

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.toDelete.remote).toHaveLength(0);
    expect(delta.toDelete.local).toHaveLength(0);
  });
});

// =============================================================================
// compareManifests - hasChanges flag TESTS (SM-034 to SM-038)
// =============================================================================

describe('SyncManifest - compareManifests (hasChanges)', () => {
  it('SM-034: hasChanges - uploads pending should return true when toUpload has items', async () => {
    const localManifest = createTestManifest({
      projects: {
        'proj-1': createItemMeta('proj-1', 'hash-1', new Date()),
      },
    });
    const remoteManifest = createTestManifest();

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.hasChanges).toBe(true);
  });

  it('SM-035: hasChanges - downloads pending should return true when toDownload has items', async () => {
    const localManifest = createTestManifest();
    const remoteManifest = createTestManifest({
      characters: {
        'char-1': createItemMeta('char-1', 'hash-1', new Date()),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.hasChanges).toBe(true);
  });

  it('SM-036: hasChanges - deletions pending should return true when toDelete has items', async () => {
    const localManifest = createTestManifest({
      deletedItems: [{
        id: 'img-1',
        type: 'image',
        deletedAt: new Date().toISOString(),
        deletedByDeviceId: 'dev-1',
      }],
    });
    const remoteManifest = createTestManifest({
      images: {
        'img-1': createItemMeta('img-1', 'hash-1', new Date()),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.hasChanges).toBe(true);
  });

  it('SM-037: hasChanges - conflicts pending should return true when conflicts exist', async () => {
    const project = createMockProject({ id: 'proj-1' });
    await db.projects.add(project);

    const localManifest = createTestManifest({
      lastModifiedDeviceId: 'device-A',
      projects: {
        'proj-1': createItemMeta('proj-1', 'hash-A', new Date()),
      },
    });
    const remoteManifest = createTestManifest({
      lastModifiedDeviceId: 'device-B',
      projects: {
        'proj-1': createItemMeta('proj-1', 'hash-B', new Date()),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.hasChanges).toBe(true);
    expect(delta.conflicts.length).toBeGreaterThan(0);
  });

  it('SM-038: hasChanges - no changes should return false when nothing to sync', async () => {
    const now = new Date();
    const sameHash = 'same-hash';

    const localManifest = createTestManifest({
      lastModifiedDeviceId: 'same-device',
      projects: {
        'proj-1': createItemMeta('proj-1', sameHash, now),
      },
    });
    const remoteManifest = createTestManifest({
      lastModifiedDeviceId: 'same-device',
      projects: {
        'proj-1': createItemMeta('proj-1', sameHash, now),
      },
    });

    const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

    expect(delta.hasChanges).toBe(false);
  });
});

// =============================================================================
// mergeManifests TESTS (SM-039 to SM-043)
// =============================================================================

describe('SyncManifest - mergeManifests', () => {
  it('SM-039: mergeManifests - version calculation should use max(local, remote) + 1', () => {
    const localManifest = createTestManifest({ version: 5 });
    const remoteManifest = createTestManifest({ version: 8 });

    const delta: SyncDelta = {
      hasChanges: false,
      toUpload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDownload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDelete: { remote: [], local: [] },
      conflicts: [],
    };

    const merged = syncManifest.mergeManifests(localManifest, remoteManifest, delta);

    expect(merged.version).toBe(9); // max(5, 8) + 1
  });

  it('SM-040: mergeManifests - add downloaded items should include items from toDownload', () => {
    const localManifest = createTestManifest({
      projects: {
        'local-proj': createItemMeta('local-proj', 'hash-local', new Date()),
      },
    });
    const remoteManifest = createTestManifest({
      projects: {
        'remote-proj': createItemMeta('remote-proj', 'hash-remote', new Date()),
      },
    });

    const delta: SyncDelta = {
      hasChanges: true,
      toUpload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDownload: { projects: ['remote-proj'], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDelete: { remote: [], local: [] },
      conflicts: [],
    };

    const merged = syncManifest.mergeManifests(localManifest, remoteManifest, delta);

    expect(merged.projects['local-proj']).toBeDefined();
    expect(merged.projects['remote-proj']).toBeDefined();
  });

  it('SM-041: mergeManifests - remove deleted items should remove items from toDelete.local and toDelete.remote', () => {
    const localManifest = createTestManifest({
      projects: {
        'proj-to-delete': createItemMeta('proj-to-delete', 'hash', new Date()),
        'proj-to-keep': createItemMeta('proj-to-keep', 'hash', new Date()),
      },
    });
    const remoteManifest = createTestManifest();

    const delta: SyncDelta = {
      hasChanges: true,
      toUpload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDownload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDelete: {
        remote: [],
        local: [{ id: 'proj-to-delete', type: 'project', deletedAt: new Date().toISOString(), deletedByDeviceId: 'dev' }],
      },
      conflicts: [],
    };

    const merged = syncManifest.mergeManifests(localManifest, remoteManifest, delta);

    expect(merged.projects['proj-to-keep']).toBeDefined();
    expect(merged.projects['proj-to-delete']).toBeUndefined();
  });

  it('SM-042: mergeManifests - merge deletedItems lists should deduplicate deletions from both manifests', () => {
    const deletion1: DeletedItemRecord = { id: 'del-1', type: 'project', deletedAt: new Date().toISOString(), deletedByDeviceId: 'dev-A' };
    const deletion2: DeletedItemRecord = { id: 'del-2', type: 'character', deletedAt: new Date().toISOString(), deletedByDeviceId: 'dev-B' };
    const duplicateDeletion: DeletedItemRecord = { id: 'del-1', type: 'project', deletedAt: new Date().toISOString(), deletedByDeviceId: 'dev-C' };

    const localManifest = createTestManifest({
      deletedItems: [deletion1],
    });
    const remoteManifest = createTestManifest({
      deletedItems: [deletion2, duplicateDeletion], // del-1 is duplicate
    });

    const delta: SyncDelta = {
      hasChanges: false,
      toUpload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDownload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDelete: { remote: [], local: [] },
      conflicts: [],
    };

    const merged = syncManifest.mergeManifests(localManifest, remoteManifest, delta);

    // Should deduplicate by ID - del-1 appears twice but should only be in merged once
    expect(merged.deletedItems).toHaveLength(2);
    expect(merged.deletedItems.map(d => d.id).sort()).toEqual(['del-1', 'del-2']);
  });

  it('SM-043: mergeManifests - device attribution should set current device as lastModified', () => {
    const localManifest = createTestManifest({
      lastModifiedDeviceId: 'old-device',
      lastModifiedDeviceName: 'Old Device',
    });
    const remoteManifest = createTestManifest();

    const delta: SyncDelta = {
      hasChanges: false,
      toUpload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDownload: { projects: [], characters: [], images: [], files: [], editions: [], scriptPages: [], panels: [] },
      toDelete: { remote: [], local: [] },
      conflicts: [],
    };

    const merged = syncManifest.mergeManifests(localManifest, remoteManifest, delta);

    expect(merged.lastModifiedDeviceId).toBe('test-device-id');
    expect(merged.lastModifiedDeviceName).toBe('Test Device');
  });
});

// =============================================================================
// createEmptyManifest TESTS (SM-044)
// =============================================================================

describe('SyncManifest - createEmptyManifest', () => {
  it('SM-044: createEmptyManifest should return manifest with empty collections and current device', () => {
    const manifest = syncManifest.createEmptyManifest();

    expect(manifest.projects).toEqual({});
    expect(manifest.characters).toEqual({});
    expect(manifest.images).toEqual({});
    expect(manifest.editions).toEqual({});
    expect(manifest.scriptPages).toEqual({});
    expect(manifest.panels).toEqual({});
    expect(manifest.deletedItems).toEqual([]);
    expect(manifest.lastModifiedDeviceId).toBe('test-device-id');
    expect(manifest.lastModifiedDeviceName).toBe('Test Device');
  });
});

// =============================================================================
// updateLocalVersion / getLocalVersion TESTS (SM-045 to SM-047)
// =============================================================================

describe('SyncManifest - Version Management', () => {
  it('SM-045: updateLocalVersion should store version in localStorage', async () => {
    await syncManifest.updateLocalVersion(42);

    expect(mockStorage.get('moodboard-sync-version')).toBe('42');
  });

  it('SM-046: getLocalVersion - stored should return stored version number', async () => {
    mockStorage.set('moodboard-sync-version', '15');

    // Build manifest to trigger version read (version = stored + 1)
    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.version).toBe(16); // stored (15) + 1
  });

  it('SM-047: getLocalVersion - not stored should return 0 when no version stored', async () => {
    // Don't set any version

    const manifest = await syncManifest.buildLocalManifest();

    expect(manifest.version).toBe(1); // 0 + 1
  });
});
