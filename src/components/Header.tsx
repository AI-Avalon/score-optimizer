import { useStore } from '../store/useScoreStore';
import { Upload, FileDown, FileText } from 'lucide-react';
import { useRef } from 'react';

export const Header = () => {
  const { loadPdf, loadTestPdf, exportPdfDocument, isProcessing, originalFileName, pages } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="h-14 bg-[#161922] border-b border-[#272B35] flex items-center justify-between px-4 shrink-0 z-30 relative shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-gray-200 hidden md:block">Score Optimizer</h1>
        
        <div className="flex gap-2">
          <input 
            type="file" 
            accept="application/pdf" 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadPdf(file);
            }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            <Upload size={14} /> PDF読込
          </button>
          <button 
            onClick={loadTestPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#272B35] hover:bg-[#343A46] text-gray-200 text-xs rounded-md transition-colors disabled:opacity-50"
            disabled={isProcessing}
          >
            <FileText size={14} /> テストPDFを読込
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-400 hidden md:block truncate max-w-[200px]">
          {pages.length > 0 ? `${originalFileName} (${pages.length} pages)` : 'ファイル未選択'}
        </span>
        
        <button 
          onClick={exportPdfDocument}
          disabled={pages.length === 0 || isProcessing}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors disabled:opacity-50 font-medium"
        >
          <FileDown size={14} /> 300DPI 書き出し
        </button>
      </div>
    </header>
  );
};
