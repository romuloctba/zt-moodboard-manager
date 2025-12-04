# Refactoring Plan: Best Practices Implementation

## Overview

This document outlines a comprehensive refactoring plan for the Moodboard Manager project to implement React/Next.js best practices, focusing on component composability, separation of concerns, and maintainability.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Refactoring Goals](#refactoring-goals)
3. [Phase 1: Component Architecture](#phase-1-component-architecture)
4. [Phase 2: State Management](#phase-2-state-management)
5. [Phase 3: Custom Hooks](#phase-3-custom-hooks)
6. [Phase 4: Server/Client Component Separation](#phase-4-serverclient-component-separation)
7. [Phase 5: Performance Optimizations](#phase-5-performance-optimizations)
8. [Implementation Priority](#implementation-priority)

---

## Current State Analysis

### Issues Identified

#### 1. **Large Monolithic Components**
- `ImageGrid.tsx` (564 lines) - Contains UI, business logic, state management, and data fetching
- `MoodboardCanvas.tsx` (773 lines) - Handles canvas rendering, image management, drag/drop, and zoom controls
- `CharacterProfile.tsx` (465 lines) - Mixes form state, validation, and UI
- `settings/page.tsx` (534 lines) - Contains backup logic, restore logic, clear data, and multiple dialogs

#### 2. **Mixed Concerns in Components**
- Components directly import and call repositories (`imageRepository`, `characterRepository`)
- Business logic embedded in UI components
- Toast notifications scattered throughout components

#### 3. **Repeated Patterns**
- Loading states (`Loader2` spinner) duplicated across components
- Empty states implemented inline in multiple places
- Confirmation dialogs logic repeated

#### 4. **Missing Abstraction Layers**
- No clear separation between "smart" (container) and "dumb" (presentational) components
- No dedicated hooks for data fetching and mutations
- No centralized error handling

---

## Refactoring Goals

1. **Composability**: Break down large components into smaller, reusable pieces
2. **Single Responsibility**: Each component/hook should do one thing well
3. **Testability**: Make components easier to test in isolation
4. **Type Safety**: Improve TypeScript usage with stricter types
5. **Performance**: Optimize re-renders and data fetching
6. **Maintainability**: Clear folder structure and naming conventions

---

## Phase 1: Component Architecture

### 1.1 Establish Component Categories

Create a clear hierarchy of component types:

```
src/components/
├── ui/                    # Base UI primitives (shadcn/ui) - Already exists ✓
├── common/                # NEW: Shared presentational components
│   ├── LoadingSpinner.tsx
│   ├── EmptyState.tsx
│   ├── ConfirmDialog.tsx
│   ├── ErrorBoundary.tsx
│   └── PageHeader.tsx
├── features/              # NEW: Feature-specific components
│   ├── images/
│   │   ├── ImageThumbnail.tsx
│   │   ├── ImagePreviewDialog.tsx
│   │   ├── ImageSelectionToolbar.tsx
│   │   ├── ImageTagFilter.tsx
│   │   ├── ImageColorPalette.tsx
│   │   └── ImageGrid/
│   │       ├── index.ts
│   │       ├── ImageGrid.tsx        # Main container (smart)
│   │       ├── ImageGridItem.tsx    # Single item (dumb)
│   │       └── useImageGrid.ts      # Hook for logic
│   ├── canvas/
│   │   ├── CanvasContainer.tsx
│   │   ├── CanvasImage.tsx
│   │   ├── CanvasControls.tsx
│   │   ├── ZoomControls.tsx
│   │   └── useCanvasState.ts
│   ├── characters/
│   │   └── ... (existing, needs refactoring)
│   └── projects/
│       └── ... (existing, needs refactoring)
└── layout/                # Layout components - Already exists ✓
```

### 1.2 Create Common/Shared Components

#### `LoadingSpinner.tsx`
```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullPage?: boolean;
}
```

#### `EmptyState.tsx`
```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
```

#### `ConfirmDialog.tsx`
```tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}
```

### 1.3 Refactor ImageGrid Component

**Current**: Single 564-line component
**Target**: Split into multiple focused components

```
ImageGrid/
├── index.ts                    # Public exports
├── ImageGrid.tsx               # Main container (orchestration only)
├── ImageGridItem.tsx           # Single image card (presentational)
├── ImagePreviewDialog.tsx      # Full-size preview modal
├── ImageSelectionToolbar.tsx   # Bulk selection controls
├── ImageTagFilter.tsx          # Tag filtering dropdown
├── hooks/
│   ├── useImageData.ts         # Data fetching & caching
│   ├── useImageSelection.ts    # Selection state management
│   └── useImageActions.ts      # Delete, export actions
└── types.ts                    # Local type definitions
```

### 1.4 Refactor MoodboardCanvas Component

**Current**: Single 773-line component with nested components
**Target**: Modular canvas system

```
canvas/
├── index.ts
├── MoodboardCanvas.tsx         # Main container
├── CanvasViewport.tsx          # Handles zoom/pan wrapper
├── CanvasGrid.tsx              # Background grid pattern
├── CanvasItem.tsx              # Draggable/resizable item
├── CanvasItemControls.tsx      # Item action buttons
├── CanvasToolbar.tsx           # Top toolbar
├── ZoomControls.tsx            # Bottom-right zoom UI
├── hooks/
│   ├── useCanvasImages.ts      # Image data loading
│   ├── useCanvasItems.ts       # Canvas items CRUD
│   ├── useCanvasPersistence.ts # Auto-save logic
│   └── useDragResize.ts        # Drag and resize handlers
└── types.ts
```

### 1.5 Refactor Settings Page

**Current**: Single 534-line page component
**Target**: Feature-based sections

```
settings/
├── page.tsx                    # Main page (minimal)
├── components/
│   ├── SettingsHeader.tsx
│   ├── StorageSection.tsx
│   ├── BackupSection.tsx
│   ├── RestoreSection.tsx
│   ├── DangerZone.tsx
│   ├── LanguageSection.tsx
│   └── RestoreConfirmDialog.tsx
└── hooks/
    ├── useBackup.ts
    ├── useRestore.ts
    └── useStorageStats.ts
```

---

## Phase 2: State Management

### 2.1 Zustand Store Improvements

**Current Issues**:
- Single store handling both projects and characters
- Direct repository calls inside store actions
- No separation between UI state and domain state

**Proposed Changes**:

#### Split into Domain-Specific Stores

```typescript
// stores/projectStore.ts - Projects only
interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectInput) => Promise<Project>;
  // ... etc
}

// stores/characterStore.ts - Characters only
interface CharacterStore {
  characters: Character[];
  currentCharacter: Character | null;
  // ...
}

// stores/uiStore.ts - UI-only state
interface UIStore {
  sidebarOpen: boolean;
  activeDialog: string | null;
  selectionMode: boolean;
  selectedIds: Set<string>;
  // ...
}
```

### 2.2 React Query/TanStack Query Integration

Consider adding TanStack Query for:
- Server state management
- Automatic caching and invalidation
- Background refetching
- Optimistic updates

```typescript
// hooks/queries/useImages.ts
export function useCharacterImages(characterId: string) {
  return useQuery({
    queryKey: ['images', characterId],
    queryFn: () => imageRepository.getByCharacterId(characterId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// hooks/mutations/useDeleteImage.ts
export function useDeleteImage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (imageId: string) => imageRepository.delete(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });
}
```

---

## Phase 3: Custom Hooks

### 3.1 Data Fetching Hooks

```typescript
// hooks/data/useCharacter.ts
export function useCharacter(characterId: string) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // ... fetch logic
  
  return { character, loading, error, refetch };
}

// hooks/data/useProject.ts
export function useProject(projectId: string) { /* ... */ }

// hooks/data/useImages.ts
export function useImages(characterId: string) { /* ... */ }
```

### 3.2 Action Hooks

```typescript
// hooks/actions/useImageActions.ts
export function useImageActions(characterId: string) {
  const deleteImage = async (imageId: string) => { /* ... */ };
  const deleteMany = async (ids: string[]) => { /* ... */ };
  const updateTags = async (imageId: string, tags: string[]) => { /* ... */ };
  const exportImages = async (ids: string[]) => { /* ... */ };
  
  return { deleteImage, deleteMany, updateTags, exportImages };
}
```

### 3.3 UI State Hooks

```typescript
// hooks/ui/useSelection.ts
export function useSelection<T extends string>() {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  
  const toggle = (id: T) => { /* ... */ };
  const selectAll = (ids: T[]) => { /* ... */ };
  const clear = () => { /* ... */ };
  const isSelected = (id: T) => selectedIds.has(id);
  
  return {
    selectedIds,
    selectionMode,
    setSelectionMode,
    toggle,
    selectAll,
    clear,
    isSelected,
    count: selectedIds.size,
  };
}

// hooks/ui/useConfirmDialog.ts
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<(() => Promise<void>) | null>(null);
  
  const confirm = (action: () => Promise<void>) => {
    setPending(() => action);
    setIsOpen(true);
  };
  
  const execute = async () => {
    if (pending) await pending();
    setIsOpen(false);
    setPending(null);
  };
  
  return { isOpen, setIsOpen, confirm, execute };
}
```

### 3.4 Proposed Hook Structure

```
hooks/
├── data/                  # Data fetching hooks
│   ├── useCharacter.ts
│   ├── useCharacters.ts
│   ├── useProject.ts
│   ├── useProjects.ts
│   └── useImages.ts
├── actions/               # Mutation/action hooks
│   ├── useImageActions.ts
│   ├── useCharacterActions.ts
│   └── useProjectActions.ts
├── ui/                    # UI state hooks
│   ├── useSelection.ts
│   ├── useConfirmDialog.ts
│   ├── usePagination.ts
│   └── useFilter.ts
└── index.ts               # Re-exports
```

---

## Phase 4: Server/Client Component Separation

### 4.1 Identify Server Component Candidates

Components that can be Server Components:
- Static layouts
- Pages that fetch data on server
- Components with no interactivity

### 4.2 Current State

All page components are marked `'use client'` which is inefficient.

### 4.3 Proposed Pattern

```tsx
// app/projects/view/page.tsx (Server Component)
import { Suspense } from 'react';
import { ProjectViewClient } from './ProjectViewClient';
import { ProjectViewSkeleton } from './ProjectViewSkeleton';

export default function ProjectViewPage() {
  return (
    <Suspense fallback={<ProjectViewSkeleton />}>
      <ProjectViewClient />
    </Suspense>
  );
}

// app/projects/view/ProjectViewClient.tsx (Client Component)
'use client';

export function ProjectViewClient() {
  // All interactive logic here
}
```

### 4.4 Metadata and SEO

Move metadata generation to server components:

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Moodboard Manager',
  description: '...',
};
```

---

## Phase 5: Performance Optimizations

### 5.1 Memoization Strategy

```tsx
// Memoize expensive child components
const MemoizedImageGridItem = memo(ImageGridItem);

// Memoize callbacks passed to children
const handleDelete = useCallback((id: string) => {
  // ...
}, [dependencies]);

// Memoize computed values
const filteredImages = useMemo(() => 
  images.filter(img => filterTag ? img.tags.includes(filterTag) : true),
  [images, filterTag]
);
```

### 5.2 Virtual Lists for Large Data

For grids with many items:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedImageGrid({ images }: { images: ImageWithUrl[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
  });
  
  // ...
}
```

### 5.3 Image Loading Optimization

```tsx
// components/common/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  onLoad?: () => void;
}

export function OptimizedImage({ src, alt, ...props }: OptimizedImageProps) {
  // Use intersection observer for lazy loading
  // Use blur placeholder
  // Handle loading states
}
```

### 5.4 Code Splitting

```tsx
// Lazy load heavy components
const MoodboardCanvas = dynamic(
  () => import('@/components/features/canvas/MoodboardCanvas'),
  { 
    loading: () => <CanvasSkeleton />,
    ssr: false // Canvas doesn't need SSR
  }
);
```

---

## Implementation Priority

### High Priority (Week 1-2)

1. **Create common components**
   - [ ] `ConfirmDialog` - Used for all delete confirmations
   - [ ] `EmptyState` - Reusable empty state component
   - [ ] `LoadingSpinner` - Consistent loading indicator

2. **Extract hooks from ImageGrid**
   - [ ] `useImageData` - Data fetching
   - [ ] `useImageSelection` - Selection logic
   - [ ] `useImageActions` - CRUD operations

3. **Split ImageGrid component**
   - [ ] `ImageGridItem` - Single image card
   - [ ] `ImagePreviewDialog` - Preview modal
   - [ ] `ImageSelectionToolbar` - Bulk actions

### Medium Priority (Week 3-4)

4. **Refactor MoodboardCanvas**
   - [ ] Extract `ZoomControls`
   - [ ] Extract `CanvasItem`
   - [ ] Create `useCanvasState` hook

5. **Refactor Settings page**
   - [ ] Split into section components
   - [ ] Create `useBackup` and `useRestore` hooks

6. **Improve store architecture**
   - [ ] Split stores by domain
   - [ ] Add UI-specific store

### Lower Priority (Week 5+)

7. **Performance optimizations**
   - [ ] Add virtualization for large lists
   - [ ] Implement proper memoization
   - [ ] Add code splitting

8. **Server/Client separation**
   - [ ] Audit components for server component eligibility
   - [ ] Implement proper suspense boundaries

9. **Consider TanStack Query**
   - [ ] Evaluate migration effort
   - [ ] Start with new features
   - [ ] Gradually migrate existing data fetching

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component | PascalCase | `ImageGridItem.tsx` |
| Hook | camelCase with `use` prefix | `useImageData.ts` |
| Utility | camelCase | `formatFileSize.ts` |
| Type file | camelCase | `types.ts` |
| Index/barrel | lowercase | `index.ts` |
| Test | same as source + `.test` | `ImageGridItem.test.tsx` |

---

## Component Design Principles

### 1. Props Interface Design

```tsx
// ✅ Good: Explicit, typed props
interface ImageGridItemProps {
  image: ImageWithUrl;
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPreview: () => void;
}

// ❌ Bad: Passing entire objects when only some fields are needed
interface ImageGridItemProps {
  image: ImageWithUrl;
  state: ComplexStateObject;
}
```

### 2. Composition over Configuration

```tsx
// ✅ Good: Composable
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// ❌ Bad: Over-configured
<Card
  title="Title"
  showHeader={true}
  headerVariant="default"
  content={<div>Content</div>}
/>
```

### 3. Controlled vs Uncontrolled

Prefer controlled components for flexibility:

```tsx
// ✅ Controlled - Parent manages state
<ImageGrid
  images={images}
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
/>

// Can also provide uncontrolled option
<ImageGrid
  images={images}
  defaultSelectedIds={[]}
/>
```

---

## Testing Strategy (Future)

### Component Testing

```tsx
// ImageGridItem.test.tsx
describe('ImageGridItem', () => {
  it('renders image thumbnail', () => {});
  it('shows selection checkbox in selection mode', () => {});
  it('calls onDelete when delete button clicked', () => {});
  it('shows hover overlay', () => {});
});
```

### Hook Testing

```tsx
// useImageSelection.test.ts
describe('useImageSelection', () => {
  it('toggles selection', () => {});
  it('selects all items', () => {});
  it('clears selection', () => {});
});
```

---

## Migration Notes

1. **Backwards Compatibility**: Maintain existing exports while refactoring
2. **Incremental Migration**: Refactor one component at a time
3. **Feature Flags**: Use flags if needed for gradual rollout
4. **Documentation**: Update component documentation as you go

---

## Conclusion

This refactoring plan provides a roadmap for improving the codebase quality, maintainability, and performance. The key focus areas are:

1. Breaking down large components into smaller, focused pieces
2. Extracting business logic into custom hooks
3. Creating reusable common components
4. Improving state management patterns
5. Optimizing performance where needed

Start with high-priority items that provide immediate value and gradually work through the list. Each refactoring should be done incrementally with proper testing to avoid breaking existing functionality.
