import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProcessedImage, TextBubble, ViewMode } from './types';
import MangaViewer, { AVAILABLE_FONTS, DEFAULT_FONT_VALUE, FontOption, FontGroup } from './components/MangaViewer';
import Uploader from './components/Uploader';
import LibraryManager from './components/LibraryManager';
import {
  ApiError,
  ByokKeys,
  EngineId as ApiEngineId,
  TokenUsage,
  ichigoLogin as ichigoLoginApi,
  runPipeline as runPipelineApi,
} from './services/api/pipelineApi';
import {
  useAuthStore,
  useTranslatorStore,
  useFontsStore,
  useSessionStore,
  StoredFont,
  EngineId,
} from './store';
import { 
  BookOpenIcon, 
  TrashIcon, 
  ListBulletIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  KeyIcon,
  ViewfinderCircleIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  LanguageIcon,
  ExclamationTriangleIcon,
  Bars3Icon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  DocumentDuplicateIcon,
  CpuChipIcon,
  FolderPlusIcon,
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  SwatchIcon,
  BoldIcon,
  ItalicIcon,
  CommandLineIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  CurrencyDollarIcon,
  BookmarkSquareIcon
} from '@heroicons/react/24/outline';

// Definition of available engines is now centralised in the store
// (`store/useTranslatorStore.ts`). The local `EngineType` declaration,
// `ENGINE_LABELS` and `GEMINI_MODELS` were dead code (no callers) and
// have been removed during the Phase-2a refactor.

const TORII_TRANSLATORS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Rápido)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Equilibrado)' },
  { id: 'google_translate', name: 'Google Translate (Básico)' },
  { id: 'gpt-4o', name: 'GPT-4o (Premium)' }
];

// `StoredFont` now lives in `store/useFontsStore.ts` and is re-exported
// from `./store`. The local interface that used to live here was a
// duplicate and has been removed.

const App: React.FC = () => {
  // ---- Session state (which images are loaded, which one is current) ----
  // Pre-Phase-2b these were two `useState`s and the mutations lived
  // inline as `setHistory(prev => ...)` / `setCurrentImage(...)` calls
  // scattered through every handler. Centralising in the store removes
  // the prop drilling and lets the viewer subscribe directly.
  const currentImage = useSessionStore(s => s.currentImage);
  const history = useSessionStore(s => s.history);
  const setCurrentImageInStore = useSessionStore(s => s.setCurrentImage);
  const addImagesToSession = useSessionStore(s => s.addImages);
  const removeImageFromSession = useSessionStore(s => s.removeImage);
  const replaceSessionHistory = useSessionStore(s => s.replaceHistory);
  const updateImageStateInStore = useSessionStore(s => s.updateImageState);
  const updateBubbleInStore = useSessionStore(s => s.updateBubble);
  const removeBubbleInStore = useSessionStore(s => s.removeBubble);
  const addBubbleInStore = useSessionStore(s => s.addBubble);

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Drawer
  const [readingMode, setReadingMode] = useState<'single' | 'strip'>('single'); // Single Page vs Long Strip
  const [isCleanMode, setIsCleanMode] = useState(false); // Fullscreen/Zen mode
  const [longPressTriggered, setLongPressTriggered] = useState(false);

  // --- Engine + viewer preferences (persisted via zustand) ---
  // Pre-Phase-2a these were 11 separate `useState`s + `useEffect`s
  // syncing each value into its own localStorage key. Now the store's
  // `persist` middleware does all of that declaratively.
  const ocrEngine = useTranslatorStore(s => s.ocrEngine);
  const setOcrEngine = useTranslatorStore(s => s.setOcrEngine);
  const transEngine = useTranslatorStore(s => s.transEngine);
  const setTransEngine = useTranslatorStore(s => s.setTransEngine);
  const ichigoModel = useTranslatorStore(s => s.ichigoModel);
  const setIchigoModel = useTranslatorStore(s => s.setIchigoModel);

  const targetFont = useTranslatorStore(s => s.targetFont);
  const setTargetFont = useTranslatorStore(s => s.setTargetFont);
  const targetBold = useTranslatorStore(s => s.targetBold);
  const setTargetBold = useTranslatorStore(s => s.setTargetBold);
  const targetItalic = useTranslatorStore(s => s.targetItalic);
  const setTargetItalic = useTranslatorStore(s => s.setTargetItalic);

  const globalBubbleScale = useTranslatorStore(s => s.globalBubbleScale);
  const setGlobalBubbleScale = useTranslatorStore(s => s.setGlobalBubbleScale);

  const toriiInternalTrans = useTranslatorStore(s => s.toriiInternalTrans);
  const setToriiInternalTrans = useTranslatorStore(s => s.setToriiInternalTrans);
  const toriiStrokeDisabled = useTranslatorStore(s => s.toriiStrokeDisabled);
  const setToriiStrokeDisabled = useTranslatorStore(s => s.setToriiStrokeDisabled);
  const toriiInpaintOnly = useTranslatorStore(s => s.toriiInpaintOnly);
  const setToriiInpaintOnly = useTranslatorStore(s => s.setToriiInpaintOnly);
  const useToriiForCleaning = useTranslatorStore(s => s.useToriiForCleaning);
  const setUseToriiForCleaning = useTranslatorStore(s => s.setUseToriiForCleaning);

  // Seed the font default on first run. The store can't import
  // `DEFAULT_FONT_VALUE` itself (it would pull the whole MangaViewer
  // bundle into the store layer), so we do it here once when the
  // persisted value is empty.
  useEffect(() => {
    if (!targetFont) setTargetFont(DEFAULT_FONT_VALUE);
  }, [targetFont, setTargetFont]);

  // --- Auth / BYOK keys (persisted via zustand) ---
  const ichigoEmail = useAuthStore(s => s.ichigoEmail);
  const setIchigoEmail = useAuthStore(s => s.setIchigoEmail);
  const ichigoToken = useAuthStore(s => s.ichigoToken);
  // The store also exposes an `ichigoRemember` flag and setter; the
  // current UI has no checkbox for it (default = true), so we don't
  // pull them in here. The flag is honored by the store's `partialize`.
  const loginIchigoStore = useAuthStore(s => s.loginIchigo);
  const logoutIchigoStore = useAuthStore(s => s.logoutIchigo);

  const toriiApiKey = useAuthStore(s => s.toriiApiKey);
  const setToriiApiKey = useAuthStore(s => s.setToriiApiKey);
  const toriiSaveKey = useAuthStore(s => s.toriiSaveKey);
  const setToriiSaveKey = useAuthStore(s => s.setToriiSaveKey);

  const geminiApiKey = useAuthStore(s => s.geminiApiKey);
  const setGeminiApiKey = useAuthStore(s => s.setGeminiApiKey);

  const deepLKey = useAuthStore(s => s.deepLKey);
  const setDeepLKey = useAuthStore(s => s.setDeepLKey);

  // --- Custom fonts (persisted via zustand) ---
  const customFonts = useFontsStore(s => s.customFonts);
  const isFontLoading = useFontsStore(s => s.isLoading);
  const addFont = useFontsStore(s => s.addFont);
  const removeFont = useFontsStore(s => s.removeFont);
  const setFontLoading = useFontsStore(s => s.setLoading);
  const registerLoadedFonts = useFontsStore(s => s.registerLoadedFonts);

  // Re-register every persisted FontFace with the browser exactly once
  // per page load. Without this the user would see the family names in
  // the selector but the rendered text would fall back to a system font.
  useEffect(() => {
    void registerLoadedFonts();
  }, [registerLoadedFonts]);

  // --- Session-only state (not persisted) ---
  const [ichigoPassword, setIchigoPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Token tracking is per-session (resets on reload) by design.
  const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 });
  const [totalCost, setTotalCost] = useState(0);

  // Settings Modals
  const [showIchigoSettings, setShowIchigoSettings] = useState(false);
  const [showToriiSettings, setShowToriiSettings] = useState(false);
  const [showDeepLSettings, setShowDeepLSettings] = useState(false);
  const [showGeminiSettings, setShowGeminiSettings] = useState(false);
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Font Manager UI State
  const [activeFontTab, setActiveFontTab] = useState<'custom' | 'library'>('custom');
  const [fontSearch, setFontSearch] = useState('');
  const [fontPreviewText, setFontPreviewText] = useState('The quick brown fox jumps over the lazy dog');

  // --- Token Calculation Logic ---
  // The BFF returns combined token usage in the pipeline response. This
  // accumulates the running total and estimates cost based on the model.
  const handleTokenUsage = (data: TokenUsage) => {
    setTotalTokens(prev => ({
      input: prev.input + data.input,
      output: prev.output + data.output
    }));

    // Cost calculation (Estimates based on current pricing tiers)
    // Flash: ~0.10/1M In, ~0.40/1M Out
    // Pro:   ~1.25/1M In, ~5.00/1M Out
    let costIn = 0;
    let costOut = 0;

    const model = (data.model || '').toLowerCase();
    if (model.includes('flash') || model.includes('lite')) {
       costIn = (data.input / 1000000) * 0.10;
       costOut = (data.output / 1000000) * 0.40;
    } else {
       // Pro pricing
       costIn = (data.input / 1000000) * 1.25;
       costOut = (data.output / 1000000) * 5.00;
    }

    setTotalCost(prev => prev + costIn + costOut);
  };

  // Derived state for display
  const displayedTotalTokens = totalTokens.input + totalTokens.output;

  // --- Long Press Logic for Clean Mode ---
  const timerRef = useRef<number | null>(null);

  const handleTouchStart = () => {
    timerRef.current = window.setTimeout(() => {
      setIsCleanMode(prev => !prev);
      setLongPressTriggered(true);
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600); // 600ms hold
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Reset trigger flag after a short delay so click events don't fire immediately if it was a long press
    setTimeout(() => setLongPressTriggered(false), 100);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result as string;
        // const base64Content = encoded.split(',')[1]; // We might need full data URI for fonts
        resolve(encoded);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleIchigoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const { accessToken } = await ichigoLoginApi(ichigoEmail, ichigoPassword);
      // The store honors the `ichigoRemember` flag at persist time, so
      // we don't need to manually toggle localStorage here.
      loginIchigoStore(ichigoEmail, accessToken);
      if (ocrEngine !== 'ICHIGO') setOcrEngine('ICHIGO');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Falha no login: verifique suas credenciais.';
      alert(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logoutIchigo = () => {
    logoutIchigoStore();
    if (ocrEngine === 'ICHIGO') setOcrEngine('GEMINI_FLASH');
  };

  // The three "save" handlers below used to imperatively push values
  // into localStorage. The store's `persist` middleware now handles
  // persistence transparently, so all these helpers do is close the
  // modal. Settings are already persisted as the user types.
  const saveToriiKey = () => {
    setShowToriiSettings(false);
  };

  const saveDeepLKey = () => {
    setShowDeepLSettings(false);
  };

  const saveGeminiKey = () => {
    setShowGeminiSettings(false);
  };

  // --- Font Management ---
  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setFontLoading(true);
    const file = e.target.files[0];
    const fontName = file.name.split('.')[0].replace(/[^a-zA-Z0-9 ]/g, ''); // Simple cleanup

    try {
      const base64Data = await fileToBase64(file);
      const newFont: StoredFont = {
        name: fontName,
        value: `"${fontName}", sans-serif`,
        data: base64Data,
      };
      // The store registers the FontFace with the browser, persists the
      // entry to localStorage, and surfaces a console warning if the
      // quota is exceeded.
      await addFont(newFont);
    } catch (err) {
      console.error('Erro ao carregar fonte:', err);
      alert('Arquivo de fonte inválido ou corrompido.');
    } finally {
      setFontLoading(false);
    }
  };

  const deleteCustomFont = (index: number) => {
    removeFont(index);
  };

  // Merge fonts for the selector
  const availableFontsForSelector = useMemo(() => {
    if (customFonts.length === 0) return AVAILABLE_FONTS;
    const customGroup: FontGroup = {
      group: 'Fontes Personalizadas',
      type: 'group',
      options: customFonts
    };
    return [customGroup, ...AVAILABLE_FONTS];
  }, [customFonts]);
  
  // Filter fonts preserving groups for better organization
  const filteredSystemFonts = useMemo(() => {
    if (!fontSearch) return AVAILABLE_FONTS;
    
    const search = fontSearch.toLowerCase();
    
    return AVAILABLE_FONTS.reduce<(FontOption | FontGroup)[]>((acc, item) => {
      if ('group' in item) {
        // Filter options within group
        const matchingOptions = item.options.filter(opt => opt.name.toLowerCase().includes(search));
        if (matchingOptions.length > 0) {
          acc.push({ ...item, options: matchingOptions });
        }
      } else {
        if (item.name.toLowerCase().includes(search)) {
          acc.push(item);
        }
      }
      return acc;
    }, []);
  }, [fontSearch]);

  const filteredCustomFonts = useMemo(() => {
    if (!fontSearch) return customFonts;
    return customFonts.filter(f => f.name.toLowerCase().includes(fontSearch.toLowerCase()));
  }, [customFonts, fontSearch]);


  /**
   * Helper: convert a base64-encoded image returned by the BFF (Torii full
   * page or cleaner output) into a blob: URL the viewer can render directly.
   */
  const base64ToObjectUrl = (b64: string, mime = 'image/png'): string => {
    const byteString = atob(b64);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  };

  /**
   * Build BYOK headers from the current settings panels. Empty strings stay
   * undefined so the backend falls back to its server-configured key.
   */
  const buildByok = (): ByokKeys => ({
    gemini: geminiApiKey || undefined,
    deepl: deepLKey || undefined,
    torii: toriiApiKey || undefined,
    ichigo: ichigoToken || undefined,
  });

  // --- Pipeline ---
  // The frontend no longer makes routing decisions or talks to providers
  // directly. We assemble the request, hand it to the BFF, and translate the
  // response into the shape the viewer expects.
  const runPipeline = async (
    base64: string,
  ): Promise<{ bubbles: TextBubble[]; translatedImageUrl?: string }> => {
    const usingTorii = ocrEngine === 'TORII' || transEngine === 'TORII';
    const wantsCleaner = useToriiForCleaning && !usingTorii;

    const response = await runPipelineApi(
      {
        imageBase64: base64,
        ocr: { engine: ocrEngine as ApiEngineId },
        translation: { engine: transEngine as ApiEngineId },
        cleaner: { enabled: wantsCleaner, engine: 'TORII' },
        options: {
          targetLanguage: 'Português (Brasil)',
          targetLangCode: 'pt-BR',
          ichigoModel,
        },
      },
      buildByok(),
    );

    if (response.tokens) handleTokenUsage(response.tokens);
    if (response.warnings && response.warnings.length > 0) {
      response.warnings.forEach(w => console.warn('[pipeline]', w));
    }

    // Either Torii full mode produced a translated page, or the cleaner ran
    // and produced a text-free version. Both come back as base64.
    let translatedImageUrl: string | undefined;
    if (response.translatedImageBase64) {
      translatedImageUrl = base64ToObjectUrl(response.translatedImageBase64);
    } else if (response.cleanedImageBase64) {
      translatedImageUrl = base64ToObjectUrl(response.cleanedImageBase64);
    }

    return { bubbles: response.bubbles, translatedImageUrl };
  };

  const processImage = async (imageObj: ProcessedImage, file: File) => {
    try {
      const base64 = await fileToBase64(file);
      // Remove data prefix if exists for API calls
      const base64Clean = base64.includes(',') ? base64.split(',')[1] : base64;

      const { bubbles, translatedImageUrl } = await runPipeline(base64Clean);

      updateImageStateInStore(imageObj.id, {
        base64: base64Clean,
        bubbles,
        translatedImageUrl,
        status: 'done',
      });
    } catch (error: any) {
      console.error(`Error processing ${imageObj.fileName}:`, error);
      const { errorMsg } = handlePipelineError(error);
      updateImageStateInStore(imageObj.id, { status: 'error', errorMessage: errorMsg });
    }
  };

  /**
   * Centralised pipeline error handler. Replaces the substring-matching mess
   * the original code used (which had bug B14 — operator-precedence bug —
   * and wrong matches when the BFF returns Portuguese-only messages).
   *
   * The BFF returns ApiError instances with structured `code` + `engine`
   * fields, so we can react precisely instead of guessing.
   */
  const handlePipelineError = (error: unknown): { errorMsg: string } => {
    if (error instanceof ApiError) {
      // Authentication / missing key → open the matching settings modal.
      if (error.code === 'AUTH' || error.code === 'INVALID_KEY') {
        switch (error.engine) {
          case 'ichigo':
            if (error.code === 'AUTH') logoutIchigo();
            setShowIchigoSettings(true);
            break;
          case 'gemini':
            setShowGeminiSettings(true);
            break;
          case 'deepl':
            setShowDeepLSettings(true);
            break;
          case 'torii':
            setShowToriiSettings(true);
            break;
        }
      }

      const msgByCode: Partial<Record<typeof error.code, string>> = {
        RATE_LIMIT: 'Limite de uso atingido. Tente novamente em instantes.',
        QUOTA: 'Cota do provedor atingida.',
        AUTH: 'Erro de autenticação.',
        INVALID_KEY: 'Chave de API necessária ou inválida.',
        NETWORK: 'Falha de rede.',
      };
      return { errorMsg: msgByCode[error.code] ?? error.message };
    }

    return { errorMsg: error instanceof Error ? error.message : 'Falha na tradução.' };
  };

  const handleRetranslate = async () => {
    if (!currentImage) return;
    const imageId = currentImage.id;
    // Reset the image to a "processing" state in the store; subsequent
    // mutations target the same id.
    updateImageStateInStore(imageId, {
      status: 'processing',
      bubbles: [],
      translatedImageUrl: undefined,
      maskDataUrl: undefined,
    });

    try {
      // Reuse the base64 already stored on the image when available; fall
      // back to refetching the source URL only if it isn't.
      let base64Clean = currentImage.base64;
      if (!base64Clean) {
        const res = await fetch(currentImage.imageUrl);
        const blob = await res.blob();
        const file = new File([blob], currentImage.fileName, { type: blob.type });
        const dataUrl = await fileToBase64(file);
        base64Clean = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        updateImageStateInStore(imageId, { base64: base64Clean });
      }

      const { bubbles, translatedImageUrl } = await runPipeline(base64Clean);
      updateImageStateInStore(imageId, {
        status: 'done',
        bubbles,
        translatedImageUrl,
      });
    } catch (error: any) {
      const { errorMsg } = handlePipelineError(error);
      updateImageStateInStore(imageId, { status: 'error', errorMessage: errorMsg });
    }
  };

  const handleFilesSelect = async (files: File[]) => {
    if (files.length === 0) return;
    if ((ocrEngine === 'ICHIGO') && !ichigoToken) return setShowIchigoSettings(true);
    if ((transEngine === 'TORII' || ocrEngine === 'TORII' || useToriiForCleaning) && !toriiApiKey) return setShowToriiSettings(true);
    if (transEngine === 'DEEPL' && !deepLKey) return setShowDeepLSettings(true);
    // Note: We don't block gemini missing key immediately as environment variable might be used

    const newImages: ProcessedImage[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`, 
      fileName: file.name,
      imageUrl: URL.createObjectURL(file),
      base64: '',
      bubbles: [],
      status: 'processing'
    }));

    addImagesToSession(newImages);
    setIsSidebarOpen(false); // Auto close sidebar on mobile

    // EXECUÇÃO SEQUENCIAL (FILA)
    // Garante que a imagem 1 termina (sucesso ou erro tratado) antes de iniciar a imagem 2
    for (let i = 0; i < newImages.length; i++) {
        await processImage(newImages[i], files[i]);
    }
  };

  // Handler para carregar capítulo da biblioteca
  const handleLoadFromLibrary = (images: ProcessedImage[]) => {
    replaceSessionHistory(images);
    setIsSidebarOpen(false);
  };

  // State Updates — kept as a thin wrapper so the JSX below doesn't
  // need to know about the store directly. The store handles applying
  // the partial to both `history[i]` and `currentImage` atomically.
  const updateImageState = (id: string, partial: Partial<ProcessedImage>) => {
    updateImageStateInStore(id, partial);
  };

  const handleBubbleUpdate = (bubble: TextBubble) => {
    updateBubbleInStore(bubble);
  };

  const handleBubbleDelete = (bubbleId: string) => {
    removeBubbleInStore(bubbleId);
  };

  const handleBubbleAdd = (bubble: TextBubble) => {
    addBubbleInStore(bubble);
  };

  const handleImageUpdate = (img: ProcessedImage) => {
    updateImageStateInStore(img.id, img);
  };

  // Navigation
  const getCurrentIndex = () => history.findIndex(img => img.id === currentImage?.id);
  const handleNext = () => {
    const idx = getCurrentIndex();
    if (idx !== -1 && idx < history.length - 1) setCurrentImageInStore(history[idx + 1]);
  };
  const handlePrev = () => {
    const idx = getCurrentIndex();
    if (idx > 0) setCurrentImageInStore(history[idx - 1]);
  };

  // Toggle Component for reuse
  const Toggle = ({ label, checked, onChange, colorClass = "bg-indigo-600" }: { label: string | React.ReactNode, checked: boolean, onChange: () => void, colorClass?: string }) => (
    <div className="flex items-center justify-between cursor-pointer" onClick={onChange}>
       <label className="text-xs font-medium text-slate-300 pointer-events-none">{label}</label>
       <div className={`w-9 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? colorClass : 'bg-slate-700'}`}>
         <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-4' : ''}`}></div>
       </div>
    </div>
  );

  return (
    <div 
      className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      
      {/* --- Mobile Sidebar Overlay --- */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar (Drawer on Mobile, Fixed on Desktop) --- */}
      <aside className={`
        fixed md:relative z-50 h-full w-[85vw] md:w-80 bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
               <BookOpenIcon className="w-5 h-5 text-white" />
             </div>
             <div>
               <h1 className="font-bold text-lg leading-none tracking-tight">MangaLens</h1>
               <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-medium">AI Translator</span>
                  {/* Token Usage Badge */}
                  <div className={`flex items-center gap-1 border rounded-md px-1.5 py-0.5 ${displayedTotalTokens > 0 ? 'bg-emerald-900/40 border-emerald-500/30' : 'bg-slate-800/40 border-slate-700/50'}`}>
                      <span className={`text-[9px] font-mono font-bold ${displayedTotalTokens > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {displayedTotalTokens > 1000 ? `${(displayedTotalTokens/1000).toFixed(1)}k` : displayedTotalTokens} Tk
                      </span>
                      {displayedTotalTokens > 0 && (
                        <span className="text-[8px] text-emerald-500/70 border-l border-emerald-500/30 pl-1 ml-0.5">
                          ${totalCost.toFixed(4)}
                        </span>
                      )}
                  </div>
               </div>
             </div>
           </div>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-slate-400">
             <XMarkIcon className="w-6 h-6" />
           </button>
        </div>
        
        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
           {history.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 text-slate-600 space-y-2">
               <DocumentDuplicateIcon className="w-8 h-8 opacity-50" />
               <span className="text-xs">Sem histórico recente</span>
             </div>
           ) : (
             history.map((item, idx) => (
               <div 
                 key={item.id}
                 onClick={() => { setCurrentImageInStore(item); setIsSidebarOpen(false); }}
                 className={`
                   group flex items-center p-2 rounded-xl cursor-pointer transition-all border
                   ${currentImage?.id === item.id 
                     ? 'bg-indigo-600/10 border-indigo-500/50 shadow-sm' 
                     : 'bg-slate-800/50 border-transparent hover:bg-slate-800 hover:border-slate-700'}
                 `}
               >
                 <div className="relative h-10 w-10 rounded-lg bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800">
                   <img src={item.imageUrl} className="h-full w-full object-cover" loading="lazy" />
                   {item.status === 'processing' && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                       <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                     </div>
                   )}
                   {item.status === 'error' && (
                      <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-200" />
                      </div>
                   )}
                 </div>
                 <div className="ml-3 flex-1 min-w-0">
                   <div className="flex justify-between items-center">
                     <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{item.fileName}</p>
                     <span className="text-[9px] text-slate-500">#{idx + 1}</span>
                   </div>
                   <p className={`text-[10px] truncate ${item.status === 'error' ? 'text-red-400' : 'text-slate-500'}`}>
                     {item.status === 'processing' ? 'Traduzindo...' : item.status === 'done' ? 'Concluído' : 'Falha'}
                   </p>
                 </div>
                 <button 
                   onClick={(e) => { e.stopPropagation(); removeImageFromSession(item.id); }}
                   className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                 >
                   <TrashIcon className="w-4 h-4" />
                 </button>
               </div>
             ))
           )}
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-4">
           {/* OCR & Translation Selectors */}
           <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5"><ViewfinderCircleIcon className="w-3.5 h-3.5"/> OCR</span>
                <select value={ocrEngine} onChange={(e) => setOcrEngine(e.target.value as EngineId)} className="bg-slate-800 border-none text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500 max-w-[140px] truncate">
                   <option value="GEMINI_FLASH">Gemini 2.5 Flash</option>
                   <option value="GEMINI_FLASH_FULL">Gemini 2.5 Flash (Full)</option>
                   <option value="GEMINI_3_FLASH">Gemini 3 Flash (Novo)</option>
                   <option value="GEMINI_3_FLASH_FULL">Gemini 3 Flash (Full)</option>
                   <option value="GEMINI_PRO">Gemini 3 Pro</option>
                   <option value="GEMINI_PRO_FULL">Gemini 3 Pro (Full)</option>
                   <option value="ICHIGO">Ichigo</option>
                   <option value="TORII">Torii (Full)</option>
                </select>
              </div>
              <div className={`flex justify-between items-center text-xs transition-opacity ${(ocrEngine === 'GEMINI_PRO_FULL' || ocrEngine === 'GEMINI_FLASH_FULL' || ocrEngine === 'GEMINI_3_FLASH_FULL') ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                <span className="text-slate-400 flex items-center gap-1.5"><ChatBubbleLeftRightIcon className="w-3.5 h-3.5"/> Tradutor</span>
                <select 
                    value={transEngine} 
                    onChange={(e) => setTransEngine(e.target.value as EngineId)} 
                    className="bg-slate-800 border-none text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500 max-w-[140px] truncate"
                    disabled={ocrEngine === 'GEMINI_PRO_FULL' || ocrEngine === 'GEMINI_FLASH_FULL' || ocrEngine === 'GEMINI_3_FLASH_FULL'}
                >
                   {ocrEngine === 'GEMINI_PRO_FULL' || ocrEngine === 'GEMINI_FLASH_FULL' || ocrEngine === 'GEMINI_3_FLASH_FULL' ? (
                       <option>Integrado (Full)</option>
                   ) : (
                       <>
                           <option value="GEMINI_3_FLASH">Gemini 3 Flash (Novo)</option>
                           <option value="GEMINI_PRO">Gemini 3 Pro</option>
                           <option value="GEMINI_FLASH">Gemini 2.5 Flash</option>
                           <option value="DEEPL">DeepL</option>
                           <option value="GOOGLE">Google</option>
                           <option value="TORII">Torii</option>
                       </>
                   )}
                </select>
              </div>

              {/* Font Selector & Styles */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1.5"><ListBulletIcon className="w-3.5 h-3.5"/> Fonte</span>
                <div className="flex items-center gap-2">
                    <select value={targetFont} onChange={(e) => setTargetFont(e.target.value)} className="bg-slate-800 border-none text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500 max-w-[100px] truncate">
                       {availableFontsForSelector.map((font, idx) => {
                          if ('group' in font) {
                            return (
                              <optgroup key={idx} label={font.group}>
                                {font.options.map((opt, subIdx) => (
                                  <option key={`${idx}-${subIdx}`} value={opt.value}>{opt.name}</option>
                                ))}
                              </optgroup>
                            );
                          }
                          return <option key={idx} value={font.value}>{font.name}</option>;
                       })}
                    </select>
                    
                    {/* Bold/Italic Toggles */}
                    <div className="flex bg-slate-800 rounded-md border border-slate-700 p-0.5">
                       <button 
                         onClick={() => setTargetBold(!targetBold)} 
                         className={`p-1 rounded transition-colors ${targetBold ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                         title="Negrito"
                       >
                         <BoldIcon className="w-3.5 h-3.5" />
                       </button>
                       <button 
                         onClick={() => setTargetItalic(!targetItalic)} 
                         className={`p-1 rounded transition-colors ${targetItalic ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                         title="Itálico"
                       >
                         <ItalicIcon className="w-3.5 h-3.5" />
                       </button>
                    </div>
                </div>
              </div>

              {/* Global Bubble Scale Slider */}
               <div className="space-y-1 pt-1">
                 <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Tamanho dos Balões</span>
                    <span>{Math.round(globalBubbleScale * 100)}%</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setGlobalBubbleScale(Math.max(0.5, globalBubbleScale - 0.1))} className="text-slate-500 hover:text-white"><MinusCircleIcon className="w-4 h-4" /></button>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="1.5" 
                      step="0.05" 
                      value={globalBubbleScale} 
                      onChange={(e) => setGlobalBubbleScale(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <button onClick={() => setGlobalBubbleScale(Math.min(1.5, globalBubbleScale + 0.1))} className="text-slate-500 hover:text-white"><PlusCircleIcon className="w-4 h-4" /></button>
                 </div>
               </div>

              {/* Hybrid Cleaning Mode Toggle (Torii Inpaint) */}
              {ocrEngine !== 'TORII' && transEngine !== 'TORII' && (
                 <div className="pt-2 border-t border-slate-800">
                   <Toggle 
                     label={
                        <span className="flex items-center gap-1.5" title="Usa Torii apenas para limpar balões">
                           <SparklesIcon className={`w-3.5 h-3.5 ${useToriiForCleaning ? 'text-pink-400' : 'text-slate-500'}`} />
                           Limpar com Torii
                        </span>
                     } 
                     checked={useToriiForCleaning} 
                     onChange={() => {
                        setUseToriiForCleaning(!useToriiForCleaning);
                        if (!useToriiForCleaning && !toriiApiKey) setShowToriiSettings(true);
                     }} 
                     colorClass="bg-pink-600"
                   />
                 </div>
              )}
           </div>
           
           {/* Library Button */}
           <button 
             onClick={() => setShowLibrary(true)}
             className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
           >
             <BookmarkSquareIcon className="w-5 h-5" />
             Minha Biblioteca
           </button>
           
           {/* Settings Buttons Grid */}
           <div className="grid grid-cols-5 gap-2">
              <button onClick={() => setShowIchigoSettings(true)} className={`p-2 rounded-xl flex items-center justify-center border ${ichigoToken ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`} title="Ichigo"><UserCircleIcon className="w-5 h-5"/></button>
              <button onClick={() => setShowToriiSettings(true)} className={`p-2 rounded-xl flex items-center justify-center border ${toriiApiKey ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`} title="Torii"><SparklesIcon className="w-5 h-5"/></button>
              <button onClick={() => setShowDeepLSettings(true)} className={`p-2 rounded-xl flex items-center justify-center border ${deepLKey ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`} title="DeepL"><LanguageIcon className="w-5 h-5"/></button>
              <button onClick={() => setShowGeminiSettings(true)} className={`p-2 rounded-xl flex items-center justify-center border ${geminiApiKey ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`} title="Google Gemini Key (BYOK)"><CommandLineIcon className="w-5 h-5"/></button>
              <button onClick={() => setShowFontSettings(true)} className="p-2 rounded-xl flex items-center justify-center border bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700" title="Gerenciar Fontes"><DocumentPlusIcon className="w-5 h-5"/></button>
           </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden bg-slate-950">
        
        {/* Mobile Top Bar (Hidden in Clean Mode) */}
        {!isCleanMode && (
          <header className="md:hidden h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30 shadow-lg">
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-300">
               <Bars3Icon className="w-6 h-6" />
             </button>
             <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                {currentImage ? currentImage.fileName : 'MangaLens'}
             </span>
             {currentImage && (
                <button 
                  onClick={() => setReadingMode(prev => prev === 'single' ? 'strip' : 'single')}
                  className="p-2 -mr-2 text-indigo-400"
                  title={readingMode === 'single' ? "Modo Página Única" : "Modo Long Strip"}
                >
                  {readingMode === 'single' ? <ArrowsPointingOutIcon className="w-5 h-5" /> : <ArrowsPointingInIcon className="w-5 h-5" />}
                </button>
             )}
          </header>
        )}

        {/* Content View */}
        <div className="flex-1 overflow-hidden relative">
           {!currentImage ? (
             <div className="h-full overflow-y-auto p-4 md:p-10 flex flex-col items-center justify-center">
               <div className="max-w-xl w-full text-center space-y-6">
                 <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    Tradutor de Mangá
                 </h2>
                 <p className="text-slate-400">
                    Leitura sem fronteiras. Selecione seus arquivos ou cole uma URL.
                 </p>
                 <Uploader onFilesSelect={handleFilesSelect} isProcessing={false} />
                 
                 <div className="pt-8 flex flex-wrap justify-center gap-3 opacity-60">
                   <span className="px-3 py-1 bg-slate-800 rounded-full text-xs border border-slate-700">Gemini 2.5 Flash</span>
                   <span className="px-3 py-1 bg-slate-800 rounded-full text-xs border border-slate-700">Torii Inpaint</span>
                   <span className="px-3 py-1 bg-slate-800 rounded-full text-xs border border-slate-700">Auto OCR</span>
                 </div>
               </div>
             </div>
           ) : (
             <>
               {readingMode === 'single' ? (
                 /* Single Page Mode (Standard MangaViewer) */
                 <MangaViewer 
                   image={currentImage}
                   onNext={getCurrentIndex() < history.length - 1 ? handleNext : undefined}
                   onPrev={getCurrentIndex() > 0 ? handlePrev : undefined}
                   onBubbleUpdate={handleBubbleUpdate}
                   onBubbleDelete={(bid) => handleBubbleDelete(bid)}
                   onBubbleAdd={handleBubbleAdd}
                   onImageUpdate={handleImageUpdate}
                   onToggleStrip={() => setReadingMode('strip')}
                   isCleanMode={isCleanMode}
                   defaultFont={targetFont}
                   globalBold={targetBold}
                   globalItalic={targetItalic}
                   globalBubbleScale={globalBubbleScale}
                   customFonts={customFonts}
                 />
               ) : (
                 /* Long Strip Mode (Scrollable List) */
                 <div className="h-full overflow-y-auto bg-slate-950 scroll-smooth pb-20">
                    {/* Render all DONE images in order */}
                    {history.filter(img => img.status === 'done').length === 0 && currentImage.status !== 'done' ? (
                       <div className="flex items-center justify-center h-full text-slate-500">
                          Nenhuma página pronta para leitura contínua.
                       </div>
                    ) : (
                       history.map((img, idx) => (
                         <div key={img.id} className="w-full max-w-3xl mx-auto border-b border-slate-900/50">
                            <MangaViewer 
                              image={img}
                              stripMode={true}
                              isCleanMode={isCleanMode}
                              defaultFont={targetFont}
                              globalBold={targetBold}
                              globalItalic={targetItalic}
                              globalBubbleScale={globalBubbleScale}
                              customFonts={customFonts}
                              onBubbleUpdate={(b) => {
                                 // Need to update the specific image in history
                                 const newBubbles = img.bubbles.map(bub => bub.id === b.id ? b : bub);
                                 updateImageState(img.id, { bubbles: newBubbles });
                              }}
                            />
                         </div>
                       ))
                    )}
                    
                    {/* Floating Controls for Strip Mode (if not clean) */}
                    {!isCleanMode && (
                      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
                         <button 
                            onClick={() => setReadingMode('single')}
                            className="bg-indigo-600 text-white p-3 rounded-full shadow-xl hover:bg-indigo-700 transition-colors"
                         >
                            <ArrowsPointingInIcon className="w-6 h-6" />
                         </button>
                      </div>
                    )}
                 </div>
               )}

               {/* Hint Toast for Clean Mode */}
               {!isCleanMode && !longPressTriggered && (
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur text-white text-[10px] px-3 py-1 rounded-full pointer-events-none md:hidden opacity-50">
                    Segure para tela cheia
                 </div>
               )}
             </>
           )}
        </div>
      </main>

      {/* --- Modals (Settings) --- */}
      {/* Font Settings Modal */}
      {showFontSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden relative animate-fade-in-up shadow-2xl">
               
               {/* Header */}
               <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                 <div>
                   <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <DocumentPlusIcon className="w-6 h-6 text-indigo-400" />
                      Gerenciador de Fontes
                   </h3>
                   <p className="text-xs text-slate-400 mt-1">Adicione fontes personalizadas ou visualize as do sistema.</p>
                 </div>
                 <button onClick={() => setShowFontSettings(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg"><XMarkIcon className="w-6 h-6"/></button>
               </div>
               
               {/* Tabs & Search */}
               <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="flex bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
                     <button 
                       onClick={() => setActiveFontTab('custom')}
                       className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeFontTab === 'custom' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                     >
                       Minhas Fontes
                     </button>
                     <button 
                       onClick={() => setActiveFontTab('library')}
                       className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeFontTab === 'library' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                     >
                       Biblioteca do Sistema
                     </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <input 
                      type="text" 
                      placeholder="Buscar fonte..." 
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:ring-1 focus:ring-indigo-500"
                    />
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>
               </div>

               {/* Preview Input */}
               <div className="px-4 py-2 bg-slate-800/30 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <SwatchIcon className="w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      value={fontPreviewText} 
                      onChange={(e) => setFontPreviewText(e.target.value)}
                      className="bg-transparent border-none text-slate-400 text-xs w-full focus:ring-0 placeholder-slate-600"
                      placeholder="Digite um texto para pré-visualizar..."
                    />
                  </div>
               </div>

               {/* Content Area */}
               <div className="flex-1 overflow-y-auto p-4 bg-slate-950/50">
                  
                  {activeFontTab === 'custom' && (
                    <div className="space-y-6">
                       {/* Upload Box */}
                       <label className={`
                          flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer 
                          hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all group ${isFontLoading ? 'opacity-50 pointer-events-none' : ''}
                        `}>
                           <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              {isFontLoading ? (
                                 <div className="flex flex-col items-center gap-2">
                                   <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
                                   <span className="text-xs text-indigo-400">Processando...</span>
                                 </div>
                              ) : (
                                 <>
                                   <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-slate-700 transition-colors">
                                     <FolderPlusIcon className="w-6 h-6 text-indigo-400" />
                                   </div>
                                   <p className="text-sm text-slate-300 font-medium">Clique para adicionar fonte</p>
                                   <p className="text-xs text-slate-500 mt-1">Suporta .ttf, .otf, .woff</p>
                                 </>
                              )}
                           </div>
                           <input type="file" className="hidden" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} disabled={isFontLoading} />
                        </label>

                        {/* Custom Fonts List */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instaladas ({filteredCustomFonts.length})</h4>
                          
                          {filteredCustomFonts.length === 0 ? (
                            <div className="text-center py-8 text-slate-600 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
                               {fontSearch ? "Nenhuma fonte encontrada na busca." : "Nenhuma fonte personalizada instalada."}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                               {filteredCustomFonts.map((font, idx) => (
                                 <div key={idx} className="group relative bg-slate-800 rounded-lg border border-slate-700 p-4 hover:border-indigo-500/50 transition-colors flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                       <div>
                                          <span className="text-xs font-bold text-indigo-400 block mb-1">{font.name}</span>
                                          <p className="text-xl text-white break-words" style={{ fontFamily: font.value }}>
                                             {fontPreviewText || font.name}
                                          </p>
                                       </div>
                                       <button 
                                         onClick={() => deleteCustomFont(idx)} 
                                         className="p-2 text-slate-600 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                                         title="Remover fonte"
                                       >
                                         <TrashIcon className="w-5 h-5" />
                                       </button>
                                    </div>
                                 </div>
                               ))}
                            </div>
                          )}
                        </div>
                    </div>
                  )}

                  {activeFontTab === 'library' && (
                     <div className="space-y-6">
                        {filteredSystemFonts.length === 0 ? (
                            <div className="text-center py-8 text-slate-600">
                               Nenhuma fonte encontrada para "{fontSearch}".
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                               {filteredSystemFonts.map((item, idx) => {
                                 // Render Group
                                 if ('group' in item) {
                                    return (
                                        <div key={idx} className="space-y-2">
                                            <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider px-1">{item.group}</h5>
                                            <div className="grid grid-cols-1 gap-2">
                                                {item.options.map((opt, optIdx) => (
                                                    <div key={`${idx}-${optIdx}`} className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex flex-col gap-1">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-bold text-slate-500">{opt.name}</span>
                                                        </div>
                                                        <p className="text-lg text-white truncate" style={{ fontFamily: opt.value }}>
                                                            {fontPreviewText || opt.name}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                 }
                                 
                                 // Render Single Item
                                 return (
                                     <div key={idx} className="bg-slate-800 rounded-lg border border-slate-700 p-3 flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                           <span className="text-xs font-bold text-slate-500">{item.name}</span>
                                           {item.name === 'Anime Ace 2.0 BB' && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">Padrão</span>}
                                        </div>
                                        <p className="text-lg text-white truncate" style={{ fontFamily: item.value }}>
                                           {fontPreviewText || item.name}
                                        </p>
                                     </div>
                                 );
                               })}
                            </div>
                        )}
                     </div>
                  )}

               </div>
               
               {/* Footer */}
               <div className="p-3 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Armazenamento local (Browser)</span>
                  <span>{customFonts.length} Customizada(s)</span>
               </div>
            </div>
          </div>
      )}

      {/* Ichigo Settings Modal Wrapper */}
      {showIchigoSettings && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm overflow-hidden p-6 relative">
              <button onClick={() => setShowIchigoSettings(false)} className="absolute top-4 right-4 text-slate-400"><XMarkIcon className="w-5 h-5"/></button>
              <h3 className="text-xl font-bold text-white mb-4">Login Ichigo</h3>
              {!ichigoToken ? (
                 <form onSubmit={handleIchigoLogin} className="space-y-4">
                    <input type="email" placeholder="Email" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={ichigoEmail} onChange={e => setIchigoEmail(e.target.value)} />
                    <input type="password" placeholder="Senha" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" value={ichigoPassword} onChange={e => setIchigoPassword(e.target.value)} />
                    <button type="submit" disabled={isLoggingIn} className="w-full bg-indigo-600 text-white p-2 rounded">{isLoggingIn ? 'Entrando...' : 'Entrar'}</button>
                 </form>
              ) : (
                 <div className="space-y-4">
                    <div className="text-green-400 text-sm">Logado como: {ichigoEmail}</div>
                    <button onClick={logoutIchigo} className="w-full border border-red-500 text-red-400 p-2 rounded">Sair</button>
                 </div>
              )}
           </div>
        </div>
      )}
      
      {/* Torii Settings - Full Restoration */}
      {showToriiSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm overflow-hidden relative animate-fade-in-up">
               <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                 <h3 className="text-white font-bold flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-pink-400" />
                    Configurar Torii
                 </h3>
                 <button onClick={() => setShowToriiSettings(false)} className="text-slate-400 hover:text-white"><XMarkIcon className="w-5 h-5"/></button>
               </div>
               
               <div className="p-5 space-y-5">
                   {/* API Key */}
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Torii API Key</label>
                      <div className="relative">
                        <input type="password" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-pink-500 focus:outline-none pl-9" value={toriiApiKey} onChange={e => setToriiApiKey(e.target.value)} placeholder="sk-..." />
                        <KeyIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      </div>
                   </div>

                   {/* Internal Translator */}
                   <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400 flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                        Modelo de Tradução (Interno)
                      </label>
                      <select 
                         value={toriiInternalTrans} 
                         onChange={(e) => setToriiInternalTrans(e.target.value)} 
                         className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5 focus:ring-pink-500 focus:outline-none"
                      >
                         {TORII_TRANSLATORS.map(t => (
                           <option key={t.id} value={t.id}>{t.name}</option>
                         ))}
                      </select>
                   </div>

                   {/* Advanced Toggles */}
                   <div className="space-y-3 pt-2 border-t border-slate-700/50">
                      <Toggle 
                        label={<span className="flex items-center gap-2"><AdjustmentsHorizontalIcon className="w-4 h-4 text-slate-500"/> Apenas Limpeza (Inpaint Only)</span>} 
                        checked={toriiInpaintOnly} 
                        onChange={() => setToriiInpaintOnly(!toriiInpaintOnly)} 
                        colorClass="bg-pink-600"
                      />
                      
                      <Toggle 
                        label={<span className="flex items-center gap-2"><CpuChipIcon className="w-4 h-4 text-slate-500"/> Desativar Borda (Stroke Disabled)</span>} 
                        checked={toriiStrokeDisabled} 
                        onChange={() => setToriiStrokeDisabled(!toriiStrokeDisabled)} 
                        colorClass="bg-pink-600"
                      />

                      <Toggle 
                        label="Salvar Chave no Navegador" 
                        checked={toriiSaveKey} 
                        onChange={() => setToriiSaveKey(!toriiSaveKey)} 
                        colorClass="bg-green-600"
                      />
                   </div>

                   <button onClick={saveToriiKey} className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-pink-900/20">
                     Salvar Configurações
                   </button>
               </div>
            </div>
          </div>
      )}

      {/* DeepL Settings */}
      {showDeepLSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6 relative">
               <button onClick={() => setShowDeepLSettings(false)} className="absolute top-4 right-4 text-slate-400"><XMarkIcon className="w-5 h-5"/></button>
               <h3 className="text-xl font-bold text-white mb-4">Configurar DeepL</h3>
               <input type="password" placeholder="API Key" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mb-4" value={deepLKey} onChange={e => setDeepLKey(e.target.value)} />
               <button onClick={saveDeepLKey} className="w-full bg-blue-600 text-white p-2 rounded">Salvar</button>
             </div>
          </div>
      )}

      {/* Google Gemini API Key Settings */}
      {showGeminiSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6 relative animate-fade-in-up">
               <button onClick={() => setShowGeminiSettings(false)} className="absolute top-4 right-4 text-slate-400"><XMarkIcon className="w-5 h-5"/></button>
               <div className="flex items-center gap-2 mb-4">
                  <CommandLineIcon className="w-6 h-6 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">Google Gemini API</h3>
               </div>

               <p className="text-xs text-slate-400 mb-4">
                  Insira sua própria chave do <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a> para usar sua quota.
                  Se deixado em branco, o servidor usa a chave padrão (quando configurada).
                  Sua chave fica apenas no seu navegador e é enviada ao backend somente no momento da tradução.
               </p>

               <div className="space-y-2 mb-4">
                  <label className="text-xs font-medium text-slate-300">API Key (opcional — BYOK)</label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    value={geminiApiKey}
                    onChange={e => setGeminiApiKey(e.target.value)}
                  />
               </div>

               <button onClick={saveGeminiKey} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-orange-900/20">
                 Salvar Chave
               </button>
             </div>
          </div>
      )}

      {/* Library Manager */}
      <LibraryManager
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        currentHistory={history}
        onLoadChapter={handleLoadFromLibrary}
      />

    </div>
  );
};

export default App;