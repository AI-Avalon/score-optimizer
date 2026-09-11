import { useCallback, useRef } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { ZoomHUD } from './ZoomHUD';
import { Download, Menu, HelpCircle } from 'lucide-react';

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
  const pdfDoc = useScoreStore((s) => s.pdfDoc);
  const currentPage = useScoreStore((s) => s.currentPage);
  const pageOverrides = useScoreStore((s) => s.pageOverrides);
  const removePageOverride = useScoreStore((s) => s.removePageOverride);
  const setIsHelpOpen = useScoreStore((s) => s.setIsHelpOpen);

  const hasOverride = currentPage in pageOverrides;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdfFromFile(file);
    },
    [loadPdfFromFile],
  );


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
        <button type="button"
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

        {hasOverride && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
            <span style={{ 
              background: 'var(--color-orange)', 
              color: '#000', 
              fontSize: '10px', 
              fontWeight: 800, 
              padding: '2px 6px', 
              borderRadius: '999px',
              whiteSpace: 'nowrap'
            }}>
              個別カスタム中
            </span>
            <button type="button" 
              className="btn btn-sm" 
              onClick={removePageOverride}
              style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
            >
              全体設定に戻す
            </button>
          </div>
        )}
      </div>

      {/* Center: zoom HUD */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ZoomHUD />
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
        <button type="button"
          className="btn btn-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          PDF読込
        </button>

        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setIsHelpOpen(true)}
          style={{ background: 'transparent', border: '1px solid var(--color-border)', padding: '4px 8px' }}
        >
          <HelpCircle size={14} style={{ marginRight: '4px' }} /> 使い方
        </button>

        <button type="button"
          className="btn btn-sm btn-accent"
          onClick={exportPdf}
          disabled={isExporting || isLoading || !pdfDoc}
        >
          <Download size={14} style={{ marginRight: '4px' }} />
          {isExporting ? `${exportProgress}%` : 'PDFを出力'}
        </button>
      </div>
    </header>
  );
}
