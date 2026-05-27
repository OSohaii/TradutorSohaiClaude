import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useSessionStore, useViewStore } from '../store';
import { useSwipeNavigation } from '../features/viewer/useSwipeNavigation';

const ReaderPage: React.FC = () => {
  const history = useSessionStore(s => s.history);
  const goToStudio = useViewStore(s => s.goToStudio);

  const donePages = useMemo(() => history.filter(img => img.status === 'done'), [history]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNext = useCallback(() => {
    setCurrentIndex(i => Math.min(i + 1, donePages.length - 1));
  }, [donePages.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0));
  }, []);

  useSwipeNavigation({
    containerRef,
    onNext: handleNext,
    onPrev: handlePrev,
    enabled: donePages.length > 0,
  });

  const handleTapZone = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;

    if (x < third) {
      handlePrev();
    } else if (x > third * 2) {
      handleNext();
    } else {
      setShowOverlay(prev => !prev);
    }
  };

  if (donePages.length === 0) {
    return (
      <div className="h-full bg-black flex flex-col items-center justify-center text-white gap-4">
        <p className="text-slate-400 text-sm">Nenhuma pagina traduzida para leitura.</p>
        <button
          onClick={() => goToStudio()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          Voltar ao Studio
        </button>
      </div>
    );
  }

  const currentPage = donePages[currentIndex];
  const displayUrl = currentPage?.translatedImageUrl || currentPage?.imageUrl;

  return (
    <div
      ref={containerRef}
      className="h-full bg-black flex flex-col items-center justify-center relative select-none"
      onClick={handleTapZone}
    >
      {/* Page Image */}
      <img
        src={displayUrl}
        alt={currentPage?.fileName}
        className="max-h-full max-w-full object-contain"
        draggable={false}
      />

      {/* Overlay */}
      {showOverlay && (
        <div
          className="absolute top-0 inset-x-0 bg-black/70 backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => goToStudio()}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-white font-medium">
            {currentIndex + 1} / {donePages.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors disabled:opacity-30"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex >= donePages.length - 1}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors disabled:opacity-30"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReaderPage;
