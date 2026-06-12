import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function AppShell({ children }) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden text-gray-400 font-sans text-sm">
      
      {/* 1. Activity Bar (Ultra thin left strip) */}
      <div className="w-12 border-r border-white_10 flex flex-col items-center py-4 bg-black_60 flex-shrink-0 z-20">
        <div className="w-8 h-8 rounded-lg bg-blue-600 neon-glow mb-6"></div>
        <nav className="flex flex-col gap-4">
          <Link to="/dashboard" className={`p-2 rounded-lg transition-colors ${path === '/dashboard' ? 'text-white bg-white_10' : 'hover:text-white'}`} title="Explorer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </Link>
          <Link to="/new-deck" className={`p-2 rounded-lg transition-colors ${path === '/new-deck' ? 'text-white bg-white_10' : 'hover:text-white'}`} title="Generate">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </Link>
          <Link to="/brand-kits" className={`p-2 rounded-lg transition-colors ${path === '/brand-kits' ? 'text-white bg-white_10' : 'hover:text-white'}`} title="Brand Kits">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
          </Link>
        </nav>
        <div className="mt-auto flex flex-col gap-4">
          <Link to="/settings" className={`p-2 rounded-lg transition-colors ${path === '/settings' ? 'text-white bg-white_10' : 'hover:text-white'}`} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </Link>
        </div>
      </div>

      {/* 2. Primary Sidebar (Explorer) */}
      <div className="w-64 border-r border-white_10 bg-[#0a0a0a] flex flex-col flex-shrink-0 z-10">
        <div className="h-10 px-4 flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-white_10">
          EXPLORER
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="text-white flex items-center gap-2 px-2 py-1 hover:bg-white_5 cursor-pointer rounded">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            <span className="font-medium">SLIDECRUX_WORKSPACE</span>
          </div>
          <div className="pl-6 pr-2 py-1 mt-1 flex flex-col gap-1">
             <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1 hover:bg-white_5 cursor-pointer rounded text-gray-400 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                Dashboard
             </Link>
             <Link to="/new-deck" className="flex items-center gap-2 px-2 py-1 hover:bg-white_5 cursor-pointer rounded text-gray-400 hover:text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                New Deck Gen
             </Link>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace */}
      <main className="flex-1 flex flex-col bg-[#050505] relative min-w-0">
        <div className="h-10 border-b border-white_10 flex items-center px-4 bg-[#0a0a0a] text-xs font-medium gap-2">
           <span className="text-gray-500">SlideCrux</span>
           <span className="text-gray-600">/</span>
           <span className="text-gray-300">{path.replace('/', '') || 'dashboard'}</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {children}
        </div>
        <div className="h-6 border-t border-white_10 bg-[#0a0a0a] flex items-center px-4 text-xs text-blue-400 gap-4">
           <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Ready</span>
           <span className="text-gray-500">UTF-8</span>
           <span className="text-gray-500">React</span>
        </div>
      </main>

      {/* 4. Secondary Sidebar (Inspector/Properties) */}
      <div className="w-72 border-l border-white_10 bg-[#0a0a0a] flex flex-col flex-shrink-0 z-10 hidden xl:flex">
        <div className="h-10 px-4 flex items-center text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-white_10">
          INSPECTOR
        </div>
        <div className="p-4 flex flex-col gap-6">
           {path === '/dashboard' && (
             <div className="p-4 rounded-lg bg-white_5 border border-white_10">
                <h4 className="text-white font-medium mb-2">Quick Actions</h4>
                <Link to="/new-deck" className="w-full btn-primary text-xs py-2 text-center block">Generate New Deck</Link>
             </div>
           )}
           <div className="p-4 rounded-lg border border-dashed border-white_20">
              <span className="text-xs text-gray-500">Select an item to view its properties</span>
           </div>
        </div>
      </div>
      
    </div>
  );
}
