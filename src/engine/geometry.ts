import type { BidiMarginConfig } from '../types';

/** mm→インチ変換係数 */
export const MM_PER_INCH = 25.4;

/** 印刷DPI */
export const PRINT_DPI = 300;

/** PDF標準DPI */
export const PDF_DPI = 72;

/** mm値をピクセルに変換（指定スケール適用） */
export const mmToPx = (mm: number, scale = 1.0): number =>
  Math.round((mm / MM_PER_INCH) * PRINT_DPI * scale);

/**
 * アスペクト比を保持したまま、ソース矩形を描画先矩形にフィットさせる計算
 */
export const fitAspectRatio = (
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): { w: number; h: number; x: number; y: number } => {
  const srcAspect = srcW / srcH;
  const dstAspect = dstW / dstH;
  let w: number, h: number;
  if (srcAspect > dstAspect) {
    // ソースのほうが横長 → 幅に合わせる
    w = dstW;
    h = dstW / srcAspect;
  } else {
    // ソースのほうが縦長 → 高さに合わせる
    h = dstH;
    w = dstH * srcAspect;
  }
  return { w, h, x: (dstW - w) / 2, y: (dstH - h) / 2 };
};

/**
 * 2点クリックから傾き角度を算出する（水平補正用）
 * θ = atan2(Δy, Δx)
 */
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

/**
 * 余白の計算
 * 奇数ページ（右ページ）は inside=left, outside=right
 * 偶数ページ（左ページ）は inside=right, outside=left
 */
export const getEffectiveMargins = (
  margins: BidiMarginConfig,
  isLeftPage: boolean,
  accordionMode: boolean
) => {
  if (accordionMode) {
    return {
      top: margins.topMm,
      bottom: margins.bottomMm,
      left: margins.insideMm,
      right: margins.outsideMm
    };
  }

  // isLeftPageがtrueの場合は偶数ページとみなす（左側に配置されるページ）
  // その場合、ノド（inside）は右側になる
  const leftMm = isLeftPage ? margins.outsideMm : margins.insideMm;
  const rightMm = isLeftPage ? margins.insideMm : margins.outsideMm;

  return {
    top: margins.topMm,
    bottom: margins.bottomMm,
    left: leftMm,
    right: rightMm
  };
};

/**
 * スキャナの黒枠などを無視するため、コンテンツ領域のバウンディングボックスを検出
 */
export const detectContentBBox = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blackThreshold: number = 50
): { x: number; y: number; w: number; h: number } => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
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
    return { x: 0, y: 0, w: width, h: height };
  }
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1
  };
};
