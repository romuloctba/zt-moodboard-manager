/**
 * Google Drive Sync Types
 * 
 * Type definitions for the sync functionality including
 * settings, manifests, and operation results.
 */

// ===========================================
// Error Handling
// ===========================================

export type SyncErrorCode =
  | 'AUTH_FAILED'
  | 'NETWORK_ERROR'
  | 'INVALID_DATA'
  | 'STORAGE_FULL'
  | 'CONFLICT_UNRESOLVED'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export class SyncException extends Error {
  constructor(
    message: string,
    public code: SyncErrorCode,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'SyncException';
  }
}

// ===========================================
// Sync Settings & Configuration
// ===========================================

export interface SyncSettings {
  id: 'sync-settings';
  enabled: boolean;
  provider: SyncProvider;

  // Google-specific tokens (stored securely in IndexedDB)
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: number; // Unix timestamp
  googleEmail?: string;
  googleUserId?: string;

  // Sync behavior
  autoSyncEnabled: boolean;
  syncIntervalMinutes: SyncInterval;
  syncOnStartup: boolean;

  // State
  lastSyncAt?: Date;
  lastSyncDeviceId?: string;
  lastSyncDirection?: SyncDirection;

  // Conflict handling
  conflictStrategy: ConflictStrategy;

  // Device info
  deviceId: string;
  deviceName: string;
}

export type SyncProvider = 'none' | 'google-drive';
export type SyncInterval = 5 | 15 | 30 | 60;
export type ConflictStrategy = 'ask' | 'local-wins' | 'remote-wins' | 'newest-wins';
export type SyncDirection = 'push' | 'pull' | 'merge';

export const DEFAULT_SYNC_SETTINGS: Omit<SyncSettings, 'deviceId' | 'deviceName'> = {
  id: 'sync-settings',
  enabled: false,
  provider: 'none',
  autoSyncEnabled: true,
  syncIntervalMinutes: 15,
  syncOnStartup: true,
  conflictStrategy: 'newest-wins',
};

// ===========================================
// Sync Manifest (tracks what's synced)
// ===========================================

export interface SyncManifest {
  version: number;
  schemaVersion: number;
  lastModified: string; // ISO string for JSON serialization
  lastModifiedDeviceId: string;
  lastModifiedDeviceName: string;

  // Track individual items with their hashes
  projects: Record<string, ItemSyncMeta>;
  characters: Record<string, ItemSyncMeta>;
  images: Record<string, ItemSyncMeta>;
  editions: Record<string, ItemSyncMeta>;
  scriptPages: Record<string, ItemSyncMeta>;
  panels: Record<string, ItemSyncMeta>;

  // Track deleted items for sync
  deletedItems: DeletedItemRecord[];
}

export interface ItemSyncMeta {
  id: string;
  hash: string;           // SHA-256 hash of content
  updatedAt: string;      // ISO string
  syncedAt?: string;      // When last synced
  version: number;        // Increment on each change
}

export interface DeletedItemRecord {
  id: string;
  type: 'project' | 'character' | 'image' | 'edition' | 'scriptPage' | 'panel';
  deletedAt: string;
  deletedByDeviceId: string;
}

export const EMPTY_MANIFEST: SyncManifest = {
  version: 0,
  schemaVersion: 2,
  lastModified: new Date().toISOString(),
  lastModifiedDeviceId: '',
  lastModifiedDeviceName: '',
  projects: {},
  characters: {},
  images: {},
  editions: {},
  scriptPages: {},
  panels: {},
  deletedItems: [],
};

// ===========================================
// Sync Operations & Results
// ===========================================

export type SyncStatus =
  | 'idle'
  | 'connecting'
  | 'checking'
  | 'uploading'
  | 'downloading'
  | 'merging'
  | 'success'
  | 'error'
  | 'offline';

export type SyncPhase =
  | 'connecting'
  | 'analyzing'
  | 'checking'
  | 'comparing'
  | 'uploading'
  | 'downloading'
  | 'finalizing'
  | 'complete';

export interface SyncProgress {
  status: SyncStatus;
  phase: SyncPhase;
  current: number;
  total: number;
  itemType?: string; // 'projects', 'characters', 'images', 'files'
}

export interface SyncResult {
  success: boolean;
  direction: SyncDirection | 'none';
  timestamp: Date;
  duration: number; // ms

  itemsSynced: {
    projects: SyncItemCounts;
    characters: SyncItemCounts;
    images: SyncItemCounts;
    files: SyncItemCounts;
  };

  conflicts?: SyncConflict[];
  errors?: SyncError[];
}

export interface SyncItemCounts {
  added: number;
  updated: number;
  deleted: number;
}

export interface SyncError {
  type: 'auth' | 'network' | 'quota' | 'conflict' | 'unknown';
  message: string;
  itemId?: string;
  itemType?: string;
}

// ===========================================
// Conflict Resolution
// ===========================================

export interface SyncConflict {
  id: string;
  type: 'project' | 'character' | 'image';
  itemId: string;
  itemName: string;

  local: {
    version: number;
    updatedAt: Date;
    deviceId: string;
    deviceName: string;
  };

  remote: {
    version: number;
    updatedAt: Date;
    deviceId: string;
    deviceName: string;
  };

  resolution?: 'local' | 'remote' | 'skip';
}

// ===========================================
// Delta/Change Detection
// ===========================================

export interface SyncDelta {
  hasChanges: boolean;

  toUpload: {
    projects: string[];     // IDs of items to upload
    characters: string[];
    images: string[];       // Image metadata IDs
    files: string[];        // Image file IDs (actual binary)
  };

  toDownload: {
    projects: string[];
    characters: string[];
    images: string[];
    files: string[];
  };

  toDelete: {
    remote: DeletedItemRecord[];  // Delete from Drive
    local: DeletedItemRecord[];   // Delete from IndexedDB
  };

  conflicts: SyncConflict[];
}

// ===========================================
// Google Drive Specific
// ===========================================

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  appProperties?: Record<string, string>;
}

export interface DriveListResponse {
  files: DriveFileMetadata[];
  nextPageToken?: string;
}

// ===========================================
// Google Auth Types
// ===========================================

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

// ===========================================
// Constants
// ===========================================

export const SYNC_CONSTANTS = {
  // Manifest version for compatibility
  MANIFEST_VERSION: 1,
  SCHEMA_VERSION: 1,

  // Drive folder/file names
  ROOT_FOLDER_NAME: 'moodboard-sync',
  MANIFEST_FILE_NAME: 'manifest.json',
  PROJECTS_FOLDER: 'projects',
  CHARACTERS_FOLDER: 'characters',
  IMAGES_FOLDER: 'images',
  FILES_FOLDER: 'files',

  // API scopes
  DRIVE_SCOPE: 'https://www.googleapis.com/auth/drive.appdata',
  PROFILE_SCOPE: 'https://www.googleapis.com/auth/userinfo.email',

  // Rate limiting
  MIN_SYNC_INTERVAL_MS: 30_000, // 30 seconds minimum between syncs

  // Cleanup
  DELETED_ITEMS_RETENTION_DAYS: 30,

  // Auto-sync timing
  STARTUP_SYNC_DELAY_MS: 2_000, // Delay before first sync on startup
  VISIBILITY_SYNC_DEBOUNCE_MS: 5_000, // Minimum time between visibility-triggered syncs

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY_MS: 1_000, // Base delay for exponential backoff
} as const;
