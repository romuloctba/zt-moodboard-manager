import { create } from 'zustand';
import type { Project, Character } from '@/types';
import { projectRepository, characterRepository } from '@/lib/db/repositories';

interface ProjectState {
  // Data
  projects: Project[];
  currentProject: Project | null;
  characters: Character[];
  currentCharacter: Character | null;

  // Loading states
  isLoading: boolean;

  // Actions - Projects
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  selectProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Actions - Characters
  loadCharacters: (projectId: string) => Promise<void>;
  createCharacter: (name: string) => Promise<Character | null>;
  selectCharacter: (id: string) => Promise<void>;
  renameCharacter: (id: string, name: string) => Promise<void>;
  deleteCharacter: (id: string) => Promise<void>;

  // Reset
  clearCurrentProject: () => void;
  clearCurrentCharacter: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // Initial state
  projects: [],
  currentProject: null,
  characters: [],
  currentCharacter: null,
  isLoading: false,

  // Project actions
  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await projectRepository.getAll();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ isLoading: false });
    }
  },

  createProject: async (name: string, description?: string) => {
    const project = await projectRepository.create(name, description);
    set(state => ({ projects: [project, ...state.projects] }));
    return project;
  },

  selectProject: async (id: string) => {
    const project = await projectRepository.getById(id);
    if (project) {
      set({ currentProject: project, currentCharacter: null });
      await get().loadCharacters(id);
    }
  },

  renameProject: async (id: string, name: string) => {
    await projectRepository.rename(id, name);
    set(state => ({
      projects: state.projects.map(p =>
        p.id === id ? { ...p, name, updatedAt: new Date() } : p
      ),
      currentProject: state.currentProject?.id === id
        ? { ...state.currentProject, name, updatedAt: new Date() }
        : state.currentProject,
    }));
  },

  archiveProject: async (id: string) => {
    await projectRepository.archive(id);
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  deleteProject: async (id: string) => {
    await projectRepository.delete(id);
    set(state => ({
      projects: state.projects.filter(p => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
      characters: state.currentProject?.id === id ? [] : state.characters,
    }));
  },

  // Character actions
  loadCharacters: async (projectId: string) => {
    const characters = await characterRepository.getByProject(projectId);
    set({ characters });
  },

  createCharacter: async (name: string) => {
    const { currentProject } = get();
    if (!currentProject) return null;

    const character = await characterRepository.create(currentProject.id, name);
    set(state => ({ characters: [...state.characters, character] }));
    return character;
  },

  selectCharacter: async (id: string) => {
    const character = await characterRepository.getById(id);
    set({ currentCharacter: character || null });
  },

  renameCharacter: async (id: string, name: string) => {
    await characterRepository.rename(id, name);
    set(state => ({
      characters: state.characters.map(c =>
        c.id === id ? { ...c, name, updatedAt: new Date() } : c
      ),
      currentCharacter: state.currentCharacter?.id === id
        ? { ...state.currentCharacter, name, updatedAt: new Date() }
        : state.currentCharacter,
    }));
  },

  deleteCharacter: async (id: string) => {
    await characterRepository.delete(id);
    set(state => ({
      characters: state.characters.filter(c => c.id !== id),
      currentCharacter: state.currentCharacter?.id === id ? null : state.currentCharacter,
    }));
  },

  // Reset
  clearCurrentProject: () => {
    set({ currentProject: null, characters: [], currentCharacter: null });
  },

  clearCurrentCharacter: () => {
    set({ currentCharacter: null });
  },
}));
