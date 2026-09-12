/**
 * Geometry Pure Functions
 *
 * research.pdf 課題3 — Normalized座標変換と見開き2分割
 * geometry-guard skill: 状態管理は NormalizedCoordinates (0.0–1.0) のみ
 */

import type { NormalizedRect, PageOrder, Point } from '../types';

// ─── Coordinate Transforms ───────────────────────────────────────────

/** Screen (CSS px) → Normalized (0.0–1.0) */
export function screenToNormalized(
  point: Point,
  containerSize: { width: number; height: number },
): Point {
  return {
    x: containerSize.width > 0 ? point.x / containerSize.width : 0,
    y: containerSize.height > 0 ? point.y / containerSize.height : 0,
  };
}

/** Normalized (0.0–1.0) → Source pixel rect */
export function normalizedToSourceRect(
  normRect: NormalizedRect,
  sourceSize: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const x = Math.round(normRect.x * sourceSize.width);
  const y = Math.round(normRect.y * sourceSize.height);
  const right = Math.round((normRect.x + normRect.width) * sourceSize.width);
  const bottom = Math.round((normRect.y + normRect.height) * sourceSize.height);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

// ─── Spread Split (app.py split_spread_page L140-157) ─────────────────

/**
 * 確定したクロップ枠の内側幅を基準として中央分割線を算出し、
 * 左ページと右ページの NormalizedRect を返す。
 *
 * app.py L145-146:
 *   offset_px = int((split_offset_percent / 100.0) * w)
 *   split_x = max(1, min(w - 1, (w // 2) + offset_px))
 */
export function splitNormalizedRectIntoTwo(
  cropRect: NormalizedRect,
  splitOffsetPercent: number,
  pageOrder: PageOrder,
): [NormalizedRect, NormalizedRect] {
  const offsetFraction = splitOffsetPercent / 100;
  const halfWidth = cropRect.width / 2;
  const splitOffset = cropRect.width * offsetFraction;
  const rawSplitX = cropRect.x + halfWidth + splitOffset;

  // Clamp: 最低 0.1% のマージンを確保
  const minSplit = cropRect.x + cropRect.width * 0.001;
  const maxSplit = cropRect.x + cropRect.width * 0.999;
  const splitX = Math.max(minSplit, Math.min(maxSplit, rawSplitX));

  const leftRect: NormalizedRect = {
    x: cropRect.x,
    y: cropRect.y,
    width: splitX - cropRect.x,
    height: cropRect.height,
  };

  const rightRect: NormalizedRect = {
    x: splitX,
    y: cropRect.y,
    width: cropRect.x + cropRect.width - splitX,
    height: cropRect.height,
  };

  // app.py L151-154: page_order による返却順切替
  return pageOrder === 'left_to_right'
    ? [leftRect, rightRect]
    : [rightRect, leftRect];
}

// ─── Single Fit ───────────────────────────────────────────────────────

/** 単ページ処理: クロップ枠をそのまま1ページとして出力 */
export function fitNormalizedRectToSingle(
  cropRect: NormalizedRect,
): [NormalizedRect] {
  return [cropRect];
}

// ─── Manual Trim (app.py compute_crop_rect L127-136) ──────────────────

/**
 * 基底クロップ枠に手動トリム % を適用。
 * トリム % はクロップ枠の幅・高さに対する割合。
 */
export function applyManualTrim(
  baseRect: NormalizedRect,
  trimLeftPercent: number,
  trimRightPercent: number,
  trimTopPercent: number,
  trimBottomPercent: number,
): NormalizedRect {
  const leftTrim = baseRect.width * (trimLeftPercent / 100);
  const rightTrim = baseRect.width * (trimRightPercent / 100);
  const topTrim = baseRect.height * (trimTopPercent / 100);
  const bottomTrim = baseRect.height * (trimBottomPercent / 100);

  return {
    x: Math.min(1, baseRect.x + leftTrim),
    y: Math.min(1, baseRect.y + topTrim),
    width: Math.max(0.01, baseRect.width - leftTrim - rightTrim),
    height: Math.max(0.01, baseRect.height - topTrim - bottomTrim),
  };
}

// ─── Split Line Position (for canvas overlay) ─────────────────────────

/** 分割線の Normalized X 位置を算出 (表示用) */
export function getSplitLineNormalizedX(
  cropRect: NormalizedRect,
  splitOffsetPercent: number,
): number {
  const offsetFraction = splitOffsetPercent / 100;
  const halfWidth = cropRect.width / 2;
  const rawX = cropRect.x + halfWidth + cropRect.width * offsetFraction;
  return Math.max(cropRect.x, Math.min(cropRect.x + cropRect.width, rawX));
}

// ─── Solver for Crop Coordinates ──────────────────────────────────────

/**
 * クロップ幾何拘束ソルバー (Geometry Solver)
 */
export function computeConstrainedCrop(
  initialRect: NormalizedRect,
  handleId: string,
  deltaXNorm: number,
  deltaYNorm: number,
  aspectRatioLock: boolean,
  targetRatio: number, // width / height
  pageAspect: number   // 原本ページの width / height
): NormalizedRect {
  let top = initialRect.y;
  let bottom = initialRect.y + initialRect.height;
  let left = initialRect.x;
  let right = initialRect.x + initialRect.width;

  if (handleId === 'c') {
    const width = right - left;
    const height = bottom - top;
    let newLeft = Math.max(0, Math.min(1 - width, left + deltaXNorm));
    let newTop = Math.max(0, Math.min(1 - height, top + deltaYNorm));
    return {
      x: newLeft,
      y: newTop,
      width: width,
      height: height,
    };
  }

  // ハンドルごとの移動
  if (handleId.includes('r')) right = Math.min(1.0, Math.max(left + 0.02, right + deltaXNorm));
  if (handleId.includes('l')) left = Math.max(0.0, Math.min(right - 0.02, left + deltaXNorm));
  if (handleId.includes('b')) bottom = Math.min(1.0, Math.max(top + 0.02, bottom + deltaYNorm));
  if (handleId.includes('t')) top = Math.max(0.0, Math.min(bottom - 0.02, top + deltaYNorm));

  // アスペクト比拘束の計算
  if (aspectRatioLock && targetRatio > 0 && pageAspect > 0) {
    // 画面正規化座標系での目標比率
    const normTargetRatio = targetRatio / pageAspect;
    const currentWidth = right - left;
    const currentHeight = bottom - top;
    
    console.log('[GEOM DEBUG]', { handleId, deltaXNorm, deltaYNorm, targetRatio, pageAspect, normTargetRatio, currentWidth, currentHeight });

    if (handleId === 'r' || handleId === 'l') {
      const desiredHeight = currentWidth / normTargetRatio;
      const heightDiff = desiredHeight - currentHeight;
      top = Math.max(0, top - heightDiff / 2);
      bottom = Math.min(1, top + desiredHeight);
      
      if (bottom - top < desiredHeight) {
         const clampedHeight = bottom - top;
         const finalWidth = clampedHeight * normTargetRatio;
         if (handleId === 'r') right = left + finalWidth;
         else left = right - finalWidth;
      }
    } else if (handleId === 't' || handleId === 'b') {
      const desiredWidth = currentHeight * normTargetRatio;
      const widthDiff = desiredWidth - currentWidth;
      left = Math.max(0, left - widthDiff / 2);
      right = Math.min(1, left + desiredWidth);
      
      if (right - left < desiredWidth) {
         const clampedWidth = right - left;
         const finalHeight = clampedWidth / normTargetRatio;
         if (handleId === 'b') bottom = top + finalHeight;
         else top = bottom - finalHeight;
      }
    } else {
      // 四隅 (角) の場合
      const useWidth = Math.abs(deltaXNorm) > Math.abs(deltaYNorm);
      
      if (useWidth) {
        const desiredHeight = currentWidth / normTargetRatio;
        if (handleId.includes('b')) {
          bottom = top + desiredHeight;
        } else {
          top = bottom - desiredHeight;
        }
        
        // はみ出し補正
        if (bottom > 1 || top < 0) {
           if (bottom > 1) bottom = 1;
           if (top < 0) top = 0;
           const finalHeight = bottom - top;
           const finalWidth = finalHeight * normTargetRatio;
           if (handleId.includes('r')) right = Math.min(1, left + finalWidth);
           else left = Math.max(0, right - finalWidth);
        }
      } else {
        const desiredWidth = currentHeight * normTargetRatio;
        if (handleId.includes('r')) {
          right = left + desiredWidth;
        } else {
          left = right - desiredWidth;
        }
        
        // はみ出し補正
        if (right > 1 || left < 0) {
           if (right > 1) right = 1;
           if (left < 0) left = 0;
           const finalWidth = right - left;
           const finalHeight = finalWidth / normTargetRatio;
           if (handleId.includes('b')) bottom = Math.min(1, top + finalHeight);
           else top = Math.max(0, bottom - finalHeight);
        }
      }
    }
  }

  // 最終クランプ
  left = Math.max(0, Math.min(1, left));
  right = Math.max(0, Math.min(1, right));
  top = Math.max(0, Math.min(1, top));
  bottom = Math.max(0, Math.min(1, bottom));

  return { 
    x: left, 
    y: top, 
    width: right - left, 
    height: bottom - top 
  };
}
