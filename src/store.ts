import { create } from 'zustand';
import { Page, Preset, PRESETS } from './types';

interface StoreState {
  pages: Page[];
  selectedPreset: Preset;
  isMobile: boolean;
  addPage: (page: Page) => void;
  updatePage: (id: string, partial: Partial<Page>) => void;
  removePage: (id: string) => void;
  setSelectedPreset: (preset: Preset) => void;
  setIsMobile: (isMobile: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  pages: [],
  selectedPreset: PRESETS[1], // B4 Portrait default
  isMobile: typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  addPage: (page) => set((state) => ({ pages: [...state.pages, page] })),
  updatePage: (id, partial) => set((state) => ({
    pages: state.pages.map(p => p.id === id ? { ...p, ...partial } : p)
  })),
  removePage: (id) => set((state) => ({ pages: state.pages.filter(p => p.id !== id) })),
  setSelectedPreset: (preset) => set({ selectedPreset: preset }),
  setIsMobile: (isMobile) => set({ isMobile }),
}));
