import { useEffect, useRef, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { Loader2 } from 'lucide-react';
import { getSplitLineNormalizedX } from '../engine/geometry';
import type { NormalizedRect } from '../types';

export function MobileScoreViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pageObjRef = useRef<any>(null);

  const pdfDoc = useScoreStore((s) => s.pdfDoc);
  const currentPage = useScoreStore((s) => s.currentPage);
  const pages = useScoreStore((s) => s.pages);
  const zoom = useScoreStore((s) => s.zoom);
  const zoomMode = useScoreStore((s) => s.zoomMode);
  
  const cropRect = useScoreStore((s) => s.cropRect);
  const leftCropRect = useScoreStore((s) => s.leftCropRect);
  const rightCropRect = useScoreStore((s) => s.rightCropRect);

  // Directly access global settings & overrides
  const globalSettings = useScoreStore((s) => s.settings);
  const pageOverrides = useScoreStore((s) => s.pageOverrides);
  const override = pageOverrides[currentPage];
  const settings = override ? { ...globalSettings, ...override } : globalSettings;

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const pageEntry = pages[currentPage];
    if (!pageEntry) return;

    let isCancelled = false;

    const renderToImage = async () => {
      setIsRendering(true);

      // DOM外のCanvasを作成
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          try { await renderTaskRef.current.promise; } catch (e) {}
          renderTaskRef.current = null;
        }
        if (pageObjRef.current) {
          try { pageObjRef.current.cleanup(); } catch (e) {}
          pageObjRef.current = null;
        }

        // GCのための微小待機
        await new Promise((r) => setTimeout(r, 20));
        if (isCancelled) return;

        const page = await (pdfDoc as unknown as { getPage(n: number): Promise<any> }).getPage(pageEntry.sourceIndex + 1);
        if (isCancelled) {
          try { page.cleanup(); } catch (e) {}
          return;
        }
        pageObjRef.current = page;

        // モバイルのクラッシュを防ぐためDPRを低めにクランプ (1.25程度)
        const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
        const container = containerRef.current!;
        const containerWidth = Math.max(0, container.clientWidth - 32); // margin
        const containerHeight = Math.max(0, container.clientHeight - 32);

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const fitScale = Math.min(containerWidth / unscaledViewport.width, containerHeight / unscaledViewport.height);
        
        const scale = zoomMode === 'fit' ? fitScale : fitScale * zoom;
        const viewport = page.getViewport({ scale: scale * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        const renderContext = { canvasContext: ctx!, viewport };
        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;

        if (!isCancelled) {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImgUrl(dataUrl);
          setImgSize({ width: canvas.width / dpr, height: canvas.height / dpr });
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException' && !err?.message?.includes('cancelled')) {
          console.error('Mobile render error:', err);
        }
      } finally {
        // 【重要】iOS OOM対策：作業用Canvasのメモリを即時解放し参照を切る
        canvas.width = 0;
        canvas.height = 0;
        if (pageObjRef.current) {
          try { pageObjRef.current.cleanup(); } catch (e) {}
          pageObjRef.current = null;
        }
        if (!isCancelled) setIsRendering(false);
      }
    };

    renderToImage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (pageObjRef.current) {
        try { pageObjRef.current.cleanup(); } catch (e) {}
        pageObjRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, pages, zoom, zoomMode]);

  const showSplitLine = settings.pageProcessingMode === 'spread_split' && !settings.independentSplitFrames;
  const isIndependent = settings.pageProcessingMode === 'spread_split' && settings.independentSplitFrames;

  const renderCropOverlay = (rect: NormalizedRect, color: string) => {
    const left = rect.x * imgSize.width;
    const top = rect.y * imgSize.height;
    const width = rect.width * imgSize.width;
    const height = rect.height * imgSize.height;

    return (
      <div
        style={{
          position: 'absolute',
          left: `${left}px`,
          top: `${top}px`,
          width: `${width}px`,
          height: `${height}px`,
          border: `2px solid ${color}`,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />
    );
  };

  const splitLineX = showSplitLine
    ? getSplitLineNormalizedX(cropRect, settings.splitOffsetPercent) * imgSize.width
    : 0;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#111318',
        overflow: 'hidden',
        padding: '16px',
      }}
    >
      {isRendering && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(17, 19, 24, 0.5)', backdropFilter: 'blur(2px)'
        }}>
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      )}

      {imgUrl && (
        <div style={{ position: 'relative', width: imgSize.width, height: imgSize.height }}>
          <img
            src={imgUrl}
            alt="Score Page"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
          />

          {/* Dark overlay mask */}
          <div
            style={{
              position: 'absolute',
              left: isIndependent ? 0 : cropRect.x * imgSize.width,
              top: isIndependent ? 0 : cropRect.y * imgSize.height,
              width: isIndependent ? 0 : cropRect.width * imgSize.width,
              height: isIndependent ? 0 : cropRect.height * imgSize.height,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          />

          {!isIndependent ? (
            <>
              {renderCropOverlay(cropRect, 'var(--color-green)')}
              {showSplitLine && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${splitLineX - 2}px`,
                    top: `${cropRect.y * imgSize.height}px`,
                    width: '4px',
                    height: `${cropRect.height * imgSize.height}px`,
                    background: 'var(--color-orange)',
                    zIndex: 8,
                    opacity: 0.9,
                  }}
                />
              )}
            </>
          ) : (
            <>
              {renderCropOverlay(leftCropRect, 'var(--color-cyan)')}
              {renderCropOverlay(rightCropRect, 'var(--color-emerald)')}
            </>
          )}
        </div>
      )}
    </div>
  );
}
