import { db, generateId } from '../database';
import type { Character, CharacterProfile, CharacterMetadata, CanvasState } from '@/types';

export const characterRepository = {
  async create(projectId: string, name: string): Promise<Character> {
    const now = new Date();

    // Get max sort order for this project
    const existing = await db.characters.where('projectId').equals(projectId).toArray();
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1);

    const character: Character = {
      id: generateId(),
      projectId,
      name,
      tags: [],
      profile: {},
      metadata: {},
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    await db.characters.add(character);
    return character;
  },

  async getById(id: string): Promise<Character | undefined> {
    return db.characters.get(id);
  },

  async getByProject(projectId: string): Promise<Character[]> {
    return db.characters
      .where('projectId')
      .equals(projectId)
      .sortBy('sortOrder');
  },

  async update(id: string, updates: Partial<Omit<Character, 'id' | 'projectId' | 'createdAt'>>): Promise<void> {
    await db.characters.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async rename(id: string, name: string): Promise<void> {
    await this.update(id, { name });
  },

  async updateProfile(id: string, profile: Partial<CharacterProfile>): Promise<void> {
    const character = await this.getById(id);
    if (character) {
      await this.update(id, {
        profile: { ...character.profile, ...profile },
      });
    }
  },

  async updateMetadata(id: string, metadata: Partial<CharacterMetadata>): Promise<void> {
    const character = await this.getById(id);
    if (character) {
      await this.update(id, {
        metadata: { ...character.metadata, ...metadata },
      });
    }
  },

  async addTag(id: string, tag: string): Promise<void> {
    const character = await this.getById(id);
    if (character && !character.tags.includes(tag)) {
      await this.update(id, { tags: [...character.tags, tag] });
    }
  },

  async removeTag(id: string, tag: string): Promise<void> {
    const character = await this.getById(id);
    if (character) {
      await this.update(id, { tags: character.tags.filter(t => t !== tag) });
    }
  },

  async updateCanvasState(id: string, canvasState: CanvasState): Promise<void> {
    await this.update(id, { canvasState });
  },

  async reorder(id: string, newOrder: number): Promise<void> {
    await this.update(id, { sortOrder: newOrder });
  },

  async delete(id: string): Promise<void> {
    // Delete all sections and canvas items
    const sections = await db.sections.where('characterId').equals(id).toArray();
    for (const section of sections) {
      await db.canvasItems.where('sectionId').equals(section.id).delete();
    }
    await db.sections.where('characterId').equals(id).delete();
    await db.characters.delete(id);
  },

  async duplicate(id: string, newName: string): Promise<Character | undefined> {
    const original = await this.getById(id);
    if (!original) return undefined;

    const duplicated = await this.create(original.projectId, newName);
    await this.update(duplicated.id, {
      description: original.description,
      tags: [...original.tags],
      profile: { ...original.profile },
      metadata: { ...original.metadata },
    });

    return this.getById(duplicated.id);
  },
};
