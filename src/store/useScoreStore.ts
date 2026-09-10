// @ts-nocheck

import { create } from 'zustand';
import type {
  ScorePage,
  PaperPreset,
  ViewMode,
  ExportConfig,
  GlobalConfig,
} from '../types';
import { PAPER_PRESETS } from '../types';

interface HistoryEntry {
  pages: ScorePage[];
}

interface StoreState {
  pages: ScorePage[];
  selectedPageId: string | null;
  paperPreset: PaperPreset;
  isMobile: boolean;
  viewMode: ViewMode;
  exportConfig: ExportConfig;
  globalConfig: GlobalConfig;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  isProcessing: boolean;
  progress: number;

  addPage: (page: ScorePage) => void;
  addPages: (pages: ScorePage[]) => void;
  updatePage: (id: string, partial: Partial<ScorePage>) => void;
  removePage: (id: string) => void;
  movePage: (fromIndex: number, toIndex: number) => void;
  insertBlankPage: (atIndex: number) => void;
  selectPage: (id: string | null) => void;
  setPaperPreset: (preset: PaperPreset) => void;
  setIsMobile: (v: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setExportConfig: (partial: Partial<ExportConfig>) => void;
  setGlobalConfig: (partial: Partial<GlobalConfig>) => void;
  setProcessing: (isProcessing: boolean, progress?: number) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  
  deleteCurrentPage: () => void;
  interleavePages: () => void;
  
  // PageOverride handlers
  savePageOverride: (pageId: string) => void;
  removePageOverride: (pageId: string) => void;
}

const genId = (): string => crypto.randomUUID();

const createBlankPage = (): ScorePage => ({
  id: genId(),
  imageUrl: null,
  originalWidth: 0,
  originalHeight: 0,
  isBlank: true,
  whiteoutRects: [],
  stamps: [],
  deskew: null,
  rotation: 0,
});

export { genId, createBlankPage };

export const useStore = create<StoreState>((set, get) => ({
  pages: [],
  selectedPageId: null,
  paperPreset: PAPER_PRESETS[0],
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  viewMode: 'edit',
  exportConfig: {
    filenameMode: 'original',
    customFilename: 'score-optimized',
    originalFilename: '',
    suffix: '_A4',
    pageNumberStart: 0,
    pageNumberSizePt: 10,
    pageNumberPosition: 'bottom',
  },
  globalConfig: {
    accordionBindingMode: false,
    globalStaffScaleLock: false,
    referencePageIndex: 0,
    processSettings: {
      pageProcessingMode: 'spread_split',
      splitOffsetPercent: 0.0,
      pageOrder: 'left_to_right',
      blackMarginThreshold: 20,
      cropPaddingPx: 8,
      autoCropEnabled: true,
      manualTrimLeftPercent: 0,
      manualTrimRightPercent: 0,
      manualTrimTopPercent: 0,
      manualTrimBottomPercent: 0,
      useAdaptiveThreshold: false,
      fixedThreshold: 170,
      outputColorMode: 'monochrome',
      bodyStartPage: 2,
      frontMatterMode: 'single',
    }
  },
  undoStack: [],
  redoStack: [],
  isProcessing: false,
  progress: 0,

  addPage: (page) => {
    const state = get();
    state.pushHistory();
    set({ pages: [...state.pages, page], selectedPageId: page.id });
  },

  addPages: (newPages) => {
    const state = get();
    state.pushHistory();
    set({
      pages: [...state.pages, ...newPages],
      selectedPageId: newPages.length > 0 ? newPages[0].id : state.selectedPageId,
    });
  },

  updatePage: (id, partial) => {
    const state = get();
    state.pushHistory();
    set({
      pages: state.pages.map(p => (p.id === id ? { ...p, ...partial } : p)),
    });
  },

  removePage: (id) => {
    const state = get();
    state.pushHistory();
    const filtered = state.pages.filter(p => p.id !== id);
    set({
      pages: filtered,
      selectedPageId: state.selectedPageId === id
        ? (filtered.length > 0 ? filtered[0].id : null)
        : state.selectedPageId,
    });
  },

  movePage: (fromIndex, toIndex) => {
    const state = get();
    state.pushHistory();
    const arr = [...state.pages];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    set({ pages: arr });
  },

  insertBlankPage: (atIndex) => {
    const state = get();
    state.pushHistory();
    const arr = [...state.pages];
    const blank = createBlankPage();
    arr.splice(atIndex, 0, blank);
    set({ pages: arr, selectedPageId: blank.id });
  },

  selectPage: (id) => set({ selectedPageId: id }),

  setPaperPreset: (preset) => set({ paperPreset: preset }),

  setIsMobile: (v) => set({ isMobile: v }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setExportConfig: (partial) =>
    set((state) => ({ exportConfig: { ...state.exportConfig, ...partial } })),

  setGlobalConfig: (partial) =>
    set((state) => ({ globalConfig: { ...state.globalConfig, ...partial } })),

  setProcessing: (isProcessing, progress) =>
    set({ isProcessing, progress: progress ?? (isProcessing ? 0 : 100) }),

  undo: () => {
    const { undoStack, pages } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, { pages }],
      pages: prev.pages,
    }));
  },

  redo: () => {
    const { redoStack, pages } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, { pages }],
      pages: next.pages,
    }));
  },

  pushHistory: () => {
    const { pages, undoStack } = get();
    const MAX_HISTORY = 30;
    const newStack = [...undoStack, { pages }];
    if (newStack.length > MAX_HISTORY) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  deleteCurrentPage: () => {
    const state = get();
    if (!state.selectedPageId) return;
    state.pushHistory();
    const filtered = state.pages.filter(p => p.id !== state.selectedPageId);
    set({
      pages: filtered,
      selectedPageId: filtered.length > 0 ? filtered[0].id : null,
    });
  },

  interleavePages: () => {
    const state = get();
    state.pushHistory();
    const pages = state.pages;
    const mid = Math.ceil(pages.length / 2);
    const firstHalf = pages.slice(0, mid);
    const secondHalf = pages.slice(mid).reverse();
    
    const newPages: ScorePage[] = [];
    for (let i = 0; i < mid; i++) {
      if (firstHalf[i]) newPages.push(firstHalf[i]);
      if (secondHalf[i]) newPages.push(secondHalf[i]);
    }

    set({ pages: newPages });
  },

  savePageOverride: (pageId) => {
    const state = get();
    const page = state.pages.find(p => p.id === pageId);
    if (!page) return;
    
    state.pushHistory();
    
    // We snapshot the global config as the override settings for this page.
    // That way they can modify it on a per-page basis later.
    const baseSettings = state.globalConfig.processSettings;
    
    set({
      pages: state.pages.map(p => 
        p.id === pageId 
          ? { ...p, overrideSettings: { ...baseSettings } } 
          : p
      )
    });
  },

  removePageOverride: (pageId) => {
    const state = get();
    state.pushHistory();
    set({
      pages: state.pages.map(p => {
        if (p.id === pageId) {
          const { overrideSettings, ...rest } = p;
          return rest;
        }
        return p;
      })
    });
  }
}));
