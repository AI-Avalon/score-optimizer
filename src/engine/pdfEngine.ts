import { PDFDocument } from 'pdf-lib';
import type { ScorePage, PaperPreset, ExportConfig, GlobalConfig } from '../types';
import { renderPage } from './index';

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

  const pdfDoc = await PDFDocument.create();
  const scale = 300 / 72;

  /** 出力ページ展開: 見開きは左右に分割 */
  interface OutputEntry {
    page: ScorePage;
    side: 'left' | 'right' | 'single';
  }
  const outputEntries: OutputEntry[] = [];
  for (const page of pages) {
    if (page.isBlank) {
      outputEntries.push({ page, side: 'single' });
    } else if (page.pageType === 'spread') {
      outputEntries.push({ page, side: 'left' });
      outputEntries.push({ page, side: 'right' });
    } else {
      outputEntries.push({ page, side: 'single' });
    }
  }

  for (let i = 0; i < outputEntries.length; i++) {
    const { page, side } = outputEntries[i];

    const canvas = await renderPage(
      page,
      preset,
      side,
      scale,
      globalConfig.margins,
      globalConfig.accordionBindingMode,
      i // pageIndex 
    );

    // ページ番号再付与
    if (exportConfig.pageNumberStart > 0) {
      const pageNum = exportConfig.pageNumberStart + i;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const fontSize = exportConfig.pageNumberSizePt * scale;
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

    const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const base64Data = imgDataUrl.split(',')[1];
    const img = await pdfDoc.embedJpg(base64Data);

    const widthPt = (preset.widthMm / 25.4) * 72;
    const heightPt = (preset.heightMm / 25.4) * 72;
    
    const pdfPage = pdfDoc.addPage([widthPt, heightPt]);

    // pdf-lib's drawImage origin (0,0) is bottom-left. 
    // To fill the page, we just set width and height and draw at 0,0.
    pdfPage.drawImage(img, {
      x: 0,
      y: 0,
      width: widthPt,
      height: heightPt,
    });

    // メモリ即時解放
    canvas.width = 0;
    canvas.height = 0;

    if (onProgress) {
      onProgress(Math.round(((i + 1) / outputEntries.length) * 100));
    }
  }

  const pdfBytes = await pdfDoc.save();
  const filename = resolveFilename(exportConfig, preset);
  
  // ブラウザでダウンロード
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
