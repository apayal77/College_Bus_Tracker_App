import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Map as MapIcon, 
  LogOut,
  Bus,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Users size={20} />, label: 'Manage Students', path: '/students' },
    { icon: <Users size={20} />, label: 'Manage Drivers', path: '/drivers' },
    { icon: <MapIcon size={20} />, label: 'Manage Routes', path: '/routes' },
    { icon: <Bus size={20} />, label: 'Live Monitor', path: '/monitor' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-64 h-screen bg-[#1e293b] border-r border-[#334155] flex flex-col fixed left-0 top-0 z-[9999]
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6 flex items-center justify-between border-b border-[#334155]/30">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Bus className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">BusTracker</h1>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white md:hidden bg-transparent border-none cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose} // Auto-close drawer on click on mobile
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-600/10 text-blue-500 font-semibold' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#334155]/30">
          <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
