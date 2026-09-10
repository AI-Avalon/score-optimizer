import * as pdfjsLib from 'pdfjs-dist';
import type { PageData } from './types';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let currentRequestId = 0;

export async function importPdf(file: File, onProgress: (progress: number) => void): Promise<{pages: PageData[], cancelled: boolean}> {
  const reqId = ++currentRequestId;
  const arrayBuffer = await file.arrayBuffer();
  
  if (reqId !== currentRequestId) return {pages: [], cancelled: true};
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException') {
      return {pages: [], cancelled: true};
    }
    throw err;
  }

  const pages: PageData[] = [];
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    if (reqId !== currentRequestId) {
      loadingTask.destroy();
      return {pages: [], cancelled: true};
    }
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 }); // 108 DPI for preview
    
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    
    const renderTask = page.render({ canvasContext: ctx, viewport });
    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        loadingTask.destroy();
        return {pages: [], cancelled: true};
      }
      throw err;
    }

    if (reqId !== currentRequestId) {
      loadingTask.destroy();
      return {pages: [], cancelled: true};
    }

    pages.push({
      id: `page-${Date.now()}-${i}`,
      originalImage: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height
    });
    
    onProgress(Math.round((i / numPages) * 100));
    canvas.width = 0;
    canvas.height = 0; // immediate memory release
  }

  return { pages, cancelled: false };
}
