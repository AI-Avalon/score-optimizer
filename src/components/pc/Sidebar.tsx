import { useStore } from '../../store/useScoreStore';
import { Save, Trash2 } from 'lucide-react';
import type { PageData } from '../../engine/types';

export const Sidebar = () => {
  const { settings, updateSettings, pages, selectedPageId, pageOverrides, savePageOverride, removePageOverride } = useStore();
  
  const selectedIndex = pages.findIndex((p: PageData) => p.id === selectedPageId);
  const hasOverride = selectedIndex !== -1 && !!pageOverrides[selectedIndex];

  return (
    <div className="w-[340px] bg-[#161922] border-r border-[#272B35] flex flex-col overflow-y-auto shrink-0 z-20 hide-scrollbar h-full">
      
      {/* ページ処理モード */}
      <div className="p-4 border-b border-[#272B35]">
        <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">ページ処理</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input 
              type="radio" 
              name="processingMode"
              checked={settings.page_processing_mode === 'spread_split'}
              onChange={() => updateSettings({ page_processing_mode: 'spread_split' })}
            /> 見開き分割
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input 
              type="radio" 
              name="processingMode"
              checked={settings.page_processing_mode === 'single_fit'}
              onChange={() => updateSettings({ page_processing_mode: 'single_fit' })}
            /> 単ページ幅統一
          </label>
        </div>
      </div>

      {/* 色設定 */}
      <div className="p-4 border-b border-[#272B35]">
        <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">出力色</h3>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input 
              type="radio" 
              name="colorMode"
              checked={settings.output_color_mode === 'monochrome'}
              onChange={() => updateSettings({ output_color_mode: 'monochrome' })}
            /> 白黒
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input 
              type="radio" 
              name="colorMode"
              checked={settings.output_color_mode === 'original'}
              onChange={() => updateSettings({ output_color_mode: 'original' })}
            /> 元のまま
          </label>
        </div>
        
        {settings.output_color_mode === 'monochrome' && (
          <div className="space-y-3 mt-2 bg-[#0D0F12] p-3 rounded-md border border-[#272B35]">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input 
                type="checkbox" 
                checked={settings.use_adaptive_threshold}
                onChange={(e) => updateSettings({ use_adaptive_threshold: e.target.checked })}
              /> 適応的二値化 (照明ムラ向け)
            </label>
            {!settings.use_adaptive_threshold && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span>固定しきい値</span>
                  <span className="text-gray-400">{settings.fixed_threshold}</span>
                </div>
                <input 
                  type="range" min="80" max="230" 
                  value={settings.fixed_threshold}
                  onChange={(e) => updateSettings({ fixed_threshold: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 自動クロップ */}
      <div className="p-4 border-b border-[#272B35]">
        <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">自動クロップ</h3>
        <label className="flex items-center gap-2 cursor-pointer text-xs mb-3">
          <input 
            type="checkbox" 
            checked={settings.auto_crop_enabled}
            onChange={(e) => updateSettings({ auto_crop_enabled: e.target.checked })}
          /> 自動トリミングを有効化
        </label>
        
        {settings.auto_crop_enabled && (
          <div className="space-y-3 bg-[#0D0F12] p-3 rounded-md border border-[#272B35]">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>黒余白しきい値</span>
                <span className="text-gray-400">{settings.black_margin_threshold}</span>
              </div>
              <input 
                type="range" min="0" max="80" 
                value={settings.black_margin_threshold}
                onChange={(e) => updateSettings({ black_margin_threshold: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>クロップ余白 (px)</span>
                <span className="text-gray-400">{settings.crop_padding_px}</span>
              </div>
              <input 
                type="range" min="0" max="40" 
                value={settings.crop_padding_px}
                onChange={(e) => updateSettings({ crop_padding_px: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* 手動トリム */}
      <div className="p-4 border-b border-[#272B35]">
        <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">手動トリム (%)</h3>
        <div className="grid grid-cols-2 gap-3 bg-[#0D0F12] p-3 rounded-md border border-[#272B35]">
          {(['top', 'bottom', 'left', 'right'] as const).map(dir => (
            <div key={dir} className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px]">
                <span className="uppercase">{dir}</span>
                <span className="text-gray-400">{settings[`manual_trim_${dir}_percent`].toFixed(1)}%</span>
              </div>
              <input 
                type="range" min="0" max="20" step="0.1"
                value={settings[`manual_trim_${dir}_percent`]}
                onChange={(e) => updateSettings({ [`manual_trim_${dir}_percent`]: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 分割設定 */}
      {settings.page_processing_mode === 'spread_split' && (
        <div className="p-4 border-b border-[#272B35]">
          <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">分割設定</h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span>分割位置補正 (%)</span>
                <span className="text-gray-400">{settings.split_offset_percent.toFixed(1)}%</span>
              </div>
              <input 
                type="range" min="-20" max="20" step="0.1"
                value={settings.split_offset_percent}
                onChange={(e) => updateSettings({ split_offset_percent: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            
            <div className="flex flex-col gap-2 text-xs">
              <span>ページ順</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" name="order"
                    checked={settings.page_order === 'left_to_right'}
                    onChange={() => updateSettings({ page_order: 'left_to_right' })}
                  /> 左→右
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" name="order"
                    checked={settings.page_order === 'right_to_left'}
                    onChange={() => updateSettings({ page_order: 'right_to_left' })}
                  /> 右→左
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ページ個別設定 */}
      <div className="p-4 mb-10">
        <h3 className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">ページ個別設定</h3>
        <div className="text-xs text-gray-400 mb-3">現在表示中のページだけを個別設定として保存できます。</div>
        {selectedIndex !== -1 ? (
          <div className="flex gap-2">
            <button 
              onClick={() => savePageOverride(selectedIndex)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-[#272B35] hover:bg-[#343A46] text-xs rounded transition-colors text-white"
            >
              <Save size={12} /> 保存
            </button>
            <button 
              onClick={() => removePageOverride(selectedIndex)}
              disabled={!hasOverride}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-xs rounded transition-colors disabled:opacity-30 text-red-200"
            >
              <Trash2 size={12} /> 解除
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-600">ページが選択されていません</div>
        )}
      </div>

    </div>
  );
};
