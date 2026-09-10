import * as pdfjsLib from 'pdfjs-dist';
import type { PageData } from './types';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

let currentRequestId = 0;

export async function importPdf(
  file: File, 
  onProgress: (progress: number) => void,
  onPageAdded: (page: PageData) => void
): Promise<{cancelled: boolean}> {
  const reqId = ++currentRequestId;
  const arrayBuffer = await file.arrayBuffer();
  
  if (reqId !== currentRequestId) return {cancelled: true};
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === 'RenderingCancelledException') {
      return {cancelled: true};
    }
    throw err;
  }

  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    if (reqId !== currentRequestId) {
      loadingTask.destroy();
      return {cancelled: true};
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
        return {cancelled: true};
      }
      throw err;
    }

    if (reqId !== currentRequestId) {
      loadingTask.destroy();
      return {cancelled: true};
    }

    const newPage = {
      id: `page-${Date.now()}-${i}`,
      originalImage: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height
    };
    
    onPageAdded(newPage);
    
    onProgress(Math.round((i / numPages) * 100));
    canvas.width = 0;
    canvas.height = 0; // immediate memory release
  }

  return { cancelled: false };
}
