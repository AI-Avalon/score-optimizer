import { useState } from 'react';
import { useStore } from '../../store/useScoreStore';
import { CanvasViewer } from '../pc/CanvasViewer';
import { LeftPanel } from '../pc/LeftPanel';
import { RightPanel } from '../pc/RightPanel';
import { FilmStrip } from '../pc/FilmStrip';

export const MobileWorkspace = () => {
  const { pages, selectedPageId } = useStore();
  const [activeTab, setActiveTab] = useState<'pages' | 'settings'>('pages');
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0D0F12] text-white overflow-hidden relative min-w-0">
      <div className="flex-1 relative">
        {selectedPage ? <CanvasViewer /> : <div className="flex-1 flex items-center justify-center text-gray-500">No Page Selected</div>}
      </div>
      
      {/* 画面下部の引き出し（ボトムシート） */}
      <div className={`absolute bottom-0 left-0 right-0 bg-[#161922] border-t border-[#272B35] flex flex-col transition-transform duration-300 ease-out z-50 ${sheetOpen ? 'translate-y-0 h-[60dvh]' : 'translate-y-0 h-16'}`}>
        {/* ハンドル */}
        <div 
          className="h-16 flex items-center justify-between px-6 shrink-0 cursor-pointer"
          onClick={() => setSheetOpen(!sheetOpen)}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-1.5 bg-gray-600 rounded-full"></div>
            <span className="font-medium text-sm text-gray-300">設定・ページ</span>
          </div>
          <span className="text-blue-500 text-sm font-bold">{sheetOpen ? '閉じる' : '開く'}</span>
        </div>
        
        {/* コンテンツ */}
        {sheetOpen && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex border-b border-[#272B35]">
              <button 
                onClick={() => setActiveTab('pages')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'pages' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
              >
                ページ一覧
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'settings' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}
              >
                設定パネル
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'pages' && (
                <div className="flex flex-col h-full">
                  <FilmStrip />
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="flex divide-x divide-[#272B35] h-full overflow-x-auto">
                  <LeftPanel />
                  <RightPanel />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
