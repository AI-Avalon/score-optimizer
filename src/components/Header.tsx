import { useStore } from '../store';
import { createMockScore } from '../mockGenerator';
import { FilePlus } from 'lucide-react';

export const Header = () => {
  const addPage = useStore((state) => state.addPage);

  const handleGenerateMock = async () => {
    const page = await createMockScore();
    addPage(page);
  };

  return (
    <header className="h-14 bg-slate-panel border-b border-slate-border flex items-center justify-between px-4">
      <div className="font-bold text-lg">Score Optimizer Workstation</div>
      <div>
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
