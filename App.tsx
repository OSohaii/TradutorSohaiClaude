import React, { useState, useEffect, useCallback } from 'react';
import { useSessionPersistence } from './features/session/useSessionPersistence';
import { useTranslatePipeline } from './features/translator/useTranslatePipeline';
import { useViewStore } from './store/useViewStore';
import {
  useLibraryStore,
  useFontsStore,
} from './store';
import LibraryPage from './pages/LibraryPage';
import StudioPage from './pages/StudioPage';
import ReaderPage from './pages/ReaderPage';
import BubbleSearch from './components/BubbleSearch';
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
import { useSessionStore } from './store';
import { ProcessedImage } from './types';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const currentView = useViewStore(s => s.currentView);
  const goToStudio = useViewStore(s => s.goToStudio);

  // Global effects
  const registerLoadedFonts = useFontsStore(s => s.registerLoadedFonts);
  const runLegacyImagesMigration = useLibraryStore(s => s.runLegacyImagesMigration);
  const history = useSessionStore(s => s.history);
  const setCurrentImageInStore = useSessionStore(s => s.setCurrentImage);
  const replaceSessionHistory = useSessionStore(s => s.replaceHistory);

  useEffect(() => { void registerLoadedFonts(); }, [registerLoadedFonts]);
  useEffect(() => { void runLegacyImagesMigration(); }, [runLegacyImagesMigration]);
  useSessionPersistence();

  // Modals
  const [showIchigoSettings, setShowIchigoSettings] = useState(false);
  const [showToriiSettings, setShowToriiSettings] = useState(false);
  const [showDeepLSettings, setShowDeepLSettings] = useState(false);
  const [showGeminiSettings, setShowGeminiSettings] = useState(false);
  const [showOpenAISettings, setShowOpenAISettings] = useState(false);
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showBubbleSearch, setShowBubbleSearch] = useState(false);
  const [isDragOverWindow, setIsDragOverWindow] = useState(false);

  // Pipeline for quick-translate from library page
  const onAuthError = useCallback((modal: 'ichigo' | 'torii' | 'deepl' | 'gemini' | 'openai') => {
    switch (modal) {
      case 'ichigo': setShowIchigoSettings(true); break;
      case 'torii': setShowToriiSettings(true); break;
      case 'deepl': setShowDeepLSettings(true); break;
      case 'gemini': setShowGeminiSettings(true); break;
      case 'openai': setShowOpenAISettings(true); break;
    }
  }, []);

  const { handleFilesSelect: pipelineFilesSelect } = useTranslatePipeline({ onAuthError });

  const handleFilesSelect = useCallback(async (files: File[]) => {
    setIsDragOverWindow(false);
    const started = await pipelineFilesSelect(files);
    if (started) goToStudio();
  }, [pipelineFilesSelect, goToStudio]);

  // Ctrl+F bubble search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowBubbleSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Global drag & drop
  useEffect(() => {
    let counter = 0;
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      if (e.relatedTarget) return;
      counter++;
      if (counter === 1) setIsDragOverWindow(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      counter--;
      if (counter <= 0) { counter = 0; setIsDragOverWindow(false); }
    };
    const onDrop = (e: DragEvent) => {
      counter = 0; setIsDragOverWindow(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        void handleFilesSelect(Array.from(e.dataTransfer.files));
      }
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [handleFilesSelect]);

  // Auto-dismiss drag overlay
  useEffect(() => {
    if (!isDragOverWindow) return;
    const t = setTimeout(() => setIsDragOverWindow(false), 3000);
    return () => clearTimeout(t);
  }, [isDragOverWindow]);

  const handleBubbleSearchNavigate = useCallback((imageId: string) => {
    const target = history.find(h => h.id === imageId);
    if (target) { setCurrentImageInStore(target); goToStudio(); }
  }, [history, setCurrentImageInStore, goToStudio]);

  const handleLoadFromLibrary = (images: ProcessedImage[]) => {
    replaceSessionHistory(images);
    goToStudio();
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Drag overlay */}
      {isDragOverWindow && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="border-2 border-dashed border-indigo-400 rounded-2xl p-12 flex flex-col items-center gap-4">
            <ArrowUpTrayIcon className="w-16 h-16 text-indigo-400" />
            <p className="text-xl font-bold text-white">Solte aqui para traduzir</p>
          </div>
        </div>
      )}

      {/* View router */}
      {currentView === 'library' && (
        <LibraryPage onFilesSelect={handleFilesSelect} onOpenSettings={() => setShowSettingsPanel(true)} />
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
        />
      )}
      {currentView === 'reader' && <ReaderPage />}

      {/* Global modals */}
      <BubbleSearch isOpen={showBubbleSearch} onClose={() => setShowBubbleSearch(false)} history={history} onNavigate={handleBubbleSearchNavigate} />
      <IchigoSettingsModal isOpen={showIchigoSettings} onClose={() => setShowIchigoSettings(false)} />
      <ToriiSettingsModal isOpen={showToriiSettings} onClose={() => setShowToriiSettings(false)} />
      <DeepLSettingsModal isOpen={showDeepLSettings} onClose={() => setShowDeepLSettings(false)} />
      <GeminiSettingsModal isOpen={showGeminiSettings} onClose={() => setShowGeminiSettings(false)} />
      <OpenAISettingsModal isOpen={showOpenAISettings} onClose={() => setShowOpenAISettings(false)} />
      <FontManagerModal isOpen={showFontSettings} onClose={() => setShowFontSettings(false)} />
      <SettingsPanel isOpen={showSettingsPanel} onClose={() => setShowSettingsPanel(false)} onOpenIchigoLogin={() => setShowIchigoSettings(true)} />
      <OnboardingModal forceOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
      <LibraryManager isOpen={showLibrary} onClose={() => setShowLibrary(false)} currentHistory={history} onLoadChapter={handleLoadFromLibrary} />
      <ToastContainer />
    </div>
  );
};

export default App;
