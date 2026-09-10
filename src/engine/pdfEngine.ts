/**
 * PDF Engine — PDF.js ライフサイクル & 300 DPI A4 出力パイプライン
 *
 * pdf-lifecycle-reviewer skill:
 *   - renderRequestId で排他制御
 *   - RenderingCancelledException を明示キャッチ&無視
 *   - pdfDoc.destroy() をアンマウント時に実行
 *
 * research.pdf 課題4:
 *   - pdf-lib で A4 (595.28 × 841.89 pt) ページ生成
 *   - 0mm マージン（余白なし最大化）、アスペクト比維持センタリング
 *   - canvas.width = 0; canvas.height = 0; でメモリ即時解放
 */

import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { A4 } from '../types';
import type { NormalizedRect } from '../types';
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

// ── 300 DPI A4 PDF Export Pipeline (research.pdf 課題4) ────────────────

export interface ExportOptions {
  cropRect: NormalizedRect;
  pageProcessingMode: PageProcessingMode;
  splitOffsetPercent: number;
  pageOrder: PageOrder;
  bodyStartPage: number;
  frontMatterMode: 'single' | 'split' | 'skip';
  getEffectiveSettings: (pageIndex: number) => {
    cropRect: NormalizedRect;
    pageProcessingMode: PageProcessingMode;
    splitOffsetPercent: number;
    pageOrder: PageOrder;
  };
  onProgress?: (current: number, total: number) => void;
}

export async function exportTo300DpiPdf(
  pdfDoc: PDFDocumentProxy,
  options: ExportOptions,
): Promise<Blob> {
  const totalPages = pdfDoc.numPages;
  const outPdf = await PDFDocument.create();
  const DPI_SCALE = 300 / 72;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNo = pageIdx + 1;
    const pageSettings = options.getEffectiveSettings(pageIdx);

    // Front matter handling (app.py L1162-1170)
    const isFront = pageNo < options.bodyStartPage;
    if (isFront && options.frontMatterMode === 'skip') {
      options.onProgress?.(pageIdx + 1, totalPages);
      continue;
    }

    const effectiveMode: PageProcessingMode =
      isFront && options.frontMatterMode === 'single'
        ? 'single_fit'
        : pageSettings.pageProcessingMode;

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

    // Crop extraction
    const sourceRect = normalizedToSourceRect(pageSettings.cropRect, {
      width: renderCanvas.width,
      height: renderCanvas.height,
    });

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sourceRect.width;
    cropCanvas.height = sourceRect.height;
    const cropCtx = cropCanvas.getContext('2d')!;
    cropCtx.drawImage(
      renderCanvas,
      sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
      0, 0, sourceRect.width, sourceRect.height,
    );

    // Full render canvas メモリ解放
    renderCanvas.width = 0;
    renderCanvas.height = 0;

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

      // 0mm margin, aspect ratio maintained, centered (geometry rule)
      const scaleX = A4.widthPt / partCanvas.width;
      const scaleY = A4.heightPt / partCanvas.height;
      const fitScale = Math.min(scaleX, scaleY);
      const drawW = partCanvas.width * fitScale;
      const drawH = partCanvas.height * fitScale;
      const tx = (A4.widthPt - drawW) / 2;
      const ty = (A4.heightPt - drawH) / 2;

      // Convert to PNG bytes
      const blob = await new Promise<Blob>((resolve, reject) => {
        partCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/png',
        );
      });
      const arrayBuffer = await blob.arrayBuffer();
      const pngImage = await outPdf.embedPng(new Uint8Array(arrayBuffer));

      const a4Page = outPdf.addPage([A4.widthPt, A4.heightPt]);
      a4Page.drawImage(pngImage, { x: tx, y: A4.heightPt - ty - drawH, width: drawW, height: drawH });

      // メモリ即時解放
      partCanvas.width = 0;
      partCanvas.height = 0;
    }

    // Crop canvas メモリ解放
    cropCanvas.width = 0;
    cropCanvas.height = 0;

    options.onProgress?.(pageIdx + 1, totalPages);
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
