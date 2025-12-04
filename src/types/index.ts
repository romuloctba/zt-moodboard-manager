// ===========================================
// Core Types for Moodboard Manager
// ===========================================

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  theme?: string;
  tags: string[];
  settings: ProjectSettings;
  coverImageId?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  defaultView: 'grid' | 'canvas';
  gridColumns: number;
  canvasBackground: string;
}

// Character Types
export interface Character {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  tags: string[];
  profile: CharacterProfile;
  metadata: CharacterMetadata;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterProfile {
  age?: string;
  role?: string;
  personality?: string[];
  abilities?: string[];
  backstory?: string;
  customFields?: Record<string, string>;
}

export interface CharacterMetadata {
  palette?: ColorPalette;
  archetype?: string;
  version?: string;
  inspirations?: string[];
}

// Section Types
export interface Section {
  id: string;
  characterId: string;
  name: string;
  type: SectionType;
  color: string;
  sortOrder: number;
  createdAt: Date;
}

export type SectionType = 'costume' | 'poses' | 'expressions' | 'references' | 'custom';

// Canvas Types
export interface CanvasItem {
  id: string;
  sectionId: string;
  type: 'image' | 'note' | 'connection';
  content: ImageContent | NoteContent | ConnectionContent;
  position: Position;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface ImageContent {
  imageId: string;
  cropArea?: CropArea;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NoteContent {
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: 'sm' | 'md' | 'lg';
}

export interface ConnectionContent {
  fromItemId: string;
  toItemId: string;
  style: 'arrow' | 'line' | 'dashed';
  color: string;
  label?: string;
}

// Image Types
export interface MoodboardImage {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  storagePath: string;
  thumbnailPath: string;
  palette?: ColorPalette;
  tags: string[];
  createdAt: Date;
}

export interface ColorPalette {
  dominant: string;
  vibrant: string;
  muted: string;
  colors: string[];
}

// Tag Types
export interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
}

// Settings Types
export interface AppSettings {
  id: string;
  theme: 'dark' | 'light' | 'system';
  defaultView: 'grid' | 'canvas';
  gridColumns: number;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'manual';
  lastBackupAt?: Date;
}

// Default values
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  defaultView: 'grid',
  gridColumns: 4,
  canvasBackground: '#1a1a1a',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'user-settings',
  theme: 'dark',
  defaultView: 'grid',
  gridColumns: 4,
  autoBackup: true,
  backupFrequency: 'daily',
};

export const SECTION_COLORS: Record<SectionType, string> = {
  costume: '#8b5cf6',      // Purple
  poses: '#3b82f6',        // Blue
  expressions: '#f59e0b',  // Orange
  references: '#10b981',   // Green
  custom: '#6b7280',       // Gray
};
