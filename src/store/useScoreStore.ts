/**
 * Zustand Store — Score Optimizer 2.0 State Management
 *
 * geometry-guard skill: クロップ枠・分割位置は NormalizedCoordinates (0.0–1.0) のみ
 * app.py L920-939 current_settings, L499-521 _effective_settings_for_page 完全移植
 *
 * Phase 1 拡張:
 * - 7種用紙判型 + カスタム
 * - ページ管理 (削除/挿入/回転)
 * - 履歴管理 (Undo/Redo)
 * - プログレスモーダル
 * - 全ページ一括適用 / 初期設定リセット
 */

import { create } from 'zustand';
import type {
  NormalizedRect,
  PageOverride,
  ProcessSettings,
  OtsuWorkerResponse,
  PaperPresetKey,
  PageEntry,
  HistoryAction,
  ProgressInfo,
  RotationDeg,
} from '../types';
import {
  DEFAULT_SETTINGS,
  FULL_PAGE_RECT,
  PAPER_PRESETS,
  convertMmToPt,
} from '../types';
import { applyManualTrim } from '../engine/geometry';
import { renderPageToImageBitmap } from '../engine/pdfEngine';

// ── PDF.js types (avoid direct pdfjs-dist type import for simplicity) ──
interface PdfDocProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  destroy(): Promise<void>;
}
interface PdfPageProxy {
  getViewport(params: { scale: number }): { width: number; height: number };
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void>; cancel(): void };
}

// ── Store State ───────────────────────────────────────────────────────

interface ScoreState {
  // PDF document
  pdfDoc: PdfDocProxy | null;
  totalPages: number;
  currentPage: number;
  pdfFileName: string;

  // 仮想ページ配列 (削除・挿入・回転を管理)
  pages: PageEntry[];

  // 履歴管理 (Undo/Redo)
  history: HistoryAction[];
  historyIndex: number;

  // Settings (app.py ProcessSettings 完全網羅)
  settings: ProcessSettings;

  // 用紙判型
  selectedPaper: PaperPresetKey;
  customPaperMm: { w: number; h: number };
  marginMm: number;

  // Page overrides (app.py L274 page_overrides)
  pageOverrides: Record<number, PageOverride>;

  // Crop state (NormalizedCoordinates only — geometry-guard)
  cropRect: NormalizedRect;
  leftCropRect: NormalizedRect;
  rightCropRect: NormalizedRect;
  detectedCropRect: NormalizedRect | null;

  // UI state
  settingsVersion: number;
  zoom: number;
  pan: { x: number; y: number };
  touchMode: 'scroll' | 'crop';
  zoomMode: 'fit' | 'manual';
  isExporting: boolean;
  exportProgress: number;
  isLoading: boolean;
  sidebarOpen: boolean;
  isHelpOpen: boolean;
  exportDpi: number;
  isAspectRatioLocked: boolean;
  applyToAllNotification: number;

  // プログレス情報
  loadingProgress: ProgressInfo | null;

  // Worker
  otsuWorker: Worker | null;
  isDetecting: boolean;

  // Actions
  loadPdfFromFile: (file: File) => Promise<void>;
  setCurrentPage: (page: number) => void;
  updateEffectiveSettings: (partial: Partial<ProcessSettings>) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setTouchMode: (mode: 'scroll' | 'crop') => void;
  setZoomMode: (mode: 'fit' | 'manual') => void;
  setCropRect: (rect: NormalizedRect) => void;
  setLeftCropRect: (rect: NormalizedRect) => void;
  setRightCropRect: (rect: NormalizedRect) => void;
  detectBlackMargins: () => Promise<void>;
  savePageOverride: () => void;
  removePageOverride: () => void;
  getEffectiveSettings: (pageIndex?: number) => ProcessSettings;
  getEffectiveCropRect: () => NormalizedRect;
  exportPdf: () => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  setIsHelpOpen: (open: boolean) => void;
  setExportDpi: (dpi: number) => void;
  setIsAspectRatioLocked: (locked: boolean) => void;
  setSplitOffsetPercent: (percent: number) => void;
  nudgeCropRect: (dx: number, dy: number) => void;
  cleanup: () => void;

  // 用紙判型アクション
  setSelectedPaper: (key: PaperPresetKey) => void;
  setCustomPaperMm: (w: number, h: number) => void;
  setMarginMm: (mm: number) => void;
  getPaperConfig: () => { widthPt: number; heightPt: number };
  // ページ操作アクション
  deletePage: (index: number) => void;
  undoAction: () => void;
  redoAction: () => void;
  insertBlankPage: (afterIndex: number) => void;
  rotatePage: (index: number, deg: RotationDeg) => void;
  rotateOddPages: (deg: RotationDeg) => void;
  rotateEvenPages: (deg: RotationDeg) => void;
  rotateAllPages: (deg: RotationDeg) => void;

  // 一括操作
  applySettingsToAllPages: () => void;
  applySettingsToRemainingPages: () => void;
  resetToDefaults: () => void;

  // プログレス
  setLoadingProgress: (progress: ProgressInfo | null) => void;

  // アクティブ（削除されていない）ページ数を取得
  getActivePageCount: () => number;
  // アクティブページのインデックスリスト
  getActivePageIndices: () => number[];
}

// ── Helper: compute effective crop rect ───────────────────────────────

function computeCropRect(
  settings: ProcessSettings,
  detectedRect: NormalizedRect | null,
): NormalizedRect {
  const baseRect =
    settings.autoCropEnabled && detectedRect ? detectedRect : FULL_PAGE_RECT;

  return applyManualTrim(
    baseRect,
    settings.manualTrimLeftPercent,
    settings.manualTrimRightPercent,
    settings.manualTrimTopPercent,
    settings.manualTrimBottomPercent,
  );
}

// ── Create Store ──────────────────────────────────────────────────────

export const useScoreStore = create<ScoreState>((set, get) => ({
  pdfDoc: null,
  totalPages: 0,
  currentPage: 0,
  pdfFileName: '',
  pages: [],
  history: [],
  historyIndex: -1,
  settings: { ...DEFAULT_SETTINGS },
  selectedPaper: 'a4_portrait',
  customPaperMm: { w: 210, h: 297 },
  marginMm: 0,
  pageOverrides: {},
  cropRect: { ...FULL_PAGE_RECT },
  leftCropRect: { ...FULL_PAGE_RECT },
  rightCropRect: { ...FULL_PAGE_RECT },
  detectedCropRect: null,
  settingsVersion: 0,
  zoom: 1,
  pan: { x: 0, y: 0 },
  touchMode: 'scroll',
  zoomMode: 'fit',
  isExporting: false,
  exportProgress: 0,
  isLoading: false,
  sidebarOpen: true,
  isHelpOpen: false,
  exportDpi: 300,
  isAspectRatioLocked: true,
  applyToAllNotification: 0,
  loadingProgress: null,
  otsuWorker: null,
  isDetecting: false,

  // ── loadPdfFromFile ────────────────────────────────────────────

  loadPdfFromFile: async (file: File) => {
    const state = get();
    if (state.isLoading) return;

    if (state.pdfDoc) {
      await state.pdfDoc.destroy();
    }

    set({
      isLoading: true,
      pdfDoc: null,
      totalPages: 0,
      currentPage: 0,
      pages: [],
      history: [],
      historyIndex: -1,
      pageOverrides: {},
      loadingProgress: { current: 0, total: 0, message: 'PDF を読み込み中...' },
    });

    try {
      const buffer = await file.arrayBuffer();
      const { loadPdfFromData } = await import('../engine/pdfEngine');
      const doc = await loadPdfFromData(buffer) as unknown as PdfDocProxy;

      // 仮想ページ配列を構築
      const pageEntries: PageEntry[] = Array.from({ length: doc.numPages }, (_, i) => ({
        sourceIndex: i,
        isBlank: false,
        deleted: false,
        rotation: 0 as RotationDeg,
      }));

      set({
        pdfDoc: doc,
        totalPages: doc.numPages,
        currentPage: 0,
        pdfFileName: file.name,
        isLoading: false,
        pages: pageEntries,
        detectedCropRect: null,
        cropRect: computeCropRect(get().settings, null),
        leftCropRect: computeCropRect(get().settings, null),
        rightCropRect: computeCropRect(get().settings, null),
        loadingProgress: null,
      });

      // 自動黒枠検出と最適なDPIの推定
      try {
        const page = await doc.getPage(1) as unknown as { getViewport: (p: { scale: number }) => { width: number } };
        const vp = page.getViewport({ scale: 1 });
        // ざっくり推定 (595pt=A4 に対して 2倍以上なら 600DPI相当、など)
        let estimatedDpi = 300;
        if (vp.width > 2000) estimatedDpi = 600;
        else if (vp.width > 1500) estimatedDpi = 400;
        else if (vp.width < 500) estimatedDpi = 150;
        set({ exportDpi: estimatedDpi });
      } catch (e) { }

      get().detectBlackMargins();
    } catch (err) {
      console.error('PDF load failed:', err);
      set({ isLoading: false, loadingProgress: null });
    }
  },

  setCurrentPage: (page: number) => {
    const state = get();
    const clamped = Math.max(0, Math.min(state.pages.length - 1, page));
    set({ currentPage: clamped, detectedCropRect: null });
    // 新ページで自動検出
    const currentPageEntry = state.pages[clamped];
    if (state.settings.autoCropEnabled && currentPageEntry && !currentPageEntry.isBlank && !currentPageEntry.deleted) {
      const newCrop = computeCropRect(state.settings, null);
      set({ cropRect: newCrop, leftCropRect: newCrop, rightCropRect: newCrop });
      get().detectBlackMargins();
    }
  },

  updateEffectiveSettings: (partial: Partial<ProcessSettings>) => {
    const state = get();
    const override = state.pageOverrides[state.currentPage];

    if (override) {
      const newOverride = { ...override };
      const newGlobalSettings = { ...state.settings };
      let hasOverrideChanges = false;
      let hasGlobalChanges = false;

      const overrideKeys = ['pageProcessingMode', 'splitOffsetPercent', 'pageOrder', 'blackMarginThreshold', 'cropPaddingPx', 'autoCropEnabled', 'manualTrimLeftPercent', 'manualTrimRightPercent', 'manualTrimTopPercent', 'manualTrimBottomPercent', 'useAdaptiveThreshold', 'fixedThreshold', 'outputColorMode', 'independentSplitFrames'];

      for (const [key, value] of Object.entries(partial)) {
        if (overrideKeys.includes(key)) {
          (newOverride as any)[key] = value;
          hasOverrideChanges = true;
        } else {
          (newGlobalSettings as any)[key] = value;
          hasGlobalChanges = true;
        }
      }

      if (hasOverrideChanges) {
        state.pageOverrides[state.currentPage] = newOverride;
        set({ pageOverrides: { ...state.pageOverrides } });
      }

      const effective = get().getEffectiveSettings();
      const newCrop = computeCropRect(effective, state.detectedCropRect);

      if (hasGlobalChanges) {
        set({ settings: newGlobalSettings, cropRect: newCrop, leftCropRect: newCrop, rightCropRect: newCrop, settingsVersion: state.settingsVersion + 1 });
      } else if (hasOverrideChanges) {
        set({ cropRect: newCrop, leftCropRect: newCrop, rightCropRect: newCrop, settingsVersion: state.settingsVersion + 1 });
      }
    } else {
      const newSettings = { ...state.settings, ...partial };
      const newCrop = computeCropRect(newSettings, state.detectedCropRect);
      set({ settings: newSettings, cropRect: newCrop, leftCropRect: newCrop, rightCropRect: newCrop, settingsVersion: state.settingsVersion + 1 });
    }
  },

  setSplitOffsetPercent: (percent: number) => {
    // cropRect を再計算・初期化せずに splitOffsetPercent のみ更新
    get().updateEffectiveSettings({ splitOffsetPercent: percent });
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)), zoomMode: 'manual' });
  },

  setPan: (pan) => {
    set((state) => ({
      pan: typeof pan === 'function' ? pan(state.pan) : pan,
      zoomMode: 'manual'
    }));
  },

  setTouchMode: (mode: 'scroll' | 'crop') => {
    set({ touchMode: mode });
  },

  setZoomMode: (mode: 'fit' | 'manual') => {
    set({ zoomMode: mode, zoom: 1, pan: { x: 0, y: 0 } });
  },

  setCropRect: (rect: NormalizedRect) => {
    set({ cropRect: rect });
  },

  setLeftCropRect: (rect: NormalizedRect) => {
    set({ leftCropRect: rect });
  },

  setRightCropRect: (rect: NormalizedRect) => {
    set({ rightCropRect: rect });
  },

  nudgeCropRect: (dx: number, dy: number) => {
    const state = get();
    // Decide which crop rect to update based on settings or just update cropRect.
    // Assuming single main frame for mobile.
    let newRect = { ...state.cropRect };
    newRect.x = Math.max(0, Math.min(1 - newRect.width, newRect.x + dx));
    newRect.y = Math.max(0, Math.min(1 - newRect.height, newRect.y + dy));
    set({ cropRect: newRect, leftCropRect: newRect, rightCropRect: newRect });
  },

  // ── 黒枠自動検出 Worker (otsu-worker-tester skill) ──────────────

  detectBlackMargins: async () => {
    const state = get();
    if (!state.pdfDoc || state.isDetecting) return;

    // 現在ページが白紙 or 削除済みならスキップ
    const pageEntry = state.pages[state.currentPage];
    if (!pageEntry || pageEntry.isBlank || pageEntry.deleted) return;

    set({ isDetecting: true });

    try {
      const page = await state.pdfDoc.getPage(pageEntry.sourceIndex + 1) as unknown as Parameters<typeof renderPageToImageBitmap>[0];
      const bitmap = await renderPageToImageBitmap(page, 1200);

      // Worker 初期化 (lazy)
      let worker = state.otsuWorker;
      if (!worker) {
        worker = new Worker(
          new URL('../workers/otsu.worker.ts', import.meta.url),
          { type: 'module' },
        );
        set({ otsuWorker: worker });
      }

      // Worker へ Transferable 送信
      const response = await new Promise<OtsuWorkerResponse>((resolve) => {
        worker!.onmessage = (e: MessageEvent<OtsuWorkerResponse>) => {
          resolve(e.data);
        };
        worker!.postMessage(
          {
            imageBitmap: bitmap,
            blackMarginThreshold: state.settings.blackMarginThreshold,
            cropPaddingPx: state.settings.cropPaddingPx,
          },
          [bitmap],
        );
      });

      const currentState = get();
      const detected = response.cropRect;
      const newCrop = computeCropRect(currentState.settings, detected);
      set({ detectedCropRect: detected, cropRect: newCrop, leftCropRect: newCrop, rightCropRect: newCrop, isDetecting: false });
    } catch (err) {
      console.error('Auto-detect failed:', err);
      set({ isDetecting: false });
    }
  },

  // ── ページ個別設定 (app.py L412-448) ───────────────────────────

  savePageOverride: () => {
    const state = get();
    const s = state.settings;
    const override: PageOverride = {
      pageProcessingMode: s.pageProcessingMode,
      splitOffsetPercent: s.splitOffsetPercent,
      pageOrder: s.pageOrder,
      blackMarginThreshold: s.blackMarginThreshold,
      cropPaddingPx: s.cropPaddingPx,
      autoCropEnabled: s.autoCropEnabled,
      manualTrimLeftPercent: s.manualTrimLeftPercent,
      manualTrimRightPercent: s.manualTrimRightPercent,
      manualTrimTopPercent: s.manualTrimTopPercent,
      manualTrimBottomPercent: s.manualTrimBottomPercent,
      useAdaptiveThreshold: s.useAdaptiveThreshold,
      fixedThreshold: s.fixedThreshold,
      outputColorMode: s.outputColorMode,
      independentSplitFrames: s.independentSplitFrames,
    };
    set({
      pageOverrides: { ...state.pageOverrides, [state.currentPage]: override },
    });
  },

  removePageOverride: () => {
    const state = get();
    const newOverrides = { ...state.pageOverrides };
    delete newOverrides[state.currentPage];
    set({ pageOverrides: newOverrides });
  },

  // ── app.py L499-521 _effective_settings_for_page 完全移植 ──────

  getEffectiveSettings: (pageIndex?: number): ProcessSettings => {
    const state = get();
    const idx = pageIndex ?? state.currentPage;
    const override = state.pageOverrides[idx];
    if (!override) return state.settings;

    return {
      ...state.settings,
      pageProcessingMode: override.pageProcessingMode,
      splitOffsetPercent: override.splitOffsetPercent,
      pageOrder: override.pageOrder,
      blackMarginThreshold: override.blackMarginThreshold,
      cropPaddingPx: override.cropPaddingPx,
      autoCropEnabled: override.autoCropEnabled,
      manualTrimLeftPercent: override.manualTrimLeftPercent,
      manualTrimRightPercent: override.manualTrimRightPercent,
      manualTrimTopPercent: override.manualTrimTopPercent,
      manualTrimBottomPercent: override.manualTrimBottomPercent,
      useAdaptiveThreshold: override.useAdaptiveThreshold,
      fixedThreshold: override.fixedThreshold,
      outputColorMode: override.outputColorMode,
      independentSplitFrames: override.independentSplitFrames,
    };
  },

  getEffectiveCropRect: (): NormalizedRect => {
    return get().cropRect;
  },

  // ── 用紙判型アクション ──────────────────────────────────────────

  setSelectedPaper: (key: PaperPresetKey) => {
    set({ selectedPaper: key });
  },

  setCustomPaperMm: (w: number, h: number) => {
    set({ customPaperMm: { w, h } });
  },

  setMarginMm: (mm: number) => {
    set({ marginMm: Math.max(0, mm) });
  },

  getPaperConfig: () => {
    const state = get();
    if (state.selectedPaper === 'custom') {
      return {
        widthPt: convertMmToPt(state.customPaperMm.w),
        heightPt: convertMmToPt(state.customPaperMm.h),
      };
    }
    const preset = PAPER_PRESETS[state.selectedPaper];
    return { widthPt: preset.widthPt, heightPt: preset.heightPt };
  },

  // ── ページ操作アクション ────────────────────────────────────────

  deletePage: (index: number) => {
    const state = get();
    const newPages = [...state.pages];
    if (index < 0 || index >= newPages.length) return;
    if (newPages[index].deleted) return;

    newPages[index] = { ...newPages[index], deleted: true };

    // 履歴に追加 (Redo を破棄)
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ type: 'delete', pageIndex: index });

    set({
      pages: newPages,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undoAction: () => {
    const state = get();
    if (state.historyIndex < 0) return;

    const action = state.history[state.historyIndex];
    const newPages = [...state.pages];

    switch (action.type) {
      case 'delete':
        // 削除を取消: ページを復活
        newPages[action.pageIndex] = { ...newPages[action.pageIndex], deleted: false };
        break;
      case 'insertBlank':
        // 白紙挿入を取消: 白紙を削除
        newPages.splice(action.pageIndex, 1);
        break;
      case 'rotate': {
        // 回転を取消: 前の回転に戻す
        newPages[action.pageIndex] = { ...newPages[action.pageIndex], rotation: action.prevRotation };
        break;
      }
      case 'restore':
        // 復活を取消: 再削除
        newPages[action.pageIndex] = { ...newPages[action.pageIndex], deleted: true };
        break;
      case 'removeBlank':
        // 白紙削除を取消: 白紙を再挿入
        newPages.splice(action.pageIndex, 0, {
          sourceIndex: -1,
          isBlank: true,
          deleted: false,
          rotation: 0,
        });
        break;
    }

    // currentPageの補正
    let newCurrentPage = state.currentPage;
    if (newCurrentPage >= newPages.length) {
      newCurrentPage = Math.max(0, newPages.length - 1);
    }

    set({
      pages: newPages,
      historyIndex: state.historyIndex - 1,
      currentPage: newCurrentPage,
    });
  },

  redoAction: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;

    const action = state.history[state.historyIndex + 1];
    const newPages = [...state.pages];

    switch (action.type) {
      case 'delete':
        newPages[action.pageIndex] = { ...newPages[action.pageIndex], deleted: true };
        break;
      case 'insertBlank':
        newPages.splice(action.pageIndex, 0, {
          sourceIndex: -1,
          isBlank: true,
          deleted: false,
          rotation: 0,
        });
        break;
      case 'rotate':
        newPages[action.pageIndex] = { ...newPages[action.pageIndex], rotation: action.newRotation };
        break;
      case 'restore':
        newPages[action.pageIndex] = { ...newPages[action.pageIndex], deleted: false };
        break;
      case 'removeBlank':
        newPages.splice(action.pageIndex, 1);
        break;
    }

    let newCurrentPage = state.currentPage;
    if (newCurrentPage >= newPages.length) {
      newCurrentPage = Math.max(0, newPages.length - 1);
    }

    set({
      pages: newPages,
      historyIndex: state.historyIndex + 1,
      currentPage: newCurrentPage,
    });
  },

  insertBlankPage: (afterIndex: number) => {
    const state = get();
    const insertIndex = afterIndex + 1;
    const newPages = [...state.pages];

    const blankEntry: PageEntry = {
      sourceIndex: -1,
      isBlank: true,
      deleted: false,
      rotation: 0,
    };
    newPages.splice(insertIndex, 0, blankEntry);

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ type: 'insertBlank', pageIndex: insertIndex });

    set({
      pages: newPages,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  rotatePage: (index: number, deg: RotationDeg) => {
    const state = get();
    const newPages = [...state.pages];
    if (index < 0 || index >= newPages.length) return;

    const prevRotation = newPages[index].rotation;
    const newRotation = ((prevRotation + deg) % 360) as RotationDeg;
    newPages[index] = { ...newPages[index], rotation: newRotation };

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ type: 'rotate', pageIndex: index, prevRotation, newRotation });

    set({
      pages: newPages,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  rotateOddPages: (deg: RotationDeg) => {
    const state = get();
    const newPages = [...state.pages];
    for (let i = 0; i < newPages.length; i++) {
      // 奇数ページ (1-based: 1, 3, 5, ...) → 0-based: 0, 2, 4, ...
      if (i % 2 === 0 && !newPages[i].deleted) {
        newPages[i] = { ...newPages[i], rotation: ((newPages[i].rotation + deg) % 360) as RotationDeg };
      }
    }
    set({ pages: newPages });
  },

  rotateEvenPages: (deg: RotationDeg) => {
    const state = get();
    const newPages = [...state.pages];
    for (let i = 0; i < newPages.length; i++) {
      // 偶数ページ (1-based: 2, 4, 6, ...) → 0-based: 1, 3, 5, ...
      if (i % 2 === 1 && !newPages[i].deleted) {
        newPages[i] = { ...newPages[i], rotation: ((newPages[i].rotation + deg) % 360) as RotationDeg };
      }
    }
    set({ pages: newPages });
  },

  rotateAllPages: (deg: RotationDeg) => {
    const state = get();
    const newPages = state.pages.map((p) =>
      p.deleted ? p : { ...p, rotation: ((p.rotation + deg) % 360) as RotationDeg },
    );
    set({ pages: newPages });
  },

  // ── 一括操作 ───────────────────────────────────────────────────

  applySettingsToAllPages: () => {
    const state = get();
    const effective = get().getEffectiveSettings();

    // 全ページの個別オーバーライドを破棄して、ドキュメント共通設定として適用する
    set({
      settings: { ...effective },
      pageOverrides: {},
      applyToAllNotification: Date.now(),
      settingsVersion: state.settingsVersion + 1,
    });
  },

  applySettingsToRemainingPages: () => {
    const state = get();
    const effective = get().getEffectiveSettings();

    // 現在のページの設定を、現在のページ以降のすべてのページに個別オーバーライドとして適用する
    const newOverrides = { ...state.pageOverrides };
    for (let i = state.currentPage; i < state.pages.length; i++) {
      if (!state.pages[i].deleted) {
        newOverrides[i] = {
          pageProcessingMode: effective.pageProcessingMode,
          splitOffsetPercent: effective.splitOffsetPercent,
          pageOrder: effective.pageOrder,
          blackMarginThreshold: effective.blackMarginThreshold,
          cropPaddingPx: effective.cropPaddingPx,
          autoCropEnabled: effective.autoCropEnabled,
          manualTrimLeftPercent: effective.manualTrimLeftPercent,
          manualTrimRightPercent: effective.manualTrimRightPercent,
          manualTrimTopPercent: effective.manualTrimTopPercent,
          manualTrimBottomPercent: effective.manualTrimBottomPercent,
          useAdaptiveThreshold: effective.useAdaptiveThreshold,
          fixedThreshold: effective.fixedThreshold,
          outputColorMode: effective.outputColorMode,
          independentSplitFrames: effective.independentSplitFrames,
        };
      }
    }

    set({
      pageOverrides: newOverrides,
      applyToAllNotification: Date.now(),
      settingsVersion: state.settingsVersion + 1,
    });
  },

  resetToDefaults: () => {
    set({
      settings: { ...DEFAULT_SETTINGS },
      pageOverrides: {},
      cropRect: { ...FULL_PAGE_RECT },
      leftCropRect: { ...FULL_PAGE_RECT },
      rightCropRect: { ...FULL_PAGE_RECT },
      detectedCropRect: null,
      settingsVersion: get().settingsVersion + 1,
    });
  },

  // ── 300 DPI PDF エクスポート ──────────────────────────────────────

  exportPdf: async () => {
    const state = get();
    if (!state.pdfDoc || state.isExporting) return;

    set({
      isExporting: true,
      exportProgress: 0,
      loadingProgress: { current: 0, total: state.pages.length, message: `${state.exportDpi} DPI PDF 書き出し準備中...` },
    });

    try {
      const { exportToDpiPdf, downloadSafeBlob } = await import('../engine/pdfEngine');
      const paperConfig = get().getPaperConfig();
      const marginPt = convertMmToPt(get().marginMm);

      const blob = await exportToDpiPdf(
        state.pdfDoc as unknown as any,
        {
          dpi: state.exportDpi,
          cropRect: state.cropRect,
          pageProcessingMode: state.settings.pageProcessingMode,
          splitOffsetPercent: state.settings.splitOffsetPercent,
          pageOrder: state.settings.pageOrder,
          bodyStartPage: state.settings.bodyStartPage,
          frontMatterMode: state.settings.frontMatterMode,
          paperWidthPt: paperConfig.widthPt,
          paperHeightPt: paperConfig.heightPt,
          marginPt,
          pages: get().pages,
          getEffectiveSettings: (pageIdx: number) => {
            const eff = get().getEffectiveSettings(pageIdx);
            return {
              cropRect: get().cropRect,
              pageProcessingMode: eff.pageProcessingMode,
              splitOffsetPercent: eff.splitOffsetPercent,
              pageOrder: eff.pageOrder,
            };
          },
          onProgress: (current, total, message) => {
            set({
              exportProgress: Math.round((current / total) * 100),
              loadingProgress: { current, total, message },
            });
          },
        },
      );

      downloadSafeBlob(blob, `score_optimized_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      set({ isExporting: false, exportProgress: 0, loadingProgress: null });
    }
  },

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  setIsHelpOpen: (open: boolean) => set({ isHelpOpen: open }),
  setExportDpi: (dpi: number) => set({ exportDpi: dpi }),
  setIsAspectRatioLocked: (locked: boolean) => set({ isAspectRatioLocked: locked }),

  // ── プログレス ────────────────────────────────────────────────

  setLoadingProgress: (progress: ProgressInfo | null) => set({ loadingProgress: progress }),

  // ── アクティブページ情報 ──────────────────────────────────────

  getActivePageCount: () => {
    return get().pages.filter((p) => !p.deleted).length;
  },

  getActivePageIndices: () => {
    return get().pages.reduce<number[]>((acc, p, i) => {
      if (!p.deleted) acc.push(i);
      return acc;
    }, []);
  },

  // ── Cleanup (pdf-lifecycle-reviewer) ──────────────────────────────

  cleanup: () => {
    const state = get();
    if (state.pdfDoc) {
      state.pdfDoc.destroy();
    }
    if (state.otsuWorker) {
      state.otsuWorker.terminate();
    }
    set({
      pdfDoc: null,
      totalPages: 0,
      currentPage: 0,
      pages: [],
      otsuWorker: null,
    });
  },
}));
