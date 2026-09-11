import { useCallback, useRef, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { MainCanvas } from './MainCanvas';
import { FilmStrip } from './FilmStrip';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutGrid,
  Download,
  Trash2,
  FilePlus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import type { PaperPresetKey, NormalizedRect } from '../types';

export function MobileLayout() {
  const {
    pdfDoc, pages, currentPage, setCurrentPage,
    isExporting, exportPdf, loadPdfFromFile, pdfFileName,
    settings, updateSettings, detectBlackMargins, isDetecting,
    applySettingsToAllPages, resetToDefaults,
    selectedPaper, setSelectedPaper,
    deletePage, insertBlankPage
  } = useScoreStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSheet, setActiveSheet] = useState<'none' | 'settings' | 'thumbnails'>('none');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdfFromFile(file);
    },
    [loadPdfFromFile],
  );

  const activeCount = pages.filter((p) => !p.deleted).length;
  const pageLabel = pages.length > 0 ? `P. ${currentPage + 1}/${pages.length}` : '—';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApplyAll = () => {
    applySettingsToAllPages();
    showToast('全ページに適用しました');
    setActiveSheet('none');
  };
  
  const nudgeCrop = (dx: number, dy: number) => {
    const s = useScoreStore.getState();
    const update = (rect: NormalizedRect) => ({
      ...rect,
      x: Math.max(0, Math.min(1 - rect.width, rect.x + dx)),
      y: Math.max(0, Math.min(1 - rect.height, rect.y + dy))
    });
    s.setCropRect(update(s.cropRect));
    s.setLeftCropRect(update(s.leftCropRect));
    s.setRightCropRect(update(s.rightCropRect));
  };

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
      {/* ── Header & Segmented Control ── */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(23, 25, 33, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', height: '44px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
            {pdfFileName || 'Score Optimizer'}
          </span>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
          {!pdfDoc && (
            <button className="btn btn-sm btn-accent" onClick={() => fileInputRef.current?.click()}>
              PDF読込
            </button>
          )}
        </div>
        
        {pdfDoc && (
          <div style={{ padding: '0 12px 12px 12px' }}>
            <div style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '10px',
              padding: '4px',
              width: '100%',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <button
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: settings.pageProcessingMode === 'spread_split' ? 'var(--color-accent)' : 'transparent',
                  color: settings.pageProcessingMode === 'spread_split' ? '#fff' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', border: 'none',
                  boxShadow: settings.pageProcessingMode === 'spread_split' ? '0 2px 8px rgba(79, 70, 229, 0.4)' : 'none'
                }}
                onClick={() => updateSettings({ pageProcessingMode: 'spread_split' })}
              >
                見開き2分割
              </button>
              <button
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  background: settings.pageProcessingMode === 'single_fit' ? 'var(--color-accent)' : 'transparent',
                  color: settings.pageProcessingMode === 'single_fit' ? '#fff' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', border: 'none',
                  boxShadow: settings.pageProcessingMode === 'single_fit' ? '0 2px 8px rgba(79, 70, 229, 0.4)' : 'none'
                }}
                onClick={() => updateSettings({ pageProcessingMode: 'single_fit' })}
              >
                単ページ幅統一
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── Main Canvas ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MainCanvas />
      </div>

      {/* ── Bottom Thumb Dock ── */}
      {pdfDoc && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '0',
          right: '0',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 20,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'rgba(20, 23, 31, 0.9)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '999px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'auto',
          }}>
            <button className="btn btn-icon" style={{ borderRadius: '50%', width: '44px', height: '44px', background: 'transparent', border: 'none' }} onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage <= 0}>
              <ChevronLeft size={24} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, width: '60px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              {pageLabel}
            </span>
            <button className="btn btn-icon" style={{ borderRadius: '50%', width: '44px', height: '44px', background: 'transparent', border: 'none' }} onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage >= pages.length - 1}>
              <ChevronRight size={24} />
            </button>
            
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
            
            <button className="btn btn-icon" style={{ borderRadius: '50%', width: '44px', height: '44px', background: activeSheet === 'settings' ? 'var(--color-accent)' : 'transparent', border: 'none', color: activeSheet === 'settings' ? '#fff' : 'inherit' }} onClick={() => setActiveSheet(activeSheet === 'settings' ? 'none' : 'settings')}>
              <Settings size={22} />
            </button>
            <button className="btn btn-icon" style={{ borderRadius: '50%', width: '44px', height: '44px', background: activeSheet === 'thumbnails' ? 'var(--color-accent)' : 'transparent', border: 'none', color: activeSheet === 'thumbnails' ? '#fff' : 'inherit' }} onClick={() => setActiveSheet(activeSheet === 'thumbnails' ? 'none' : 'thumbnails')}>
              <LayoutGrid size={22} />
            </button>
            
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
            
            <button className="btn btn-icon" style={{ borderRadius: '50%', width: '44px', height: '44px', background: 'var(--color-accent)', border: 'none', color: '#fff' }} onClick={exportPdf} disabled={isExporting}>
              <Download size={22} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom Sheet Drawer ── */}
      {activeSheet !== 'none' && (
        <>
          <div onClick={() => setActiveSheet('none')} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 90, animation: 'fadeIn 0.2s ease' }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '85dvh',
            background: 'var(--color-panel)', borderTop: '1px solid var(--color-border)',
            borderRadius: '24px 24px 0 0', zIndex: 100,
            paddingBottom: 'env(safe-area-inset-bottom, 20px)',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }} onClick={() => setActiveSheet('none')}>
              <div style={{ width: '48px', height: '5px', borderRadius: '3px', background: 'var(--color-border-hover)' }} />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {activeSheet === 'thumbnails' && (
                <div style={{ margin: '0 -24px' }}>
                  <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>ページ一覧</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-sm" onClick={() => insertBlankPage(currentPage)} style={{ background: 'var(--color-surface)' }}>
                        <FilePlus size={16} /> 白紙挿入
                      </button>
                      <button className="btn btn-sm" onClick={() => deletePage(currentPage)} disabled={activeCount <= 1} style={{ background: 'var(--color-surface)', color: 'var(--color-danger)' }}>
                        <Trash2 size={16} /> 削除
                      </button>
                    </div>
                  </div>
                  <FilmStrip />
                </div>
              )}

              {activeSheet === 'settings' && (
                <>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>設定</div>
                  
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

                  {/* 自動クロップ & 調整 */}
                  <div style={{ background: 'var(--color-surface)', padding: '20px', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                    <div className="section-title" style={{ marginBottom: '16px' }}>トリミング調整</div>
                    <button className="btn btn-green" onClick={() => detectBlackMargins()} disabled={isDetecting} style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, marginBottom: '20px', borderRadius: '12px' }}>
                      {isDetecting ? '検出中...' : '✨ 黒枠を自動検出'}
                    </button>
                    
                    <label className="checkbox-row" style={{ marginBottom: '20px' }}>
                      <input type="checkbox" checked={settings.autoCropEnabled} onChange={(e) => updateSettings({ autoCropEnabled: e.target.checked })} style={{ transform: 'scale(1.3)' }} />
                      <span style={{ fontSize: '16px', marginLeft: '4px' }}>自動トリミングを使う</span>
                    </label>

                    <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 -20px 20px', padding: '20px 20px 0' }}>
                      <div className="section-title">手動トリム (%)</div>
                      {[
                        { label: '左', key: 'manualTrimLeftPercent' },
                        { label: '右', key: 'manualTrimRightPercent' },
                        { label: '上', key: 'manualTrimTopPercent' },
                        { label: '下', key: 'manualTrimBottomPercent' }
                      ].map(trim => (
                        <div key={trim.key} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                            <span>{trim.label}</span>
                            <span>{(settings as any)[trim.key].toFixed(1)}%</span>
                          </div>
                          <input type="range" min="0" max="20" step="0.5" value={(settings as any)[trim.key]} onChange={(e) => updateSettings({ [trim.key]: Number(e.target.value) })} style={{ width: '100%' }} />
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 -20px', padding: '20px 20px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text)' }}>1mm微動 (十字キー)</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                          <div />
                          <button className="btn btn-icon" style={{ background: 'var(--color-base)' }} onClick={() => nudgeCrop(0, -0.005)}><ArrowUp size={18}/></button>
                          <div />
                          <button className="btn btn-icon" style={{ background: 'var(--color-base)' }} onClick={() => nudgeCrop(-0.005, 0)}><ArrowLeft size={18}/></button>
                          <button className="btn btn-icon" style={{ background: 'var(--color-base)' }} onClick={() => nudgeCrop(0, 0.005)}><ArrowDown size={18}/></button>
                          <button className="btn btn-icon" style={{ background: 'var(--color-base)' }} onClick={() => nudgeCrop(0.005, 0)}><ArrowRight size={18}/></button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 画質設定 */}
                  <div>
                    <div className="section-title">画質設定</div>
                    <label className="checkbox-row" style={{ marginBottom: '16px' }}>
                      <input type="checkbox" checked={settings.outputColorMode === 'monochrome'} onChange={(e) => updateSettings({ outputColorMode: e.target.checked ? 'monochrome' : 'original' })} style={{ transform: 'scale(1.3)' }} />
                      <span style={{ fontSize: '16px', marginLeft: '4px' }}>白黒二値化</span>
                    </label>
                    {settings.outputColorMode === 'monochrome' && (
                      <div style={{ padding: '0 8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
                          <span>二値化しきい値</span>
                          <span>{settings.fixedThreshold}</span>
                        </div>
                        <input type="range" min="80" max="230" value={settings.fixedThreshold} onChange={(e) => updateSettings({ fixedThreshold: Number(e.target.value) })} style={{ width: '100%' }} />
                      </div>
                    )}
                  </div>

                  {/* 一括・リセット */}
                  <div style={{ marginTop: '16px' }}>
                    <button className="btn btn-accent" onClick={handleApplyAll} style={{ width: '100%', padding: '18px', fontSize: '16px', fontWeight: 700, marginBottom: '12px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)' }}>
                      現在の設定を全ページに適用
                    </button>
                    <button className="btn" onClick={() => { resetToDefaults(); setActiveSheet('none'); }} style={{ width: '100%', padding: '16px', fontSize: '15px', borderRadius: '12px', background: 'var(--color-surface)' }}>
                      初期値にリセット
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {toastMessage && (
        <div style={{
          position: 'absolute', top: '90px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-green)', color: '#fff', padding: '14px 28px',
          borderRadius: '999px', fontSize: '14px', fontWeight: 700,
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)', zIndex: 110, pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease, slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}>
          {toastMessage}
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
