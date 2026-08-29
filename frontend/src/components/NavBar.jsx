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
    <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto liquid-glass-dock rounded-full px-2.5 py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar max-w-full">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'liquid-glass-item-active text-emerald-200 font-extrabold scale-[1.03]'
                  : 'liquid-glass-item-inactive text-slate-300 hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
