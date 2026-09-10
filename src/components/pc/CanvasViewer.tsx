import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../../store/useScoreStore';
import { renderPage, PREVIEW_SCALE, calcDeskewAngle } from '../../engine';

export const CanvasViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const {
    pages,
    selectedPageId,
    paperPreset,
    globalConfig,
    viewMode,
    updatePage,
  } = useStore();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  type ToolMode = 'pan' | 'crop' | 'deskew' | 'whiteout';
  const [activeTool, setActiveTool] = useState<ToolMode>('pan');

  /** 傾き補正用2点クリック */
  const [deskewPoint1, setDeskewPoint1] = useState<{ x: number; y: number } | null>(null);

  /** ドラッグ領域 (crop, whiteout) */
  const [dragRect, setDragRect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  /** マウスホイールズーム（カーソル中心） */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => Math.max(0.1, Math.min(5, prev * delta)));
    },
    []
  );

  /** Space+ドラッグでパン */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsPanning(true);
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
      }
      // S: 分割ガイドトグル（将来の拡張ポイント）
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false);
        if (containerRef.current) containerRef.current.style.cursor = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Space dragging overrides all tools
      if (isPanning) {
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
        return;
      }

      const rect = canvasContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      if (activeTool === 'pan') {
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      } else if (activeTool === 'crop' || activeTool === 'whiteout') {
        setDragRect({ startX: x, startY: y, currentX: x, currentY: y });
      } else if (activeTool === 'deskew' && selectedPage) {
        if (!deskewPoint1) {
          setDeskewPoint1({ x, y });
        } else {
          const deskewData = calcDeskewAngle(deskewPoint1.x, deskewPoint1.y, x, y);
          updatePage(selectedPage.id, { deskew: deskewData });
          setDeskewPoint1(null);
          setActiveTool('pan');
        }
      }
    },
    [isPanning, pan, activeTool, deskewPoint1, selectedPage, updatePage, zoom]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && e.buttons === 1) {
        setPan({
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        });
      } else if (dragRect && e.buttons === 1) {
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;
        setDragRect(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
      }
    },
    [isPanning, dragRect, zoom, pan]
  );

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pan' && isPanning && !e.shiftKey /* checking spacebar might be better but isPanning is enough */) {
      // We don't reset isPanning if Spacebar is held (handled in keyUp)
      // But if it was triggered by mouse down in pan mode, we can reset here.
      // For simplicity, just let keyup handle space pan.
    }
    
    if (dragRect && selectedPage) {
      const { startX, startY, currentX, currentY } = dragRect;
      const w = Math.abs(currentX - startX);
      const h = Math.abs(currentY - startY);
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);

      if (w > 5 && h > 5) {
        if (activeTool === 'crop') {
          updatePage(selectedPage.id, { cropBox: { x, y, w, h } });
        } else if (activeTool === 'whiteout') {
          const newRects = [...(selectedPage.whiteoutRects || []), { id: crypto.randomUUID(), x, y, w, h }];
          updatePage(selectedPage.id, { whiteoutRects: newRects });
        }
      }
      setDragRect(null);
    }
  }, [dragRect, activeTool, selectedPage, updatePage, isPanning]);

  /** ホイールイベント登録（passive: false必須） */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  /** キャンバスレンダリング */
  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    let cancelled = false;
    const canvases: HTMLCanvasElement[] = [];

    const render = async () => {
      container.innerHTML = '';

      // 表示するページを決定
      const pagesToRender = selectedPage ? [selectedPage] : pages.slice(0, 1);
      if (pagesToRender.length === 0) return;

      for (const page of pagesToRender) {
        if (cancelled) return;

        if (page.pageType === 'spread' && !page.isBlank) {
          // 見開き: 左右を並べて表示
          const wrapper = document.createElement('div');
          wrapper.style.display = 'flex';
          wrapper.style.gap = '4px';

          for (const side of ['left', 'right'] as const) {
            const c = await renderPage(
              page,
              paperPreset,
              side,
              PREVIEW_SCALE,
              globalConfig.margins,
              globalConfig.accordionBindingMode
            );
            if (cancelled) { c.width = 0; c.height = 0; return; }
            canvases.push(c);
            wrapper.appendChild(c);
          }
          container.appendChild(wrapper);
        } else {
          const c = await renderPage(
            page,
            paperPreset,
            'single',
            PREVIEW_SCALE,
            globalConfig.margins,
            globalConfig.accordionBindingMode
          );
          if (cancelled) { c.width = 0; c.height = 0; return; }
          canvases.push(c);
          container.appendChild(c);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
      for (const c of canvases) {
        c.width = 0;
        c.height = 0;
      }
      container.innerHTML = '';
    };
  }, [selectedPage, pages, paperPreset, globalConfig, viewMode]);

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-[#0a0c12] overflow-hidden relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ツールバー */}
      <div className="absolute top-2 left-2 z-10 flex gap-1 bg-slate-panel/80 p-1 rounded border border-slate-border">
        <button
          onClick={() => setActiveTool('pan')}
          className={`px-2 py-1 text-[10px] rounded ${activeTool === 'pan' ? 'bg-blue-600' : 'hover:bg-slate-panel'}`}
        >
          ✋ パン
        </button>
        <button
          onClick={() => setActiveTool('crop')}
          className={`px-2 py-1 text-[10px] rounded ${activeTool === 'crop' ? 'bg-blue-600' : 'hover:bg-slate-panel'}`}
        >
          ✂️ クロップ
        </button>
        <button
          onClick={() => setActiveTool('deskew')}
          className={`px-2 py-1 text-[10px] rounded ${activeTool === 'deskew' ? 'bg-orange-600' : 'hover:bg-slate-panel'}`}
        >
          📐 傾き(2点)
        </button>
        <button
          onClick={() => setActiveTool('whiteout')}
          className={`px-2 py-1 text-[10px] rounded ${activeTool === 'whiteout' ? 'bg-blue-600' : 'hover:bg-slate-panel'}`}
        >
          ⬜️ 修正テープ
        </button>
        <div className="w-px bg-slate-border mx-1" />
        <button onClick={() => setZoom(1)} className="px-2 py-1 text-[10px] hover:bg-slate-panel">1:1</button>
        <button onClick={() => setZoom((z) => Math.min(5, z * 1.25))} className="px-2 py-1 text-[10px] hover:bg-slate-panel">＋</button>
        <button onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))} className="px-2 py-1 text-[10px] hover:bg-slate-panel">ー</button>
        <span className="text-[10px] text-gray-500 self-center ml-2">{Math.round(zoom * 100)}%</span>
      </div>

      {activeTool === 'deskew' && (
        <div className="absolute top-12 left-2 z-10 text-[10px] text-orange-300 bg-black/50 px-2 py-1 rounded">
          {deskewPoint1 ? '2点目をクリック: 五線の右端' : '1点目をクリック: 五線の左端'}
        </div>
      )}

      {/* キャンバス表示領域 */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {activeTool === 'deskew' && (
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)', backgroundSize: '50px 50px', opacity: 0.2 }} />
        )}
        
        {dragRect && (
          <div 
            className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none"
            style={{
              left: Math.min(dragRect.startX, dragRect.currentX),
              top: Math.min(dragRect.startY, dragRect.currentY),
              width: Math.abs(dragRect.currentX - dragRect.startX),
              height: Math.abs(dragRect.currentY - dragRect.startY),
            }}
          />
        )}
      </div>

      {pages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
          PDFを読み込むか、サンプルスコアを生成してください
        </div>
      )}
    </div>
  );
};
