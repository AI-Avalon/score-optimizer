import { useEffect, useRef, useCallback } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { createPageRenderer } from '../engine/pdfEngine';

/**
 * FilmStrip — 下部サムネイルフィルムストリップ
 *
 * 全ページのサムネイル一覧、現在ページハイライト、個別設定バッジ
 */

const THUMB_WIDTH = 80;
const THUMB_HEIGHT = 56;

export function FilmStrip() {
  const pdfDoc = useScoreStore((s) => s.pdfDoc);
  const totalPages = useScoreStore((s) => s.totalPages);
  const currentPage = useScoreStore((s) => s.currentPage);
  const setCurrentPage = useScoreStore((s) => s.setCurrentPage);
  const pageOverrides = useScoreStore((s) => s.pageOverrides);
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRenderers = useRef<Map<number, ReturnType<typeof createPageRenderer>>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // ── Auto-scroll to current page ───────────────────────────────
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const targetLeft = currentPage * (THUMB_WIDTH + 6) - container.clientWidth / 2 + THUMB_WIDTH / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [currentPage]);

  // ── Render thumbnails ─────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc) return;

    const renderThumbs = async () => {
      for (let i = 0; i < totalPages; i++) {
        const canvas = canvasRefs.current.get(i);
        if (!canvas) continue;

        let renderer = thumbRenderers.current.get(i);
        if (!renderer) {
          renderer = createPageRenderer();
          thumbRenderers.current.set(i, renderer);
        }

        try {
          const page = await (pdfDoc as any).getPage(i + 1);
          const defaultVp = page.getViewport({ scale: 1 });
          const scale = Math.min(
            THUMB_WIDTH / defaultVp.width,
            THUMB_HEIGHT / defaultVp.height,
          ) * 2; // 2x for sharpness
          await renderer.render(page, canvas, scale);
        } catch (_err) {
          // Ignore cancelled renders
        }
      }
    };

    renderThumbs();

    return () => {
      thumbRenderers.current.forEach((r) => r.cancel());
    };
  }, [pdfDoc, totalPages]);

  const handleClick = useCallback(
    (pageIdx: number) => {
      setCurrentPage(pageIdx);
    },
    [setCurrentPage],
  );

  const setCanvasRef = useCallback(
    (pageIdx: number, el: HTMLCanvasElement | null) => {
      if (el) {
        canvasRefs.current.set(pageIdx, el);
      }
    },
    [],
  );

  if (!pdfDoc || totalPages === 0) return null;

  return (
    <div
      className="safe-area-bottom"
      style={{
        height: 'var(--filmstrip-height)',
        minHeight: 'var(--filmstrip-height)',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-panel)',
        flexShrink: 0,
      }}
    >
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          overflowX: 'auto',
          overflowY: 'hidden',
          height: '100%',
        }}
      >
        {Array.from({ length: totalPages }, (_, i) => {
          const isActive = i === currentPage;
          const hasOverride = i in pageOverrides;

          return (
            <div
              key={i}
              onClick={() => handleClick(i)}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: `${THUMB_WIDTH}px`,
                height: `${THUMB_HEIGHT}px`,
                borderRadius: '4px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: isActive
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
                opacity: isActive ? 1 : 0.7,
                transition: 'border-color 0.15s ease, opacity 0.15s ease',
                background: '#1a1d24',
              }}
            >
              <canvas
                ref={(el) => setCanvasRef(i, el)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />

              {/* Page number */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '1px',
                  right: '3px',
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.6)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {i + 1}
              </div>

              {/* Override badge */}
              {hasOverride && <div className="override-badge" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
