import { useStore } from '../store';
import { CanvasPreview } from './CanvasPreview';

export const PCWorkspace = () => {
  const { pages, selectedPreset } = useStore();

  return (
    <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left Pane: Navigation / Settings */}
      <div className="w-64 bg-slate-panel border-r border-slate-border p-4 overflow-y-auto">
        <h2 className="text-sm font-bold mb-4 text-gray-400">PAGES</h2>
        {pages.length === 0 && <div className="text-xs text-gray-500">No pages yet.</div>}
        {pages.map((p, i) => (
          <div key={p.id} className="mb-2 p-2 bg-slate-base rounded text-sm cursor-pointer border border-transparent hover:border-slate-border">
            Page {i + 1} {p.isLandscape ? '(Spread)' : ''}
          </div>
        ))}
      </div>

      {/* Center Pane: Canvas View */}
      <div className="flex-1 bg-slate-base relative overflow-auto p-10 flex items-center justify-center gap-10">
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
          <div className="text-gray-500">Add a score to begin</div>
        )}
      </div>

      {/* Right Pane: Export / Options */}
      <div className="w-72 bg-slate-panel border-l border-slate-border p-4 overflow-y-auto">
        <h2 className="text-sm font-bold mb-4 text-gray-400">INSPECTOR</h2>
        <div className="mb-4">
          <label className="text-xs text-gray-400 block mb-1">Preset</label>
          <div className="text-sm bg-slate-base p-2 rounded border border-slate-border">
            {selectedPreset.name}
          </div>
        </div>
      </div>
    </div>
  );
};
