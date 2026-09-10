import { useStore } from '../store/useScoreStore';

export const ProgressOverlay = () => {
  const { isProcessing, progress } = useStore();
  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center">
      <div className="bg-slate-panel rounded-lg p-6 w-72 border border-slate-border">
        <div className="text-sm mb-3 text-center">処理中...</div>
        <div className="w-full h-2 bg-slate-base rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 text-center mt-2">{progress}%</div>
      </div>
    </div>
  );
};
