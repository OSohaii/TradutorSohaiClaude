import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useTranslatePipeline } from './features/translator/useTranslatePipeline';
import ToastContainer from './components/ui/Toast';
import IchigoSettingsModal from './features/settings/IchigoSettingsModal';
import ToriiSettingsModal from './features/settings/ToriiSettingsModal';
import DeepLSettingsModal from './features/settings/DeepLSettingsModal';
import GeminiSettingsModal from './features/settings/GeminiSettingsModal';
import OpenAISettingsModal from './features/settings/OpenAISettingsModal';
import FontManagerModal from './features/settings/FontManagerModal';
import SettingsPanel from './features/settings/SettingsPanel';
import OnboardingModal from './components/OnboardingModal';
import LibraryManager from './components/LibraryManager';
import LibraryPage from './pages/LibraryPage';
import StudioPage from './pages/StudioPage';
import ReaderPage from './pages/ReaderPage';
import {
  useFontsStore,
  useSessionStore,
  useLibraryStore,
  useViewStore,
} from './store';
import { ProcessedImage } from './types';
import { DEFAULT_FONT_VALUE } from './components/MangaViewer';
import { useTranslatorStore } from './store';

const App: React.FC = () => {
  const currentView = useViewStore(s => s.currentView);
  const goToStudio = useViewStore(s => s.goToStudio);
  const history = useSessionStore(s => s.history);
  const replaceSessionHistory = useSessionStore(s => s.replaceHistory);

  // Global effects: font registration
  const registerLoadedFonts = useFontsStore(s => s.registerLoadedFonts);
  useEffect(() => { void registerLoadedFonts(); }, [registerLoadedFonts]);

  // Legacy migration
  const runLegacyImagesMigration = useLibraryStore(s => s.runLegacyImagesMigration);
  useEffect(() => { void runLegacyImagesMigration(); }, [runLegacyImagesMigration]);

  // Seed font default
  const targetFont = useTranslatorStore(s => s.targetFont);
  const setTargetFont = useTranslatorStore(s => s.setTargetFont);
  useEffect(() => { if (!targetFont) setTargetFont(DEFAULT_FONT_VALUE); }, [targetFont, setTargetFont]);

  // Settings modal states
  const [showIchigoSettings, setShowIchigoSettings] = useState(false);
  const [showToriiSettings, setShowToriiSettings] = useState(false);
  const [showDeepLSettings, setShowDeepLSettings] = useState(false);
  const [showGeminiSettings, setShowGeminiSettings] = useState(false);
  const [showOpenAISettings, setShowOpenAISettings] = useState(false);
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Drag & Drop state (using WINDOW listeners only - NOT React events on div)
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);
  const dragCounter = useRef(0);

  // Translation pipeline
  const onAuthError = useCallback((modal: 'ichigo' | 'torii' | 'deepl' | 'gemini' | 'openai') => {
    switch (modal) {
      case 'ichigo': setShowIchigoSettings(true); break;
      case 'torii': setShowToriiSettings(true); break;
      case 'deepl': setShowDeepLSettings(true); break;
      case 'gemini': setShowGeminiSettings(true); break;
      case 'openai': setShowOpenAISettings(true); break;
    }
  }, []);

  const { handleFilesSelect: pipelineFilesSelect, handleRetranslate, handleTranslateImage, handleTranslateOnly, handleCancelOcr, retryImage } = useTranslatePipeline({ onAuthError });

  const handleFilesSelect = useCallback(async (files: File[]) => {
    const started = await pipelineFilesSelect(files);
    if (started) goToStudio();
  }, [pipelineFilesSelect, goToStudio]);

  // Global drag & drop via window event listeners (CRITICAL: not on root div)
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter.current++;
        setIsDragOverWindow(true);
      }
    };
    const handleDragOver = (e: DragEvent) => { e.preventDefault(); };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragOverWindow(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOverWindow(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        void handleFilesSelect(Array.from(e.dataTransfer.files));
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleFilesSelect]);

  // Ctrl+F bubble search handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Allow default browser search
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Library load handler
  const handleLoadFromLibrary = (images: ProcessedImage[]) => {
    replaceSessionHistory(images);
    setShowLibrary(false);
    goToStudio();
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Global Drag & Drop Overlay */}
      {isDragOverWindow && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="border-2 border-dashed border-indigo-400 rounded-2xl p-12 flex flex-col items-center gap-4 animate-drag-pulse">
            <ArrowUpTrayIcon className="w-16 h-16 text-indigo-400" />
            <p className="text-xl font-bold text-white">Solte aqui para traduzir</p>
            <p className="text-sm text-slate-400">Arraste imagens de manga para iniciar</p>
          </div>
        </div>
      )}

      {/* View Router */}
      <div className="flex-1 h-full overflow-hidden">
        {currentView === 'library' && (
          <LibraryPage
            onFilesSelect={handleFilesSelect}
            onOpenSettings={() => setShowSettingsPanel(true)}
          />
        )}
        {currentView === 'studio' && (
          <StudioPage
            onOpenSettings={() => setShowSettingsPanel(true)}
            onOpenIchigo={() => setShowIchigoSettings(true)}
            onOpenTorii={() => setShowToriiSettings(true)}
            onOpenDeepL={() => setShowDeepLSettings(true)}
            onOpenGemini={() => setShowGeminiSettings(true)}
            onOpenOpenAI={() => setShowOpenAISettings(true)}
            onOpenFonts={() => setShowFontSettings(true)}
            onRetranslate={() => { void handleRetranslate(); }}
            onTranslateImage={(id) => { void handleTranslateImage(id); }}
            onTranslateOnly={(id) => { void handleTranslateOnly(id); }}
            onCancelOcr={handleCancelOcr}
            onRetryImage={(id) => { void retryImage(id); }}
          />
        )}
        {currentView === 'reader' && <ReaderPage />}
      </div>

      {/* Global Modals */}
      <FontManagerModal isOpen={showFontSettings} onClose={() => setShowFontSettings(false)} />
      <IchigoSettingsModal isOpen={showIchigoSettings} onClose={() => setShowIchigoSettings(false)} />
      <ToriiSettingsModal isOpen={showToriiSettings} onClose={() => setShowToriiSettings(false)} />
      <DeepLSettingsModal isOpen={showDeepLSettings} onClose={() => setShowDeepLSettings(false)} />
      <GeminiSettingsModal isOpen={showGeminiSettings} onClose={() => setShowGeminiSettings(false)} />
      <OpenAISettingsModal isOpen={showOpenAISettings} onClose={() => setShowOpenAISettings(false)} />
      <SettingsPanel isOpen={showSettingsPanel} onClose={() => setShowSettingsPanel(false)} onOpenIchigoLogin={() => setShowIchigoSettings(true)} />
      <LibraryManager isOpen={showLibrary} onClose={() => setShowLibrary(false)} currentHistory={history} onLoadChapter={handleLoadFromLibrary} />
      <ToastContainer />
      <OnboardingModal forceOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </div>
  );
};

export default App;
