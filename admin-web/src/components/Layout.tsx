import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Bus } from 'lucide-react';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      {/* Sidebar Drawer */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen md:pl-64">
        {/* Mobile Top Navigation Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#1e293b] border-b border-[#334155]/30 sticky top-0 z-[9990] backdrop-blur-md bg-opacity-95">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white bg-transparent border-none cursor-pointer flex items-center justify-center rounded-lg hover:bg-slate-800"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Bus className="text-white" size={18} />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">BusTracker</span>
            </div>
          </div>
        </header>

        {/* Inner Content Wrapper */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-[#0f172a]">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
