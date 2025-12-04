import Dexie, { type EntityTable } from 'dexie';
import type {
  Project,
  Character,
  Section,
  CanvasItem,
  MoodboardImage,
  Tag,
  AppSettings,
} from '@/types';

// Database class
export class MoodboardDatabase extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  characters!: EntityTable<Character, 'id'>;
  sections!: EntityTable<Section, 'id'>;
  canvasItems!: EntityTable<CanvasItem, 'id'>;
  images!: EntityTable<MoodboardImage, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  settings!: EntityTable<AppSettings, 'id'>;

  constructor() {
    super('MoodboardManager');

    this.version(1).stores({
      projects: 'id, name, isArchived, createdAt, updatedAt',
      characters: 'id, projectId, name, sortOrder, createdAt',
      sections: 'id, characterId, type, sortOrder',
      canvasItems: 'id, sectionId, type, createdAt',
      images: 'id, filename, mimeType, createdAt, *tags',
      tags: 'id, name, category',
      settings: 'id',
    });
  }
}

// Singleton instance
export const db = new MoodboardDatabase();

// Helper to generate IDs
export function generateId(): string {
  return crypto.randomUUID();
}
