import { PDFDocument } from 'pdf-lib';
import type { ProcessSettings, PageData, PageOverride } from './types';
import { computeCropRect, getSplitX } from './cropEngine';
import { binarizeFixed, binarizeAdaptive, toGray } from './filterEngine';

export async function exportPdf(
  pages: PageData[],
  globalSettings: ProcessSettings,
  pageOverrides: Record<number, PageOverride>,
  onProgress: (progress: number) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // A4 size in points
  const A4_W = 595.28;
  const A4_H = 841.89;
  
  const dpi = 300;
  
  for (let i = 0; i < pages.length; i++) {
    onProgress(Math.round((i / pages.length) * 100));
    const pageData = pages[i];
    
    // settings resolution
    const override = pageOverrides[i];
    const settings: ProcessSettings = override ? { ...globalSettings, ...override } : globalSettings;
    
    // Note: front_matter_mode implementation here.
    if (i + 1 < settings.body_start_page) {
       if (settings.front_matter_mode === 'skip') continue;
       if (settings.front_matter_mode === 'single') {
         settings.page_processing_mode = 'single_fit';
       }
    }
    
    // Create image element from originalImage
    const img = new Image();
    img.src = pageData.originalImage;
    await new Promise(r => { img.onload = r; });
    
    // Draw to canvas for high DPI render processing
    const origW = img.width;
    const origH = img.height;
    
    const canvas = document.createElement('canvas');
    canvas.width = origW;
    canvas.height = origH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, origW, origH);
    
    const imgData = ctx.getImageData(0, 0, origW, origH);
    const gray = toGray(imgData);
    
    // Get BBox (if auto_crop_enabled)
    let detectedBBox = undefined;
    if (settings.auto_crop_enabled) {
      const { detectContentBbox } = await import('./cropEngine');
      detectedBBox = detectContentBbox(gray, origW, origH, settings.black_margin_threshold, settings.crop_padding_px);
    }
    
    const cropRect = computeCropRect(origW, origH, settings, detectedBBox);
    const cropW = cropRect.x1 - cropRect.x0;
    const cropH = cropRect.y1 - cropRect.y0;
    
    const croppedData = ctx.getImageData(cropRect.x0, cropRect.y0, cropW, cropH);
    
    let parts: ImageData[] = [];
    
    if (settings.page_processing_mode === 'single_fit') {
      parts = [croppedData];
    } else {
      const splitX = getSplitX(cropW, settings);
      
      const leftPart = ctx.getImageData(cropRect.x0, cropRect.y0, splitX, cropH);
      const rightPart = ctx.getImageData(cropRect.x0 + splitX, cropRect.y0, cropW - splitX, cropH);
      
      if (settings.page_order === 'left_to_right') {
        parts = [leftPart, rightPart];
      } else {
        parts = [rightPart, leftPart];
      }
    }
    
    for (const part of parts) {
      let finalData = part;
      
      if (settings.output_color_mode === 'monochrome') {
        if (settings.use_adaptive_threshold) {
           finalData = binarizeAdaptive(part);
        } else {
           finalData = binarizeFixed(part, settings.fixed_threshold);
        }
      }
      
      const tempC = document.createElement('canvas');
      tempC.width = finalData.width;
      tempC.height = finalData.height;
      tempC.getContext('2d')!.putImageData(finalData, 0, 0);
      
      const targetW = Math.max(1000, Math.floor((A4_W / 72.0) * dpi));
      const targetH = Math.max(1000, Math.floor((A4_H / 72.0) * dpi));
      
      // No margin as requested "初期マージンは 0mm（余白なし最大化）を厳守すること"
      const scale = Math.min(targetW / finalData.width, targetH / finalData.height);
      const drawW = Math.floor(finalData.width * scale);
      const drawH = Math.floor(finalData.height * scale);
      
      const outC = document.createElement('canvas');
      outC.width = targetW;
      outC.height = targetH;
      const outCtx = outC.getContext('2d')!;
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, targetW, targetH);
      
      const dx = (targetW - drawW) / 2;
      const dy = (targetH - drawH) / 2;
      outCtx.drawImage(tempC, dx, dy, drawW, drawH);
      
      // Add to pdf
      const imgBase64 = outC.toDataURL('image/jpeg', 0.95);
      const pdfImage = await pdfDoc.embedJpg(imgBase64);
      
      const pdfPage = pdfDoc.addPage([A4_W, A4_H]);
      pdfPage.drawImage(pdfImage, {
        x: 0,
        y: 0,
        width: A4_W,
        height: A4_H,
      });
      
      tempC.width = 0; tempC.height = 0;
      outC.width = 0; outC.height = 0;
    }
    
    canvas.width = 0; canvas.height = 0; // immediate memory release
  }
  
  onProgress(100);
  return await pdfDoc.save();
}
