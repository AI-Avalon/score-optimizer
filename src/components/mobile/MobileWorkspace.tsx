
import { useStore } from '../../store/useScoreStore';

export const MobileWorkspace = () => {
  const { pages, selectedPageId } = useStore();
  const selectedPage = pages.find((p) => p.id === selectedPageId);

  if (!selectedPage) return <div className="p-4 text-white">No Page Selected</div>;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white overflow-hidden pb-16">
      <div className="p-4">
        {selectedPage.imageUrl && (
          <img src={selectedPage.imageUrl} className="w-full object-contain max-h-[60vh]" />
        )}
      </div>
      <div className="p-4 flex flex-col gap-4">
        <p className="text-sm text-gray-400">PCでの操作を推奨します。</p>
      </div>
    </div>
  );
};
