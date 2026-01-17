import React, { useState } from 'react';
import { Question, UserAnswer } from '../types';

interface QuizProps {
  questions: Question[];
  onComplete: (answers: UserAnswer[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (idx: number, e: React.MouseEvent) => {
    // Stop propagation to prevent ad scripts on the document/window from seeing this click
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    
    if (selectedOption !== null) return;
    
    setSelectedOption(idx);
    
    setTimeout(() => {
      const timeSpent = (Date.now() - startTime) / 1000;
      const isCorrect = idx === currentQuestion.correctAnswerIndex;
      
      const newAnswer: UserAnswer = {
        questionId: currentQuestion.id,
        selectedOption: idx,
        isCorrect,
        timeSpent
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
        setStartTime(Date.now());
      } else {
        onComplete(updatedAnswers);
      }
    }, 300);
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    /* 
       The click handler here prevents any clicks within the quiz from bubbling 
       up to the document level where the ad script is listening. 
    */
    <div 
      className="max-w-xl w-full space-y-8 animate-in fade-in zoom-in duration-300"
      onClick={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                Matrix {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {currentQuestion.category}
            </span>
        </div>
        <div className="bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div 
                className="bg-indigo-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
      </div>

      <div className="glass p-10 md:p-14 rounded-[3rem] space-y-10 shadow-2xl border-white/5 relative overflow-hidden">
        <h2 className="text-3xl font-bold text-white leading-tight text-center">
          {currentQuestion.question}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              disabled={selectedOption !== null}
              onClick={(e) => handleOptionClick(idx, e)}
              className={`w-full py-5 px-8 text-center rounded-2xl border-2 transition-all duration-200 relative overflow-hidden ${
                selectedOption === idx 
                  ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                  : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="text-lg font-bold">{option}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="text-center opacity-30 hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
            NeuroQuant Diagnostic Interface
        </span>
      </div>
    </div>
  );
};

export default Quiz;