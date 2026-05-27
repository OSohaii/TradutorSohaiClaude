import React, { useState, useMemo } from 'react';
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import MangaViewer, { AVAILABLE_FONTS, FontGroup, FontOption } from '../components/MangaViewer';
import { useSessionStore, useTranslatorStore, useFontsStore, useViewStore } from '../store';
import { ProcessedImage, TextBubble } from '../types';

interface StudioPageProps {
  onOpenSettings: () => void;
  onOpenIchigo: () => void;
  onOpenTorii: () => void;
  onOpenDeepL: () => void;
  onOpenGemini: () => void;
  onOpenOpenAI: () => void;
  onOpenFonts: () => void;
  onRetranslate: () => void;
  onTranslateImage: (id: string) => void;
  onTranslateOnly: (id: string) => void;
  onCancelOcr: (id: string) => void;
  onRetryImage: (id: string) => void;
}

const StudioPage: React.FC<StudioPageProps> = ({
  onOpenSettings,
  onRetranslate,
  onTranslateImage,
  onTranslateOnly,
  onCancelOcr,
  onRetryImage,
}) => {
  const currentImage = useSessionStore(s => s.currentImage);
  const history = useSessionStore(s => s.history);
  const setCurrentImage = useSessionStore(s => s.setCurrentImage);
  const updateBubbleInStore = useSessionStore(s => s.updateBubble);
  const removeBubbleInStore = useSessionStore(s => s.removeBubble);
  const addBubbleInStore = useSessionStore(s => s.addBubble);
  const updateImageStateInStore = useSessionStore(s => s.updateImageState);

  const targetFont = useTranslatorStore(s => s.targetFont);
  const targetBold = useTranslatorStore(s => s.targetBold);
  const targetItalic = useTranslatorStore(s => s.targetItalic);
  const globalBubbleScale = useTranslatorStore(s => s.globalBubbleScale);
  const customFonts = useFontsStore(s => s.customFonts);

  const goToLibrary = useViewStore(s => s.goToLibrary);
  const goToReader = useViewStore(s => s.goToReader);

  const [showThumbnails, setShowThumbnails] = useState(true);

  const getCurrentIndex = () => history.findIndex(img => img.id === currentImage?.id);

  const handleNext = () => {
    const idx = getCurrentIndex();
    if (idx !== -1 && idx < history.length - 1) setCurrentImage(history[idx + 1]);
  };

  const handlePrev = () => {
    const idx = getCurrentIndex();
    if (idx > 0) setCurrentImage(history[idx - 1]);
  };

  const handleBubbleUpdate = (bubble: TextBubble) => updateBubbleInStore(bubble);
  const handleBubbleDelete = (bubbleId: string) => removeBubbleInStore(bubbleId);
  const handleBubbleAdd = (bubble: TextBubble) => addBubbleInStore(bubble);
  const handleImageUpdate = (img: ProcessedImage) => updateImageStateInStore(img.id, img);

  const hasDonePages = history.some(img => img.status === 'done');

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Left Panel - Thumbnails */}
      {showThumbnails && (
        <aside className="hidden md:flex flex-col w-48 lg:w-56 border-r border-slate-800 bg-slate-900/80">
          <div className="p-2 border-b border-slate-800 text-xs font-medium text-slate-400 text-center">
            Paginas ({history.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 auto-rows-min">
            {history.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setCurrentImage(img)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                  currentImage?.id === img.id
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <img src={img.imageUrl} alt={img.fileName} className="w-full aspect-[3/4] object-cover" loading="lazy" />
                {/* Status indicator */}
                <div className="absolute top-1 right-1">
                  {img.status === 'done' && (
                    <div className="bg-green-500 rounded-full p-0.5"><CheckIcon className="w-2.5 h-2.5 text-white" /></div>
                  )}
                  {img.status === 'processing' && (
                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {img.status === 'idle' && (
                    <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {img.status === 'ocr-done' && (
                    <EyeIcon className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  {img.status === 'error' && (
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-400" />
                  )}
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-center py-0.5 text-slate-300">
                  {idx + 1}
                </div>
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* Center - Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-12 flex items-center justify-between px-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={goToLibrary} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Voltar">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-200 truncate max-w-[200px]">
              {currentImage?.fileName || 'Studio'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasDonePages && (
              <button
                onClick={goToReader}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <BookOpenIcon className="w-4 h-4" />
                Ler
              </button>
            )}
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Thumbnails"
            >
              <ChevronLeftIcon className={`w-4 h-4 transition-transform ${showThumbnails ? '' : 'rotate-180'}`} />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Configuracoes"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Viewer */}
        <div className="flex-1 overflow-hidden relative">
          {!currentImage ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              <p className="text-sm">Selecione uma pagina ou faca upload de imagens</p>
            </div>
          ) : (
            <MangaViewer
              image={currentImage}
              onNext={getCurrentIndex() < history.length - 1 ? handleNext : undefined}
              onPrev={getCurrentIndex() > 0 ? handlePrev : undefined}
              onBubbleUpdate={handleBubbleUpdate}
              onBubbleDelete={handleBubbleDelete}
              onBubbleAdd={handleBubbleAdd}
              onImageUpdate={handleImageUpdate}
              onRetry={() => onRetryImage(currentImage.id)}
              onConfirmTranslate={() => onTranslateOnly(currentImage.id)}
              onCancelOcr={() => onCancelOcr(currentImage.id)}
              showOriginalText={currentImage.status === 'ocr-done'}
              defaultFont={targetFont}
              globalBold={targetBold}
              globalItalic={targetItalic}
              globalBubbleScale={globalBubbleScale}
              customFonts={customFonts}
              totalPages={history.length}
              currentPageIndex={getCurrentIndex()}
            />
          )}
        </div>

        {/* Bottom Bar - Navigation */}
        <footer className="h-10 flex items-center justify-between px-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md flex-shrink-0">
          <button
            onClick={handlePrev}
            disabled={getCurrentIndex() <= 0}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-xs text-slate-400">
            {history.length > 0 ? `${getCurrentIndex() + 1} / ${history.length}` : '0 / 0'}
          </span>
          <button
            onClick={handleNext}
            disabled={getCurrentIndex() >= history.length - 1}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </footer>
      </div>
    </div>
  );
};

export default StudioPage;
