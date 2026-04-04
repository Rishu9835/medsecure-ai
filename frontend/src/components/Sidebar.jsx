import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  QrCode,
  LogOut,
  Shield,
  Menu,
  X
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'CASE DASHBOARD' },
    { to: '/admin/shipments', icon: Package, label: 'SHIPMENTS' },
    { to: '/admin/analytics', icon: BarChart3, label: 'ANALYTICS' },
  ];

  const driverLinks = [
    { to: '/driver', icon: LayoutDashboard, label: 'CASE DASHBOARD' },
    { to: '/driver/scan', icon: QrCode, label: 'SCAN QR' },
  ];

  const links = user?.role === 'admin' ? adminLinks : driverLinks;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 bg-forensic-bg border border-white/10 flex items-center justify-center text-forensic-orange"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-56 bg-forensic-bg border-r border-white/5 text-forensic-text flex flex-col z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-forensic-orange/10 border border-forensic-orange/30 flex items-center justify-center">
              <Shield className="w-6 h-6 text-forensic-orange" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-forensic uppercase">MEDSECURE</h1>
              <p className="text-xs text-forensic-text-dim uppercase font-mono tracking-wide">{user?.role} UNIT</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {links.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/admin' || to === '/driver'}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 transition-all duration-100 border border-transparent ${
                      isActive
                        ? 'bg-forensic-orange/10 text-forensic-orange border-forensic-orange/30 shadow-forensic-glow'
                        : 'text-forensic-text-dim hover:bg-forensic-surface-high hover:text-forensic-text hover:border-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-xs tracking-wide font-medium">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {/* Dark Mode Notice - Forensic design is dark-only */}
          <div className="px-4 py-2 bg-forensic-surface-low border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 bg-forensic-orange"></div>
              <span className="text-[10px] text-forensic-text-dim uppercase tracking-wide font-mono">FORENSIC MODE</span>
            </div>
            <p className="text-[9px] text-forensic-text-muted font-mono leading-tight">
              DARK_INTERFACE_ONLY
            </p>
          </div>

          {/* User Info */}
          <div className="px-4 py-2">
            <p className="text-xs text-forensic-text-muted truncate font-mono">{user?.email}</p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-forensic-blood-red/80 hover:bg-forensic-blood-red/10 hover:text-forensic-blood-red transition-all duration-100 border border-transparent hover:border-forensic-blood-red/20"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs tracking-wide uppercase">LOGOUT</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
