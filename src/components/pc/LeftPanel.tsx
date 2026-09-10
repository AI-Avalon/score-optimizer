import { useStore } from '../../store/useScoreStore';
import { PAPER_PRESETS } from '../../types';

export const LeftPanel = () => {
  const {
    paperPreset,
    setPaperPreset,
    globalConfig,
    setGlobalConfig,
    viewMode,
    setViewMode,
  } = useStore();

  return (
    <div className="w-56 bg-slate-panel border-r border-slate-border flex flex-col overflow-y-auto text-xs shrink-0">
      {/* ビューモード切替 */}
      <div className="p-3 border-b border-slate-border">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">View Mode</div>
        <div className="flex gap-1">
          {(['edit', 'paper', 'booklet'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-1 rounded text-[10px] transition-colors ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1e2230] text-gray-400 hover:bg-[#272b38]'
              }`}
            >
              {mode === 'edit' ? '編集' : mode === 'paper' ? '用紙' : '製本'}
            </button>
          ))}
        </div>
      </div>

      {/* 用紙プリセット */}
      <div className="p-3 border-b border-slate-border">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Paper Size</div>
        <select
          value={paperPreset.label}
          onChange={(e) => {
            const p = PAPER_PRESETS.find((pp) => pp.label === e.target.value);
            if (p) setPaperPreset(p);
          }}
          className="w-full bg-slate-base text-white text-xs p-1.5 rounded border border-slate-border"
        >
          {PAPER_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* マージン設定（見開き対応） */}
      <div className="p-3 border-b border-slate-border">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Margins (mm)</div>
          <button
            onClick={() => useStore.getState().applyGlobalToAll()}
            className="text-[10px] text-blue-400 hover:text-blue-300"
            title="全ページに適用"
          >
            一括適用
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {(['topMm', 'bottomMm', 'insideMm', 'outsideMm'] as const).map((side) => {
            const labelMap = { topMm: '上(天)', bottomMm: '下(地)', insideMm: '内(ノド)', outsideMm: '外(小口)' };
            return (
              <div key={side} className="flex flex-col mb-1">
                <span className="text-gray-400 text-[10px] mb-1">{labelMap[side]}</span>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={globalConfig.margins[side as keyof typeof globalConfig.margins] || 0}
                  onChange={(e) => {
                    const m = { ...globalConfig.margins, [side]: Number(e.target.value) };
                    setGlobalConfig({ margins: m as any });
                  }}
                  className="w-full bg-slate-base text-white text-xs p-1.5 rounded border border-slate-border text-center"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-1">
          <button onClick={() => useStore.getState().applyGlobalToOdd()} className="flex-1 py-1 bg-slate-base hover:bg-slate-panel rounded text-[10px] text-gray-300">
            奇数のみ適用
          </button>
          <button onClick={() => useStore.getState().applyGlobalToEven()} className="flex-1 py-1 bg-slate-base hover:bg-slate-panel rounded text-[10px] text-gray-300">
            偶数のみ適用
          </button>
        </div>
      </div>

      {/* 一括回転 */}
      <div className="p-3 border-b border-slate-border">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Batch Rotation</div>
        <div className="flex flex-col gap-1">
          <button onClick={() => useStore.getState().rotateAllPages(90)} className="w-full py-1.5 bg-slate-base hover:bg-slate-panel rounded text-xs text-gray-300">
            全ページ 90° 回転
          </button>
          <button onClick={() => useStore.getState().rotateOddPages(180)} className="w-full py-1.5 bg-slate-base hover:bg-slate-panel rounded text-xs text-gray-300">
            奇数ページのみ 180°
          </button>
          <button onClick={() => useStore.getState().rotateEvenPages(180)} className="w-full py-1.5 bg-slate-base hover:bg-slate-panel rounded text-xs text-gray-300">
            偶数ページのみ 180°
          </button>
        </div>
      </div>

      {/* 前付け・本文設定 */}
      <div className="p-3 border-b border-slate-border">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Book Structure</div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">本文開始ページ</span>
            <input
              type="number"
              min={1}
              value={globalConfig.bodyStartPage || 2}
              onChange={(e) => setGlobalConfig({ bodyStartPage: Number(e.target.value) })}
              className="w-16 bg-slate-base text-white text-xs p-1 rounded border border-slate-border text-center"
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <span className="text-gray-300">表紙・前付けの扱い</span>
            <select
              value={globalConfig.frontMatterMode || 'single_fit'}
              onChange={(e) => setGlobalConfig({ frontMatterMode: e.target.value as any })}
              className="w-full bg-slate-base text-white text-xs p-1.5 rounded border border-slate-border"
            >
              <option value="single_fit">単ページ幅統一 (single_fit)</option>
              <option value="spread_split">見開き分割 (spread_split)</option>
              <option value="skip">スキップ (出力除外)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-gray-300">ページの進行方向</span>
            <div className="flex gap-1">
              <button
                onClick={() => setGlobalConfig({ pageOrder: 'L2R' })}
                className={`flex-1 py-1 rounded text-[10px] ${globalConfig.pageOrder === 'L2R' ? 'bg-blue-600 text-white' : 'bg-slate-base text-gray-400'}`}
              >
                左→右
              </button>
              <button
                onClick={() => setGlobalConfig({ pageOrder: 'R2L' })}
                className={`flex-1 py-1 rounded text-[10px] ${globalConfig.pageOrder === 'R2L' ? 'bg-blue-600 text-white' : 'bg-slate-base text-gray-400'}`}
              >
                右→左
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* グローバル設定 */}
      <div className="p-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Global</div>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={globalConfig.accordionBindingMode}
            onChange={(e) => setGlobalConfig({ accordionBindingMode: e.target.checked })}
            className="accent-blue-500"
          />
          <span className="text-gray-300">蛇腹製本モード</span>
        </label>
        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={globalConfig.globalStaffScaleLock}
            onChange={(e) => setGlobalConfig({ globalStaffScaleLock: e.target.checked })}
            className="accent-blue-500"
          />
          <span className="text-gray-300">スケール統一</span>
        </label>
        <button
          onClick={() => useStore.getState().interleavePages && useStore.getState().interleavePages()}
          className="w-full py-1.5 mt-2 bg-slate-base hover:bg-slate-panel rounded text-xs text-gray-300 border border-slate-border"
          title="表面(1,3,5...)と裏面(...6,4,2)の束をソート結合"
        >
          🔄 両面スキャン結合 (Interleave)
        </button>
      </div>
    </div>
  );
};
