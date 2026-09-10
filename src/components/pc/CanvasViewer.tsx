
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useScoreStore';
import { computeCropRect } from '../../engine/geometry';

export const CanvasViewer = () => {
  const { pages, selectedPageId, globalConfig } = useStore();
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState<number | 'fit'>('fit');
  const [activeTool, setActiveTool] = useState<'pan' | 'crop' | 'deskew'>('pan');
  
  const [previewImage, setPreviewImage] = useState<{ canvas: HTMLCanvasElement; origW: number; origH: number } | null>(null);

  // 1. Generate lightweight preview asynchronously
  useEffect(() => {
    if (!selectedPage?.imageUrl) return;
    let isCancelled = false;
    const img = new Image();
    img.onload = async () => {
      if (isCancelled) return;
      const MAX_DIM = 1200;
      let origW = img.width;
      let origH = img.height;
      let w = origW;
      let h = origH;
      if (w > MAX_DIM || h > MAX_DIM) {
        const s = Math.min(MAX_DIM / w, MAX_DIM / h);
        w = Math.floor(w * s);
        h = Math.floor(h * s);
      }
      
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      
      await new Promise(r => setTimeout(r, 0)); // Yield to main thread
      if (isCancelled) return;

      const settings = selectedPage.overrideSettings ? { ...globalConfig.processSettings, ...selectedPage.overrideSettings } : globalConfig.processSettings;
      if (settings.outputColorMode !== 'original') {
        const { applyColorMode } = await import('../../engine/filterEngine');
        const processed = applyColorMode(ctx, w, h, settings);
        ctx.putImageData(processed, 0, 0);
      }

      if (!isCancelled) {
        setPreviewImage({ canvas: c, origW, origH });
      }
    };
    img.src = selectedPage.imageUrl;
    return () => { isCancelled = true; };
  }, [selectedPage?.imageUrl, selectedPage?.overrideSettings, globalConfig.processSettings]);

  // 2. Draw to main canvas
  useEffect(() => {
    if (!previewImage || !canvasRef.current || !containerRef.current) return;
    
    const { canvas: prevC, origW, origH } = previewImage;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    
    let drawScale = 1;
    if (scale === 'fit') {
      drawScale = Math.min((cw - 40) / origW, (ch - 40) / origH);
    } else {
      drawScale = scale;
    }
    
    const w = origW * drawScale;
    const h = origH * drawScale;
    canvasRef.current.width = w;
    canvasRef.current.height = h;

    ctx.save();
    // Rotation
    ctx.translate(w / 2, h / 2);
    ctx.rotate((selectedPage!.rotation * Math.PI) / 180);
    ctx.drawImage(prevC, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Draw crop rect
    const settings = selectedPage!.overrideSettings ? { ...globalConfig.processSettings, ...selectedPage!.overrideSettings } : globalConfig.processSettings;
    const crop = computeCropRect(origW, origH, settings);
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x0 * drawScale, crop.y0 * drawScale, (crop.x1 - crop.x0) * drawScale, (crop.y1 - crop.y0) * drawScale);
    
    // 暗転マスク
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, w, crop.y0 * drawScale); // Top
    ctx.fillRect(0, crop.y1 * drawScale, w, h - crop.y1 * drawScale); // Bottom
    ctx.fillRect(0, crop.y0 * drawScale, crop.x0 * drawScale, (crop.y1 - crop.y0) * drawScale); // Left
    ctx.fillRect(crop.x1 * drawScale, crop.y0 * drawScale, w - crop.x1 * drawScale, (crop.y1 - crop.y0) * drawScale); // Right

    // 8点ハンドル
    if (activeTool === 'crop') {
      const hSize = 8;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      const cx0 = crop.x0 * drawScale; const cx1 = crop.x1 * drawScale;
      const cy0 = crop.y0 * drawScale; const cy1 = crop.y1 * drawScale;
      const pts = [
        [cx0, cy0], [cx0 + (cx1 - cx0) / 2, cy0], [cx1, cy0],
        [cx0, cy0 + (cy1 - cy0) / 2],             [cx1, cy0 + (cy1 - cy0) / 2],
        [cx0, cy1], [cx0 + (cx1 - cx0) / 2, cy1], [cx1, cy1]
      ];
      pts.forEach(([px, py]) => {
        ctx.fillRect(px - hSize/2, py - hSize/2, hSize, hSize);
        ctx.strokeRect(px - hSize/2, py - hSize/2, hSize, hSize);
      });
    }

    // Draw split line if spread
    if (settings.pageProcessingMode === 'spread_split') {
      const cropW = crop.x1 - crop.x0;
      const offsetPx = (settings.splitOffsetPercent / 100.0) * cropW;
      const splitX = crop.x0 + Math.max(1, Math.min(cropW - 1, (cropW / 2) + offsetPx));

      ctx.strokeStyle = '#ff7b00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX * drawScale, crop.y0 * drawScale);
      ctx.lineTo(splitX * drawScale, crop.y1 * drawScale);
      ctx.stroke();
    }
  }, [selectedPage, scale, globalConfig, previewImage, activeTool]);

  if (!selectedPage) {
    return <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center text-gray-500">No Page Selected</div>;
  }

  const handleZoomIn = () => setScale(s => s === 'fit' ? 1.2 : Math.min(3, s + 0.2));
  const handleZoomOut = () => setScale(s => s === 'fit' ? 0.8 : Math.max(0.2, s - 0.2));

  return (
    <div className="flex-1 flex flex-col relative bg-[#1e1e1e] overflow-hidden" ref={containerRef}>
      {/* Zoom HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur rounded-full px-4 py-1.5 flex items-center gap-4 z-10 border border-slate-700 shadow-xl">
        <button onClick={handleZoomOut} className="text-gray-300 hover:text-white px-2">-</button>
        <span className="text-xs font-mono text-gray-200 w-12 text-center">
          {scale === 'fit' ? 'Fit' : `${Math.round(scale * 100)}%`}
        </span>
        <button onClick={() => setScale(1)} className="text-xs text-gray-400 hover:text-white">100%</button>
        <button onClick={() => setScale('fit')} className="text-xs text-gray-400 hover:text-white">全体表示</button>
        <button onClick={handleZoomIn} className="text-gray-300 hover:text-white px-2">+</button>
      </div>

      <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur rounded px-2 py-1 flex items-center gap-2 z-10 border border-slate-700">
        <button onClick={() => setActiveTool('pan')} className={`px-2 py-1 text-xs rounded ${activeTool==='pan'?'bg-blue-600':'text-gray-400'}`}>✋ Pan</button>
        <button onClick={() => setActiveTool('crop')} className={`px-2 py-1 text-xs rounded ${activeTool==='crop'?'bg-blue-600':'text-gray-400'}`}>✂️ Crop</button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center">
        <canvas ref={canvasRef} className="shadow-2xl" />
      </div>
    </div>
  );
};
