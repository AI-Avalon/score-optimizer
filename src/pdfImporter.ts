import * as pdfjsLib from 'pdfjs-dist';
import type { ScorePage } from './types';
import { genId } from './store/useScoreStore';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

let activeRenderTask: any = null;

export const importPdf = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ScorePage[]> => {
  const arrayBuffer = await file.arrayBuffer();
  
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve([{
          id: genId(),
          imageUrl: img.src,
          originalWidth: img.width,
          originalHeight: img.height,
          isBlank: false,
          whiteoutRects: [],
          stamps: [],
          deskew: null,
          rotation: 0,
        }]);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pages: ScorePage[] = [];

  for (let i = 1; i <= numPages; i++) {
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
      if (e?.name === 'RenderingCancelledException') {
        console.log('PDF rendering cancelled');
        continue;
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

  return pages;
};
