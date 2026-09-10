import { useStore } from '../store/useScoreStore';
import { useRef } from 'react';
import { HelpModal } from './HelpModal';

export const Header = () => {
  const { addPages, setExportConfig, setProcessing, isMobile } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** PDFインポート */
  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true, 0);
    try {
      setExportConfig({ originalFilename: file.name });
      const { importPdf } = await import('../pdfImporter');
      const newPages = await importPdf(file, (p) => setProcessing(true, p));
      addPages(newPages);
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <header className="h-12 bg-slate-panel border-b border-slate-border flex items-center justify-between px-3 shrink-0 z-50">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold tracking-wide">♪ Score Optimizer</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="application/pdf,image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImportPdf}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-xs bg-[#2a2e3a] hover:bg-[#353a48] rounded transition-colors"
        >
          {isMobile ? '📂' : '📂 PDFを読み込み'}
        </button>
        <HelpModal />
      </div>
    </header>
  );
};
