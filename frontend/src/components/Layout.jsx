import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    // Force dark mode - forensic design is dark-only
    <div className="min-h-screen dark">
      <div className="min-h-screen bg-forensic-bg transition-colors duration-100 relative">
        {/* Grain texture overlay */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
        <Sidebar />
        <main className="lg:ml-56 p-4 lg:p-6 pt-16 lg:pt-6 min-h-screen relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
