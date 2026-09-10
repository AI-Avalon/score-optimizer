import { Header } from './components/Header';
import { PCWorkspace } from './components/pc/PCWorkspace';
import { MobileWorkspace } from './components/mobile/MobileWorkspace';
import { useStore } from './store/useScoreStore';
import { useEffect } from 'react';

export const App = () => {
  const { isMobile, setIsMobile } = useStore();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  /** Cmd+Z / Cmd+Y ショートカット */
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const { undo, redo, pages, selectedPageId, updatePage } = useStore.getState();
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // ページ切替ショートカット (矢印キー)
      if (!e.metaKey && !e.ctrlKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const idx = pages.findIndex(p => p.id === selectedPageId);
          if (idx > 0) useStore.getState().selectPage(pages[idx - 1].id);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const idx = pages.findIndex(p => p.id === selectedPageId);
          if (idx !== -1 && idx < pages.length - 1) useStore.getState().selectPage(pages[idx + 1].id);
        }
      }

      // 回転ショートカット
      if (selectedPageId && !e.metaKey && !e.ctrlKey) {
        const page = pages.find(p => p.id === selectedPageId);
        if (!page) return;
        if (e.key === ']') {
          e.preventDefault();
          const r = ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270;
          if (e.shiftKey) {
            // Shift+] : 偶数ページ（インデックスが奇数）のみ回転
            const idx = pages.indexOf(page);
            if (idx % 2 === 1) updatePage(selectedPageId, { rotation: r });
          } else {
            updatePage(selectedPageId, { rotation: r });
          }
        }
        if (e.key === '[') {
          e.preventDefault();
          const r = ((page.rotation - 90 + 360) % 360) as 0 | 90 | 180 | 270;
          if (e.shiftKey) {
            const idx = pages.indexOf(page);
            if (idx % 2 === 1) updatePage(selectedPageId, { rotation: r });
          } else {
            updatePage(selectedPageId, { rotation: r });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-base text-white">
      <Header />
      {isMobile ? <MobileWorkspace /> : <PCWorkspace />}
    </div>
  );
};
