import { Header } from './components/Header';
import { Sidebar } from './components/pc/Sidebar';
import { CanvasStage } from './components/pc/CanvasStage';
import { Filmstrip } from './components/pc/Filmstrip';

function App() {
  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-[#0D0F12] text-white select-none">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <CanvasStage />
          <Filmstrip />
        </div>
      </div>
    </div>
  );
}

export default App;
