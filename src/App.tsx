import { Header } from './components/Header';
import { PCWorkspace } from './components/PCWorkspace';
import { MobileWorkspace } from './components/MobileWorkspace';
import { useStore } from './store';
import { useEffect } from 'react';

export const App = () => {
  const { isMobile, setIsMobile } = useStore();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-base text-white">
      <Header />
      {isMobile ? <MobileWorkspace /> : <PCWorkspace />}
    </div>
  );
};
