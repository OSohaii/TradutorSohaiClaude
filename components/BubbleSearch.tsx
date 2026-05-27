import React, { useState, useRef, useEffect } from 'react';
import { ProcessedImage } from '../types';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  imageId: string;
  fileName: string;
  bubbleId: string;
  matchedText: string;
  field: 'original' | 'translated';
}

interface BubbleSearchProps {
  isOpen: boolean;
  onClose: () => void;
  history: ProcessedImage[];
  onNavigate: (imageId: string, bubbleId: string) => void;
}

const BubbleSearch: React.FC<BubbleSearchProps> = ({ isOpen, onClose, history, onNavigate }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const found: SearchResult[] = [];

    for (const image of history) {
      for (const bubble of image.bubbles) {
        if (bubble.originalText.toLowerCase().includes(lowerQuery)) {
          found.push({
            imageId: image.id,
            fileName: image.fileName,
            bubbleId: bubble.id,
            matchedText: bubble.originalText,
            field: 'original',
          });
        }
        if (bubble.translatedText.toLowerCase().includes(lowerQuery)) {
          found.push({
            imageId: image.id,
            fileName: image.fileName,
            bubbleId: bubble.id,
            matchedText: bubble.translatedText,
            field: 'translated',
          });
        }
      }
    }

    setResults(found.slice(0, 50)); // Limit results
  }, [query, history]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] w-80 max-h-[70vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Search Header */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-800">
        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nos baloes..."
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {query.trim() && results.length === 0 && (
          <div className="p-4 text-center text-slate-500 text-sm">
            Nenhum resultado encontrado
          </div>
        )}
        {results.map((result, idx) => (
          <button
            key={`${result.bubbleId}-${result.field}-${idx}`}
            onClick={() => {
              onNavigate(result.imageId, result.bubbleId);
              onClose();
            }}
            className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 flex-shrink-0">
                {result.field === 'original' ? 'JP' : 'TR'}
              </span>
              <span className="text-xs text-indigo-400 truncate">{result.fileName}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {result.matchedText}
            </p>
          </button>
        ))}
      </div>

      {/* Footer */}
      {results.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-800 text-[10px] text-slate-500">
          {results.length} resultado{results.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default BubbleSearch;
