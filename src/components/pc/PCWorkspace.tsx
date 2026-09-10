import { CanvasViewer } from './CanvasViewer';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { FilmStrip } from './FilmStrip';
import { ProgressOverlay } from '../ProgressOverlay';

export const PCWorkspace = () => {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <CanvasViewer />
        <RightPanel />
      </div>
      <FilmStrip />
      <ProgressOverlay />
    </div>
  );
};
