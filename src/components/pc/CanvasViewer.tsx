import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../../store';
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

  /** 傾き補正用2点クリック */
  const [deskewMode, setDeskewMode] = useState(false);
  const [deskewPoint1, setDeskewPoint1] = useState<{ x: number; y: number } | null>(null);

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
      if (isPanning) {
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      }
      // 傾き補正2点クリック
      if (deskewMode && selectedPage) {
        const rect = canvasContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (!deskewPoint1) {
          setDeskewPoint1({ x, y });
        } else {
          const angle = calcDeskewAngle(deskewPoint1.x, deskewPoint1.y, x, y);
          updatePage(selectedPage.id, { deskew: angle });
          setDeskewPoint1(null);
          setDeskewMode(false);
        }
      }
    },
    [isPanning, pan, deskewMode, deskewPoint1, selectedPage, updatePage]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && e.buttons === 1) {
        setPan({
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        });
      }
    },
    [isPanning]
  );

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

        if (page.isSpread && !page.skipSplit && !page.isBlank) {
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
    >
      {/* ツールバー */}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        <button
          onClick={() => setZoom(1)}
          className="px-2 py-1 text-[10px] bg-slate-panel/80 hover:bg-slate-panel rounded border border-slate-border"
        >
          1:1
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(5, z * 1.25))}
          className="px-2 py-1 text-[10px] bg-slate-panel/80 hover:bg-slate-panel rounded border border-slate-border"
        >
          ＋
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}
          className="px-2 py-1 text-[10px] bg-slate-panel/80 hover:bg-slate-panel rounded border border-slate-border"
        >
          ー
        </button>
        <button
          onClick={() => setDeskewMode(!deskewMode)}
          className={`px-2 py-1 text-[10px] rounded border border-slate-border ${
            deskewMode
              ? 'bg-orange-600 text-white'
              : 'bg-slate-panel/80 hover:bg-slate-panel'
          }`}
        >
          📐 傾き補正
        </button>
        <span className="text-[10px] text-gray-500 self-center ml-2">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {deskewMode && (
        <div className="absolute top-10 left-2 z-10 text-[10px] text-orange-300 bg-black/50 px-2 py-1 rounded">
          {deskewPoint1
            ? '2点目をクリック: 五線の右端'
            : '1点目をクリック: 五線の左端'}
        </div>
      )}

      {/* キャンバス表示領域 */}
      <div
        ref={canvasContainerRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      />

      {pages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
          PDFを読み込むか、サンプルスコアを生成してください
        </div>
      )}
    </div>
  );
};
