import React from 'react';

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen fixed left-0 top-0 glass-panel border-l-0 border-y-0 rounded-none p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 rounded-lg bg-blue-600 neon-glow"></div>
        <h1 className="text-xl font-bold tracking-tight text-white">SlideCrux</h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        <a href="/dashboard" className="flex items-center px-4 py-3 rounded-xl bg-white/5 text-blue-400 border border-white/5">Dashboard</a>
        <a href="/new-deck" className="flex items-center px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">New Deck</a>
        <a href="/brand-kits" className="flex items-center px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">Brand Kits</a>
      </nav>
      
      <div className="mt-auto">
        <a href="/settings" className="flex items-center px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">Settings</a>
      </div>
    </aside>
  );
}
