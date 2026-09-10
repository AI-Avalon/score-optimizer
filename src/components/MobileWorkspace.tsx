import { useStore } from '../store';
import { CanvasPreview } from './CanvasPreview';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export const MobileWorkspace = () => {
  const { pages, selectedPreset } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Simple bottom sheet drag
  const [{ y }, api] = useSpring(() => ({ y: 100 }));

  const bind = useDrag(({ last, velocity: [, vy], direction: [, dy], movement: [, my] }) => {
    if (last) {
      if (my > 50 || (vy > 0.5 && dy > 0)) {
        setSheetOpen(false);
      } else {
        setSheetOpen(true);
      }
    }
  }, { from: () => [0, sheetOpen ? 0 : window.innerHeight] });

  // Update spring when state changes
  api.start({ y: sheetOpen ? 0 : 100, immediate: false });

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden relative">
      {/* Fullscreen canvas viewer */}
      <div className="flex-1 bg-slate-base overflow-auto p-4 flex flex-col items-center gap-4">
        {pages.length > 0 ? pages.map(p => (
          p.isLandscape ? (
            <div key={p.id} className="flex flex-col gap-4">
              <CanvasPreview page={p} preset={selectedPreset} side="left" previewScale={0.15} />
              <CanvasPreview page={p} preset={selectedPreset} side="right" previewScale={0.15} />
            </div>
          ) : (
             <CanvasPreview key={p.id} page={p} preset={selectedPreset} side="single" previewScale={0.15} />
          )
        )) : (
          <div className="text-gray-500 mt-20">Add a score to begin</div>
        )}
      </div>

      {/* Floating Action Button for Menu */}
      {!sheetOpen && (
        <button 
          onClick={() => setSheetOpen(true)}
          className="absolute bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Bottom Sheet */}
      {sheetOpen && (
        <div className="absolute inset-0 bg-black/50 z-10" onClick={() => setSheetOpen(false)}></div>
      )}
      <animated.div 
        {...bind()}
        style={{ transform: y.to(y => `translateY(${y}%)`) }}
        className="absolute bottom-0 left-0 right-0 h-2/3 bg-slate-panel rounded-t-2xl z-20 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] touch-none"
      >
        <div className="h-8 flex items-center justify-center cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full"></div>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Settings</h2>
            <button onClick={() => setSheetOpen(false)} className="p-2"><X size={20}/></button>
          </div>
          <div className="text-sm text-gray-400 mb-2">Preset</div>
          <div className="bg-slate-base p-3 rounded border border-slate-border text-white">
            {selectedPreset.name}
          </div>
          <div className="text-sm text-gray-400 mt-6 mb-2">Pages</div>
          {pages.map((p, i) => (
            <div key={p.id} className="mb-2 p-3 bg-slate-base rounded text-sm text-white">
              Page {i + 1} {p.isLandscape ? '(Spread)' : ''}
            </div>
          ))}
        </div>
      </animated.div>
    </div>
  );
};
