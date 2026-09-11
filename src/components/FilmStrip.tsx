import { useEffect, useRef, useCallback } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { createPageRenderer } from '../engine/pdfEngine';
import { Plus } from 'lucide-react';

/**
 * FilmStrip — 下部サムネイルフィルムストリップ
 *
 * 全ページのサムネイル一覧、現在ページハイライト、個別設定バッジ
 * 白紙挿入ボタン（サムネイル間の + ボタン）
 * 削除済みページの半透明・打ち消し線表示
 * 回転バッジ表示
 */

const THUMB_WIDTH = 80;
const THUMB_HEIGHT = 56;

export function FilmStrip() {
  const pdfDoc = useScoreStore((s) => s.pdfDoc);
  const pages = useScoreStore((s) => s.pages);
  const currentPage = useScoreStore((s) => s.currentPage);
  const setCurrentPage = useScoreStore((s) => s.setCurrentPage);
  const pageOverrides = useScoreStore((s) => s.pageOverrides);
  const settingsVersion = useScoreStore((s) => s.settingsVersion);
  const insertBlankPage = useScoreStore((s) => s.insertBlankPage);
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
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const canvas = canvasRefs.current.get(i);
        if (!canvas) continue;

        if (page.isBlank) {
          // 白紙サムネイル
          canvas.width = THUMB_WIDTH * 2;
          canvas.height = THUMB_HEIGHT * 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#cccccc';
            ctx.font = '14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('白紙', canvas.width / 2, canvas.height / 2 + 5);
          }
          continue;
        }

        if (page.deleted) {
          // 削除済み: グレーサムネイル
          canvas.width = THUMB_WIDTH * 2;
          canvas.height = THUMB_HEIGHT * 2;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#2a2d35';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          continue;
        }

        let renderer = thumbRenderers.current.get(i);
        if (!renderer) {
          renderer = createPageRenderer();
          thumbRenderers.current.set(i, renderer);
        }

        try {
          const pdfPage = await (pdfDoc as unknown as { getPage(n: number): Promise<Parameters<ReturnType<typeof createPageRenderer>['render']>[0]> }).getPage(page.sourceIndex + 1);
          const defaultVp = pdfPage.getViewport({ scale: 1 });
          const scale = Math.min(
            THUMB_WIDTH / defaultVp.width,
            THUMB_HEIGHT / defaultVp.height,
          ) * 2; // 2x for sharpness
          await renderer.render(pdfPage, canvas, scale);
        } catch (_err) {
          // Ignore cancelled renders
        }
      }
    };

    renderThumbs();

    return () => {
      thumbRenderers.current.forEach((r) => r.cancel());
    };
  }, [pdfDoc, pages, settingsVersion]);

  const handleClick = useCallback(
    (pageIdx: number) => {
      setCurrentPage(pageIdx);
    },
    [setCurrentPage],
  );

  const handleInsertBlank = useCallback(
    (afterIdx: number) => {
      insertBlankPage(afterIdx);
    },
    [insertBlankPage],
  );

  const setCanvasRef = useCallback(
    (pageIdx: number, el: HTMLCanvasElement | null) => {
      if (el) {
        canvasRefs.current.set(pageIdx, el);
      }
    },
    [],
  );

  if (!pdfDoc || pages.length === 0) return null;

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
          gap: '2px',
          padding: '8px 12px',
          overflowX: 'auto',
          overflowY: 'hidden',
          height: '100%',
        }}
      >
        {pages.map((page, i) => {
          const isActive = i === currentPage;
          const hasOverride = i in pageOverrides;

          return (
            <div key={`page-group-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {/* サムネイル */}
              <div
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
                  opacity: page.deleted ? 0.3 : isActive ? 1 : 0.7,
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

                {/* 回転バッジ */}
                {page.rotation !== 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      fontSize: '8px',
                      background: 'rgba(96,165,250,0.8)',
                      color: 'white',
                      borderRadius: '3px',
                      padding: '0 3px',
                      lineHeight: '14px',
                    }}
                  >
                    {page.rotation}°
                  </div>
                )}

                {/* 削除済み打ち消し */}
                {page.deleted && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '80%',
                        height: '2px',
                        background: 'var(--color-danger)',
                        transform: 'rotate(-15deg)',
                      }}
                    />
                  </div>
                )}

                {/* 白紙ラベル */}
                {page.isBlank && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      fontSize: '8px',
                      background: 'rgba(74,222,128,0.8)',
                      color: 'white',
                      borderRadius: '3px',
                      padding: '0 3px',
                      lineHeight: '14px',
                    }}
                  >
                    白紙
                  </div>
                )}
              </div>

              {/* 白紙挿入ボタン (+ ボタン) */}
              <button type="button"
                onClick={() => handleInsertBlank(i)}
                style={{
                  flexShrink: 0,
                  width: '18px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: '1px dashed var(--color-border)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: 'var(--color-text-dim)',
                  opacity: 0.5,
                  transition: 'opacity 0.15s ease',
                  padding: 0,
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.5'; }}
                title="白紙ページを挿入"
              >
                <Plus size={10} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
