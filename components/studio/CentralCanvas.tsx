import React from 'react';
import { ProcessedImage, TextBubble } from '../../types';
import MangaViewer from '../MangaViewer';
import type { FontOption } from '../MangaViewer';
import StudioToolbar from './StudioToolbar';

interface CentralCanvasProps {
  currentImage: ProcessedImage | null;
  history: ProcessedImage[];
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onBubbleUpdate: (bubble: TextBubble) => void;
  onBubbleDelete: (bubbleId: string) => void;
  onBubbleAdd: (bubble: TextBubble) => void;
  onImageUpdate: (img: ProcessedImage) => void;
  onRetryImage: (id: string) => void;
  onTranslateOnly: (id: string) => void;
  onCancelOcr: (id: string) => void;
  onGoToLibrary: () => void;
  onGoToReader: () => void;
  onOpenSettings: () => void;
  onTogglePagesPanel: () => void;
  onToggleRightPanel: () => void;
  pagesPanelOpen: boolean;
  rightPanelOpen: boolean;
  hasDonePages: boolean;
  targetFont: string;
  targetBold: boolean;
  targetItalic: boolean;
  globalBubbleScale: number;
  customFonts: FontOption[];
}

const CentralCanvas: React.FC<CentralCanvasProps> = ({
  currentImage,
  history,
  currentIndex,
  onNext,
  onPrev,
  onBubbleUpdate,
  onBubbleDelete,
  onBubbleAdd,
  onImageUpdate,
  onRetryImage,
  onTranslateOnly,
  onCancelOcr,
  onGoToLibrary,
  onGoToReader,
  onOpenSettings,
  onTogglePagesPanel,
  onToggleRightPanel,
  pagesPanelOpen,
  rightPanelOpen,
  hasDonePages,
  targetFont,
  targetBold,
  targetItalic,
  globalBubbleScale,
  customFonts,
}) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      {/* Toolbar */}
      <StudioToolbar
        currentImage={currentImage}
        onGoToLibrary={onGoToLibrary}
        onGoToReader={onGoToReader}
        onOpenSettings={onOpenSettings}
        onTogglePagesPanel={onTogglePagesPanel}
        onToggleRightPanel={onToggleRightPanel}
        pagesPanelOpen={pagesPanelOpen}
        rightPanelOpen={rightPanelOpen}
        hasDonePages={hasDonePages}
      />

      {/* Viewer */}
      <div className="flex-1 overflow-hidden relative">
        {!currentImage ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="text-2xl opacity-50">🎨</span>
              </div>
              <p className="text-sm text-slate-500">Selecione uma pagina ou faca upload de imagens</p>
            </div>
          </div>
        ) : (
          <MangaViewer
            image={currentImage}
            onNext={currentIndex < history.length - 1 ? onNext : undefined}
            onPrev={currentIndex > 0 ? onPrev : undefined}
            onBubbleUpdate={onBubbleUpdate}
            onBubbleDelete={onBubbleDelete}
            onBubbleAdd={onBubbleAdd}
            onImageUpdate={onImageUpdate}
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
            currentPageIndex={currentIndex}
          />
        )}
      </div>
    </div>
  );
};

export default CentralCanvas;
