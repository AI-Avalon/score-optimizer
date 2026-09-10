import { useStore } from '../store';
import { CanvasPreview } from './CanvasPreview';
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import { useState, useRef } from 'react';
import { Menu, X, Upload } from 'lucide-react';
import { PRESETS } from '../types';
import { importPdf } from '../pdfImporter';

export const MobileWorkspace = () => {
  const { pages, selectedPreset, setSelectedPreset, updatePage, addPage, removePage } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bottom sheet drag
  const [{ y }, api] = useSpring(() => ({ y: 100 }));
  const bindSheet = useGesture({
    onDrag: ({ last, velocity: [, vy], direction: [, dy], movement: [, my] }) => {
      if (last) {
        if (my > 50 || (vy > 0.5 && dy > 0)) {
          setSheetOpen(false);
        } else {
          setSheetOpen(true);
        }
      }
    }
  });

  api.start({ y: sheetOpen ? 0 : 100, immediate: false });

  // Pan and Zoom for canvas container
  const [style, apiZoom] = useSpring(() => ({ x: 0, y: 0, scale: 1 }));
  const bindZoom = useGesture({
    onDrag: ({ offset: [x, y] }) => {
      apiZoom.start({ x, y });
    },
    onPinch: ({ offset: [d] }) => {
      // Basic scaling, typically d represents distance. We map it to scale.
      const s = Math.max(0.5, Math.min(3, d / 100));
      apiZoom.start({ scale: s });
    }
  });

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newPages = await importPdf(file);
      newPages.forEach(addPage);
    }
    setSheetOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden relative touch-none">
      <input type="file" accept="application/pdf" ref={fileInputRef} className="hidden" onChange={handleImportPdf} />
      
      {/* Fullscreen canvas viewer */}
      <animated.div {...bindZoom()} style={style} className="flex-1 overflow-visible p-4 flex flex-col items-center gap-4">
        {pages.length > 0 ? pages.map(p => (
          p.isLandscape ? (
            <div key={p.id} className="flex flex-col gap-4 w-full items-center">
              <CanvasPreview page={p} preset={selectedPreset} side="left" previewScale={0.3} />
              <CanvasPreview page={p} preset={selectedPreset} side="right" previewScale={0.3} />
            </div>
          ) : (
             <div key={p.id} className="w-full flex justify-center">
               <CanvasPreview page={p} preset={selectedPreset} side="single" previewScale={0.3} />
             </div>
          )
        )) : (
          <div className="text-gray-500 mt-20">Add a score to begin</div>
        )}
      </animated.div>

      {/* Floating Action Button for Menu */}
      {!sheetOpen && (
        <button 
          onClick={() => setSheetOpen(true)}
          className="absolute bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg z-10"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Bottom Sheet */}
      {sheetOpen && (
        <div className="absolute inset-0 bg-black/50 z-20" onClick={() => setSheetOpen(false)}></div>
      )}
      <animated.div 
        {...bindSheet()}
        style={{ transform: y.to(y => `translateY(${y}%)`) }}
        className="absolute bottom-0 left-0 right-0 h-3/4 bg-slate-panel rounded-t-2xl z-30 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] touch-none"
      >
        <div className="h-8 flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0">
          <div className="w-12 h-1.5 bg-gray-600 rounded-full"></div>
        </div>
        <div className="p-4 overflow-y-auto flex-1 touch-pan-y">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Settings</h2>
            <button onClick={() => setSheetOpen(false)} className="p-2"><X size={20}/></button>
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full mb-6 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 p-3 rounded text-sm font-medium transition-colors"
          >
            <Upload size={18} />
            PDFを読み込み
          </button>

          <div className="text-sm text-gray-400 mb-2">Preset</div>
          <select 
            className="w-full bg-slate-base p-3 rounded border border-slate-border text-white mb-6"
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

          <div className="text-sm text-gray-400 mb-2">Pages</div>
          {pages.map((p, i) => (
            <div key={p.id} className="mb-4 p-4 bg-slate-base rounded text-sm text-white border border-slate-border">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold">Page {i + 1}</span>
                <button onClick={() => removePage(p.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-400/10 rounded">Remove</button>
              </div>
              <label className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={p.isLandscape} onChange={e => updatePage(p.id, { isLandscape: e.target.checked })} />
                Landscape Split
              </label>
              {p.isLandscape && (
                <div className="mb-3">
                  <label className="text-xs text-gray-400 flex justify-between">Spine Guide <span>{p.spineGuide}%</span></label>
                  <input type="range" min="10" max="90" value={p.spineGuide} onChange={e => updatePage(p.id, { spineGuide: parseInt(e.target.value) })} className="w-full" />
                </div>
              )}
              <div className="mb-3">
                <label className="text-xs text-gray-400 flex justify-between">Left Mask <span>{p.leftMaskOffset}mm</span></label>
                <input type="range" min="0" max="30" value={p.leftMaskOffset} onChange={e => updatePage(p.id, { leftMaskOffset: parseInt(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-400 flex justify-between">Right Mask <span>{p.rightMaskOffset}mm</span></label>
                <input type="range" min="0" max="30" value={p.rightMaskOffset} onChange={e => updatePage(p.id, { rightMaskOffset: parseInt(e.target.value) })} className="w-full" />
              </div>
            </div>
          ))}
          <button 
            onClick={async () => {
              const { exportToPdf } = await import('../exporter');
              await exportToPdf(pages, selectedPreset);
            }}
            disabled={pages.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed p-3 rounded text-sm font-bold mt-8"
          >
            PDF書き出し (300DPI)
          </button>
        </div>
      </animated.div>
    </div>
  );
};
