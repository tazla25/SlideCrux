import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 glass-panel border-l-0 border-y-0 rounded-none p-6 flex flex-col z-50">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 rounded-lg bg-blue-600 neon-glow"></div>
        <h1 className="text-xl font-bold tracking-tight text-white">SlideCrux</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        <Link to="/dashboard" className={`flex items-center px-4 py-3 rounded-xl transition-colors ${path === '/dashboard' ? 'bg-white/5 text-blue-400 border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Dashboard</Link>
        <Link to="/new-deck" className={`flex items-center px-4 py-3 rounded-xl transition-colors ${path === '/new-deck' ? 'bg-white/5 text-blue-400 border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>New Deck</Link>
        <Link to="/brand-kits" className={`flex items-center px-4 py-3 rounded-xl transition-colors ${path === '/brand-kits' ? 'bg-white/5 text-blue-400 border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Brand Kits</Link>
      </nav>
      
      <div className="mt-auto">
        <Link to="/settings" className={`flex items-center px-4 py-3 rounded-xl transition-colors ${path === '/settings' ? 'bg-white/5 text-blue-400 border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>Settings</Link>
      </div>
    </aside>
  );
}
