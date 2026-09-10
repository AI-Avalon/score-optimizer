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
