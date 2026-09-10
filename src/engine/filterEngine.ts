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

  // グレースケールデータをあらかじめ抽出
  const grayData = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    grayData[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  if (colorMode === 'grayscale') {
    for (let i = 0; i < data.length; i += 4) {
      const gray = grayData[i / 4];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  } else if (colorMode === 'monochrome') {
    const threshold = binarizeConfig.threshold;
    const removeBleedThrough = binarizeConfig.removeBleedThrough;
    const isAdaptive = (binarizeConfig as any).isAdaptive;

    if (isAdaptive) {
      // 積分画像の計算 (Integral Image)
      const integral = new Uint32Array(width * height);
      for (let y = 0; y < height; y++) {
        let sum = 0;
        for (let x = 0; x < width; x++) {
          const i = y * width + x;
          sum += grayData[i];
          if (y === 0) {
            integral[i] = sum;
          } else {
            integral[i] = integral[i - width] + sum;
          }
        }
      }

      // ウィンドウサイズ S と 閾値の定数 t
      const S = Math.max(2, Math.floor(width / 16));
      const s2 = Math.floor(S / 2);
      const t = 0.15; // Bradley-Roth法などでの一般的なオフセット

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const gray = grayData[idx];

          if (removeBleedThrough && gray > 200) {
            data[idx * 4] = data[idx * 4 + 1] = data[idx * 4 + 2] = 255;
            continue;
          }

          const x1 = Math.max(x - s2, 0);
          const x2 = Math.min(x + s2, width - 1);
          const y1 = Math.max(y - s2, 0);
          const y2 = Math.min(y + s2, height - 1);

          const count = (x2 - x1 + 1) * (y2 - y1 + 1);
          let sum = integral[y2 * width + x2];
          if (x1 > 0) sum -= integral[y2 * width + (x1 - 1)];
          if (y1 > 0) sum -= integral[(y1 - 1) * width + x2];
          if (x1 > 0 && y1 > 0) sum += integral[(y1 - 1) * width + (x1 - 1)];

          const average = sum / count;
          // 適応的閾値: 局所平均から t(15%) 引いた値より明るければ白(255)、暗ければ黒(0)
          const val = gray <= average * (1 - t) ? 0 : 255;
          
          data[idx * 4] = data[idx * 4 + 1] = data[idx * 4 + 2] = val;
        }
      }
    } else {
      for (let i = 0; i < data.length; i += 4) {
        const gray = grayData[i / 4];
        let val = gray;
        if (removeBleedThrough && gray > 200) {
          val = 255;
        } else {
          val = gray >= threshold ? 255 : 0;
        }
        data[i] = data[i + 1] = data[i + 2] = val;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};
