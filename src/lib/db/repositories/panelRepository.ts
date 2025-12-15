import { db, generateId } from '../database';
import type { Panel, PanelDialogue, DialogueType } from '@/types';

export const panelRepository = {
  async create(
    pageId: string,
    options?: Partial<Pick<Panel, 'description' | 'cameraAngle'>>
  ): Promise<Panel> {
    const now = new Date();

    // Get max panel number and sort order
    const existing = await db.panels.where('pageId').equals(pageId).toArray();
    const maxPanelNumber = existing.reduce((max, p) => Math.max(max, p.panelNumber), 0);
    const maxOrder = existing.reduce((max, p) => Math.max(max, p.sortOrder), -1);

    const panel: Panel = {
      id: generateId(),
      pageId,
      panelNumber: maxPanelNumber + 1,
      description: options?.description,
      cameraAngle: options?.cameraAngle,
      dialogues: [],
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    await db.panels.add(panel);
    return panel;
  },

  async getById(id: string): Promise<Panel | undefined> {
    return db.panels.get(id);
  },

  async getByPage(pageId: string): Promise<Panel[]> {
    return db.panels
      .where('pageId')
      .equals(pageId)
      .sortBy('sortOrder');
  },

  async update(
    id: string,
    updates: Partial<Omit<Panel, 'id' | 'pageId' | 'createdAt'>>
  ): Promise<void> {
    await db.panels.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async updateDescription(id: string, description: string): Promise<void> {
    await this.update(id, { description });
  },

  async updatePanelInfo(
    id: string,
    info: Pick<Partial<Panel>, 'description' | 'cameraAngle' | 'characters' | 'notes'>
  ): Promise<void> {
    await this.update(id, info);
  },

  // Dialogue management
  async addDialogue(
    panelId: string,
    dialogue: Omit<PanelDialogue, 'id' | 'sortOrder'>
  ): Promise<PanelDialogue> {
    const panel = await this.getById(panelId);
    if (!panel) throw new Error('Panel not found');

    const maxOrder = panel.dialogues.reduce((max, d) => Math.max(max, d.sortOrder), -1);

    const newDialogue: PanelDialogue = {
      ...dialogue,
      id: generateId(),
      sortOrder: maxOrder + 1,
    };

    await this.update(panelId, {
      dialogues: [...panel.dialogues, newDialogue],
    });

    return newDialogue;
  },

  async updateDialogue(
    panelId: string,
    dialogueId: string,
    updates: Partial<Omit<PanelDialogue, 'id'>>
  ): Promise<void> {
    const panel = await this.getById(panelId);
    if (!panel) return;

    const dialogues = panel.dialogues.map(d =>
      d.id === dialogueId ? { ...d, ...updates } : d
    );

    await this.update(panelId, { dialogues });
  },

  async removeDialogue(panelId: string, dialogueId: string): Promise<void> {
    const panel = await this.getById(panelId);
    if (!panel) return;

    await this.update(panelId, {
      dialogues: panel.dialogues.filter(d => d.id !== dialogueId),
    });
  },

  async reorderDialogues(panelId: string, dialogueIds: string[]): Promise<void> {
    const panel = await this.getById(panelId);
    if (!panel) return;

    const reorderedDialogues = dialogueIds.map((id, index) => {
      const dialogue = panel.dialogues.find(d => d.id === id);
      return dialogue ? { ...dialogue, sortOrder: index } : null;
    }).filter(Boolean) as PanelDialogue[];

    await this.update(panelId, { dialogues: reorderedDialogues });
  },

  async reorder(id: string, newOrder: number): Promise<void> {
    await this.update(id, { sortOrder: newOrder });
  },

  async renumber(pageId: string): Promise<void> {
    const panels = await this.getByPage(pageId);
    for (let i = 0; i < panels.length; i++) {
      await this.update(panels[i].id, { panelNumber: i + 1, sortOrder: i });
    }
  },

  async delete(id: string): Promise<void> {
    await db.panels.delete(id);
  },

  async duplicate(id: string): Promise<Panel | undefined> {
    const original = await this.getById(id);
    if (!original) return undefined;

    const now = new Date();
    const existing = await db.panels.where('pageId').equals(original.pageId).toArray();
    const maxPanelNumber = existing.reduce((max, p) => Math.max(max, p.panelNumber), 0);
    const maxOrder = existing.reduce((max, p) => Math.max(max, p.sortOrder), -1);

    const duplicate: Panel = {
      ...original,
      id: generateId(),
      panelNumber: maxPanelNumber + 1,
      sortOrder: maxOrder + 1,
      dialogues: original.dialogues.map(d => ({ ...d, id: generateId() })),
      createdAt: now,
      updatedAt: now,
    };

    await db.panels.add(duplicate);
    return duplicate;
  },

  // Helper to create a dialogue with common defaults
  createDialogueObject(
    characterName: string,
    text: string,
    type: DialogueType = 'speech',
    characterId?: string,
    direction?: string
  ): Omit<PanelDialogue, 'id' | 'sortOrder'> {
    return {
      characterId,
      characterName,
      type,
      text,
      direction,
    };
  },
};
