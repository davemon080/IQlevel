
import React from 'react';

interface LandingProps {
  onStart: () => void;
  error: string | null;
}

const Landing: React.FC<LandingProps> = ({ onStart, error }) => {
  return (
    <div className="max-w-4xl w-full mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full glass border-white/5 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
          <i className="fas fa-bolt-lightning"></i>
          <span>Instant Cognitive Profile</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
          Evaluate Your<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500 animate-text-gradient bg-[length:200%_auto]">
            Neural Quotient
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
          A professional-grade, 20-question IQ assessment designed to measure abstract reasoning and logical speed.
        </p>

        <div className="pt-6 flex flex-col items-center space-y-4">
          <button
            onClick={onStart}
            className="group relative inline-flex items-center space-x-4 px-12 py-5 bg-white text-slate-950 rounded-2xl text-xl font-black transition-all hover:bg-indigo-500 hover:text-white active:scale-95 shadow-2xl shadow-white/5"
          >
            <span>Start Test</span>
            <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform"></i>
          </button>
          <div className="flex items-center space-x-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <span>20 Questions</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
            <span>Local Processing</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
            <span>~8 Minutes</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-10">
        {[
          { icon: 'fa-brain', title: 'Logic', desc: 'Abstract deduction' },
          { icon: 'fa-arrow-trend-up', title: 'Speed', desc: 'Latency analysis' },
          { icon: 'fa-dna', title: 'Pattern', desc: 'Visual recognition' }
        ].map((f, i) => (
          <div key={i} className="glass p-6 rounded-3xl border-white/5 flex flex-col items-center text-center space-y-2 group hover:bg-white/5 transition-all">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <i className={`fas ${f.icon}`}></i>
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">{f.title}</h3>
            <p className="text-xs text-slate-500 font-medium">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Landing;
