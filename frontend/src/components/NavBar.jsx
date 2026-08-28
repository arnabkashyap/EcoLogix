import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  Sliders,
  TrendingDown,
  MapPin,
  Zap,
  Layers,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'impact-summary', label: 'Impact Summary', icon: BarChart3 },
  { id: 'route-optimizer', label: 'Route Optimizer', icon: Sliders },
  { id: 'pareto-chart', label: 'Best Route Options', icon: TrendingDown },
  { id: 'map-view', label: 'Route Map', icon: MapPin },
  { id: 'ev-comparison', label: 'EV Comparison', icon: Zap },
  { id: 'load-pool', label: 'Combine Shipments', icon: Layers },
];

export function NavBar() {
  const [activeSection, setActiveSection] = useState('impact-summary');
  const activeTabRef = useRef(null);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -40% 0px',
      threshold: [0, 0.2, 0.5, 0.8],
    };

    const visibleEntries = new Map();

    const handleIntersect = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleEntries.set(entry.target.id, entry.intersectionRatio);
        } else {
          visibleEntries.delete(entry.target.id);
        }
      });

      if (visibleEntries.size > 0) {
        let maxRatio = -1;
        let bestId = '';
        visibleEntries.forEach((ratio, id) => {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            bestId = id;
          }
        });
        if (bestId) {
          setActiveSection(bestId);
        }
      }
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    NAV_ITEMS.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Scroll active tab into view horizontally inside mobile nav bar
  useEffect(() => {
    if (activeTabRef.current && typeof activeTabRef.current.scrollIntoView === 'function') {
      try {
        activeTabRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      } catch (err) {
        // Fallback for older browsers
        try {
          activeTabRef.current.scrollIntoView(false);
        } catch (e) {}
      }
    }
  }, [activeSection]);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="sticky top-[57px] z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 py-2 px-4 shadow-lg transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-start md:justify-center overflow-x-auto no-scrollbar space-x-2 py-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => scrollToSection(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
