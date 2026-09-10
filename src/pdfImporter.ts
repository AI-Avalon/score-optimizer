import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.js?url';
import type { ScorePage } from './types';
import { genId } from './store/useScoreStore';

/** pdf.jsのワーカーを設定 */
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * PDFファイルを300DPIで読み込み、ScorePage配列に変換する。
 * 各ページ処理後に即座にcanvasメモリを解放する。
 *
 * @param file - ユーザーが選択したPDFファイル
 * @param onProgress - 進捗コールバック（0-100）
 * @returns ScorePage配列
 */
export const importPdf = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<ScorePage[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pages: ScorePage[] = [];

  for (let i = 1; i <= numPages; i++) {
    const pdfPage = await pdf.getPage(i);
    /** PDF座標系は72DPI。300DPIでレンダリングするためscale=300/72 */
    const scale = 300 / 72;
    const viewport = pdfPage.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;

      const imageUrl = canvas.toDataURL('image/png');
      const isSpread = viewport.width > viewport.height;

      pages.push({
        id: genId(),
        imageUrl,
        originalWidth: viewport.width,
        originalHeight: viewport.height,
        isSpread,
        skipSplit: false,
        isBlank: false,
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
    }

    // メモリ即時解放
    canvas.width = 0;
    canvas.height = 0;

    // 進捗報告
    if (onProgress) {
      onProgress(Math.round((i / numPages) * 100));
    }
  }

  return pages;
};
