import { Page, Preset } from './types';

export const DPI = 300;
const MM_TO_INCH = 1 / 25.4;

export const mmToPx = (mm: number, scale = 1.0) => Math.round(mm * MM_TO_INCH * DPI * scale);

export const renderPageToCanvas = async (
  page: Page,
  preset: Preset,
  side: 'left' | 'right' | 'single',
  scale = 1.0
): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('No 2d context'));

    const widthPx = mmToPx(preset.widthMm, scale);
    const heightPx = mmToPx(preset.heightMm, scale);
    canvas.width = widthPx;
    canvas.height = heightPx;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, heightPx);

    if (!page.imageUrl) {
      return resolve(canvas);
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      if (page.isLandscape && side !== 'single') {
        // Split landscape
        const splitX = img.width * (page.spineGuide / 100);
        if (side === 'left') {
          // Draw left half
          ctx.drawImage(img, 0, 0, splitX, img.height, 0, 0, widthPx, heightPx);
        } else {
          // Draw right half
          ctx.drawImage(img, splitX, 0, img.width - splitX, img.height, 0, 0, widthPx, heightPx);
        }
      } else {
        // Single page
        ctx.drawImage(img, 0, 0, widthPx, heightPx);
      }

      // Gutter shadow mask (white gradient)
      if (side === 'left' && page.rightMaskOffset > 0) {
        const maskWidth = mmToPx(page.rightMaskOffset, scale);
        const grad = ctx.createLinearGradient(widthPx - maskWidth, 0, widthPx, 0);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, 'rgba(255,255,255,1)');
        ctx.fillStyle = grad;
        ctx.fillRect(widthPx - maskWidth, 0, maskWidth, heightPx);
      } else if (side === 'right' && page.leftMaskOffset > 0) {
        const maskWidth = mmToPx(page.leftMaskOffset, scale);
        const grad = ctx.createLinearGradient(0, 0, maskWidth, 0);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, maskWidth, heightPx);
      }

      resolve(canvas);
    };
    img.onerror = reject;
    img.src = page.imageUrl;
  });
};
