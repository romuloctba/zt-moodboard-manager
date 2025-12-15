import { db, generateId } from '../database';
import type { ScriptPage, PageStatus } from '@/types';

export const scriptPageRepository = {
  async create(
    editionId: string,
    options?: Partial<Pick<ScriptPage, 'title' | 'goal' | 'setting'>>
  ): Promise<ScriptPage> {
    const now = new Date();

    // Get max page number and sort order
    const existing = await db.scriptPages.where('editionId').equals(editionId).toArray();
    const maxPageNumber = existing.reduce((max, p) => Math.max(max, p.pageNumber), 0);
    const maxOrder = existing.reduce((max, p) => Math.max(max, p.sortOrder), -1);

    const page: ScriptPage = {
      id: generateId(),
      editionId,
      pageNumber: maxPageNumber + 1,
      title: options?.title,
      goal: options?.goal,
      setting: options?.setting,
      status: 'draft',
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    await db.scriptPages.add(page);
    return page;
  },

  async getById(id: string): Promise<ScriptPage | undefined> {
    return db.scriptPages.get(id);
  },

  async getByEdition(editionId: string): Promise<ScriptPage[]> {
    return db.scriptPages
      .where('editionId')
      .equals(editionId)
      .sortBy('sortOrder');
  },

  async update(
    id: string,
    updates: Partial<Omit<ScriptPage, 'id' | 'editionId' | 'createdAt'>>
  ): Promise<void> {
    await db.scriptPages.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async updateStatus(id: string, status: PageStatus): Promise<void> {
    await this.update(id, { status });
  },

  async updatePageInfo(
    id: string,
    info: Pick<Partial<ScriptPage>, 'title' | 'goal' | 'setting' | 'timeOfDay' | 'mood' | 'notes'>
  ): Promise<void> {
    await this.update(id, info);
  },

  async reorder(id: string, newOrder: number): Promise<void> {
    await this.update(id, { sortOrder: newOrder });
  },

  async renumber(editionId: string): Promise<void> {
    const pages = await this.getByEdition(editionId);
    for (let i = 0; i < pages.length; i++) {
      await this.update(pages[i].id, { pageNumber: i + 1, sortOrder: i });
    }
  },

  async delete(id: string): Promise<void> {
    // Delete all panels in the page
    await db.panels.where('pageId').equals(id).delete();
    await db.scriptPages.delete(id);
  },

  async duplicate(id: string): Promise<ScriptPage | undefined> {
    const original = await this.getById(id);
    if (!original) return undefined;

    const now = new Date();
    const existing = await db.scriptPages.where('editionId').equals(original.editionId).toArray();
    const maxPageNumber = existing.reduce((max, p) => Math.max(max, p.pageNumber), 0);
    const maxOrder = existing.reduce((max, p) => Math.max(max, p.sortOrder), -1);

    const duplicate: ScriptPage = {
      ...original,
      id: generateId(),
      pageNumber: maxPageNumber + 1,
      status: 'draft',
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    await db.scriptPages.add(duplicate);

    // Duplicate panels
    const panels = await db.panels.where('pageId').equals(id).toArray();
    for (const panel of panels) {
      await db.panels.add({
        ...panel,
        id: generateId(),
        pageId: duplicate.id,
        createdAt: now,
        updatedAt: now,
      });
    }

    return duplicate;
  },

  async getPanelCount(pageId: string): Promise<number> {
    return db.panels.where('pageId').equals(pageId).count();
  },

  async getNextPage(id: string): Promise<ScriptPage | undefined> {
    const current = await this.getById(id);
    if (!current) return undefined;

    const pages = await this.getByEdition(current.editionId);
    const currentIndex = pages.findIndex(p => p.id === id);
    return pages[currentIndex + 1];
  },

  async getPreviousPage(id: string): Promise<ScriptPage | undefined> {
    const current = await this.getById(id);
    if (!current) return undefined;

    const pages = await this.getByEdition(current.editionId);
    const currentIndex = pages.findIndex(p => p.id === id);
    return currentIndex > 0 ? pages[currentIndex - 1] : undefined;
  },
};
