import { useCallback, useRef, useState, useEffect } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { MobileScoreViewer } from './MobileScoreViewer';
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
  FilePlus2,
  Move,
  Maximize,
  HelpCircle,
  Undo2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crop,
  SlidersHorizontal,
  Sparkles,
  FileUp,
  Hand,
  Scissors,
  FileText
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
    detectBlackMargins, isDetecting,
    applySettingsToAllPages, resetToDefaults,
    selectedPaper, setSelectedPaper,
    deletePage, insertBlankPage,
    zoom, setZoom,
    pan, setPan, touchMode, setTouchMode,
    nudgeCropRect, setCropRect, setLeftCropRect, setRightCropRect,
    undoAction
  } = useScoreStore();


  const updateMobileSettings = (partial: Partial<any>) => {
    const store = useScoreStore.getState();
    const currentOverride = store.pageOverrides[store.currentPage];
    if (currentOverride) {
      store.pageOverrides[store.currentPage] = { ...currentOverride, ...partial };
      // trigger re-render by calling a dummy state update or explicitly setting overrides
      useScoreStore.setState({ pageOverrides: { ...store.pageOverrides }, settingsVersion: store.settingsVersion + 1 });
    } else {
      store.updateSettings(partial);
    }
  };

  const globalSettings = useScoreStore(s => s.settings);
  const pageOverrides = useScoreStore(s => s.pageOverrides);
  const override = pageOverrides[currentPage];
  const settings = override ? { ...globalSettings, ...override } : globalSettings;
  const hasOverride = !!override;
  const removePageOverride = useScoreStore((s) => s.removePageOverride);
  const setIsHelpOpen = useScoreStore((s) => s.setIsHelpOpen);

  const exportDpi = useScoreStore(s => s.exportDpi);
  const setExportDpi = useScoreStore(s => s.setExportDpi);
  const customPaperMm = useScoreStore(s => s.customPaperMm);
  const setCustomPaperMm = useScoreStore(s => s.setCustomPaperMm);
  const marginMm = useScoreStore(s => s.marginMm);
  const setMarginMm = useScoreStore(s => s.setMarginMm);
  const isAspectRatioLocked = useScoreStore(s => s.isAspectRatioLocked);
  const setIsAspectRatioLocked = useScoreStore(s => s.setIsAspectRatioLocked);
  const savePageOverride = useScoreStore(s => s.savePageOverride);
  const rotatePage = useScoreStore(s => s.rotatePage);
  const rotateOddPages = useScoreStore(s => s.rotateOddPages);
  const rotateEvenPages = useScoreStore(s => s.rotateEvenPages);
  const rotateAllPages = useScoreStore(s => s.rotateAllPages);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSheet, setActiveSheet] = useState<'none' | 'settings' | 'thumbnails' | 'nudge'>('none');
  const [activeTab, setActiveTab] = useState<'paper' | 'crop' | 'filter' | 'page'>('paper');
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
      onDrag: ({ direction: [dx], swipe: [swipeX], distance: [distX], delta: [deltaX, deltaY], touches, cancel }) => {
        if (touches >= 2 || touchMode === 'scroll') {
          setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        }
        
        if (zoom <= 1.05 && touches === 1 && touchMode === 'scroll') {
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
      }
    },
    {
      pinch: { scaleBounds: { min: 1, max: 5 }, rubberband: true },
      drag: { filterTaps: true, threshold: 10 }
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
          touchAction: 'none',
          overflow: 'hidden'
        }}
      >
        <div style={{ flex: 1, display: 'flex', width: '100%', height: '100%', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}>
          <ErrorBoundary>
            <MobileScoreViewer />
          </ErrorBoundary>
        </div>
      </div>

      {/* ── Action Bar (Bottom Fixed - 64px) ── */}
      <div style={{
        height: '64px',
        background: 'var(--color-panel)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        padding: '0 8px'
      }}>
        <button type="button" className="btn btn-icon" aria-label="前" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(currentPage - 1); if (navigator.vibrate) navigator.vibrate(10); }} disabled={currentPage <= 0} style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'transparent' }}>
          <ChevronLeft size={24} />
        </button>
        
        <button type="button" className="btn btn-icon" aria-label="戻す" onClick={(e) => { e.preventDefault(); e.stopPropagation(); undoAction(); }} style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'transparent' }}>
          <Undo2 size={22} />
        </button>
        
        <button type="button" className="btn btn-icon" aria-label="枠微動" onClick={() => setActiveSheet('nudge')} style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeSheet === 'nudge' ? 'var(--color-surface)' : 'transparent', color: activeSheet === 'nudge' ? 'var(--color-accent)' : '#fff' }}>
          <Move size={22} />
        </button>

        {/* ✋ / ✂️ Touch Mode Toggle */}
        <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: '12px', padding: '4px' }}>
          <button 
            type="button" 
            onClick={() => setTouchMode('scroll')}
            style={{ 
              width: '48px', height: '48px', borderRadius: '8px', 
              background: touchMode === 'scroll' ? 'var(--color-accent)' : 'transparent',
              color: touchMode === 'scroll' ? '#fff' : 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none'
            }}
          >
            <Hand size={20} />
          </button>
          <button 
            type="button" 
            onClick={() => setTouchMode('crop')}
            style={{ 
              width: '48px', height: '48px', borderRadius: '8px', 
              background: touchMode === 'crop' ? 'var(--color-accent)' : 'transparent',
              color: touchMode === 'crop' ? '#fff' : 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none'
            }}
          >
            <Scissors size={20} />
          </button>
        </div>

        <button type="button" className="btn btn-icon" aria-label="設定" onClick={() => setActiveSheet('settings')} style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeSheet === 'settings' ? 'var(--color-surface)' : 'transparent', color: activeSheet === 'settings' ? 'var(--color-accent)' : '#fff' }}>
          <Settings size={22} />
        </button>

        <button type="button" className="btn btn-icon" aria-label="一覧" onClick={() => setActiveSheet('thumbnails')} style={{ width: '48px', height: '48px', borderRadius: '12px', background: activeSheet === 'thumbnails' ? 'var(--color-surface)' : 'transparent', color: activeSheet === 'thumbnails' ? 'var(--color-accent)' : '#fff' }}>
          <LayoutGrid size={22} />
        </button>
        
        <button type="button" className="btn btn-icon" aria-label="次" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(currentPage + 1); if (navigator.vibrate) navigator.vibrate(10); }} disabled={currentPage >= pages.length - 1} style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'transparent' }}>
          <ChevronRight size={24} />
        </button>
      </div>

      {/* ── Bottom Sheet Drawer ── */}
      {activeSheet !== 'none' && (
        <>
          <div onClick={() => setActiveSheet('none')} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 90, animation: 'fadeIn 0.2s ease' }} />
          <div style={{
            position: 'fixed', bottom: '64px', left: 0, right: 0, maxHeight: 'calc(65dvh - 64px)',
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
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
                      <button type="button" className="btn btn-sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); insertBlankPage(currentPage); }} style={{ background: 'var(--color-surface)' }}>
                        <FilePlus2 size={16} /> 白紙を挿入
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', background: 'var(--color-surface)', padding: '4px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                      <button type="button" onClick={() => setActiveTab('paper')} style={{ padding: '8px 4px', borderRadius: '8px', background: activeTab === 'paper' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'paper' ? '#fff' : 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: 'none' }}>
                        <FileText size={16} /> 用紙・モード
                      </button>
                      <button type="button" onClick={() => setActiveTab('crop')} style={{ padding: '8px 4px', borderRadius: '8px', background: activeTab === 'crop' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'crop' ? '#fff' : 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: 'none' }}>
                        <Crop size={16} /> トリミング
                      </button>
                      <button type="button" onClick={() => setActiveTab('filter')} style={{ padding: '8px 4px', borderRadius: '8px', background: activeTab === 'filter' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'filter' ? '#fff' : 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: 'none' }}>
                        <SlidersHorizontal size={16} /> 画質・二値化
                      </button>
                      <button type="button" onClick={() => setActiveTab('page')} style={{ padding: '8px 4px', borderRadius: '8px', background: activeTab === 'page' ? 'var(--color-accent)' : 'transparent', color: activeTab === 'page' ? '#fff' : 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', border: 'none' }}>
                        <Settings size={16} /> 個別・回転
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
                            onClick={() => updateMobileSettings({ pageProcessingMode: 'spread_split' })}
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
                            onClick={() => updateMobileSettings({ pageProcessingMode: 'single_fit' })}
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

                          {selectedPaper === 'custom' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>幅 (mm)</span>
                                <input type="number" value={customPaperMm.w} onChange={(e) => setCustomPaperMm(Number(e.target.value) || 210, customPaperMm.h)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-base)', color: '#fff' }} min={50} max={1000} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>高さ (mm)</span>
                                <input type="number" value={customPaperMm.h} onChange={(e) => setCustomPaperMm(customPaperMm.w, Number(e.target.value) || 297)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-base)', color: '#fff' }} min={50} max={1000} />
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>余白 (mm)</span>
                              <input type="number" value={marginMm} onChange={(e) => setMarginMm(Number(e.target.value) || 0)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-base)', color: '#fff' }} min={0} max={50} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>アスペクト比</span>
                              <button type="button" onClick={() => setIsAspectRatioLocked(!isAspectRatioLocked)} style={{ padding: '12px', borderRadius: '8px', border: isAspectRatioLocked ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', background: isAspectRatioLocked ? 'rgba(79, 70, 229, 0.1)' : 'var(--color-base)', color: isAspectRatioLocked ? 'var(--color-accent)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                {isAspectRatioLocked ? '固定' : '自由'}
                              </button>
                            </div>
                          </div>

                          <div className="section-title">出力DPI</div>
                          <select
                            value={exportDpi}
                            onChange={(e) => setExportDpi(Number(e.target.value))}
                            style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontSize: '16px', outline: 'none', appearance: 'none', marginBottom: '16px' }}
                          >
                            <option value={150}>150 DPI (軽量)</option>
                            <option value={200}>200 DPI</option>
                            <option value={300}>300 DPI (標準印刷)</option>
                            <option value={400}>400 DPI (高精細)</option>
                            <option value={600}>600 DPI (最高峰)</option>
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
                          <input type="checkbox" checked={settings.autoCropEnabled} onChange={(e) => updateMobileSettings({ autoCropEnabled: e.target.checked })} style={{ transform: 'scale(1.3)' }} />
                          <span style={{ fontSize: '16px', marginLeft: '4px' }}>自動トリミングを使う</span>
                        </label>

                        <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 -20px 0', padding: '20px 20px 0' }}>
                          <div className="section-title">手動トリム (%)</div>
                          <DecoupledSlider label="左" value={settings.manualTrimLeftPercent} min={0} max={20} step={0.5} onChange={(v) => updateMobileSettings({ manualTrimLeftPercent: v })} />
                          <DecoupledSlider label="右" value={settings.manualTrimRightPercent} min={0} max={20} step={0.5} onChange={(v) => updateMobileSettings({ manualTrimRightPercent: v })} />
                          <DecoupledSlider label="上" value={settings.manualTrimTopPercent} min={0} max={20} step={0.5} onChange={(v) => updateMobileSettings({ manualTrimTopPercent: v })} />
                          <DecoupledSlider label="下" value={settings.manualTrimBottomPercent} min={0} max={20} step={0.5} onChange={(v) => updateMobileSettings({ manualTrimBottomPercent: v })} />
                        </div>
                      </div>
                    )}

                    {activeTab === 'filter' && (
                      <div>
                        <div className="section-title">画質設定</div>
                        <label className="checkbox-row" style={{ marginBottom: '16px' }}>
                          <input type="checkbox" checked={settings.outputColorMode === 'monochrome'} onChange={(e) => updateMobileSettings({ outputColorMode: e.target.checked ? 'monochrome' : 'original' })} style={{ transform: 'scale(1.3)' }} />
                          <span style={{ fontSize: '16px', marginLeft: '4px' }}>白黒二値化</span>
                        </label>
                        {settings.outputColorMode === 'monochrome' && (
                          <div style={{ padding: '0 8px' }}>
                            <DecoupledSlider label="二値化しきい値" value={settings.fixedThreshold} min={80} max={230} step={1} onChange={(v) => updateMobileSettings({ fixedThreshold: v })} />
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'page' as any && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                          <div className="section-title">個別設定</div>
                          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>現在のページの設定を個別保存できます。</p>
                          
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexDirection: 'column' }}>
                            {!hasOverride ? (
                              <button type="button" className="btn-accent" onClick={() => { savePageOverride(); showToast('個別設定を有効にしました'); }} style={{ padding: '12px', borderRadius: '12px', fontWeight: 700, border: 'none' }}>
                                このページだけ個別設定にする
                              </button>
                            ) : (
                              <button type="button" onClick={() => { removePageOverride(); showToast('個別設定を解除しました'); }} style={{ padding: '12px', borderRadius: '12px', fontWeight: 700, border: '1px solid var(--color-danger)', color: 'var(--color-danger)', background: 'transparent' }}>
                                個別設定を解除して全体に従う
                              </button>
                            )}
                          </div>

                          {hasOverride && (
                            <div style={{ fontSize: '12px', color: 'var(--color-orange)', fontWeight: 'bold', marginBottom: '8px' }}>
                              [ 個別設定中 ]
                            </div>
                          )}
                          {Object.keys(pageOverrides).length > 0 && (
                            <div>
                              <div style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginBottom: '8px' }}>個別設定一覧:</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {Object.keys(pageOverrides).map(Number).sort((a, b) => a - b).map((pageIdx) => (
                                  <button type="button" key={pageIdx} onClick={() => { setCurrentPage(pageIdx); setActiveSheet('none'); }} style={{ padding: '6px 12px', borderRadius: '8px', background: pageIdx === currentPage ? 'rgba(249, 115, 22, 0.2)' : 'var(--color-surface)', border: pageIdx === currentPage ? '1px solid var(--color-orange)' : '1px solid var(--color-border)', color: pageIdx === currentPage ? 'var(--color-orange)' : '#fff', fontSize: '13px', fontWeight: 600 }}>
                                    p.{pageIdx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="section-title">ページ回転</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button type="button" onClick={() => rotatePage(currentPage, 90)} style={{ padding: '12px', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff', fontWeight: 600 }}>
                              現在ページを 90° 回転
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button type="button" onClick={() => rotateOddPages(180)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff', fontWeight: 600 }}>
                                奇数ページ 180°
                              </button>
                              <button type="button" onClick={() => rotateEvenPages(180)} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff', fontWeight: 600 }}>
                                偶数ページ 180°
                              </button>
                            </div>
                            <button type="button" onClick={() => rotateAllPages(90)} style={{ padding: '12px', borderRadius: '12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff', fontWeight: 600 }}>
                              全ページ一括 90°
                            </button>
                          </div>
                        </div>
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
