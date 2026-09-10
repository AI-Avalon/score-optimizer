import * as pdfjsLib from 'pdfjs-dist';
import type { ScorePage } from './types';
import { genId } from './store/useScoreStore';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

let activeRenderTask: any = null;
let activeDocumentTask: any = null;
let currentRequestId = 0;

export const importPdf = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ pages: ScorePage[], cancelled: boolean }> => {
  const reqId = ++currentRequestId;
  const arrayBuffer = await file.arrayBuffer();
  
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ pages: [{
          id: genId(),
          imageUrl: img.src,
          originalWidth: img.width,
          originalHeight: img.height,
          isBlank: false,
          whiteoutRects: [],
          stamps: [],
          deskew: null,
          rotation: 0,
        }], cancelled: false });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  if (activeDocumentTask) {
    try {
      activeDocumentTask.destroy();
    } catch (e) {
      // ignore
    }
  }

  activeDocumentTask = pdfjsLib.getDocument({ data: arrayBuffer });
  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await activeDocumentTask.promise;
  } catch (e: any) {
    if (e?.name === 'RenderingCancelledException' || e?.message?.includes('cancelled') || e?.name === 'WorkerError') {
      return { pages: [], cancelled: true };
    }
    throw e;
  }

  if (reqId !== currentRequestId) return { pages: [], cancelled: true };

  const numPages = pdf.numPages;
  const pages: ScorePage[] = [];

  for (let i = 1; i <= numPages; i++) {
    if (reqId !== currentRequestId) return { pages: [], cancelled: true };
    
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    if (activeRenderTask) {
      try {
        activeRenderTask.cancel();
      } catch (e) {
        // ignore
      }
    }
    
    activeRenderTask = page.render({ canvasContext: ctx, viewport });
    try {
      await activeRenderTask.promise;
    } catch (e: any) {
      if (e?.name === 'RenderingCancelledException' || e?.message?.includes('cancelled')) {
        return { pages: [], cancelled: true };
      }
      throw e;
    } finally {
      activeRenderTask = null;
    }
    
    pages.push({
      id: genId(),
      imageUrl: canvas.toDataURL('image/jpeg', 0.85),
      originalWidth: viewport.width,
      originalHeight: viewport.height,
      isBlank: false,
      whiteoutRects: [],
      stamps: [],
      deskew: null,
      rotation: 0,
    });
    
    canvas.width = 0; canvas.height = 0;
    if (onProgress) onProgress(Math.round((i / numPages) * 100));
  }

  return { pages, cancelled: false };
};
