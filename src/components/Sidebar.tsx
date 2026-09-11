import { useCallback, useEffect, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { Sparkles, Save, Trash2, RotateCw, Copy, RefreshCcw } from 'lucide-react';
import type { PageProcessingMode, PageOrder, OutputColorMode, FrontMatterMode, RotationDeg } from '../types';

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
  const updateSettings = useScoreStore((s) => s.updateSettings);
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
        borderRight: '1px solid var(--color-border)',
        flexShrink: 0,
      }}
    >
      {/* ── 一括操作 ──────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">一括操作</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-sm btn-green"
            onClick={applySettingsToAllPages}
            style={{ flex: '1 1 auto' }}
            disabled={pages.length === 0}
          >
            <Copy size={12} />
            全ページに適用
          </button>
          <button
            className="btn btn-sm"
            onClick={resetToDefaults}
            style={{ flex: '1 1 auto' }}
          >
            <RefreshCcw size={12} />
            初期設定にリセット
          </button>
          <button
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
          {radio<PageProcessingMode>(settings.pageProcessingMode, 'spread_split', '見開き分割', 'mode-spread', (v) => updateSettings({ pageProcessingMode: v }))}
          {radio<PageProcessingMode>(settings.pageProcessingMode, 'single_fit', '単ページ', 'mode-single', (v) => updateSettings({ pageProcessingMode: v }))}
        </div>
      </div>

      {/* ── 2. 出力色 ────────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">出力色</div>
        <div className="radio-group">
          {radio<OutputColorMode>(settings.outputColorMode, 'monochrome', '白黒', 'color-mono', (v) => updateSettings({ outputColorMode: v }))}
          {radio<OutputColorMode>(settings.outputColorMode, 'original', '元のまま', 'color-orig', (v) => updateSettings({ outputColorMode: v }))}
        </div>
      </div>

      {/* ── 3. 自動クロップ ──────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">自動クロップ</div>

        <label className="checkbox-row" style={{ marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={settings.autoCropEnabled}
            onChange={(e) => updateSettings({ autoCropEnabled: e.target.checked })}
          />
          自動トリミングを使う
        </label>

        <button
          className="btn btn-green btn-sm"
          onClick={detectBlackMargins}
          disabled={isDetecting}
          style={{ width: '100%', marginBottom: '10px' }}
        >
          <Sparkles size={14} />
          {isDetecting ? '検出中...' : '✨ 黒枠を自動検出'}
        </button>

        <DecoupledSlider label="黒余白しきい値" value={settings.blackMarginThreshold} min={0} max={80} step={1} onChange={(v) => updateSettings({ blackMarginThreshold: v })} />
        <DecoupledSlider label="クロップ余白 (px)" value={settings.cropPaddingPx} min={0} max={40} step={1} onChange={(v) => updateSettings({ cropPaddingPx: v })} />

        <label className="checkbox-row" style={{ marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={settings.useAdaptiveThreshold}
            onChange={(e) => updateSettings({ useAdaptiveThreshold: e.target.checked })}
          />
          適応的二値化（照明ムラ向け）
        </label>

        <DecoupledSlider label="固定二値化しきい値" value={settings.fixedThreshold} min={80} max={230} step={1} onChange={(v) => updateSettings({ fixedThreshold: v })} />
      </div>

      {/* ── 4. 手動トリム ────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">手動トリム (%)</div>
        <DecoupledSlider label="左" value={settings.manualTrimLeftPercent} min={0} max={20} step={0.5} onChange={(v) => updateSettings({ manualTrimLeftPercent: v })} />
        <DecoupledSlider label="右" value={settings.manualTrimRightPercent} min={0} max={20} step={0.5} onChange={(v) => updateSettings({ manualTrimRightPercent: v })} />
        <DecoupledSlider label="上" value={settings.manualTrimTopPercent} min={0} max={20} step={0.5} onChange={(v) => updateSettings({ manualTrimTopPercent: v })} />
        <DecoupledSlider label="下" value={settings.manualTrimBottomPercent} min={0} max={20} step={0.5} onChange={(v) => updateSettings({ manualTrimBottomPercent: v })} />
      </div>

      {/* ── 5. 見開き設定 (spread_split のみ) ────────────────── */}
      {settings.pageProcessingMode === 'spread_split' && (
        <div className="settings-section">
          <div className="section-title">見開き設定</div>
          <DecoupledSlider label="分割位置補正 (%)" value={settings.splitOffsetPercent} min={-20} max={20} step={0.5} onChange={(v) => updateSettings({ splitOffsetPercent: v })} />
          
          <label className="checkbox-row" style={{ marginTop: '12px', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={settings.independentSplitFrames}
              onChange={(e) => updateSettings({ independentSplitFrames: e.target.checked })}
            />
            左右個別枠を有効にする
          </label>

          <div style={{ marginTop: '8px' }}>
            <span className="setting-label" style={{ display: 'block', marginBottom: '6px' }}>ページ順</span>
            <div className="radio-group">
              {radio<PageOrder>(settings.pageOrder, 'left_to_right', '左→右', 'order-ltr', (v) => updateSettings({ pageOrder: v }))}
              {radio<PageOrder>(settings.pageOrder, 'right_to_left', '右→左', 'order-rtl', (v) => updateSettings({ pageOrder: v }))}
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
            onChange={(e) => updateSettings({ bodyStartPage: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>

        <div style={{ marginTop: '8px' }}>
          <span className="setting-label" style={{ display: 'block', marginBottom: '6px' }}>本文前ページの扱い</span>
          <div className="radio-group">
            {radio<FrontMatterMode>(settings.frontMatterMode, 'single', '単ページ', 'fm-single', (v) => updateSettings({ frontMatterMode: v }))}
            {radio<FrontMatterMode>(settings.frontMatterMode, 'split', '見開き', 'fm-split', (v) => updateSettings({ frontMatterMode: v }))}
            {radio<FrontMatterMode>(settings.frontMatterMode, 'skip', 'スキップ', 'fm-skip', (v) => updateSettings({ frontMatterMode: v }))}
          </div>
        </div>
      </div>

      {/* ── 7. 回転コントロール ────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">回転</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            className="btn btn-sm"
            onClick={() => rotatePage(currentPage, 90 as RotationDeg)}
            disabled={pages.length === 0}
          >
            <RotateCw size={12} />
            現在ページ 90°
          </button>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="btn btn-sm"
              onClick={() => rotateOddPages(180 as RotationDeg)}
              style={{ flex: 1 }}
              disabled={pages.length === 0}
            >
              奇数ページ 180°
            </button>
            <button
              className="btn btn-sm"
              onClick={() => rotateEvenPages(180 as RotationDeg)}
              style={{ flex: 1 }}
              disabled={pages.length === 0}
            >
              偶数ページ 180°
            </button>
          </div>
          <button
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
          <button className="btn btn-sm" onClick={savePageOverride} style={{ flex: 1 }}>
            <Save size={12} />
            このページを保存
          </button>
          <button
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
                  <button
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
    </aside>
  );
}
