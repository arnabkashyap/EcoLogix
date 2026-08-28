import React from 'react';
import { X, CheckCircle, Play, ShieldCheck, Leaf, ArrowRight } from 'lucide-react';

export function DemoGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-emerald-500/30 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Play className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">4-Minute Demo Script Guide</h3>
            <p className="text-xs text-slate-400">Follow these 6 exact steps to present to hackathon judges</p>
          </div>
        </div>

        <div className="space-y-3 mb-5 text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">1</div>
            <div>
              <div className="font-bold text-slate-200">Start on Company A (Northwind Logistics)</div>
              <div className="text-slate-400">Say: <em>"This is Northwind Logistics — dashboard is active for this tenant."</em></div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">2</div>
            <div>
              <div className="font-bold text-slate-200">Switch to Company B (Apex Freight)</div>
              <div className="text-slate-400">Say: <em>"And this is Apex Freight — totally separate fleets and shipments on the same platform."</em> (Multi-tenancy proof beat).</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">3</div>
            <div>
              <div className="font-bold text-slate-200">Click "Optimize Fleet Route"</div>
              <div className="text-slate-400">Say: <em>"This is a real multi-objective VRP solve running live right now, not a canned graphic."</em></div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">4</div>
            <div>
              <div className="font-bold text-slate-200">Show Map & CO₂ Saved Number</div>
              <div className="text-slate-400">Point out the solid emerald route vs dashed red baseline path and the <strong>-18% CO₂ Saved</strong> badge.</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">5</div>
            <div>
              <div className="font-bold text-slate-200">Move the α Slider</div>
              <div className="text-slate-400">Show the best route options curve move live from <strong>Min CO₂ (α=0)</strong> to <strong>Min Time (α=1)</strong>.</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">6</div>
            <div>
              <div className="font-bold text-slate-200">Trigger Cross-Company Combine Shipments Match</div>
              <div className="text-slate-400">Say: <em>"Northwind surfaces a matched empty leg from Apex Freight with CO₂/cost savings, but Apex's internal business remains private."</em></div>
            </div>
          </div>
        </div>

        {/* Closing Pitch Line */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center justify-between">
          <span>Closing Pitch Line:</span>
          <span className="italic">"EcoLogix cuts fleet CO₂ without cutting delivery speed!"</span>
        </div>
      </div>
    </div>
  );
}
