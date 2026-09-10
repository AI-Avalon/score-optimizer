import type { ProcessSettings } from './types';


export function detectContentBbox(gray: Float32Array, width: number, height: number, threshold: number, padding: number) {
  let minX = width, minY = height, maxX = 0, maxY = 0;
  let found = false;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (gray[y * width + x] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return { x0: 0, y0: 0, x1: width, y1: height };

  const x0 = Math.max(0, minX - padding);
  const y0 = Math.max(0, minY - padding);
  const x1 = Math.min(width, maxX + padding + 1);
  const y1 = Math.min(height, maxY + padding + 1);

  if (x1 <= x0 || y1 <= y0) return { x0: 0, y0: 0, x1: width, y1: height };
  
  return { x0, y0, x1, y1 };
}

export function computeCropRect(width: number, height: number, settings: ProcessSettings, detectedBBox?: {x0:number, y0:number, x1:number, y1:number}) {
  let x0 = 0, y0 = 0, x1 = width, y1 = height;

  if (settings.auto_crop_enabled && detectedBBox) {
    x0 = detectedBBox.x0;
    y0 = detectedBBox.y0;
    x1 = detectedBBox.x1;
    y1 = detectedBBox.y1;
  }

  const cropW = Math.max(1, x1 - x0);
  const cropH = Math.max(1, y1 - y0);

  const leftTrim = Math.floor(cropW * (settings.manual_trim_left_percent / 100.0));
  const rightTrim = Math.floor(cropW * (settings.manual_trim_right_percent / 100.0));
  const topTrim = Math.floor(cropH * (settings.manual_trim_top_percent / 100.0));
  const bottomTrim = Math.floor(cropH * (settings.manual_trim_bottom_percent / 100.0));

  x0 = Math.min(Math.max(0, x0 + leftTrim), width - 1);
  x1 = Math.max(Math.min(width, x1 - rightTrim), x0 + 1);
  y0 = Math.min(Math.max(0, y0 + topTrim), height - 1);
  y1 = Math.max(Math.min(height, y1 - bottomTrim), y0 + 1);

  return { x0, y0, x1, y1 };
}

export function getSplitX(cropW: number, settings: ProcessSettings) {
  const offsetPx = Math.floor((settings.split_offset_percent / 100.0) * cropW);
  return Math.max(1, Math.min(cropW - 1, Math.floor(cropW / 2) + offsetPx));
}
