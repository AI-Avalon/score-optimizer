import { useEffect, useRef, useCallback, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { createPageRenderer } from '../engine/pdfEngine';
import { getSplitLineNormalizedX } from '../engine/geometry';
import type { NormalizedRect } from '../types';

/**
 * MainCanvas — PDF ページ描画 + クロップオーバーレイ
 *
 * - 緑色/シアン/エメラルド クロップ外枠
 * - 暗転マスク
 * - 中央分割線（見開き時のみ）
 * - ドラッグ移動（Translate）対応
 * - キーボード十字キー微調整（Nudge）
 */
export function MainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef(createPageRenderer());

  const pdfDoc = useScoreStore((s) => s.pdfDoc);
  const currentPage = useScoreStore((s) => s.currentPage);
  const pages = useScoreStore((s) => s.pages);
  const zoom = useScoreStore((s) => s.zoom);
  const zoomMode = useScoreStore((s) => s.zoomMode);
  
  const cropRect = useScoreStore((s) => s.cropRect);
  const setCropRect = useScoreStore((s) => s.setCropRect);
  
  const leftCropRect = useScoreStore((s) => s.leftCropRect);
  const setLeftCropRect = useScoreStore((s) => s.setLeftCropRect);
  
  const rightCropRect = useScoreStore((s) => s.rightCropRect);
  const setRightCropRect = useScoreStore((s) => s.setRightCropRect);
  
  const settings = useScoreStore((s) => s.settings);
  const settingsVersion = useScoreStore((s) => s.settingsVersion);
  
  const isLoading = useScoreStore((s) => s.isLoading);
  const isAspectRatioLocked = useScoreStore((s) => s.isAspectRatioLocked);
  const selectedPaper = useScoreStore((s) => s.selectedPaper);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; rect: NormalizedRect; splitOffset: number } | null>(null);

  const [activeFrame, setActiveFrame] = useState<'main' | 'left' | 'right'>('main');

  // ── PDF Page Rendering ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pdfDoc || !canvas || !container) return;

    const pageEntry = pages[currentPage];
    if (!pageEntry) return;

    let cancelled = false;

    const renderPage = async () => {
      // 白紙ページ
      if (pageEntry.isBlank) {
        const containerWidth = container.clientWidth - 16;
        const containerHeight = container.clientHeight - 16;
        canvas.width = Math.min(containerWidth, 600);
        canvas.height = Math.min(containerHeight, 800);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#cccccc';
          ctx.font = '24px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('白紙ページ', canvas.width / 2, canvas.height / 2);
        }
        setCanvasSize({ width: canvas.width, height: canvas.height });
        return;
      }

      // 削除済みページ
      if (pageEntry.deleted) {
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#1c2029';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#64748b';
          ctx.font = '18px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('削除済みページ', canvas.width / 2, canvas.height / 2);
          ctx.fillText('Cmd+Z で復活', canvas.width / 2, canvas.height / 2 + 30);
        }
        setCanvasSize({ width: canvas.width, height: canvas.height });
        return;
      }

      try {
        const page = await (pdfDoc as unknown as { getPage(n: number): Promise<Parameters<typeof rendererRef.current.render>[0]> }).getPage(pageEntry.sourceIndex + 1);
        if (cancelled) return;

        const defaultViewport = page.getViewport({ scale: 1 });
        const containerWidth = container.clientWidth - 16;
        const containerHeight = container.clientHeight - 16;

        let scale: number;
        if (zoomMode === 'fit') {
          const scaleX = containerWidth / defaultViewport.width;
          const scaleY = containerHeight / defaultViewport.height;
          scale = Math.min(scaleX, scaleY);
        } else {
          const fitScale = Math.min(
            containerWidth / defaultViewport.width,
            containerHeight / defaultViewport.height,
          );
          scale = fitScale * zoom;
        }

        const success = await rendererRef.current.render(page, canvas, scale);
        if (success && !cancelled) {
          setCanvasSize({ width: canvas.width, height: canvas.height });
        }
      } catch (err) {
        if (!cancelled) console.error('Render error:', err);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      rendererRef.current.cancel();
    };
  }, [pdfDoc, currentPage, zoom, zoomMode, pages, settingsVersion]);

  // ── Container resize observer ───────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (pdfDoc) {
        const canvas = canvasRef.current;
        if (canvas) {
          setCanvasSize({ width: canvas.width, height: canvas.height });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [pdfDoc]);

  // ── Keyboard Nudge Controls ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't nudge if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const NUDGE_STEP = e.shiftKey ? 0.05 : 0.005; // 5% with shift, 0.5% (approx 1mm) without
      
      let dx = 0;
      let dy = 0;
      
      if (e.key === 'ArrowUp') dy = -NUDGE_STEP;
      else if (e.key === 'ArrowDown') dy = NUDGE_STEP;
      else if (e.key === 'ArrowLeft') dx = -NUDGE_STEP;
      else if (e.key === 'ArrowRight') dx = NUDGE_STEP;
      else return;
      
      e.preventDefault();
      
      const targetRect = activeFrame === 'left' ? leftCropRect 
                       : activeFrame === 'right' ? rightCropRect 
                       : cropRect;
                       
      let newRect = { ...targetRect };
      newRect.x = Math.max(0, Math.min(1 - newRect.width, newRect.x + dx));
      newRect.y = Math.max(0, Math.min(1 - newRect.height, newRect.y + dy));
      
      if (activeFrame === 'left') setLeftCropRect(newRect);
      else if (activeFrame === 'right') setRightCropRect(newRect);
      else setCropRect(newRect);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cropRect, leftCropRect, rightCropRect, activeFrame, setCropRect, setLeftCropRect, setRightCropRect]);


  // ── Layout Metrics ──────────────────────────────────────────────
  const canvas = canvasRef.current;
  const cx = canvas ? (containerRef.current?.clientWidth ?? 0) / 2 - canvasSize.width / 2 : 0;
  const cy = canvas ? (containerRef.current?.clientHeight ?? 0) / 2 - canvasSize.height / 2 : 0;

  const showSplitLine = settings.pageProcessingMode === 'spread_split' && !settings.independentSplitFrames;
  const isIndependent = settings.pageProcessingMode === 'spread_split' && settings.independentSplitFrames;
  
  const splitLineX = showSplitLine
    ? cx + getSplitLineNormalizedX(cropRect, settings.splitOffsetPercent) * canvasSize.width
    : 0;

  const currentPageEntry = pages[currentPage];
  const showCropOverlay = pdfDoc && canvasSize.width > 0 && currentPageEntry && !currentPageEntry.isBlank && !currentPageEntry.deleted;

  // ── Handle Drag ─────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (handleId: string, frameId: 'main' | 'left' | 'right', rect: NormalizedRect, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handleId);
      setActiveFrame(frameId);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        rect: { ...rect },
        splitOffset: settings.splitOffsetPercent,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [settings.splitOffsetPercent],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const startRect = dragStartRef.current.rect;

      const normDx = canvasSize.width > 0 ? dx / canvasSize.width : 0;
      const normDy = canvasSize.height > 0 ? dy / canvasSize.height : 0;

      if (dragging === 'split-line') {
        const widthPercent = (normDx / startRect.width) * 100;
        const newOffset = Math.max(-20, Math.min(20, dragStartRef.current.splitOffset + widthPercent));
        useScoreStore.getState().setSplitOffsetPercent(newOffset);
        return;
      }

      let newRect = { ...startRect };

      // Translate (Move) entire frame
      if (dragging === 'c') {
        newRect.x = Math.max(0, Math.min(1 - startRect.width, startRect.x + normDx));
        newRect.y = Math.max(0, Math.min(1 - startRect.height, startRect.y + normDy));
      } else {
        // Edge/Corner Drag
        if (dragging.includes('l')) {
          const newX = Math.max(0, Math.min(startRect.x + startRect.width - 0.02, startRect.x + normDx));
          newRect = { ...newRect, x: newX, width: startRect.x + startRect.width - newX };
        }
        if (dragging.includes('r')) {
          const newW = Math.max(0.02, Math.min(1 - startRect.x, startRect.width + normDx));
          newRect = { ...newRect, width: newW };
        }
        if (dragging.includes('t')) {
          const newY = Math.max(0, Math.min(startRect.y + startRect.height - 0.02, startRect.y + normDy));
          newRect = { ...newRect, y: newY, height: startRect.y + startRect.height - newY };
        }
        if (dragging.includes('b')) {
          const newH = Math.max(0.02, Math.min(1 - startRect.y, startRect.height + normDy));
          newRect = { ...newRect, height: newH };
        }

        // ── Aspect Ratio Lock ──
        if (isAspectRatioLocked && selectedPaper !== 'custom') {
          const paperConfig = useScoreStore.getState().getPaperConfig();
          // Target ratio depends on if it's spread_split WITHOUT independent frames
          const targetRatio = settings.pageProcessingMode === 'spread_split' && !settings.independentSplitFrames
            ? (paperConfig.widthPt * 2) / paperConfig.heightPt
            : paperConfig.widthPt / paperConfig.heightPt;
          
          const pxWidth = newRect.width * canvasSize.width;
          const pxHeight = newRect.height * canvasSize.height;

          if (dragging === 'l' || dragging === 'r') {
            const reqPxHeight = pxWidth / targetRatio;
            newRect.height = reqPxHeight / canvasSize.height;
            const yOffset = (startRect.height - newRect.height) / 2;
            newRect.y = startRect.y + yOffset;
          } else if (dragging === 't' || dragging === 'b') {
            const reqPxWidth = pxHeight * targetRatio;
            newRect.width = reqPxWidth / canvasSize.width;
            const xOffset = (startRect.width - newRect.width) / 2;
            newRect.x = startRect.x + xOffset;
          } else {
            if (Math.abs(dx) > Math.abs(dy)) {
              const reqPxHeight = pxWidth / targetRatio;
              newRect.height = reqPxHeight / canvasSize.height;
              if (dragging.includes('t')) newRect.y = startRect.y + startRect.height - newRect.height;
            } else {
              const reqPxWidth = pxHeight * targetRatio;
              newRect.width = reqPxWidth / canvasSize.width;
              if (dragging.includes('l')) newRect.x = startRect.x + startRect.width - newRect.width;
            }
          }

          newRect.x = Math.max(0, Math.min(1 - newRect.width, newRect.x));
          newRect.y = Math.max(0, Math.min(1 - newRect.height, newRect.y));
          newRect.width = Math.min(1, Math.max(0.02, newRect.width));
          newRect.height = Math.min(1, Math.max(0.02, newRect.height));
        }
      }

      if (activeFrame === 'left') setLeftCropRect(newRect);
      else if (activeFrame === 'right') setRightCropRect(newRect);
      else setCropRect(newRect);
    },
    [dragging, activeFrame, canvasSize, setCropRect, setLeftCropRect, setRightCropRect, isAspectRatioLocked, selectedPaper, settings.pageProcessingMode, settings.independentSplitFrames],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
    dragStartRef.current = null;
  }, []);

  // ── Render Helpers ──────────────────────────────────────────────
  const renderCropOverlay = (rect: NormalizedRect, frameId: 'main' | 'left' | 'right', color: string) => {
    const left = cx + rect.x * canvasSize.width;
    const top = cy + rect.y * canvasSize.height;
    const width = rect.width * canvasSize.width;
    const height = rect.height * canvasSize.height;
    const isActive = activeFrame === frameId;

    const handles = [
      { id: 'c',  x: left + width/2, y: top + height/2, cursor: 'move', w: width - 20, h: height - 20 },
      { id: 'tl', x: left, y: top, cursor: 'nwse-resize' },
      { id: 'tr', x: left + width, y: top, cursor: 'nesw-resize' },
      { id: 'bl', x: left, y: top + height, cursor: 'nesw-resize' },
      { id: 'br', x: left + width, y: top + height, cursor: 'nwse-resize' },
      { id: 't',  x: left + width / 2, y: top, cursor: 'ns-resize' },
      { id: 'b',  x: left + width / 2, y: top + height, cursor: 'ns-resize' },
      { id: 'l',  x: left, y: top + height / 2, cursor: 'ew-resize' },
      { id: 'r',  x: left + width, y: top + height / 2, cursor: 'ew-resize' },
    ];

    return (
      <div key={frameId}>
        <div
          style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            border: `2px solid ${color}`,
            borderRadius: '1px',
            pointerEvents: 'none',
            zIndex: isActive ? 6 : 5,
            opacity: dragging === 'c' && isActive ? 0.5 : 1,
            backgroundColor: dragging === 'c' && isActive ? `${color}1A` : 'transparent',
          }}
        />

        {handles.map((h) => {
          if (h.id === 'c') {
             // Center handle for Translate
             return (
              <div
                key={`${frameId}-${h.id}`}
                onPointerDown={(e) => handlePointerDown(h.id, frameId, rect, e)}
                style={{
                  position: 'absolute',
                  left: `${left + 10}px`,
                  top: `${top + 10}px`,
                  width: `${Math.max(0, h.w!)}px`,
                  height: `${Math.max(0, h.h!)}px`,
                  cursor: h.cursor,
                  zIndex: isActive ? 10 : 9,
                  touchAction: 'none'
                }}
              />
             );
          }
          return (
            <div
              key={`${frameId}-${h.id}`}
              className="crop-handle"
              onPointerDown={(e) => handlePointerDown(h.id, frameId, rect, e)}
              style={{
                left: `${h.x}px`,
                top: `${h.y}px`,
                cursor: h.cursor,
                zIndex: isActive ? 11 : 10,
                borderColor: color
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: '#111318',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: dragging ? (dragging === 'c' ? 'move' : 'grabbing') : 'default',
        touchAction: 'none',
      }}
    >
      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          fontSize: '14px',
          color: 'var(--color-text-muted)',
        }}>
          PDF を読み込み中...
        </div>
      )}

      {/* Empty state */}
      {!pdfDoc && !isLoading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--color-text-dim)',
          fontSize: '14px',
          textAlign: 'center',
          padding: '20px',
        }}>
          <div style={{ fontSize: '48px', opacity: 0.3 }}>🎵</div>
          <p>PDF をドラッグ＆ドロップするか、<br />ヘッダーの「PDF読込」をクリック</p>
        </div>
      )}

      {/* PDF Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: pdfDoc ? 'block' : 'none',
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      />

      {/* Crop overlays */}
      {showCropOverlay && (
        <>
          {/* Global Dark Mask */}
          <div
            style={{
              position: 'absolute',
              left: isIndependent ? 0 : cx + cropRect.x * canvasSize.width,
              top: isIndependent ? 0 : cy + cropRect.y * canvasSize.height,
              width: isIndependent ? 0 : cropRect.width * canvasSize.width,
              height: isIndependent ? 0 : cropRect.height * canvasSize.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          />

          {!isIndependent ? (
            // Single Frame Mode
            <>
              {renderCropOverlay(cropRect, 'main', 'var(--color-green)')}
              
              {showSplitLine && (
                <div
                  onPointerDown={(e) => handlePointerDown('split-line', 'main', cropRect, e)}
                  style={{
                    position: 'absolute',
                    left: `${splitLineX - 2}px`,
                    top: `${cy + cropRect.y * canvasSize.height}px`,
                    width: '4px',
                    height: `${cropRect.height * canvasSize.height}px`,
                    background: 'var(--color-orange)',
                    cursor: 'ew-resize',
                    zIndex: 8,
                    opacity: 0.9,
                  }}
                >
                  <div style={{ position: 'absolute', left: '-20px', top: 0, width: '44px', height: '100%' }} />
                </div>
              )}
            </>
          ) : (
            // Independent Left/Right Frames Mode
            <>
              {renderCropOverlay(leftCropRect, 'left', 'var(--color-cyan)')}
              {renderCropOverlay(rightCropRect, 'right', 'var(--color-emerald)')}
            </>
          )}
        </>
      )}
    </div>
  );
}
