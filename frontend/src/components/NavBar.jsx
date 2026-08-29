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
  { id: 'route-optimizer', label: 'Route Optimizer', icon: Sliders },
  { id: 'map-view', label: 'Route Map', icon: MapPin },
  { id: 'pareto-chart', label: 'Best Route Options', icon: TrendingDown },
  { id: 'ev-comparison', label: 'EV Comparison', icon: Zap },
  { id: 'load-pool', label: 'Combine Shipments', icon: Layers },
  { id: 'impact-summary', label: 'Impact Summary', icon: BarChart3 },
];

export function NavBar() {
  const [activeSection, setActiveSection] = useState('route-optimizer');
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#181A20]/95 backdrop-blur-xl border-t border-slate-800/80 py-2.5 px-3 md:px-6 shadow-[0_-4px_25px_rgba(0,0,0,0.6)] transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-start md:justify-center overflow-x-auto no-scrollbar space-x-2 py-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => scrollToSection(item.id)}
              className={`px-3 py-1.5 md:px-3.5 md:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)] font-bold scale-[1.02]'
                  : 'bg-[#111827]/90 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:bg-[#1F2937]/90'
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
