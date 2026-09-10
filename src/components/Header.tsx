import { useCallback, useRef } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { ZoomHUD } from './ZoomHUD';
import { FileText, Download, Menu } from 'lucide-react';

/**
 * Header — タイトル、PDF ドラッグ&ドロップ、テスト読込ボタン、ズームHUD、300DPI出力
 */
export function Header() {
  const loadTestPdf = useScoreStore((s) => s.loadTestPdf);
  const loadPdfFromFile = useScoreStore((s) => s.loadPdfFromFile);
  const exportPdf = useScoreStore((s) => s.exportPdf);
  const isExporting = useScoreStore((s) => s.isExporting);
  const exportProgress = useScoreStore((s) => s.exportProgress);
  const isLoading = useScoreStore((s) => s.isLoading);
  const pdfFileName = useScoreStore((s) => s.pdfFileName);
  const sidebarOpen = useScoreStore((s) => s.sidebarOpen);
  const setSidebarOpen = useScoreStore((s) => s.setSidebarOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type === 'application/pdf') {
        loadPdfFromFile(files[0]);
      }
    },
    [loadPdfFromFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadPdfFromFile(file);
    },
    [loadPdfFromFile],
  );

  return (
    <header
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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

      {/* Center: zoom HUD */}
      <ZoomHUD />

      {/* Right: load + export buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <button
          className="btn btn-sm"
          onClick={loadTestPdf}
          disabled={isLoading}
        >
          <FileText size={14} />
          <span className="hide-mobile">📄 見開きテスト.pdf を読込</span>
        </button>

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
          PDF追加
        </button>

        <button
          className="btn btn-sm btn-accent"
          onClick={exportPdf}
          disabled={isExporting || isLoading}
        >
          <Download size={14} />
          {isExporting ? `${exportProgress}%` : '300 DPI 出力'}
        </button>
      </div>
    </header>
  );
}
