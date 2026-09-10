import { useStore } from '../store/useScoreStore';
import { createMockScore } from '../mockGenerator';
import { useRef } from 'react';

export const Header = () => {
  const { addPage, addPages, setExportConfig, setProcessing, isMobile } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** サンプルスコア生成 */
  const handleGenerateMock = async () => {
    setProcessing(true, 0);
    const page = await createMockScore();
    addPage(page);
    setProcessing(false);
  };

  /** PDFインポート */
  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true, 0);
    setExportConfig({ originalFilename: file.name });
    const { importPdf } = await import('../pdfImporter');
    const newPages = await importPdf(file, (p) => setProcessing(true, p));
    addPages(newPages);
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        <button
          onClick={handleGenerateMock}
          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          {isMobile ? '🎼' : '🎼 サンプルスコア生成'}
        </button>
      </div>
    </header>
  );
};
