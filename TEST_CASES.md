# Test Cases - Moodboard Manager

## Overview

This document outlines comprehensive test cases for the Moodboard Manager application - a PWA for visual reference management designed for character creators, graphic novel artists, and storytellers.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Zustand + Dexie.js (IndexedDB) + OPFS

---

## Table of Contents

1. [Unit Tests](#1-unit-tests)
2. [Integration Tests](#2-integration-tests)
3. [E2E Tests](#3-e2e-tests)
4. [Performance Tests](#4-performance-tests)
5. [Accessibility Tests](#5-accessibility-tests)
6. [Security Tests](#6-security-tests)

---

## 1. Unit Tests

### 1.1 Database Repositories

#### ProjectRepository (`src/lib/db/repositories/projectRepository.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| PR-001 | Create project with valid data | Should create a project with all required fields and return valid ID | High |
| PR-002 | Create project with minimal data | Should create project with only name, using defaults for optional fields | High |
| PR-003 | Get project by ID - existing | Should return complete project object for valid ID | High |
| PR-004 | Get project by ID - non-existing | Should return undefined or throw appropriate error | High |
| PR-005 | Get all projects - empty database | Should return empty array when no projects exist | Medium |
| PR-006 | Get all projects - excludes archived | Should return only non-archived projects by default | High |
| PR-007 | Get archived projects only | Should return only archived projects | Medium |
| PR-008 | Get all including archived | Should return both archived and non-archived projects | Medium |
| PR-009 | Update project metadata | Should update description, genre, theme, tags | High |
| PR-010 | Update project - updatedAt timestamp | Should update the updatedAt field on any modification | High |
| PR-011 | Rename project | Should update project name and updatedAt | High |
| PR-012 | Archive project | Should set isArchived to true | High |
| PR-013 | Unarchive project | Should set isArchived to false | Medium |
| PR-014 | Update project settings | Should merge new settings with existing | High |
| PR-015 | Delete project | Should remove project and return success | High |
| PR-016 | Delete project - cascading | Should trigger deletion of related characters, images, editions | Critical |
| PR-017 | Duplicate project | Should create deep copy with new IDs and "(Copy)" suffix | Medium |
| PR-018 | Project with special characters in name | Should handle unicode, emojis, and special characters | Medium |

#### CharacterRepository (`src/lib/db/repositories/characterRepository.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| CH-001 | Create character with valid data | Should create character linked to project with sortOrder | High |
| CH-002 | Create character - auto increment sortOrder | Should assign next sortOrder value automatically | High |
| CH-003 | Get character by ID | Should return complete character with profile and metadata | High |
| CH-004 | Get characters by project | Should return all characters for a project, sorted by sortOrder | High |
| CH-005 | Get characters by project - empty | Should return empty array when project has no characters | Medium |
| CH-006 | Update character profile | Should update age, role, personality, abilities, backstory | High |
| CH-007 | Update character metadata | Should update custom fields and visual metadata | Medium |
| CH-008 | Update character canvas state | Should persist viewport and canvas items | High |
| CH-009 | Rename character | Should update name and updatedAt | High |
| CH-010 | Delete character | Should remove character and cascade to images | High |
| CH-011 | Duplicate character | Should create copy with new ID, "(Copy)" suffix, and new sortOrder | Medium |
| CH-012 | Reorder characters | Should update sortOrder for all affected characters | High |
| CH-013 | Character with empty profile | Should handle character with minimal profile data | Medium |

#### ImageRepository (`src/lib/db/repositories/imageRepository.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| IM-001 | Create image with metadata | Should store image record with all metadata (size, dimensions, MIME) | High |
| IM-002 | Get image by ID | Should return complete image record with palette | High |
| IM-003 | Get images by character | Should return all images for a character | High |
| IM-004 | Get images by section | Should return images filtered by section | Medium |
| IM-005 | Update image tags | Should replace tags array with new values | High |
| IM-006 | Update image palette | Should store extracted color palette | Medium |
| IM-007 | Update image notes | Should update notes field | Low |
| IM-008 | Delete image | Should remove image record | High |
| IM-009 | Delete images by character | Should bulk delete all images for a character | High |
| IM-010 | Delete images by section | Should bulk delete all images for a section | Medium |
| IM-011 | Image with very long filename | Should handle filenames up to reasonable limits | Low |
| IM-012 | Image query with tag filter | Should filter images by tag when querying | Medium |

#### EditionRepository (`src/lib/db/repositories/editionRepository.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| ED-001 | Create edition with auto issue number | Should auto-increment issueNumber if not provided | High |
| ED-002 | Create edition with manual issue number | Should use provided issueNumber | Medium |
| ED-003 | Get edition by ID | Should return complete edition with metadata | High |
| ED-004 | Get editions by project | Should return all editions sorted by sortOrder | High |
| ED-005 | Update edition title | Should update title and updatedAt | High |
| ED-006 | Update edition status | Should transition between draft/in-progress/review/complete | High |
| ED-007 | Update edition status - invalid transition | Should handle or reject invalid status values | Medium |
| ED-008 | Update cover info | Should update coverDescription and coverImageId | Medium |
| ED-009 | Update edition metadata | Should update genre, targetAudience, estimatedPageCount | Medium |
| ED-010 | Reorder editions | Should update sortOrder for affected editions | High |
| ED-011 | Delete edition | Should cascade delete to pages and panels | Critical |
| ED-012 | Duplicate edition | Should deep copy with all pages and panels | Medium |
| ED-013 | Get edition stats | Should return correct page and panel counts | Medium |

#### ScriptPageRepository (`src/lib/db/repositories/scriptPageRepository.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| SP-001 | Create page with auto page number | Should auto-increment pageNumber | High |
| SP-002 | Create page with specific number | Should use provided pageNumber | Medium |
| SP-003 | Get page by ID | Should return complete page data | High |
| SP-004 | Get pages by edition | Should return sorted by sortOrder | High |
| SP-005 | Update page metadata | Should update goal, setting, timeOfDay, mood, notes | High |
| SP-006 | Update page status | Should transition between draft/scripted/review/approved | High |
| SP-007 | Reorder pages | Should update sortOrder for all affected pages | High |
| SP-008 | Delete page | Should cascade delete to panels | High |
| SP-009 | Duplicate page | Should copy with all panels and dialogues | Medium |
| SP-010 | Get page stats | Should return panel count | Low |

#### PanelRepository (`src/lib/db/repositories/panelRepository.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| PN-001 | Create panel with auto number | Should auto-increment panelNumber | High |
| PN-002 | Get panel by ID | Should return panel with dialogues | High |
| PN-003 | Get panels by page | Should return sorted by sortOrder | High |
| PN-004 | Update panel description | Should update description and cameraAngle | High |
| PN-005 | Update panel characters | Should update characters array | Medium |
| PN-006 | Add dialogue to panel | Should append dialogue with sortOrder | High |
| PN-007 | Update existing dialogue | Should update dialogue by ID | High |
| PN-008 | Remove dialogue from panel | Should remove dialogue and reorder remaining | High |
| PN-009 | Reorder dialogues | Should update sortOrder for dialogues | Medium |
| PN-010 | Reorder panels | Should update sortOrder for all panels | High |
| PN-011 | Delete panel | Should remove panel with all dialogues | High |
| PN-012 | Duplicate panel | Should copy with all dialogues | Medium |

---

### 1.2 Zustand Stores

#### ProjectStore (`src/store/projectStore.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| **Initial State** |
| PS-001 | Initial state values | Store initializes with empty projects[], null currentProject, empty characters[], null currentCharacter, isLoading=false | High |
| **loadProjects** |
| PS-002 | loadProjects success | Should fetch projects from repository and update state | High |
| PS-003 | loadProjects sets isLoading | Should set isLoading=true before fetch, false after | High |
| PS-004 | loadProjects error handling | Should set isLoading=false on error, log error, not throw | Medium |
| **selectProject** |
| PS-005 | selectProject success | Should set currentProject from repository and return true | High |
| PS-006 | selectProject clears character | Should set currentCharacter to null when selecting project | High |
| PS-007 | selectProject auto-loads characters | Should call loadCharacters after successful selection | High |
| PS-008 | selectProject non-existent | Should return false and set isLoading=false for non-existent ID | High |
| **createProject** |
| PS-009 | createProject adds to front | Should add new project to beginning of projects array (not end) | High |
| PS-010 | createProject returns project | Should return created project from repository | High |
| PS-011 | createProject triggers sync | Should call triggerGlobalSync after creation | Medium |
| **renameProject** |
| PS-012 | renameProject updates array | Should update project name in projects array | High |
| PS-013 | renameProject updates currentProject | Should update currentProject if renaming current project | High |
| PS-014 | renameProject updates updatedAt | Should update updatedAt timestamp in state | Medium |
| PS-015 | renameProject triggers sync | Should call triggerGlobalSync after rename | Medium |
| **archiveProject** |
| PS-016 | archiveProject removes from list | Should remove project from projects array | High |
| PS-017 | archiveProject clears current | Should set currentProject to null if archiving current | High |
| PS-018 | archiveProject triggers sync | Should call triggerGlobalSync after archive | Medium |
| **deleteProject** |
| PS-019 | deleteProject removes from list | Should remove project from projects array | High |
| PS-020 | deleteProject clears current | Should set currentProject to null if deleting current | High |
| PS-021 | deleteProject clears characters | Should clear characters array if deleting current project | High |
| PS-022 | deleteProject triggers sync | Should call triggerGlobalSync after delete | Medium |
| **loadCharacters** |
| PS-023 | loadCharacters success | Should fetch characters and update state | High |
| **createCharacter** |
| PS-024 | createCharacter success | Should add character to characters array | High |
| PS-025 | createCharacter returns null | Should return null if no currentProject | High |
| PS-026 | createCharacter triggers sync | Should call triggerGlobalSync after creation | Medium |
| **selectCharacter** |
| PS-027 | selectCharacter success | Should set currentCharacter and return true | High |
| PS-028 | selectCharacter non-existent | Should return false for non-existent ID | High |
| **renameCharacter** |
| PS-029 | renameCharacter updates array | Should update character name in characters array | High |
| PS-030 | renameCharacter updates currentCharacter | Should update currentCharacter if renaming current | High |
| PS-031 | renameCharacter triggers sync | Should call triggerGlobalSync after rename | Medium |
| **deleteCharacter** |
| PS-032 | deleteCharacter removes from list | Should remove character from characters array | High |
| PS-033 | deleteCharacter clears current | Should set currentCharacter to null if deleting current | High |
| PS-034 | deleteCharacter triggers sync | Should call triggerGlobalSync after delete | Medium |
| **Reset Actions** |
| PS-035 | clearCurrentProject | Should set currentProject to null, clear characters and currentCharacter | High |
| PS-036 | clearCurrentCharacter | Should set currentCharacter to null only | High |
| **Edge Cases** |
| PS-037 | Actions on non-existent IDs | rename/archive/delete should not throw for non-existent IDs | Medium |

#### EditionStore (`src/store/editionStore.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| **Initial State** |
| ES-001 | Initial state values | Store initializes with empty editions[], null currentEdition, empty pages[], null currentPage, empty panels[], isLoading=false | High |
| **loadEditions** |
| ES-002 | loadEditions success | Should fetch editions by projectId and update state | High |
| ES-003 | loadEditions sets isLoading | Should set isLoading=true before fetch, false after | High |
| ES-004 | loadEditions error handling | Should set isLoading=false on error, log error, not throw | Medium |
| **createEdition** |
| ES-005 | createEdition success | Should add edition to end of editions array | High |
| ES-006 | createEdition with options | Should pass issueNumber, volume, synopsis to repository | High |
| ES-007 | createEdition triggers sync | Should call triggerGlobalSync after creation | Medium |
| **selectEdition** |
| ES-008 | selectEdition success | Should set currentEdition and return true | High |
| ES-009 | selectEdition clears page state | Should set currentPage to null and panels to [] | High |
| ES-010 | selectEdition auto-loads pages | Should call loadPages after successful selection | High |
| ES-011 | selectEdition non-existent | Should return false for non-existent ID | High |
| **updateEdition** |
| ES-012 | updateEdition updates array | Should update edition in editions array | High |
| ES-013 | updateEdition updates currentEdition | Should update currentEdition if updating current | High |
| ES-014 | updateEdition triggers sync | Should call triggerGlobalSync after update | Medium |
| **updateEditionStatus** |
| ES-015 | updateEditionStatus updates array | Should update status in editions array | High |
| ES-016 | updateEditionStatus updates currentEdition | Should update currentEdition if updating current | High |
| ES-017 | updateEditionStatus triggers sync | Should call triggerGlobalSync after update | Medium |
| **deleteEdition** |
| ES-018 | deleteEdition removes from list | Should remove edition from editions array | High |
| ES-019 | deleteEdition clears current state | Should clear currentEdition, pages, currentPage, panels if deleting current | High |
| ES-020 | deleteEdition records sync deletions | Should call syncManifest.recordDeletion for edition, pages, and panels | High |
| ES-021 | deleteEdition triggers sync | Should call triggerGlobalSync after delete | Medium |
| **duplicateEdition** |
| ES-022 | duplicateEdition success | Should add duplicated edition to editions array | High |
| ES-023 | duplicateEdition returns null | Should return null if original not found | Medium |
| ES-024 | duplicateEdition triggers sync | Should call triggerGlobalSync after duplication | Medium |
| **loadPages** |
| ES-025 | loadPages success | Should fetch pages by editionId and update state | High |
| **createPage** |
| ES-026 | createPage success | Should add page to end of pages array | High |
| ES-027 | createPage returns null | Should return null if no currentEdition | High |
| ES-028 | createPage triggers sync | Should call triggerGlobalSync after creation | Medium |
| **selectPage** |
| ES-029 | selectPage success | Should set currentPage and return true | High |
| ES-030 | selectPage auto-loads panels | Should call loadPanels after successful selection | High |
| ES-031 | selectPage non-existent | Should return false for non-existent ID | High |
| **updatePage** |
| ES-032 | updatePage updates array | Should update page in pages array | High |
| ES-033 | updatePage updates currentPage | Should update currentPage if updating current | High |
| ES-034 | updatePage triggers sync | Should call triggerGlobalSync after update | Medium |
| **updatePageStatus** |
| ES-035 | updatePageStatus updates array | Should update status in pages array | High |
| ES-036 | updatePageStatus updates currentPage | Should update currentPage if updating current | High |
| ES-037 | updatePageStatus triggers sync | Should call triggerGlobalSync after update | Medium |
| **deletePage** |
| ES-038 | deletePage removes and renumbers | Should remove page, renumber remaining, and reload | High |
| ES-039 | deletePage clears current state | Should clear currentPage and panels if deleting current | High |
| ES-040 | deletePage records sync deletions | Should call syncManifest.recordDeletion for page and its panels | High |
| ES-041 | deletePage triggers sync | Should call triggerGlobalSync after delete | Medium |
| **duplicatePage** |
| ES-042 | duplicatePage success | Should add duplicated page to pages array | High |
| ES-043 | duplicatePage returns null | Should return null if original not found | Medium |
| ES-044 | duplicatePage triggers sync | Should call triggerGlobalSync after duplication | Medium |
| **reorderPages** |
| ES-045 | reorderPages success | Should reorder, renumber, and reload pages | High |
| ES-046 | reorderPages no currentEdition | Should do nothing if no currentEdition | Medium |
| ES-047 | reorderPages triggers sync | Should call triggerGlobalSync after reorder | Medium |
| **loadPanels** |
| ES-048 | loadPanels success | Should fetch panels by pageId and update state | High |
| **createPanel** |
| ES-049 | createPanel success | Should add panel to end of panels array | High |
| ES-050 | createPanel returns null | Should return null if no currentPage | High |
| ES-051 | createPanel triggers sync | Should call triggerGlobalSync after creation | Medium |
| **updatePanel** |
| ES-052 | updatePanel updates array | Should update panel in panels array | High |
| ES-053 | updatePanel triggers sync | Should call triggerGlobalSync after update | Medium |
| **deletePanel** |
| ES-054 | deletePanel removes and renumbers | Should remove panel, renumber remaining, and reload | High |
| ES-055 | deletePanel records sync deletion | Should call syncManifest.recordDeletion for panel | High |
| ES-056 | deletePanel triggers sync | Should call triggerGlobalSync after delete | Medium |
| **duplicatePanel** |
| ES-057 | duplicatePanel success | Should add duplicated panel to panels array | High |
| ES-058 | duplicatePanel returns null | Should return null if original not found | Medium |
| ES-059 | duplicatePanel triggers sync | Should call triggerGlobalSync after duplication | Medium |
| **reorderPanels** |
| ES-060 | reorderPanels success | Should reorder, renumber, and reload panels | High |
| ES-061 | reorderPanels no currentPage | Should do nothing if no currentPage | Medium |
| ES-062 | reorderPanels triggers sync | Should call triggerGlobalSync after reorder | Medium |
| **addDialogue** |
| ES-063 | addDialogue success | Should refresh panel in panels array | High |
| ES-064 | addDialogue error handling | Should return null and log error on failure | Medium |
| ES-065 | addDialogue triggers sync | Should call triggerGlobalSync after addition | Medium |
| **updateDialogue** |
| ES-066 | updateDialogue success | Should refresh panel in panels array | High |
| ES-067 | updateDialogue triggers sync | Should call triggerGlobalSync after update | Medium |
| **removeDialogue** |
| ES-068 | removeDialogue success | Should refresh panel in panels array | High |
| ES-069 | removeDialogue triggers sync | Should call triggerGlobalSync after removal | Medium |
| **Reset Actions** |
| ES-070 | clearCurrentEdition | Should clear currentEdition, pages, currentPage, and panels | High |
| ES-071 | clearCurrentPage | Should clear currentPage and panels only | High |
| ES-072 | clearAll | Should clear all state and reset isLoading | High |
| **Edge Cases** |
| ES-073 | Actions on non-existent IDs | update/delete should not throw for non-existent IDs | Medium |

#### LocaleStore (`src/store/localeStore.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| **Initial State** |
| LS-001 | Initial state values | Store initializes with locale='en' (defaultLocale) and isHydrated=false | High |
| **setLocale** |
| LS-002 | setLocale with valid locale | Should update locale state for valid locales ('en', 'pt-BR') | High |
| LS-003 | setLocale with invalid locale | Should NOT update locale state for invalid locales (validation) | High |
| LS-004 | setLocale updates DOM | Should set document.documentElement.lang when document exists | Medium |
| **setHydrated** |
| LS-005 | setHydrated | Should set isHydrated to true | High |
| **Persist Middleware** |
| LS-006 | Persist storage name | Store uses 'locale-storage' as persist key | Medium |

**Note:** The LocaleStore is minimal (~40 lines) with most complexity in persist middleware (zustand). Integration tests for locale switching in the UI provide more value than extensive unit tests here. DOM side effects (document.documentElement.lang) are best tested in E2E.

---

### 1.3 Image Processing (`src/lib/storage/imageProcessor.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| **processImage - Core Processing** |
| IP-001 | Process JPEG to WebP | Should convert JPEG to WebP format when browser supports WebP encoding | High |
| IP-002 | Process PNG to WebP | Should convert PNG to WebP format (no special transparency handling) | High |
| IP-003 | Process WebP input | Should re-encode WebP input (no passthrough optimization exists) | Medium |
| IP-004 | WebP detection caching | WebP support detection is cached at module level for all subsequent calls | Medium |
| IP-036 | Process GIF input | Should convert GIF to static WebP/JPEG (animation not preserved) | Medium |
| IP-037 | Process AVIF input | Should accept and process AVIF input format | Medium |
| IP-005 | Return ProcessedImage structure | Should return { original, thumbnail, width, height, palette, format } | High |
| **processImage - Dimension Handling** |
| IP-006 | Cap large landscape image | Should resize 4000x3000 image to 2000x1500 (capped at maxWidthOrHeight) | High |
| IP-007 | Cap large portrait image | Should resize 3000x4000 image to 1500x2000 (capped at maxWidthOrHeight) | High |
| IP-008 | Preserve small image | Should NOT upscale image smaller than maxWidthOrHeight limit | High |
| IP-009 | Maintain aspect ratio | Should preserve original aspect ratio when resizing | High |
| IP-010 | MIN_DIMENSION enforcement | Should not downscale below 500px minimum dimension (unless original was smaller) | Medium |
| **processImage - Thumbnail Generation** |
| IP-011 | Generate thumbnail | Should create thumbnail capped at 300px (default thumbnailSize) | High |
| IP-012 | Thumbnail aspect ratio | Should preserve aspect ratio in thumbnail | High |
| IP-013 | Thumbnail quality | Should use 0.85 quality for thumbnail (thumbnailQuality default) | Low |
| IP-033 | Custom thumbnailSize option | Should accept custom thumbnailSize parameter | Medium |
| IP-034 | Custom thumbnailQuality option | Should accept custom thumbnailQuality parameter | Medium |
| **processImage - Color Palette** |
| IP-014 | Extract color palette | Should extract 6-color palette as hex strings (#RRGGBB format) | Medium |
| IP-015 | Palette extraction optional | Should skip palette when extractPalette=false | Medium |
| IP-016 | Palette failure graceful | Should return empty array on palette extraction failure | Medium |
| IP-035 | extractColorPalette error handling | Should return [] when image load fails (graceful degradation) | Medium |
| **calculateDimensions (internal)** |
| IP-017 | Landscape resize calculation | Width > height: cap width at maxSize, calculate proportional height | High |
| IP-018 | Portrait resize calculation | Height > width: cap height at maxSize, calculate proportional width | High |
| IP-019 | Square resize calculation | Square images should cap both dimensions at maxSize | Medium |
| IP-020 | No resize needed | Images within limits should keep original dimensions | High |
| **WebP Support Detection** |
| IP-021 | WebP encoding detection | Should detect browser WebP canvas.toBlob support | High |
| **Utility Functions** |
| IP-023 | isValidImageType - valid types | Should accept jpeg, jpg, png, webp, gif, avif | High |
| IP-024 | isValidImageType - invalid types | Should reject non-image MIME types | High |
| IP-025 | formatFileSize - various sizes | Should format bytes to human-readable (B, KB, MB, GB) | Low |
| IP-026 | formatFileSize - zero | Should return "0 B" for zero bytes | Low |
| IP-027 | getImageDimensions | Should return { width, height } from Blob | Medium |
| **Error Handling** |
| IP-028 | Handle corrupted image | Should throw "Failed to load image" for invalid image data | Medium |
| IP-029 | Handle blob conversion failure | Should throw error if canvas.toBlob fails | Medium |
| **Options & Configuration** |
| IP-030 | Custom maxWidthOrHeight | Should use provided maxWidthOrHeight option | Medium |
| IP-031 | Custom quality | Should use provided quality option | Medium |
| IP-032 | QUALITY_TIERS export | Should export free tier settings (maxWidthOrHeight: 2000, quality: 0.92) | Low |

**Note:** The image processor re-encodes ALL formats (no passthrough). WebP is preferred with JPEG fallback for older Safari. The `stepDownResize` function uses progressive 50% downscaling for high-quality results. ColorThief is used for palette extraction. Tests require mocking canvas APIs and Image loading.

---

### 1.4 File Storage (`src/lib/storage/fileStorage.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| FS-001 | Save blob to OPFS | Should store blob and return path | High |
| FS-002 | Read blob from OPFS | Should retrieve stored blob | High |
| FS-003 | Delete file from OPFS | Should remove file and return success | High |
| FS-004 | List files in directory | Should return file list with metadata | Medium |
| FS-005 | Calculate storage size | Should return accurate byte count | Medium |
| FS-006 | Create nested directories | Should handle deep path creation | Medium |
| FS-007 | Handle OPFS unavailable | Should fallback to IndexedDB storage | High |
| FS-008 | Handle storage quota exceeded | Should throw meaningful error | Medium |
| FS-009 | Concurrent file operations | Should handle multiple simultaneous writes | Medium |
| FS-010 | Clean up orphaned files | Should remove files not in database | Low |

---

### 1.5 Sync Services

#### Google Auth (`src/lib/sync/googleAuth.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| GA-001 | Generate auth URL | Should create valid OAuth2 URL with correct scopes | High |
| GA-002 | Exchange code for tokens | Should return access and refresh tokens | High |
| GA-003 | Refresh expired token | Should use refresh token to get new access token | Critical |
| GA-004 | Get user info | Should fetch email and name from Google | Medium |
| GA-005 | Handle invalid code | Should throw appropriate error | Medium |
| GA-006 | Handle revoked token | Should clear auth state and require re-auth | High |
| GA-007 | Token expiration check | Should correctly identify expired tokens | High |

#### Sync Manifest (`src/lib/sync/syncManifest.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| SM-001 | Generate content hash | Should produce consistent SHA-256 hash | High |
| SM-002 | Hash different content | Different content should produce different hashes | High |
| SM-003 | Track item version | Should increment version on each update | High |
| SM-004 | Mark item deleted | Should add to deletedItems with timestamp | High |
| SM-005 | Prune old deleted items | Should remove items older than 30 days | Medium |
| SM-006 | Device attribution | Should track which device made changes | Medium |
| SM-007 | Serialize manifest | Should produce valid JSON for storage | High |
| SM-008 | Deserialize manifest | Should reconstruct manifest from JSON | High |

#### Sync Service (`src/lib/sync/syncService.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| SS-001 | Calculate delta - no changes | Should return empty delta when hashes match | High |
| SS-002 | Calculate delta - local only | Should identify items to upload | High |
| SS-003 | Calculate delta - remote only | Should identify items to download | High |
| SS-004 | Calculate delta - conflicts | Should identify conflicting items | Critical |
| SS-005 | Resolve conflict - local wins | Should use local version | High |
| SS-006 | Resolve conflict - remote wins | Should use remote version | High |
| SS-007 | Resolve conflict - newest wins | Should compare timestamps | High |
| SS-008 | Handle deleted items | Should propagate deletions to other devices | High |
| SS-009 | Upload project | Should upload project JSON to Drive | High |
| SS-010 | Download project | Should fetch and save project from Drive | High |
| SS-011 | Upload image | Should upload image blob to Drive | High |
| SS-012 | Download image | Should fetch and store image from Drive | High |
| SS-013 | Handle rate limiting | Should retry with backoff on 429 | Medium |
| SS-014 | Handle network error | Should gracefully handle offline state | High |
| SS-015 | Auto-sync trigger | Should sync on configured interval | Medium |
| SS-016 | Debounce data changes | Should wait 25s before syncing after changes | Medium |
| SS-017 | Visibility change sync | Should sync when tab becomes active | Medium |
| SS-018 | Online recovery sync | Should sync when connection restored | High |
| SS-019 | Concurrent sync prevention | Should not start new sync while one is running | High |

---

### 1.6 Utility Functions

#### Retry Utility (`src/lib/utils/retry.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| RT-001 | Success on first try | Should return result without retry | High |
| RT-002 | Success after retry | Should retry and return result on eventual success | High |
| RT-003 | Max retries exceeded | Should throw after max attempts (3) | High |
| RT-004 | Exponential backoff | Should increase delay between retries | Medium |
| RT-005 | Non-retryable error | Should not retry certain error types | Medium |

#### Debug Utility (`src/lib/utils/debug.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| DB-001 | Debug enabled | Should log when DEBUG=true | Low |
| DB-002 | Debug disabled | Should not log when DEBUG=false | Low |
| DB-003 | Log levels | Should support different log levels | Low |

---

## 2. Integration Tests

### 2.1 Database Layer Integration

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| DI-001 | Project → Character cascade delete | Deleting project should delete all characters | Critical |
| DI-002 | Character → Image cascade delete | Deleting character should delete all images | Critical |
| DI-003 | Edition → Page → Panel cascade | Deleting edition should cascade through pages and panels | Critical |
| DI-004 | Project duplicate with relations | Should duplicate project with all characters and images | High |
| DI-005 | Edition duplicate with script | Should duplicate edition with all pages, panels, dialogues | High |
| DI-006 | Database version migration | Should migrate from v1 to v2 schema preserving data | Critical |
| DI-007 | Concurrent database operations | Should handle multiple simultaneous reads/writes | Medium |
| DI-008 | Transaction rollback | Should rollback on partial failure | High |

### 2.2 Storage Layer Integration

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| SI-001 | Image upload end-to-end | Upload → Process → Store → Database record | Critical |
| SI-002 | Image delete with file cleanup | Delete record → Remove OPFS files | High |
| SI-003 | Thumbnail generation | Full image and thumbnail stored correctly | High |
| SI-004 | Storage stats accuracy | Stats match actual stored files | Medium |
| SI-005 | OPFS to IndexedDB fallback | Should seamlessly fallback on unsupported browsers | High |

### 2.3 Sync Integration

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| SY-001 | Full sync cycle | Local changes → Upload → Download → Merge | Critical |
| SY-002 | Multi-device sync | Changes on Device A appear on Device B | Critical |
| SY-003 | Conflict detection | Simultaneous edits detected as conflict | High |
| SY-004 | Conflict resolution flow | User can choose resolution strategy | High |
| SY-005 | Deleted item sync | Deletion propagates to other devices | High |
| SY-006 | Large image sync | Should handle images up to 10MB | Medium |
| SY-007 | Batch upload | Should upload multiple items efficiently | Medium |
| SY-008 | Offline queue | Changes queued when offline, synced when online | High |
| SY-009 | Auth token refresh during sync | Should refresh token mid-sync if needed | High |
| SY-010 | Sync interruption recovery | Should resume after browser crash/close | Medium |

---

## 3. E2E Tests

### 3.1 Project Management

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-PM-001 | Create new project | User can create project with name and metadata | Critical |
| E2E-PM-002 | View project list | Homepage shows all active projects | Critical |
| E2E-PM-003 | Open project detail | Click project navigates to detail view | Critical |
| E2E-PM-004 | Rename project | User can rename project via dialog | High |
| E2E-PM-005 | Archive project | Project moves to archived list | High |
| E2E-PM-006 | Restore archived project | Project moves back to active list | Medium |
| E2E-PM-007 | Delete project with confirmation | Confirmation dialog prevents accidental delete | High |
| E2E-PM-008 | Project settings | User can change default view, grid columns | Medium |
| E2E-PM-009 | Empty state | Shows appropriate message when no projects | Low |

### 3.2 Character Management

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-CH-001 | Create character | User can create character with name | Critical |
| E2E-CH-002 | View character list | Project shows all characters | Critical |
| E2E-CH-003 | Open character moodboard | Click character opens canvas/grid view | Critical |
| E2E-CH-004 | Edit character profile | Update age, role, personality, backstory | High |
| E2E-CH-005 | Rename character | User can rename via dialog | High |
| E2E-CH-006 | Delete character | Remove with confirmation | High |
| E2E-CH-007 | Reorder characters | Drag to reorder in list | Medium |
| E2E-CH-008 | Duplicate character | Creates copy with all content | Medium |

### 3.3 Image Management

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-IM-001 | Upload single image | Drag and drop image to canvas | Critical |
| E2E-IM-002 | Upload multiple images | Bulk upload via drag and drop | Critical |
| E2E-IM-003 | Upload via file picker | Click to browse and select | High |
| E2E-IM-004 | View image in gallery | Grid view shows all images | High |
| E2E-IM-005 | Image preview dialog | Click image opens full-size preview | High |
| E2E-IM-006 | View image metadata | Preview shows dimensions, size, palette | Medium |
| E2E-IM-007 | Add tags to image | User can add/remove tags | Medium |
| E2E-IM-008 | Delete image | Remove with confirmation | High |
| E2E-IM-009 | Multi-select images | Select multiple for bulk actions | Medium |
| E2E-IM-010 | Bulk delete images | Delete multiple selected images | Medium |
| E2E-IM-011 | Upload progress indicator | Show progress for large uploads | Medium |
| E2E-IM-012 | Invalid file rejection | Non-image files show error | Medium |

### 3.4 Canvas Operations

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-CV-001 | Switch to canvas view | Toggle between grid and canvas | High |
| E2E-CV-002 | Zoom canvas | Zoom in/out with controls or scroll | High |
| E2E-CV-003 | Pan canvas | Drag to pan viewport | High |
| E2E-CV-004 | Place image on canvas | Drag image to position | High |
| E2E-CV-005 | Move image on canvas | Drag to reposition | High |
| E2E-CV-006 | Resize image on canvas | Use handles to resize | High |
| E2E-CV-007 | Rotate image on canvas | Use rotation handle | Medium |
| E2E-CV-008 | Canvas auto-save | Changes persist without manual save | High |
| E2E-CV-009 | Lock/unlock image | Lock prevents accidental moves | Medium |
| E2E-CV-010 | Layer ordering (z-index) | Bring forward/send backward | Medium |
| E2E-CV-011 | Export canvas as image | Download canvas snapshot | Medium |
| E2E-CV-012 | Reset canvas view | Reset zoom and position | Low |

### 3.5 Comic Edition Management

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-ED-001 | Create edition | Create new comic issue | Critical |
| E2E-ED-002 | View editions list | Project shows all editions | Critical |
| E2E-ED-003 | Edit edition metadata | Update title, synopsis, status | High |
| E2E-ED-004 | Set edition cover | Select image as cover | Medium |
| E2E-ED-005 | Update edition status | Progress through workflow | High |
| E2E-ED-006 | Delete edition | Remove with confirmation | High |
| E2E-ED-007 | Reorder editions | Drag to reorder | Medium |
| E2E-ED-008 | Duplicate edition | Copy with all pages/panels | Medium |

### 3.6 Script Page Management

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-SP-001 | Create script page | Add new page to edition | Critical |
| E2E-SP-002 | View pages grid | Edition shows all pages | Critical |
| E2E-SP-003 | Edit page metadata | Update goal, setting, mood | High |
| E2E-SP-004 | Update page status | Progress through workflow | High |
| E2E-SP-005 | Reorder pages | Drag to reorder | High |
| E2E-SP-006 | Delete page | Remove with confirmation | High |
| E2E-SP-007 | Duplicate page | Copy with all panels | Medium |

### 3.7 Panel & Dialogue Management

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-PN-001 | Add panel to page | Create new panel | Critical |
| E2E-PN-002 | Edit panel description | Update description, camera angle | High |
| E2E-PN-003 | Assign characters to panel | Select characters in scene | Medium |
| E2E-PN-004 | Add dialogue to panel | Create speech/thought/caption | Critical |
| E2E-PN-005 | Edit dialogue | Update text, type, character | High |
| E2E-PN-006 | Reorder dialogues | Drag to reorder within panel | Medium |
| E2E-PN-007 | Delete dialogue | Remove dialogue line | High |
| E2E-PN-008 | Reorder panels | Drag to reorder | Medium |
| E2E-PN-009 | Delete panel | Remove with dialogues | High |
| E2E-PN-010 | Duplicate panel | Copy with all dialogues | Medium |

### 3.8 Script Export

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-EX-001 | View script document | Script formatted for reading | High |
| E2E-EX-002 | Print script | Browser print dialog opens | High |
| E2E-EX-003 | Script includes cover | Cover page appears first | Medium |
| E2E-EX-004 | Script page breaks | Pages break at logical points | Medium |

### 3.9 Backup & Restore

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-BR-001 | Create full backup | Download ZIP with all data | High |
| E2E-BR-002 | Restore from backup | Import ZIP restores all data | High |
| E2E-BR-003 | Backup includes images | ZIP contains all image files | High |
| E2E-BR-004 | Restore to empty app | Fresh app can restore from backup | High |
| E2E-BR-005 | Restore merge behavior | Handle existing data on restore | Medium |

### 3.10 Google Drive Sync

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-GD-001 | Connect Google account | OAuth flow completes successfully | Critical |
| E2E-GD-002 | View account info | Shows connected email | Medium |
| E2E-GD-003 | Manual sync trigger | Force sync button works | High |
| E2E-GD-004 | Auto-sync configuration | Change sync interval | Medium |
| E2E-GD-005 | Sync status indicator | Shows syncing/synced/error state | High |
| E2E-GD-006 | Conflict resolution dialog | User can choose resolution | High |
| E2E-GD-007 | Disconnect account | Remove Google connection | Medium |
| E2E-GD-008 | Sync after offline | Syncs when coming back online | High |

### 3.11 Settings

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-ST-001 | Change language | Switch between English and Portuguese | High |
| E2E-ST-002 | Language persists | Reload maintains language selection | High |
| E2E-ST-003 | View storage usage | Storage indicator shows usage | Medium |
| E2E-ST-004 | Clear all data | Factory reset with confirmation | Low |

### 3.12 PWA Features

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-PWA-001 | Install prompt | Install button appears on supported browsers | High |
| E2E-PWA-002 | Offline functionality | App works without internet | Critical |
| E2E-PWA-003 | Service worker registration | SW registers successfully | High |
| E2E-PWA-004 | Cache static assets | Assets load from cache offline | High |

### 3.13 Navigation & UI

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| E2E-NAV-001 | Breadcrumb navigation | Breadcrumbs reflect current location | Medium |
| E2E-NAV-002 | Back navigation | Browser back works correctly | High |
| E2E-NAV-003 | Mobile menu | Hamburger menu works on mobile | High |
| E2E-NAV-004 | Tab navigation (keyboard) | Tab through focusable elements | Medium |
| E2E-NAV-005 | 404 page | Invalid routes show not-found page | Low |

---

## 4. Performance Tests

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| PF-001 | Initial page load | Homepage loads under 3 seconds | High |
| PF-002 | Large project load | Project with 50+ characters loads smoothly | High |
| PF-003 | Image grid rendering | 100+ images render without lag | High |
| PF-004 | Canvas with many items | 50+ canvas items pan/zoom smoothly | High |
| PF-005 | Image upload throughput | Bulk upload of 20 images completes reasonably | Medium |
| PF-006 | Database query time | Complex queries complete under 100ms | Medium |
| PF-007 | Sync performance | Full sync of medium dataset under 30 seconds | Medium |
| PF-008 | Memory usage | App stays under 500MB RAM with normal use | Medium |
| PF-009 | Storage efficiency | Images compressed to reasonable sizes | Low |
| PF-010 | Re-render optimization | Unnecessary re-renders minimized | Low |

---

## 5. Accessibility Tests

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| A11Y-001 | Keyboard navigation | All features accessible via keyboard | High |
| A11Y-002 | Screen reader support | Content readable by screen readers | High |
| A11Y-003 | Focus indicators | Visible focus states on all interactive elements | High |
| A11Y-004 | Color contrast | Text meets WCAG AA contrast ratios | High |
| A11Y-005 | Alt text for images | Images have descriptive alt text | Medium |
| A11Y-006 | Form labels | All form inputs have associated labels | High |
| A11Y-007 | Error announcements | Errors announced to screen readers | Medium |
| A11Y-008 | Skip links | Skip to main content available | Low |
| A11Y-009 | Reduced motion | Respects prefers-reduced-motion | Medium |
| A11Y-010 | Touch targets | Touch targets at least 44x44px on mobile | Medium |

---

## 6. Security Tests

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| SEC-001 | XSS prevention | User input sanitized in all displays | Critical |
| SEC-002 | OAuth token storage | Tokens stored securely | Critical |
| SEC-003 | Token refresh security | Refresh tokens not exposed to client | High |
| SEC-004 | CORS policy | API calls restricted to expected origins | High |
| SEC-005 | Content Security Policy | CSP headers prevent script injection | High |
| SEC-006 | Input validation | File uploads validated for type/size | High |
| SEC-007 | Sensitive data in URLs | No tokens/secrets in URLs | High |
| SEC-008 | Local storage security | Sensitive data not in localStorage | Medium |
| SEC-009 | IndexedDB isolation | Data isolated per origin | Medium |
| SEC-010 | Google Drive scope | Minimal required scopes requested | Medium |

---

## Test Implementation Priorities

### Phase 1: Critical Path (Must Have)
- All repository CRUD operations (PR, CH, IM, ED, SP, PN series)
- Cascade delete operations (DI-001 to DI-003)
- Image processing pipeline (IP-001 to IP-008)
- Core E2E flows (project → character → image upload)

### Phase 2: Core Features (Should Have)
- Store actions (PS, ES, LS series)
- Sync operations (SS series)
- Canvas operations (E2E-CV series)
- Edition/script workflow (E2E-ED, E2E-SP, E2E-PN series)

### Phase 3: Quality & Polish (Nice to Have)
- Performance tests (PF series)
- Accessibility tests (A11Y series)
- Edge cases and error handling
- Security tests (SEC series)

---

## Test Tooling Recommendations

### Unit & Integration Tests
- **Framework:** Vitest (faster, native ESM support)
- **Mocking:** vi.mock for module mocking
- **Database:** In-memory IndexedDB via fake-indexeddb

### E2E Tests
- **Framework:** Playwright (cross-browser, excellent DX)
- **Visual Regression:** Playwright built-in screenshots
- **Fixtures:** Custom fixtures for auth and data setup

### Additional Tools
- **Coverage:** v8 coverage via Vitest
- **Accessibility:** axe-core via @axe-core/playwright
- **Performance:** Lighthouse CI for performance budgets
- **Security:** OWASP ZAP for security scanning

---

## Notes

1. Tests should be run in isolated environments with fresh IndexedDB/OPFS
2. Mock Google Drive API calls in unit/integration tests
3. Use real Google Drive API in E2E with test account
4. Consider visual regression testing for canvas features
5. Mobile-specific tests should cover touch interactions
6. PWA tests require secure context (HTTPS or localhost)
