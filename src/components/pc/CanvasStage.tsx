import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useStore } from '../../store/useScoreStore';
import { computeCropRect } from '../../engine/cropEngine';
import { toGray } from '../../engine/filterEngine';

export const CanvasStage = () => {
  const { pages, selectedPageId, settings, pageOverrides, updateSettings } = useStore();
  const selectedIndex = pages.findIndex(p => p.id === selectedPageId);
  const selectedPage = pages[selectedIndex];
  
  const activeSettings = (selectedIndex !== -1 && pageOverrides[selectedIndex]) 
    ? { ...settings, ...pageOverrides[selectedIndex] } 
    : settings;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState<number | 'fit'>('fit');
  const [activeTool] = useState<'pan' | 'crop'>('crop');
  
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

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // 1. Generate lightweight preview asynchronously
  useEffect(() => {
    if (!selectedPage?.originalImage) return;
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

      let detectedBBox = undefined;
      if (activeSettings.auto_crop_enabled) {
        const { detectContentBbox } = await import('../../engine/cropEngine');
        const imgData = ctx.getImageData(0, 0, w, h);
        const gray = toGray(imgData);
        const bbox = detectContentBbox(gray, w, h, activeSettings.black_margin_threshold, activeSettings.crop_padding_px);
        detectedBBox = {
          x0: bbox.x0 * (origW / w),
          y0: bbox.y0 * (origH / h),
          x1: bbox.x1 * (origW / w),
          y1: bbox.y1 * (origH / h)
        };
      }

      if (activeSettings.output_color_mode === 'monochrome') {
        const { binarizeFixed, binarizeAdaptive } = await import('../../engine/filterEngine');
        const imgData = ctx.getImageData(0, 0, w, h);
        let processed;
        if (activeSettings.use_adaptive_threshold) {
           processed = binarizeAdaptive(imgData);
        } else {
           processed = binarizeFixed(imgData, activeSettings.fixed_threshold);
        }
        ctx.putImageData(processed, 0, 0);
      }

      if (!isCancelled) {
        setPreviewImage({ canvas: c, origW, origH, detectedBBox });
      }
    };
    img.src = selectedPage.originalImage;
    return () => { isCancelled = true; };
  }, [selectedPage?.originalImage, activeSettings]);

  // 2. Draw to main canvas
  useEffect(() => {
    if (!previewImage || !canvasRef.current || !containerRef.current) return;
    
    const { canvas: prevC, origW, origH, detectedBBox } = previewImage;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const cw = containerSize.w || containerRef.current.clientWidth;
    const ch = containerSize.h || containerRef.current.clientHeight;
    
    let drawScale = 1;
    if (scale === 'fit') {
      const availW = Math.max(10, cw - 40);
      const availH = Math.max(10, ch - 40);
      drawScale = Math.max(0.01, Math.min(availW / origW, availH / origH));
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
    ctx.drawImage(prevC, 0, 0, w, h);
    ctx.restore();

    // Draw crop rect
    const crop = computeCropRect(origW, origH, activeSettings, detectedBBox);
    
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
      if (activeSettings.page_processing_mode === 'spread_split') {
        const offsetPx = (activeSettings.split_offset_percent / 100.0) * cropW;
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
  }, [selectedPage, scale, activeSettings, previewImage, activeTool, containerSize]);

  if (!selectedPage) {
    return <div className="flex-1 bg-[#0D0F12] flex items-center justify-center text-gray-500 text-sm">PDFを読み込んでください</div>;
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
    
    const crop = computeCropRect(previewImage.origW, previewImage.origH, activeSettings, previewImage.detectedBBox);
    
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

    if (!hit && activeSettings.page_processing_mode === 'spread_split') {
      const cropW = cx1 - cx0;
      const offsetPx = (activeSettings.split_offset_percent / 100.0) * cropW;
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
        startSettings: { ...activeSettings }
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState || !previewImage) return;
    const { x, y } = getPointerPos(e);
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;
    
    const startSet = dragState.startSettings;
    const baseBBox = previewImage.detectedBBox || { x0: 0, y0: 0, x1: previewImage.origW, y1: previewImage.origH };
    const baseW = Math.max(1, baseBBox.x1 - baseBBox.x0);
    const baseH = Math.max(1, baseBBox.y1 - baseBBox.y0);

    const newSet = { ...startSet };
    
    const startLeftTrimPx = baseW * (startSet.manual_trim_left_percent / 100.0);
    const startRightTrimPx = baseW * (startSet.manual_trim_right_percent / 100.0);
    const startTopTrimPx = baseH * (startSet.manual_trim_top_percent / 100.0);
    const startBottomTrimPx = baseH * (startSet.manual_trim_bottom_percent / 100.0);

    if (dragState.handle.includes('l')) {
      newSet.manual_trim_left_percent = Math.max(0, Math.min(100, ((startLeftTrimPx + dx) / baseW) * 100));
    }
    if (dragState.handle.includes('r')) {
      newSet.manual_trim_right_percent = Math.max(0, Math.min(100, ((startRightTrimPx - dx) / baseW) * 100));
    }
    if (dragState.handle.includes('t')) {
      newSet.manual_trim_top_percent = Math.max(0, Math.min(100, ((startTopTrimPx + dy) / baseH) * 100));
    }
    if (dragState.handle.includes('b')) {
      newSet.manual_trim_bottom_percent = Math.max(0, Math.min(100, ((startBottomTrimPx - dy) / baseH) * 100));
    }
    if (dragState.handle === 'split') {
      const oldCrop = computeCropRect(previewImage.origW, previewImage.origH, startSet, previewImage.detectedBBox);
      const cropW = oldCrop.x1 - oldCrop.x0;
      const startOffsetPx = (startSet.split_offset_percent / 100.0) * cropW;
      newSet.split_offset_percent = Math.max(-20, Math.min(20, ((startOffsetPx + dx) / cropW) * 100));
    }

    updateSettings(newSet); // Update globally for simplicity. If overridden, it'll update global, user should save manually if desired, but let's update global.
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
        <button onClick={() => setScale(1)} className="text-[10px] text-gray-400 hover:text-white cursor-pointer select-none font-medium">100%</button>
        <button onClick={() => setScale('fit')} className="text-[10px] text-gray-400 hover:text-white cursor-pointer select-none font-medium">全体表示</button>
        <button onClick={handleZoomIn} className="text-gray-300 hover:text-white px-2 cursor-pointer font-bold">+</button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        <canvas 
          ref={canvasRef} 
          className="shadow-[0_20px_50px_rgba(0,0,0,0.5)] touch-none bg-[#1e1e1e]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      </div>
    </div>
  );
};
