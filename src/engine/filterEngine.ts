import type { ProcessSettings } from '../types';

export const applyColorMode = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: ProcessSettings
): ImageData => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  if (settings.outputColorMode === 'original') {
    return imageData;
  }

  // Grayscale mapping
  const grayMap = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayMap[i / 4] = gray;
  }

  if (settings.outputColorMode === 'grayscale') {
    for (let i = 0; i < data.length; i += 4) {
      const g = grayMap[i / 4];
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
    }
    return imageData;
  }

  // Monochrome (Binarization)
  if (settings.useAdaptiveThreshold) {
    const blockSize = 31;
    const C = 11;
    const halfBlock = Math.floor(blockSize / 2);
    
    const integral = new Int32Array(width * height);
    for (let y = 0; y < height; y++) {
      let sum = 0;
      for (let x = 0; x < width; x++) {
        sum += grayMap[y * width + x];
        integral[y * width + x] = sum + (y > 0 ? integral[(y - 1) * width + x] : 0);
      }
    }

    const getSum = (x1: number, y1: number, x2: number, y2: number) => {
      x1 = Math.max(0, x1); y1 = Math.max(0, y1);
      x2 = Math.min(width - 1, x2); y2 = Math.min(height - 1, y2);
      let res = integral[y2 * width + x2];
      if (x1 > 0) res -= integral[y2 * width + (x1 - 1)];
      if (y1 > 0) res -= integral[(y1 - 1) * width + x2];
      if (x1 > 0 && y1 > 0) res += integral[(y1 - 1) * width + (x1 - 1)];
      return res;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const x1 = x - halfBlock;
        const y1 = y - halfBlock;
        const x2 = x + halfBlock;
        const y2 = y + halfBlock;
        
        const count = (Math.min(width - 1, x2) - Math.max(0, x1) + 1) * 
                      (Math.min(height - 1, y2) - Math.max(0, y1) + 1);
        
        const sum = getSum(x1, y1, x2, y2);
        const mean = sum / count;
        
        const val = grayMap[y * width + x] < mean - C ? 0 : 255;
        const idx = (y * width + x) * 4;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
      }
    }
  } else {
    // Fixed threshold
    const th = settings.fixedThreshold;
    for (let i = 0; i < data.length; i += 4) {
      const val = grayMap[i / 4] < th ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  }

  return imageData;
};
