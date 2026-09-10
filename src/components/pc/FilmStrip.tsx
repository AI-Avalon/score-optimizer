
import { useStore } from '../../store/useScoreStore';
import { useEffect, useState } from 'react';
import { processPageImage } from '../../engine';

export const FilmStrip = () => {
  const { pages, selectedPageId, selectPage, globalConfig } = useStore();
  const [processedPreviews, setProcessedPreviews] = useState<{left?: string, right?: string}>({});

  useEffect(() => {
    const selectedIndex = pages.findIndex(p => p.id === selectedPageId);
    if (selectedIndex === -1) return;
    const page = pages[selectedIndex];
    
    let active = true;
    const renderPreview = async () => {
      const datas = await processPageImage(page, selectedIndex, globalConfig);
      if (!active) return;
      
      const toDataUrl = (data: ImageData) => {
        const c = document.createElement('canvas');
        c.width = data.width;
        c.height = data.height;
        c.getContext('2d')!.putImageData(data, 0, 0);
        const res = c.toDataURL('image/jpeg', 0.5);
        c.width = 0; c.height = 0;
        return res;
      };

      setProcessedPreviews({
        left: datas[0] ? toDataUrl(datas[0]) : undefined,
        right: datas[1] ? toDataUrl(datas[1]) : undefined,
      });
    };
    renderPreview();
    return () => { active = false; };
  }, [selectedPageId, pages, globalConfig]);

  if (pages.length === 0) return null;

  return (
    <div className="h-48 bg-slate-panel border-t border-slate-border flex shrink-0 overflow-hidden">
      <div className="flex-1 flex gap-2 p-3 overflow-x-auto">
        {pages.map((p, i) => (
          <div
            key={p.id}
            onClick={() => selectPage(p.id)}
            className={`relative shrink-0 w-24 rounded border-2 cursor-pointer transition-colors ${
              selectedPageId === p.id ? 'border-blue-500' : 'border-transparent hover:border-slate-border'
            }`}
          >
            <div className="text-[9px] text-gray-500 absolute -top-4 left-0">Page {i + 1}</div>
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={`page ${i+1}`} className="w-full h-full object-contain bg-black/20" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/20 text-xs text-gray-500">Blank</div>
            )}
            {p.overrideSettings && (
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" title="個別設定あり" />
            )}
          </div>
        ))}
      </div>

      <div className="w-64 border-l border-slate-border p-2 bg-slate-800 flex flex-col">
        <div className="text-[10px] text-gray-400 mb-1">処理後プレビュー (現在ページ)</div>
        <div className="flex-1 flex gap-2">
          {processedPreviews.left ? (
            <img src={processedPreviews.left} className="flex-1 object-contain bg-black/40 min-w-0" />
          ) : <div className="flex-1 bg-black/20" />}
          
          {processedPreviews.right ? (
            <img src={processedPreviews.right} className="flex-1 object-contain bg-black/40 min-w-0" />
          ) : <div className="flex-1 bg-black/20" />}
        </div>
      </div>
    </div>
  );
};
