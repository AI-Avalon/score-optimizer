import { useStore } from '../../store/useScoreStore';
import type { PageData } from '../../engine/types';

export const Filmstrip = () => {
  const { pages, selectedPageId, selectPage, pageOverrides } = useStore();

  if (pages.length === 0) return null;

  return (
    <div className="h-32 bg-[#161922] border-t border-[#272B35] flex shrink-0 overflow-hidden z-20">
      <div className="flex-1 flex gap-3 p-3 overflow-x-auto hide-scrollbar whitespace-nowrap items-center">
        {pages.map((p: PageData, i: number) => {
          const isSelected = selectedPageId === p.id;
          const hasOverride = !!pageOverrides[i];
          
          return (
            <div
              key={p.id}
              onClick={() => selectPage(p.id)}
              className={`relative inline-flex flex-col h-full shrink-0 w-[4.5rem] rounded border-2 cursor-pointer transition-colors ${
                isSelected ? 'border-blue-500' : 'border-transparent hover:border-[#272B35]'
              }`}
            >
              <div className="absolute -top-1 -right-1 z-10 flex gap-1">
                {hasOverride && (
                  <div className="text-[8px] bg-orange-600 px-1 py-0.5 rounded text-white font-bold leading-none">個別</div>
                )}
              </div>
              <img src={p.originalImage} className="w-full h-full object-contain bg-black/20 rounded-sm" />
              <div className="text-center text-[10px] text-gray-400 mt-1">
                {i + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
