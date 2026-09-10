import { useCallback } from 'react';
import { useScoreStore } from '../store/useScoreStore';
import { Minus, Plus } from 'lucide-react';

/**
 * Capsule Zoom HUD — Apple HIG フロート表示
 * [-] [ 100% ] [ Fit ] [+]
 */
export function ZoomHUD() {
  const zoom = useScoreStore((s) => s.zoom);
  const zoomMode = useScoreStore((s) => s.zoomMode);
  const setZoom = useScoreStore((s) => s.setZoom);
  const setZoomMode = useScoreStore((s) => s.setZoomMode);

  const handleZoomIn = useCallback(() => setZoom(zoom + 0.25), [zoom, setZoom]);
  const handleZoomOut = useCallback(() => setZoom(Math.max(0.25, zoom - 0.25)), [zoom, setZoom]);
  const handleFit = useCallback(() => setZoomMode('fit'), [setZoomMode]);
  const handleReset = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  const displayPercent = zoomMode === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '20px',
        padding: '2px 4px',
        userSelect: 'none',
      }}
    >
      <button
        className="btn-icon btn"
        onClick={handleZoomOut}
        aria-label="Zoom out"
        style={{ borderRadius: '50%', padding: '4px', minWidth: '28px', minHeight: '28px', border: 'none', background: 'transparent' }}
      >
        <Minus size={14} />
      </button>

      <button
        onClick={handleReset}
        style={{
          padding: '2px 10px',
          fontSize: '12px',
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--color-text)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          minWidth: '52px',
          textAlign: 'center',
        }}
      >
        {displayPercent}
      </button>

      <button
        onClick={handleFit}
        style={{
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 500,
          color: zoomMode === 'fit' ? 'var(--color-accent)' : 'var(--color-text-muted)',
          background: zoomMode === 'fit' ? 'rgba(96,165,250,0.15)' : 'transparent',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
        }}
      >
        Fit
      </button>

      <button
        className="btn-icon btn"
        onClick={handleZoomIn}
        aria-label="Zoom in"
        style={{ borderRadius: '50%', padding: '4px', minWidth: '28px', minHeight: '28px', border: 'none', background: 'transparent' }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
