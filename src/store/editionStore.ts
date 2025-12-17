import { create } from 'zustand';
import type { Edition, ScriptPage, Panel, PanelDialogue, EditionStatus, PageStatus, DialogueType } from '@/types';
import { editionRepository, scriptPageRepository, panelRepository } from '@/lib/db/repositories';
import { triggerGlobalSync } from '@/lib/sync/globalSyncTrigger';
import { syncManifest } from '@/lib/sync/syncManifest';

interface EditionState {
  // Data
  editions: Edition[];
  currentEdition: Edition | null;
  pages: ScriptPage[];
  currentPage: ScriptPage | null;
  panels: Panel[];

  // Loading states
  isLoading: boolean;

  // Actions - Editions
  loadEditions: (projectId: string) => Promise<void>;
  createEdition: (projectId: string, title: string, options?: { issueNumber?: number; volume?: number; synopsis?: string }) => Promise<Edition>;
  selectEdition: (id: string) => Promise<boolean>;
  updateEdition: (id: string, updates: Partial<Edition>) => Promise<void>;
  updateEditionStatus: (id: string, status: EditionStatus) => Promise<void>;
  deleteEdition: (id: string) => Promise<void>;
  duplicateEdition: (id: string, newTitle: string) => Promise<Edition | null>;

  // Actions - Pages
  loadPages: (editionId: string) => Promise<void>;
  createPage: (options?: { title?: string; goal?: string; setting?: string }) => Promise<ScriptPage | null>;
  selectPage: (id: string) => Promise<boolean>;
  updatePage: (id: string, updates: Partial<ScriptPage>) => Promise<void>;
  updatePageStatus: (id: string, status: PageStatus) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  duplicatePage: (id: string) => Promise<ScriptPage | null>;
  reorderPages: (pageIds: string[]) => Promise<void>;

  // Actions - Panels
  loadPanels: (pageId: string) => Promise<void>;
  createPanel: (options?: { description?: string; cameraAngle?: string }) => Promise<Panel | null>;
  updatePanel: (id: string, updates: Partial<Panel>) => Promise<void>;
  deletePanel: (id: string) => Promise<void>;
  duplicatePanel: (id: string) => Promise<Panel | null>;
  reorderPanels: (panelIds: string[]) => Promise<void>;

  // Actions - Dialogues
  addDialogue: (panelId: string, dialogue: { characterName: string; text: string; type?: DialogueType; characterId?: string; direction?: string }) => Promise<PanelDialogue | null>;
  updateDialogue: (panelId: string, dialogueId: string, updates: Partial<PanelDialogue>) => Promise<void>;
  removeDialogue: (panelId: string, dialogueId: string) => Promise<void>;

  // Reset
  clearCurrentEdition: () => void;
  clearCurrentPage: () => void;
  clearAll: () => void;
}

export const useEditionStore = create<EditionState>((set, get) => ({
  // Initial state
  editions: [],
  currentEdition: null,
  pages: [],
  currentPage: null,
  panels: [],
  isLoading: false,

  // Edition actions
  loadEditions: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const editions = await editionRepository.getByProject(projectId);
      set({ editions, isLoading: false });
    } catch (error) {
      console.error('Failed to load editions:', error);
      set({ isLoading: false });
    }
  },

  createEdition: async (projectId: string, title: string, options) => {
    const edition = await editionRepository.create(projectId, title, options);
    set(state => ({ editions: [...state.editions, edition] }));
    triggerGlobalSync();
    return edition;
  },

  selectEdition: async (id: string) => {
    const edition = await editionRepository.getById(id);
    if (edition) {
      set({ currentEdition: edition, currentPage: null, panels: [] });
      await get().loadPages(id);
      return true;
    }
    return false;
  },

  updateEdition: async (id: string, updates: Partial<Edition>) => {
    await editionRepository.update(id, updates);
    set(state => ({
      editions: state.editions.map(e =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date() } : e
      ),
      currentEdition: state.currentEdition?.id === id
        ? { ...state.currentEdition, ...updates, updatedAt: new Date() }
        : state.currentEdition,
    }));
    triggerGlobalSync();
  },

  updateEditionStatus: async (id: string, status: EditionStatus) => {
    await editionRepository.updateStatus(id, status);
    set(state => ({
      editions: state.editions.map(e =>
        e.id === id ? { ...e, status, updatedAt: new Date() } : e
      ),
      currentEdition: state.currentEdition?.id === id
        ? { ...state.currentEdition, status, updatedAt: new Date() }
        : state.currentEdition,
    }));
    triggerGlobalSync();
  },

  deleteEdition: async (id: string) => {
    // Get all pages and panels before deletion to record them for sync
    const pages = await scriptPageRepository.getByEdition(id);
    const panelIds: string[] = [];
    for (const page of pages) {
      const panels = await panelRepository.getByPage(page.id);
      panelIds.push(...panels.map(p => p.id));
    }

    // Delete from database
    await editionRepository.delete(id);

    // Record deletions for sync (order matters: children first)
    for (const panelId of panelIds) {
      await syncManifest.recordDeletion(panelId, 'panel');
    }
    for (const page of pages) {
      await syncManifest.recordDeletion(page.id, 'scriptPage');
    }
    await syncManifest.recordDeletion(id, 'edition');

    set(state => ({
      editions: state.editions.filter(e => e.id !== id),
      currentEdition: state.currentEdition?.id === id ? null : state.currentEdition,
      pages: state.currentEdition?.id === id ? [] : state.pages,
      currentPage: state.currentEdition?.id === id ? null : state.currentPage,
      panels: state.currentEdition?.id === id ? [] : state.panels,
    }));
    triggerGlobalSync();
  },

  duplicateEdition: async (id: string, newTitle: string) => {
    const duplicate = await editionRepository.duplicate(id, newTitle);
    if (duplicate) {
      set(state => ({ editions: [...state.editions, duplicate] }));
      triggerGlobalSync();
    }
    return duplicate ?? null;
  },

  // Page actions
  loadPages: async (editionId: string) => {
    const pages = await scriptPageRepository.getByEdition(editionId);
    set({ pages });
  },

  createPage: async (options) => {
    const { currentEdition } = get();
    if (!currentEdition) return null;

    const page = await scriptPageRepository.create(currentEdition.id, options);
    set(state => ({ pages: [...state.pages, page] }));
    triggerGlobalSync();
    return page;
  },

  selectPage: async (id: string) => {
    const page = await scriptPageRepository.getById(id);
    if (page) {
      set({ currentPage: page });
      await get().loadPanels(id);
      return true;
    }
    return false;
  },

  updatePage: async (id: string, updates: Partial<ScriptPage>) => {
    await scriptPageRepository.update(id, updates);
    set(state => ({
      pages: state.pages.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
      currentPage: state.currentPage?.id === id
        ? { ...state.currentPage, ...updates, updatedAt: new Date() }
        : state.currentPage,
    }));
    triggerGlobalSync();
  },

  updatePageStatus: async (id: string, status: PageStatus) => {
    await scriptPageRepository.updateStatus(id, status);
    set(state => ({
      pages: state.pages.map(p =>
        p.id === id ? { ...p, status, updatedAt: new Date() } : p
      ),
      currentPage: state.currentPage?.id === id
        ? { ...state.currentPage, status, updatedAt: new Date() }
        : state.currentPage,
    }));
    triggerGlobalSync();
  },

  deletePage: async (id: string) => {
    // Get all panels before deletion to record them for sync
    const panels = await panelRepository.getByPage(id);

    await scriptPageRepository.delete(id);

    // Record deletions for sync
    for (const panel of panels) {
      await syncManifest.recordDeletion(panel.id, 'panel');
    }
    await syncManifest.recordDeletion(id, 'scriptPage');

    const { currentEdition } = get();
    if (currentEdition) {
      // Renumber pages after deletion
      await scriptPageRepository.renumber(currentEdition.id);
      const pages = await scriptPageRepository.getByEdition(currentEdition.id);
      set(state => ({
        pages,
        currentPage: state.currentPage?.id === id ? null : state.currentPage,
        panels: state.currentPage?.id === id ? [] : state.panels,
      }));
    }
    triggerGlobalSync();
  },

  duplicatePage: async (id: string) => {
    const duplicate = await scriptPageRepository.duplicate(id);
    if (duplicate) {
      set(state => ({ pages: [...state.pages, duplicate] }));
      triggerGlobalSync();
    }
    return duplicate ?? null;
  },

  reorderPages: async (pageIds: string[]) => {
    const { currentEdition } = get();
    if (!currentEdition) return;

    // Update sortOrder for each page based on new order
    for (let i = 0; i < pageIds.length; i++) {
      await scriptPageRepository.reorder(pageIds[i], i);
    }

    // Renumber to update pageNumber consistently
    await scriptPageRepository.renumber(currentEdition.id);

    // Reload pages to get updated state
    const pages = await scriptPageRepository.getByEdition(currentEdition.id);
    set({ pages });
    triggerGlobalSync();
  },

  // Panel actions
  loadPanels: async (pageId: string) => {
    const panels = await panelRepository.getByPage(pageId);
    set({ panels });
  },

  createPanel: async (options) => {
    const { currentPage } = get();
    if (!currentPage) return null;

    const panel = await panelRepository.create(currentPage.id, options);
    set(state => ({ panels: [...state.panels, panel] }));
    triggerGlobalSync();
    return panel;
  },

  updatePanel: async (id: string, updates: Partial<Panel>) => {
    await panelRepository.update(id, updates);
    set(state => ({
      panels: state.panels.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ),
    }));
    triggerGlobalSync();
  },

  deletePanel: async (id: string) => {
    await panelRepository.delete(id);

    // Record deletion for sync
    await syncManifest.recordDeletion(id, 'panel');

    const { currentPage } = get();
    if (currentPage) {
      await panelRepository.renumber(currentPage.id);
      const panels = await panelRepository.getByPage(currentPage.id);
      set({ panels });
    }
    triggerGlobalSync();
  },

  duplicatePanel: async (id: string) => {
    const duplicate = await panelRepository.duplicate(id);
    if (duplicate) {
      set(state => ({ panels: [...state.panels, duplicate] }));
      triggerGlobalSync();
    }
    return duplicate ?? null;
  },

  reorderPanels: async (panelIds: string[]) => {
    const { currentPage } = get();
    if (!currentPage) return;

    // Update sortOrder for each panel based on new order
    for (let i = 0; i < panelIds.length; i++) {
      await panelRepository.reorder(panelIds[i], i);
    }

    // Renumber to update panelNumber consistently
    await panelRepository.renumber(currentPage.id);

    // Reload panels to get updated state
    const panels = await panelRepository.getByPage(currentPage.id);
    set({ panels });
    triggerGlobalSync();
  },

  // Dialogue actions
  addDialogue: async (panelId: string, dialogue) => {
    try {
      const newDialogue = await panelRepository.addDialogue(panelId, {
        characterId: dialogue.characterId,
        characterName: dialogue.characterName,
        type: dialogue.type ?? 'speech',
        text: dialogue.text,
        direction: dialogue.direction,
      });

      // Refresh panel in state
      const panel = await panelRepository.getById(panelId);
      if (panel) {
        set(state => ({
          panels: state.panels.map(p => p.id === panelId ? panel : p),
        }));
      }
      triggerGlobalSync();
      return newDialogue;
    } catch (error) {
      console.error('Failed to add dialogue:', error);
      return null;
    }
  },

  updateDialogue: async (panelId: string, dialogueId: string, updates: Partial<PanelDialogue>) => {
    await panelRepository.updateDialogue(panelId, dialogueId, updates);
    const panel = await panelRepository.getById(panelId);
    if (panel) {
      set(state => ({
        panels: state.panels.map(p => p.id === panelId ? panel : p),
      }));
    }
    triggerGlobalSync();
  },

  removeDialogue: async (panelId: string, dialogueId: string) => {
    await panelRepository.removeDialogue(panelId, dialogueId);
    const panel = await panelRepository.getById(panelId);
    if (panel) {
      set(state => ({
        panels: state.panels.map(p => p.id === panelId ? panel : p),
      }));
    }
    triggerGlobalSync();
  },

  // Reset actions
  clearCurrentEdition: () => {
    set({ currentEdition: null, pages: [], currentPage: null, panels: [] });
  },

  clearCurrentPage: () => {
    set({ currentPage: null, panels: [] });
  },

  clearAll: () => {
    set({
      editions: [],
      currentEdition: null,
      pages: [],
      currentPage: null,
      panels: [],
      isLoading: false,
    });
  },
}));
