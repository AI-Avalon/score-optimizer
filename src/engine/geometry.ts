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
