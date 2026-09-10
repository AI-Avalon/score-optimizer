import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useScoreStore';
import { computeCropRect } from '../../engine/geometry';

export const CanvasViewer = () => {
  const { pages, selectedPageId, globalConfig, updatePage, setGlobalConfig } = useStore();
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState<number | 'fit'>('fit');
  const [activeTool, setActiveTool] = useState<'pan' | 'crop'>('crop');
  
  const [previewImage, setPreviewImage] = useState<{ 
    canvas: HTMLCanvasElement; 
    origW: number; 
    origH: number;
    detectedBBox?: {x0:number, y0:number, x1:number, y1:number}
  } | null>(null);

  const [dragState, setDragState] = useState<{
    handle: string;
    startX: number;
    startY: number;
    startSettings: any;
  } | null>(null);

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
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, w, h);
      
      await new Promise(r => setTimeout(r, 0)); // Yield to main thread
      if (isCancelled) return;

      const settings = selectedPage.overrideSettings ? { ...globalConfig.processSettings, ...selectedPage.overrideSettings } : globalConfig.processSettings;
      
      let detectedBBox = undefined;
      if (settings.autoCropEnabled) {
        const { detectContentBBox } = await import('../../engine/geometry');
        const bbox = detectContentBBox(ctx, w, h, settings.blackMarginThreshold);
        detectedBBox = {
          x0: bbox.x0 * (origW / w),
          y0: bbox.y0 * (origH / h),
          x1: bbox.x1 * (origW / w),
          y1: bbox.y1 * (origH / h)
        };
      }

      if (settings.outputColorMode !== 'original') {
        const { applyColorMode } = await import('../../engine/filterEngine');
        const processed = applyColorMode(ctx, w, h, settings);
        ctx.putImageData(processed, 0, 0);
      }

      if (!isCancelled) {
        setPreviewImage({ canvas: c, origW, origH, detectedBBox });
      }
    };
    img.src = selectedPage.imageUrl;
    return () => { isCancelled = true; };
  }, [selectedPage?.imageUrl, selectedPage?.overrideSettings, globalConfig.processSettings]);

  // 2. Draw to main canvas
  useEffect(() => {
    if (!previewImage || !canvasRef.current || !containerRef.current) return;
    
    const { canvas: prevC, origW, origH, detectedBBox } = previewImage;
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
    const dpr = window.devicePixelRatio || 1;
    
    canvasRef.current.width = w * dpr;
    canvasRef.current.height = h * dpr;
    canvasRef.current.style.width = `${w}px`;
    canvasRef.current.style.height = `${h}px`;
    
    ctx.scale(dpr, dpr);
    ctx.save();
    // Rotation
    ctx.translate(w / 2, h / 2);
    ctx.rotate((selectedPage!.rotation * Math.PI) / 180);
    ctx.drawImage(prevC, -w / 2, -h / 2, w, h);
    ctx.restore();

    // Draw crop rect
    const settings = selectedPage!.overrideSettings ? { ...globalConfig.processSettings, ...selectedPage!.overrideSettings } : globalConfig.processSettings;
    const crop = computeCropRect(origW, origH, settings, detectedBBox);
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x0 * drawScale, crop.y0 * drawScale, (crop.x1 - crop.x0) * drawScale, (crop.y1 - crop.y0) * drawScale);
    
    // 暗転マスク
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, 0, w, crop.y0 * drawScale); // Top
    ctx.fillRect(0, crop.y1 * drawScale, w, h - crop.y1 * drawScale); // Bottom
    ctx.fillRect(0, crop.y0 * drawScale, crop.x0 * drawScale, (crop.y1 - crop.y0) * drawScale); // Left
    ctx.fillRect(crop.x1 * drawScale, crop.y0 * drawScale, w - crop.x1 * drawScale, (crop.y1 - crop.y0) * drawScale); // Right

    // 8点ハンドルと分割線
    if (activeTool === 'crop') {
      const cropW = crop.x1 - crop.x0;
      let splitX = -1;
      if (settings.pageProcessingMode === 'spread_split') {
        const offsetPx = (settings.splitOffsetPercent / 100.0) * cropW;
        splitX = crop.x0 + Math.max(1, Math.min(cropW - 1, (cropW / 2) + offsetPx));

        ctx.strokeStyle = '#ff7b00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(splitX * drawScale, crop.y0 * drawScale);
        ctx.lineTo(splitX * drawScale, crop.y1 * drawScale);
        ctx.stroke();
        
        // Split handle
        ctx.fillStyle = '#ff7b00';
        ctx.fillRect(splitX * drawScale - 6, (crop.y0 + (crop.y1 - crop.y0)/2) * drawScale - 15, 12, 30);
      }

      const hSize = 12;
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
  }, [selectedPage, scale, globalConfig, previewImage, activeTool]);

  if (!selectedPage) {
    return <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center text-gray-500">No Page Selected</div>;
  }

  const handleZoomIn = () => setScale(s => s === 'fit' ? 1.2 : Math.min(3, s + 0.2));
  const handleZoomOut = () => setScale(s => s === 'fit' ? 0.8 : Math.max(0.2, s - 0.2));

  // --- ドラッグインタラクション ---
  const getPointerPos = (e: React.PointerEvent) => {
    if (!canvasRef.current || !previewImage) return { x: 0, y: 0, drawScale: 1 };
    const rect = canvasRef.current.getBoundingClientRect();
    const cw = containerRef.current?.clientWidth || 1;
    const ch = containerRef.current?.clientHeight || 1;
    let drawScale = 1;
    if (scale === 'fit') {
      drawScale = Math.min((cw - 40) / previewImage.origW, (ch - 40) / previewImage.origH);
    } else {
      drawScale = scale;
    }
    return {
      x: (e.clientX - rect.left) / drawScale,
      y: (e.clientY - rect.top) / drawScale,
      drawScale
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (activeTool !== 'crop' || !previewImage) return;
    const { x, y, drawScale } = getPointerPos(e);
    
    const settings = selectedPage.overrideSettings ? { ...globalConfig.processSettings, ...selectedPage.overrideSettings } : globalConfig.processSettings;
    const crop = computeCropRect(previewImage.origW, previewImage.origH, settings, previewImage.detectedBBox);
    
    const hitTest = (px: number, py: number, targetX: number, targetY: number, tolerance = 15) => {
      return Math.abs(px - targetX) < tolerance / drawScale && Math.abs(py - targetY) < tolerance / drawScale;
    };
    
    const cx0 = crop.x0; const cx1 = crop.x1;
    const cy0 = crop.y0; const cy1 = crop.y1;
    const cmx = cx0 + (cx1 - cx0) / 2;
    const cmy = cy0 + (cy1 - cy0) / 2;

    let hit = null;
    if (hitTest(x, y, cx0, cy0)) hit = 'tl';
    else if (hitTest(x, y, cmx, cy0)) hit = 'tc';
    else if (hitTest(x, y, cx1, cy0)) hit = 'tr';
    else if (hitTest(x, y, cx0, cmy)) hit = 'ml';
    else if (hitTest(x, y, cx1, cmy)) hit = 'mr';
    else if (hitTest(x, y, cx0, cy1)) hit = 'bl';
    else if (hitTest(x, y, cmx, cy1)) hit = 'bc';
    else if (hitTest(x, y, cx1, cy1)) hit = 'br';

    if (!hit && settings.pageProcessingMode === 'spread_split') {
      const cropW = cx1 - cx0;
      const offsetPx = (settings.splitOffsetPercent / 100.0) * cropW;
      const splitX = cx0 + Math.max(1, Math.min(cropW - 1, (cropW / 2) + offsetPx));
      if (Math.abs(x - splitX) < 15 / drawScale && y > cy0 && y < cy1) {
        hit = 'split';
      }
    }

    if (hit) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragState({
        handle: hit,
        startX: x,
        startY: y,
        startSettings: { ...settings }
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState || !previewImage) return;
    const { x, y } = getPointerPos(e);
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;
    
    const settings = dragState.startSettings;
    const baseBBox = previewImage.detectedBBox || { x0: 0, y0: 0, x1: previewImage.origW, y1: previewImage.origH };
    const baseW = Math.max(1, baseBBox.x1 - baseBBox.x0);
    const baseH = Math.max(1, baseBBox.y1 - baseBBox.y0);

    const newSettings = { ...settings };
    
    const startLeftTrimPx = baseW * (settings.manualTrimLeftPercent / 100.0);
    const startRightTrimPx = baseW * (settings.manualTrimRightPercent / 100.0);
    const startTopTrimPx = baseH * (settings.manualTrimTopPercent / 100.0);
    const startBottomTrimPx = baseH * (settings.manualTrimBottomPercent / 100.0);

    if (dragState.handle.includes('l')) {
      newSettings.manualTrimLeftPercent = Math.max(0, Math.min(100, ((startLeftTrimPx + dx) / baseW) * 100));
    }
    if (dragState.handle.includes('r')) {
      newSettings.manualTrimRightPercent = Math.max(0, Math.min(100, ((startRightTrimPx - dx) / baseW) * 100));
    }
    if (dragState.handle.includes('t')) {
      newSettings.manualTrimTopPercent = Math.max(0, Math.min(100, ((startTopTrimPx + dy) / baseH) * 100));
    }
    if (dragState.handle.includes('b')) {
      newSettings.manualTrimBottomPercent = Math.max(0, Math.min(100, ((startBottomTrimPx - dy) / baseH) * 100));
    }
    if (dragState.handle === 'split') {
      const oldCrop = computeCropRect(previewImage.origW, previewImage.origH, settings, previewImage.detectedBBox);
      const cropW = oldCrop.x1 - oldCrop.x0;
      const startOffsetPx = (settings.splitOffsetPercent / 100.0) * cropW;
      newSettings.splitOffsetPercent = Math.max(-50, Math.min(50, ((startOffsetPx + dx) / cropW) * 100));
    }

    if (selectedPage.overrideSettings) {
      updatePage(selectedPage.id, { overrideSettings: newSettings });
    } else {
      setGlobalConfig({ processSettings: newSettings });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragState(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#0D0F12] overflow-hidden" ref={containerRef}>
      {/* Zoom HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#161922]/90 backdrop-blur-md rounded-full px-5 py-2 flex items-center gap-5 z-10 border border-[#272B35] shadow-2xl">
        <button onClick={handleZoomOut} className="text-gray-300 hover:text-white px-2 cursor-pointer font-bold">-</button>
        <span className="text-xs font-mono text-gray-200 w-12 text-center select-none">
          {scale === 'fit' ? 'Fit' : `${Math.round(scale * 100)}%`}
        </span>
        <button onClick={() => setScale(1)} className="text-xs text-gray-400 hover:text-white cursor-pointer select-none">100%</button>
        <button onClick={() => setScale('fit')} className="text-xs text-gray-400 hover:text-white cursor-pointer select-none">全体表示</button>
        <button onClick={handleZoomIn} className="text-gray-300 hover:text-white px-2 cursor-pointer font-bold">+</button>
      </div>

      <div className="absolute top-4 left-4 bg-[#161922]/90 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 z-10 border border-[#272B35] shadow-xl">
        <button onClick={() => setActiveTool('pan')} className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors cursor-pointer select-none ${activeTool==='pan'?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>✋ Pan</button>
        <button onClick={() => setActiveTool('crop')} className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors cursor-pointer select-none ${activeTool==='crop'?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>✂️ Crop</button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        <canvas 
          ref={canvasRef} 
          className="shadow-[0_20px_50px_rgba(0,0,0,0.5)] touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
    </div>
  );
};
