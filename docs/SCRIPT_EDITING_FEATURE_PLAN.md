# 📚 Comic Book Edition Script Writing Feature - Technical Plan

## Overview

Add a **Comic Book Edition** feature to allow users to create and manage comic book scripts within their projects. This feature supports:
- **Editions** (comic issues/volumes)
- **Pages** within editions
- **Panels** within pages for organizing script content

---

## 🏗️ Data Model Design

### New Types (to add to index.ts)

```typescript
// Edition (Issue/Volume)
interface Edition {
  id: string;
  projectId: string;
  title: string;
  issueNumber?: number;
  volume?: number;
  synopsis?: string;
  coverDescription?: string;
  coverImageId?: string;  // Optional cover reference image
  status: EditionStatus;
  metadata: EditionMetadata;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

type EditionStatus = 'draft' | 'in-progress' | 'review' | 'complete';

interface EditionMetadata {
  genre?: string;
  targetAudience?: string;
  pageCount?: number;
  notes?: string;
}

// Page
interface ScriptPage {
  id: string;
  editionId: string;
  pageNumber: number;
  title?: string;           // Optional page title
  goal?: string;            // Page goal/purpose
  setting?: string;         // Location/scene description
  notes?: string;           // Writer notes
  status: PageStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

type PageStatus = 'draft' | 'scripted' | 'review' | 'approved';

// Panel
interface Panel {
  id: string;
  pageId: string;
  panelNumber: number;
  description?: string;     // Visual description
  script: string;           // The actual script content
  dialogues: PanelDialogue[];  // Character dialogues
  characterIds?: string[];  // Referenced characters
  notes?: string;           // Director/artist notes
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface PanelDialogue {
  id: string;
  characterId?: string;     // Optional link to character
  characterName: string;    // Display name (allows ad-hoc names)
  type: DialogueType;
  text: string;
  sortOrder: number;
}

type DialogueType = 'speech' | 'thought' | 'caption' | 'sfx' | 'narration';
```

---

## 📁 File Structure

```
src/
├── app/
│   └── projects/
│       └── view/
│           ├── page.tsx              # Existing - add Editions tab/section
│           └── editions/
│               ├── page.tsx          # Edition list view
│               └── [editionId]/
│                   ├── page.tsx      # Edition detail (pages list)
│                   └── pages/
│                       └── [pageId]/
│                           └── page.tsx  # Page script editor
│
├── components/
│   └── editions/
│       ├── index.ts
│       ├── EditionCard.tsx
│       ├── EditionList.tsx
│       ├── CreateEditionDialog.tsx
│       ├── EditEditionDialog.tsx
│       ├── EditionHeader.tsx
│       ├── PageCard.tsx
│       ├── PageList.tsx
│       ├── CreatePageDialog.tsx
│       ├── EditPageDialog.tsx
│       ├── PanelCard.tsx
│       ├── PanelList.tsx
│       ├── CreatePanelDialog.tsx
│       ├── PanelEditor.tsx
│       ├── DialogueEditor.tsx
│       └── ScriptPreview.tsx
│
├── lib/
│   └── db/
│       └── repositories/
│           ├── editionRepository.ts
│           ├── scriptPageRepository.ts
│           └── panelRepository.ts
│
├── store/
│   └── editionStore.ts               # Zustand store for editions
│
├── locales/
│   ├── en/
│   │   └── editions.json
│   └── pt-BR/
│       └── editions.json
```

---

## 🗄️ Database Schema Changes

Add to database.ts:

```typescript
editions!: EntityTable<Edition, 'id'>;
scriptPages!: EntityTable<ScriptPage, 'id'>;
panels!: EntityTable<Panel, 'id'>;

// In version upgrade:
this.version(2).stores({
  // ... existing stores
  editions: 'id, projectId, title, status, sortOrder, createdAt',
  scriptPages: 'id, editionId, pageNumber, status, sortOrder',
  panels: 'id, pageId, panelNumber, sortOrder',
});
```

---

## 🔄 Sync & Export Integration

### Update Sync Types (types.ts)
- Add `editions`, `scriptPages`, `panels` to `SyncManifest`
- Add to `DeletedItemRecord` types

### Update Backup Service (backupService.ts)
- Include new tables in database export
- Update `BackupManifest.stats` to include edition counts

### Update Sync Service (syncService.ts)
- Add handlers for edition/page/panel sync
- Include in delta comparison logic

---

## 🌐 Localization Structure

### `src/locales/en/editions.json`
```json
{
  "header": {
    "title": "Editions",
    "newEdition": "New Edition"
  },
  "emptyState": {
    "title": "No editions yet",
    "description": "Create your first comic edition to start writing scripts.",
    "action": "Create First Edition"
  },
  "createDialog": { ... },
  "status": {
    "draft": "Draft",
    "in-progress": "In Progress",
    "review": "Review",
    "complete": "Complete"
  },
  "pages": { ... },
  "panels": { ... },
  "dialogue": {
    "types": {
      "speech": "Speech",
      "thought": "Thought",
      "caption": "Caption",
      "sfx": "Sound Effect",
      "narration": "Narration"
    }
  }
}
```

---

## 🎯 User Flow

1. **Project View** → Shows "Characters" and "Editions" sections/tabs
2. **Create Edition** → Dialog with title, issue number, synopsis
3. **Edition View** → Shows cover info + list of pages
4. **Add Page** → Quick add with page number auto-increment
5. **Page View** → Shows page info + panels
6. **Panel Editor** → Script writing with dialogue management
7. **Script Preview** → Full script view for the edition

---

## 📋 Implementation Phases

### Phase 1: Core Data Layer
- [ ] Add types to index.ts
- [ ] Update database schema
- [ ] Create repositories (edition, page, panel)
- [ ] Create Zustand store

### Phase 2: Basic UI Components
- [ ] Create Edition components (list, card, dialogs)
- [ ] Create Page components
- [ ] Create Panel components
- [ ] Add routing structure

### Phase 3: Script Editor
- [ ] Panel editor with script content
- [ ] Dialogue editor with character selection
- [ ] Script preview/export

### Phase 4: Integration
- [ ] Update project view to show editions
- [ ] Add localization files (en, pt-BR)
- [ ] Update sync service
- [ ] Update backup service

### Phase 5: Polish
- [ ] Status indicators and filtering
- [ ] Drag-drop reordering
- [ ] Keyboard shortcuts
- [ ] Mobile responsiveness

---

## 🚀 Key Features for Great UX

1. **Quick Panel Creation** - Add panels inline without dialog
2. **Keyboard Navigation** - Tab through panels, Enter to save
3. **Auto-save** - Debounced saves while typing
4. **Character Quick-Select** - Easy dialogue attribution
5. **Script Export** - Export as formatted document
6. **Page Goals** - Visual indicators for story beats
7. **Status Tracking** - Visual progress through the script
8. **Drag & Reorder** - Easy reorganization of panels/pages
