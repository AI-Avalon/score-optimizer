import { useEffect, useRef } from 'react';
import type { Page, Preset } from '../types';
import { renderPageToCanvas } from '../engine';

interface Props {
  page: Page;
  preset: Preset;
  side: 'left' | 'right' | 'single';
  previewScale?: number;
}

export const CanvasPreview = ({ page, preset, side, previewScale = 0.2 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let currentCanvas: HTMLCanvasElement | null = null;
    
    const load = async () => {
      try {
        const canvas = await renderPageToCanvas(page, preset, side, previewScale);
        if (!active) {
          canvas.width = 0;
          canvas.height = 0;
          return;
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(canvas);
          currentCanvas = canvas;
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
    return () => {
      active = false;
      if (currentCanvas) {
        currentCanvas.width = 0;
        currentCanvas.height = 0;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [page, preset, side, previewScale]);

  return <div ref={containerRef} className="shadow-2xl flex-shrink-0" />;
};
