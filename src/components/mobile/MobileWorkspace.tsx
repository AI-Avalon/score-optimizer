import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store/useScoreStore';
import { renderPage } from '../../engine';
import { PAPER_PRESETS } from '../../types';
import { ProgressOverlay } from '../ProgressOverlay';
import { ImportWizard } from '../ImportWizard';

export const MobileWorkspace = () => {
  const {
    pages,
    selectedPageId,
    selectPage,
    paperPreset,
    setPaperPreset,
    globalConfig,
    setGlobalConfig,
    updatePage,
    insertBlankPage,
    addPages,
    exportConfig,
    setExportConfig,
    setProcessing,
  } = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  /** キャンバスレンダリング */
  useEffect(() => {
    if (!canvasRef.current) return;
    const container = canvasRef.current;
    let cancelled = false;
    const canvases: HTMLCanvasElement[] = [];

    const render = async () => {
      container.innerHTML = '';
      const pagesToRender = selectedPage ? [selectedPage] : pages.slice(0, 1);

      for (const page of pagesToRender) {
        if (cancelled) return;
        if (page.isSpread && !page.skipSplit && !page.isBlank) {
          for (const side of ['left', 'right'] as const) {
            const c = await renderPage(
              page, paperPreset, side, 0.3,
              globalConfig.margins, globalConfig.accordionBindingMode
            );
            if (cancelled) { c.width = 0; c.height = 0; return; }
            canvases.push(c);
            container.appendChild(c);
          }
        } else {
          const c = await renderPage(
            page, paperPreset, 'single', 0.3,
            globalConfig.margins, globalConfig.accordionBindingMode
          );
          if (cancelled) { c.width = 0; c.height = 0; return; }
          canvases.push(c);
          container.appendChild(c);
        }
      }
    };
    render();
    return () => {
      cancelled = true;
      for (const c of canvases) { c.width = 0; c.height = 0; }
      container.innerHTML = '';
    };
  }, [selectedPage, pages, paperPreset, globalConfig]);

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true, 0);
    setExportConfig({ originalFilename: file.name });
    const { importPdf } = await import('../../pdfImporter');
    const newPages = await importPdf(file, (p) => setProcessing(true, p));
    addPages(newPages);
    setProcessing(false);
    setSheetOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = async () => {
    setProcessing(true, 0);
    const { exportToPdf } = await import('../../exporter');
    await exportToPdf(pages, paperPreset, exportConfig, globalConfig, (p) =>
      setProcessing(true, p)
    );
    setProcessing(false);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <input type="file" accept="application/pdf,image/*" ref={fileInputRef} className="hidden" onChange={handleImportPdf} />
      
      <ImportWizard />

      {/* キャンバスエリア */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto p-4 flex flex-col items-center gap-4"
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      >
        {pages.length === 0 && (
          <div className="text-gray-500 mt-20 text-sm">PDFを読み込んでください</div>
        )}
      </div>

      {/* ページ切替バー */}
      {pages.length > 0 && (
        <div className="h-16 bg-slate-panel border-t border-slate-border flex items-center px-2 gap-1 overflow-x-auto shrink-0">
          {pages.map((p, i) => (
            <button
              key={p.id}
              onClick={() => selectPage(p.id)}
              className={`h-12 min-w-[36px] rounded text-[9px] shrink-0 border ${
                selectedPageId === p.id
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-slate-border bg-slate-base text-gray-500'
              }`}
            >
              {p.isBlank ? '白' : i + 1}
            </button>
          ))}
          <button
            onClick={() => insertBlankPage(pages.length)}
            className="h-12 min-w-[36px] rounded text-lg border border-dashed border-gray-600 text-gray-500 shrink-0"
          >
            +
          </button>
        </div>
      )}

      {/* FAB */}
      {!sheetOpen && (
        <button
          onClick={() => setSheetOpen(true)}
          className="absolute bottom-20 right-4 w-12 h-12 bg-blue-600 rounded-full text-white text-xl shadow-lg z-10 flex items-center justify-center"
        >
          ⚙
        </button>
      )}

      {/* ボトムシート */}
      {sheetOpen && (
        <>
          <div className="absolute inset-0 bg-black/50 z-20" onClick={() => setSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-slate-panel rounded-t-2xl z-30 flex flex-col overflow-hidden">
            <div className="h-6 flex items-center justify-center shrink-0">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold">設定</h2>
                <button onClick={() => setSheetOpen(false)} className="text-gray-400 text-lg">✕</button>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mb-4 p-3 bg-[#2a2e3a] rounded text-xs flex items-center justify-center gap-2"
              >
                📂 PDFを読み込み
              </button>

              {/* 用紙プリセット */}
              <div className="text-[10px] text-gray-500 uppercase mb-1">用紙サイズ</div>
              <select
                value={paperPreset.label}
                onChange={(e) => {
                  const p = PAPER_PRESETS.find((pp) => pp.label === e.target.value);
                  if (p) setPaperPreset(p);
                }}
                className="w-full bg-slate-base text-white text-xs p-2 rounded border border-slate-border mb-4"
              >
                {PAPER_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>

              {/* 選択ページ設定 */}
              {selectedPage && !selectedPage.isBlank && (
                <div className="mb-4 p-3 bg-slate-base rounded border border-slate-border">
                  <div className="text-[10px] text-gray-500 uppercase mb-2">選択ページ設定</div>
                  <label className="flex items-center gap-2 mb-2 text-xs">
                    <input type="checkbox" checked={selectedPage.isSpread}
                      onChange={(e) => updatePage(selectedPage.id, { isSpread: e.target.checked })}
                      className="accent-blue-500" />
                    見開きスキャン
                  </label>
                  {selectedPage.isSpread && (
                    <label className="flex items-center gap-2 mb-2 text-xs">
                      <input type="checkbox" checked={selectedPage.skipSplit}
                        onChange={(e) => updatePage(selectedPage.id, { skipSplit: e.target.checked })}
                        className="accent-blue-500" />
                      分割スキップ
                    </label>
                  )}
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>ノド影L</span><span>{selectedPage.gutterMaskLeftMm}mm</span>
                    </div>
                    <input type="range" min={0} max={30} value={selectedPage.gutterMaskLeftMm}
                      onChange={(e) => updatePage(selectedPage.id, { gutterMaskLeftMm: Number(e.target.value) })}
                      className="w-full accent-blue-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>ノド影R</span><span>{selectedPage.gutterMaskRightMm}mm</span>
                    </div>
                    <input type="range" min={0} max={30} value={selectedPage.gutterMaskRightMm}
                      onChange={(e) => updatePage(selectedPage.id, { gutterMaskRightMm: Number(e.target.value) })}
                      className="w-full accent-blue-500" />
                  </div>
                </div>
              )}

              {/* グローバル設定 */}
              <label className="flex items-center gap-2 mb-2 text-xs">
                <input type="checkbox" checked={globalConfig.accordionBindingMode}
                  onChange={(e) => setGlobalConfig({ accordionBindingMode: e.target.checked })}
                  className="accent-blue-500" />
                蛇腹製本モード
              </label>

              {/* 書き出し */}
              <button
                onClick={handleExport}
                disabled={pages.length === 0}
                className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded text-xs font-bold"
              >
                📄 PDF書き出し（300DPI）
              </button>
            </div>
          </div>
        </>
      )}

      <ProgressOverlay />
    </div>
  );
};
