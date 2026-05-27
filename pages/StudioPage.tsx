import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useSessionStore, useTranslatorStore, useFontsStore, useViewStore } from '../store';
import { useStudioStore } from '../store/useStudioStore';
import { ProcessedImage, TextBubble } from '../types';
import LeftSidebar from '../components/studio/LeftSidebar';
import PagesPanel from '../components/studio/PagesPanel';
import CentralCanvas from '../components/studio/CentralCanvas';
import RightPanel from '../components/studio/RightPanel';

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
  onOpenIchigo,
  onOpenTorii,
  onOpenDeepL,
  onOpenGemini,
  onOpenOpenAI,
  onOpenFonts,
  onRetranslate,
  onTranslateImage,
  onTranslateOnly,
  onCancelOcr,
  onRetryImage,
}) => {
  // Session state
  const currentImage = useSessionStore(s => s.currentImage);
  const history = useSessionStore(s => s.history);
  const setCurrentImage = useSessionStore(s => s.setCurrentImage);
  const updateBubbleInStore = useSessionStore(s => s.updateBubble);
  const removeBubbleInStore = useSessionStore(s => s.removeBubble);
  const addBubbleInStore = useSessionStore(s => s.addBubble);
  const updateImageStateInStore = useSessionStore(s => s.updateImageState);
  const bubbleHistory = useSessionStore(s => s.bubbleHistory);

  // Translator state
  const targetFont = useTranslatorStore(s => s.targetFont);
  const targetBold = useTranslatorStore(s => s.targetBold);
  const targetItalic = useTranslatorStore(s => s.targetItalic);
  const globalBubbleScale = useTranslatorStore(s => s.globalBubbleScale);
  const customFonts = useFontsStore(s => s.customFonts);

  // View navigation
  const goToLibrary = useViewStore(s => s.goToLibrary);
  const goToReader = useViewStore(s => s.goToReader);

  // Studio panel state
  const leftSidebarOpen = useStudioStore(s => s.leftSidebarOpen);
  const pagesPanelOpen = useStudioStore(s => s.pagesPanelOpen);
  const rightPanelOpen = useStudioStore(s => s.rightPanelOpen);
  const togglePagesPanel = useStudioStore(s => s.togglePagesPanel);
  const toggleRightPanel = useStudioStore(s => s.toggleRightPanel);

  // Computed
  const getCurrentIndex = () => history.findIndex(img => img.id === currentImage?.id);
  const currentIndex = getCurrentIndex();
  const hasDonePages = history.some(img => img.status === 'done');
  const currentBubbleHistory = currentImage ? bubbleHistory[currentImage.id] ?? null : null;

  // Handlers
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

  return (
    <div className="flex h-full bg-[#0a0a0f] text-slate-100 overflow-hidden">
      {/* Left Sidebar - Icon Rail */}
      <AnimatePresence>
        {leftSidebarOpen && (
          <LeftSidebar
            onGoToLibrary={goToLibrary}
            onOpenSettings={onOpenSettings}
            projectName={currentImage?.fileName}
          />
        )}
      </AnimatePresence>

      {/* Pages Panel */}
      <AnimatePresence>
        {pagesPanelOpen && (
          <PagesPanel
            history={history}
            currentImageId={currentImage?.id ?? null}
            onSelectImage={setCurrentImage}
            onClose={togglePagesPanel}
          />
        )}
      </AnimatePresence>

      {/* Central Canvas */}
      <CentralCanvas
        currentImage={currentImage}
        history={history}
        currentIndex={currentIndex}
        onNext={handleNext}
        onPrev={handlePrev}
        onBubbleUpdate={handleBubbleUpdate}
        onBubbleDelete={handleBubbleDelete}
        onBubbleAdd={handleBubbleAdd}
        onImageUpdate={handleImageUpdate}
        onRetryImage={onRetryImage}
        onTranslateOnly={onTranslateOnly}
        onCancelOcr={onCancelOcr}
        onRetranslate={onRetranslate}
        onTranslateImage={onTranslateImage}
        onGoToLibrary={goToLibrary}
        onGoToReader={goToReader}
        onOpenSettings={onOpenSettings}
        onOpenFonts={onOpenFonts}
        onTogglePagesPanel={togglePagesPanel}
        onToggleRightPanel={toggleRightPanel}
        pagesPanelOpen={pagesPanelOpen}
        rightPanelOpen={rightPanelOpen}
        hasDonePages={hasDonePages}
        targetFont={targetFont}
        targetBold={targetBold}
        targetItalic={targetItalic}
        globalBubbleScale={globalBubbleScale}
        customFonts={customFonts}
      />

      {/* Right Panel */}
      <AnimatePresence>
        {rightPanelOpen && (
          <RightPanel
            bubbles={currentImage?.bubbles ?? []}
            onClose={toggleRightPanel}
            undoHistory={currentBubbleHistory}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudioPage;
