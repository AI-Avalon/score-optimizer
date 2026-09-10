import { jsPDF } from 'jspdf';
import { Page, Preset } from './types';
import { renderPageToCanvas } from './engine';

export const exportToPdf = async (pages: Page[], preset: Preset) => {
  if (pages.length === 0) return;

  const doc = new jsPDF({
    orientation: preset.widthMm > preset.heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [preset.widthMm, preset.heightMm]
  });

  const exportScale = 300 / 72; // Strict 300DPI requirement
  
  let pageCount = 0;
  for (const page of pages) {
    if (page.isLandscape) {
      // Left Page
      if (pageCount > 0) doc.addPage();
      const leftCanvas = await renderPageToCanvas(page, preset, 'left', exportScale);
      const leftData = leftCanvas.toDataURL('image/jpeg', 0.9);
      doc.addImage(leftData, 'JPEG', 0, 0, preset.widthMm, preset.heightMm);
      leftCanvas.width = 0;
      leftCanvas.height = 0;
      pageCount++;

      // Right Page
      doc.addPage();
      const rightCanvas = await renderPageToCanvas(page, preset, 'right', exportScale);
      const rightData = rightCanvas.toDataURL('image/jpeg', 0.9);
      doc.addImage(rightData, 'JPEG', 0, 0, preset.widthMm, preset.heightMm);
      rightCanvas.width = 0;
      rightCanvas.height = 0;
      pageCount++;
    } else {
      // Single Page
      if (pageCount > 0) doc.addPage();
      const singleCanvas = await renderPageToCanvas(page, preset, 'single', exportScale);
      const singleData = singleCanvas.toDataURL('image/jpeg', 0.9);
      doc.addImage(singleData, 'JPEG', 0, 0, preset.widthMm, preset.heightMm);
      singleCanvas.width = 0;
      singleCanvas.height = 0;
      pageCount++;
    }
  }

  doc.save('score-optimized.pdf');
};
