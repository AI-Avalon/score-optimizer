
import { useStore } from '../../store/useScoreStore';
import type { ProcessSettings } from '../../types';

export const RightPanel = () => {
  const {
    pages,
    selectedPageId,
    updatePage,
    exportConfig,
        paperPreset,
    globalConfig,
    setGlobalConfig,
    setProcessing,
    savePageOverride,
    removePageOverride,
  } = useStore();

  const selectedPage = pages.find((p) => p.id === selectedPageId);
  
  const handleExport = async () => {
    setProcessing(true, 0);
    const { exportToPdf } = await import('../../exporter');
    await exportToPdf(pages, paperPreset, exportConfig, globalConfig, (p) =>
      setProcessing(true, p)
    );
    setProcessing(false);
  };

  if (!selectedPage || selectedPage.isBlank) {
    return <div className="w-64 bg-slate-panel border-l border-slate-border" />;
  }

  const hasOverride = !!selectedPage.overrideSettings;
  const settings = hasOverride ? selectedPage.overrideSettings! : globalConfig.processSettings;
  const updateSettings = (partial: Partial<ProcessSettings>) => {
    if (hasOverride) {
      updatePage(selectedPage.id, { overrideSettings: { ...settings, ...partial } });
    } else {
      setGlobalConfig({ processSettings: { ...globalConfig.processSettings, ...partial } });
    }
  };

  return (
    <div className="w-[340px] bg-[#161922] border-l border-[#272B35] flex flex-col overflow-y-auto text-xs shrink-0 z-20">
      <div className="p-3 border-b border-slate-border bg-slate-800">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex justify-between items-center">
          <span>Page Settings</span>
          {hasOverride && <span className="text-orange-400 font-bold px-1 py-0.5 rounded bg-orange-900/30">OVERRIDE</span>}
        </div>
        
        <div className="flex gap-2 mb-2">
          {!hasOverride ? (
            <button onClick={() => savePageOverride(selectedPage.id)} className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px]">このページを保存</button>
          ) : (
            <button onClick={() => removePageOverride(selectedPage.id)} className="flex-1 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px]">個別設定を解除</button>
          )}
        </div>

        <div className="mb-2 text-[10px] text-gray-400">
          対象: {hasOverride ? 'このページのみ' : '全体設定'}
        </div>

        {/* ページ処理モード */}
        <div className="mb-3">
          <div className="flex justify-between text-gray-400 mb-1">
            <span>ページ処理</span>
          </div>
          <select
            value={settings.pageProcessingMode}
            onChange={(e) => updateSettings({ pageProcessingMode: e.target.value as any })}
            className="w-full bg-slate-base text-white text-xs p-1.5 rounded border border-slate-border"
          >
            <option value="single_fit">単ページ幅統一</option>
            <option value="spread_split">見開き分割</option>
          </select>
        </div>

        {settings.pageProcessingMode === 'spread_split' && (
          <div className="mb-3">
            <div className="flex justify-between text-gray-400 mb-1">
              <span>分割位置オフセット</span>
              <span>{settings.splitOffsetPercent}%</span>
            </div>
            <input
              type="range" min={-20} max={20} step={0.1}
              value={settings.splitOffsetPercent}
              onChange={(e) => updateSettings({ splitOffsetPercent: Number(e.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>
        )}

        {/* 自動クロップと黒余白 */}
        <div className="mt-4 pt-4 border-t border-slate-border">
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoCropEnabled}
              onChange={(e) => updateSettings({ autoCropEnabled: e.target.checked })}
              className="accent-blue-500"
            />
            <span className="text-gray-300">自動トリミング（黒枠除去）</span>
          </label>

          {settings.autoCropEnabled && (
            <>
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>黒余白しきい値</span>
                  <span>{settings.blackMarginThreshold}</span>
                </div>
                <input
                  type="range" min={0} max={80}
                  value={settings.blackMarginThreshold}
                  onChange={(e) => updateSettings({ blackMarginThreshold: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>クロップ余白(px)</span>
                  <span>{settings.cropPaddingPx}</span>
                </div>
                <input
                  type="range" min={0} max={40}
                  value={settings.cropPaddingPx}
                  onChange={(e) => updateSettings({ cropPaddingPx: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
            </>
          )}
        </div>

        {/* 手動トリミング */}
        <div className="mt-4 pt-4 border-t border-slate-border">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Manual Trim</div>
          <div className="grid grid-cols-2 gap-2">
            {(['Top', 'Bottom', 'Left', 'Right'] as const).map((side) => {
              const key = `manualTrim${side}Percent` as keyof ProcessSettings;
              return (
                <div key={side} className="flex flex-col mb-1">
                  <span className="text-gray-400 text-[10px] mb-1">{side} (%)</span>
                  <input
                    type="number" min={0} max={20} step={0.1}
                    value={settings[key] as number}
                    onChange={(e) => updateSettings({ [key]: Number(e.target.value) })}
                    className="w-full bg-slate-base text-white text-xs p-1.5 rounded border border-slate-border text-center"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 二値化・カラー */}
        <div className="mt-4 pt-4 border-t border-slate-border">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Color & Binarize</div>
          <div className="flex gap-1 mb-2">
            <button onClick={() => updateSettings({ outputColorMode: 'monochrome' })} className={`flex-1 py-1 rounded text-[10px] ${settings.outputColorMode === 'monochrome' ? 'bg-blue-600 text-white' : 'bg-slate-base text-gray-400'}`}>白黒</button>
            <button onClick={() => updateSettings({ outputColorMode: 'grayscale' })} className={`flex-1 py-1 rounded text-[10px] ${settings.outputColorMode === 'grayscale' ? 'bg-blue-600 text-white' : 'bg-slate-base text-gray-400'}`}>グレー</button>
            <button onClick={() => updateSettings({ outputColorMode: 'original' })} className={`flex-1 py-1 rounded text-[10px] ${settings.outputColorMode === 'original' ? 'bg-blue-600 text-white' : 'bg-slate-base text-gray-400'}`}>原色</button>
          </div>

          {settings.outputColorMode === 'monochrome' && (
            <div className="bg-slate-base p-2 rounded border border-slate-border">
              <label className="flex items-center gap-2 cursor-pointer text-[10px] mb-2">
                <input
                  type="checkbox"
                  checked={settings.useAdaptiveThreshold}
                  onChange={(e) => updateSettings({ useAdaptiveThreshold: e.target.checked })}
                  className="accent-blue-500"
                />
                <span className="text-gray-300">適応的二値化（照明ムラ向け）</span>
              </label>

              {!settings.useAdaptiveThreshold && (
                <div>
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>固定しきい値</span>
                    <span>{settings.fixedThreshold}</span>
                  </div>
                  <input
                    type="range" min={80} max={230}
                    value={settings.fixedThreshold}
                    onChange={(e) => updateSettings({ fixedThreshold: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={handleExport}
          disabled={pages.length === 0}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded text-xs font-bold transition-colors"
        >
          📄 PDF書き出し（300DPI）
        </button>
      </div>
    </div>
  );
};
