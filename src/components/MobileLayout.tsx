import { useCallback, useEffect, useRef, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { createPageRenderer } from '../engine/pdfEngine';
import { FilmStrip } from './FilmStrip';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Settings,
  Undo2,
  LayoutGrid
} from 'lucide-react';

/**
 * MobileLayout — モバイル完全専用設計
 */
export function MobileLayout() {
  const pdfDoc = useScoreStore((s) => s.pdfDoc);
  const pages = useScoreStore((s) => s.pages);
  const currentPage = useScoreStore((s) => s.currentPage);
  const setCurrentPage = useScoreStore((s) => s.setCurrentPage);
  const deletePage = useScoreStore((s) => s.deletePage);
  const undoAction = useScoreStore((s) => s.undoAction);
  const historyIndex = useScoreStore((s) => s.historyIndex);
  
  const isExporting = useScoreStore((s) => s.isExporting);
  const exportPdf = useScoreStore((s) => s.exportPdf);
  const loadPdfFromFile = useScoreStore((s) => s.loadPdfFromFile);
  const pdfFileName = useScoreStore((s) => s.pdfFileName);
  const settingsVersion = useScoreStore((s) => s.settingsVersion);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef(createPageRenderer());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeSheet, setActiveSheet] = useState<'none' | 'settings' | 'thumbnails'>('none');
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // ── フルスクリーンPDF描画 ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!pdfDoc || !canvas) return;

    let cancelled = false;

    const renderPage = async () => {
      const pageEntry = pages[currentPage];
      if (!pageEntry || pageEntry.isBlank || pageEntry.deleted) {
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
  }, [pdfDoc, currentPage, pages, settingsVersion]); // settingsVersion を監視して再描画

  // ── タッチ＆ジェスチャー処理 ────────────────────────────────────
  const touchStartRef = useRef<{ 
    x: number; y: number; 
    pointers: { id: number; x: number; y: number }[];
    initialDist?: number;
    initialZoom?: number;
  } | null>(null);

  const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const pointers = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    touchStartRef.current = {
      x: pointers[0].x,
      y: pointers[0].y,
      pointers
    };
    if (pointers.length === 2) {
      touchStartRef.current.initialDist = getDistance(pointers[0], pointers[1]);
      touchStartRef.current.initialZoom = zoom;
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const pointers = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }));
    
    if (pointers.length === 2 && touchStartRef.current.initialDist && touchStartRef.current.initialZoom) {
      // ピンチズーム
      const currentDist = getDistance(pointers[0], pointers[1]);
      const scale = currentDist / touchStartRef.current.initialDist;
      const newZoom = Math.max(1, Math.min(5, touchStartRef.current.initialZoom * scale));
      setZoom(newZoom);
    } else if (pointers.length === 1 && zoom > 1) {
      // パン
      const dx = pointers[0].x - touchStartRef.current.x;
      const dy = pointers[0].y - touchStartRef.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      touchStartRef.current.x = pointers[0].x;
      touchStartRef.current.y = pointers[0].y;
    }
  }, [zoom]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length !== 1) return;
      if (zoom > 1) return; // ズーム中はスワイプページ送りを無効化
      
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

      // スワイプ判定 (横スクロール)
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0 && currentPage < pages.length - 1) {
          setCurrentPage(currentPage + 1);
        } else if (dx > 0 && currentPage > 0) {
          setCurrentPage(currentPage - 1);
        }
      }
      touchStartRef.current = null;
    },
    [currentPage, pages.length, setCurrentPage, zoom],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdfFromFile(file);
    },
    [loadPdfFromFile],
  );

  const activeCount = pages.filter((p) => !p.deleted).length;
  const pageLabel = pages.length > 0 ? `P. ${currentPage + 1} / ${pages.length}` : '—';
  const canUndo = historyIndex >= 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100dvh', // 100dvh でアドレスバー対応
        overflow: 'hidden',
        background: 'var(--color-base)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* ── ミニマル上部バー ────────────────────────────────── */}
      <header
        style={{
          height: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(23, 25, 33, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '50%',
          }}
        >
          {pdfFileName || 'Score Optimizer'}
        </span>
        
        <span style={{ fontSize: '12px', color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
          {pageLabel}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {!pdfDoc ? (
            <button
              className="btn btn-sm btn-accent"
              onClick={() => fileInputRef.current?.click()}
            >
              PDF読込
            </button>
          ) : (
            <button
              className="btn btn-sm btn-accent"
              onClick={exportPdf}
              disabled={isExporting}
              style={{ padding: '0 12px' }}
            >
              出力
            </button>
          )}
        </div>
      </header>

      {/* ── 中央タッチキャンバス ────────────────── */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#0a0b0e',
          touchAction: 'none', // ブラウザネイティブのスクロールを無効化
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
            }}
          >
            <div style={{ fontSize: '48px', opacity: 0.3 }}>🎵</div>
            <p>PDF を選択してください</p>
          </div>
        ) : (
          <div
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: zoom === 1 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
        )}
      </div>

      {/* ── 下部フローティングアクションバー ──────────── */}
      {pdfDoc && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px',
              background: 'rgba(30, 33, 43, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '999px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <button
              className="btn btn-sm btn-icon"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 0}
              style={{ borderRadius: '50%', width: '40px', height: '40px' }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              className="btn btn-sm btn-icon"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= pages.length - 1}
              style={{ borderRadius: '50%', width: '40px', height: '40px' }}
            >
              <ChevronRight size={20} />
            </button>

            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

            <button
              className={`btn btn-sm btn-icon ${activeSheet === 'settings' ? 'btn-accent' : ''}`}
              onClick={() => setActiveSheet(activeSheet === 'settings' ? 'none' : 'settings')}
              style={{ borderRadius: '50%', width: '40px', height: '40px' }}
            >
              <Settings size={18} />
            </button>

            <button
              className={`btn btn-sm btn-icon ${activeSheet === 'thumbnails' ? 'btn-accent' : ''}`}
              onClick={() => setActiveSheet(activeSheet === 'thumbnails' ? 'none' : 'thumbnails')}
              style={{ borderRadius: '50%', width: '40px', height: '40px' }}
            >
              <LayoutGrid size={18} />
            </button>

            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

            <button
              className="btn btn-sm btn-icon"
              onClick={() => undoAction()}
              disabled={!canUndo}
              style={{ borderRadius: '50%', width: '40px', height: '40px' }}
            >
              <Undo2 size={16} />
            </button>

            <button
              className="btn btn-sm btn-icon"
              onClick={() => deletePage(currentPage)}
              disabled={activeCount <= 1}
              style={{ borderRadius: '50%', width: '40px', height: '40px', color: 'var(--color-danger)' }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── 引き出し式ボトムシート (Drawer) ──────────────────────── */}
      {activeSheet !== 'none' && (
        <>
          {/* バックドロップ (タップで閉じる用) */}
          <div 
            onClick={() => setActiveSheet('none')}
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 90,
              animation: 'fadeIn 0.2s ease'
            }}
          />
          
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '75dvh',
              background: 'var(--color-panel)',
              borderTop: '1px solid var(--color-border)',
              borderRadius: '24px 24px 0 0',
              zIndex: 100,
              paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          >
            {/* Drawer Handle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '12px 0',
                flexShrink: 0
              }}
              onClick={() => setActiveSheet('none')}
            >
              <div style={{ width: '40px', height: '5px', borderRadius: '3px', background: 'var(--color-border-hover)' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {activeSheet === 'thumbnails' && (
                <div style={{ margin: '0 -20px' }}>
                  <div style={{ padding: '0 20px', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>サムネイル一覧</div>
                  {/* FilmStripコンポーネントを再利用 */}
                  <FilmStrip />
                </div>
              )}

              {activeSheet === 'settings' && (
                <>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>設定</div>
                  
                  {/* 用紙選択 */}
                  <div>
                    <div className="section-title">用紙サイズ</div>
                    <select
                      value={useScoreStore.getState().selectedPaper}
                      onChange={(e) => useScoreStore.getState().setSelectedPaper(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                        fontSize: '16px'
                      }}
                    >
                      <option value="a4_portrait">A4 縦</option>
                      <option value="b4_portrait">B4 縦 (日本のオケ標準)</option>
                      <option value="kiku_music">菊倍判 (楽譜標準)</option>
                      <option value="a3_landscape">A3 横 (見開きスコア)</option>
                      <option value="a3_portrait">A3 縦 (総譜)</option>
                      <option value="us_letter">US Letter</option>
                      <option value="custom">カスタム (mm入力)</option>
                    </select>
                  </div>

                  {/* モード */}
                  <div>
                    <div className="section-title">ページ処理</div>
                    <div className="radio-group" style={{ display: 'flex' }}>
                      <div
                        className={`radio-option ${useScoreStore.getState().settings.pageProcessingMode === 'spread_split' ? 'active' : ''}`}
                        onClick={() => useScoreStore.getState().updateSettings({ pageProcessingMode: 'spread_split' })}
                        style={{ padding: '12px', fontSize: '14px' }}
                      >見開き分割</div>
                      <div
                        className={`radio-option ${useScoreStore.getState().settings.pageProcessingMode === 'single_fit' ? 'active' : ''}`}
                        onClick={() => useScoreStore.getState().updateSettings({ pageProcessingMode: 'single_fit' })}
                        style={{ padding: '12px', fontSize: '14px' }}
                      >単ページ</div>
                    </div>
                  </div>

                  {/* 独立枠設定 */}
                  {useScoreStore.getState().settings.pageProcessingMode === 'spread_split' && (
                    <label className="checkbox-row" style={{ padding: '8px 0' }}>
                      <input
                        type="checkbox"
                        checked={useScoreStore.getState().settings.independentSplitFrames}
                        onChange={(e) => useScoreStore.getState().updateSettings({ independentSplitFrames: e.target.checked })}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <span style={{ fontSize: '15px' }}>左右個別枠を有効にする</span>
                    </label>
                  )}

                  {/* 自動クロップ */}
                  <div>
                    <div className="section-title">自動クロップ</div>
                    <button
                      className="btn btn-green"
                      onClick={() => {
                        useScoreStore.getState().detectBlackMargins();
                        setActiveSheet('none');
                      }}
                      style={{ width: '100%', marginBottom: '12px', padding: '12px', fontSize: '15px' }}
                    >✨ 黒枠を自動検出</button>
                    <label className="checkbox-row" style={{ padding: '8px 0' }}>
                      <input
                        type="checkbox"
                        checked={useScoreStore.getState().settings.autoCropEnabled}
                        onChange={(e) => useScoreStore.getState().updateSettings({ autoCropEnabled: e.target.checked })}
                        style={{ transform: 'scale(1.2)' }}
                      />
                      <span style={{ fontSize: '15px' }}>自動トリミングを使う</span>
                    </label>
                  </div>

                  <div style={{ height: '1px', background: 'var(--color-border)', margin: '8px 0' }} />

                  {/* 一括適用 */}
                  <div>
                    <button
                      className="btn btn-accent"
                      onClick={() => {
                        useScoreStore.getState().applySettingsToAllPages();
                        setActiveSheet('none');
                      }}
                      style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold' }}
                    >
                      現在の設定を全ページに適用
                    </button>
                  </div>
                  
                  <div>
                    <button
                      className="btn"
                      onClick={() => {
                        useScoreStore.getState().resetToDefaults();
                        setActiveSheet('none');
                      }}
                      style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                    >
                      初期値にリセット
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
      
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
