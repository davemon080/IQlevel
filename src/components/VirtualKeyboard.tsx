import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Delete, ArrowUp, Globe, Mic, Smile, Search, CornerDownLeft, X } from 'lucide-react';

interface VirtualKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  onSpace: () => void;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  isOpen,
  onClose,
  onKeyPress,
  onBackspace,
  onEnter,
  onSpace
}) => {
  const [layout, setLayout] = useState<'default' | 'numbers' | 'symbols'>('default');
  const [isCaps, setIsCaps] = useState(false);

  const rows = {
    default: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
      ['123', 'space', 'enter']
    ],
    numbers: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
      ['#+=', '.', ',', '?', '!', "'", 'backspace'],
      ['ABC', 'space', 'enter']
    ],
    symbols: [
      ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
      ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'],
      ['123', '.', ',', '?', '!', "'", 'backspace'],
      ['ABC', 'space', 'enter']
    ]
  };

  const handleKeyClick = (key: string) => {
    if (key === 'shift') {
      setIsCaps(!isCaps);
    } else if (key === 'backspace') {
      onBackspace();
    } else if (key === 'enter') {
      onEnter();
    } else if (key === 'space') {
      onSpace();
    } else if (key === '123') {
      setLayout('numbers');
    } else if (key === 'ABC') {
      setLayout('default');
    } else if (key === '#+=') {
      setLayout('symbols');
    } else {
      onKeyPress(isCaps ? key.toUpperCase() : key);
      // Auto-lowercase after one key if not in a special mode
      if (isCaps) setIsCaps(false);
    }
  };

  const renderKey = (key: string, index: number) => {
    let content: React.ReactNode = isCaps && key.length === 1 ? key.toUpperCase() : key;
    let className = "flex-1 h-12 m-1 rounded-lg flex items-center justify-center text-sm font-medium transition-all active:scale-95 ";
    
    if (key === 'shift') {
      content = <ArrowUp size={18} className={isCaps ? "text-teal-600" : "text-gray-600"} />;
      className += isCaps ? "bg-teal-50 border border-teal-200" : "bg-gray-100";
    } else if (key === 'backspace') {
      content = <Delete size={18} />;
      className += "bg-gray-200 w-12 flex-none";
    } else if (key === 'enter') {
      content = "Send";
      className += "bg-teal-600 text-white w-20 flex-none font-bold text-xs uppercase tracking-wider";
    } else if (key === 'space') {
      content = "space";
      className += "bg-white shadow-sm border border-gray-100 flex-[4]";
    } else if (key === '123' || key === 'ABC' || key === '#+=') {
      content = key;
      className += "bg-gray-200 w-12 flex-none text-xs";
    } else {
      className += "bg-white shadow-sm border border-gray-100 text-gray-800 text-base";
    }

    return (
      <button
        key={`${key}-${index}`}
        onClick={() => handleKeyClick(key)}
        className={className}
      >
        {content}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 bg-gray-300 p-2 pb-8 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] select-none"
          style={{ touchAction: 'none' }}
        >
          <div className="flex justify-between items-center px-2 mb-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Connect Keyboard</span>
            <button onClick={onClose} className="p-1 hover:bg-gray-400 rounded-full transition-all">
              <X size={16} className="text-gray-600" />
            </button>
          </div>
          
          <div className="max-w-md mx-auto">
            {rows[layout].map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center">
                {row.map((key, keyIndex) => renderKey(key, keyIndex))}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VirtualKeyboard;
