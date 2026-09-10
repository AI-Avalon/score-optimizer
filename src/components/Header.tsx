import { useCallback, useRef } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { ZoomHUD } from './ZoomHUD';
import { Download, Menu } from 'lucide-react';
import type { PaperPresetKey } from '../types';
import { PAPER_PRESETS } from '../types';

/**
 * Header — タイトル、PDF読込、ズームHUD、用紙選択、余白設定、300DPI出力
 *
 * 「見開きテスト読込ボタン」は撤去済み。本番仕様のD&D + ファイル選択のみ。
 */
export function Header() {
  const loadPdfFromFile = useScoreStore((s) => s.loadPdfFromFile);
  const exportPdf = useScoreStore((s) => s.exportPdf);
  const isExporting = useScoreStore((s) => s.isExporting);
  const exportProgress = useScoreStore((s) => s.exportProgress);
  const isLoading = useScoreStore((s) => s.isLoading);
  const pdfFileName = useScoreStore((s) => s.pdfFileName);
  const sidebarOpen = useScoreStore((s) => s.sidebarOpen);
  const setSidebarOpen = useScoreStore((s) => s.setSidebarOpen);
  const selectedPaper = useScoreStore((s) => s.selectedPaper);
  const setSelectedPaper = useScoreStore((s) => s.setSelectedPaper);
  const customPaperMm = useScoreStore((s) => s.customPaperMm);
  const setCustomPaperMm = useScoreStore((s) => s.setCustomPaperMm);
  const marginMm = useScoreStore((s) => s.marginMm);
  const setMarginMm = useScoreStore((s) => s.setMarginMm);
  const pdfDoc = useScoreStore((s) => s.pdfDoc);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdfFromFile(file);
    },
    [loadPdfFromFile],
  );

  const paperKeys = Object.keys(PAPER_PRESETS) as PaperPresetKey[];

  return (
    <header
      style={{
        height: 'var(--header-height)',
        minHeight: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-panel)',
        gap: '8px',
        flexShrink: 0,
      }}
    >
      {/* Left: menu toggle + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <button
          className="btn btn-sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
          style={{ padding: '6px', flexShrink: 0 }}
        >
          <Menu size={16} />
        </button>

        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Score Optimizer
        </span>

        {pdfFileName && (
          <span
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            — {pdfFileName}
          </span>
        )}
      </div>

      {/* Center: zoom HUD + 用紙選択 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ZoomHUD />

        {/* 用紙選択ドロップダウン */}
        <select
          data-testid="paper-select"
          value={selectedPaper}
          onChange={(e) => setSelectedPaper(e.target.value as PaperPresetKey)}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: '12px',
            cursor: 'pointer',
            maxWidth: '160px',
          }}
        >
          {paperKeys.map((key) => (
            <option key={key} value={key}>
              {PAPER_PRESETS[key].label}
            </option>
          ))}
        </select>

        {/* カスタム用紙サイズ入力 */}
        {selectedPaper === 'custom' && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              type="number"
              value={customPaperMm.w}
              onChange={(e) => setCustomPaperMm(Number(e.target.value) || 210, customPaperMm.h)}
              style={{ width: '52px' }}
              placeholder="幅mm"
              min={50}
              max={1000}
            />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>×</span>
            <input
              type="number"
              value={customPaperMm.h}
              onChange={(e) => setCustomPaperMm(customPaperMm.w, Number(e.target.value) || 297)}
              style={{ width: '52px' }}
              placeholder="高mm"
              min={50}
              max={1000}
            />
            <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>mm</span>
          </div>
        )}

        {/* 余白入力 */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>余白</span>
          <input
            type="number"
            value={marginMm}
            onChange={(e) => setMarginMm(Number(e.target.value) || 0)}
            style={{ width: '44px' }}
            min={0}
            max={50}
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>mm</span>
        </div>
      </div>

      {/* Right: file select + export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
        >
          PDF読込
        </button>

        <button
          className="btn btn-sm btn-accent"
          onClick={exportPdf}
          disabled={isExporting || isLoading || !pdfDoc}
        >
          <Download size={14} />
          {isExporting ? `${exportProgress}%` : '300 DPI 出力'}
        </button>
      </div>
    </header>
  );
}
