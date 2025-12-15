import { db, generateId } from '../database';
import type { Edition, EditionStatus, EditionMetadata } from '@/types';

export const editionRepository = {
  async create(
    projectId: string,
    title: string,
    options?: Partial<Pick<Edition, 'issueNumber' | 'volume' | 'synopsis'>>
  ): Promise<Edition> {
    const now = new Date();

    // Get max sort order for this project
    const existing = await db.editions.where('projectId').equals(projectId).toArray();
    const maxOrder = existing.reduce((max, e) => Math.max(max, e.sortOrder), -1);

    // Auto-increment issue number if not provided
    const maxIssue = existing.reduce((max, e) => Math.max(max, e.issueNumber ?? 0), 0);

    const edition: Edition = {
      id: generateId(),
      projectId,
      title,
      issueNumber: options?.issueNumber ?? maxIssue + 1,
      volume: options?.volume,
      synopsis: options?.synopsis,
      status: 'draft',
      metadata: {},
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    await db.editions.add(edition);
    return edition;
  },

  async getById(id: string): Promise<Edition | undefined> {
    return db.editions.get(id);
  },

  async getByProject(projectId: string): Promise<Edition[]> {
    return db.editions
      .where('projectId')
      .equals(projectId)
      .sortBy('sortOrder');
  },

  async update(
    id: string,
    updates: Partial<Omit<Edition, 'id' | 'projectId' | 'createdAt'>>
  ): Promise<void> {
    await db.editions.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async updateTitle(id: string, title: string): Promise<void> {
    await this.update(id, { title });
  },

  async updateStatus(id: string, status: EditionStatus): Promise<void> {
    await this.update(id, { status });
  },

  async updateCoverInfo(
    id: string,
    coverDescription?: string,
    coverImageId?: string
  ): Promise<void> {
    await this.update(id, { coverDescription, coverImageId });
  },

  async updateMetadata(id: string, metadata: Partial<EditionMetadata>): Promise<void> {
    const edition = await this.getById(id);
    if (edition) {
      await this.update(id, {
        metadata: { ...edition.metadata, ...metadata },
      });
    }
  },

  async reorder(id: string, newOrder: number): Promise<void> {
    await this.update(id, { sortOrder: newOrder });
  },

  async delete(id: string): Promise<void> {
    // Delete all pages and their panels
    const pages = await db.scriptPages.where('editionId').equals(id).toArray();
    for (const page of pages) {
      await db.panels.where('pageId').equals(page.id).delete();
    }
    await db.scriptPages.where('editionId').equals(id).delete();
    await db.editions.delete(id);
  },

  async duplicate(id: string, newTitle: string): Promise<Edition | undefined> {
    const original = await this.getById(id);
    if (!original) return undefined;

    const now = new Date();
    const existing = await db.editions.where('projectId').equals(original.projectId).toArray();
    const maxOrder = existing.reduce((max, e) => Math.max(max, e.sortOrder), -1);

    const duplicate: Edition = {
      ...original,
      id: generateId(),
      title: newTitle,
      status: 'draft',
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    await db.editions.add(duplicate);

    // Duplicate pages and panels
    const pages = await db.scriptPages.where('editionId').equals(id).toArray();
    for (const page of pages) {
      const newPageId = generateId();
      await db.scriptPages.add({
        ...page,
        id: newPageId,
        editionId: duplicate.id,
        createdAt: now,
        updatedAt: now,
      });

      const panels = await db.panels.where('pageId').equals(page.id).toArray();
      for (const panel of panels) {
        await db.panels.add({
          ...panel,
          id: generateId(),
          pageId: newPageId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return duplicate;
  },

  async getPageCount(editionId: string): Promise<number> {
    return db.scriptPages.where('editionId').equals(editionId).count();
  },

  async getStats(editionId: string): Promise<{ pages: number; panels: number }> {
    const pages = await db.scriptPages.where('editionId').equals(editionId).toArray();
    let totalPanels = 0;

    for (const page of pages) {
      const panelCount = await db.panels.where('pageId').equals(page.id).count();
      totalPanels += panelCount;
    }

    return { pages: pages.length, panels: totalPanels };
  },
};
