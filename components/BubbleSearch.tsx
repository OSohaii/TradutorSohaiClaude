import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSessionStore } from '../store';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  imageId: string;
  fileName: string;
  bubbleId: string;
  originalText: string;
  translatedText: string;
  matchField: 'original' | 'translated';
}

interface BubbleSearchProps {
  onClose: () => void;
  onNavigate: (imageId: string) => void;
}

const BubbleSearch: React.FC<BubbleSearchProps> = ({ onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const history = useSessionStore(s => s.history);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    for (const img of history) {
      for (const bubble of img.bubbles) {
        if (bubble.originalText.toLowerCase().includes(q)) {
          matches.push({
            imageId: img.id,
            fileName: img.fileName,
            bubbleId: bubble.id,
            originalText: bubble.originalText,
            translatedText: bubble.translatedText,
            matchField: 'original',
          });
        } else if (bubble.translatedText.toLowerCase().includes(q)) {
          matches.push({
            imageId: img.id,
            fileName: img.fileName,
            bubbleId: bubble.id,
            originalText: bubble.originalText,
            translatedText: bubble.translatedText,
            matchField: 'translated',
          });
        }
      }
    }

    return matches.slice(0, 50); // cap results
  }, [query, history]);

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.imageId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-2 p-3 border-b border-slate-800">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar texto nos baloes..."
            className="flex-1 bg-transparent text-slate-100 text-sm placeholder-slate-500 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className="p-4 text-center text-slate-500 text-sm">
              Nenhum resultado encontrado
            </div>
          )}
          {results.map((result, idx) => (
            <button
              key={`${result.imageId}-${result.bubbleId}-${idx}`}
              onClick={() => handleResultClick(result)}
              className="w-full p-3 text-left hover:bg-slate-800 border-b border-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                  {result.fileName}
                </span>
                <span className="text-[10px] text-slate-500">
                  {result.matchField === 'original' ? 'Original' : 'Traduzido'}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                {result.matchField === 'original' ? result.originalText : result.translatedText}
              </p>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="p-2 border-t border-slate-800 text-center">
          <span className="text-[10px] text-slate-500">
            Esc para fechar | Clique em um resultado para navegar
          </span>
        </div>
      </div>
    </div>
  );
};

export default BubbleSearch;
