import { useScoreStore } from '../store/useScoreStore';

/**
 * ProgressModal — PDF読み込み・300DPI書き出し時の視覚的プログレスオーバーレイ
 *
 * ui-ux-pro-workstation skill §4:
 * - フルスクリーンモーダルオーバーレイ
 * - プログレスバー + パーセント + 処理内容テキスト
 * - 操作ロック（pointer-events: none on background）
 */
export function ProgressModal() {
  const isLoading = useScoreStore((s) => s.isLoading);
  const isExporting = useScoreStore((s) => s.isExporting);
  const exportProgress = useScoreStore((s) => s.exportProgress);
  const loadingProgress = useScoreStore((s) => s.loadingProgress);

  const isVisible = isLoading || isExporting;
  if (!isVisible) return null;

  const percent = isExporting ? exportProgress : 0;
  const message = loadingProgress?.message ?? (isLoading ? 'PDF を読み込み中...' : '300 DPI PDF 書き出し中...');
  const detail = loadingProgress
    ? `処理中: ${loadingProgress.current} / ${loadingProgress.total} ページ (${percent}%)`
    : '';

  return (
    <div
      data-testid="progress-modal"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'var(--color-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '32px 40px',
          minWidth: '340px',
          maxWidth: '480px',
          textAlign: 'center',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* アニメーション音符アイコン */}
        <div
          style={{
            fontSize: '42px',
            marginBottom: '16px',
            animation: 'progressPulse 1.5s ease-in-out infinite',
          }}
        >
          🎵
        </div>

        {/* メッセージ */}
        <div
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
          }}
        >
          {message}
        </div>

        {/* プログレスバー */}
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'var(--color-border)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: isExporting ? `${percent}%` : '100%',
              background: 'linear-gradient(90deg, var(--color-accent), #93c5fd)',
              borderRadius: '3px',
              transition: isExporting ? 'width 0.3s ease' : 'none',
              animation: isExporting ? 'none' : 'progressIndeterminate 1.5s ease-in-out infinite',
            }}
          />
        </div>

        {/* 詳細テキスト */}
        {detail && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {detail}
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes progressPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes progressIndeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
