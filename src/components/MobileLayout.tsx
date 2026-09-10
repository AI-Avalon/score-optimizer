import { useCallback, useEffect, useRef, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { createPageRenderer } from '../engine/pdfEngine';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Settings,
  Download,
  Upload,
} from 'lucide-react';

/**
 * MobileLayout — モバイル完全専用設計 (画面幅 768px 未満)
 *
 * ui-ux-pro-workstation skill §3:
 * - 100dvh + iOS Safe Area 厳守
 * - フルスクリーンスコアプレビュー
 * - 引き出し式ボトムシート（Drawer）
 * - フローティングバー: [◀] [ページ番号] [▶] [削除] [設定]
 * - ピンチズーム + スワイプページ送り（基本タッチ実装）
 */
export function MobileLayout() {
  const pdfDoc = useScoreStore((s) => s.pdfDoc);
  const pages = useScoreStore((s) => s.pages);
  const currentPage = useScoreStore((s) => s.currentPage);
  const setCurrentPage = useScoreStore((s) => s.setCurrentPage);
  const deletePage = useScoreStore((s) => s.deletePage);
  const isExporting = useScoreStore((s) => s.isExporting);
  const exportPdf = useScoreStore((s) => s.exportPdf);
  const loadPdfFromFile = useScoreStore((s) => s.loadPdfFromFile);
  const pdfFileName = useScoreStore((s) => s.pdfFileName);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef(createPageRenderer());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── フルスクリーンPDF描画 ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdfDoc || !canvas) return;

    let cancelled = false;

    const renderPage = async () => {
      const pageEntry = pages[currentPage];
      if (!pageEntry || pageEntry.isBlank || pageEntry.deleted) {
        // 白紙/削除ページはキャンバスをクリア
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight * 0.7;
          ctx.fillStyle = '#1c2029';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (pageEntry?.isBlank) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          if (pageEntry?.deleted) {
            ctx.fillStyle = '#64748b';
            ctx.font = '16px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('削除済み', canvas.width / 2, canvas.height / 2);
          }
        }
        return;
      }

      try {
        const page = await (pdfDoc as unknown as { getPage(n: number): Promise<Parameters<typeof rendererRef.current.render>[0]> }).getPage(pageEntry.sourceIndex + 1);
        if (cancelled) return;

        const defaultViewport = page.getViewport({ scale: 1 });
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight * 0.7;
        const scale = Math.min(screenWidth / defaultViewport.width, screenHeight / defaultViewport.height);

        await rendererRef.current.render(page, canvas, scale);
      } catch (err) {
        if (!cancelled) console.error('Mobile render error:', err);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      rendererRef.current.cancel();
    };
  }, [pdfDoc, currentPage, pages]);

  // ── タッチスワイプ ────────────────────────────────────────────
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

      // 横方向のスワイプが縦方向より大きい場合のみ
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0) {
          // 左スワイプ → 次ページ
          setCurrentPage(currentPage + 1);
        } else {
          // 右スワイプ → 前ページ
          setCurrentPage(currentPage - 1);
        }
      }
      touchStartRef.current = null;
    },
    [currentPage, setCurrentPage],
  );

  const handlePrev = useCallback(() => setCurrentPage(currentPage - 1), [currentPage, setCurrentPage]);
  const handleNext = useCallback(() => setCurrentPage(currentPage + 1), [currentPage, setCurrentPage]);

  const handleDelete = useCallback(() => {
    deletePage(currentPage);
  }, [currentPage, deletePage]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdfFromFile(file);
    },
    [loadPdfFromFile],
  );

  const activeCount = pages.filter((p) => !p.deleted).length;
  const pageLabel = pages.length > 0 ? `${currentPage + 1} / ${pages.length}` : '—';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--color-base)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* ── ヘッダー ────────────────────────────────── */}
      <header
        style={{
          height: '48px',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-panel)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '60%',
          }}
        >
          {pdfFileName || 'Score Optimizer'}
        </span>

        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-sm"
            onClick={() => fileInputRef.current?.click()}
            aria-label="PDF追加"
          >
            <Upload size={14} />
          </button>
          <button
            className="btn btn-sm btn-accent"
            onClick={exportPdf}
            disabled={isExporting || !pdfDoc}
            aria-label="300DPI出力"
          >
            <Download size={14} />
          </button>
        </div>
      </header>

      {/* ── フルスクリーンキャンバス ────────────────── */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#111318',
          touchAction: 'pan-y pinch-zoom',
        }}
      >
        {!pdfDoc ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--color-text-dim)',
              fontSize: '14px',
              textAlign: 'center',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '48px', opacity: 0.3 }}>🎵</div>
            <p>PDF をドラッグ＆ドロップ<br />または上部ボタンから選択</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        )}
      </div>

      {/* ── フローティングアクションバー ──────────── */}
      {pdfDoc && (
        <div
          style={{
            height: '56px',
            minHeight: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '0 16px',
            borderTop: '1px solid var(--color-border)',
            background: 'var(--color-panel)',
            flexShrink: 0,
          }}
        >
          <button
            className="btn btn-sm"
            onClick={handlePrev}
            disabled={currentPage <= 0}
            aria-label="前のページ"
            style={{ padding: '8px 12px' }}
          >
            <ChevronLeft size={18} />
          </button>

          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text)',
              minWidth: '80px',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pageLabel}
          </span>

          <button
            className="btn btn-sm"
            onClick={handleNext}
            disabled={currentPage >= pages.length - 1}
            aria-label="次のページ"
            style={{ padding: '8px 12px' }}
          >
            <ChevronRight size={18} />
          </button>

          <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 4px' }} />

          <button
            className="btn btn-sm"
            onClick={handleDelete}
            disabled={activeCount <= 1}
            aria-label="ページ削除"
            style={{ padding: '8px', color: 'var(--color-danger)' }}
          >
            <Trash2 size={16} />
          </button>

          <button
            className="btn btn-sm"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label="設定"
            style={{ padding: '8px' }}
          >
            <Settings size={16} />
          </button>
        </div>
      )}

      {/* ── ボトムシートDrawer ──────────────────────── */}
      {drawerOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: '60dvh',
            overflowY: 'auto',
            background: 'var(--color-panel)',
            borderTop: '1px solid var(--color-border)',
            borderRadius: '16px 16px 0 0',
            zIndex: 100,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Drawer handle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '8px 0',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '4px',
                borderRadius: '2px',
                background: 'var(--color-border-hover)',
              }}
            />
          </div>

          <div style={{ padding: '0 16px 16px' }}>
            <div className="section-title" style={{ marginBottom: '8px' }}>
              設定
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              詳細設定はデスクトップ版をご利用ください。
            </p>

            <button
              className="btn btn-sm"
              onClick={() => setDrawerOpen(false)}
              style={{ width: '100%' }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
