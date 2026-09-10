import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.js?url';

// Configure worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

import type { Page } from './types';

export const importPdf = async (file: File): Promise<Page[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pages: Page[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    // PDF points are 72 DPI. We need 300 DPI for rendering to ensure quality.
    const scale = 300 / 72;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Optional: fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      const imageUrl = canvas.toDataURL('image/jpeg', 0.85); // JPEG for memory efficiency
      
      const isLandscape = viewport.width > viewport.height;

      pages.push({
        id: Math.random().toString(36).substr(2, 9),
        imageUrl,
        width: viewport.width,
        height: viewport.height,
        isLandscape,
        leftMaskOffset: 0,
        rightMaskOffset: 0,
        spineGuide: 50,
        whiteoutMasks: [],
        stamps: []
      });
    }
    
    // FREE MEMORY IMMEDIATELY
    canvas.width = 0;
    canvas.height = 0;
  }
  
  return pages;
};
