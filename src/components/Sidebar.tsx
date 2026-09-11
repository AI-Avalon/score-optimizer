import { useCallback, useEffect, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { Sparkles, Save, Trash2, RotateCw, Copy, RefreshCcw, Lock, Unlock } from 'lucide-react';
import type { PageProcessingMode, PageOrder, OutputColorMode, FrontMatterMode, RotationDeg, PaperPresetKey } from '../types';
import { PAPER_PRESETS } from '../types';

/**
 * Sidebar — app.py の全機能を網羅した設定パネル
 *
 * Sections:
 * 1. ページ処理モード (spread_split / single_fit)
 * 2. 出力色 (monochrome / original)
 * 3. 自動クロップ (黒枠検出、大津二値化)
 * 4. 手動トリム (上下左右 %)
 * 5. 見開き設定 (分割位置、ページ順)
 * 6. ページ構成 (本文開始ページ、本文前)
 * 7. ページ個別設定
 * 8. 回転コントロール
 * 9. 一括操作
 */

function DecoupledSlider({ label, value, min, max, step, onChange }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void }) {
  const [localValue, setLocalValue] = useState<number | null>(null);
  
  useEffect(() => {
    setLocalValue(null);
  }, [value]);

  const displayValue = localValue ?? value;

  return (
    <div style={{ marginBottom: '8px' }}>
      <div className="setting-row">
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
      />
    </div>
  );
}

export function Sidebar() {
  const updateEffectiveSettings = useScoreStore((s) => s.updateEffectiveSettings);
  const detectBlackMargins = useScoreStore((s) => s.detectBlackMargins);
  const isDetecting = useScoreStore((s) => s.isDetecting);
  const savePageOverride = useScoreStore((s) => s.savePageOverride);
  const removePageOverride = useScoreStore((s) => s.removePageOverride);
  const pageOverrides = useScoreStore((s) => s.pageOverrides);
  const currentPage = useScoreStore((s) => s.currentPage);
  const setCurrentPage = useScoreStore((s) => s.setCurrentPage);
  const sidebarOpen = useScoreStore((s) => s.sidebarOpen);
  const rotatePage = useScoreStore((s) => s.rotatePage);
  const rotateOddPages = useScoreStore((s) => s.rotateOddPages);
  const rotateEvenPages = useScoreStore((s) => s.rotateEvenPages);
  const rotateAllPages = useScoreStore((s) => s.rotateAllPages);
  const applySettingsToAllPages = useScoreStore((s) => s.applySettingsToAllPages);
  const resetToDefaults = useScoreStore((s) => s.resetToDefaults);
  const pages = useScoreStore((s) => s.pages);
  const applyToAllNotification = useScoreStore((s) => s.applyToAllNotification);
  const applySettingsToRemainingPages = useScoreStore((s) => s.applySettingsToRemainingPages);
  const selectedPaper = useScoreStore((s) => s.selectedPaper);
  const setSelectedPaper = useScoreStore((s) => s.setSelectedPaper);
  const customPaperMm = useScoreStore((s) => s.customPaperMm);
  const setCustomPaperMm = useScoreStore((s) => s.setCustomPaperMm);
  const marginMm = useScoreStore((s) => s.marginMm);
  const setMarginMm = useScoreStore((s) => s.setMarginMm);
  const isAspectRatioLocked = useScoreStore((s) => s.isAspectRatioLocked);
  const setIsAspectRatioLocked = useScoreStore((s) => s.setIsAspectRatioLocked);
  const exportDpi = useScoreStore((s) => s.exportDpi);
  const setExportDpi = useScoreStore((s) => s.setExportDpi);
  
  const globalSettings = useScoreStore((s) => s.settings);
  const hasOverride = currentPage in pageOverrides;
  const override = pageOverrides[currentPage];
  const settings = override ? { ...globalSettings, ...override } : globalSettings;

  // ── Helpers ──────────────────────────────────────────────────────
  const radio = useCallback(
    <T extends string>(current: T, value: T, label: string, key: string, onChange: (v: T) => void) => (
      <div
        key={key}
        className={`radio-option ${current === value ? 'active' : ''}`}
        onClick={() => onChange(value)}
      >
        {label}
      </div>
    ),
    [],
  );


  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (applyToAllNotification > 0) {
      setToastMessage(`全 ${pages.length} ページに適用しました`);
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [applyToAllNotification, pages.length]);

  if (!sidebarOpen) return null;

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'var(--color-panel)',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div style={{ flex: 1, paddingBottom: '40px' }}>
      {/* ── 出力用紙設定 ──────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">出力用紙・品質設定</div>
        
        {/* 用紙選択 */}
        <div style={{ marginBottom: '8px' }}>
          <span className="setting-label" style={{ display: 'block', marginBottom: '4px' }}>用紙サイズ</span>
          <select
            data-testid="paper-select"
            value={selectedPaper}
            onChange={(e) => setSelectedPaper(e.target.value as PaperPresetKey)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {(Object.keys(PAPER_PRESETS) as PaperPresetKey[]).map((key) => (
              <option key={key} value={key}>
                {PAPER_PRESETS[key].label}
              </option>
            ))}
          </select>
        </div>

        {/* カスタム用紙サイズ入力 */}
        {selectedPaper === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="setting-label" style={{ fontSize: '11px' }}>幅 (mm)</span>
              <input
                type="number"
                value={customPaperMm.w}
                onChange={(e) => setCustomPaperMm(Number(e.target.value) || 210, customPaperMm.h)}
                style={{ width: '100%' }}
                placeholder="幅"
                min={50}
                max={1000}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="setting-label" style={{ fontSize: '11px' }}>高さ (mm)</span>
              <input
                type="number"
                value={customPaperMm.h}
                onChange={(e) => setCustomPaperMm(customPaperMm.w, Number(e.target.value) || 297)}
                style={{ width: '100%' }}
                placeholder="高"
                min={50}
                max={1000}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          {/* 余白入力 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="setting-label" style={{ fontSize: '11px' }}>余白 (mm)</span>
            <input
              type="number"
              value={marginMm}
              onChange={(e) => setMarginMm(Number(e.target.value) || 0)}
              style={{ width: '100%' }}
              min={0}
              max={50}
            />
          </div>

          {/* Aspect Ratio Lock */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="setting-label" style={{ fontSize: '11px' }}>アスペクト比</span>
            <button type="button"
              className="btn btn-sm"
              style={{
                width: '100%',
                justifyContent: 'center',
                color: isAspectRatioLocked ? 'var(--color-accent)' : 'var(--color-text-muted)',
                borderColor: isAspectRatioLocked ? 'var(--color-accent)' : 'var(--color-border)',
                background: isAspectRatioLocked ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
              }}
              onClick={() => setIsAspectRatioLocked(!isAspectRatioLocked)}
            >
              {isAspectRatioLocked ? <><Lock size={12} style={{ marginRight: '4px' }}/> 固定</> : <><Unlock size={12} style={{ marginRight: '4px' }}/> 自由</>}
            </button>
          </div>
        </div>
        
        {/* 出力DPI */}
        <div>
          <span className="setting-label" style={{ display: 'block', marginBottom: '4px' }}>出力DPI</span>
          <select
            value={exportDpi}
            onChange={(e) => setExportDpi(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value={150}>150 DPI (軽量)</option>
            <option value={200}>200 DPI</option>
            <option value={300}>300 DPI (標準印刷)</option>
            <option value={400}>400 DPI (高精細)</option>
            <option value={600}>600 DPI (最高峰)</option>
          </select>
        </div>
      </div>

      {/* ── 一括操作 ──────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">一括操作</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button type="button"
            className="btn btn-sm btn-green"
            onClick={applySettingsToAllPages}
            style={{ flex: '1 1 auto' }}
            disabled={pages.length === 0}
          >
            <Copy size={12} />
            全ページに適用
          </button>
          <button type="button"
            className="btn btn-sm"
            onClick={resetToDefaults}
            style={{ flex: '1 1 auto' }}
          >
            <RefreshCcw size={12} />
            初期設定にリセット
          </button>
          <button type="button"
            className="btn btn-sm btn-accent"
            onClick={applySettingsToRemainingPages}
            style={{ flex: '1 1 100%' }}
            disabled={pages.length === 0}
          >
            <Copy size={12} />
            このページ以降すべてに適用
          </button>
        </div>
      </div>

      {/* ── 1. ページ処理モード ──────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">ページ処理モード</div>
        <div className="radio-group">
          {radio<PageProcessingMode>(settings.pageProcessingMode, 'spread_split', '見開き分割', 'mode-spread', (v) => updateEffectiveSettings({ pageProcessingMode: v }))}
          {radio<PageProcessingMode>(settings.pageProcessingMode, 'single_fit', '単ページ', 'mode-single', (v) => updateEffectiveSettings({ pageProcessingMode: v }))}
        </div>
      </div>

      {/* ── 2. 出力色 ────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">出力色</div>
        <div className="radio-group">
          {radio<OutputColorMode>(settings.outputColorMode, 'monochrome', '白黒', 'color-mono', (v) => updateEffectiveSettings({ outputColorMode: v }))}
          {radio<OutputColorMode>(settings.outputColorMode, 'original', '元のまま', 'color-orig', (v) => updateEffectiveSettings({ outputColorMode: v }))}
        </div>
      </div>

      {/* ── 3. 自動クロップ ──────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">自動クロップ</div>

        <label className="checkbox-row" style={{ marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={settings.autoCropEnabled}
            onChange={(e) => updateEffectiveSettings({ autoCropEnabled: e.target.checked })}
          />
          自動トリミングを使う
        </label>

        <button type="button"
          className="btn btn-green btn-sm"
          onClick={detectBlackMargins}
          disabled={isDetecting}
          style={{ width: '100%', marginBottom: '10px' }}
        >
          <Sparkles size={14} style={{ marginRight: '4px' }} />
          {isDetecting ? '検出中...' : '黒枠を自動検出'}
        </button>

        <DecoupledSlider label="黒余白しきい値" value={settings.blackMarginThreshold} min={0} max={80} step={1} onChange={(v) => updateEffectiveSettings({ blackMarginThreshold: v })} />
        <DecoupledSlider label="クロップ余白 (px)" value={settings.cropPaddingPx} min={0} max={40} step={1} onChange={(v) => updateEffectiveSettings({ cropPaddingPx: v })} />

        <label className="checkbox-row" style={{ marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={settings.useAdaptiveThreshold}
            onChange={(e) => updateEffectiveSettings({ useAdaptiveThreshold: e.target.checked })}
          />
          適応的二値化（照明ムラ向け）
        </label>

        <DecoupledSlider label="固定二値化しきい値" value={settings.fixedThreshold} min={80} max={230} step={1} onChange={(v) => updateEffectiveSettings({ fixedThreshold: v })} />
      </div>

      {/* ── 4. 手動トリム ────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">手動トリム (%)</div>
        <DecoupledSlider label="左" value={settings.manualTrimLeftPercent} min={0} max={20} step={0.5} onChange={(v) => updateEffectiveSettings({ manualTrimLeftPercent: v })} />
        <DecoupledSlider label="右" value={settings.manualTrimRightPercent} min={0} max={20} step={0.5} onChange={(v) => updateEffectiveSettings({ manualTrimRightPercent: v })} />
        <DecoupledSlider label="上" value={settings.manualTrimTopPercent} min={0} max={20} step={0.5} onChange={(v) => updateEffectiveSettings({ manualTrimTopPercent: v })} />
        <DecoupledSlider label="下" value={settings.manualTrimBottomPercent} min={0} max={20} step={0.5} onChange={(v) => updateEffectiveSettings({ manualTrimBottomPercent: v })} />
      </div>

      {/* ── 5. 見開き設定 (spread_split のみ) ────────────────── */}
      {settings.pageProcessingMode === 'spread_split' && (
        <div className="settings-section">
          <div className="section-title">見開き設定</div>
          <DecoupledSlider label="分割位置補正 (%)" value={settings.splitOffsetPercent} min={-20} max={20} step={0.5} onChange={(v) => updateEffectiveSettings({ splitOffsetPercent: v })} />
          
          <label className="checkbox-row" style={{ marginTop: '12px', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={settings.independentSplitFrames}
              onChange={(e) => updateEffectiveSettings({ independentSplitFrames: e.target.checked })}
            />
            左右個別枠を有効にする
          </label>

          <div style={{ marginTop: '8px' }}>
            <span className="setting-label" style={{ display: 'block', marginBottom: '6px' }}>ページ順</span>
            <div className="radio-group">
              {radio<PageOrder>(settings.pageOrder, 'left_to_right', '左→右', 'order-ltr', (v) => updateEffectiveSettings({ pageOrder: v }))}
              {radio<PageOrder>(settings.pageOrder, 'right_to_left', '右→左', 'order-rtl', (v) => updateEffectiveSettings({ pageOrder: v }))}
            </div>
          </div>
        </div>
      )}

      {/* ── 6. ページ構成 ────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">ページ構成</div>

        <div className="setting-row">
          <span className="setting-label">本文開始ページ</span>
          <input
            type="number"
            min={1}
            max={999}
            value={settings.bodyStartPage}
            onChange={(e) => updateEffectiveSettings({ bodyStartPage: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>

        <div style={{ marginTop: '8px' }}>
          <span className="setting-label" style={{ display: 'block', marginBottom: '6px' }}>本文前ページの扱い</span>
          <div className="radio-group">
            {radio<FrontMatterMode>(settings.frontMatterMode, 'single', '単ページ', 'fm-single', (v) => updateEffectiveSettings({ frontMatterMode: v }))}
            {radio<FrontMatterMode>(settings.frontMatterMode, 'split', '見開き', 'fm-split', (v) => updateEffectiveSettings({ frontMatterMode: v }))}
            {radio<FrontMatterMode>(settings.frontMatterMode, 'skip', 'スキップ', 'fm-skip', (v) => updateEffectiveSettings({ frontMatterMode: v }))}
          </div>
        </div>
      </div>

      {/* ── 7. 回転コントロール ────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">回転</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button type="button"
            className="btn btn-sm"
            onClick={() => rotatePage(currentPage, 90 as RotationDeg)}
            disabled={pages.length === 0}
          >
            <RotateCw size={12} />
            現在ページ 90°
          </button>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button type="button"
              className="btn btn-sm"
              onClick={() => rotateOddPages(180 as RotationDeg)}
              style={{ flex: 1 }}
              disabled={pages.length === 0}
            >
              奇数ページ 180°
            </button>
            <button type="button"
              className="btn btn-sm"
              onClick={() => rotateEvenPages(180 as RotationDeg)}
              style={{ flex: 1 }}
              disabled={pages.length === 0}
            >
              偶数ページ 180°
            </button>
          </div>
          <button type="button"
            className="btn btn-sm"
            onClick={() => rotateAllPages(90 as RotationDeg)}
            disabled={pages.length === 0}
          >
            全ページ一括 90°
          </button>
        </div>
      </div>

      {/* ── 8. ページ個別設定 (app.py L654-671) ──────────────── */}
      <div className="settings-section">
        <div className="section-title">ページ個別設定</div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px', lineHeight: '1.4' }}>
          現在のページの設定を個別保存できます。
        </p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button type="button" className="btn btn-sm" onClick={savePageOverride} style={{ flex: 1 }}>
            <Save size={12} />
            このページを保存
          </button>
          <button type="button"
            className="btn btn-sm"
            onClick={removePageOverride}
            disabled={!hasOverride}
            style={{ flex: 1, opacity: hasOverride ? 1 : 0.5 }}
          >
            <Trash2 size={12} />
            個別設定を解除
          </button>
        </div>

        {hasOverride && (
          <div style={{ fontSize: '11px', color: 'var(--color-orange)', marginBottom: '6px' }}>
            ● p.{currentPage + 1} に個別設定あり
          </div>
        )}

        {/* Override list */}
        {Object.keys(pageOverrides).length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginBottom: '4px' }}>個別設定一覧:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {Object.keys(pageOverrides)
                .map(Number)
                .sort((a, b) => a - b)
                .map((pageIdx) => (
                  <button type="button"
                    key={pageIdx}
                    className="btn btn-sm"
                    onClick={() => setCurrentPage(pageIdx)}
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderColor: pageIdx === currentPage ? 'var(--color-orange)' : undefined,
                      color: pageIdx === currentPage ? 'var(--color-orange)' : undefined,
                    }}
                  >
                    p.{pageIdx + 1}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-green)',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 100,
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          {toastMessage}
        </div>
      )}
      
      </div>
      {/* Scroll indicator shadow at bottom */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        height: '32px',
        background: 'linear-gradient(transparent, var(--color-panel))',
        pointerEvents: 'none',
        zIndex: 10
      }} />
    </aside>
  );
}
