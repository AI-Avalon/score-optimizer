import { jsPDF } from 'jspdf';
import type { ScorePage, PaperPreset, ExportConfig, GlobalConfig } from './types';
import { renderPage, EXPORT_SCALE } from './engine';

/**
 * ページ一覧を300DPI品質のPDFとして書き出す。
 * 1ページ処理ごとにcanvasメモリを即時解放し、100MB級PDFでもOOMを防止する。
 *
 * @param pages - 全ページデータ
 * @param preset - 出力用紙プリセット
 * @param exportConfig - エクスポート設定
 * @param globalConfig - グローバル設定
 * @param onProgress - 進捗コールバック
 */
export const exportToPdf = async (
  pages: ScorePage[],
  preset: PaperPreset,
  exportConfig: ExportConfig,
  globalConfig: GlobalConfig,
  onProgress?: (percent: number) => void
): Promise<void> => {
  if (pages.length === 0) return;

  const doc = new jsPDF({
    orientation: preset.widthMm > preset.heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [preset.widthMm, preset.heightMm],
  });

  /** 出力ページ展開: 見開きは左右に分割 */
  interface OutputEntry {
    page: ScorePage;
    side: 'left' | 'right' | 'single';
  }
  const outputEntries: OutputEntry[] = [];
  for (const page of pages) {
    if (page.isBlank) {
      outputEntries.push({ page, side: 'single' });
    } else if (page.isSpread && !page.skipSplit) {
      outputEntries.push({ page, side: 'left' });
      outputEntries.push({ page, side: 'right' });
    } else {
      outputEntries.push({ page, side: 'single' });
    }
  }

  for (let i = 0; i < outputEntries.length; i++) {
    if (i > 0) doc.addPage();
    const { page, side } = outputEntries[i];

    const canvas = await renderPage(
      page,
      preset,
      side,
      EXPORT_SCALE,
      globalConfig.margins,
      globalConfig.accordionBindingMode
    );

    // ページ番号再付与
    if (exportConfig.pageNumberStart > 0) {
      const pageNum = exportConfig.pageNumberStart + i;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const fontSize = exportConfig.pageNumberSizePt * (EXPORT_SCALE / 1);
        ctx.fillStyle = '#000000';
        ctx.font = `${fontSize}px serif`;
        const text = String(pageNum);
        const metrics = ctx.measureText(text);
        const x = (canvas.width - metrics.width) / 2;
        const y = exportConfig.pageNumberPosition === 'top'
          ? fontSize + 20
          : canvas.height - 20;
        ctx.fillText(text, x, y);
      }
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, preset.widthMm, preset.heightMm);

    // メモリ即時解放
    canvas.width = 0;
    canvas.height = 0;

    if (onProgress) {
      onProgress(Math.round(((i + 1) / outputEntries.length) * 100));
    }
  }

  // ファイル名生成
  const filename = resolveFilename(exportConfig, preset);
  doc.save(filename);
};

/** エクスポート設定からファイル名を解決 */
const resolveFilename = (config: ExportConfig, preset: PaperPreset): string => {
  const base = config.originalFilename.replace(/\.pdf$/i, '') || 'score';
  switch (config.filenameMode) {
    case 'original':
      return `${base}_optimized.pdf`;
    case 'suffix':
      return `${base}${config.suffix}.pdf`;
    case 'date': {
      const d = new Date();
      const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      return `${base}_${tag}.pdf`;
    }
    case 'custom':
      return config.customFilename.endsWith('.pdf')
        ? config.customFilename
        : `${config.customFilename}.pdf`;
    default:
      return `${base}_${preset.label.split(' ')[0]}.pdf`;
  }
};
