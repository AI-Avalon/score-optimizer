/**
 * PDF Engine — PDF.js ライフサイクル & 300 DPI 用紙判型対応出力パイプライン
 *
 * pdf-lifecycle-reviewer skill:
 *   - renderRequestId で排他制御
 *   - RenderingCancelledException を明示キャッチ&無視
 *   - pdfDoc.destroy() をアンマウント時に実行
 *
 * score-lossless-engine skill:
 *   - 7種用紙判型 (A4, B4, 菊倍判, A3横, A3縦, US Letter, カスタム)
 *   - 0mm マージン（余白なし最大化）、アスペクト比維持センタリング
 *   - canvas.width = 0; canvas.height = 0; でメモリ即時解放
 *   - ページ回転、白紙ページ、削除ページ対応
 */

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import type { NormalizedRect, PageEntry } from '../types';
import { normalizedToSourceRect, splitNormalizedRectIntoTwo, fitNormalizedRectToSingle } from './geometry';
import type { PageOrder, PageProcessingMode } from '../types';

// ── PDF.js Worker 初期化 (pdf-lifecycle rule) ─────────────────────────

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ── Types ─────────────────────────────────────────────────────────────

type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
type PDFPageProxy = Awaited<ReturnType<PDFDocumentProxy['getPage']>>;

// ── Cancel-Safe Page Renderer ─────────────────────────────────────────

export interface PageRenderer {
  render(page: PDFPageProxy, canvas: HTMLCanvasElement, scale: number): Promise<boolean>;
  cancel(): void;
}

/**
 * 排他レンダリング制御 (pdf-lifecycle-reviewer skill)
 * renderRequestId をインクリメントし、前回タスクを cancel()。
 * RenderingCancelledException は無視。
 */
export function createPageRenderer(): PageRenderer {
  let currentRequestId = 0;
  let currentRenderTask: ReturnType<PDFPageProxy['render']> | null = null;

  async function render(
    page: PDFPageProxy,
    canvas: HTMLCanvasElement,
    scale: number,
  ): Promise<boolean> {
    const requestId = ++currentRequestId;

    // 前回タスクをキャンセル
    if (currentRenderTask) {
      currentRenderTask.cancel();
      currentRenderTask = null;
    }

    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    currentRenderTask = renderTask;

    try {
      await renderTask.promise;
      return requestId === currentRequestId;
    } catch (error: unknown) {
      // pdf-lifecycle-reviewer: RenderingCancelledException を明示的に無視
      if (
        error instanceof Error &&
        (error.name === 'RenderingCancelledException' ||
          error.message?.includes('cancelled'))
      ) {
        return false;
      }
      // 世代が変わっていたら無視
      if (requestId !== currentRequestId) return false;
      throw error;
    } finally {
      if (requestId === currentRequestId) {
        currentRenderTask = null;
      }
    }
  }

  function cancel() {
    currentRequestId++;
    if (currentRenderTask) {
      currentRenderTask.cancel();
      currentRenderTask = null;
    }
  }

  return { render, cancel };
}

// ── PDF Loading ───────────────────────────────────────────────────────

export async function loadPdfFromUrl(url: string): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument(url);
  return loadingTask.promise;
}

export async function loadPdfFromData(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({ data });
  return loadingTask.promise;
}

// ── ImageBitmap creation for Worker ───────────────────────────────────

export async function renderPageToImageBitmap(
  page: PDFPageProxy,
  maxDimension: number = 1200,
): Promise<ImageBitmap> {
  const defaultViewport = page.getViewport({ scale: 1 });
  const longEdge = Math.max(defaultViewport.width, defaultViewport.height);
  const scale = longEdge > maxDimension ? maxDimension / longEdge : 1;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;

  const renderTask = page.render({ canvasContext: ctx, viewport });
  try {
    await renderTask.promise;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.name === 'RenderingCancelledException' ||
        error.message?.includes('cancelled'))
    ) {
      canvas.width = 0;
      canvas.height = 0;
      throw error;
    }
    throw error;
  }

  const bitmap = await createImageBitmap(canvas);

  // メモリ即時解放
  canvas.width = 0;
  canvas.height = 0;

  return bitmap;
}

// ── 300 DPI 用紙判型対応 PDF Export Pipeline ────────────────────────────

export interface ExportOptions {
  dpi: number;
  cropRect: NormalizedRect;
  pageProcessingMode: PageProcessingMode;
  splitOffsetPercent: number;
  pageOrder: PageOrder;
  bodyStartPage: number;
  frontMatterMode: 'single' | 'split' | 'skip';
  /** 出力用紙幅 (pt) */
  paperWidthPt: number;
  /** 出力用紙高さ (pt) */
  paperHeightPt: number;
  /** マージン (pt) — デフォルト0 */
  marginPt: number;
  /** 仮想ページ配列 (削除・白紙・回転) */
  pages: PageEntry[];
  getEffectiveSettings: (pageIndex: number) => {
    cropRect: NormalizedRect;
    pageProcessingMode: PageProcessingMode;
    splitOffsetPercent: number;
    pageOrder: PageOrder;
  };
  onProgress?: (current: number, total: number, message: string) => void;
}

export async function exportToDpiPdf(
  pdfDoc: PDFDocumentProxy,
  options: ExportOptions,
): Promise<Blob> {
  const outPdf = await PDFDocument.create();
  const DPI_SCALE = options.dpi / 72;
  const { paperWidthPt, paperHeightPt, marginPt } = options;

  // マージン適用後の安全領域
  const safeW = paperWidthPt - marginPt * 2;
  const safeH = paperHeightPt - marginPt * 2;

  const totalEntries = options.pages.length;

  for (let virtualIdx = 0; virtualIdx < totalEntries; virtualIdx++) {
    const entry = options.pages[virtualIdx];

    // 削除済みページをスキップ
    if (entry.deleted) {
      options.onProgress?.(virtualIdx + 1, totalEntries, `スキップ: 削除済みページ ${virtualIdx + 1}`);
      continue;
    }

    // 白紙ページ挿入
    if (entry.isBlank) {
      outPdf.addPage([paperWidthPt, paperHeightPt]);
      options.onProgress?.(virtualIdx + 1, totalEntries, `白紙ページ ${virtualIdx + 1} を追加`);
      // メインスレッドに制御を返す
      await new Promise((r) => setTimeout(r, 0));
      continue;
    }

    const pageNo = entry.sourceIndex + 1;
    const pageSettings = options.getEffectiveSettings(virtualIdx);

    // Front matter handling (app.py L1162-1170)
    const isFront = pageNo < options.bodyStartPage;
    if (isFront && options.frontMatterMode === 'skip') {
      options.onProgress?.(virtualIdx + 1, totalEntries, `スキップ: 本文前ページ ${virtualIdx + 1}`);
      continue;
    }

    const effectiveMode: PageProcessingMode =
      isFront && options.frontMatterMode === 'single'
        ? 'single_fit'
        : pageSettings.pageProcessingMode;

    options.onProgress?.(virtualIdx + 1, totalEntries, `レンダリング中: ページ ${virtualIdx + 1} / ${totalEntries}`);

    // High-resolution rendering
    const page = await pdfDoc.getPage(pageNo);
    const viewport = page.getViewport({ scale: DPI_SCALE });

    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = viewport.width;
    renderCanvas.height = viewport.height;
    const ctx = renderCanvas.getContext('2d')!;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    try {
      await renderTask.promise;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.name === 'RenderingCancelledException' ||
          error.message?.includes('cancelled'))
      ) {
        renderCanvas.width = 0;
        renderCanvas.height = 0;
        continue;
      }
      throw error;
    }

    // 回転処理
    let finalCanvas: HTMLCanvasElement;
    if (entry.rotation !== 0) {
      finalCanvas = document.createElement('canvas');
      const isSwapped = entry.rotation === 90 || entry.rotation === 270;
      finalCanvas.width = isSwapped ? renderCanvas.height : renderCanvas.width;
      finalCanvas.height = isSwapped ? renderCanvas.width : renderCanvas.height;
      const rotCtx = finalCanvas.getContext('2d')!;

      rotCtx.save();
      rotCtx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
      rotCtx.rotate((entry.rotation * Math.PI) / 180);
      rotCtx.drawImage(renderCanvas, -renderCanvas.width / 2, -renderCanvas.height / 2);
      rotCtx.restore();

      // 元のrenderCanvasを即時解放
      renderCanvas.width = 0;
      renderCanvas.height = 0;
    } else {
      finalCanvas = renderCanvas;
    }

    // Crop extraction
    const sourceRect = normalizedToSourceRect(pageSettings.cropRect, {
      width: finalCanvas.width,
      height: finalCanvas.height,
    });

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sourceRect.width;
    cropCanvas.height = sourceRect.height;
    const cropCtx = cropCanvas.getContext('2d')!;
    cropCtx.drawImage(
      finalCanvas,
      sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
      0, 0, sourceRect.width, sourceRect.height,
    );

    // finalCanvas メモリ解放
    finalCanvas.width = 0;
    finalCanvas.height = 0;

    // Generate output page(s)
    const fullCropNorm: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 };
    const outputRects =
      effectiveMode === 'spread_split'
        ? splitNormalizedRectIntoTwo(
            fullCropNorm,
            pageSettings.splitOffsetPercent,
            pageSettings.pageOrder,
          )
        : fitNormalizedRectToSingle(fullCropNorm);

    for (const rect of outputRects) {
      const partRect = normalizedToSourceRect(rect, {
        width: cropCanvas.width,
        height: cropCanvas.height,
      });

      const partCanvas = document.createElement('canvas');
      partCanvas.width = partRect.width;
      partCanvas.height = partRect.height;
      const partCtx = partCanvas.getContext('2d')!;
      partCtx.drawImage(
        cropCanvas,
        partRect.x, partRect.y, partRect.width, partRect.height,
        0, 0, partRect.width, partRect.height,
      );

      // S = min(SafeW / CropW, SafeH / CropH) — アスペクト比維持 (score-lossless-engine skill §3)
      const scaleX = safeW / partCanvas.width;
      const scaleY = safeH / partCanvas.height;
      const fitScale = Math.min(scaleX, scaleY);
      const drawW = partCanvas.width * fitScale;
      const drawH = partCanvas.height * fitScale;
      const tx = marginPt + (safeW - drawW) / 2;
      const ty = marginPt + (safeH - drawH) / 2;

      // Convert to PNG bytes
      const blob = await new Promise<Blob>((resolve, reject) => {
        partCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/png',
        );
      });
      const arrayBuffer = await blob.arrayBuffer();
      const pngImage = await outPdf.embedPng(new Uint8Array(arrayBuffer));

      const outPage = outPdf.addPage([paperWidthPt, paperHeightPt]);

      // 白背景を明示描画
      outPage.drawRectangle({
        x: 0, y: 0,
        width: paperWidthPt, height: paperHeightPt,
        color: rgb(1, 1, 1),
      });

      outPage.drawImage(pngImage, { x: tx, y: paperHeightPt - ty - drawH, width: drawW, height: drawH });

      // メモリ即時解放
      partCanvas.width = 0;
      partCanvas.height = 0;
    }

    // Crop canvas メモリ解放
    cropCanvas.width = 0;
    cropCanvas.height = 0;

    options.onProgress?.(virtualIdx + 1, totalEntries, `配置完了: ページ ${virtualIdx + 1} / ${totalEntries}`);

    // メインスレッドに制御を返す (score-lossless-engine skill §2)
    await new Promise((r) => setTimeout(r, 0));
  }

  const pdfBytes = await outPdf.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ── Download Helper (requestAnimationFrame 遅延解放) ──────────────────

export function downloadSafeBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // requestAnimationFrame で遅延評価して URL を解放 (research.pdf 課題4)
  requestAnimationFrame(() => {
    URL.revokeObjectURL(url);
  });
}
