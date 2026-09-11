import { useEffect, useRef, useCallback, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { createPageRenderer } from '../engine/pdfEngine';
import { getSplitLineNormalizedX } from '../engine/geometry';
import type { NormalizedRect } from '../types';

/**
 * MainCanvas — PDF ページ描画 + クロップオーバーレイ
 *
 * - 緑色クロップ外枠（8点ハンドル: 視覚12px丸 + タッチ領域44px保証）
 * - 暗転マスク (box-shadow technique)
 * - オレンジ色中央分割線（見開き分割時のみ、ドラッグ移動可能）
 * - 白紙/削除済みページの表示
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
  const settings = useScoreStore((s) => s.settings);
  const isLoading = useScoreStore((s) => s.isLoading);
  const isAspectRatioLocked = useScoreStore((s) => s.isAspectRatioLocked);
  const selectedPaper = useScoreStore((s) => s.selectedPaper);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; rect: NormalizedRect; splitOffset: number } | null>(null);

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
  }, [pdfDoc, currentPage, zoom, zoomMode, pages]);

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

  // ── Crop overlay pixel positions ────────────────────────────────
  const canvas = canvasRef.current;
  const cx = canvas ? (containerRef.current?.clientWidth ?? 0) / 2 - canvasSize.width / 2 : 0;
  const cy = canvas ? (containerRef.current?.clientHeight ?? 0) / 2 - canvasSize.height / 2 : 0;

  const cropLeft = cx + cropRect.x * canvasSize.width;
  const cropTop = cy + cropRect.y * canvasSize.height;
  const cropWidth = cropRect.width * canvasSize.width;
  const cropHeight = cropRect.height * canvasSize.height;

  const showSplitLine = settings.pageProcessingMode === 'spread_split';
  const splitLineX = showSplitLine
    ? cx + getSplitLineNormalizedX(cropRect, settings.splitOffsetPercent) * canvasSize.width
    : 0;

  // 現在のページエントリ
  const currentPageEntry = pages[currentPage];
  const showCropOverlay = pdfDoc && canvasSize.width > 0 && currentPageEntry && !currentPageEntry.isBlank && !currentPageEntry.deleted;

  // ── Handle Drag ─────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (handleId: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handleId);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        rect: { ...cropRect },
        splitOffset: settings.splitOffsetPercent,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [cropRect, settings.splitOffsetPercent],
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

      // Crop handle drag
      let newRect = { ...startRect };

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
        // Spread is two pages wide
        const targetRatio = settings.pageProcessingMode === 'spread_split'
          ? (paperConfig.widthPt * 2) / paperConfig.heightPt
          : paperConfig.widthPt / paperConfig.heightPt;
        
        // Convert normalized width/height to screen px for ratio calculation
        const pxWidth = newRect.width * canvasSize.width;
        const pxHeight = newRect.height * canvasSize.height;

        // Determine which axis was primarily modified
        if (dragging === 'l' || dragging === 'r') {
          // Width drove the change -> adjust height
          const reqPxHeight = pxWidth / targetRatio;
          newRect.height = reqPxHeight / canvasSize.height;
          // Keep centered vertically if dragging sides
          const yOffset = (startRect.height - newRect.height) / 2;
          newRect.y = startRect.y + yOffset;
        } else if (dragging === 't' || dragging === 'b') {
          // Height drove the change -> adjust width
          const reqPxWidth = pxHeight * targetRatio;
          newRect.width = reqPxWidth / canvasSize.width;
          const xOffset = (startRect.width - newRect.width) / 2;
          newRect.x = startRect.x + xOffset;
        } else {
          // Corners: prioritize width if x dragged more, else prioritize height
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

        // Clamp to 0-1
        newRect.x = Math.max(0, Math.min(1 - newRect.width, newRect.x));
        newRect.y = Math.max(0, Math.min(1 - newRect.height, newRect.y));
        newRect.width = Math.min(1, Math.max(0.02, newRect.width));
        newRect.height = Math.min(1, Math.max(0.02, newRect.height));
      }

      setCropRect(newRect);
    },
    [dragging, canvasSize, setCropRect],
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
    dragStartRef.current = null;
  }, []);

  // ── Handle positions ────────────────────────────────────────────
  const handles = [
    { id: 'tl', x: cropLeft, y: cropTop, cursor: 'nwse-resize' },
    { id: 'tr', x: cropLeft + cropWidth, y: cropTop, cursor: 'nesw-resize' },
    { id: 'bl', x: cropLeft, y: cropTop + cropHeight, cursor: 'nesw-resize' },
    { id: 'br', x: cropLeft + cropWidth, y: cropTop + cropHeight, cursor: 'nwse-resize' },
    { id: 't', x: cropLeft + cropWidth / 2, y: cropTop, cursor: 'ns-resize' },
    { id: 'b', x: cropLeft + cropWidth / 2, y: cropTop + cropHeight, cursor: 'ns-resize' },
    { id: 'l', x: cropLeft, y: cropTop + cropHeight / 2, cursor: 'ew-resize' },
    { id: 'r', x: cropLeft + cropWidth, y: cropTop + cropHeight / 2, cursor: 'ew-resize' },
  ];

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
        cursor: dragging ? 'grabbing' : 'default',
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

      {/* Crop overlay (only when PDF is loaded, canvas has size, and not blank/deleted) */}
      {showCropOverlay && (
        <>
          {/* Dark mask using box-shadow */}
          <div
            style={{
              position: 'absolute',
              left: `${cropLeft}px`,
              top: `${cropTop}px`,
              width: `${cropWidth}px`,
              height: `${cropHeight}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              border: '2px solid var(--color-green)',
              borderRadius: '1px',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />

          {/* Split line (spread_split only) */}
          {showSplitLine && (
            <div
              onPointerDown={(e) => handlePointerDown('split-line', e)}
              style={{
                position: 'absolute',
                left: `${splitLineX - 2}px`,
                top: `${cropTop}px`,
                width: '4px',
                height: `${cropHeight}px`,
                background: 'var(--color-orange)',
                cursor: 'ew-resize',
                zIndex: 8,
                opacity: 0.9,
              }}
            >
              {/* Wide touch target */}
              <div style={{
                position: 'absolute',
                left: '-20px',
                top: 0,
                width: '44px',
                height: '100%',
              }} />
            </div>
          )}

          {/* 8 crop handles */}
          {handles.map((h) => (
            <div
              key={h.id}
              className="crop-handle"
              onPointerDown={(e) => handlePointerDown(h.id, e)}
              style={{
                left: `${h.x}px`,
                top: `${h.y}px`,
                cursor: h.cursor,
                zIndex: 10,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
