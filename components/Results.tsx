
import React, { useEffect, useRef, useState } from 'react';
import { IQResult, UserAnswer, Question } from '../types';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';

interface ResultsProps {
  result: IQResult;
  answers: UserAnswer[];
  questions: Question[];
  onRetry: () => void;
  sharedMeta?: { correctCount: number; totalCount: number } | null;
}

const Results: React.FC<ResultsProps> = ({ result, onRetry, answers, questions, sharedMeta }) => {
  const resultRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  // Use shared metadata if viewing a shared link, otherwise calculate from current session
  const correctCount = sharedMeta ? sharedMeta.correctCount : answers.filter(a => a.isCorrect).length;
  const totalCount = sharedMeta ? sharedMeta.totalCount : questions.length;

  useEffect(() => {
    // Trigger celebration
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#a855f7', '#ffffff']
    });
  }, []);

  const downloadImage = async () => {
    if (!resultRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(resultRef.current, {
        cacheBust: true,
        backgroundColor: '#020617',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `neuroquant-iq-${result.score}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    } finally {
      setIsExporting(false);
    }
  };

  const shareResult = async () => {
    const dataToShare = {
      ...result,
      correctCount,
      totalCount
    };

    try {
      // Encode to Base64 with Unicode support
      const jsonStr = JSON.stringify(dataToShare);
      const encoded = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, function(match, p1) {
          return String.fromCharCode(parseInt(p1, 16));
      }));
      
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
      
      const shareData = {
        title: 'NeuroQuant IQ Result',
        text: `I scored an IQ of ${result.score} on the NeuroQuant assessment! Check out my profile here:`,
        url: shareUrl,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Error sharing', err);
      setShareStatus('error');
    }
  };

  return (
    <div className="max-w-3xl w-full space-y-8 animate-in zoom-in duration-500">
      <div 
        ref={resultRef}
        id="results-card"
        className="glass p-10 rounded-[3rem] text-center space-y-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl"></div>

        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
            <i className={`fas ${sharedMeta ? 'fa-link' : 'fa-certificate'}`}></i>
            <span>{sharedMeta ? 'Shared Results' : 'Verified Score'}</span>
          </div>
          
          <div className="relative inline-block">
             <div className="text-[10rem] font-black text-white leading-none tracking-tighter">
                {result.score}
             </div>
             <div className="absolute -top-4 -right-8 px-3 py-1 bg-indigo-600 rounded-lg text-xs font-bold shadow-lg">
                IQ
             </div>
          </div>
          
          <div className="flex justify-center space-x-12 pt-2">
            <div>
                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">Correct</p>
                <p className="text-2xl font-bold text-white">{correctCount} / {totalCount}</p>
            </div>
            <div>
                <p className="text-slate-500 text-xs uppercase font-bold tracking-widest">Percentile</p>
                <p className="text-2xl font-bold text-white">{result.percentile}%</p>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-800 w-full"></div>

        <div className="space-y-4 text-left px-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <i className="fas fa-fingerprint mr-3 text-indigo-500"></i>
            Cognitive Profile
          </h3>
          <p className="text-slate-300 leading-relaxed text-lg italic">
            "{result.analysis}"
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
               <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Strongest Domains</h4>
               <div className="space-y-2">
                  {Object.entries(result.categoryScores || {})
                    .sort((a,b) => b[1] - a[1])
                    .slice(0, 2)
                    .map(([cat, val]) => (
                    <div key={cat} className="flex justify-between items-center">
                        <span className="text-sm text-slate-300">{cat}</span>
                        <span className="text-sm font-bold text-indigo-400">{val}%</span>
                    </div>
                  ))}
               </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
               <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Career Affinity</h4>
               <div className="flex flex-wrap gap-2">
                  {(result.recommendedCareers || []).map(c => (
                    <span key={c} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded-md border border-indigo-500/30">
                        {c}
                    </span>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={onRetry}
          className="w-full py-5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
        >
          <i className="fas fa-rotate-left mr-2"></i> {sharedMeta ? 'Take My Test' : 'Retake'}
        </button>
        <button
          onClick={downloadImage}
          disabled={isExporting}
          className="w-full py-5 glass border-white/10 text-white hover:bg-white/10 rounded-2xl font-bold text-lg transition-all flex items-center justify-center disabled:opacity-50"
        >
          <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-download'} mr-2`}></i> 
          {isExporting ? 'Saving...' : 'Save PNG'}
        </button>
        <button
          onClick={shareResult}
          className={`w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center border-2 ${
            shareStatus === 'copied' 
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
              : 'glass border-white/10 text-white hover:bg-white/10'
          }`}
        >
          <i className={`fas ${shareStatus === 'copied' ? 'fa-check' : 'fa-share-nodes'} mr-2`}></i> 
          {shareStatus === 'copied' ? 'Link Copied' : 'Share Result'}
        </button>
      </div>
      
      <p className="text-center text-slate-500 text-xs px-8 leading-relaxed">
        NeuroQuant scores are calculated using standard deviation models where 100 represents the median. 
        Higher scores reflect superior abstract reasoning and pattern identification speeds.
      </p>
    </div>
  );
};

export default Results;
