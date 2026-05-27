import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ProcessedImage, TextBubble } from '../types';
import MangaViewer, { AVAILABLE_FONTS, DEFAULT_FONT_VALUE, FontGroup } from '../components/MangaViewer';
import Uploader from '../components/Uploader';
import BatchProgressBar from '../components/ui/BatchProgressBar';
import Toggle from '../components/ui/Toggle';
import { useTranslatePipeline } from '../features/translator/useTranslatePipeline';
import { estimateCost } from '../features/translator/costEstimation';
import { exportAsPDF, exportAsZIP, ExportRenderParams } from '../features/viewer/exportService';
import { useViewStore } from '../store/useViewStore';
import {
  useAuthStore, useTranslatorStore, useFontsStore, useSessionStore, EngineId,
} from '../store';
import {
  ArrowLeftIcon, TrashIcon, XMarkIcon, ChatBubbleLeftRightIcon,
  SparklesIcon, LanguageIcon, Bars3Icon,
  ListBulletIcon, BoldIcon, ItalicIcon,
  MinusCircleIcon, PlusCircleIcon, ViewfinderCircleIcon, PlayIcon,
  ArrowPathIcon, EyeIcon, CheckIcon, XCircleIcon,
  ChevronLeftIcon, ChevronRightIcon, ClockIcon, ExclamationTriangleIcon,
  BookOpenIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface StudioPageProps {
  onOpenSettings: () => void;
  onOpenIchigo: () => void;
  onOpenTorii: () => void;
  onOpenDeepL: () => void;
  onOpenGemini: () => void;
  onOpenOpenAI: () => void;
  onOpenFonts: () => void;
}

const StudioPage: React.FC<StudioPageProps> = ({
  onOpenSettings, onOpenIchigo, onOpenTorii, onOpenDeepL, onOpenGemini, onOpenOpenAI, onOpenFonts,
}) => {
  const currentImage = useSessionStore(s => s.currentImage);
  const history = useSessionStore(s => s.history);
  const setCurrentImageInStore = useSessionStore(s => s.setCurrentImage);
  const removeImageFromSession = useSessionStore(s => s.removeImage);
  const updateImageStateInStore = useSessionStore(s => s.updateImageState);
  const updateBubbleInStore = useSessionStore(s => s.updateBubble);
  const removeBubbleInStore = useSessionStore(s => s.removeBubble);
  const addBubbleInStore = useSessionStore(s => s.addBubble);
  const goToLibrary = useViewStore(s => s.goToLibrary);
  const goToReader = useViewStore(s => s.goToReader);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [readingMode, setReadingMode] = useState<'single' | 'strip'>('single');
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  const ocrEngine = useTranslatorStore(s => s.ocrEngine);
  const setOcrEngine = useTranslatorStore(s => s.setOcrEngine);
  const transEngine = useTranslatorStore(s => s.transEngine);
  const setTransEngine = useTranslatorStore(s => s.setTransEngine);
  const sourceLanguage = useTranslatorStore(s => s.sourceLanguage);
  const setSourceLanguage = useTranslatorStore(s => s.setSourceLanguage);
  const targetLanguage = useTranslatorStore(s => s.targetLanguage);
  const setTargetLanguage = useTranslatorStore(s => s.setTargetLanguage);
  const setTargetLangCode = useTranslatorStore(s => s.setTargetLangCode);
  const targetFont = useTranslatorStore(s => s.targetFont);
  const setTargetFont = useTranslatorStore(s => s.setTargetFont);
  const targetBold = useTranslatorStore(s => s.targetBold);
  const setTargetBold = useTranslatorStore(s => s.setTargetBold);
  const targetItalic = useTranslatorStore(s => s.targetItalic);
  const setTargetItalic = useTranslatorStore(s => s.setTargetItalic);
  const globalBubbleScale = useTranslatorStore(s => s.globalBubbleScale);
  const setGlobalBubbleScale = useTranslatorStore(s => s.setGlobalBubbleScale);
  const useToriiForCleaning = useTranslatorStore(s => s.useToriiForCleaning);
  const setUseToriiForCleaning = useTranslatorStore(s => s.setUseToriiForCleaning);
  const autoTranslate = useTranslatorStore(s => s.autoTranslate);
  const setAutoTranslate = useTranslatorStore(s => s.setAutoTranslate);
  const toriiApiKey = useAuthStore(s => s.toriiApiKey);
  const customFonts = useFontsStore(s => s.customFonts);

  useEffect(() => { if (!targetFont) setTargetFont(DEFAULT_FONT_VALUE); }, [targetFont, setTargetFont]);

  const onAuthError = useCallback((modal: 'ichigo' | 'torii' | 'deepl' | 'gemini' | 'openai') => {
    switch (modal) {
      case 'ichigo': onOpenIchigo(); break;
      case 'torii': onOpenTorii(); break;
      case 'deepl': onOpenDeepL(); break;
      case 'gemini': onOpenGemini(); break;
      case 'openai': onOpenOpenAI(); break;
    }
  }, [onOpenIchigo, onOpenTorii, onOpenDeepL, onOpenGemini, onOpenOpenAI]);

  const { handleTranslateImage, handleTranslateAll, handleTranslateOnly, handleCancelOcr, retryImage, totalCost, displayedTotalTokens } = useTranslatePipeline({ onAuthError });

  const availableFontsForSelector = useMemo(() => {
    if (customFonts.length === 0) return AVAILABLE_FONTS;
    const customGroup: FontGroup = { group: 'Fontes Personalizadas', type: 'group', options: customFonts };
    return [customGroup, ...AVAILABLE_FONTS];
  }, [customFonts]);

  const getExportParams = useCallback((): ExportRenderParams => ({
    defaultFont: targetFont, globalBold: targetBold, globalItalic: targetItalic,
    globalBubbleScale, isBubbleTransparent: false, showTextStroke: false, calculatedFontSizes: {},
  }), [targetFont, targetBold, targetItalic, globalBubbleScale]);

  const doneImages = useMemo(() => history.filter(i => i.status === 'done'), [history]);
  const handleExportPDF = useCallback(() => { void exportAsPDF(doneImages, getExportParams()); }, [doneImages, getExportParams]);
  const handleExportZIP = useCallback(() => { void exportAsZIP(doneImages, getExportParams()); }, [doneImages, getExportParams]);

  const getCurrentIndex = () => history.findIndex(img => img.id === currentImage?.id);
  const handleNext = () => { const idx = getCurrentIndex(); if (idx !== -1 && idx < history.length - 1) setCurrentImageInStore(history[idx + 1]); };
  const handlePrev = () => { const idx = getCurrentIndex(); if (idx > 0) setCurrentImageInStore(history[idx - 1]); };

  const handleBubbleUpdate = (bubble: TextBubble) => updateBubbleInStore(bubble);
  const handleBubbleDelete = (bubbleId: string) => removeBubbleInStore(bubbleId);
  const handleBubbleAdd = (bubble: TextBubble) => addBubbleInStore(bubble);
  const handleImageUpdate = (img: ProcessedImage) => updateImageStateInStore(img.id, img);

  const handleSidebarItemClick = (item: ProcessedImage, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setSelectedPages(prev => { const n = new Set(prev); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; });
      return;
    }
    setCurrentImageInStore(item);
    setIsSidebarOpen(false);
  };

  const handleTranslateSelected = () => { selectedPages.forEach(id => { void handleTranslateImage(id); }); setSelectedPages(new Set()); };
  const handleDeleteSelected = () => { selectedPages.forEach(id => { removeImageFromSession(id); }); setSelectedPages(new Set()); };
  const isFullOcr = ocrEngine === 'GEMINI_PRO_FULL' || ocrEngine === 'GEMINI_FLASH_FULL' || ocrEngine === 'GEMINI_3_FLASH_FULL' || ocrEngine === 'GEMINI_35_FLASH_FULL';

  return (<div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden relative">
    {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
    {/* LEFT PANEL */}
    <aside className={`fixed md:relative z-50 h-full w-[80vw] md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">Paginas ({history.length})</span>
        <div className="flex gap-1">
          {history.some(i => i.status === 'idle') && <button onClick={() => void handleTranslateAll()} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded-md flex items-center gap-0.5"><PlayIcon className="w-3 h-3"/>Todas</button>}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-400"><XMarkIcon className="w-5 h-5"/></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 content-start">
        {history.map((item, idx) => (
          <div key={item.id} onClick={(e) => handleSidebarItemClick(item, e)} className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedPages.has(item.id) ? 'border-violet-500' : currentImage?.id === item.id ? 'border-indigo-500' : 'border-transparent hover:border-slate-600'}`}>
            <div className="aspect-[3/4] bg-slate-800"><img src={item.imageUrl} className="w-full h-full object-cover" loading="lazy" /></div>
            <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] ${item.status === 'done' ? 'bg-green-500' : item.status === 'processing' ? 'bg-blue-500 animate-pulse' : item.status === 'error' ? 'bg-red-500' : item.status === 'ocr-done' ? 'bg-amber-500' : 'bg-slate-600'}`}>
              {item.status === 'done' && <CheckIcon className="w-2.5 h-2.5"/>}{item.status === 'error' && '!'}{(item.status === 'idle' || item.status === 'processing') && (idx+1)}
            </div>
            {selectedPages.has(item.id) && <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center"><CheckIcon className="w-6 h-6 text-violet-200"/></div>}
          </div>
        ))}
      </div>
      {selectedPages.size > 0 && (
        <div className="p-2 border-t border-slate-800 flex gap-1">
          <button onClick={handleTranslateSelected} className="flex-1 py-1.5 bg-indigo-600 text-white text-[10px] rounded-md">Traduzir</button>
          <button onClick={handleDeleteSelected} className="flex-1 py-1.5 bg-red-600 text-white text-[10px] rounded-md">Deletar</button>
          <button onClick={() => setSelectedPages(new Set())} className="p-1.5 text-slate-400"><XMarkIcon className="w-4 h-4"/></button>
        </div>
      )}
    </aside>
    {/* CENTER */}
    <main className="flex-1 flex flex-col overflow-hidden">
      <header className="h-12 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1.5 text-slate-300"><Bars3Icon className="w-5 h-5"/></button>
          <button onClick={goToLibrary} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800" title="Voltar"><ArrowLeftIcon className="w-4 h-4"/></button>
          <span className="text-sm font-medium text-slate-200 truncate max-w-[150px]">{currentImage?.fileName || 'Studio'}</span>
        </div>
        <div className="flex items-center gap-2">
          {doneImages.length > 0 && <button onClick={goToReader} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-md flex items-center gap-1"><BookOpenIcon className="w-3.5 h-3.5"/>Ler</button>}
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"><Cog6ToothIcon className="w-4 h-4"/></button>
        </div>
      </header>
      <BatchProgressBar />
      <div className="flex-1 overflow-hidden relative">
        {!currentImage ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">Tradutor de Manga</h2>
            <p className="text-slate-400 mb-6 text-sm">Selecione seus arquivos ou cole uma URL</p>
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
            onToggleStrip={() => setReadingMode(readingMode === 'single' ? 'strip' : 'single')}
            onToggleCleanMode={() => setIsCleanMode(prev => !prev)}
            isCleanMode={isCleanMode}
            showOriginalText={currentImage?.status === 'ocr-done'}
            onConfirmTranslate={() => void handleTranslateOnly(currentImage!.id)}
            onCancelOcr={() => handleCancelOcr(currentImage!.id)}
            defaultFont={targetFont}
            globalBold={targetBold}
            globalItalic={targetItalic}
            globalBubbleScale={globalBubbleScale}
            customFonts={customFonts}
            onRetry={() => retryImage(currentImage!.id)}
            totalPages={history.length}
            currentPageIndex={getCurrentIndex()}
            costLabel={!autoTranslate ? `~$${estimateCost(ocrEngine as EngineId, transEngine as EngineId, 1).toFixed(3)}` : undefined}
          />
        )}
      </div>
      {currentImage && (
        <div className="h-10 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4 shrink-0">
          <button onClick={handlePrev} disabled={getCurrentIndex() <= 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ChevronLeftIcon className="w-5 h-5"/></button>
          <span className="text-xs text-slate-400">{getCurrentIndex() + 1} / {history.length}</span>
          <button onClick={handleNext} disabled={getCurrentIndex() >= history.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30"><ChevronRightIcon className="w-5 h-5"/></button>
        </div>
      )}
    </main>
    {/* RIGHT PANEL */}
    {rightPanelOpen && (<>
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setRightPanelOpen(false)} />
      <aside className="fixed right-0 top-0 h-full w-[85vw] md:w-72 md:relative z-50 bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between"><span className="text-sm font-semibold text-slate-200">Configuracoes</span><button onClick={() => setRightPanelOpen(false)} className="p-1 text-slate-400"><XMarkIcon className="w-5 h-5"/></button></div>
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center text-xs"><span className="text-slate-400 flex items-center gap-1.5"><ViewfinderCircleIcon className="w-3.5 h-3.5"/> OCR</span><select value={ocrEngine} onChange={(e) => setOcrEngine(e.target.value as EngineId)} className="bg-slate-800 text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 border-none max-w-[140px]"><option value="GEMINI_FLASH">Gemini 2.5 Flash</option><option value="GEMINI_FLASH_FULL">Gemini 2.5 Flash (Full)</option><option value="GEMINI_35_FLASH">Gemini 3.5 Flash</option><option value="GEMINI_35_FLASH_FULL">Gemini 3.5 Flash (Full)</option><option value="GEMINI_3_FLASH">Gemini 3 Flash</option><option value="GEMINI_3_FLASH_FULL">Gemini 3 Flash (Full)</option><option value="GEMINI_PRO">Gemini 3.1 Pro</option><option value="GEMINI_PRO_FULL">Gemini 3.1 Pro (Full)</option><option value="GPT4O">GPT-4o</option><option value="GPT4O_MINI">GPT-4o Mini</option><option value="ICHIGO">Ichigo</option><option value="TORII">Torii (Full)</option></select></div>
          <div className={`flex justify-between items-center text-xs ${isFullOcr ? 'opacity-40 pointer-events-none' : ''}`}><span className="text-slate-400 flex items-center gap-1.5"><ChatBubbleLeftRightIcon className="w-3.5 h-3.5"/> Tradutor</span><select value={transEngine} onChange={(e) => setTransEngine(e.target.value as EngineId)} className="bg-slate-800 text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 border-none max-w-[140px]" disabled={isFullOcr}>{isFullOcr ? <option>Integrado (Full)</option> : <><option value="GEMINI_35_FLASH">Gemini 3.5 Flash</option><option value="GEMINI_PRO">Gemini 3.1 Pro</option><option value="GEMINI_FLASH">Gemini 2.5 Flash</option><option value="GPT4O">GPT-4o</option><option value="GPT4O_MINI">GPT-4o Mini</option><option value="DEEPL">DeepL</option><option value="GOOGLE">Google</option><option value="TORII">Torii</option></>}</select></div>
          <div className="flex justify-between items-center text-xs"><span className="text-slate-400 flex items-center gap-1.5"><LanguageIcon className="w-3.5 h-3.5"/> Origem</span><select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)} className="bg-slate-800 text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 border-none max-w-[140px]"><option value="Japanese">Japanese</option><option value="Korean">Korean</option><option value="Chinese (Simplified)">Chinese (Simplified)</option><option value="Chinese (Traditional)">Chinese (Traditional)</option><option value="English">English</option><option value="Spanish">Spanish</option><option value="French">French</option></select></div>
          <div className="flex justify-between items-center text-xs"><span className="text-slate-400 flex items-center gap-1.5"><LanguageIcon className="w-3.5 h-3.5"/> Alvo</span><select value={targetLanguage} onChange={(e) => { const v=e.target.value; setTargetLanguage(v); const m:Record<string,string>={'Portugues (Brasil)':'pt-BR','English':'en','Spanish':'es','French':'fr','Japanese':'ja','Korean':'ko'}; setTargetLangCode(m[v]||'pt-BR'); }} className="bg-slate-800 text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 border-none max-w-[140px]"><option value="Portugues (Brasil)">Portugues (Brasil)</option><option value="English">English</option><option value="Spanish">Spanish</option><option value="French">French</option><option value="Japanese">Japanese</option><option value="Korean">Korean</option></select></div>
          <div className="flex justify-between items-center text-xs"><span className="text-slate-400 flex items-center gap-1.5"><ListBulletIcon className="w-3.5 h-3.5"/> Fonte</span><div className="flex items-center gap-2"><select value={targetFont} onChange={(e) => setTargetFont(e.target.value)} className="bg-slate-800 text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 border-none max-w-[100px]">{availableFontsForSelector.map((font, idx) => { if ('group' in font) return (<optgroup key={idx} label={font.group}>{font.options.map((opt, si) => <option key={`${idx}-${si}`} value={opt.value}>{opt.name}</option>)}</optgroup>); return <option key={idx} value={font.value}>{font.name}</option>; })}</select><div className="flex bg-slate-800 rounded-md border border-slate-700 p-0.5"><button onClick={() => setTargetBold(!targetBold)} className={`p-1 rounded ${targetBold ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><BoldIcon className="w-3.5 h-3.5"/></button><button onClick={() => setTargetItalic(!targetItalic)} className={`p-1 rounded ${targetItalic ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><ItalicIcon className="w-3.5 h-3.5"/></button></div></div></div>
          <div className="space-y-1"><div className="flex justify-between text-[10px] text-slate-400"><span>Tamanho dos Baloes</span><span>{Math.round(globalBubbleScale*100)}%</span></div><div className="flex items-center gap-2"><button onClick={() => setGlobalBubbleScale(Math.max(0.5,globalBubbleScale-0.1))} className="text-slate-500 hover:text-white"><MinusCircleIcon className="w-4 h-4"/></button><input type="range" min="0.5" max="1.5" step="0.05" value={globalBubbleScale} onChange={(e) => setGlobalBubbleScale(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"/><button onClick={() => setGlobalBubbleScale(Math.min(1.5,globalBubbleScale+0.1))} className="text-slate-500 hover:text-white"><PlusCircleIcon className="w-4 h-4"/></button></div></div>
          {ocrEngine !== 'TORII' && transEngine !== 'TORII' && (<div className="pt-2 border-t border-slate-800"><Toggle label={<span className="flex items-center gap-1.5"><SparklesIcon className={`w-3.5 h-3.5 ${useToriiForCleaning ? 'text-pink-400' : 'text-slate-500'}`}/>Limpar com Torii</span>} checked={useToriiForCleaning} onChange={() => { setUseToriiForCleaning(!useToriiForCleaning); if(!useToriiForCleaning && !toriiApiKey) onOpenTorii(); }} colorClass="bg-pink-600"/></div>)}
          <div className="pt-2 border-t border-slate-800"><Toggle label={<span className="flex items-center gap-1.5"><LanguageIcon className={`w-3.5 h-3.5 ${autoTranslate ? 'text-indigo-400' : 'text-slate-500'}`}/>Auto-traduzir</span>} checked={autoTranslate} onChange={() => setAutoTranslate(!autoTranslate)} colorClass="bg-indigo-600"/></div>
          {doneImages.length > 0 && (<div className="pt-2 border-t border-slate-800 flex gap-2"><button onClick={handleExportPDF} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg">PDF</button><button onClick={handleExportZIP} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg">ZIP</button></div>)}
          {displayedTotalTokens > 0 && (<div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500">Tokens: {displayedTotalTokens > 1000 ? `${(displayedTotalTokens/1000).toFixed(1)}k` : displayedTotalTokens} | ${totalCost.toFixed(4)}</div>)}
        </div>
      </aside>
    </>)}
  </div>);
};

export default StudioPage;
