import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useSessionStore } from '../store';
import { useViewStore } from '../store/useViewStore';
import { useSwipeNavigation } from '../features/viewer/useSwipeNavigation';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const ReaderPage: React.FC = () => {
  const history = useSessionStore(s => s.history);
  const goToStudio = useViewStore(s => s.goToStudio);

  const doneImages = useMemo(() => history.filter(i => i.status === 'done'), [history]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNext = useCallback(() => {
    setCurrentIdx(prev => Math.min(prev + 1, doneImages.length - 1));
  }, [doneImages.length]);

  const handlePrev = useCallback(() => {
    setCurrentIdx(prev => Math.max(prev - 1, 0));
  }, []);

  useSwipeNavigation({
    containerRef,
    onNext: handleNext,
    onPrev: handlePrev,
    enabled: true,
  });

  const handleTapZone = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) handlePrev();
    else if (x > third * 2) handleNext();
    else setShowOverlay(prev => !prev);
  };

  const currentPage = doneImages[currentIdx];

  if (doneImages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black text-white">
        <p className="text-slate-400 mb-4">Nenhuma pagina traduzida disponivel</p>
        <button onClick={() => goToStudio()} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm">
          Voltar ao Studio
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full bg-black relative select-none" onClick={handleTapZone}>
      {/* Page image */}
      <div className="h-full w-full flex items-center justify-center">
        {currentPage?.translatedImageUrl ? (
          <img src={currentPage.translatedImageUrl} className="max-h-full max-w-full object-contain" draggable={false} />
        ) : currentPage?.imageUrl ? (
          <img src={currentPage.imageUrl} className="max-h-full max-w-full object-contain" draggable={false} />
        ) : null}
      </div>

      {/* Minimal overlay */}
      {showOverlay && (
        <div className="absolute inset-x-0 top-0 bg-black/70 backdrop-blur-sm p-3 flex items-center justify-between z-10" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => goToStudio()} className="p-2 text-white hover:bg-white/10 rounded-lg">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-white text-sm font-medium">
            {currentIdx + 1} / {doneImages.length}
          </span>
          <div className="flex gap-2">
            <button onClick={handlePrev} disabled={currentIdx <= 0} className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30">
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button onClick={handleNext} disabled={currentIdx >= doneImages.length - 1} className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-30">
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReaderPage;
