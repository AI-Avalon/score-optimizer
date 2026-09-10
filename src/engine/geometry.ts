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
