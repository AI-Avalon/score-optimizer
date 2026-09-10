import { useStore } from '../store/useScoreStore';

export const GlobalReviewBar = () => {
  const { pages, selectedPageId, selectPage, applyCurrentToFollowing } = useStore();

  const currentIndex = pages.findIndex(p => p.id === selectedPageId);
  if (currentIndex === -1) return null;

  const handlePrev = () => {
    if (currentIndex > 0) selectPage(pages[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (currentIndex < pages.length - 1) selectPage(pages[currentIndex + 1].id);
  };

  const currentPage = pages[currentIndex];
  const sideLabel = (currentIndex % 2 === 0) ? '奇数・右' : '偶数・左'; // 0-indexed. 0 is page 1 (odd)

  return (
    <div className="h-10 bg-[#161922] border-b border-slate-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-3 py-1 bg-slate-base hover:bg-slate-panel disabled:opacity-50 rounded text-xs text-white"
        >
          ◀ 前のページ
        </button>
        
        <span className="text-xs text-gray-300 font-medium">
          P. {currentIndex + 1} / {pages.length} ({sideLabel})
        </span>

        <button
          onClick={handleNext}
          disabled={currentIndex === pages.length - 1}
          className="px-3 py-1 bg-slate-base hover:bg-slate-panel disabled:opacity-50 rounded text-xs text-white"
        >
          次のページ ▶
        </button>
      </div>

      <div>
        <button
          onClick={() => applyCurrentToFollowing(currentPage.id)}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white"
          title="このページの色調・余白・マスク設定を以降の全ページにコピーします"
        >
          🔄 このページの設定を以降の全ページに同期
        </button>
      </div>
    </div>
  );
};
