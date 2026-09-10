import { useCallback, useState } from 'react';
import { useScoreStore } from '../store/useScoreStore';

/**
 * DropZone — アプリ全体でのPDFドラッグ&ドロップ受付
 *
 * ドロップ時にフルスクリーン視覚フィードバック（半透明アクセント色）を表示。
 * 開発用「見開きテスト読込」ボタンは撤去し、本番仕様のD&Dのみ。
 */
export function DropZone({ children }: { children: React.ReactNode }) {
  const loadPdfFromFile = useScoreStore((s) => s.loadPdfFromFile);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // relatedTarget がnullの場合（ウィンドウ外に出た場合）のみ解除
    if (!e.relatedTarget || !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type === 'application/pdf') {
        loadPdfFromFile(files[0]);
      }
    },
    [loadPdfFromFile],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      {children}

      {/* ドラッグ時のフルスクリーンフィードバック */}
      {isDragOver && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(96, 165, 250, 0.15)',
            border: '3px dashed var(--color-accent)',
            borderRadius: '16px',
            margin: '12px',
            zIndex: 9990,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '56px', opacity: 0.9 }}>📄</div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--color-accent)',
              }}
            >
              PDF をドロップして読み込み
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
