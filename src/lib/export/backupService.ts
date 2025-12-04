/**
 * Backup Service
 * 
 * Handles full database backup and restore with OPFS files.
 * Uses dexie-export-import for database serialization.
 * 
 * NOTE: This module uses dynamic imports for dexie-export-import
 * because it references 'self' which is not available during SSR.
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from '@/lib/db/database';
import { fileStorage } from '@/lib/storage/fileStorage';

// Backup manifest version - increment when changing backup structure
const BACKUP_VERSION = 1;
const BACKUP_TYPE = 'moodboard-full-backup';

export interface BackupManifest {
  version: number;
  type: string;
  appVersion: string;
  createdAt: string;
  stats: {
    projects: number;
    characters: number;
    images: number;
    totalFileSize: number;
  };
}

export interface BackupProgress {
  phase: 'preparing' | 'exporting-db' | 'exporting-files' | 'creating-zip' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface RestoreProgress {
  phase: 'reading-zip' | 'validating' | 'restoring-files' | 'restoring-db' | 'done';
  current: number;
  total: number;
  message: string;
}

export type ProgressCallback<T> = (progress: T) => void;

/**
 * Create a full backup of the database and all OPFS files
 */
export async function createFullBackup(
  onProgress?: ProgressCallback<BackupProgress>
): Promise<void> {
  const zip = new JSZip();

  // Phase 1: Prepare - count items
  onProgress?.({
    phase: 'preparing',
    current: 0,
    total: 100,
    message: 'Counting items...',
  });

  const [projects, characters, images] = await Promise.all([
    db.projects.count(),
    db.characters.count(),
    db.images.toArray(),
  ]);

  // Phase 2: Export database
  onProgress?.({
    phase: 'exporting-db',
    current: 0,
    total: 100,
    message: 'Exporting database...',
  });

  // Dynamically import to avoid SSR issues
  const { exportDB } = await import('dexie-export-import');

  const dbBlob = await exportDB(db, {
    prettyJson: false,
    progressCallback: ({ completedRows, totalRows }: { completedRows: number; totalRows?: number }) => {
      onProgress?.({
        phase: 'exporting-db',
        current: completedRows,
        total: totalRows ?? completedRows,
        message: `Exporting database (${completedRows}/${totalRows ?? '?'} rows)...`,
      });
      return true; // Continue
    },
  });

  zip.file('database.json', dbBlob);

  // Phase 3: Export OPFS files
  const filesFolder = zip.folder('files');
  const imagesFolder = filesFolder?.folder('images');
  const thumbnailsFolder = filesFolder?.folder('thumbnails');

  let totalFileSize = 0;
  const totalFiles = images.length * 2; // images + thumbnails
  let processedFiles = 0;

  for (const image of images) {
    // Export original image
    try {
      const imageFile = await fileStorage.getImage(image.storagePath);
      if (imageFile && imagesFolder) {
        const arrayBuffer = await imageFile.arrayBuffer();
        totalFileSize += arrayBuffer.byteLength;

        // Extract filename from storage path (e.g., "opfs://images/uuid" -> "uuid")
        const filename = image.storagePath.split('/').pop() || image.id;
        imagesFolder.file(filename, arrayBuffer);
      }
    } catch (error) {
      console.warn(`Failed to export image ${image.id}:`, error);
    }

    processedFiles++;
    onProgress?.({
      phase: 'exporting-files',
      current: processedFiles,
      total: totalFiles,
      message: `Exporting files (${processedFiles}/${totalFiles})...`,
    });

    // Export thumbnail
    try {
      const thumbFile = await fileStorage.getImage(image.thumbnailPath);
      if (thumbFile && thumbnailsFolder) {
        const arrayBuffer = await thumbFile.arrayBuffer();
        totalFileSize += arrayBuffer.byteLength;

        const filename = image.thumbnailPath.split('/').pop() || `thumb-${image.id}`;
        thumbnailsFolder.file(filename, arrayBuffer);
      }
    } catch (error) {
      console.warn(`Failed to export thumbnail ${image.id}:`, error);
    }

    processedFiles++;
    onProgress?.({
      phase: 'exporting-files',
      current: processedFiles,
      total: totalFiles,
      message: `Exporting files (${processedFiles}/${totalFiles})...`,
    });
  }

  // Create manifest
  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    type: BACKUP_TYPE,
    appVersion: '0.1.0',
    createdAt: new Date().toISOString(),
    stats: {
      projects,
      characters,
      images: images.length,
      totalFileSize,
    },
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Phase 4: Generate ZIP
  onProgress?.({
    phase: 'creating-zip',
    current: 0,
    total: 100,
    message: 'Creating backup file...',
  });

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.({
        phase: 'creating-zip',
        current: metadata.percent,
        total: 100,
        message: `Creating backup file (${Math.round(metadata.percent)}%)...`,
      });
    }
  );

  // Download
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `moodboard-backup-${timestamp}.zip`;
  saveAs(blob, filename);

  onProgress?.({
    phase: 'done',
    current: 100,
    total: 100,
    message: 'Backup complete!',
  });
}

/**
 * Validate a backup file without restoring
 */
export async function validateBackup(file: File): Promise<{
  valid: boolean;
  manifest?: BackupManifest;
  error?: string;
}> {
  try {
    const zip = await JSZip.loadAsync(file);

    // Check manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      return { valid: false, error: 'Missing manifest.json - not a valid backup' };
    }

    const manifestText = await manifestFile.async('text');
    const manifest: BackupManifest = JSON.parse(manifestText);

    // Validate manifest
    if (manifest.type !== BACKUP_TYPE) {
      return { valid: false, error: `Invalid backup type: ${manifest.type}` };
    }

    if (manifest.version > BACKUP_VERSION) {
      return {
        valid: false,
        error: `Backup version ${manifest.version} is newer than supported (${BACKUP_VERSION})`
      };
    }

    // Check database file
    const dbFile = zip.file('database.json');
    if (!dbFile) {
      return { valid: false, error: 'Missing database.json' };
    }

    // Try to peek at the database structure
    const dbBlob = await dbFile.async('blob');
    const { peakImportFile } = await import('dexie-export-import');
    const importMeta = await peakImportFile(dbBlob);

    if (importMeta.data?.databaseName !== 'MoodboardManager') {
      return { valid: false, error: `Database name mismatch: expected 'MoodboardManager', got '${importMeta.data?.databaseName}'` };
    }

    return { valid: true, manifest };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to read backup file'
    };
  }
}

/**
 * Restore from a full backup
 * WARNING: This will clear all existing data!
 */
export async function restoreFromBackup(
  file: File,
  onProgress?: ProgressCallback<RestoreProgress>
): Promise<void> {
  // Phase 1: Read ZIP
  onProgress?.({
    phase: 'reading-zip',
    current: 0,
    total: 100,
    message: 'Reading backup file...',
  });

  const zip = await JSZip.loadAsync(file);

  // Phase 2: Validate
  onProgress?.({
    phase: 'validating',
    current: 0,
    total: 100,
    message: 'Validating backup...',
  });

  const validation = await validateBackup(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid backup file');
  }

  const manifest = validation.manifest!;

  // Phase 3: Clear existing OPFS files
  onProgress?.({
    phase: 'restoring-files',
    current: 0,
    total: manifest.stats.images * 2,
    message: 'Preparing storage...',
  });

  // Initialize file storage
  await fileStorage.initialize();

  // Track the new storage paths for updating the database later
  const pathMapping: Map<string, string> = new Map();

  // Phase 4: Restore OPFS files
  const imagesFolder = zip.folder('files/images');
  const thumbnailsFolder = zip.folder('files/thumbnails');

  let restoredFiles = 0;
  const totalFiles = manifest.stats.images * 2;

  // Restore images
  if (imagesFolder) {
    const imageFiles = Object.keys(imagesFolder.files).filter(
      (path) => !path.endsWith('/') && path.startsWith('files/images/')
    );

    for (const path of imageFiles) {
      const zipFile = zip.file(path);
      if (zipFile) {
        try {
          const arrayBuffer = await zipFile.async('arraybuffer');
          const filename = path.split('/').pop()!;
          const blob = new Blob([arrayBuffer]);
          const newPath = await fileStorage.saveImage(filename, blob);
          // Track the path mapping (original opfs:// path -> new path which could be idb://)
          pathMapping.set(`opfs://images/${filename}`, newPath);
        } catch (error) {
          console.warn(`Failed to restore image ${path}:`, error);
        }
      }

      restoredFiles++;
      onProgress?.({
        phase: 'restoring-files',
        current: restoredFiles,
        total: totalFiles,
        message: `Restoring files (${restoredFiles}/${totalFiles})...`,
      });
    }
  }

  // Restore thumbnails
  if (thumbnailsFolder) {
    const thumbFiles = Object.keys(thumbnailsFolder.files).filter(
      (path) => !path.endsWith('/') && path.startsWith('files/thumbnails/')
    );

    for (const path of thumbFiles) {
      const zipFile = zip.file(path);
      if (zipFile) {
        try {
          const arrayBuffer = await zipFile.async('arraybuffer');
          const filename = path.split('/').pop()!;
          const blob = new Blob([arrayBuffer]);
          const newPath = await fileStorage.saveThumbnail(filename, blob);
          // Track the path mapping (original opfs:// path -> new path which could be idb://)
          pathMapping.set(`opfs://thumbnails/${filename}`, newPath);
        } catch (error) {
          console.warn(`Failed to restore thumbnail ${path}:`, error);
        }
      }

      restoredFiles++;
      onProgress?.({
        phase: 'restoring-files',
        current: restoredFiles,
        total: totalFiles,
        message: `Restoring files (${restoredFiles}/${totalFiles})...`,
      });
    }
  }

  // Phase 5: Restore database
  onProgress?.({
    phase: 'restoring-db',
    current: 0,
    total: 100,
    message: 'Restoring database...',
  });

  const dbFile = zip.file('database.json');
  if (!dbFile) {
    throw new Error('Missing database.json in backup');
  }

  const dbBlob = await dbFile.async('blob');

  // Import database using importInto (which supports clearTablesBeforeImport)
  const { importInto } = await import('dexie-export-import');

  await importInto(db, dbBlob, {
    clearTablesBeforeImport: true,
    acceptVersionDiff: true,
    overwriteValues: true,
    progressCallback: (progress: { completedRows: number; totalRows?: number }) => {
      onProgress?.({
        phase: 'restoring-db',
        current: progress.completedRows,
        total: progress.totalRows ?? progress.completedRows,
        message: `Restoring database (${progress.completedRows}/${progress.totalRows ?? '?'} rows)...`,
      });
      return true;
    },
  });

  // Update image paths if storage backend changed (e.g., backup from OPFS restored on IndexedDB-only device)
  if (pathMapping.size > 0) {
    const images = await db.images.toArray();
    const updates: { id: string; storagePath: string; thumbnailPath: string }[] = [];

    for (const image of images) {
      const newStoragePath = pathMapping.get(image.storagePath);
      const newThumbnailPath = pathMapping.get(image.thumbnailPath);

      if (newStoragePath || newThumbnailPath) {
        updates.push({
          id: image.id,
          storagePath: newStoragePath || image.storagePath,
          thumbnailPath: newThumbnailPath || image.thumbnailPath,
        });
      }
    }

    // Apply path updates
    for (const update of updates) {
      await db.images.update(update.id, {
        storagePath: update.storagePath,
        thumbnailPath: update.thumbnailPath,
      });
    }

    if (updates.length > 0) {
      console.log(`[BackupService] Updated ${updates.length} image paths for new storage backend`);
    }
  }

  onProgress?.({
    phase: 'done',
    current: 100,
    total: 100,
    message: 'Restore complete!',
  });
}

/**
 * Get info about the current database for display
 */
export async function getDatabaseStats(): Promise<{
  projects: number;
  characters: number;
  images: number;
  storageUsed: string;
}> {
  const [projects, characters, images] = await Promise.all([
    db.projects.count(),
    db.characters.count(),
    db.images.count(),
  ]);

  const storage = await fileStorage.getStorageEstimate();

  return {
    projects,
    characters,
    images,
    storageUsed: fileStorage.formatBytes(storage.used),
  };
}

/**
 * Clear all data - both database and OPFS files
 * This completely resets the app to a fresh state
 */
export async function clearAllData(): Promise<{
  tablesCleared: number;
  filesDeleted: number;
}> {
  console.log('[BackupService] Starting full data clear...');

  // Step 1: Clear OPFS files first
  await fileStorage.initialize();
  const { totalDeleted } = await fileStorage.clearAllFiles();

  // Step 2: Clear all database tables
  await db.transaction('rw', [db.projects, db.characters, db.images], async () => {
    await db.images.clear();
    await db.characters.clear();
    await db.projects.clear();
  });

  console.log('[BackupService] All data cleared');

  return {
    tablesCleared: 3,
    filesDeleted: totalDeleted,
  };
}
