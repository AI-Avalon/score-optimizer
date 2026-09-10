import { useStore } from '../store';
import { createMockScore } from '../mockGenerator';
import { importPdf } from '../pdfImporter';
import { FilePlus, Upload } from 'lucide-react';
import { useRef } from 'react';

export const Header = () => {
  const addPage = useStore((state) => state.addPage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateMock = async () => {
    const page = await createMockScore();
    addPage(page);
  };

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newPages = await importPdf(file);
      newPages.forEach(addPage);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="h-14 bg-slate-panel border-b border-slate-border flex items-center justify-between px-4">
      <div className="font-bold text-lg">Score Optimizer Workstation</div>
      <div className="flex gap-2">
        <input 
          type="file" 
          accept="application/pdf" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleImportPdf} 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-sm font-medium transition-colors"
        >
          <Upload size={16} />
          PDFを読み込み
        </button>
        <button 
          onClick={handleGenerateMock}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
        >
          <FilePlus size={16} />
          サンプルスコア生成
        </button>
      </div>
    </header>
  );
};
