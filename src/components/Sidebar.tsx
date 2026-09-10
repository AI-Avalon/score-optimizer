import { useCallback } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { Sparkles, Save, Trash2 } from 'lucide-react';
import type { PageProcessingMode, PageOrder, OutputColorMode, FrontMatterMode } from '../types';

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
 */
export function Sidebar() {
  const settings = useScoreStore((s) => s.settings);
  const updateSettings = useScoreStore((s) => s.updateSettings);
  const detectBlackMargins = useScoreStore((s) => s.detectBlackMargins);
  const isDetecting = useScoreStore((s) => s.isDetecting);
  const savePageOverride = useScoreStore((s) => s.savePageOverride);
  const removePageOverride = useScoreStore((s) => s.removePageOverride);
  const pageOverrides = useScoreStore((s) => s.pageOverrides);
  const currentPage = useScoreStore((s) => s.currentPage);
  const setCurrentPage = useScoreStore((s) => s.setCurrentPage);
  const sidebarOpen = useScoreStore((s) => s.sidebarOpen);

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

  const slider = useCallback(
    (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
      <div style={{ marginBottom: '8px' }}>
        <div className="setting-row">
          <span className="setting-label">{label}</span>
          <span className="setting-value">{Number.isInteger(step) ? value : value.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    ),
    [],
  );

  const hasOverride = currentPage in pageOverrides;

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

        {slider('黒余白しきい値', settings.blackMarginThreshold, 0, 80, 1, (v) => updateSettings({ blackMarginThreshold: v }))}
        {slider('クロップ余白 (px)', settings.cropPaddingPx, 0, 40, 1, (v) => updateSettings({ cropPaddingPx: v }))}

        <label className="checkbox-row" style={{ marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={settings.useAdaptiveThreshold}
            onChange={(e) => updateSettings({ useAdaptiveThreshold: e.target.checked })}
          />
          適応的二値化（照明ムラ向け）
        </label>

        {slider('固定二値化しきい値', settings.fixedThreshold, 80, 230, 1, (v) => updateSettings({ fixedThreshold: v }))}
      </div>

      {/* ── 4. 手動トリム ────────────────────────────────────── */}
      <div className="settings-section">
        <div className="section-title">手動トリム (%)</div>
        {slider('左', settings.manualTrimLeftPercent, 0, 20, 0.5, (v) => updateSettings({ manualTrimLeftPercent: v }))}
        {slider('右', settings.manualTrimRightPercent, 0, 20, 0.5, (v) => updateSettings({ manualTrimRightPercent: v }))}
        {slider('上', settings.manualTrimTopPercent, 0, 20, 0.5, (v) => updateSettings({ manualTrimTopPercent: v }))}
        {slider('下', settings.manualTrimBottomPercent, 0, 20, 0.5, (v) => updateSettings({ manualTrimBottomPercent: v }))}
      </div>

      {/* ── 5. 見開き設定 (spread_split のみ) ────────────────── */}
      {settings.pageProcessingMode === 'spread_split' && (
        <div className="settings-section">
          <div className="section-title">見開き設定</div>
          {slider('分割位置補正 (%)', settings.splitOffsetPercent, -20, 20, 0.5, (v) => updateSettings({ splitOffsetPercent: v }))}

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

      {/* ── 7. ページ個別設定 (app.py L654-671) ──────────────── */}
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
    </aside>
  );
}
