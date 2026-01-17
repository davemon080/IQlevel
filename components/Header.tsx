
import React from 'react';

interface HeaderProps {
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header className="py-8 flex justify-center">
      <div 
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={onReset}
      >
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:scale-110 transition-all duration-300">
          <i className="fas fa-brain text-white text-lg"></i>
        </div>
        <span className="text-2xl font-black tracking-tight text-white">
          Neuro<span className="text-indigo-400">Quant</span>
        </span>
      </div>
    </header>
  );
};

export default Header;
