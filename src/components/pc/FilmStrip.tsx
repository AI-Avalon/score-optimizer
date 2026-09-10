import { useStore } from '../../store';

export const FilmStrip = () => {
  const { pages, selectedPageId, selectPage, removePage, insertBlankPage } = useStore();

  return (
    <div className="h-24 bg-slate-panel border-t border-slate-border flex items-center px-2 gap-1 overflow-x-auto shrink-0">
      {pages.map((page, idx) => (
        <div
          key={page.id}
          onClick={() => selectPage(page.id)}
          className={`relative h-[72px] min-w-[52px] rounded border-2 cursor-pointer transition-all flex items-center justify-center text-[9px] shrink-0 ${
            selectedPageId === page.id
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-border bg-slate-base hover:border-gray-500'
          }`}
          style={{ aspectRatio: '0.707' }}
        >
          {page.isBlank ? (
            <span className="text-gray-600">白紙</span>
          ) : (
            <span className="text-gray-400">{idx + 1}</span>
          )}
          {page.isSpread && !page.skipSplit && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-px h-full bg-red-500/50" />
            </div>
          )}
          {/* 右クリックメニュー代わりの×ボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removePage(page.id);
            }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      ))}
      {/* 白紙追加ボタン */}
      <button
        onClick={() => insertBlankPage(pages.length)}
        className="h-[72px] min-w-[52px] rounded border-2 border-dashed border-gray-600 hover:border-gray-400 flex items-center justify-center text-gray-500 hover:text-gray-300 text-lg transition-colors shrink-0"
        title="白紙ページを挿入"
      >
        +
      </button>
    </div>
  );
};
