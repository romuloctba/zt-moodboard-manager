# Sync Architecture Documentation

## Overview

The Moodboard Manager sync system enables multi-device synchronization of Projects, Characters, Images, Editions, Script Pages, and Panels through Google Drive's App Data storage. It uses a **manifest-based change detection** system with **content hashing** to identify what needs syncing, minimizing data transfer and enabling conflict detection.

---

## Core Concepts


### 1. **Manifest System**

The sync system revolves around a **manifest file** (`manifest.json`) stored in Google Drive that tracks:
- All synced items across all entity types (projects, characters, images, editions, scriptPages, panels)
- Content hashes (SHA-256) for change detection
- Version numbers for tracking updates
- Timestamps and device information
- Deleted items (for propagating deletions across devices)

#### Manifest Structure
```
{
  version: number,                           // Increments with each sync
  schemaVersion: number,                     // For compatibility (currently 1)
  lastModified: ISO timestamp,
  lastModifiedDeviceId: string,              // Which device last modified
  lastModifiedDeviceName: string,
  
  projects: {
    [id]: { id, hash, updatedAt, version }
  },
  characters: { ... },
  images: { ... },
  editions: { ... },
  scriptPages: { ... },
  panels: { ... },
  
  deletedItems: [
    { id, type, deletedAt, deletedByDeviceId }
  ]
}
```

**Key Points:**
- Local and remote manifests are compared to determine what changed
- Content hashes detect modifications even if timestamps are identical
- Version numbers increment on each sync operation
- Deleted items are tracked for 30 days to propagate across devices

---

### 2. **Change Detection (Delta Calculation)**

When syncing, the system compares local and remote manifests to build a **delta** object:

```
{
  hasChanges: boolean,
  
  toUpload: {
    projects: [id1, id2...],      // New or modified locally
    characters: [...],
    images: [...],                 // Metadata only
    files: [...]                   // Actual image binary files
  },
  
  toDownload: {
    projects: [...],               // New or modified remotely
    characters: [...],
    images: [...],
    files: [...]
  },
  
  toDelete: {
    remote: [deletion records],    // Delete from Google Drive
    local: [deletion records]      // Delete from IndexedDB
  },
  
  conflicts: [...]                 // Items modified on both sides
}
```

#### Delta Logic


**For each item in manifest (projects, characters, images, editions, scriptPages, panels):**

1. **Only in local** → Add to `toUpload`
2. **Only in remote** → Add to `toDownload`
3. **In both:**
    - Compare content hashes
    - If hashes match → No action (already synced)
    - If hashes differ:
       - **Same device** → Newer timestamp wins (upload or download)
       - **Different devices** → **CONFLICT** (requires resolution)

**Conflict Detection Criteria:**
- Content differs (hash mismatch)
- Modified on different devices (`localDeviceId ≠ remoteDeviceId`)
- Both versions exist in their respective locations

---

### 3. **Device Identity**

Each device generates and stores a unique identifier:

- **Device ID**: `device-{UUID}` stored in localStorage
- **Device Name**: Auto-detected (iPhone, iPad, Mac, etc.) or custom set
- Used for:
  - Conflict detection (same device = no conflict)
  - Tracking which device last modified data
  - Displaying conflict source to users

**Critical Issue Identified:**
The system compares `lastModifiedDeviceId` from the **manifest level** (not item level) when determining conflicts. This means if Device A syncs, the entire manifest gets `lastModifiedDeviceId = A`. When Device B syncs later, items created by B are compared against manifest-level device A, potentially causing false conflicts.

---

### 4. **Conflict Resolution**

When conflicts are detected, resolution follows the configured strategy:

#### Strategies:
1. **newest-wins** (default): Compare timestamps, use most recent
2. **local-wins**: Always keep local version
3. **remote-wins**: Always keep remote version
4. **ask**: Present conflicts to user for manual resolution

#### Conflict Resolution Flow:
```
1. Detect conflicts during delta calculation
2. If strategy = 'ask':
   - Show ConflictDialog to user
   - Wait for user selections
   - Apply resolutions to delta
3. If auto-strategy:
   - Apply strategy rules immediately
   - Update delta accordingly
4. Proceed with upload/download based on resolved delta
```

**Problem Area:**
The current conflict detection compares device IDs at the manifest level, not at the individual item level. This can cause:
- False positives: Items from the same device flagged as conflicts
- Sync failures: Conflicts prevent sync completion when strategy='ask'

---

## Sync Flow (Step-by-Step)

### Phase 1: Connection & Initialization
1. Check if Google Drive is connected (`googleAuth.isSignedIn()`)
2. Verify not already syncing (prevent concurrent operations)
3. Check rate limiting (minimum 30s between syncs)
4. Initialize Google Drive folders:
   - `moodboard-sync/` (root in appDataFolder)
   - `projects/`, `characters/`, `images/`, `files/` subfolders

### Phase 2: Build Local Manifest
1. Query IndexedDB for all entities:
   - `db.projects.toArray()`
   - `db.characters.toArray()`
   - `db.images.toArray()`
   - `db.editions.toArray()`
   - `db.scriptPages.toArray()`
   - `db.panels.toArray()`
2. For each item:
   - Calculate SHA-256 hash of full object
   - Create ItemSyncMeta: `{ id, hash, updatedAt, version }`
3. Get deleted items from localStorage (`moodboard-deleted-items`)
4. Increment local version number
5. Set device ID and name

**Issue:** Editions, scriptPages, and panels are included in manifest building but NOT in the upload/download logic of syncService. This means they're hashed and tracked but never actually synced.

### Phase 3: Get Remote Manifest
1. Fetch `manifest.json` from Google Drive root folder
2. If doesn't exist → First sync, create empty manifest
3. Parse JSON to SyncManifest object

### Phase 4: Compare Manifests (Delta Calculation)
1. For each entity type (projects, characters, images, editions, scriptPages, panels):
   - Compare local vs remote IDs
   - Calculate what's new, modified, deleted
   - Detect conflicts (different devices + different hashes)
2. Build delta object with all changes
3. Set `delta.hasChanges = true` if any changes found

### Phase 5: Handle Conflicts
1. If conflicts exist AND strategy='ask':
   - Trigger `onConflict` callback
   - Show ConflictDialog in UI
   - Wait for user resolution
   - Apply resolutions to delta
2. If auto-strategy:
   - Apply strategy rules to each conflict
   - Update delta with resolutions
3. Remove resolved conflicts from delta

### Phase 6: Upload Changes

For each ID in `delta.toUpload`:

**Projects:**
1. Get project from IndexedDB
2. Save to Google Drive: `files/{projectId}.json`
3. Increment upload counter

**Characters:**
1. Get character from IndexedDB
2. Save to Google Drive: `files/{characterId}.json`
3. Increment upload counter

**Images (Metadata):**
1. Get image from IndexedDB
2. Remove local-only fields (`storagePath`, `thumbnailPath`)
3. Save metadata to Drive: `files/{imageId}.json`
4. Increment counter

**Images (Files):**
1. Get image from IndexedDB
2. Load actual file from OPFS: `fileStorage.getImage(storagePath)`
3. Upload to Drive: `files/{imageId}.webp`
4. Upload thumbnail: `files/{imageId}_thumb.webp`
5. Increment file counter

**Editions, Script Pages, Panels:**
1. Get item from IndexedDB
2. Save to Google Drive: `files/{id}.json`
3. Increment upload counter

### Phase 7: Download Changes

For each ID in `delta.toDownload`:

**Projects:**
1. Fetch from Google Drive
2. Parse JSON
3. Convert date strings to Date objects
4. Save to IndexedDB: `db.projects.put()`

**Characters:**
1. Fetch from Google Drive
2. Parse JSON and convert dates
3. Handle nested `canvasState.updatedAt` date
4. Save to IndexedDB: `db.characters.put()`

**Images:**
1. Fetch metadata from Drive
2. Download image file (`.webp`)
3. Download thumbnail file (`_thumb.webp`)
4. Save files to OPFS via `fileStorage`
5. Update metadata with local storage paths
6. Save to IndexedDB: `db.images.put()`

**Editions, Script Pages, Panels:**
1. Fetch from Google Drive
2. Parse JSON and convert dates as needed
3. Save to IndexedDB: `db.editions.put()`, `db.scriptPages.put()`, `db.panels.put()`

### Phase 8: Process Deletions

1. **Delete from local** (items deleted remotely):
    - For each `delta.toDelete.local`:
       - Delete from IndexedDB
       - For images: also delete from OPFS
2. **Delete from remote** (items deleted locally):
    - For each `delta.toDelete.remote`:
       - Delete from Google Drive
       - For images: delete metadata + files
3. Clear processed deletions from localStorage

### Phase 9: Merge & Save Manifest
1. Create merged manifest:
   - Increment version number
   - Combine local and remote items
   - Remove deleted items
   - Set current device as last modifier
2. Upload merged manifest to Google Drive
3. Update local version in localStorage


**Resolved:** Editions, scriptPages, and panels are now fully synced, so the merged manifest accurately reflects the current state and avoids perpetual change detection.

### Phase 10: Finalize
1. Update last sync time in settings
2. Save settings to localStorage
3. Return SyncResult with counts and status
4. Update UI to show success/error

---

## Data Storage Locations

### Local (Browser)
- **IndexedDB** (`moodboard-db`):
  - projects, characters, images, editions, scriptPages, panels tables
- **OPFS** (Origin Private File System):
  - Image files: `/images/{id}.webp`
  - Thumbnails: `/images/{id}_thumb.webp`
- **localStorage**:
  - `moodboard-sync-settings`: Sync configuration
  - `moodboard-sync-version`: Local manifest version
  - `moodboard-deleted-items`: Deletion records
  - `moodboard-device-id`: Unique device identifier
  - `moodboard-device-name`: Device display name

### Remote (Google Drive appDataFolder)
- **Root**: `moodboard-sync/`
   - `manifest.json`: Central sync manifest
   - `projects/{id}.json`: Project data
   - `characters/{id}.json`: Character data
   - `images/{id}.json`: Image metadata
   - `editions/{id}.json`: Edition data
   - `scriptPages/{id}.json`: Script page data
   - `panels/{id}.json`: Panel data
   - `files/{id}.webp`: Full image files
   - `files/{id}_thumb.webp`: Thumbnail files

---

## Critical Issues Identified


### 1. **Incomplete Entity Sync**
**Resolved:** Editions, scriptPages, and panels are now fully included in delta calculation, upload/download, and deletion logic. All entities are properly synced between devices, and the manifest accurately reflects their state. The previous issues with perpetual sync mismatch and missing data propagation are fixed.

### 2. **Device ID Conflict Detection**
**Problem:** Conflict detection compares:
```typescript
if (localDeviceId === remoteDeviceId) {
  // Same device - newer wins (no conflict)
} else {
  // Different devices - CONFLICT
}
```

But it uses **manifest-level** `lastModifiedDeviceId`, not item-level tracking.

**Scenario:**
1. Phone creates Project A and syncs → manifest has `deviceId = Phone`
2. Phone creates Project B locally (not yet synced)
3. iPad syncs (downloads Project A) → modifies manifest → `deviceId = iPad`
4. Phone syncs again:
   - Compares Project B (local) vs nothing (remote)
   - Should upload Project B
   - But manifest says `remoteDeviceId = iPad`
   - System incorrectly thinks it's a different device scenario

**Impact:**
- False conflict detection
- Same-device edits flagged as conflicts
- Sync fragility when multiple devices take turns syncing

### 3. **Deletion Tracking for Unsynced Entities**
**Problem:** The deletion system references:
```typescript
type: 'project' | 'character' | 'image' | 'edition' | 'scriptPage' | 'panel'
```

And tries to process deletions for all types, but since editions/pages/panels don't sync, deletion propagation will fail partially.

**Impact:**
- User deletes edition on Phone → recorded in deletedItems
- Sync runs → tries to delete from remote → remote doesn't have it (never uploaded)
- Could cause sync errors or silent failures
- Deleted items accumulate in manifest without being cleared

### 4. **Manifest Version Misalignment**
**Problem:** 
- Local manifest version increments every time it's built
- Remote manifest version only updates when sync completes successfully
- If sync fails mid-operation, versions get out of sync

**Impact:**
- Sync might skip items thinking they're already synced
- Version number becomes unreliable for change tracking
- No rollback mechanism for failed syncs

### 5. **Hash Calculation Inconsistency**
**Problem:** Panels have nested dialogues that are included in hash:
```typescript
const hash = await hashObject({
  ...panel,
  dialogues: panel.dialogues,
});
```

But if the order of dialogues changes (same content, different sortOrder), the hash will differ even though semantically nothing changed.

**Impact:**
- Unnecessary conflict detection
- Sync operations for cosmetic changes
- Performance impact from re-uploading unchanged data

---

## Sync Triggers

### Automatic Triggers
1. **On Startup** (if `syncOnStartup: true`):
   - Delayed by 2 seconds after app loads
   - Only if connected to Google Drive
   
2. **Periodic Auto-Sync** (if `autoSyncEnabled: true`):
   - Interval: 5, 15, 30, or 60 minutes (configurable)
   - Runs in background via `setInterval`
   - Skipped if already syncing

3. **Visibility Change**:
   - When tab becomes visible (user returns to app)
   - Debounced to 5 seconds minimum
   - Checks for changes without full sync

### Manual Triggers
1. **Sync Button** in Settings/Sync page
2. **Force Sync** with `force: true` option (bypasses rate limiting)
3. **Pull to Refresh** gesture (if implemented)

### Prevented Triggers
- Rate limited to minimum 30 seconds between syncs
- Blocked if already syncing (concurrent sync prevention)
- Disabled if not connected to Google Drive

---

## Error Handling

### Error Types
1. **AUTH_FAILED**: Google auth token expired or invalid
2. **NETWORK_ERROR**: No internet connection or API unreachable
3. **INVALID_DATA**: Corrupt manifest or malformed JSON
4. **STORAGE_FULL**: Google Drive quota exceeded
5. **CONFLICT_UNRESOLVED**: User cancelled conflict resolution
6. **RATE_LIMITED**: Too many API requests
7. **UNKNOWN**: Unexpected errors

### Retry Strategy
- Uses exponential backoff for transient failures
- Maximum 3 retries per operation
- Base delay: 1 second, doubles each retry
- Applied to Drive API requests

### Recovery
- Failed syncs leave manifest unchanged
- No partial state commits (atomic operations)
- User must manually retry after fixing issue
- Errors displayed in SyncProvider UI

**Gap:** No automatic recovery for auth refresh, quota issues, or network restoration.

---

## Concurrency & Race Conditions

### Protections
1. **Single Sync Lock**: `isSyncing` flag prevents concurrent operations
2. **Rate Limiting**: 30-second minimum between syncs
3. **Atomic Manifest Updates**: All-or-nothing approach

### Vulnerabilities
1. **Multi-Tab**: No cross-tab synchronization lock
   - Two tabs can sync simultaneously
   - Race condition on manifest updates
   - Could corrupt sync state

2. **Background Sync**: Service worker could interfere
   - PWA background sync not coordinated
   - Potential conflicts with foreground sync

3. **Offline Queue**: No queuing for failed operations
   - Changes made during sync are lost if not re-synced
   - No optimistic UI updates

---

## Performance Considerations

### Optimizations
- **Incremental Sync**: Only changed items transfer
- **Folder Pre-creation**: Subfolders created once during init
- **Cached Folder IDs**: Avoids repeated Drive API lookups
- **Parallel Uploads**: Projects, characters, images upload concurrently

### Bottlenecks
- **Image Files**: Large binary files slow down sync
- **Hash Calculation**: SHA-256 on large objects is CPU-intensive
- **API Rate Limits**: Google Drive quotas can throttle
- **Manifest Size**: As data grows, manifest parsing becomes expensive

### Unoptimized Areas
- No compression on image uploads
- No chunked uploads for large files
- No delta patching (always full file replacement)
- No background/deferred sync queue

---

## Security & Privacy

### Data Protection
- **appDataFolder**: Hidden from user, app-specific
- **HTTPS**: All Drive API requests encrypted
- **OAuth 2.0**: Secure token-based authentication
- **No Server**: Direct client-to-Drive sync (no intermediary)

### Potential Risks
- **localStorage**: Sync settings stored in plain text
  - Device ID, email, sync strategy exposed
  - Anyone with device access can read
  
- **Manifest**: Contains all item IDs and hashes
  - Could leak project structure
  - Not encrypted in Drive

- **Token Storage**: Access tokens in localStorage
  - Could be stolen via XSS
  - Should use more secure storage

---

## Future Improvements Needed

### High Priority
1. **Implement Edition/Page/Panel Sync**
   - Add to delta comparison logic
   - Implement upload/download handlers
   - Add to Google Drive folder structure
   - Handle hierarchical relationships (Edition → Pages → Panels)

2. **Fix Device ID Conflict Logic**
   - Store deviceId at item level, not just manifest level
   - Update conflict detection to use item-specific device tracking
   - Add migration for existing manifests

3. **Add Unit Tests**
   - Mock Google Drive API
   - Test delta calculation edge cases
   - Verify conflict resolution strategies
   - Test deletion propagation

### Medium Priority
4. **Improve Error Recovery**
   - Auto-retry on network errors
   - Refresh auth tokens automatically
   - Queue failed operations for retry

5. **Multi-Tab Coordination**
   - Use BroadcastChannel or SharedWorker
   - Coordinate sync operations across tabs
   - Prevent concurrent syncs

6. **Optimize Performance**
   - Compress image uploads
   - Implement chunked uploads for large files
   - Add sync queue for background operations

### Low Priority
7. **Enhanced Conflict UI**
   - Show visual diff of conflicting items
   - Allow item-level merge (not just choose one)
   - Preview before applying resolution

8. **Sync Analytics**
   - Track sync success rate
   - Monitor performance metrics
   - Alert on repeated failures

9. **Encryption**
   - End-to-end encrypt sensitive data
   - Use Web Crypto API for client-side encryption
   - Manage encryption keys securely

---

## Testing Strategy Recommendations

### Unit Tests
- **syncManifest.compareManifests()**: All delta calculation scenarios
- **syncManifest.mergeManifests()**: Merge logic correctness
- **Device ID logic**: Same device vs different device detection
- **Conflict resolution**: Each strategy's behavior
- **Hash calculation**: Consistency and collision resistance

### Integration Tests
- **Full sync flow**: End-to-end with mock Drive API
- **Conflict scenarios**: Simultaneous edits on different devices
- **Deletion propagation**: Delete on one device, verify on another
- **Network failures**: Retry logic and error handling
- **Large datasets**: Performance with 100s of items

### Manual Test Cases
1. **Clean slate**: First sync from empty state
2. **Bidirectional**: Changes on both devices, merge correctly
3. **Conflict resolution**: Each strategy produces expected results
4. **Offline → Online**: Changes sync when connection restored
5. **Concurrent edits**: Same item on multiple devices
6. **Image heavy**: Sync project with many large images
7. **Delete cascade**: Delete project with characters and images

---

## Glossary

- **Manifest**: JSON file tracking all synced items with metadata
- **Delta**: Calculated difference between local and remote state
- **Hash**: SHA-256 fingerprint of item content for change detection
- **Device ID**: Unique identifier for conflict resolution
- **appDataFolder**: Hidden Google Drive space for app data
- **OPFS**: Origin Private File System (browser storage for files)
- **Conflict**: Item modified on different devices simultaneously
- **Resolution Strategy**: Rules for auto-resolving conflicts
- **Sync Version**: Incrementing number tracking manifest changes

