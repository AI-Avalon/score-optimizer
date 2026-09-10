/**
 * Zustand Store — Score Optimizer 2.0 State Management
 *
 * geometry-guard skill: クロップ枠・分割位置は NormalizedCoordinates (0.0–1.0) のみ
 * app.py L920-939 current_settings, L499-521 _effective_settings_for_page 完全移植
 */

import { create } from 'zustand';
import type { NormalizedRect, PageOverride, ProcessSettings, OtsuWorkerResponse } from '../types';
import { DEFAULT_SETTINGS, FULL_PAGE_RECT } from '../types';
import { applyManualTrim } from '../engine/geometry';
import { loadPdfFromUrl, renderPageToImageBitmap } from '../engine/pdfEngine';

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

  // Settings (app.py ProcessSettings 完全網羅)
  settings: ProcessSettings;

  // Page overrides (app.py L274 page_overrides)
  pageOverrides: Record<number, PageOverride>;

  // Crop state (NormalizedCoordinates only — geometry-guard)
  cropRect: NormalizedRect;
  detectedCropRect: NormalizedRect | null;

  // UI state
  zoom: number;
  zoomMode: 'fit' | 'manual';
  isExporting: boolean;
  exportProgress: number;
  isLoading: boolean;
  sidebarOpen: boolean;

  // Worker
  otsuWorker: Worker | null;
  isDetecting: boolean;

  // Actions
  loadTestPdf: () => Promise<void>;
  loadPdfFromFile: (file: File) => Promise<void>;
  setCurrentPage: (page: number) => void;
  updateSettings: (partial: Partial<ProcessSettings>) => void;
  setZoom: (zoom: number) => void;
  setZoomMode: (mode: 'fit' | 'manual') => void;
  setCropRect: (rect: NormalizedRect) => void;
  detectBlackMargins: () => Promise<void>;
  savePageOverride: () => void;
  removePageOverride: () => void;
  getEffectiveSettings: (pageIndex: number) => ProcessSettings;
  getEffectiveCropRect: () => NormalizedRect;
  exportPdf: () => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  cleanup: () => void;
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
  settings: { ...DEFAULT_SETTINGS },
  pageOverrides: {},
  cropRect: { ...FULL_PAGE_RECT },
  detectedCropRect: null,
  zoom: 1,
  zoomMode: 'fit',
  isExporting: false,
  exportProgress: 0,
  isLoading: false,
  sidebarOpen: true,
  otsuWorker: null,
  isDetecting: false,

  // ── loadTestPdf: /見開きテスト.pdf を読み込み ──────────────────

  loadTestPdf: async () => {
    const state = get();
    if (state.isLoading) return;

    // 既存ドキュメント破棄
    if (state.pdfDoc) {
      await state.pdfDoc.destroy();
    }

    set({ isLoading: true, pdfDoc: null, totalPages: 0, currentPage: 0 });

    try {
      const doc = await loadPdfFromUrl('/見開きテスト.pdf') as unknown as PdfDocProxy;
      set({
        pdfDoc: doc,
        totalPages: doc.numPages,
        currentPage: 0,
        pdfFileName: '見開きテスト.pdf',
        isLoading: false,
        detectedCropRect: null,
        cropRect: computeCropRect(get().settings, null),
      });

      // 自動黒枠検出を発火
      get().detectBlackMargins();
    } catch (err) {
      console.error('PDF load failed:', err);
      set({ isLoading: false });
    }
  },

  // ── loadPdfFromFile ────────────────────────────────────────────

  loadPdfFromFile: async (file: File) => {
    const state = get();
    if (state.isLoading) return;

    if (state.pdfDoc) {
      await state.pdfDoc.destroy();
    }

    set({ isLoading: true, pdfDoc: null, totalPages: 0, currentPage: 0 });

    try {
      const buffer = await file.arrayBuffer();
      const { loadPdfFromData } = await import('../engine/pdfEngine');
      const doc = await loadPdfFromData(buffer) as unknown as PdfDocProxy;
      set({
        pdfDoc: doc,
        totalPages: doc.numPages,
        currentPage: 0,
        pdfFileName: file.name,
        isLoading: false,
        detectedCropRect: null,
        cropRect: computeCropRect(get().settings, null),
      });

      get().detectBlackMargins();
    } catch (err) {
      console.error('PDF load failed:', err);
      set({ isLoading: false });
    }
  },

  setCurrentPage: (page: number) => {
    const state = get();
    const clamped = Math.max(0, Math.min(state.totalPages - 1, page));
    set({ currentPage: clamped, detectedCropRect: null });
    // 新ページで自動検出
    if (state.settings.autoCropEnabled) {
      set({ cropRect: computeCropRect(state.settings, null) });
      get().detectBlackMargins();
    }
  },

  updateSettings: (partial: Partial<ProcessSettings>) => {
    const state = get();
    const newSettings = { ...state.settings, ...partial };
    const newCrop = computeCropRect(newSettings, state.detectedCropRect);
    set({ settings: newSettings, cropRect: newCrop });
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)), zoomMode: 'manual' });
  },

  setZoomMode: (mode: 'fit' | 'manual') => {
    set({ zoomMode: mode, zoom: 1 });
  },

  setCropRect: (rect: NormalizedRect) => {
    set({ cropRect: rect });
  },

  // ── 黒枠自動検出 Worker (otsu-worker-tester skill) ──────────────

  detectBlackMargins: async () => {
    const state = get();
    if (!state.pdfDoc || state.isDetecting) return;

    set({ isDetecting: true });

    try {
      const page = await state.pdfDoc.getPage(state.currentPage + 1) as unknown as Parameters<typeof renderPageToImageBitmap>[0];
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
      set({ detectedCropRect: detected, cropRect: newCrop, isDetecting: false });
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

  getEffectiveSettings: (pageIndex: number): ProcessSettings => {
    const state = get();
    const override = state.pageOverrides[pageIndex];
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
    };
  },

  getEffectiveCropRect: (): NormalizedRect => {
    return get().cropRect;
  },

  // ── 300 DPI PDF エクスポート ──────────────────────────────────────

  exportPdf: async () => {
    const state = get();
    if (!state.pdfDoc || state.isExporting) return;

    set({ isExporting: true, exportProgress: 0 });

    try {
      const { exportTo300DpiPdf, downloadSafeBlob } = await import('../engine/pdfEngine');
      const blob = await exportTo300DpiPdf(
        state.pdfDoc as unknown as Parameters<typeof exportTo300DpiPdf>[0],
        {
          cropRect: state.cropRect,
          pageProcessingMode: state.settings.pageProcessingMode,
          splitOffsetPercent: state.settings.splitOffsetPercent,
          pageOrder: state.settings.pageOrder,
          bodyStartPage: state.settings.bodyStartPage,
          frontMatterMode: state.settings.frontMatterMode,
          getEffectiveSettings: (pageIdx: number) => {
            const eff = get().getEffectiveSettings(pageIdx);
            return {
              cropRect: get().cropRect,
              pageProcessingMode: eff.pageProcessingMode,
              splitOffsetPercent: eff.splitOffsetPercent,
              pageOrder: eff.pageOrder,
            };
          },
          onProgress: (current, total) => {
            set({ exportProgress: Math.round((current / total) * 100) });
          },
        },
      );

      downloadSafeBlob(blob, `score_optimized_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      set({ isExporting: false, exportProgress: 0 });
    }
  },

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

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
      otsuWorker: null,
    });
  },
}));
