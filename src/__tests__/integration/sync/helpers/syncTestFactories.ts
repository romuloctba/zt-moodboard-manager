/**
 * Sync Test Factories
 *
 * Factory functions that create fully-populated entities with ALL fields
 * for comprehensive sync field validation testing.
 *
 * IMPORTANT: These factories populate EVERY field to ensure sync tests
 * validate complete data transfer, not just required fields.
 */

import type {
  Project,
  ProjectSettings,
  Character,
  CharacterProfile,
  CharacterMetadata,
  CanvasState,
  CanvasImageItem,
  MoodboardImage,
  ColorPalette,
  Edition,
  EditionMetadata,
  ScriptPage,
  Panel,
  PanelDialogue,
  DialogueType,
} from '@/types'

// Counter for generating unique IDs in tests
let idCounter = 0

export function generateTestId(prefix = 'test'): string {
  idCounter++
  return `${prefix}-${idCounter}-${Date.now()}`
}

export function resetIdCounter(): void {
  idCounter = 0
}

// =============================================================================
// COLOR PALETTE FACTORY
// =============================================================================

export function createFullColorPalette(overrides: Partial<ColorPalette> = {}): ColorPalette {
  return {
    dominant: '#ff5733',
    vibrant: '#33ff57',
    muted: '#5733ff',
    colors: ['#ff5733', '#33ff57', '#5733ff', '#ffff33', '#33ffff'],
    ...overrides,
  }
}

// =============================================================================
// PROJECT FACTORY
// =============================================================================

export function createFullProjectSettings(overrides: Partial<ProjectSettings> = {}): ProjectSettings {
  return {
    defaultView: 'canvas',
    gridColumns: 6,
    canvasBackground: '#2a2a2a',
    ...overrides,
  }
}

export function createFullProject(overrides: Partial<Project> = {}): Project {
  const now = new Date()
  return {
    id: generateTestId('project'),
    name: 'Epic Fantasy Comic Series',
    description: 'A comprehensive fantasy comic book project with multiple story arcs',
    genre: 'Fantasy',
    theme: 'Heroes Journey',
    tags: ['fantasy', 'action', 'adventure', 'magic'],
    settings: createFullProjectSettings(),
    coverImageId: generateTestId('cover-image'),
    isArchived: false,
    createdAt: new Date(now.getTime() - 86400000), // 1 day ago
    updatedAt: now,
    ...overrides,
  }
}

// =============================================================================
// CHARACTER FACTORY
// =============================================================================

export function createFullCharacterProfile(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    age: '25',
    role: 'Protagonist',
    personality: ['brave', 'loyal', 'stubborn', 'compassionate'],
    abilities: ['swordsmanship', 'fire magic', 'leadership'],
    backstory: 'Born in a small village, trained by a legendary knight, now seeks to save the realm from darkness.',
    customFields: {
      height: '180cm',
      eyeColor: 'amber',
      weapon: 'Enchanted Longsword',
      motivation: 'Protect the innocent',
    },
    ...overrides,
  }
}

export function createFullCharacterMetadata(overrides: Partial<CharacterMetadata> = {}): CharacterMetadata {
  return {
    palette: createFullColorPalette(),
    archetype: 'The Hero',
    version: '2.1',
    inspirations: ['Aragorn', 'Cloud Strife', 'Link'],
    ...overrides,
  }
}

export function createFullCanvasImageItem(overrides: Partial<CanvasImageItem> = {}): CanvasImageItem {
  return {
    id: generateTestId('canvas-item'),
    imageId: generateTestId('image'),
    x: 150,
    y: 200,
    width: 300,
    height: 400,
    rotation: 15,
    zIndex: 2,
    locked: true,
    ...overrides,
  }
}

export function createFullCanvasState(overrides: Partial<CanvasState> = {}): CanvasState {
  const now = new Date()
  return {
    viewport: {
      x: 100,
      y: 150,
      zoom: 1.25,
    },
    items: [
      createFullCanvasImageItem({ id: 'canvas-item-1', imageId: 'img-1', x: 50, y: 50, zIndex: 1 }),
      createFullCanvasImageItem({ id: 'canvas-item-2', imageId: 'img-2', x: 400, y: 100, zIndex: 2 }),
      createFullCanvasImageItem({ id: 'canvas-item-3', imageId: 'img-3', x: 200, y: 350, zIndex: 3, locked: false }),
    ],
    updatedAt: now,
    ...overrides,
  }
}

export function createFullCharacter(
  projectId: string,
  overrides: Partial<Character> = {}
): Character {
  const now = new Date()
  return {
    id: generateTestId('character'),
    projectId,
    name: 'Sir Aldric the Brave',
    description: 'The main protagonist of our epic tale, a knight with a mysterious past',
    tags: ['hero', 'knight', 'main-character', 'fire-user'],
    profile: createFullCharacterProfile(),
    metadata: createFullCharacterMetadata(),
    canvasState: createFullCanvasState(),
    sortOrder: 0,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: now,
    ...overrides,
  }
}

// =============================================================================
// MOODBOARD IMAGE FACTORY
// =============================================================================

export function createFullMoodboardImage(
  characterId: string,
  overrides: Partial<MoodboardImage> = {}
): MoodboardImage {
  const id = overrides.id || generateTestId('image')
  return {
    id,
    characterId,
    sectionId: generateTestId('section'),
    filename: `${id}.webp`,
    originalName: 'character-concept-art.png',
    mimeType: 'image/webp',
    size: 256000,
    width: 1920,
    height: 1080,
    storagePath: `opfs://images/${id}.webp`,
    thumbnailPath: `opfs://thumbnails/${id}.webp`,
    palette: createFullColorPalette(),
    tags: ['concept-art', 'character-design', 'approved'],
    notes: 'Final approved design for the main character. Use warm colors for lighting.',
    createdAt: new Date(),
    ...overrides,
  }
}

// =============================================================================
// EDITION FACTORY
// =============================================================================

export function createFullEditionMetadata(overrides: Partial<EditionMetadata> = {}): EditionMetadata {
  return {
    genre: 'Epic Fantasy',
    targetAudience: 'Young Adult',
    estimatedPageCount: 32,
    notes: 'First issue establishes the main conflict and introduces primary characters.',
    ...overrides,
  }
}

export function createFullEdition(
  projectId: string,
  overrides: Partial<Edition> = {}
): Edition {
  const now = new Date()
  return {
    id: generateTestId('edition'),
    projectId,
    title: 'The Awakening',
    issueNumber: 1,
    volume: 1,
    synopsis: 'In a world where magic has faded, one young knight discovers an ancient power that could save or destroy everything.',
    coverDescription: 'Hero standing atop a cliff, sword raised against a crimson sky, dragon silhouette in background',
    coverImageId: generateTestId('edition-cover'),
    status: 'in-progress',
    metadata: createFullEditionMetadata(),
    sortOrder: 0,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: now,
    ...overrides,
  }
}

// =============================================================================
// SCRIPT PAGE FACTORY
// =============================================================================

export function createFullScriptPage(
  editionId: string,
  overrides: Partial<ScriptPage> = {}
): ScriptPage {
  const now = new Date()
  return {
    id: generateTestId('page'),
    editionId,
    pageNumber: 1,
    title: 'The Call to Adventure',
    goal: 'Establish the protagonist and their ordinary world before disruption',
    setting: 'Village square at dawn, market stalls being set up',
    timeOfDay: 'Early morning, golden hour lighting',
    mood: 'Peaceful but with underlying tension',
    notes: 'Use warm colors. Foreshadow the incoming threat with subtle visual cues.',
    status: 'scripted',
    sortOrder: 0,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: now,
    ...overrides,
  }
}

// =============================================================================
// PANEL FACTORY
// =============================================================================

export function createFullPanelDialogue(overrides: Partial<PanelDialogue> = {}): PanelDialogue {
  return {
    id: generateTestId('dialogue'),
    characterId: generateTestId('char'),
    characterName: 'Sir Aldric',
    type: 'speech' as DialogueType,
    text: 'The darkness approaches. We must prepare.',
    direction: '(firmly, looking at the horizon)',
    sortOrder: 0,
    ...overrides,
  }
}

export function createFullPanel(
  pageId: string,
  overrides: Partial<Panel> = {}
): Panel {
  const now = new Date()
  return {
    id: generateTestId('panel'),
    pageId,
    panelNumber: 1,
    description: 'Wide establishing shot of the village with mountains in background. Sun rising.',
    cameraAngle: 'Wide shot, high angle, birds eye transitioning to ground level',
    characters: ['Sir Aldric', 'Elena', 'Village Elder'],
    notes: 'This panel sets the tone for the entire issue. Take time to establish atmosphere.',
    dialogues: [
      createFullPanelDialogue({
        id: 'dlg-1',
        characterId: 'char-1',
        characterName: 'Village Elder',
        type: 'speech',
        text: 'Another peaceful morning...',
        direction: '(sighing contentedly)',
        sortOrder: 0,
      }),
      createFullPanelDialogue({
        id: 'dlg-2',
        characterId: 'char-2',
        characterName: 'Sir Aldric',
        type: 'thought',
        text: 'But for how long?',
        direction: undefined,
        sortOrder: 1,
      }),
      createFullPanelDialogue({
        id: 'dlg-3',
        characterId: undefined,
        characterName: 'Narrator',
        type: 'caption',
        text: 'Little did they know, this would be their last peaceful dawn.',
        direction: undefined,
        sortOrder: 2,
      }),
    ],
    sortOrder: 0,
    createdAt: new Date(now.getTime() - 86400000),
    updatedAt: now,
    ...overrides,
  }
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Deep comparison helper for Date fields that may be serialized as strings
 */
export function compareDates(actual: Date | string, expected: Date | string): boolean {
  const actualTime = actual instanceof Date ? actual.getTime() : new Date(actual).getTime()
  const expectedTime = expected instanceof Date ? expected.getTime() : new Date(expected).getTime()
  return actualTime === expectedTime
}

/**
 * Normalize an entity for comparison by converting date strings to Date objects
 */
export function normalizeDates<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const key of Object.keys(result)) {
    const value = result[key]
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      (result as Record<string, unknown>)[key] = new Date(value)
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = normalizeDates(value as Record<string, unknown>)
    }
  }
  return result
}

// =============================================================================
// COMPLETE ENTITY GRAPH FACTORY
// =============================================================================

export interface CompleteEntityGraph {
  project: Project
  characters: Character[]
  images: MoodboardImage[]
  editions: Edition[]
  scriptPages: ScriptPage[]
  panels: Panel[]
}

/**
 * Creates a complete, interconnected entity graph for testing
 * referential integrity during sync operations.
 */
export function createCompleteEntityGraph(): CompleteEntityGraph {
  // Create project
  const project = createFullProject({
    id: 'graph-project-1',
    coverImageId: 'graph-image-1', // Will reference actual image
  })

  // Create characters
  const character1 = createFullCharacter(project.id, {
    id: 'graph-char-1',
    name: 'Hero',
    sortOrder: 0,
    canvasState: createFullCanvasState({
      items: [
        createFullCanvasImageItem({ id: 'ci-1', imageId: 'graph-image-1' }),
        createFullCanvasImageItem({ id: 'ci-2', imageId: 'graph-image-2' }),
      ],
    }),
  })

  const character2 = createFullCharacter(project.id, {
    id: 'graph-char-2',
    name: 'Villain',
    sortOrder: 1,
    canvasState: createFullCanvasState({
      items: [
        createFullCanvasImageItem({ id: 'ci-3', imageId: 'graph-image-3' }),
      ],
    }),
  })

  // Create images for characters
  const image1 = createFullMoodboardImage(character1.id, {
    id: 'graph-image-1',
    originalName: 'hero-main.png',
  })

  const image2 = createFullMoodboardImage(character1.id, {
    id: 'graph-image-2',
    originalName: 'hero-alternate.png',
  })

  const image3 = createFullMoodboardImage(character2.id, {
    id: 'graph-image-3',
    originalName: 'villain-design.png',
  })

  // Create edition
  const edition = createFullEdition(project.id, {
    id: 'graph-edition-1',
    coverImageId: 'graph-image-1', // References actual image
  })

  // Create script pages
  const page1 = createFullScriptPage(edition.id, {
    id: 'graph-page-1',
    pageNumber: 1,
    title: 'Opening',
  })

  const page2 = createFullScriptPage(edition.id, {
    id: 'graph-page-2',
    pageNumber: 2,
    title: 'Confrontation',
  })

  // Create panels with dialogue referencing real characters
  const panel1 = createFullPanel(page1.id, {
    id: 'graph-panel-1',
    panelNumber: 1,
    characters: ['Hero', 'Villain'],
    dialogues: [
      createFullPanelDialogue({
        id: 'graph-dlg-1',
        characterId: character1.id, // Real reference
        characterName: 'Hero',
        type: 'speech',
        text: 'I will stop you!',
      }),
      createFullPanelDialogue({
        id: 'graph-dlg-2',
        characterId: character2.id, // Real reference
        characterName: 'Villain',
        type: 'speech',
        text: 'You can try.',
      }),
    ],
  })

  const panel2 = createFullPanel(page1.id, {
    id: 'graph-panel-2',
    panelNumber: 2,
    dialogues: [
      createFullPanelDialogue({
        id: 'graph-dlg-3',
        characterId: undefined,
        characterName: 'Narrator',
        type: 'narration',
        text: 'The battle begins.',
      }),
    ],
  })

  const panel3 = createFullPanel(page2.id, {
    id: 'graph-panel-3',
    panelNumber: 1,
    dialogues: [
      createFullPanelDialogue({
        id: 'graph-dlg-4',
        characterId: character1.id,
        characterName: 'Hero',
        type: 'thought',
        text: 'I must find his weakness.',
      }),
    ],
  })

  return {
    project,
    characters: [character1, character2],
    images: [image1, image2, image3],
    editions: [edition],
    scriptPages: [page1, page2],
    panels: [panel1, panel2, panel3],
  }
}
