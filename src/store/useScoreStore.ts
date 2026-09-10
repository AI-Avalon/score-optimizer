import { create } from 'zustand';
import type {
  ScorePage,
  PaperPreset,
  ViewMode,
  ExportConfig,
  GlobalConfig,
} from '../types/index';
import { PAPER_PRESETS } from '../types/index';

/** Undo/Redo用の履歴エントリ */
interface HistoryEntry {
  pages: ScorePage[];
}

/** ストア全体の型定義 */
interface StoreState {
  /** ページ一覧 */
  pages: ScorePage[];
  /** 選択中のページID */
  selectedPageId: string | null;
  /** 用紙プリセット */
  paperPreset: PaperPreset;
  /** モバイル判定 */
  isMobile: boolean;
  /** ビューモード */
  viewMode: ViewMode;
  /** エクスポート設定 */
  exportConfig: ExportConfig;
  /** グローバル設定 */
  globalConfig: GlobalConfig;
  /** Undo履歴 */
  undoStack: HistoryEntry[];
  /** Redo履歴 */
  redoStack: HistoryEntry[];
  /** 処理中フラグ */
  isProcessing: boolean;
  /** 処理進捗（0-100） */
  progress: number;

  // --- Actions ---
  /** ページを末尾に追加 */
  addPage: (page: ScorePage) => void;
  /** 複数ページを末尾に追加 */
  addPages: (pages: ScorePage[]) => void;
  /** ページを更新 */
  updatePage: (id: string, partial: Partial<ScorePage>) => void;
  /** ページを削除 */
  removePage: (id: string) => void;
  /** ページ順序を入れ替え */
  movePage: (fromIndex: number, toIndex: number) => void;
  /** 指定位置に白紙ページを挿入 */
  insertBlankPage: (atIndex: number) => void;
  /** ページを選択 */
  selectPage: (id: string | null) => void;
  /** 用紙プリセットを変更 */
  setPaperPreset: (preset: PaperPreset) => void;
  /** モバイル判定を更新 */
  setIsMobile: (v: boolean) => void;
  /** ビューモードを変更 */
  setViewMode: (mode: ViewMode) => void;
  /** エクスポート設定を更新 */
  setExportConfig: (partial: Partial<ExportConfig>) => void;
  /** グローバル設定を更新 */
  setGlobalConfig: (partial: Partial<GlobalConfig>) => void;
  /** 処理状態を更新 */
  setProcessing: (isProcessing: boolean, progress?: number) => void;
  /** Undo */
  undo: () => void;
  /** Redo */
  redo: () => void;
  /** 現在のページ状態を履歴にプッシュ */
  pushHistory: () => void;

  initWizard: (mode: 'all-spread' | 'all-single' | 'cover-then-spread') => void;
  applyGlobalToAll: () => void;
  applyGlobalToOdd: () => void;
  applyGlobalToEven: () => void;
  applyCurrentToAll: (pageId: string) => void;
  applyCurrentToFollowing: (pageId: string) => void;
  rotateCurrentPage: (id: string, deg: 90 | 180 | 270) => void;
  rotateOddPages: (deg: 90 | 180 | 270) => void;
  rotateEvenPages: (deg: 90 | 180 | 270) => void;
  rotateAllPages: (deg: 90 | 180 | 270) => void;
  deleteCurrentPage: () => void;
  interleavePages: () => void;
}

/** 一意IDを生成 */
const genId = (): string => {
  return crypto.randomUUID();
};

/** 白紙ページを生成 */
const createBlankPage = (): ScorePage => ({
  id: genId(),
  imageUrl: null,
  originalWidth: 0,
  originalHeight: 0,
  isBlank: true,
  pageType: 'single',
  subPage: 'single',
  colorMode: 'color',
  binarizeConfig: { threshold: 128, removeBleedThrough: false },
  bidiMargins: { topMm: 5, bottomMm: 5, insideMm: 5, outsideMm: 5 },
  isCustomized: false,
  gutterMaskLeftMm: 0,
  gutterMaskRightMm: 0,
  spineRatio: 0.5,
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
    margins: { topMm: 5, bottomMm: 5, insideMm: 5, outsideMm: 5 },
    bodyStartPage: 2,
    pageOrder: 'L2R',
    frontMatterMode: 'single_fit',
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

  initWizard: (mode) => {
    const state = get();
    state.pushHistory();
    set({
      pages: state.pages.map((p, i) => {
        if (mode === 'all-spread') {
          return { ...p, pageType: 'spread' };
        } else if (mode === 'all-single') {
          return { ...p, pageType: 'single' };
        } else if (mode === 'cover-then-spread') {
          if (i === 0) {
            return { ...p, pageType: 'single' };
          } else {
            return { ...p, pageType: 'spread' };
          }
        }
        return p;
      })
    });
  },

  applyGlobalToAll: () => {
    const state = get();
    state.pushHistory();
    const { margins } = state.globalConfig;
    set({
      pages: state.pages.map(p => ({
        ...p,
        bidiMargins: { ...margins },
        isCustomized: false
      }))
    });
  },

  applyGlobalToOdd: () => {
    const state = get();
    state.pushHistory();
    const { margins } = state.globalConfig;
    set({
      pages: state.pages.map((p, i) => i % 2 === 0 ? { ...p, bidiMargins: { ...margins }, isCustomized: false } : p)
    });
  },

  applyGlobalToEven: () => {
    const state = get();
    state.pushHistory();
    const { margins } = state.globalConfig;
    set({
      pages: state.pages.map((p, i) => i % 2 === 1 ? { ...p, bidiMargins: { ...margins }, isCustomized: false } : p)
    });
  },

  applyCurrentToAll: (pageId) => {
    const state = get();
    state.pushHistory();
    const current = state.pages.find(p => p.id === pageId);
    if (!current) return;
    set({
      pages: state.pages.map(p => ({
        ...p,
        colorMode: current.colorMode,
        binarizeConfig: { ...current.binarizeConfig },
        bidiMargins: { ...current.bidiMargins },
        gutterMaskLeftMm: current.gutterMaskLeftMm,
        gutterMaskRightMm: current.gutterMaskRightMm,
      }))
    });
  },

  applyCurrentToFollowing: (pageId) => {
    const state = get();
    state.pushHistory();
    const currentIndex = state.pages.findIndex(p => p.id === pageId);
    if (currentIndex === -1) return;
    const current = state.pages[currentIndex];
    set({
      pages: state.pages.map((p, i) => i >= currentIndex ? {
        ...p,
        colorMode: current.colorMode,
        binarizeConfig: { ...current.binarizeConfig },
        bidiMargins: { ...current.bidiMargins },
        gutterMaskLeftMm: current.gutterMaskLeftMm,
        gutterMaskRightMm: current.gutterMaskRightMm,
      } : p)
    });
  },

  rotateCurrentPage: (id, deg) => {
    const state = get();
    state.pushHistory();
    set({
      pages: state.pages.map(p => p.id === id ? { ...p, rotation: ((p.rotation + deg) % 360) as 0 | 90 | 180 | 270 } : p)
    });
  },

  rotateOddPages: (deg) => {
    const state = get();
    state.pushHistory();
    set({
      pages: state.pages.map((p, i) => i % 2 === 0 ? { ...p, rotation: ((p.rotation + deg) % 360) as 0 | 90 | 180 | 270 } : p)
    });
  },

  rotateEvenPages: (deg) => {
    const state = get();
    state.pushHistory();
    set({
      pages: state.pages.map((p, i) => i % 2 === 1 ? { ...p, rotation: ((p.rotation + deg) % 360) as 0 | 90 | 180 | 270 } : p)
    });
  },

  rotateAllPages: (deg) => {
    const state = get();
    state.pushHistory();
    set({
      pages: state.pages.map(p => ({ ...p, rotation: ((p.rotation + deg) % 360) as 0 | 90 | 180 | 270 }))
    });
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
}));
