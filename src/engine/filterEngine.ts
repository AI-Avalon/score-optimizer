import type { ColorMode, BinarizeConfig } from '../types';

export const applyImageFilter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colorMode: ColorMode,
  binarizeConfig: BinarizeConfig
) => {
  if (colorMode === 'color') return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  if (colorMode === 'grayscale') {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  } else if (colorMode === 'monochrome') {
    const threshold = binarizeConfig.threshold;
    const removeBleedThrough = binarizeConfig.removeBleedThrough;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      
      let val = gray;
      if (removeBleedThrough && gray > 200) {
        val = 255;
      } else {
        val = gray >= threshold ? 255 : 0;
      }
      
      data[i] = data[i + 1] = data[i + 2] = val;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};
