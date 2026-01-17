import React, { useState, useEffect } from 'react';
import { AppState, Question, UserAnswer, IQResult } from './types';
import { LOCAL_QUESTIONS } from './data/questions';
import { calculateIQLocally } from './services/iqService';
import Landing from './components/Landing';
import Quiz from './components/Quiz';
import Results from './components/Results';
import Header from './components/Header';

// Fisher-Yates Shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('landing');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [result, setResult] = useState<IQResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharedMeta, setSharedMeta] = useState<{ correctCount: number; totalCount: number } | null>(null);

  // Manage Ad Script visibility based on application state
  useEffect(() => {
    const isAdPage = state === 'landing' || state === 'results';
    const AD_SCRIPT_URL = 'https://quge5.com/88/tag.min.js';
    const SCRIPT_ID = 'monetag-ad-script';

    if (isAdPage) {
      if (!document.getElementById(SCRIPT_ID)) {
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = AD_SCRIPT_URL;
        script.setAttribute('data-zone', '202824');
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        document.head.appendChild(script);
      }
    } else {
      const existingScript = document.getElementById(SCRIPT_ID);
      if (existingScript) {
        existingScript.remove();
        // Best effort cleanup of any global elements created by the script
        const generatedElements = document.querySelectorAll('iframe[src*="monetag"], div[class*="monetag"]');
        generatedElements.forEach(el => el.remove());
      }
    }
  }, [state]);

  // Check for shared result on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('share');
    if (sharedData) {
      try {
        // Base64 decode with Unicode support
        const jsonStr = decodeURIComponent(atob(sharedData).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const decoded = JSON.parse(jsonStr);
        setResult(decoded);
        setSharedMeta({
          correctCount: decoded.correctCount || 0,
          totalCount: decoded.totalCount || 20
        });
        setState('results');
      } catch (e) {
        console.error("Invalid share link", e);
        // Clear invalid params
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const startQuiz = () => {
    setState('loading_questions');
    setError(null);
    
    // Clear URL if starting fresh
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    setTimeout(() => {
      const shuffledQuestions = shuffleArray(LOCAL_QUESTIONS);
      setQuestions(shuffledQuestions);
      setAnswers([]);
      setSharedMeta(null);
      setState('quiz');
    }, 600);
  };

  const completeQuiz = (userAnswers: UserAnswer[]) => {
    setAnswers(userAnswers);
    setState('analyzing');
    
    setTimeout(() => {
      const res = calculateIQLocally(questions, userAnswers);
      setResult(res);
      setState('results');
    }, 1200);
  };

  const reset = () => {
    setState('landing');
    setQuestions([]);
    setAnswers([]);
    setResult(null);
    setSharedMeta(null);
    // Clear URL on reset
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200 selection:bg-indigo-500/30">
      <Header onReset={reset} />
      
      <main className="flex-grow flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-4xl transition-all duration-500 ease-in-out">
          {state === 'landing' && (
            <Landing onStart={startQuiz} error={error} />
          )}

          {state === 'loading_questions' && (
            <div className="flex flex-col items-center justify-center space-y-6 py-20 animate-in fade-in duration-500">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute top-0 w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-xl font-bold text-indigo-400 tracking-widest uppercase">Initializing Neural Core</h2>
            </div>
          )}

          {state === 'quiz' && (
            <div className="flex justify-center">
              <Quiz questions={questions} onComplete={completeQuiz} />
            </div>
          )}

          {state === 'analyzing' && (
            <div className="flex flex-col items-center justify-center space-y-8 py-20">
              <div className="relative w-24 h-24 flex items-center justify-center">
                 <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                 <i className="fas fa-microchip text-4xl text-indigo-400 animate-pulse"></i>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white">Synthesizing Profile</h2>
                <p className="text-slate-500 font-medium">Quantifying cognitive parameters...</p>
              </div>
            </div>
          )}

          {state === 'results' && result && (
            <div className="flex justify-center">
              <Results 
                result={result} 
                answers={answers} 
                questions={questions} 
                onRetry={reset}
                sharedMeta={sharedMeta}
              />
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 text-center text-slate-600 text-[10px] uppercase tracking-[0.2em] font-bold opacity-50">
        NeuroQuant &bull; Precise Local Intelligence Assessment &bull; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default App;
