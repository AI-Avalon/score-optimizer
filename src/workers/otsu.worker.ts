/**
 * Otsu Binarization & Black Margin Detection Worker
 *
 * research.pdf 課題2 の実装:
 * - ImageBitmap を Transferable Objects として受信
 * - OffscreenCanvas（長辺1000px以下）にダウンスケール
 * - NTSC式輝度計算 → ヒストグラム → 大津の閾値決定
 * - 黒余白除外バウンディングボックスを NormalizedRect で返却
 * - 処理後は imageBitmap.close() で GPU バッファ強制解放
 */

// Worker 内ではモジュール化のため export {} を置く
export {};

/** ダウンスケール上限 (長辺) */
const MAX_LONG_EDGE = 1000;

interface WorkerRequest {
  imageBitmap: ImageBitmap;
  blackMarginThreshold: number;
  cropPaddingPx: number;
}

interface WorkerResponse {
  cropRect: { x: number; y: number; width: number; height: number };
  otsuThreshold: number;
}

// --- Worker global scope (DOM lib 互換型アサーション) ---
const workerSelf: {
  onmessage: ((ev: MessageEvent) => void) | null;
  postMessage(msg: WorkerResponse): void;
} = self as never;

workerSelf.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { imageBitmap, blackMarginThreshold, cropPaddingPx } = e.data;

  try {
    const origW = imageBitmap.width;
    const origH = imageBitmap.height;

    // ── ダウンスケール ──────────────────────────────────────
    const longEdge = Math.max(origW, origH);
    const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
    const w = Math.max(1, Math.round(origW * scale));
    const h = Math.max(1, Math.round(origH * scale));

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      workerSelf.postMessage({
        cropRect: { x: 0, y: 0, width: 1, height: 1 },
        otsuThreshold: 128,
      });
      return;
    }
    ctx.drawImage(imageBitmap, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;
    const totalPixels = w * h;

    // ── NTSC 輝度変換 + ヒストグラム ─────────────────────
    const gray = new Uint8Array(totalPixels);
    const histogram = new Uint32Array(256);

    for (let i = 0; i < totalPixels; i++) {
      const off = i * 4;
      const lum = Math.round(
        0.299 * pixels[off] + 0.587 * pixels[off + 1] + 0.114 * pixels[off + 2],
      );
      gray[i] = lum;
      histogram[lum]++;
    }

    // ── 大津のアルゴリズム (クラス間分散最大化) ──────────
    let sumAll = 0;
    for (let i = 0; i < 256; i++) sumAll += i * histogram[i];

    let bestThreshold = 128;
    let maxVariance = 0;
    let sumB = 0;
    let wB = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      const wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const meanB = sumB / wB;
      const meanF = (sumAll - sumB) / wF;
      const variance = wB * wF * (meanB - meanF) * (meanB - meanF);

      if (variance > maxVariance) {
        maxVariance = variance;
        bestThreshold = t;
      }
    }

    // ── 黒余白検出 (app.py detect_content_bbox L78-93) ──
    // blackMarginThreshold より明るいピクセル = コンテンツ
    const paddingScaled = Math.round(cropPaddingPx * scale);
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (gray[y * w + x] > blackMarginThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    let cropRect: WorkerResponse['cropRect'];

    if (!found) {
      cropRect = { x: 0, y: 0, width: 1, height: 1 };
    } else {
      // パディング適用
      minX = Math.max(0, minX - paddingScaled);
      minY = Math.max(0, minY - paddingScaled);
      maxX = Math.min(w - 1, maxX + paddingScaled);
      maxY = Math.min(h - 1, maxY + paddingScaled);

      // Normalized 座標 (0.0–1.0) へ変換
      cropRect = {
        x: minX / w,
        y: minY / h,
        width: (maxX - minX + 1) / w,
        height: (maxY - minY + 1) / h,
      };
    }

    workerSelf.postMessage({ cropRect, otsuThreshold: bestThreshold });
  } finally {
    // GPU バッファ強制解放 (otsu-worker-tester skill 要件)
    imageBitmap.close();
  }
};
