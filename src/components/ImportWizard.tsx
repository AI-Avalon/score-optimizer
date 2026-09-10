import { useStore } from '../store/useScoreStore';

export const ImportWizard = () => {
  const { pages, initWizard } = useStore();

  // もしページがあって、かつまだウィザードを通過していないフラグが必要。
  // 単純化のため、pagesの1ページ目のisCustomizedがfalseなら表示、みたいな判定？
  // 今回は「インポート直後の振り分けダイアログ」なので、未設定状態を管理するか、
  // ヘッダーから呼び出せるようにする。
  
  if (pages.length === 0) return null;

  // 全てが初期状態かどうかを簡易判定（ここではすべてisCustomized === falseとする）
  const needsWizard = pages.every(p => !p.isCustomized && p.pageType === 'single');
  
  if (!needsWizard) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-panel border border-slate-border rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-2">📄 PDFインポートウィザード</h2>
        <p className="text-sm text-gray-400 mb-6">
          スキャンされた楽譜の形式を選択してください。すべてのページに初期設定が一括適用されます。
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => initWizard('all-spread')}
            className="flex flex-col items-start p-3 bg-[#1e2230] hover:bg-[#272b38] rounded border border-slate-border text-left transition-colors"
          >
            <span className="text-blue-400 font-bold mb-1">[A] すべて見開きスキャン</span>
            <span className="text-xs text-gray-500">2ページ単位でスキャンされた画像として中央で分割します。</span>
          </button>
          
          <button
            onClick={() => initWizard('all-single')}
            className="flex flex-col items-start p-3 bg-[#1e2230] hover:bg-[#272b38] rounded border border-slate-border text-left transition-colors"
          >
            <span className="text-blue-400 font-bold mb-1">[B] すべて単一ページ</span>
            <span className="text-xs text-gray-500">1ページ単位でスキャンされた画像としてそのまま展開します。</span>
          </button>
          
          <button
            onClick={() => initWizard('cover-then-spread')}
            className="flex flex-col items-start p-3 bg-[#1e2230] hover:bg-[#272b38] rounded border border-slate-border text-left transition-colors"
          >
            <span className="text-blue-400 font-bold mb-1">[C] 表紙のみ単一 ＋ 以降は見開き</span>
            <span className="text-xs text-gray-500">最初のページを表紙としてスキップし、2ページ目以降を分割します。</span>
          </button>
        </div>
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          選択後、全ページ通し校正モードを開始します。
        </div>
      </div>
    </div>
  );
};
