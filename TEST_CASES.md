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
| **Initialization** |
| FS-001 | initialize() - OPFS available | Should set useOPFS=true and root handle | High |
| FS-002 | initialize() - OPFS unavailable | Should set useOPFS=false and create fallbackDb | High |
| FS-003 | initialize() - createWritable not supported | Should detect Safari/WebKit and use IndexedDB fallback | High |
| FS-004 | initialize() - idempotent | Should not re-initialize if already initialized | Medium |
| **saveImage** |
| FS-005 | saveImage() - OPFS success | Should save to OPFS and return `opfs://images/{id}` path | High |
| FS-006 | saveImage() - IndexedDB fallback | Should save to IndexedDB and return `idb://images/{id}` path | High |
| FS-007 | saveImage() - creates images directory | Should auto-create 'images' directory if not exists | Medium |
| FS-008 | saveImage() - error propagation | Should throw if OPFS write fails | Medium |
| **saveThumbnail** |
| FS-009 | saveThumbnail() - OPFS success | Should save to OPFS and return `opfs://thumbnails/{id}` path | High |
| FS-010 | saveThumbnail() - IndexedDB fallback | Should save to IndexedDB and return `idb://thumbnails/{id}` path | High |
| **getImage** |
| FS-011 | getImage() - OPFS path | Should retrieve File from `opfs://` path | High |
| FS-012 | getImage() - IndexedDB path | Should retrieve File from `idb://` path | High |
| FS-013 | getImage() - not found | Should return null for non-existent file | High |
| FS-014 | getImage() - parse path formats | Should handle both `opfs://images/id` and `images/id` | Medium |
| **getImageUrl** |
| FS-015 | getImageUrl() - returns blob URL | Should create and return blob:// URL from file | High |
| FS-016 | getImageUrl() - passthrough blob URLs | Should return existing blob:// URLs unchanged | Medium |
| FS-017 | getImageUrl() - not found | Should return null for non-existent file | Medium |
| **deleteImage** |
| FS-018 | deleteImage() - OPFS path | Should remove file from OPFS | High |
| FS-019 | deleteImage() - IndexedDB path | Should remove file from IndexedDB fallback | High |
| FS-020 | deleteImage() - not found | Should not throw for non-existent file | Medium |
| **deleteThumbnail** |
| FS-021 | deleteThumbnail() - OPFS | Should delete from thumbnails directory | Medium |
| FS-022 | deleteThumbnail() - IndexedDB fallback | Should delete from fallback database | Medium |
| **Storage Info** |
| FS-023 | getStorageEstimate() | Should return {used, quota, percentage} from navigator.storage | Medium |
| FS-024 | getStorageEstimate() - API unavailable | Should return zeros if storage API unavailable | Low |
| FS-025 | formatBytes() | Should format 0, B, KB, MB, GB correctly | Low |
| FS-026 | isUsingOPFS() | Should return true/false based on storage backend | Medium |
| FS-027 | getStorageBackend() | Should return 'opfs', 'indexeddb', or 'memory' | Medium |
| **Clear Operations** |
| FS-028 | clearAllFiles() - OPFS | Should clear images, thumbnails, exports, backups directories | Medium |
| FS-029 | clearAllFiles() - IndexedDB | Should clear all files from fallback database | Medium |
| FS-030 | clearAllFiles() - return counts | Should return {imagesDeleted, thumbnailsDeleted, totalDeleted} | Low |
| FS-031 | clearAllAndReset() - OPFS | Should remove directories entirely | Low |
| FS-032 | clearAllAndReset() - IndexedDB | Should clear fallback database | Low |

**Note:** FileStorage uses OPFS (Origin Private File System) for modern browsers with `createWritable` support. Falls back to IndexedDB for Safari/WebKit and older browsers. The class is a singleton exported as `fileStorage`. Testing requires mocking `navigator.storage.getDirectory()`, `FileSystemDirectoryHandle`, and `FileSystemFileHandle` APIs. IndexedDB fallback uses Dexie.js with a `FileStorageFallback` database.

---

### 1.5 Sync Services

#### Google Auth (`src/lib/sync/googleAuth.ts`)

**Architecture Note:** This uses Google Identity Services (GIS) library with implicit grant flow (no backend). GIS handles OAuth popup and token exchange internally. There's no refresh token support in browser-only GIS flow - expired tokens require re-authentication (silent or with popup). This is a fully static/client-side app - no SSR.

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| **Initialization** |
| GA-001 | initialize() - first call | Should load GIS script and create tokenClient | High |
| GA-002 | initialize() - idempotent | Should not re-initialize if already initialized | Medium |
| GA-003 | initialize() - concurrent calls | Should return same promise for concurrent calls | Medium |
| GA-004 | getClientId() - missing env var | Should throw error with helpful message if NEXT_PUBLIC_GOOGLE_CLIENT_ID missing | High |
| GA-005 | loadGISScript() - already loaded | Should resolve immediately if window.google.accounts.oauth2 exists | Medium |
| GA-006 | loadGISScript() - script in DOM | Should wait for existing script if already in DOM | Low |
| GA-007 | loadGISScript() - script error | Should reject with "Failed to load Google Identity Services" | Medium |
| **Sign In Flow** |
| GA-008 | signIn() - success | Should open popup, return access token, store credentials | Critical |
| GA-009 | signIn() - user cancels | Should reject promise when user closes popup | High |
| GA-010 | signIn() - error from Google | Should reject with error description from response | High |
| GA-011 | signIn() - stores token with expiry | Should call storeToken with correct expiry calculation | High |
| GA-012 | signIn() - fetches user info | Should call fetchUserInfo after successful auth | Medium |
| GA-013 | signIn() - auto-initializes | Should call initialize() if not already initialized | Medium |
| **Sign Out** |
| GA-014 | signOut() - with valid token | Should revoke token via GIS and clear all stored credentials | High |
| GA-015 | signOut() - without token | Should just clear stored credentials (no revoke call) | Medium |
| GA-016 | signOut() - clears all storage keys | Should remove ACCESS_TOKEN, TOKEN_EXPIRY, USER_EMAIL, USER_ID | High |
| **Token Management** |
| GA-017 | getStoredToken() - valid token | Should return token if not expired | Critical |
| GA-018 | getStoredToken() - expired token | Should return null if past expiry time | Critical |
| GA-019 | getStoredToken() - expiry buffer | Should return null if within 5 minutes of expiry | High |
| GA-020 | getStoredToken() - no token | Should return null if no token in localStorage | High |
| GA-021 | storeToken() - stores correctly | Should store token and expiry in localStorage | High |
| **getAccessToken() - Token Refresh Flow** |
| GA-022 | getAccessToken() - valid stored | Should return stored token without re-auth | Critical |
| GA-023 | getAccessToken() - expired, has userEmail | Should attempt silent refresh (prompt='') | Critical |
| GA-024 | getAccessToken() - expired, no userEmail | Should prompt with 'select_account' | High |
| GA-025 | getAccessToken() - silent refresh success | Should return new token without popup | High |
| GA-026 | getAccessToken() - silent refresh fails | Should reject (user must click Connect again) | High |
| **isSignedIn()** |
| GA-027 | isSignedIn() - valid token | Should return true | High |
| GA-028 | isSignedIn() - expired token, has email | Should return true (allows silent refresh) | High |
| GA-029 | isSignedIn() - no token, no email | Should return false | High |
| **User Info** |
| GA-030 | fetchUserInfo() - success | Should fetch from Google API and store email/id | High |
| GA-031 | fetchUserInfo() - API error | Should throw "Failed to fetch user info" | Medium |
| GA-032 | getUserEmail() - stored | Should return email from localStorage | Medium |
| GA-033 | getUserEmail() - not stored | Should return null | Medium |
| GA-034 | getUserId() - stored | Should return user ID from localStorage | Medium |
| GA-035 | getUserId() - not stored | Should return null | Medium |
| GA-036 | getTokenExpiry() - stored | Should return Date from parsed timestamp | Low |
| GA-037 | getTokenExpiry() - not stored | Should return null | Low |
| **Error Handling** |
| GA-038 | handleTokenResponse() - error in response | Should reject pending promise with error_description | High |
| GA-039 | handleAuthError() - popup closed | Should reject with formatted error message | High |
| GA-040 | handleAuthError() - clears pending state | Should null out pendingAuthResolve/Reject | Medium |
| **Edge Cases** |
| GA-041 | Singleton pattern | Module exports single googleAuth instance | Low |
| GA-042 | Concurrent signIn calls | Second call while popup open - behavior undefined (TODO: should queue or reject) | Medium |

**Testing Notes:**
- GIS library (`window.google`) must be mocked
- localStorage must be mocked (fake or spy)
- `fetch` must be mocked for userinfo endpoint
- Tests requiring actual popup interaction are best done in E2E
- Silent refresh (GA-023, GA-025, GA-026) depends on browser session cookies with Google - hard to unit test
- Consider using `vi.useFakeTimers()` for expiry tests
- Note: Code has `typeof window === 'undefined'` guards but these are dead code in static builds - skip testing them

#### Sync Manifest (`src/lib/sync/syncManifest.ts`)

**Architecture Note:** SyncManifestService builds manifests from local IndexedDB data, compares them with remote manifests, and produces SyncDelta objects describing what needs to be uploaded/downloaded. Uses SHA-256 hashing via `hash.ts` for content comparison. Device identification via `deviceId.ts` for conflict attribution.

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| **buildLocalManifest** |
| SM-001 | buildLocalManifest - empty database | Should return manifest with empty collections | High |
| SM-002 | buildLocalManifest - with projects | Should include all projects with correct hashes | High |
| SM-003 | buildLocalManifest - with characters | Should include all characters with correct hashes | High |
| SM-004 | buildLocalManifest - with images | Should exclude local-only fields (storagePath, thumbnailPath) from hash | High |
| SM-005 | buildLocalManifest - with editions | Should include editions with correct hashes | Medium |
| SM-006 | buildLocalManifest - with scriptPages | Should include script pages with correct hashes | Medium |
| SM-007 | buildLocalManifest - with panels | Should include panels with nested dialogues in hash | Medium |
| SM-008 | buildLocalManifest - version increment | Should increment version from stored local version | High |
| SM-009 | buildLocalManifest - device attribution | Should include current deviceId and deviceName | High |
| SM-010 | buildLocalManifest - timestamp | Should set lastModified to current ISO timestamp | Medium |
| **recordDeletion / getDeletedItems** |
| SM-011 | recordDeletion - new item | Should add deletion record to localStorage | High |
| SM-012 | recordDeletion - duplicate | Should not add duplicate deletion records | Medium |
| SM-013 | recordDeletion - device attribution | Should record deletedByDeviceId | Medium |
| SM-014 | getDeletedItems - prune old | Should filter out items older than 30 days | High |
| SM-015 | getDeletedItems - empty storage | Should return empty array when no deletions stored | Medium |
| SM-016 | getDeletedItems - invalid JSON | Should return empty array on parse error | Low |
| SM-017 | clearProcessedDeletions | Should remove specified IDs from deleted items | Medium |
| **compareManifests - No remote** |
| SM-018 | compareManifests - null remote | Should mark all local items for upload | Critical |
| SM-019 | compareManifests - empty local | Should return hasChanges=false for empty local | Medium |
| **compareManifests - Items only in local** |
| SM-020 | compareManifests - local-only project | Should add to toUpload.projects | High |
| SM-021 | compareManifests - local-only character | Should add to toUpload.characters | High |
| SM-022 | compareManifests - local-only image | Should add to both toUpload.images and toUpload.files | High |
| **compareManifests - Items only in remote** |
| SM-023 | compareManifests - remote-only project | Should add to toDownload.projects | High |
| SM-024 | compareManifests - remote-only character | Should add to toDownload.characters | High |
| SM-025 | compareManifests - remote-only image | Should add to both toDownload.images and toDownload.files | High |
| **compareManifests - Hash comparison** |
| SM-026 | compareManifests - matching hashes | Should not add to upload or download | High |
| SM-027 | compareManifests - different hashes, same device | Should use newer timestamp (local newer → upload) | High |
| SM-028 | compareManifests - different hashes, same device | Should use newer timestamp (remote newer → download) | High |
| SM-029 | compareManifests - different hashes, different devices | Should create conflict record | Critical |
| SM-030 | compareManifests - conflict contains item name | Should look up item name from database | Medium |
| **compareManifests - Deletions** |
| SM-031 | processDeletions - local deletion exists in remote | Should add to toDelete.remote | High |
| SM-032 | processDeletions - remote deletion exists in local | Should add to toDelete.local | High |
| SM-033 | processDeletions - deletion for non-existent item | Should not add to toDelete | Medium |
| **compareManifests - hasChanges flag** |
| SM-034 | hasChanges - uploads pending | Should return true when toUpload has items | High |
| SM-035 | hasChanges - downloads pending | Should return true when toDownload has items | High |
| SM-036 | hasChanges - deletions pending | Should return true when toDelete has items | High |
| SM-037 | hasChanges - conflicts pending | Should return true when conflicts exist | High |
| SM-038 | hasChanges - no changes | Should return false when nothing to sync | High |
| **mergeManifests** |
| SM-039 | mergeManifests - version calculation | Should use max(local, remote) + 1 | High |
| SM-040 | mergeManifests - add downloaded items | Should include items from toDownload | High |
| SM-041 | mergeManifests - remove deleted items | Should remove items from toDelete.local and toDelete.remote | High |
| SM-042 | mergeManifests - merge deletedItems lists | Should deduplicate deletions from both manifests | Medium |
| SM-043 | mergeManifests - device attribution | Should set current device as lastModified | Medium |
| **createEmptyManifest** |
| SM-044 | createEmptyManifest | Should return manifest with empty collections and current device | Medium |
| **updateLocalVersion** |
| SM-045 | updateLocalVersion | Should store version in localStorage | Medium |
| SM-046 | getLocalVersion - stored | Should return stored version number | Medium |
| SM-047 | getLocalVersion - not stored | Should return 0 when no version stored | Medium |
| **Hash Integrity (Critical)** |
| SM-048 | project content change | Content change should produce different hash | Critical |
| SM-049 | character content change | Content change should produce different hash | Critical |
| SM-050 | image metadata change | Metadata change should produce different hash | Critical |
| SM-051 | identical content deterministic | Identical content should produce identical hash; rebuilding manifest should be stable | High |

**Testing Notes:**
- Requires mocking IndexedDB (via fake-indexeddb or Dexie mock)
- Requires mocking localStorage for deleted items and version storage
- `hashObject` from `hash.ts` uses crypto.subtle - requires JSDOM or polyfill
- Device ID/name functions should be mocked to return predictable values
- For conflict tests, need to set up manifests with different deviceIds
- The `getItemName` method queries the database - mock db.projects.get, etc.

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
| **retryWithBackoff** |
| RT-001 | Success on first try | Should return result without retry | High |
| RT-002 | Success after retry | Should retry and return result on eventual success | High |
| RT-003 | Max retries exceeded | Should throw after max attempts (default: 3) | High |
| RT-004 | Exponential backoff | Should increase delay between retries (delay = baseDelay * 2^attempt) | Medium |
| RT-005 | Non-retryable SyncException | Should not retry AUTH_FAILED, INVALID_DATA, STORAGE_FULL errors | High |
| RT-006 | Custom maxRetries option | Should respect custom maxRetries value | Medium |
| RT-007 | Custom baseDelay option | Should respect custom baseDelay for backoff calculation | Medium |
| RT-008 | Custom nonRetryableErrors | Should respect custom list of non-retryable error codes | Medium |
| **isNetworkError** |
| RT-009 | TypeError with fetch | Should detect TypeError containing 'fetch' as network error | Medium |
| RT-010 | TypeError with network | Should detect TypeError containing 'network' as network error | Medium |
| RT-011 | Error with network keywords | Should detect errors containing 'timeout', 'connection', 'fetch' | Medium |
| RT-012 | Non-network error | Should return false for unrelated errors | Medium |

#### Debug Utility (`src/lib/utils/debug.ts`)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| **Development mode (NODE_ENV=development)** |
| DB-001 | debug.log in dev | Should call console.log in development mode | Low |
| DB-002 | debug.warn in dev | Should call console.warn in development mode | Low |
| DB-003 | debug.info in dev | Should call console.info in development mode | Low |
| DB-004 | debug.error in dev | Should call console.error in development mode | Low |
| **Production mode (NODE_ENV=production)** |
| DB-005 | debug.log in prod | Should NOT call console.log in production mode | Low |
| DB-006 | debug.warn in prod | Should NOT call console.warn in production mode | Low |
| DB-007 | debug.info in prod | Should NOT call console.info in production mode | Low |
| DB-008 | debug.error in prod | Should ALWAYS call console.error (even in production) | Medium |

---

## 2. Integration Tests

> **Note:** Integration tests use real database operations (via fake-indexeddb) and test
> cross-repository interactions. They verify that multiple repositories work together correctly,
> especially cascade operations and file storage cleanup.

### 2.1 Database Layer Integration

#### Cascade Delete Operations

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| DI-001 | Project → Character cascade | Deleting project should delete all its characters | Critical |
| DI-002 | Project → Character → Image cascade | Deleting project should cascade delete through characters to images | Critical |
| DI-003 | Project → Character → Sections cascade | Deleting project should cascade delete character sections | Critical |
| DI-004 | Project → Character → CanvasItems cascade | Deleting project should cascade delete canvas items via sections | Critical |
| DI-005 | Character → Image cascade | Deleting character should delete all its images | Critical |
| DI-006 | Character → Section cascade | Deleting character should delete all its sections | Critical |
| DI-007 | Character → CanvasItem cascade | Deleting character should delete canvas items via sections | Critical |
| DI-008 | Edition → Page cascade | Deleting edition should delete all its pages | Critical |
| DI-009 | Edition → Page → Panel cascade | Deleting edition should cascade delete through pages to panels | Critical |
| DI-010 | ScriptPage → Panel cascade | Deleting page should delete all its panels | Critical |

#### File Storage Cleanup (via cascade)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| DI-011 | Image delete cleans OPFS | Deleting image should remove files from fileStorage | Critical |
| DI-012 | Character delete cleans all OPFS | Deleting character should clean up all image files | Critical |
| DI-013 | Project delete cleans all OPFS | Deleting project should clean up all image files (deep cascade) | Critical |

#### Duplicate Operations

> **Note:** Project and Character duplicate operations are "shallow" by design - they only copy
> the entity's own data, not child entities. Edition duplicate is "deep" - it cascades to pages and panels.
> TODO: Consider whether project/character duplicate should cascade to children in the future.

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| DI-014 | Project duplicate basic | Duplicating project copies metadata (description, genre, theme, tags, settings) | High |
| DI-015 | Project duplicate non-existent | Should return undefined when duplicating non-existent project | Medium |
| DI-016 | Project duplicate does NOT cascade | Project duplicate does NOT copy characters (shallow copy by design) | High |
| DI-017 | Character duplicate basic | Duplicating character copies description, tags, profile, metadata | High |
| DI-018 | Character duplicate does NOT copy images | Duplicating character should NOT duplicate images (by design) | High |
| DI-019 | Character duplicate does NOT copy sections | Duplicating character should NOT duplicate sections/canvasItems (by design) | Medium |
| DI-020 | Edition duplicate basic | Duplicating edition copies metadata, resets status to 'draft' | High |
| DI-021 | Edition duplicate cascades to pages | Duplicating edition copies all pages with new IDs and editionId | High |
| DI-022 | Edition duplicate cascades to panels | Duplicating edition cascades through pages to panels with new IDs | High |
| DI-023 | ScriptPage duplicate cascades to panels | Duplicating page copies all panels (with embedded dialogues) | High |
| DI-024 | Panel duplicate preserves dialogues | Duplicating panel copies all nested dialogues with new IDs | High |
| DI-025 | Duplicate assigns correct sortOrder | Duplicated entities get maxOrder + 1 for their collection | Medium |
| DI-026 | Duplicate resets timestamps | Duplicated entities get new createdAt/updatedAt | Medium |

#### Cross-Repository Consistency

> **Note:** IndexedDB has no foreign key constraints. Consistency is enforced at the repository layer
> through cascade delete operations. These tests verify that cross-repository relationships remain consistent.

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| DI-027 | Project → Edition cascade missing | Deleting project should also delete all editions (BUG: currently not implemented) | Critical |
| DI-028 | No orphaned characters after project delete | After project delete, no characters with that projectId should exist | High |
| DI-029 | No orphaned images after character delete | After character delete, no images with that characterId should exist | High |
| DI-030 | No orphaned sections after character delete | After character delete, no sections with that characterId should exist | High |
| DI-031 | No orphaned pages after edition delete | After edition delete, no pages with that editionId should exist | High |
| DI-032 | No orphaned panels after page delete | After page delete, no panels with that pageId should exist | High |
| DI-033 | sortOrder gaps are allowed | Deleting middle item leaves gap in sortOrder (by design, queries still work) | Medium |
| DI-034 | Bulk delete consistency | Deleting multiple items maintains database consistency | Medium |

#### Database Version Migration (if applicable)

| ID | Test Case | Description | Priority |
|----|-----------|-------------|----------|
| DI-035 | v1 to v2 migration | Migrating from v1 to v2 should preserve existing data | Critical |
| DI-036 | v2 tables exist | After migration, editions/scriptPages/panels tables exist | Critical |

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
| SY-001 | Full sync cycle | Local changes → Manifest → Upload → Download → Merge | Critical |
| SY-002 | Multi-device sync simulation | Changes on "Device A" manifest appear in "Device B" delta | Critical |
| SY-003 | Conflict detection | Simultaneous edits to same entity detected as conflict | High |
| SY-004 | Conflict resolution flow | Conflicts resolved using chosen strategy (local/remote/merge) | High |
| SY-005 | Deleted item sync | Deletion recorded in manifest propagates to delta | High |
| SY-006 | Large image sync | Should handle images up to 10MB (mock file transfer) | Medium |
| SY-007 | Batch upload | Should batch multiple items efficiently | Medium |
| SY-008 | Offline queue | Changes queued when offline, sync triggered when online | High |
| SY-009 | Auth token refresh during sync | Should use retryWithBackoff for token refresh | High |
| SY-010 | Sync interruption recovery | Partial sync state should be recoverable | Medium |
| SY-011 | Hash consistency local↔remote | Same content should produce same hash on both sides | Critical |
| SY-012 | Deleted items retention | Deleted items should be pruned after retention period | Medium |

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
