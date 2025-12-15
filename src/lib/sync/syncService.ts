/**
 * Sync Service
 * 
 * Main orchestrator for sync operations.
 * Coordinates between Google Drive, local database, and manifest management.
 */

import { db } from '@/lib/db/database';
import { fileStorage } from '@/lib/storage/fileStorage';
import { debug } from '@/lib/utils/debug';
import { googleAuth } from './googleAuth';
import { googleDrive } from './googleDriveService';
import { syncManifest } from './syncManifest';
import { getDeviceId, getDeviceName } from './deviceId';
import {
  type SyncSettings,
  type SyncManifest,
  type SyncProgress,
  type SyncResult,
  type SyncDelta,
  type SyncConflict,
  type SyncItemCounts,
  type ConflictStrategy,
  DEFAULT_SYNC_SETTINGS,
  SYNC_CONSTANTS,
} from './types';
import type { Project, Character, MoodboardImage, Edition, ScriptPage, Panel } from '@/types';

// Storage key for sync settings
const SYNC_SETTINGS_KEY = 'moodboard-sync-settings';

type ProgressCallback = (progress: SyncProgress) => void;
type ConflictCallback = (conflicts: SyncConflict[]) => Promise<SyncConflict[]>;

class SyncService {
  private isSyncing = false;
  private lastSyncTime = 0;

  /**
   * Get sync settings from localStorage
   */
  getSyncSettings(): SyncSettings | null {
    if (typeof window === 'undefined') return null;

    const stored = localStorage.getItem(SYNC_SETTINGS_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch (error) {
      debug.warn('[SyncService] Failed to parse sync settings:', error);
      return null;
    }
  }

  /**
   * Save sync settings to localStorage
   */
  saveSyncSettings(settings: Partial<SyncSettings>): SyncSettings {
    const current = this.getSyncSettings();

    const updated: SyncSettings = {
      ...DEFAULT_SYNC_SETTINGS,
      ...current,
      ...settings,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
    };

    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  }

  /**
   * Initialize sync settings with device info
   */
  initializeSettings(): SyncSettings {
    const existing = this.getSyncSettings();
    if (existing) {
      // Update device info
      return this.saveSyncSettings({
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
      });
    }

    return this.saveSyncSettings({
      ...DEFAULT_SYNC_SETTINGS,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
    });
  }

  /**
   * Connect to Google Drive
   */
  async connect(): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      await googleAuth.signIn();

      // Initialize Drive folders
      await googleDrive.initialize();

      // Update settings
      this.saveSyncSettings({
        enabled: true,
        provider: 'google-drive',
        googleEmail: googleAuth.getUserEmail() || undefined,
        googleUserId: googleAuth.getUserId() || undefined,
        googleTokenExpiry: googleAuth.getTokenExpiry()?.getTime(),
      });

      return {
        success: true,
        email: googleAuth.getUserEmail() || undefined,
      };
    } catch (error) {
      console.error('[SyncService] Connect failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Disconnect from Google Drive
   */
  async disconnect(): Promise<void> {
    await googleAuth.signOut();

    this.saveSyncSettings({
      enabled: false,
      provider: 'none',
      googleEmail: undefined,
      googleUserId: undefined,
      googleAccessToken: undefined,
      googleRefreshToken: undefined,
      googleTokenExpiry: undefined,
      lastSyncAt: undefined,
    });
  }

  /**
   * Check if sync is available
   */
  isConnected(): boolean {
    const settings = this.getSyncSettings();
    return settings?.enabled === true &&
      settings?.provider === 'google-drive' &&
      googleAuth.isSignedIn();
  }

  /**
   * Perform a full sync operation
   */
  async performSync(
    options: {
      onProgress?: ProgressCallback;
      onConflict?: ConflictCallback;
      force?: boolean;
    } = {}
  ): Promise<SyncResult> {
    const { onProgress, onConflict, force = false } = options;
    const startTime = Date.now();

    // Prevent concurrent syncs
    if (this.isSyncing) {
      return this.createErrorResult('Sync already in progress', startTime);
    }

    // Rate limiting
    if (!force && Date.now() - this.lastSyncTime < SYNC_CONSTANTS.MIN_SYNC_INTERVAL_MS) {
      return this.createErrorResult('Please wait before syncing again', startTime);
    }

    // Check connection
    if (!this.isConnected()) {
      return this.createErrorResult('Not connected to Google Drive', startTime);
    }

    this.isSyncing = true;

    try {
      // Phase 1: Initialize
      onProgress?.({
        status: 'connecting',
        phase: 'connecting',
        current: 0,
        total: 100,
      });

      await googleDrive.initialize();

      // Phase 2: Build local manifest
      onProgress?.({
        status: 'checking',
        phase: 'analyzing',
        current: 10,
        total: 100,
      });

      const localManifest = await syncManifest.buildLocalManifest();

      // Phase 3: Get remote manifest
      onProgress?.({
        status: 'checking',
        phase: 'checking',
        current: 20,
        total: 100,
      });

      const remoteManifest = await googleDrive.getManifest<SyncManifest>();

      // Phase 4: Compare and get delta
      onProgress?.({
        status: 'checking',
        phase: 'comparing',
        current: 30,
        total: 100,
      });

      const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

      // If no changes, we're done
      if (!delta.hasChanges) {
        this.updateLastSyncTime();
        return this.createSuccessResult('none', startTime, {
          projects: { added: 0, updated: 0, deleted: 0 },
          characters: { added: 0, updated: 0, deleted: 0 },
          images: { added: 0, updated: 0, deleted: 0 },
          files: { added: 0, updated: 0, deleted: 0 },
          editions: { added: 0, updated: 0, deleted: 0 },
          scriptPages: { added: 0, updated: 0, deleted: 0 },
          panels: { added: 0, updated: 0, deleted: 0 },
        });
      }

      // Phase 5: Handle conflicts
      let resolvedDelta = delta;
      if (delta.conflicts.length > 0) {
        onProgress?.({
          status: 'merging',
          phase: 'comparing',
          current: 35,
          total: 100,
        });

        if (onConflict) {
          const resolvedConflicts = await onConflict(delta.conflicts);
          resolvedDelta = this.applyConflictResolutions(delta, resolvedConflicts);
        } else {
          // Auto-resolve based on settings
          const settings = this.getSyncSettings();
          resolvedDelta = this.autoResolveConflicts(delta, settings?.conflictStrategy || 'newest-wins');
        }
      }

      // Phase 6: Upload local changes
      const uploadCounts = await this.uploadChanges(resolvedDelta, localManifest, onProgress);

      // Phase 7: Download remote changes
      const downloadCounts = await this.downloadChanges(resolvedDelta, onProgress);

      // Phase 8: Process deletions
      await this.processDeletions(resolvedDelta);

      // Phase 9: Save merged manifest
      onProgress?.({
        status: 'uploading',
        phase: 'finalizing',
        current: 95,
        total: 100,
      });

      const mergedManifest = syncManifest.mergeManifests(localManifest, remoteManifest, resolvedDelta);
      await googleDrive.saveManifest(mergedManifest);
      await syncManifest.updateLocalVersion(mergedManifest.version);

      // Update settings with last sync time
      this.updateLastSyncTime();

      // Determine sync direction
      const direction = this.determineSyncDirection(uploadCounts, downloadCounts);

      onProgress?.({
        status: 'success',
        phase: 'complete',
        current: 100,
        total: 100,
      });

      return this.createSuccessResult(direction, startTime, {
        projects: this.mergeCounts(uploadCounts.projects, downloadCounts.projects),
        characters: this.mergeCounts(uploadCounts.characters, downloadCounts.characters),
        images: this.mergeCounts(uploadCounts.images, downloadCounts.images),
        files: this.mergeCounts(uploadCounts.files, downloadCounts.files),
        editions: this.mergeCounts(uploadCounts.editions, downloadCounts.editions),
        scriptPages: this.mergeCounts(uploadCounts.scriptPages, downloadCounts.scriptPages),
        panels: this.mergeCounts(uploadCounts.panels, downloadCounts.panels),
      });

    } catch (error) {
      console.error('[SyncService] Sync failed:', error);

      onProgress?.({
        status: 'error',
        phase: 'complete',
        current: 0,
        total: 100,
      });

      return this.createErrorResult(
        error instanceof Error ? error.message : 'Sync failed',
        startTime
      );
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Upload local changes to Google Drive
   */
  private async uploadChanges(
    delta: SyncDelta,
    localManifest: SyncManifest,
    onProgress?: ProgressCallback
  ): Promise<{
    projects: SyncItemCounts;
    characters: SyncItemCounts;
    images: SyncItemCounts;
    files: SyncItemCounts;
    editions: SyncItemCounts;
    scriptPages: SyncItemCounts;
    panels: SyncItemCounts;
  }> {
    const counts = {
      projects: { added: 0, updated: 0, deleted: 0 },
      characters: { added: 0, updated: 0, deleted: 0 },
      images: { added: 0, updated: 0, deleted: 0 },
      files: { added: 0, updated: 0, deleted: 0 },
      editions: { added: 0, updated: 0, deleted: 0 },
      scriptPages: { added: 0, updated: 0, deleted: 0 },
      panels: { added: 0, updated: 0, deleted: 0 },
    };

    const totalUploads = delta.toUpload.projects.length +
      delta.toUpload.characters.length +
      delta.toUpload.images.length +
      delta.toUpload.files.length +
      delta.toUpload.editions.length +
      delta.toUpload.scriptPages.length +
      delta.toUpload.panels.length;

    let uploaded = 0;

    // Upload projects
    for (const projectId of delta.toUpload.projects) {
      onProgress?.({
        status: 'uploading',
        phase: 'uploading',
        current: 40 + Math.floor((uploaded / totalUploads) * 25),
        total: 100,
        itemType: 'projects',
      });

      const project = await db.projects.get(projectId);
      if (project) {
        await googleDrive.saveProject(projectId, project);
        counts.projects.added++;
      }
      uploaded++;
    }

    // Upload characters
    for (const characterId of delta.toUpload.characters) {
      onProgress?.({
        status: 'uploading',
        phase: 'uploading',
        current: 40 + Math.floor((uploaded / totalUploads) * 25),
        total: 100,
        itemType: 'characters',
      });

      const character = await db.characters.get(characterId);
      if (character) {
        await googleDrive.saveCharacter(characterId, character);
        counts.characters.added++;
      }
      uploaded++;
    }

    // Upload image metadata
    for (const imageId of delta.toUpload.images) {
      onProgress?.({
        status: 'uploading',
        phase: 'uploading',
        current: 40 + Math.floor((uploaded / totalUploads) * 25),
        total: 100,
        itemType: 'images',
      });

      const image = await db.images.get(imageId);
      if (image) {
        // Upload metadata (without local paths)
        const metadata = {
          ...image,
          storagePath: undefined,
          thumbnailPath: undefined,
        };
        await googleDrive.saveImageMeta(imageId, metadata);
        counts.images.added++;
      }
      uploaded++;
    }

    // Upload image files
    for (const imageId of delta.toUpload.files) {
      onProgress?.({
        status: 'uploading',
        phase: 'uploading',
        current: 40 + Math.floor((uploaded / totalUploads) * 25),
        total: 100,
        itemType: 'files',
      });

      const image = await db.images.get(imageId);
      if (image) {
        // Get the actual file from storage
        const imageFile = await fileStorage.getImage(image.storagePath);
        if (imageFile) {
          const blob = new Blob([await imageFile.arrayBuffer()], { type: 'image/webp' });
          await googleDrive.saveImageFile(imageId, blob);
        }

        // Get thumbnail
        const thumbFile = await fileStorage.getImage(image.thumbnailPath);
        if (thumbFile) {
          const thumbBlob = new Blob([await thumbFile.arrayBuffer()], { type: 'image/webp' });
          await googleDrive.saveThumbnailFile(imageId, thumbBlob);
        }

        counts.files.added++;
      }
      uploaded++;
    }

    // Upload editions
    for (const editionId of delta.toUpload.editions) {
      onProgress?.({
        status: 'uploading',
        phase: 'uploading',
        current: 40 + Math.floor((uploaded / totalUploads) * 25),
        total: 100,
        itemType: 'editions',
      });

      const edition = await db.editions.get(editionId);
      if (edition) {
        await googleDrive.saveEdition(editionId, edition);
        counts.editions.added++;
      }
      uploaded++;
    }

    // Upload script pages
    for (const pageId of delta.toUpload.scriptPages) {
      onProgress?.({
        status: 'uploading',
        phase: 'uploading',
        current: 40 + Math.floor((uploaded / totalUploads) * 25),
        total: 100,
        itemType: 'scriptPages',
      });

      const page = await db.scriptPages.get(pageId);
      if (page) {
        await googleDrive.saveScriptPage(pageId, page);
        counts.scriptPages.added++;
      }
      uploaded++;
    }

    // Upload panels
    for (const panelId of delta.toUpload.panels) {
      onProgress?.({
        status: 'uploading',
        phase: 'uploading',
        current: 40 + Math.floor((uploaded / totalUploads) * 25),
        total: 100,
        itemType: 'panels',
      });

      const panel = await db.panels.get(panelId);
      if (panel) {
        await googleDrive.savePanel(panelId, panel);
        counts.panels.added++;
      }
      uploaded++;
    }

    return counts;
  }

  /**
   * Download remote changes from Google Drive
   */
  private async downloadChanges(
    delta: SyncDelta,
    onProgress?: ProgressCallback
  ): Promise<{
    projects: SyncItemCounts;
    characters: SyncItemCounts;
    images: SyncItemCounts;
    files: SyncItemCounts;
    editions: SyncItemCounts;
    scriptPages: SyncItemCounts;
    panels: SyncItemCounts;
  }> {
    const counts = {
      projects: { added: 0, updated: 0, deleted: 0 },
      characters: { added: 0, updated: 0, deleted: 0 },
      images: { added: 0, updated: 0, deleted: 0 },
      files: { added: 0, updated: 0, deleted: 0 },
      editions: { added: 0, updated: 0, deleted: 0 },
      scriptPages: { added: 0, updated: 0, deleted: 0 },
      panels: { added: 0, updated: 0, deleted: 0 },
    };

    const totalDownloads = delta.toDownload.projects.length +
      delta.toDownload.characters.length +
      delta.toDownload.images.length +
      delta.toDownload.files.length +
      delta.toDownload.editions.length +
      delta.toDownload.scriptPages.length +
      delta.toDownload.panels.length;

    let downloaded = 0;

    // Download projects
    for (const projectId of delta.toDownload.projects) {
      onProgress?.({
        status: 'downloading',
        phase: 'downloading',
        current: 65 + Math.floor((downloaded / totalDownloads) * 25),
        total: 100,
        itemType: 'projects',
      });

      const project = await googleDrive.getProject<Project>(projectId);
      if (project) {
        // Convert date strings back to Date objects
        const projectWithDates = {
          ...project,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
        };
        await db.projects.put(projectWithDates);
        counts.projects.added++;
      }
      downloaded++;
    }

    // Download characters
    for (const characterId of delta.toDownload.characters) {
      onProgress?.({
        status: 'downloading',
        phase: 'downloading',
        current: 65 + Math.floor((downloaded / totalDownloads) * 25),
        total: 100,
        itemType: 'characters',
      });

      const character = await googleDrive.getCharacter<Character>(characterId);
      if (character) {
        const characterWithDates = {
          ...character,
          createdAt: new Date(character.createdAt),
          updatedAt: new Date(character.updatedAt),
          canvasState: character.canvasState ? {
            ...character.canvasState,
            updatedAt: new Date(character.canvasState.updatedAt),
          } : undefined,
        };
        await db.characters.put(characterWithDates);
        counts.characters.added++;
      }
      downloaded++;
    }

    // Download image metadata and files
    for (const imageId of delta.toDownload.images) {
      onProgress?.({
        status: 'downloading',
        phase: 'downloading',
        current: 65 + Math.floor((downloaded / totalDownloads) * 25),
        total: 100,
        itemType: 'images',
      });

      const imageMeta = await googleDrive.getImageMeta<MoodboardImage>(imageId);
      if (imageMeta) {
        // Download the actual image file
        const imageBlob = await googleDrive.getImageFile(imageId);
        const thumbBlob = await googleDrive.getThumbnailFile(imageId);

        if (imageBlob && thumbBlob) {
          // Save to local storage
          await fileStorage.initialize();
          const storagePath = await fileStorage.saveImage(imageId, imageBlob);
          const thumbnailPath = await fileStorage.saveThumbnail(imageId, thumbBlob);

          // Save metadata with local paths
          const imageWithPaths: MoodboardImage = {
            ...imageMeta,
            storagePath,
            thumbnailPath,
            createdAt: new Date(imageMeta.createdAt),
          };

          await db.images.put(imageWithPaths);
          counts.images.added++;
          counts.files.added++;
        }
      }
      downloaded++;
    }

    // Download editions
    for (const editionId of delta.toDownload.editions) {
      onProgress?.({
        status: 'downloading',
        phase: 'downloading',
        current: 65 + Math.floor((downloaded / totalDownloads) * 25),
        total: 100,
        itemType: 'editions',
      });

      const edition = await googleDrive.getEdition<Edition>(editionId);
      if (edition) {
        const editionWithDates = {
          ...edition,
          createdAt: new Date(edition.createdAt),
          updatedAt: new Date(edition.updatedAt),
        };
        await db.editions.put(editionWithDates);
        counts.editions.added++;
      }
      downloaded++;
    }

    // Download script pages
    for (const pageId of delta.toDownload.scriptPages) {
      onProgress?.({
        status: 'downloading',
        phase: 'downloading',
        current: 65 + Math.floor((downloaded / totalDownloads) * 25),
        total: 100,
        itemType: 'scriptPages',
      });

      const page = await googleDrive.getScriptPage<ScriptPage>(pageId);
      if (page) {
        const pageWithDates = {
          ...page,
          createdAt: new Date(page.createdAt),
          updatedAt: new Date(page.updatedAt),
        };
        await db.scriptPages.put(pageWithDates);
        counts.scriptPages.added++;
      }
      downloaded++;
    }

    // Download panels
    for (const panelId of delta.toDownload.panels) {
      onProgress?.({
        status: 'downloading',
        phase: 'downloading',
        current: 65 + Math.floor((downloaded / totalDownloads) * 25),
        total: 100,
        itemType: 'panels',
      });

      const panel = await googleDrive.getPanel<Panel>(panelId);
      if (panel) {
        const panelWithDates = {
          ...panel,
          createdAt: new Date(panel.createdAt),
          updatedAt: new Date(panel.updatedAt),
        };
        await db.panels.put(panelWithDates);
        counts.panels.added++;
      }
      downloaded++;
    }

    return counts;
  }

  /**
   * Process deletions from sync
   */
  private async processDeletions(
    delta: SyncDelta
  ): Promise<void> {
    // Delete local items (from remote deletions)
    for (const deletion of delta.toDelete.local) {
      switch (deletion.type) {
        case 'project':
          await db.projects.delete(deletion.id);
          break;
        case 'character':
          await db.characters.delete(deletion.id);
          break;
        case 'image': {
          const image = await db.images.get(deletion.id);
          if (image) {
            // Delete files from storage
            await fileStorage.deleteImage(image.storagePath);
            await fileStorage.deleteImage(image.thumbnailPath);
          }
          await db.images.delete(deletion.id);
          break;
        }
        case 'edition':
          await db.editions.delete(deletion.id);
          break;
        case 'scriptPage':
          await db.scriptPages.delete(deletion.id);
          break;
        case 'panel':
          await db.panels.delete(deletion.id);
          break;
      }
    }

    // Delete remote items (from local deletions)
    for (const deletion of delta.toDelete.remote) {
      switch (deletion.type) {
        case 'project':
          await googleDrive.deleteProject(deletion.id);
          break;
        case 'character':
          await googleDrive.deleteCharacter(deletion.id);
          break;
        case 'image':
          await googleDrive.deleteImageMeta(deletion.id);
          await googleDrive.deleteImageFile(deletion.id);
          await googleDrive.deleteThumbnailFile(deletion.id);
          break;
        case 'edition':
          await googleDrive.deleteEdition(deletion.id);
          break;
        case 'scriptPage':
          await googleDrive.deleteScriptPage(deletion.id);
          break;
        case 'panel':
          await googleDrive.deletePanel(deletion.id);
          break;
      }
    }

    // Clear processed deletions
    const processedIds = [
      ...delta.toDelete.local.map(d => d.id),
      ...delta.toDelete.remote.map(d => d.id),
    ];
    await syncManifest.clearProcessedDeletions(processedIds);
  }

  /**
   * Apply conflict resolutions from user
   */
  private applyConflictResolutions(
    delta: SyncDelta,
    resolvedConflicts: SyncConflict[]
  ): SyncDelta {
    const newDelta = { ...delta };

    for (const conflict of resolvedConflicts) {
      const key = conflict.type === 'project' ? 'projects' :
        conflict.type === 'character' ? 'characters' :
          conflict.type === 'image' ? 'images' :
            conflict.type === 'edition' ? 'editions' :
              conflict.type === 'scriptPage' ? 'scriptPages' : 'panels';

      if (conflict.resolution === 'local') {
        // Upload local version
        if (!newDelta.toUpload[key].includes(conflict.itemId)) {
          newDelta.toUpload[key].push(conflict.itemId);
        }
        // Remove from download if present
        newDelta.toDownload[key] = newDelta.toDownload[key].filter(id => id !== conflict.itemId);
      } else if (conflict.resolution === 'remote') {
        // Download remote version
        if (!newDelta.toDownload[key].includes(conflict.itemId)) {
          newDelta.toDownload[key].push(conflict.itemId);
        }
        // Remove from upload if present
        newDelta.toUpload[key] = newDelta.toUpload[key].filter(id => id !== conflict.itemId);
      }
      // 'skip' means do nothing
    }

    // Clear conflicts
    newDelta.conflicts = [];

    return newDelta;
  }

  /**
   * Auto-resolve conflicts based on strategy
   */
  private autoResolveConflicts(
    delta: SyncDelta,
    strategy: ConflictStrategy
  ): SyncDelta {
    const resolvedConflicts = delta.conflicts.map(conflict => {
      let resolution: 'local' | 'remote' | 'skip';

      switch (strategy) {
        case 'local-wins':
          resolution = 'local';
          break;
        case 'remote-wins':
          resolution = 'remote';
          break;
        case 'newest-wins':
          resolution = conflict.local.updatedAt > conflict.remote.updatedAt
            ? 'local'
            : 'remote';
          break;
        default:
          resolution = 'skip';
      }

      return { ...conflict, resolution };
    });

    return this.applyConflictResolutions(delta, resolvedConflicts);
  }

  /**
   * Update last sync time in settings
   */
  private updateLastSyncTime(): void {
    this.lastSyncTime = Date.now();
    this.saveSyncSettings({
      lastSyncAt: new Date(),
      lastSyncDeviceId: getDeviceId(),
    });
  }

  /**
   * Determine sync direction from counts
   */
  private determineSyncDirection(
    uploadCounts: { projects: SyncItemCounts; characters: SyncItemCounts; images: SyncItemCounts; files: SyncItemCounts; editions: SyncItemCounts; scriptPages: SyncItemCounts; panels: SyncItemCounts },
    downloadCounts: { projects: SyncItemCounts; characters: SyncItemCounts; images: SyncItemCounts; files: SyncItemCounts; editions: SyncItemCounts; scriptPages: SyncItemCounts; panels: SyncItemCounts }
  ): 'push' | 'pull' | 'merge' | 'none' {
    const totalUploads =
      uploadCounts.projects.added + uploadCounts.characters.added +
      uploadCounts.images.added + uploadCounts.files.added +
      uploadCounts.editions.added + uploadCounts.scriptPages.added +
      uploadCounts.panels.added;

    const totalDownloads =
      downloadCounts.projects.added + downloadCounts.characters.added +
      downloadCounts.images.added + downloadCounts.files.added +
      downloadCounts.editions.added + downloadCounts.scriptPages.added +
      downloadCounts.panels.added;

    if (totalUploads > 0 && totalDownloads > 0) return 'merge';
    if (totalUploads > 0) return 'push';
    if (totalDownloads > 0) return 'pull';
    return 'none';
  }

  /**
   * Merge upload and download counts
   */
  private mergeCounts(upload: SyncItemCounts, download: SyncItemCounts): SyncItemCounts {
    return {
      added: upload.added + download.added,
      updated: upload.updated + download.updated,
      deleted: upload.deleted + download.deleted,
    };
  }

  /**
   * Create success result
   */
  private createSuccessResult(
    direction: 'push' | 'pull' | 'merge' | 'none',
    startTime: number,
    itemsSynced: {
      projects: SyncItemCounts;
      characters: SyncItemCounts;
      images: SyncItemCounts;
      files: SyncItemCounts;
      editions: SyncItemCounts;
      scriptPages: SyncItemCounts;
      panels: SyncItemCounts;
    }
  ): SyncResult {
    return {
      success: true,
      direction,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      itemsSynced,
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(message: string, startTime: number): SyncResult {
    return {
      success: false,
      direction: 'none',
      timestamp: new Date(),
      duration: Date.now() - startTime,
      itemsSynced: {
        projects: { added: 0, updated: 0, deleted: 0 },
        characters: { added: 0, updated: 0, deleted: 0 },
        images: { added: 0, updated: 0, deleted: 0 },
        files: { added: 0, updated: 0, deleted: 0 },
        editions: { added: 0, updated: 0, deleted: 0 },
        scriptPages: { added: 0, updated: 0, deleted: 0 },
        panels: { added: 0, updated: 0, deleted: 0 },
      },
      errors: [{ type: 'unknown', message }],
    };
  }

  /**
   * Quick check if there are changes to sync (without full sync)
   */
  async checkForChanges(): Promise<{ hasChanges: boolean; direction?: 'push' | 'pull' | 'merge' }> {
    if (!this.isConnected()) {
      return { hasChanges: false };
    }

    try {
      await googleDrive.initialize();

      const localManifest = await syncManifest.buildLocalManifest();
      const remoteManifest = await googleDrive.getManifest<SyncManifest>();
      const delta = await syncManifest.compareManifests(localManifest, remoteManifest);

      if (!delta.hasChanges) {
        return { hasChanges: false };
      }

      // Determine direction
      const hasUploads = delta.toUpload.projects.length > 0 ||
        delta.toUpload.characters.length > 0 ||
        delta.toUpload.images.length > 0;

      const hasDownloads = delta.toDownload.projects.length > 0 ||
        delta.toDownload.characters.length > 0 ||
        delta.toDownload.images.length > 0;

      let direction: 'push' | 'pull' | 'merge';
      if (hasUploads && hasDownloads) {
        direction = 'merge';
      } else if (hasUploads) {
        direction = 'push';
      } else {
        direction = 'pull';
      }

      return { hasChanges: true, direction };
    } catch (error) {
      console.error('[SyncService] Check for changes failed:', error);
      return { hasChanges: false };
    }
  }
}

// Singleton instance
export const syncService = new SyncService();
