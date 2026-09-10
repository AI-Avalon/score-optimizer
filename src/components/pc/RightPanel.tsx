import { useStore } from '../../store';
import type { ExportConfig } from '../../types';

export const RightPanel = () => {
  const {
    pages,
    selectedPageId,
    updatePage,
    exportConfig,
    setExportConfig,
    paperPreset,
    globalConfig,
    setProcessing,
  } = useStore();

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  /** PDF書き出し */
  const handleExport = async () => {
    setProcessing(true, 0);
    const { exportToPdf } = await import('../../exporter');
    await exportToPdf(pages, paperPreset, exportConfig, globalConfig, (p) =>
      setProcessing(true, p)
    );
    setProcessing(false);
  };

  return (
    <div className="w-64 bg-slate-panel border-l border-slate-border flex flex-col overflow-y-auto text-xs shrink-0">
      {/* ページ別設定 */}
      {selectedPage && !selectedPage.isBlank && (
        <div className="p-3 border-b border-slate-border">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
            Page Settings
          </div>

          {/* 見開き分割 */}
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedPage.isSpread}
              onChange={(e) =>
                updatePage(selectedPage.id, { isSpread: e.target.checked })
              }
              className="accent-blue-500"
            />
            <span className="text-gray-300">見開きスキャン</span>
          </label>

          {selectedPage.isSpread && (
            <>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPage.skipSplit}
                  onChange={(e) =>
                    updatePage(selectedPage.id, { skipSplit: e.target.checked })
                  }
                  className="accent-blue-500"
                />
                <span className="text-gray-300">分割スキップ（表紙等）</span>
              </label>

              {!selectedPage.skipSplit && (
                <div className="mb-2">
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>分割位置</span>
                    <span>{Math.round(selectedPage.spineRatio * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={Math.round(selectedPage.spineRatio * 100)}
                    onChange={(e) =>
                      updatePage(selectedPage.id, {
                        spineRatio: Number(e.target.value) / 100,
                      })
                    }
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </>
          )}

          {/* ノド影マスク */}
          <div className="mb-2">
            <div className="flex justify-between text-gray-400 mb-1">
              <span>ノド影L</span>
              <span>{selectedPage.gutterMaskLeftMm}mm</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={selectedPage.gutterMaskLeftMm}
              onChange={(e) =>
                updatePage(selectedPage.id, {
                  gutterMaskLeftMm: Number(e.target.value),
                })
              }
              className="w-full accent-blue-500"
            />
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-gray-400 mb-1">
              <span>ノド影R</span>
              <span>{selectedPage.gutterMaskRightMm}mm</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={selectedPage.gutterMaskRightMm}
              onChange={(e) =>
                updatePage(selectedPage.id, {
                  gutterMaskRightMm: Number(e.target.value),
                })
              }
              className="w-full accent-blue-500"
            />
          </div>

          {/* 傾き補正 */}
          {selectedPage.deskew && (
            <div className="mb-2">
              <div className="flex justify-between text-gray-400">
                <span>傾き補正</span>
                <span>{selectedPage.deskew.angleDeg.toFixed(1)}°</span>
              </div>
              <button
                onClick={() => updatePage(selectedPage.id, { deskew: null })}
                className="mt-1 text-red-400 hover:text-red-300"
              >
                補正をリセット
              </button>
            </div>
          )}
        </div>
      )}

      {/* エクスポート設定 */}
      <div className="p-3 border-b border-slate-border">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
          Export Settings
        </div>
        <div className="mb-2">
          <span className="text-gray-400">ファイル名</span>
          <select
            value={exportConfig.filenameMode}
            onChange={(e) =>
              setExportConfig({
                filenameMode: e.target.value as ExportConfig['filenameMode'],
              })
            }
            className="w-full bg-slate-base text-white text-xs p-1.5 rounded border border-slate-border mt-1"
          >
            <option value="original">元ファイル名+_optimized</option>
            <option value="suffix">元ファイル名+サフィックス</option>
            <option value="date">元ファイル名+日付</option>
            <option value="custom">カスタム入力</option>
          </select>
        </div>
        {exportConfig.filenameMode === 'custom' && (
          <input
            type="text"
            value={exportConfig.customFilename}
            onChange={(e) => setExportConfig({ customFilename: e.target.value })}
            className="w-full bg-slate-base text-white text-xs p-1.5 rounded border border-slate-border mb-2"
            placeholder="ファイル名"
          />
        )}
        {exportConfig.filenameMode === 'suffix' && (
          <input
            type="text"
            value={exportConfig.suffix}
            onChange={(e) => setExportConfig({ suffix: e.target.value })}
            className="w-full bg-slate-base text-white text-xs p-1.5 rounded border border-slate-border mb-2"
            placeholder="_A4"
          />
        )}

        {/* ページ番号再付与 */}
        <div className="mb-2 mt-3">
          <span className="text-gray-400">ページ番号再付与</span>
          <div className="flex gap-2 mt-1">
            <input
              type="number"
              min={0}
              value={exportConfig.pageNumberStart}
              onChange={(e) =>
                setExportConfig({ pageNumberStart: Number(e.target.value) })
              }
              className="w-16 bg-slate-base text-white text-xs p-1 rounded border border-slate-border"
              title="0=無効"
            />
            <select
              value={exportConfig.pageNumberPosition}
              onChange={(e) =>
                setExportConfig({
                  pageNumberPosition: e.target.value as 'top' | 'bottom',
                })
              }
              className="flex-1 bg-slate-base text-white text-xs p-1 rounded border border-slate-border"
            >
              <option value="top">上端</option>
              <option value="bottom">下端</option>
            </select>
          </div>
        </div>
      </div>

      {/* 書き出しボタン */}
      <div className="p-3">
        <button
          onClick={handleExport}
          disabled={pages.length === 0}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-bold transition-colors"
        >
          📄 PDF書き出し（300DPI）
        </button>
      </div>
    </div>
  );
};
