import { Header } from './components/Header';
import { PCWorkspace } from './components/pc/PCWorkspace';
import { MobileWorkspace } from './components/mobile/MobileWorkspace';
import { useStore } from './store/useScoreStore';
import { useEffect, useState, useCallback } from 'react';

export const App = () => {
  const { isMobile, setIsMobile, addPages, setProcessing, setExportConfig } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  /** キーボードショートカット */
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const { undo, redo, pages, selectedPageId, updatePage, deleteCurrentPage } = useStore.getState();
      
      // テキスト入力中は無視
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      // 削除
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedPageId) {
          e.preventDefault();
          if (deleteCurrentPage) deleteCurrentPage();
        }
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setProcessing(true, 0);
      setExportConfig({ originalFilename: file.name });
      const { importPdf } = await import('./pdfImporter');
      const newPages = await importPdf(file, (p) => setProcessing(true, p));
      addPages(newPages);
      setProcessing(false);
    }
  }, [addPages, setProcessing, setExportConfig]);

  return (
    <div 
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-base text-white relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Header />
      {isMobile ? <MobileWorkspace /> : <PCWorkspace />}
      
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-400 flex flex-col items-center justify-center pointer-events-none transition-all">
          <div className="bg-slate-panel/90 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <span className="text-6xl mb-4">📄</span>
            <h2 className="text-2xl font-bold text-white mb-2">PDFをドロップして読み込む</h2>
            <p className="text-gray-400">現在開いている楽譜の後ろに追加されます</p>
          </div>
        </div>
      )}
    </div>
  );
};
