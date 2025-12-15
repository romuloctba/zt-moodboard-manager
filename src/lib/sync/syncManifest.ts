/**
 * Sync Manifest Service
 * 
 * Handles building and comparing sync manifests for change detection.
 * This enables incremental sync - only syncing what changed.
 */

import { db } from '@/lib/db/database';
import { debug } from '@/lib/utils/debug';
import { hashObject } from './hash';
import { getDeviceId, getDeviceName } from './deviceId';
import {
  type SyncManifest,
  type ItemSyncMeta,
  type SyncDelta,
  type DeletedItemRecord,
  EMPTY_MANIFEST,
  SYNC_CONSTANTS,
} from './types';
import type { Project, Character, MoodboardImage, Edition, ScriptPage, Panel } from '@/types';

class SyncManifestService {
  /**
   * Build a manifest from local IndexedDB data
   */
  async buildLocalManifest(): Promise<SyncManifest> {
    const [projects, characters, images, editions, scriptPages, panels] = await Promise.all([
      db.projects.toArray(),
      db.characters.toArray(),
      db.images.toArray(),
      db.editions.toArray(),
      db.scriptPages.toArray(),
      db.panels.toArray(),
    ]);

    const projectMetas = await this.buildItemMetas(projects);
    const characterMetas = await this.buildItemMetas(characters);
    const imageMetas = await this.buildImageMetas(images);
    const editionMetas = await this.buildItemMetas(editions);
    const scriptPageMetas = await this.buildItemMetas(scriptPages);
    const panelMetas = await this.buildPanelMetas(panels);

    const now = new Date().toISOString();

    return {
      version: await this.getLocalVersion() + 1,
      schemaVersion: SYNC_CONSTANTS.SCHEMA_VERSION,
      lastModified: now,
      lastModifiedDeviceId: getDeviceId(),
      lastModifiedDeviceName: getDeviceName(),
      projects: projectMetas,
      characters: characterMetas,
      images: imageMetas,
      editions: editionMetas,
      scriptPages: scriptPageMetas,
      panels: panelMetas,
      deletedItems: await this.getDeletedItems(),
    };
  }

  /**
   * Build panel metas (panels have nested dialogues)
   */
  private async buildPanelMetas(
    panels: Panel[]
  ): Promise<Record<string, ItemSyncMeta>> {
    const metas: Record<string, ItemSyncMeta> = {};

    for (const panel of panels) {
      const hash = await hashObject({
        ...panel,
        dialogues: panel.dialogues,
      });

      metas[panel.id] = {
        id: panel.id,
        hash,
        updatedAt: panel.updatedAt.toISOString(),
        version: 1,
      };
    }

    return metas;
  }

  /**
   * Build item metas for projects/characters/editions/pages
   */
  private async buildItemMetas(
    items: (Project | Character | Edition | ScriptPage)[]
  ): Promise<Record<string, ItemSyncMeta>> {
    const metas: Record<string, ItemSyncMeta> = {};

    for (const item of items) {
      const hash = await hashObject(item);
      metas[item.id] = {
        id: item.id,
        hash,
        updatedAt: item.updatedAt.toISOString(),
        version: 1, // Will be incremented by sync
      };
    }

    return metas;
  }

  /**
   * Build item metas for images
   * Excludes local-only fields from hash
   */
  private async buildImageMetas(
    images: MoodboardImage[]
  ): Promise<Record<string, ItemSyncMeta>> {
    const metas: Record<string, ItemSyncMeta> = {};

    for (const image of images) {
      // Create a copy without local-only fields
      const hashableImage = {
        id: image.id,
        characterId: image.characterId,
        sectionId: image.sectionId,
        filename: image.filename,
        originalName: image.originalName,
        mimeType: image.mimeType,
        size: image.size,
        width: image.width,
        height: image.height,
        palette: image.palette,
        tags: image.tags,
        notes: image.notes,
        createdAt: image.createdAt,
      };

      const hash = await hashObject(hashableImage);
      metas[image.id] = {
        id: image.id,
        hash,
        updatedAt: image.createdAt.toISOString(),
        version: 1,
      };
    }

    return metas;
  }

  /**
   * Get deleted items from local storage
   * These are tracked to propagate deletions during sync
   */
  private async getDeletedItems(): Promise<DeletedItemRecord[]> {
    // Get from localStorage (simple approach)
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem('moodboard-deleted-items');
    if (!stored) return [];

    try {
      const items: DeletedItemRecord[] = JSON.parse(stored);
      // Filter out old deletions (older than retention period)
      const cutoff = Date.now() - (SYNC_CONSTANTS.DELETED_ITEMS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      return items.filter(item => new Date(item.deletedAt).getTime() > cutoff);
    } catch (error) {
      debug.warn('[SyncManifest] Failed to parse deleted items:', error);
      return [];
    }
  }

  /**
   * Record a deleted item for sync
   */
  async recordDeletion(
    id: string,
    type: 'project' | 'character' | 'image'
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    const deletedItems = await this.getDeletedItems();

    deletedItems.push({
      id,
      type,
      deletedAt: new Date().toISOString(),
      deletedByDeviceId: getDeviceId(),
    });

    localStorage.setItem('moodboard-deleted-items', JSON.stringify(deletedItems));
  }

  /**
   * Clear processed deletions
   */
  async clearProcessedDeletions(ids: string[]): Promise<void> {
    if (typeof window === 'undefined') return;

    const deletedItems = await this.getDeletedItems();
    const remaining = deletedItems.filter(item => !ids.includes(item.id));

    localStorage.setItem('moodboard-deleted-items', JSON.stringify(remaining));
  }

  /**
   * Get the local manifest version
   */
  private async getLocalVersion(): Promise<number> {
    if (typeof window === 'undefined') return 0;

    const stored = localStorage.getItem('moodboard-sync-version');
    return stored ? parseInt(stored, 10) : 0;
  }

  /**
   * Update the local manifest version
   */
  async updateLocalVersion(version: number): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem('moodboard-sync-version', version.toString());
  }

  /**
   * Compare local and remote manifests to determine what needs syncing
   */
  async compareManifests(
    local: SyncManifest,
    remote: SyncManifest | null
  ): Promise<SyncDelta> {
    // If no remote manifest, everything is new
    if (!remote) {
      return {
        hasChanges: Object.keys(local.projects).length > 0 ||
          Object.keys(local.characters).length > 0 ||
          Object.keys(local.images).length > 0,
        toUpload: {
          projects: Object.keys(local.projects),
          characters: Object.keys(local.characters),
          images: Object.keys(local.images),
          files: Object.keys(local.images), // All image files too
        },
        toDownload: {
          projects: [],
          characters: [],
          images: [],
          files: [],
        },
        toDelete: {
          remote: [],
          local: [],
        },
        conflicts: [],
      };
    }

    const delta: SyncDelta = {
      hasChanges: false,
      toUpload: { projects: [], characters: [], images: [], files: [] },
      toDownload: { projects: [], characters: [], images: [], files: [] },
      toDelete: { remote: [], local: [] },
      conflicts: [],
    };

    // Compare projects
    await this.compareItemCategory(
      'project',
      local.projects,
      remote.projects,
      delta,
      local.lastModifiedDeviceId,
      local.lastModifiedDeviceName,
      remote.lastModifiedDeviceId,
      remote.lastModifiedDeviceName
    );

    // Compare characters
    await this.compareItemCategory(
      'character',
      local.characters,
      remote.characters,
      delta,
      local.lastModifiedDeviceId,
      local.lastModifiedDeviceName,
      remote.lastModifiedDeviceId,
      remote.lastModifiedDeviceName
    );

    // Compare images
    await this.compareItemCategory(
      'image',
      local.images,
      remote.images,
      delta,
      local.lastModifiedDeviceId,
      local.lastModifiedDeviceName,
      remote.lastModifiedDeviceId,
      remote.lastModifiedDeviceName
    );

    // Handle deletions
    this.processDeletions(local, remote, delta);

    // Check if there are any changes
    delta.hasChanges =
      delta.toUpload.projects.length > 0 ||
      delta.toUpload.characters.length > 0 ||
      delta.toUpload.images.length > 0 ||
      delta.toDownload.projects.length > 0 ||
      delta.toDownload.characters.length > 0 ||
      delta.toDownload.images.length > 0 ||
      delta.toDelete.remote.length > 0 ||
      delta.toDelete.local.length > 0 ||
      delta.conflicts.length > 0;

    return delta;
  }

  /**
   * Compare a category of items (projects, characters, or images)
   */
  private async compareItemCategory(
    type: 'project' | 'character' | 'image',
    local: Record<string, ItemSyncMeta>,
    remote: Record<string, ItemSyncMeta>,
    delta: SyncDelta,
    localDeviceId: string,
    localDeviceName: string,
    remoteDeviceId: string,
    remoteDeviceName: string
  ): Promise<void> {
    const localIds = new Set(Object.keys(local));
    const remoteIds = new Set(Object.keys(remote));

    const uploadKey = type === 'project' ? 'projects' :
      type === 'character' ? 'characters' : 'images';
    const downloadKey = uploadKey;

    // Items only in local → upload
    for (const id of localIds) {
      if (!remoteIds.has(id)) {
        delta.toUpload[uploadKey].push(id);
        if (type === 'image') {
          delta.toUpload.files.push(id);
        }
      }
    }

    // Items only in remote → download
    for (const id of remoteIds) {
      if (!localIds.has(id)) {
        delta.toDownload[downloadKey].push(id);
        if (type === 'image') {
          delta.toDownload.files.push(id);
        }
      }
    }

    // Items in both → compare hashes
    for (const id of localIds) {
      if (remoteIds.has(id)) {
        const localMeta = local[id];
        const remoteMeta = remote[id];

        if (localMeta.hash !== remoteMeta.hash) {
          // Content differs - need to resolve
          const localTime = new Date(localMeta.updatedAt);
          const remoteTime = new Date(remoteMeta.updatedAt);

          // Check if this is from the same device (no conflict)
          if (localDeviceId === remoteDeviceId) {
            // Same device - newer wins
            if (localTime > remoteTime) {
              delta.toUpload[uploadKey].push(id);
              if (type === 'image') {
                delta.toUpload.files.push(id);
              }
            } else {
              delta.toDownload[downloadKey].push(id);
              if (type === 'image') {
                delta.toDownload.files.push(id);
              }
            }
          } else {
            // Different devices - this is a conflict
            const itemName = await this.getItemName(type, id);

            delta.conflicts.push({
              id: `conflict-${id}`,
              type,
              itemId: id,
              itemName,
              local: {
                version: localMeta.version,
                updatedAt: localTime,
                deviceId: localDeviceId,
                deviceName: localDeviceName,
              },
              remote: {
                version: remoteMeta.version,
                updatedAt: remoteTime,
                deviceId: remoteDeviceId,
                deviceName: remoteDeviceName,
              },
            });
          }
        }
      }
    }
  }

  /**
   * Get item name for conflict display
   */
  private async getItemName(
    type: 'project' | 'character' | 'image',
    id: string
  ): Promise<string> {
    try {
      switch (type) {
        case 'project': {
          const project = await db.projects.get(id);
          return project?.name || id;
        }
        case 'character': {
          const character = await db.characters.get(id);
          return character?.name || id;
        }
        case 'image': {
          const image = await db.images.get(id);
          return image?.originalName || id;
        }
        default:
          return id;
      }
    } catch {
      return id;
    }
  }

  /**
   * Process deletions from both sides
   */
  private processDeletions(
    local: SyncManifest,
    remote: SyncManifest,
    delta: SyncDelta
  ): void {
    // Local deletions → delete from remote
    for (const deletion of local.deletedItems) {
      // Only if the item exists in remote
      const exists =
        (deletion.type === 'project' && remote.projects[deletion.id]) ||
        (deletion.type === 'character' && remote.characters[deletion.id]) ||
        (deletion.type === 'image' && remote.images[deletion.id]) ||
        (deletion.type === 'edition' && remote.editions[deletion.id]) ||
        (deletion.type === 'scriptPage' && remote.scriptPages[deletion.id]) ||
        (deletion.type === 'panel' && remote.panels[deletion.id]);

      if (exists) {
        delta.toDelete.remote.push(deletion);
      }
    }

    // Remote deletions → delete from local
    for (const deletion of remote.deletedItems) {
      // Only if the item exists in local
      const exists =
        (deletion.type === 'project' && local.projects[deletion.id]) ||
        (deletion.type === 'character' && local.characters[deletion.id]) ||
        (deletion.type === 'image' && local.images[deletion.id]) ||
        (deletion.type === 'edition' && local.editions[deletion.id]) ||
        (deletion.type === 'scriptPage' && local.scriptPages[deletion.id]) ||
        (deletion.type === 'panel' && local.panels[deletion.id]);

      if (exists) {
        delta.toDelete.local.push(deletion);
      }
    }
  }

  /**
   * Create an empty manifest for first-time sync
   */
  createEmptyManifest(): SyncManifest {
    return {
      ...EMPTY_MANIFEST,
      lastModifiedDeviceId: getDeviceId(),
      lastModifiedDeviceName: getDeviceName(),
    };
  }

  /**
   * Merge manifests after sync
   */
  mergeManifests(
    local: SyncManifest,
    remote: SyncManifest | null,
    processedDelta: SyncDelta
  ): SyncManifest {
    const now = new Date().toISOString();

    // Start with local as base
    const merged: SyncManifest = {
      version: Math.max(local.version, remote?.version || 0) + 1,
      schemaVersion: SYNC_CONSTANTS.SCHEMA_VERSION,
      lastModified: now,
      lastModifiedDeviceId: getDeviceId(),
      lastModifiedDeviceName: getDeviceName(),
      projects: { ...local.projects },
      characters: { ...local.characters },
      images: { ...local.images },
      editions: { ...local.editions },
      scriptPages: { ...local.scriptPages },
      panels: { ...local.panels },
      deletedItems: [],
    };

    // Add any items downloaded from remote
    if (remote) {
      for (const id of processedDelta.toDownload.projects) {
        merged.projects[id] = remote.projects[id];
      }
      for (const id of processedDelta.toDownload.characters) {
        merged.characters[id] = remote.characters[id];
      }
      for (const id of processedDelta.toDownload.images) {
        merged.images[id] = remote.images[id];
      }
    }

    // Remove deleted items
    for (const deletion of [...processedDelta.toDelete.local, ...processedDelta.toDelete.remote]) {
      switch (deletion.type) {
        case 'project':
          delete merged.projects[deletion.id];
          break;
        case 'character':
          delete merged.characters[deletion.id];
          break;
        case 'image':
          delete merged.images[deletion.id];
          break;
      }
    }

    // Merge deleted items lists (for propagation to other devices)
    const allDeletions = new Map<string, DeletedItemRecord>();
    for (const deletion of [...local.deletedItems, ...(remote?.deletedItems || [])]) {
      allDeletions.set(deletion.id, deletion);
    }
    merged.deletedItems = Array.from(allDeletions.values());

    return merged;
  }
}

// Singleton instance
export const syncManifest = new SyncManifestService();
