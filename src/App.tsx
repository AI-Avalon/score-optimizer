import { useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MainCanvas } from './components/MainCanvas';
import { FilmStrip } from './components/FilmStrip';
import { useScoreStore } from './store/useScoreStore';

/**
 * App — Score Optimizer 2.0 メインレイアウト
 *
 * ┌──────────── Header ─────────────────┐
 * ├───────┬─────────────────────────────┤
 * │ Side  │      MainCanvas              │
 * │ bar   │                              │
 * ├───────┴─────────────────────────────┤
 * │         FilmStrip                    │
 * └──────────────────────────────────────┘
 *
 * height: 100dvh, overflow: hidden — 見切れゼロ (ui-layout rule)
 */
export default function App() {
  const cleanup = useScoreStore((s) => s.cleanup);

  // pdf-lifecycle-reviewer: cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: 'var(--color-base)',
      }}
    >
      <Header />

      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Sidebar />
        <MainCanvas />
      </div>

      <FilmStrip />
    </div>
  );
}
