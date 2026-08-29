import React from 'react';
import {
  SlidersHorizontal,
  MapPin,
  Zap,
  Layers,
  BarChart3,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'route-optimizer', label: 'Route Optimizer', icon: SlidersHorizontal },
  { id: 'map-view', label: 'Route Map', icon: MapPin },
  { id: 'ev-comparison', label: 'EV Comparison', icon: Zap },
  { id: 'load-pool', label: 'Combine Shipments', icon: Layers },
  { id: 'impact-summary', label: 'Impact Summary', icon: BarChart3 },
];

export function NavBar({ activeTab, onSelectTab }) {
  const handleTabClick = (id) => {
    if (onSelectTab) {
      onSelectTab(id);
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-[#121722]/95 backdrop-blur-2xl border border-slate-700/60 rounded-full px-2 py-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex items-center space-x-1.5 overflow-x-auto no-scrollbar max-w-full">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#0D4434] text-emerald-300 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
