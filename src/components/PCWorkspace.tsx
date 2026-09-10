import { useStore } from '../store';
import { CanvasPreview } from './CanvasPreview';
import { PRESETS } from '../types';

export const PCWorkspace = () => {
  const { pages, selectedPreset, setSelectedPreset, updatePage, removePage } = useStore();

  return (
    <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left Pane: Navigation / Settings */}
      <div className="w-64 bg-slate-panel border-r border-slate-border p-4 overflow-y-auto">
        <h2 className="text-sm font-bold mb-4 text-gray-400">PAGES</h2>
        {pages.length === 0 && <div className="text-xs text-gray-500">No pages yet.</div>}
        {pages.map((p, i) => (
          <div key={p.id} className="mb-4 p-3 bg-slate-base rounded text-sm border border-slate-border">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">Page {i + 1}</span>
              <button onClick={() => removePage(p.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
            </div>
            
            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={p.isLandscape} onChange={e => updatePage(p.id, { isLandscape: e.target.checked })} />
              Landscape Split
            </label>

            {p.isLandscape && (
              <div className="mb-2">
                <label className="text-xs text-gray-400">Spine Guide (%)</label>
                <input type="range" min="10" max="90" value={p.spineGuide} onChange={e => updatePage(p.id, { spineGuide: parseInt(e.target.value) })} className="w-full" />
              </div>
            )}
            <div className="mb-2">
              <label className="text-xs text-gray-400">Left Mask Offset (mm)</label>
              <input type="range" min="0" max="30" value={p.leftMaskOffset} onChange={e => updatePage(p.id, { leftMaskOffset: parseInt(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Right Mask Offset (mm)</label>
              <input type="range" min="0" max="30" value={p.rightMaskOffset} onChange={e => updatePage(p.id, { rightMaskOffset: parseInt(e.target.value) })} className="w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Center Pane: Canvas View */}
      <div className="flex-1 bg-slate-base relative overflow-auto p-10 flex flex-col items-center gap-10">
        {pages.length > 0 ? pages.map(p => (
          p.isLandscape ? (
            <div key={p.id} className="flex gap-4">
              <CanvasPreview page={p} preset={selectedPreset} side="left" />
              <CanvasPreview page={p} preset={selectedPreset} side="right" />
            </div>
          ) : (
             <CanvasPreview key={p.id} page={p} preset={selectedPreset} side="single" />
          )
        )) : (
          <div className="text-gray-500 m-auto">Add a score to begin</div>
        )}
      </div>

      {/* Right Pane: Export / Options */}
      <div className="w-72 bg-slate-panel border-l border-slate-border p-4 overflow-y-auto">
        <h2 className="text-sm font-bold mb-4 text-gray-400">INSPECTOR</h2>
        <div className="mb-4">
          <label className="text-xs text-gray-400 block mb-1">Preset</label>
          <select 
            className="text-sm bg-slate-base p-2 rounded border border-slate-border w-full text-white"
            value={selectedPreset.name}
            onChange={(e) => {
              const preset = PRESETS.find(p => p.name === e.target.value);
              if (preset) setSelectedPreset(preset);
            }}
          >
            {PRESETS.map(preset => (
              <option key={preset.name} value={preset.name}>{preset.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={async () => {
            const { exportToPdf } = await import('../exporter');
            await exportToPdf(pages, selectedPreset);
          }}
          disabled={pages.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed p-2 rounded text-sm font-bold mt-8"
        >
          PDF書き出し (300DPI)
        </button>
      </div>
    </div>
  );
};
