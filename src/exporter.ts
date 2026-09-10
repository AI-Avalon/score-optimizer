// @ts-nocheck
import type { ExportConfig, GlobalConfig, PaperPreset, ScorePage } from './types';
import { exportToPdfPdfLib } from './engine/pdfEngine';

export const exportToPdf = async (
  pages: ScorePage[],
  preset: PaperPreset,
  exportConfig: ExportConfig,
  globalConfig: GlobalConfig,
  onProgress: (progress: number) => void
) => {
  await exportToPdfPdfLib(pages, preset, exportConfig, globalConfig, onProgress);
};
