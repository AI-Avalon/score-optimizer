import { useEffect, useRef, useCallback, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { getSplitLineNormalizedX } from '../engine/geometry';
import type { NormalizedRect } from '../types';
import { Loader2, FileText } from 'lucide-react';

/**
 * MainCanvas — PDF ページ描画 + クロップオーバーレイ
 *
 * - 緑色/シアン/エメラルド クロップ外枠
 * - 暗転マスク
 * - 中央分割線（見開き時のみ）
 * - ドラッグ移動（Translate）対応
 * - キーボード十字キー微調整（Nudge）
 */
export function ScoreCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pageObjRef = useRef<any>(null);

  const pdfDoc = useScoreStore((s) => s.pdfDoc);
  const currentPage = useScoreStore((s) => s.currentPage);
  const pages = useScoreStore((s) => s.pages);
  
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
  const isDetecting = useScoreStore((s) => s.isDetecting);
  const touchMode = useScoreStore((s) => s.touchMode);
  const zoom = useScoreStore((s) => s.zoom);
  const zoomMode = useScoreStore((s) => s.zoomMode);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; rect: NormalizedRect; splitOffset: number } | null>(null);

  const [activeFrame, setActiveFrame] = useState<'main' | 'left' | 'right'>('main');

  // --- Decoupled Rendering State ---
  const [localCropRect, setLocalCropRect] = useState<NormalizedRect | null>(null);
  const [localLeftCropRect, setLocalLeftCropRect] = useState<NormalizedRect | null>(null);
  const [localRightCropRect, setLocalRightCropRect] = useState<NormalizedRect | null>(null);
  const [localSplitOffset, setLocalSplitOffset] = useState<number | null>(null);

  const detectedCropRect = useScoreStore((s) => s.detectedCropRect);

  const displayCropRect = localCropRect ?? cropRect;
  const displayLeftCropRect = localLeftCropRect ?? leftCropRect;
  const displayRightCropRect = localRightCropRect ?? rightCropRect;
  const displaySplitOffset = localSplitOffset ?? settings.splitOffsetPercent;

  // ── PDF Page Rendering & Resize Handling ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pdfDoc || !canvas || !container) return;

    const pageEntry = pages[currentPage];
    if (!pageEntry) return;

    let isCancelled = false;
    let renderPending = false;
    let animationFrameId: number;

    const renderPage = async (containerWidth: number, containerHeight: number) => {
      if (isCancelled) return;

      const ctx = canvas.getContext('2d', { alpha: false });

      // 白紙ページ
      if (pageEntry.isBlank) {
        canvas.width = Math.min(containerWidth, 600);
        canvas.height = Math.min(containerHeight, 800);
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
        // 1. 古いタスクの確実なキャンセル
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          try { await renderTaskRef.current.promise; } catch (e) {}
          renderTaskRef.current = null;
        }
        // 2. 古いページメモリの解放
        if (pageObjRef.current) {
          try { 
            const res = pageObjRef.current.cleanup(); 
            if (res && typeof res.catch === 'function') res.catch(() => {});
          } catch (e) {}
          pageObjRef.current = null;
        }

        // ★最重要: PDF.js ドキュメント内画像キャッシュの強制パージ（WebKit OOMクラッシュ防止）
        if (typeof (pdfDoc as any).cleanup === 'function') {
          try { 
            const res = (pdfDoc as any).cleanup(); 
            if (res && typeof res.catch === 'function') res.catch(() => {});
          } catch (e) {}
        }

        const page = await (pdfDoc as unknown as { getPage(n: number): Promise<any> }).getPage(pageEntry.sourceIndex + 1);
        if (isCancelled) {
          try { page.cleanup(); } catch (e) {}
          return;
        }
        pageObjRef.current = page;

        // 3. モバイルでの解像度クランプ (1.25倍に抑えてメモリクラッシュを物理防御)
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const dpr = isMobile ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 2.0);

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const fitScale = Math.min(containerWidth / unscaledViewport.width, containerHeight / unscaledViewport.height);
        
        // ★ズーム計算の復元
        const scale = zoomMode === 'fit' ? fitScale : fitScale * zoom;
        const viewport = page.getViewport({ scale: scale * dpr });

        if (isMobile) {
          // モバイル: 単一Canvas直接描画（メモリ消費最小化）
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          const renderContext = {
            canvasContext: ctx!,
            viewport: viewport,
          };

          const task = page.render(renderContext);
          renderTaskRef.current = task;
          await task.promise;
          setCanvasSize({ width: canvas.width / dpr, height: canvas.height / dpr });
        } else {
          // PC: ダブルバッファリング（白紙チラつきゼロを維持）
          const offscreen = document.createElement('canvas');
          offscreen.width = viewport.width;
          offscreen.height = viewport.height;
          const offCtx = offscreen.getContext('2d', { alpha: false });
          if (offCtx) {
            offCtx.fillStyle = '#ffffff';
            offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
          }

          const renderContext = {
            canvasContext: offCtx!,
            viewport: viewport,
          };

          const task = page.render(renderContext);
          renderTaskRef.current = task;
          await task.promise;
          
          // 描画が完了した瞬間にメインキャンバスへ転写
          if (!isCancelled && canvas) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = `${viewport.width / dpr}px`;
            canvas.style.height = `${viewport.height / dpr}px`;
            
            if (ctx) {
              ctx.drawImage(offscreen, 0, 0);
            }
            setCanvasSize({ width: canvas.width / dpr, height: canvas.height / dpr });
          }

          // 作業用メモリを即時解放
          offscreen.width = 0;
          offscreen.height = 0;
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !err?.message?.includes('cancelled')) {
          console.error('Render error:', err);
        }
      }
    };

    const triggerRender = (width: number, height: number) => {
      if (renderPending) return;
      renderPending = true;
      animationFrameId = requestAnimationFrame(() => {
        renderPending = false;
        renderPage(width, height);
      });
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        // padding: 36px があるため、contentRect は padding を除いた安全領域
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0) {
          triggerRender(width, height);
        }
      }
    });

    observer.observe(container);

    // Initial explicit render (72 = 36px padding * 2)
    triggerRender(Math.max(0, container.clientWidth - 72), Math.max(0, container.clientHeight - 72));

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (pageObjRef.current) {
        // 4. ★レンダリング中断直後の例外を必ずキャッチして握りつぶす
        try { pageObjRef.current.cleanup(); } catch (e) {}
        pageObjRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, pages, settingsVersion, zoom, zoomMode]);

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
    ? cx + getSplitLineNormalizedX(displayCropRect, displaySplitOffset) * canvasSize.width
    : 0;

  const currentPageEntry = pages[currentPage];
  const showCropOverlay = pdfDoc && canvasSize.width > 0 && currentPageEntry && !currentPageEntry.isBlank && !currentPageEntry.deleted;

  // ── Handle Drag ─────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (handleId: string, frameId: 'main' | 'left' | 'right', rect: NormalizedRect, e: React.PointerEvent) => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile && touchMode === 'scroll') return;
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
        setLocalSplitOffset(newOffset);
        return;
      }

      let newRect = { ...startRect };

      // Translate (Move) entire frame
      if (dragging === 'c') {
        newRect.x = Math.max(0, Math.min(1 - startRect.width, startRect.x + normDx));
        newRect.y = Math.max(0, Math.min(1 - startRect.height, startRect.y + normDy));

        // Magnetic Snapping to detectedCropRect
        if (detectedCropRect) {
          const SNAP_THRESHOLD = 0.015; // 1.5% of canvas size
          let snapped = false;

          // Snap left edge
          if (Math.abs(newRect.x - detectedCropRect.x) < SNAP_THRESHOLD) {
            newRect.x = detectedCropRect.x;
            snapped = true;
          }
          // Snap right edge
          if (Math.abs((newRect.x + newRect.width) - (detectedCropRect.x + detectedCropRect.width)) < SNAP_THRESHOLD) {
            newRect.x = detectedCropRect.x + detectedCropRect.width - newRect.width;
            snapped = true;
          }
          // Snap top edge
          if (Math.abs(newRect.y - detectedCropRect.y) < SNAP_THRESHOLD) {
            newRect.y = detectedCropRect.y;
            snapped = true;
          }
          // Snap bottom edge
          if (Math.abs((newRect.y + newRect.height) - (detectedCropRect.y + detectedCropRect.height)) < SNAP_THRESHOLD) {
            newRect.y = detectedCropRect.y + detectedCropRect.height - newRect.height;
            snapped = true;
          }

          if (snapped && navigator.vibrate) {
            // Check if we just transitioned to snapped state to avoid continuous vibration
            const prevX = activeFrame === 'left' ? localLeftCropRect?.x : activeFrame === 'right' ? localRightCropRect?.x : localCropRect?.x;
            const prevY = activeFrame === 'left' ? localLeftCropRect?.y : activeFrame === 'right' ? localRightCropRect?.y : localCropRect?.y;
            
            if (prevX !== newRect.x || prevY !== newRect.y) {
              navigator.vibrate(10);
            }
          }
        }
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

      if (activeFrame === 'left') setLocalLeftCropRect(newRect);
      else if (activeFrame === 'right') setLocalRightCropRect(newRect);
      else setLocalCropRect(newRect);
    },
    [dragging, activeFrame, canvasSize, localCropRect, localLeftCropRect, localRightCropRect, detectedCropRect, isAspectRatioLocked, selectedPaper, settings.pageProcessingMode, settings.independentSplitFrames],
  );

  const handlePointerUp = useCallback(() => {
    // Commit local state to Zustand store
    if (localCropRect) setCropRect(localCropRect);
    if (localLeftCropRect) setLeftCropRect(localLeftCropRect);
    if (localRightCropRect) setRightCropRect(localRightCropRect);
    if (localSplitOffset !== null) useScoreStore.getState().setSplitOffsetPercent(localSplitOffset);

    // Reset local state
    setLocalCropRect(null);
    setLocalLeftCropRect(null);
    setLocalRightCropRect(null);
    setLocalSplitOffset(null);

    setDragging(null);
    dragStartRef.current = null;
  }, [localCropRect, localLeftCropRect, localRightCropRect, localSplitOffset, setCropRect, setLeftCropRect, setRightCropRect]);

  // ── Render Helpers ──────────────────────────────────────────────
  const renderCropOverlay = (rect: NormalizedRect, frameId: 'main' | 'left' | 'right', color: string) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
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
            opacity: (isMobile && touchMode === 'scroll') ? 0.3 : (dragging === 'c' && isActive ? 0.5 : 1),
            backgroundColor: dragging === 'c' && isActive ? `${color}1A` : 'transparent',
            transition: 'opacity 0.2s ease',
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
                borderColor: color,
                opacity: (isMobile && touchMode === 'scroll') ? 0 : 1,
                pointerEvents: (isMobile && touchMode === 'scroll') ? 'none' : 'auto',
                transition: 'opacity 0.2s ease',
              }}
            />
          );
        })}
      </div>
    );
  };

  // ── Loupe HUD ──
  const isDraggingHandle = dragging && dragging !== 'c' && dragging !== 'split-line';
  const showLoupe = isDraggingHandle && touchMode === 'crop' && dragStartRef.current;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        flex: 1,
        position: 'relative',
        overflow: zoomMode === 'fit' ? 'hidden' : 'auto',
        background: '#111318',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px',
        cursor: dragging ? (dragging === 'c' ? 'move' : 'grabbing') : 'default',
        touchAction: 'none',
      }}
    >
      {/* Loading indicator */}
      {(isLoading || isDetecting) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          fontSize: '14px',
          color: 'var(--color-text-muted)',
          background: 'rgba(17, 19, 24, 0.7)',
          backdropFilter: 'blur(4px)',
          gap: '12px'
        }}>
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          {isLoading ? 'PDF を解析中...' : '黒枠を自動検出中...'}
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
          <FileText size={48} style={{ opacity: 0.3 }} />
          <p>楽譜PDFをドラッグ＆ドロップ、またはクリックして選択<br />A3見開き・B4/A4単ページ両対応</p>
        </div>
      )}

      {/* PDF Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          display: pdfDoc ? 'block' : 'none',
          maxWidth: zoomMode === 'fit' ? '100%' : 'none',
          maxHeight: zoomMode === 'fit' ? '100%' : 'none',
          flexShrink: 0,
        }}
      />

      {/* Loupe HUD (Magnifying Glass) */}
      {showLoupe && dragStartRef.current && (
        <div style={{
          position: 'fixed',
          top: dragStartRef.current.y - 120, // 60px above finger (accounting for some extra spacing)
          left: dragStartRef.current.x - 40,
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: '2px solid var(--color-accent)',
          background: 'var(--color-base)',
          overflow: 'hidden',
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <canvas
            ref={(node) => {
              if (node && canvasRef.current) {
                // Copy the surrounding area into the loupe
                const ctx = node.getContext('2d');
                if (ctx) {
                  // Ensure canvas exists and has width
                  if (canvasRef.current.width > 0) {
                    const dpr = window.innerWidth < 768 ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 2.0);
                    // Get position relative to canvas
                    const canvasRect = canvasRef.current.getBoundingClientRect();
                    const x = (dragStartRef.current!.x - canvasRect.left) * dpr;
                    const y = (dragStartRef.current!.y - canvasRect.top) * dpr;
                    
                    // We want to draw a zoomed in portion
                    const ZOOM = 2;
                    const srcSize = 80 / ZOOM;
                    
                    node.width = 80;
                    node.height = 80;
                    
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(0,0,80,80);
                    ctx.drawImage(
                      canvasRef.current,
                      x - srcSize / 2, y - srcSize / 2, srcSize, srcSize,
                      0, 0, 80, 80
                    );
                    
                    // Crosshair
                    ctx.strokeStyle = 'var(--color-accent)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(40, 35); ctx.lineTo(40, 45);
                    ctx.moveTo(35, 40); ctx.lineTo(45, 40);
                    ctx.stroke();
                  }
                }
              }
            }}
          />
        </div>
      )}

      {/* Crop overlays */}
      {showCropOverlay && (
        <>
          {/* Global Dark Mask */}
          <div
            style={{
              position: 'absolute',
              left: isIndependent ? 0 : cx + displayCropRect.x * canvasSize.width,
              top: isIndependent ? 0 : cy + displayCropRect.y * canvasSize.height,
              width: isIndependent ? 0 : displayCropRect.width * canvasSize.width,
              height: isIndependent ? 0 : displayCropRect.height * canvasSize.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          />

          {!isIndependent ? (
            // Single Frame Mode
            <>
              {renderCropOverlay(displayCropRect, 'main', 'var(--color-green)')}
              
              {showSplitLine && (
                <div
                  onPointerDown={(e) => handlePointerDown('split-line', 'main', displayCropRect, e)}
                  style={{
                    position: 'absolute',
                    left: `${splitLineX - 2}px`,
                    top: `${cy + displayCropRect.y * canvasSize.height}px`,
                    width: '4px',
                    height: `${displayCropRect.height * canvasSize.height}px`,
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
              {renderCropOverlay(displayLeftCropRect, 'left', 'var(--color-cyan)')}
              {renderCropOverlay(displayRightCropRect, 'right', 'var(--color-emerald)')}
            </>
          )}
        </>
      )}
    </div>
  );
}
