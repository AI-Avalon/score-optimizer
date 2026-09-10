import { create } from 'zustand';
import type { ProcessSettings, PageOverride, PageData } from '../engine/types';
import { importPdf } from '../engine/pdfEngine';
import { exportPdf } from '../engine/exporter';

export const DEFAULT_SETTINGS: ProcessSettings = {
  page_processing_mode: 'spread_split',
  split_offset_percent: 0.0,
  page_order: 'left_to_right',
  black_margin_threshold: 20,
  crop_padding_px: 8,
  use_adaptive_threshold: false,
  fixed_threshold: 170,
  output_color_mode: 'monochrome',
  render_dpi: 320,
  output_dpi: 400,
  body_start_page: 2,
  front_matter_mode: 'single',
  auto_crop_enabled: true,
  manual_trim_left_percent: 0,
  manual_trim_right_percent: 0,
  manual_trim_top_percent: 0,
  manual_trim_bottom_percent: 0,
};

interface ScoreStore {
  pages: PageData[];
  selectedPageId: string | null;
  settings: ProcessSettings;
  pageOverrides: Record<number, PageOverride>;
  isProcessing: boolean;
  progress: number;
  originalFileName: string;
  
  loadPdf: (file: File) => Promise<void>;
  loadTestPdf: () => Promise<void>;
  updateSettings: (partial: Partial<ProcessSettings>) => void;
  savePageOverride: (pageIndex: number) => void;
  removePageOverride: (pageIndex: number) => void;
  exportPdfDocument: () => Promise<void>;
  selectPage: (id: string) => void;
  deletePage: (id: string) => void;
}

export const useStore = create<ScoreStore>((set, get) => ({
  pages: [],
  selectedPageId: null,
  settings: { ...DEFAULT_SETTINGS },
  pageOverrides: {},
  isProcessing: false,
  progress: 0,
  originalFileName: 'output',

  selectPage: (id) => set({ selectedPageId: id }),

  deletePage: (id) => set((state) => {
    const pages = state.pages.filter(p => p.id !== id);
    return { 
      pages, 
      selectedPageId: state.selectedPageId === id ? (pages[0]?.id || null) : state.selectedPageId 
    };
  }),

  loadPdf: async (file) => {
    set({ isProcessing: true, progress: 0, originalFileName: file.name.replace('.pdf', '') });
    const { pages, cancelled } = await importPdf(file, (p) => set({ progress: p }));
    if (!cancelled) {
      set({ pages, selectedPageId: pages[0]?.id || null, pageOverrides: {} });
    }
    set({ isProcessing: false });
  },

  loadTestPdf: async () => {
    set({ isProcessing: true, progress: 0, originalFileName: '見開きテスト' });
    try {
      const res = await fetch('/見開きテスト.pdf');
      const blob = await res.blob();
      const file = new File([blob], '見開きテスト.pdf', { type: 'application/pdf' });
      const { pages, cancelled } = await importPdf(file, (p) => set({ progress: p }));
      if (!cancelled) {
        set({ pages, selectedPageId: pages[0]?.id || null, pageOverrides: {} });
      }
    } catch (err) {
      console.error(err);
    } finally {
      set({ isProcessing: false });
    }
  },

  updateSettings: (partial) => {
    set((state) => ({ settings: { ...state.settings, ...partial } }));
  },

  savePageOverride: (pageIndex) => {
    const { settings, pageOverrides } = get();
    const override: PageOverride = {
      page_processing_mode: settings.page_processing_mode,
      split_offset_percent: settings.split_offset_percent,
      page_order: settings.page_order,
      black_margin_threshold: settings.black_margin_threshold,
      crop_padding_px: settings.crop_padding_px,
      use_adaptive_threshold: settings.use_adaptive_threshold,
      fixed_threshold: settings.fixed_threshold,
      output_color_mode: settings.output_color_mode,
      auto_crop_enabled: settings.auto_crop_enabled,
      manual_trim_left_percent: settings.manual_trim_left_percent,
      manual_trim_right_percent: settings.manual_trim_right_percent,
      manual_trim_top_percent: settings.manual_trim_top_percent,
      manual_trim_bottom_percent: settings.manual_trim_bottom_percent,
    };
    set({ pageOverrides: { ...pageOverrides, [pageIndex]: override } });
  },

  removePageOverride: (pageIndex) => {
    const { pageOverrides } = get();
    const newOverrides = { ...pageOverrides };
    delete newOverrides[pageIndex];
    set({ pageOverrides: newOverrides });
  },

  exportPdfDocument: async () => {
    const { pages, settings, pageOverrides, originalFileName } = get();
    if (pages.length === 0) return;
    
    set({ isProcessing: true, progress: 0 });
    try {
      const pdfBytes = await exportPdf(pages, settings, pageOverrides, (p) => set({ progress: p }));
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${originalFileName}_optimized.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      set({ isProcessing: false });
    }
  }
}));
