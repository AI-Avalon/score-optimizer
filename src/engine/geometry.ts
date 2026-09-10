import type { ProcessSettings } from '../types';

export const MM_PER_INCH = 25.4;
export const PRINT_DPI = 300;
export const PDF_DPI = 72;

export const mmToPx = (mm: number, scale = 1.0): number =>
  Math.round((mm / MM_PER_INCH) * PRINT_DPI * scale);

export const calcDeskewAngle = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { angleRad: number; angleDeg: number } => {
  const angleRad = Math.atan2(y2 - y1, x2 - x1);
  const angleDeg = (angleRad * 180) / Math.PI;
  return { angleRad, angleDeg };
};

export const detectContentBBox = (
  ctx: CanvasRenderingContext2D | ImageData,
  width: number,
  height: number,
  blackThreshold: number = 50,
  padding: number = 0
): { x0: number; y0: number; x1: number; y1: number } => {
  const data = 'data' in ctx ? ctx.data : ctx.getImageData(0, 0, width, height).data;
  
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (gray > blackThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  if (minX > maxX || minY > maxY) {
    return { x0: 0, y0: 0, x1: width, y1: height };
  }
  
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width, maxX + padding + 1);
  maxY = Math.min(height, maxY + padding + 1);

  if (maxX <= minX || maxY <= minY) {
    return { x0: 0, y0: 0, x1: width, y1: height };
  }

  return { x0: minX, y0: minY, x1: maxX, y1: maxY };
};

export const computeCropRect = (
  width: number,
  height: number,
  settings: ProcessSettings,
  detectedBBox?: { x0: number; y0: number; x1: number; y1: number }
) => {
  let x0 = 0, y0 = 0, x1 = width, y1 = height;

  if (settings.autoCropEnabled && detectedBBox) {
    x0 = detectedBBox.x0;
    y0 = detectedBBox.y0;
    x1 = detectedBBox.x1;
    y1 = detectedBBox.y1;
  }

  const cropW = Math.max(1, x1 - x0);
  const cropH = Math.max(1, y1 - y0);

  const leftTrim = Math.floor(cropW * (settings.manualTrimLeftPercent / 100.0));
  const rightTrim = Math.floor(cropW * (settings.manualTrimRightPercent / 100.0));
  const topTrim = Math.floor(cropH * (settings.manualTrimTopPercent / 100.0));
  const bottomTrim = Math.floor(cropH * (settings.manualTrimBottomPercent / 100.0));

  let finalX0 = Math.max(0, Math.min(width - 1, x0 + leftTrim));
  let finalX1 = Math.max(finalX0 + 1, Math.min(width, x1 - rightTrim));
  let finalY0 = Math.max(0, Math.min(height - 1, y0 + topTrim));
  let finalY1 = Math.max(finalY0 + 1, Math.min(height, y1 - bottomTrim));

  return { x0: finalX0, y0: finalY0, x1: finalX1, y1: finalY1 };
};
