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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/60 py-1.5 px-2 md:px-4 transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-around overflow-x-auto no-scrollbar gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => scrollToSection(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-[11px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
