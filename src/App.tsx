import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ScoreCanvas } from './components/ScoreCanvas';
import { FilmStrip } from './components/FilmStrip';
import { ProgressModal } from './components/ProgressModal';
import { DropZone } from './components/DropZone';
import { MobileLayout } from './components/MobileLayout';
import { HelpModal } from './components/HelpModal';
import { useScoreStore } from './store/useScoreStore';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * App — Score Optimizer 2.0 レスポンシブルート分岐
 *
 * ui-ux-pro-workstation skill:
 * - Width >= 768px → デスクトップ 3-pane ワークステーション
 * - Width < 768px → モバイル完全専用レイアウト (MobileLayout)
 */
export default function App() {
  const cleanup = useScoreStore((s) => s.cleanup);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // matchMedia リスナーでリアルタイム切替
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // pdf-lifecycle-reviewer: cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // キーボードショートカット (Backspace/Delete → 削除, Cmd/Ctrl+Z → Undo, Cmd/Ctrl+Shift+Z → Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // input/textarea 内では発動しない
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const store = useScoreStore.getState();

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (store.pdfDoc && store.pages.length > 0) {
          store.deletePage(store.currentPage);
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          store.redoAction();
        } else {
          store.undoAction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isMobile) {
    return (
      <DropZone>
        <ErrorBoundary>
          <MobileLayout />
        </ErrorBoundary>
        <ProgressModal />
        <HelpModal />
      </DropZone>
    );
  }

  return (
    <DropZone>
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
          <ErrorBoundary>
            <ScoreCanvas />
          </ErrorBoundary>
        </div>

        <FilmStrip />
      </div>

      <ProgressModal />
      <HelpModal />
    </DropZone>
  );
}
