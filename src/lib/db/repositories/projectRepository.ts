import { db, generateId } from '../database';
import type { Project, ProjectSettings } from '@/types';
import { DEFAULT_PROJECT_SETTINGS } from '@/types';
import { characterRepository } from './characterRepository';

export const projectRepository = {
  async create(name: string, description?: string): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: generateId(),
      name,
      description,
      tags: [],
      settings: { ...DEFAULT_PROJECT_SETTINGS },
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.projects.add(project);
    return project;
  },

  async getById(id: string): Promise<Project | undefined> {
    return db.projects.get(id);
  },

  async getAll(): Promise<Project[]> {
    const all = await db.projects.orderBy('createdAt').reverse().toArray();
    return all.filter(p => !p.isArchived);
  },

  async getAllIncludingArchived(): Promise<Project[]> {
    return db.projects.orderBy('createdAt').reverse().toArray();
  },

  async getArchived(): Promise<Project[]> {
    const all = await db.projects.toArray();
    return all.filter(p => p.isArchived);
  },

  async update(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    await db.projects.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async rename(id: string, name: string): Promise<void> {
    await this.update(id, { name });
  },

  async archive(id: string): Promise<void> {
    await this.update(id, { isArchived: true });
  },

  async unarchive(id: string): Promise<void> {
    await this.update(id, { isArchived: false });
  },

  async updateSettings(id: string, settings: Partial<ProjectSettings>): Promise<void> {
    const project = await this.getById(id);
    if (project) {
      await this.update(id, {
        settings: { ...project.settings, ...settings },
      });
    }
  },

  async delete(id: string): Promise<void> {
    // Delete all characters (cascades to images, sections, canvas items)
    const characters = await db.characters.where('projectId').equals(id).toArray();
    for (const character of characters) {
      await characterRepository.delete(character.id);
    }

    // TODO: BUG - Missing cascade delete to editions!
    // Should delete all editions (which cascade to pages and panels).
    // See test DI-027 in consistency.test.ts for details.
    // Fix: Import editionRepository and call editionRepository.delete() for each edition.

    await db.projects.delete(id);
  },

  // TODO: Consider adding option to deep-duplicate (cascade to characters, editions).
  // Currently this is a shallow copy - only project metadata is duplicated.
  // Characters, editions, and their children are NOT copied.
  async duplicate(id: string, newName: string): Promise<Project | undefined> {
    const original = await this.getById(id);
    if (!original) return undefined;

    const duplicated = await this.create(newName, original.description);
    await this.update(duplicated.id, {
      genre: original.genre,
      theme: original.theme,
      tags: [...original.tags],
      settings: { ...original.settings },
    });

    return this.getById(duplicated.id);
  },
};
