import { applyColorMode } from './filterEngine';
import { detectContentBBox, computeCropRect } from './geometry';
import type { ScorePage, ProcessSettings, GlobalConfig } from '../types';

/**
 * ページの最終的な ProcessSettings を取得する
 */
export const getEffectiveSettings = (
  page: ScorePage,
  pageIndex: number, // 0-based
  globalConfig: GlobalConfig
): ProcessSettings => {
  const base = globalConfig.processSettings;
  const isFront = (pageIndex + 1) < base.bodyStartPage;
  
  // 個別オーバーライドがあればそれを優先するが、
  // bodyStartPage 等のグローバルなプロパティはそのまま
  let effective = { ...base };
  if (page.overrideSettings) {
    effective = { ...effective, ...page.overrideSettings };
  }

  if (isFront && effective.frontMatterMode === 'skip') {
    return effective;
  }

  const mode = (isFront && effective.frontMatterMode === 'single') 
    ? 'single_fit' 
    : effective.pageProcessingMode;

  effective.pageProcessingMode = mode;
  return effective;
};

/**
 * 1ページを処理して、1〜2枚の ImageData を返す
 */
export const processPageImage = async (
  page: ScorePage,
  pageIndex: number,
  globalConfig: GlobalConfig,
  /* renderDpi: number = 72 */
): Promise<ImageData[]> => {
  if (!page.imageUrl) return [];

  const settings = getEffectiveSettings(page, pageIndex, globalConfig);
  const isFront = (pageIndex + 1) < settings.bodyStartPage;
  
  if (isFront && settings.frontMatterMode === 'skip') {
    return [];
  }

  const img = new Image();
  img.src = page.imageUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });

  const canvas = document.createElement('canvas');
  // Rotation handling (simple approach, just draw)
  let w = img.width;
  let h = img.height;
  if (page.rotation === 90 || page.rotation === 270) {
    w = img.height;
    h = img.width;
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate((page.rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();

  // Draw Whiteout Rects
  ctx.fillStyle = 'white';
  for (const rect of page.whiteoutRects) {
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  // Detect BBox if needed
  const bbox = detectContentBBox(ctx, w, h, settings.blackMarginThreshold, settings.cropPaddingPx);
  const crop = computeCropRect(w, h, settings, bbox);

  // Update page.cropBox if we are just previewing? (We should do this in CanvasViewer to avoid mutating here).

  const cropW = Math.max(1, crop.x1 - crop.x0);
  const cropH = Math.max(1, crop.y1 - crop.y0);

  // Crop image
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d')!;
  croppedCtx.drawImage(canvas, crop.x0, crop.y0, cropW, cropH, 0, 0, cropW, cropH);

  canvas.width = 0; canvas.height = 0; // free

  // Color & Binarize
  const processedData = applyColorMode(croppedCtx, cropW, cropH, settings);

  if (settings.pageProcessingMode === 'single_fit') {
    return [processedData];
  }

  // Spread Split
  const offsetPx = Math.floor((settings.splitOffsetPercent / 100.0) * cropW);
  const splitX = Math.max(1, Math.min(cropW - 1, Math.floor(cropW / 2) + offsetPx));

  

  const outLeft = document.createElement('canvas');
  outLeft.width = splitX;
  outLeft.height = cropH;
  const ctxL = outLeft.getContext('2d')!;
  ctxL.putImageData(processedData, 0, 0, 0, 0, splitX, cropH);

  const outRight = document.createElement('canvas');
  outRight.width = cropW - splitX;
  outRight.height = cropH;
  const ctxR = outRight.getContext('2d')!;
  ctxR.putImageData(processedData, -splitX, 0, splitX, 0, cropW - splitX, cropH);

  const lData = ctxL.getImageData(0, 0, outLeft.width, outLeft.height);
  const rData = ctxR.getImageData(0, 0, outRight.width, outRight.height);

  outLeft.width = 0; outRight.width = 0; croppedCanvas.width = 0;

  if (settings.pageOrder === 'left_to_right') {
    return [lData, rData];
  } else {
    return [rData, lData];
  }
};
