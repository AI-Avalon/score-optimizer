import { useCallback, useRef, useState, useEffect } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { ScoreCanvas } from './ScoreCanvas';
import { FilmStrip } from './FilmStrip';
import { ErrorBoundary } from './ErrorBoundary';
import { useGesture } from '@use-gesture/react';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutGrid,
  Download,
  Trash2,
  FilePlus,
  Move,
  Maximize,
  HelpCircle,
  Undo2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  FileText,
  Crop,
  SlidersHorizontal,
  Sparkles,
  FileUp
} from 'lucide-react';
import type { PaperPresetKey } from '../types';
import { FULL_PAGE_RECT } from '../types';

function DecoupledSlider({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) {
  const [localValue, setLocalValue] = useState<number | null>(null);
  
  useEffect(() => {
    setLocalValue(null);
  }, [value]);

  const displayValue = localValue ?? value;

  return (
    <div style={{ marginBottom: '8px' }}>
      <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
        <span className="setting-label">{label}</span>
        <span className="setting-value">{Number.isInteger(step) ? displayValue : displayValue.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={(e) => setLocalValue(Number(e.target.value))}
        onPointerUp={() => { if (localValue !== null) { onChange(localValue); setLocalValue(null); } }}
        onTouchEnd={() => { if (localValue !== null) { onChange(localValue); setLocalValue(null); } }}
        onKeyUp={() => { if (localValue !== null) { onChange(localValue); setLocalValue(null); } }}
        style={{ width: '100%' }}
      />
    </div>
  );
}

export function MobileLayout() {
  const {
    pdfDoc, pages, currentPage, setCurrentPage,
    isExporting, exportPdf, loadPdfFromFile, pdfFileName,
    updateSettings, detectBlackMargins, isDetecting,
    applySettingsToAllPages, resetToDefaults,
    selectedPaper, setSelectedPaper,
    deletePage, insertBlankPage,
    zoom, setZoom,
    nudgeCropRect, setCropRect, setLeftCropRect, setRightCropRect,
    undoAction
  } = useScoreStore();

  const globalSettings = useScoreStore(s => s.settings);
  const pageOverrides = useScoreStore(s => s.pageOverrides);
  const override = pageOverrides[currentPage];
  const settings = override ? { ...globalSettings, ...override } : globalSettings;
  const hasOverride = !!override;
  const removePageOverride = useScoreStore((s) => s.removePageOverride);
  const setIsHelpOpen = useScoreStore((s) => s.setIsHelpOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSheet, setActiveSheet] = useState<'none' | 'settings' | 'thumbnails' | 'nudge'>('none');
  const [activeTab, setActiveTab] = useState<'paper' | 'crop' | 'filter'>('paper');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdfFromFile(file);
    },
    [loadPdfFromFile],
  );

  const activeCount = pages.filter((p) => !p.deleted).length;
  const pageLabel = pages.length > 0 ? `P. ${currentPage + 1} / ${pages.length}` : '—';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApplyAll = () => {
    applySettingsToAllPages();
    showToast('全ページに適用しました');
    setActiveSheet('none');
  };

  const doNudge = (dx: number, dy: number) => {
    nudgeCropRect(dx, dy);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const fitFullScreen = () => {
    setCropRect({ ...FULL_PAGE_RECT });
    setLeftCropRect({ ...FULL_PAGE_RECT });
    setRightCropRect({ ...FULL_PAGE_RECT });
    if (navigator.vibrate) navigator.vibrate(20);
    showToast('全画面にフィットさせました');
  };

  const bindGestures = useGesture(
    {
      onPinch: ({ offset: [d] }) => {
        setZoom(d);
      },
      onDrag: ({ direction: [dx], swipe: [swipeX], distance: [distX], cancel }) => {
        if (zoom > 1.05) return; // Only allow page swipe when not heavily zoomed
        if (swipeX === -1 || (dx < 0 && distX > 80)) {
          if (currentPage < pages.length - 1) {
            setCurrentPage(currentPage + 1);
            if (navigator.vibrate) navigator.vibrate(10);
          }
          cancel();
        } else if (swipeX === 1 || (dx > 0 && distX > 80)) {
          if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
            if (navigator.vibrate) navigator.vibrate(10);
          }
          cancel();
        }
      }
    },
    {
      pinch: { scaleBounds: { min: 1, max: 5 }, rubberband: true },
      drag: { axis: 'x', filterTaps: true, threshold: 10 }
    }
  );

  if (!pdfDoc) {
    return (
      <div
        className="mobile-layout-root"
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{
            background: 'var(--color-panel)', border: '1px solid var(--color-border)', borderRadius: '24px',
            padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxWidth: '400px', width: '100%'
          }}>
            <FileUp size={48} style={{ color: '#818cf8', marginBottom: '24px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '12px', color: '#fff' }}>楽譜PDFを選択</h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-dim)', marginBottom: '32px', lineHeight: 1.6 }}>
              A3見開き・B4/A4単ページ対応<br />（ドラッグ＆ドロップまたはタップ）
            </p>
            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
            <button
              type="button"
              className="btn btn-accent"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '16px 32px', fontSize: '16px', fontWeight: 700, borderRadius: '999px',
                width: '100%', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
              }}
            >
              PDFファイルを開く
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mobile-layout-root"
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
      {/* ── Top Header Bar (Absolute) ── */}
      <div style={{
        position: 'absolute', top: 'env(safe-area-inset-top, 0px)', left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', zIndex: 30, pointerEvents: 'none'
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          padding: '6px 12px', borderRadius: '16px', color: '#fff', fontSize: '13px', fontWeight: 600,
          pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span>{pageLabel}</span>
          {pdfFileName && (
            <span style={{ opacity: 0.7, maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pdfFileName}
            </span>
          )}
          {hasOverride && (
            <span style={{ background: 'var(--color-orange)', color: '#000', fontSize: '10px', padding: '2px 6px', borderRadius: '8px', fontWeight: 800 }}>
              カスタム中
            </span>
          )}
        </div>

        <div style={{ pointerEvents: 'auto', display: 'flex', gap: '8px' }}>
          {hasOverride && (
            <button type="button" 
              className="btn btn-sm" 
              onClick={removePageOverride}
              style={{ background: 'rgba(255,255,255,0.9)', color: '#000', fontWeight: 700 }}
            >
              戻す
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={() => setIsHelpOpen(true)} style={{ background: 'rgba(255,255,255,0.2)', padding: '6px' }}>
            <HelpCircle size={16} />
          </button>
          <button type="button" 
            className="btn btn-sm btn-accent" 
            onClick={exportPdf}
            disabled={isExporting || !pdfDoc}
            style={{ fontWeight: 700 }}
          >
            <Download size={14} style={{ marginRight: '4px' }} /> PDF出力
          </button>
        </div>
      </div>

      <div 
        {...bindGestures()}
        style={{ 
          flex: 1, 
          display: 'flex', // Crucial for inner flex: 1 to work
          position: 'relative',
          touchAction: 'none'
        }}
      >
        <ErrorBoundary>
          <ScoreCanvas />
        </ErrorBoundary>
      </div>

      {/* ── Action Bar (Bottom Fixed - 56px) ── */}
      <div style={{
        height: '56px',
        background: 'var(--color-panel)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        padding: '0 12px'
      }}>
        <button type="button" className="btn btn-icon" aria-label="前" onClick={() => { setCurrentPage(currentPage - 1); if (navigator.vibrate) navigator.vibrate(10); }} disabled={currentPage <= 0} style={{ width: '48px', height: '44px', borderRadius: '12px', background: 'transparent' }}>
          <ChevronLeft size={24} />
        </button>
        
        <button type="button" className="btn btn-icon" aria-label="戻す" onClick={() => undoAction()} style={{ width: '48px', height: '44px', borderRadius: '12px', background: 'transparent' }}>
          <Undo2 size={22} />
        </button>
        
        <button type="button" className="btn btn-icon" aria-label="枠微動" onClick={() => setActiveSheet('nudge')} style={{ width: '48px', height: '44px', borderRadius: '12px', background: activeSheet === 'nudge' ? 'var(--color-surface)' : 'transparent', color: activeSheet === 'nudge' ? 'var(--color-accent)' : '#fff' }}>
          <Move size={22} />
        </button>

        <button type="button" className="btn btn-icon" aria-label="設定" onClick={() => setActiveSheet('settings')} style={{ width: '48px', height: '44px', borderRadius: '12px', background: activeSheet === 'settings' ? 'var(--color-surface)' : 'transparent', color: activeSheet === 'settings' ? 'var(--color-accent)' : '#fff' }}>
          <Settings size={22} />
        </button>

        <button type="button" className="btn btn-icon" aria-label="一覧" onClick={() => setActiveSheet('thumbnails')} style={{ width: '48px', height: '44px', borderRadius: '12px', background: activeSheet === 'thumbnails' ? 'var(--color-surface)' : 'transparent', color: activeSheet === 'thumbnails' ? 'var(--color-accent)' : '#fff' }}>
          <LayoutGrid size={22} />
        </button>
        
        <button type="button" className="btn btn-icon" aria-label="次" onClick={() => { setCurrentPage(currentPage + 1); if (navigator.vibrate) navigator.vibrate(10); }} disabled={currentPage >= pages.length - 1} style={{ width: '48px', height: '44px', borderRadius: '12px', background: 'transparent' }}>
          <ChevronRight size={24} />
        </button>
      </div>

      {/* ── Bottom Sheet Drawer ── */}
      {activeSheet !== 'none' && (
        <>
          <div onClick={() => setActiveSheet('none')} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 90, animation: 'fadeIn 0.2s ease' }} />
          <div style={{
            position: 'fixed', bottom: '56px', left: 0, right: 0, maxHeight: 'calc(85dvh - 56px)',
            background: 'var(--color-panel)', borderTop: '1px solid var(--color-border)',
            borderRadius: '24px 24px 0 0', zIndex: 100,
            paddingBottom: 'env(safe-area-inset-bottom, 20px)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }} onClick={() => setActiveSheet('none')}>
              <div style={{ width: '48px', height: '5px', borderRadius: '3px', background: 'var(--color-border-hover)' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              
              {activeSheet === 'nudge' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '0 24px 24px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>枠微動 (Nudge)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div />
                    <button type="button" className="btn btn-surface" style={{ height: '64px', borderRadius: '16px' }} onClick={() => doNudge(0, -0.005)}><ArrowUp size={24} /></button>
                    <div />
                    <button type="button" className="btn btn-surface" style={{ height: '64px', borderRadius: '16px' }} onClick={() => doNudge(-0.005, 0)}><ArrowLeft size={24} /></button>
                    <button type="button" className="btn btn-surface" style={{ height: '64px', borderRadius: '16px' }} onClick={() => doNudge(0, 0.005)}><ArrowDown size={24} /></button>
                    <button type="button" className="btn btn-surface" style={{ height: '64px', borderRadius: '16px' }} onClick={() => doNudge(0.005, 0)}><ArrowRight size={24} /></button>
                  </div>
                  <button type="button" className="btn btn-accent" style={{ marginTop: '16px', width: '100%', padding: '16px', borderRadius: '12px' }} onClick={fitFullScreen}>
                    <Maximize size={18} style={{ marginRight: '8px' }} />
                    全画面フィット
                  </button>
                </div>
              )}

              {activeSheet === 'thumbnails' && (
                <div style={{ padding: '0 0 24px' }}>
                  <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>ページ一覧</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn btn-sm" onClick={() => insertBlankPage(currentPage)} style={{ background: 'var(--color-surface)' }}>
                        <FilePlus size={16} /> 白紙
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => deletePage(currentPage)} disabled={activeCount <= 1} style={{ background: 'var(--color-surface)', color: 'var(--color-danger)' }}>
                        <Trash2 size={16} /> 削除
                      </button>
                    </div>
                  </div>
                  <FilmStrip />
                </div>
              )}

              {activeSheet === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
                  {/* シートヘッダー & タブ切り替えバー */}
                  <div style={{ flexShrink: 0, borderBottom: '1px solid var(--color-border)', padding: '0 16px 12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', background: 'var(--color-surface)', padding: '4px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                      <button type="button" onClick={() => setActiveTab('paper')} style={{ padding: '8px 4px', borderRadius: '8px', background: activeTab === 'paper' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'paper' ? '#fff' : 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: 'none' }}>
                        <FileText size={16} /> 用紙・モード
                      </button>
                      <button type="button" onClick={() => setActiveTab('crop')} style={{ padding: '8px 4px', borderRadius: '8px', background: activeTab === 'crop' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'crop' ? '#fff' : 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: 'none' }}>
                        <Crop size={16} /> トリミング
                      </button>
                      <button type="button" onClick={() => setActiveTab('filter')} style={{ padding: '8px 4px', borderRadius: '8px', background: activeTab === 'filter' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'filter' ? '#fff' : 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: 'none' }}>
                        <SlidersHorizontal size={16} /> 画質・二値化
                      </button>
                    </div>
                  </div>

                  {/* スクロール可能なタブコンテンツ領域 */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {activeTab === 'paper' && (
                      <>
                        {/* Processing Mode */}
                        <div style={{ display: 'flex', gap: '8px', background: 'var(--color-surface)', padding: '6px', borderRadius: '12px' }}>
                          <button type="button"
                            style={{
                              flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
                              background: settings.pageProcessingMode === 'spread_split' ? 'var(--color-accent)' : 'transparent',
                              color: settings.pageProcessingMode === 'spread_split' ? '#fff' : 'rgba(255,255,255,0.6)',
                              border: 'none', transition: 'all 0.2s'
                            }}
                            onClick={() => updateSettings({ pageProcessingMode: 'spread_split' })}
                          >
                            見開き分割
                          </button>
                          <button type="button"
                            style={{
                              flex: 1, padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
                              background: settings.pageProcessingMode === 'single_fit' ? 'var(--color-accent)' : 'transparent',
                              color: settings.pageProcessingMode === 'single_fit' ? '#fff' : 'rgba(255,255,255,0.6)',
                              border: 'none', transition: 'all 0.2s'
                            }}
                            onClick={() => updateSettings({ pageProcessingMode: 'single_fit' })}
                          >
                            単ページ
                          </button>
                        </div>

                        {/* 用紙サイズ */}
                        <div>
                          <div className="section-title">用紙判型</div>
                          <select
                            value={selectedPaper}
                            onChange={(e) => setSelectedPaper(e.target.value as PaperPresetKey)}
                            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontSize: '16px', outline: 'none', appearance: 'none' }}
                          >
                            <option value="a4_portrait">A4 縦</option>
                            <option value="b4_portrait">B4 縦 (日本のオケ標準)</option>
                            <option value="kiku_music">菊倍判 (楽譜標準)</option>
                            <option value="a3_landscape">A3 横 (見開きスコア)</option>
                            <option value="us_letter">US Letter</option>
                            <option value="custom">カスタム (mm入力)</option>
                          </select>
                        </div>
                      </>
                    )}

                    {activeTab === 'crop' && (
                      <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                        <div className="section-title" style={{ marginBottom: '16px' }}>トリミング調整</div>
                        <button type="button" className="btn btn-green" onClick={() => detectBlackMargins()} disabled={isDetecting} style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, marginBottom: '20px', borderRadius: '12px' }}>
                          <Sparkles size={16} style={{ marginRight: '6px' }} />
                          {isDetecting ? '検出中...' : '黒枠を自動検出'}
                        </button>
                        
                        <label className="checkbox-row" style={{ marginBottom: '20px' }}>
                          <input type="checkbox" checked={settings.autoCropEnabled} onChange={(e) => updateSettings({ autoCropEnabled: e.target.checked })} style={{ transform: 'scale(1.3)' }} />
                          <span style={{ fontSize: '16px', marginLeft: '4px' }}>自動トリミングを使う</span>
                        </label>

                        <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 -20px 0', padding: '20px 20px 0' }}>
                          <div className="section-title">手動トリム (%)</div>
                          <DecoupledSlider label="左" value={settings.manualTrimLeftPercent} min={0} max={20} step={0.5} onChange={(v) => updateSettings({ manualTrimLeftPercent: v })} />
                          <DecoupledSlider label="右" value={settings.manualTrimRightPercent} min={0} max={20} step={0.5} onChange={(v) => updateSettings({ manualTrimRightPercent: v })} />
                          <DecoupledSlider label="上" value={settings.manualTrimTopPercent} min={0} max={20} step={0.5} onChange={(v) => updateSettings({ manualTrimTopPercent: v })} />
                          <DecoupledSlider label="下" value={settings.manualTrimBottomPercent} min={0} max={20} step={0.5} onChange={(v) => updateSettings({ manualTrimBottomPercent: v })} />
                        </div>
                      </div>
                    )}

                    {activeTab === 'filter' && (
                      <div>
                        <div className="section-title">画質設定</div>
                        <label className="checkbox-row" style={{ marginBottom: '16px' }}>
                          <input type="checkbox" checked={settings.outputColorMode === 'monochrome'} onChange={(e) => updateSettings({ outputColorMode: e.target.checked ? 'monochrome' : 'original' })} style={{ transform: 'scale(1.3)' }} />
                          <span style={{ fontSize: '16px', marginLeft: '4px' }}>白黒二値化</span>
                        </label>
                        {settings.outputColorMode === 'monochrome' && (
                          <div style={{ padding: '0 8px' }}>
                            <DecoupledSlider label="二値化しきい値" value={settings.fixedThreshold} min={80} max={230} step={1} onChange={(v) => updateSettings({ fixedThreshold: v })} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 最下部に常時固定されるアクションバー (Sticky Footer) */}
                  <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-panel)', display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => { resetToDefaults(); setActiveSheet('none'); }} style={{ padding: '12px 16px', background: 'var(--color-surface)', color: 'var(--color-text)', borderRadius: '12px', fontSize: '13px', fontWeight: 600, border: 'none' }}>
                      リセット
                    </button>
                    <button type="button" onClick={handleApplyAll} className="btn-accent" style={{ flex: 1, padding: '12px 16px', color: '#fff', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)' }}>
                      全ページに適用
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {toastMessage && (
        <div style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 16px) + 12px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-green)', color: '#fff', padding: '14px 28px',
          borderRadius: '999px', fontSize: '14px', fontWeight: 700,
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)', zIndex: 110, pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease, slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Invisible file input trigger */}
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
