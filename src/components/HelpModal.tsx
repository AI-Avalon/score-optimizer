import { useState, useEffect } from 'react';

export const HelpModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // テキスト入力中は無視
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'h' || e.key === 'H' || e.key === '?') {
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-full border border-blue-500/50 transition-colors text-xs font-bold"
      >
        <span className="text-base leading-none">❓</span> 使い方
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e2230] border border-slate-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-border">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                📖 Score Optimizer ワークステーション ガイド
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex flex-col gap-6 text-sm text-gray-300">
              <section>
                <h3 className="text-lg font-bold text-blue-400 mb-2 border-b border-blue-900 pb-1">1. 基本の流れ</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>読み込み</strong>: PDFファイルを画面にドラッグ＆ドロップして読み込みます。</li>
                  <li><strong>設定</strong>: 左パネルで用紙サイズ（B4やA4）と余白を設定します。</li>
                  <li><strong>確認</strong>: 左右の矢印キー（← / →）でサクサクとページをめくりながら確認します。</li>
                  <li><strong>書き出し</strong>: 右下の「書き出し」ボタンで、印刷用の無劣化300DPI PDFを生成します。</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-blue-400 mb-2 border-b border-blue-900 pb-1">2. A3見開きスキャンの整え方（左側余白の切り方）</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>画面左上のツールバーから「<strong>✂️ クロップ</strong>」を選択します。</li>
                  <li>画像の必要な部分だけをドラッグして囲みます（不要なスキャナの黒帯を避ける）。</li>
                  <li>自動的に用紙中央に再配置されます。</li>
                  <li>中央の分割位置がずれている場合は、右パネルの「分割位置」スライダーで微調整します。</li>
                </ol>
              </section>

              <section>
                <h3 className="text-lg font-bold text-blue-400 mb-2 border-b border-blue-900 pb-1">3. 便利な機能</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>両面スキャン結合</strong>: 両面スキャナで表面（1,3,5...）と裏面（...6,4,2）を別々にスキャンした場合、下部フィルムストリップの「🔄 インターリーブ結合」ボタンで一発で正しい順序に並び替えます。</li>
                  <li><strong>個別設定</strong>: 右パネルで変更した設定（二値化閾値や余白）は、そのページだけの「個別設定」として保存されます。サムネイルにオレンジのバッジが付きます。</li>
                  <li><strong>修正テープ</strong>: ツールバーから「⬜️ 修正テープ」を選び、ドラッグした領域を白く塗りつぶせます（指番号や汚れの消去に）。</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-blue-400 mb-2 border-b border-blue-900 pb-1">4. ショートカットキー一覧</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0a0c12] p-3 rounded border border-slate-border">
                    <div className="font-bold mb-2">ナビゲーション</div>
                    <div className="flex justify-between mb-1"><span>前のページ / 次のページ</span><kbd className="bg-gray-800 px-1.5 rounded text-gray-300">←</kbd> <kbd className="bg-gray-800 px-1.5 rounded text-gray-300">→</kbd></div>
                    <div className="flex justify-between mb-1"><span>キャンバスを移動（パン）</span><kbd className="bg-gray-800 px-1.5 rounded text-gray-300">Space</kbd> + ドラッグ</div>
                    <div className="flex justify-between mb-1"><span>ズームイン / アウト</span><kbd className="bg-gray-800 px-1.5 rounded text-gray-300">マウスホイール</kbd></div>
                  </div>
                  <div className="bg-[#0a0c12] p-3 rounded border border-slate-border">
                    <div className="font-bold mb-2">編集・操作</div>
                    <div className="flex justify-between mb-1"><span>ページを削除</span><kbd className="bg-gray-800 px-1.5 rounded text-gray-300">Backspace</kbd> / <kbd className="bg-gray-800 px-1.5 rounded text-gray-300">Del</kbd></div>
                    <div className="flex justify-between mb-1"><span>元に戻す (Undo)</span><kbd className="bg-gray-800 px-1.5 rounded text-gray-300">Cmd</kbd> + <kbd className="bg-gray-800 px-1.5 rounded text-gray-300">Z</kbd></div>
                    <div className="flex justify-between mb-1"><span>やり直す (Redo)</span><kbd className="bg-gray-800 px-1.5 rounded text-gray-300">Cmd</kbd> + <kbd className="bg-gray-800 px-1.5 rounded text-gray-300">Shift</kbd> + <kbd className="bg-gray-800 px-1.5 rounded text-gray-300">Z</kbd></div>
                    <div className="flex justify-between mb-1"><span>左回転 / 右回転</span><kbd className="bg-gray-800 px-1.5 rounded text-gray-300">[</kbd> / <kbd className="bg-gray-800 px-1.5 rounded text-gray-300">]</kbd></div>
                    <div className="flex justify-between mb-1 text-xs text-gray-500 mt-1"><span>※Shift+[ / ] で偶数ページのみ回転</span></div>
                  </div>
                </div>
              </section>
            </div>
            
            <div className="p-4 border-t border-slate-border flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
