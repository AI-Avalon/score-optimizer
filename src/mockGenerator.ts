import type { Page } from './types';

export const createMockScore = async (): Promise<Page> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    // A3 Landscape for mockup (420 x 297 mm at 300DPI)
    const pxPerInch = 300;
    const width = Math.round((420 / 25.4) * pxPerInch);
    const height = Math.round((297 / 25.4) * pxPerInch);
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, width, height);

      // Draw staff lines
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 2;
      for (let xOffset of [0, width / 2]) {
        for (let i = 0; i < 10; i++) {
          const yStart = 200 + i * 150;
          for (let j = 0; j < 5; j++) {
            ctx.beginPath();
            ctx.moveTo(xOffset + 100, yStart + j * 15);
            ctx.lineTo(xOffset + (width / 2) - 100, yStart + j * 15);
            ctx.stroke();
          }
        }
      }

      // Add dummy notes
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 80px serif';
      ctx.fillText('Violin I', 200, 150);
      ctx.fillText('Violin I', width / 2 + 200, 150);

      // Spine shadow effect in the middle
      const gradient = ctx.createLinearGradient(width / 2 - 50, 0, width / 2 + 50, 0);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(width / 2 - 50, 0, 100, height);
    }
    
    const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
    // FREE MEMORY
    canvas.width = 0;
    canvas.height = 0;

    resolve({
      id: Math.random().toString(36).substr(2, 9),
      imageUrl,
      width,
      height,
      isLandscape: true,
      leftMaskOffset: 10,
      rightMaskOffset: 10,
      spineGuide: 50, // 50%
      whiteoutMasks: [],
      stamps: []
    });
  });
};
