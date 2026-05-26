import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ProcessedImage, TextBubble, ViewMode } from './types';
import MangaViewer, { AVAILABLE_FONTS, DEFAULT_FONT_VALUE, FontOption, FontGroup } from './components/MangaViewer';
import Uploader from './components/Uploader';
import LibraryManager from './components/LibraryManager';
import { processMangaPage, TokenUsageData } from './services/geminiService';
import { performTranslation } from './services/translationService';
import { loginIchigo, translateImageWithIchigo, ICHIGO_MODELS } from './services/ichigoService';
import { translateWithTorii } from './services/toriiService';
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

// Definition of available engines
type EngineType = 'GEMINI_FLASH' | 'GEMINI_FLASH_FULL' | 'GEMINI_3_FLASH' | 'GEMINI_3_FLASH_FULL' | 'GEMINI_PRO' | 'GEMINI_PRO_FULL' | 'ICHIGO' | 'TORII' | 'DEEPL' | 'GOOGLE';

const ENGINE_LABELS: Record<EngineType, string> = {
  'GEMINI_FLASH': 'Gemini 2.5 Flash',
  'GEMINI_FLASH_FULL': 'Gemini 2.5 Flash (Full)',
  'GEMINI_3_FLASH': 'Gemini 3 Flash (Novo)',
  'GEMINI_3_FLASH_FULL': 'Gemini 3 Flash (Full)',
  'GEMINI_PRO': 'Gemini 3 Pro (OCR)',
  'GEMINI_PRO_FULL': 'Gemini 3 Pro (Full)',
  'ICHIGO': 'Ichigo (OCR)',
  'TORII': 'Torii (Full Page)',
  'DEEPL': 'DeepL API',
  'GOOGLE': 'Google Translate'
};

const GEMINI_MODELS: Record<string, string> = {
  'GEMINI_FLASH': 'gemini-2.5-flash',
  'GEMINI_FLASH_FULL': 'gemini-2.5-flash',
  'GEMINI_3_FLASH': 'gemini-3-flash-preview',
  'GEMINI_3_FLASH_FULL': 'gemini-3-flash-preview', // Full Pipeline
  'GEMINI_PRO': 'gemini-3-pro-preview',
  'GEMINI_PRO_FULL': 'gemini-3-pro-preview'
};

const TORII_TRANSLATORS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Rápido)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Equilibrado)' },
  { id: 'google_translate', name: 'Google Translate (Básico)' },
  { id: 'gpt-4o', name: 'GPT-4o (Premium)' }
];

// Interface for Custom Stored Fonts
interface StoredFont extends FontOption {
  data: string; // Base64 data of the font file
}

const App: React.FC = () => {
  // State for the current active image being viewed/processed
  const [currentImage, setCurrentImage] = useState<ProcessedImage | null>(null);
  const [history, setHistory] = useState<ProcessedImage[]>([]);

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Drawer
  const [readingMode, setReadingMode] = useState<'single' | 'strip'>('single'); // Single Page vs Long Strip
  const [isCleanMode, setIsCleanMode] = useState(false); // Fullscreen/Zen mode
  const [longPressTriggered, setLongPressTriggered] = useState(false);

  // --- Engine Configuration State (with Persistence) ---
  const [ocrEngine, setOcrEngine] = useState<EngineType>(() => (localStorage.getItem('manga_ocr_engine') as EngineType) || 'GEMINI_FLASH');
  const [transEngine, setTransEngine] = useState<EngineType>(() => (localStorage.getItem('manga_trans_engine') as EngineType) || 'GEMINI_PRO');
  const [ichigoModel, setIchigoModel] = useState<string>(() => localStorage.getItem('manga_ichigo_model') || 'Gemini 3 Pro');
  
  // Font State
  const [targetFont, setTargetFont] = useState<string>(() => localStorage.getItem('manga_target_font') || DEFAULT_FONT_VALUE);
  const [targetBold, setTargetBold] = useState<boolean>(() => localStorage.getItem('manga_target_bold') !== 'false'); // Default true
  const [targetItalic, setTargetItalic] = useState<boolean>(() => localStorage.getItem('manga_target_italic') === 'true'); // Default false
  
  // Bubble Scale State
  const [globalBubbleScale, setGlobalBubbleScale] = useState<number>(() => {
    const saved = localStorage.getItem('manga_bubble_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  // Token Tracking State
  const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 });
  const [totalCost, setTotalCost] = useState(0);

  // Custom Fonts State
  const [customFonts, setCustomFonts] = useState<StoredFont[]>([]);
  const [isFontLoading, setIsFontLoading] = useState(false);

  // Settings Modals
  const [showIchigoSettings, setShowIchigoSettings] = useState(false);
  const [showToriiSettings, setShowToriiSettings] = useState(false);
  const [showDeepLSettings, setShowDeepLSettings] = useState(false);
  const [showGoogleSettings, setShowGoogleSettings] = useState(false);
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // Font Manager UI State
  const [activeFontTab, setActiveFontTab] = useState<'custom' | 'library'>('custom');
  const [fontSearch, setFontSearch] = useState('');
  const [fontPreviewText, setFontPreviewText] = useState('The quick brown fox jumps over the lazy dog');

  // Auth/Keys
  const [ichigoEmail, setIchigoEmail] = useState(localStorage.getItem('ichigo_email') || '');
  const [ichigoPassword, setIchigoPassword] = useState('');
  const [ichigoRemember, setIchigoRemember] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [ichigoToken, setIchigoToken] = useState<string | null>(localStorage.getItem('ichigo_token'));
  
  const [toriiApiKey, setToriiApiKey] = useState(localStorage.getItem('torii_key') || '');
  const [toriiSaveKey, setToriiSaveKey] = useState(true);
  
  const [googleApiKey, setGoogleApiKey] = useState(localStorage.getItem('google_api_key') || '');

  // Torii Advanced Configs
  const [toriiInternalTrans, setToriiInternalTrans] = useState(() => localStorage.getItem('manga_torii_trans') || 'google_translate');
  const [toriiStrokeDisabled, setToriiStrokeDisabled] = useState(() => localStorage.getItem('manga_torii_stroke') === 'true');
  const [toriiInpaintOnly, setToriiInpaintOnly] = useState(() => localStorage.getItem('manga_torii_inpaint') === 'true');
  const [useToriiForCleaning, setUseToriiForCleaning] = useState(() => localStorage.getItem('manga_torii_cleaning') === 'true');

  const [deepLKey, setDeepLKey] = useState(localStorage.getItem('deepl_key') || '');


  // --- Persistence Effects ---
  useEffect(() => { localStorage.setItem('manga_ocr_engine', ocrEngine); }, [ocrEngine]);
  useEffect(() => { localStorage.setItem('manga_trans_engine', transEngine); }, [transEngine]);
  useEffect(() => { localStorage.setItem('manga_ichigo_model', ichigoModel); }, [ichigoModel]);
  useEffect(() => { localStorage.setItem('manga_torii_trans', toriiInternalTrans); }, [toriiInternalTrans]);
  useEffect(() => { localStorage.setItem('manga_torii_stroke', String(toriiStrokeDisabled)); }, [toriiStrokeDisabled]);
  useEffect(() => { localStorage.setItem('manga_torii_inpaint', String(toriiInpaintOnly)); }, [toriiInpaintOnly]);
  useEffect(() => { localStorage.setItem('manga_torii_cleaning', String(useToriiForCleaning)); }, [useToriiForCleaning]);
  useEffect(() => { localStorage.setItem('manga_target_font', targetFont); }, [targetFont]);
  useEffect(() => { localStorage.setItem('manga_target_bold', String(targetBold)); }, [targetBold]);
  useEffect(() => { localStorage.setItem('manga_target_italic', String(targetItalic)); }, [targetItalic]);
  useEffect(() => { localStorage.setItem('manga_bubble_scale', globalBubbleScale.toString()); }, [globalBubbleScale]);

  // Load Custom Fonts on Startup
  useEffect(() => {
    const loadCustomFonts = async () => {
      try {
        const stored = localStorage.getItem('manga_custom_fonts');
        if (stored) {
          const parsedFonts: StoredFont[] = JSON.parse(stored);
          setCustomFonts(parsedFonts);

          // Register fonts in the browser
          for (const font of parsedFonts) {
            try {
              // Create FontFace: Name, URL/Buffer
              const fontFace = new FontFace(font.name, `url(${font.data})`);
              const loadedFace = await fontFace.load();
              document.fonts.add(loadedFace);
            } catch (err) {
              console.error(`Falha ao carregar fonte ${font.name}:`, err);
            }
          }
        }
      } catch (e) {
        console.error("Erro ao ler fontes do localStorage", e);
      }
    };
    loadCustomFonts();
  }, []);

  // --- Token Calculation Logic ---
  const handleTokenUsage = (data: TokenUsageData) => {
    setTotalTokens(prev => ({
      input: prev.input + data.input,
      output: prev.output + data.output
    }));

    // Cost calculation (Estimates based on current pricing tiers)
    // Flash: ~0.10/1M In, ~0.40/1M Out
    // Pro:   ~1.25/1M In, ~5.00/1M Out
    let costIn = 0;
    let costOut = 0;
    
    if (data.model.includes('flash') || data.model.includes('lite')) {
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
      const token = await loginIchigo(ichigoEmail, ichigoPassword);
      setIchigoToken(token);
      if (ichigoRemember) {
        localStorage.setItem('ichigo_token', token);
        localStorage.setItem('ichigo_email', ichigoEmail);
      } else {
        localStorage.removeItem('ichigo_token');
        localStorage.removeItem('ichigo_email');
      }
      if (ocrEngine !== 'ICHIGO') setOcrEngine('ICHIGO');
    } catch (error) {
      alert("Falha no login: Verifique suas credenciais.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logoutIchigo = () => {
    setIchigoToken(null);
    localStorage.removeItem('ichigo_token');
    if (ocrEngine === 'ICHIGO') setOcrEngine('GEMINI_FLASH');
  };

  const saveToriiKey = () => {
    if (toriiSaveKey) localStorage.setItem('torii_key', toriiApiKey);
    else localStorage.removeItem('torii_key');
    setShowToriiSettings(false);
  };

  const saveDeepLKey = () => {
    localStorage.setItem('deepl_key', deepLKey);
    setShowDeepLSettings(false);
  };
  
  const saveGoogleKey = () => {
    localStorage.setItem('google_api_key', googleApiKey);
    setShowGoogleSettings(false);
  };

  // --- Font Management ---
  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsFontLoading(true);
    const file = e.target.files[0];
    const fontName = file.name.split('.')[0].replace(/[^a-zA-Z0-9 ]/g, ''); // Simple cleanup
    
    try {
      const base64Data = await fileToBase64(file);
      
      // Load into browser
      const fontFace = new FontFace(fontName, `url(${base64Data})`);
      const loadedFace = await fontFace.load();
      document.fonts.add(loadedFace);

      const newFont: StoredFont = {
        name: fontName,
        value: `"${fontName}", sans-serif`,
        data: base64Data
      };

      const updatedFonts = [...customFonts, newFont];
      setCustomFonts(updatedFonts);
      
      // Save to storage (Note: LocalStorage has limits (~5MB), this is basic impl)
      try {
        localStorage.setItem('manga_custom_fonts', JSON.stringify(updatedFonts));
      } catch (err) {
        alert("Erro: Espaço insuficiente no armazenamento local para salvar esta fonte.");
        // Still available in memory for this session
      }

    } catch (err) {
      console.error("Erro ao carregar fonte:", err);
      alert("Arquivo de fonte inválido ou corrompido.");
    } finally {
      setIsFontLoading(false);
    }
  };

  const deleteCustomFont = (index: number) => {
    const updated = customFonts.filter((_, i) => i !== index);
    setCustomFonts(updated);
    localStorage.setItem('manga_custom_fonts', JSON.stringify(updated));
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


  // --- Pipeline ---
  const runPipeline = async (base64: string, file: File): Promise<{ bubbles: TextBubble[], translatedImageUrl?: string }> => {
    const useToriiFull = transEngine === 'TORII' || ocrEngine === 'TORII';

    if (useToriiFull) {
      if (!toriiApiKey) throw new Error("Chave API do Torii não configurada.");
      const resultBlob = await translateWithTorii(file, toriiApiKey, {
        translator: toriiInternalTrans,
        strokeDisabled: toriiStrokeDisabled,
        inpaintOnly: toriiInpaintOnly
      });
      return { bubbles: [], translatedImageUrl: URL.createObjectURL(resultBlob) };
    }

    const promises: Promise<any>[] = [];
    let bubblesPromise: Promise<TextBubble[]>;
    
    // --- Determine OCR Strategy ---
    if (ocrEngine === 'ICHIGO') {
      if (!ichigoToken) throw new Error("Faça login no Ichigo para usar OCR.");
      bubblesPromise = translateImageWithIchigo(base64, ichigoToken, 'Português (Brasil)', ichigoModel);
    } else {
      const model = GEMINI_MODELS[ocrEngine] || 'gemini-3-pro-preview';
      
      // AUTO-OPTIMIZATION LOGIC:
      // 1. Check if we are running a "Unified" pipeline (Same engine for OCR and Translation).
      //    Example: Flash + Flash, or Pro + Pro.
      //    In this case, we perform OCR + Translation in a SINGLE step (skipping the second step).
      const isNativeGeminiMatch = ocrEngine === transEngine && (ocrEngine === 'GEMINI_FLASH' || ocrEngine === 'GEMINI_3_FLASH' || ocrEngine === 'GEMINI_PRO');
      const isExplicitFull = ocrEngine === 'GEMINI_PRO_FULL' || ocrEngine === 'GEMINI_FLASH_FULL' || ocrEngine === 'GEMINI_3_FLASH_FULL';
      const performFullPass = isNativeGeminiMatch || isExplicitFull;

      // 2. If it's NOT a full pass (e.g. Flash OCR + Pro Trans), we instruct the OCR step 
      //    to SKIP translation (saving tokens).
      const skipTranslationInOCR = !performFullPass; 

      // Pass the custom googleApiKey if available
      bubblesPromise = processMangaPage(base64, model, googleApiKey, handleTokenUsage, skipTranslationInOCR);
    }
    promises.push(bubblesPromise);

    let cleanerPromise: Promise<Blob> | null = null;
    if (useToriiForCleaning && toriiApiKey) {
      cleanerPromise = translateWithTorii(file, toriiApiKey, { translator: 'gemini-2.5-flash', strokeDisabled: false, inpaintOnly: true });
      promises.push(cleanerPromise);
    }

    const results = await Promise.all(promises);
    let bubbles = results[0] as TextBubble[];
    const cleanerBlob = cleanerPromise ? results[1] as Blob : null;

    // --- Translation Step ---
    // Only proceed if bubbles exist AND we need a second pass.
    // We skip this step if "performFullPass" logic determined we already translated in Step 1.
    const isNativeGeminiMatch = ocrEngine === transEngine && (ocrEngine === 'GEMINI_FLASH' || ocrEngine === 'GEMINI_3_FLASH' || ocrEngine === 'GEMINI_PRO');
    const isExplicitFull = ocrEngine === 'GEMINI_PRO_FULL' || ocrEngine === 'GEMINI_FLASH_FULL' || ocrEngine === 'GEMINI_3_FLASH_FULL';
    const alreadyTranslatedInOCR = isNativeGeminiMatch || isExplicitFull;

    if (bubbles.length > 0 && !alreadyTranslatedInOCR) {
      const geminiModel = GEMINI_MODELS[transEngine];
      bubbles = await performTranslation(bubbles, transEngine, { 
        deepLKey, 
        geminiModel, 
        googleApiKey, 
        onUsage: handleTokenUsage // Pass usage handler to translation
      });
    }

    return { bubbles, translatedImageUrl: cleanerBlob ? URL.createObjectURL(cleanerBlob) : undefined };
  };

  const processImage = async (imageObj: ProcessedImage, file: File) => {
    try {
      const base64 = await fileToBase64(file);
      // Remove data prefix if exists for API calls
      const base64Clean = base64.includes(',') ? base64.split(',')[1] : base64;

      const { bubbles, translatedImageUrl } = await runPipeline(base64Clean, file);
      
      const completedImage: ProcessedImage = { ...imageObj, base64: base64Clean, bubbles, translatedImageUrl, status: 'done' };

      setHistory(prev => prev.map(img => img.id === imageObj.id ? completedImage : img));
      setCurrentImage(prev => prev && prev.id === imageObj.id ? completedImage : prev);
    } catch (error: any) {
      console.error(`Error processing ${imageObj.fileName}:`, error);
      let errorMsg = "Falha na tradução.";
      if (error.message?.includes("429")) errorMsg = "Limite do plano excedido.";
      if (error.message?.includes("Login") || error.message?.includes("401")) {
         errorMsg = "Erro de Autenticação.";
         if (ocrEngine === 'ICHIGO') { logoutIchigo(); setShowIchigoSettings(true); }
      }
      if ((error.message?.includes("Torii") || error.message?.includes("Key") && (transEngine === 'TORII' || ocrEngine === 'TORII' || useToriiForCleaning))) {
         setShowToriiSettings(true);
      }
      if (transEngine === 'DEEPL' && error.message?.includes("DeepL")) setShowDeepLSettings(true);
      if (error.message?.includes("API Key is missing") && (ocrEngine.includes('GEMINI') || transEngine.includes('GEMINI'))) setShowGoogleSettings(true);

      const errorImage: ProcessedImage = { ...imageObj, status: 'error', errorMessage: errorMsg };
      setHistory(prev => prev.map(img => img.id === imageObj.id ? errorImage : img));
      setCurrentImage(prev => prev && prev.id === imageObj.id ? errorImage : prev);
    }
  };

  const handleRetranslate = async () => {
    if (!currentImage) return;
    const processingImage = { ...currentImage, status: 'processing' as const, bubbles: [], translatedImageUrl: undefined, maskDataUrl: undefined };
    setHistory(prev => prev.map(img => img.id === currentImage.id ? processingImage : img));
    setCurrentImage(processingImage);

    try {
      const res = await fetch(currentImage.imageUrl);
      const blob = await res.blob();
      const file = new File([blob], currentImage.fileName, { type: blob.type });
      const base64 = await fileToBase64(file);
      const base64Clean = base64.includes(',') ? base64.split(',')[1] : base64;
      processingImage.base64 = base64Clean;

      const { bubbles, translatedImageUrl } = await runPipeline(base64Clean, file);
      const doneImage = { ...processingImage, status: 'done' as const, bubbles, translatedImageUrl };
      setHistory(prev => prev.map(img => img.id === currentImage.id ? doneImage : img));
      setCurrentImage(doneImage);
    } catch (error: any) {
      const errorImage = { ...processingImage, status: 'error' as const, errorMessage: error.message || "Erro" };
      setHistory(prev => prev.map(img => img.id === currentImage.id ? errorImage : img));
      setCurrentImage(errorImage);
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

    setHistory(prev => [...newImages, ...prev]);
    setCurrentImage(newImages[0]);
    setIsSidebarOpen(false); // Auto close sidebar on mobile

    // EXECUÇÃO SEQUENCIAL (FILA)
    // Garante que a imagem 1 termina (sucesso ou erro tratado) antes de iniciar a imagem 2
    for (let i = 0; i < newImages.length; i++) {
        await processImage(newImages[i], files[i]);
    }
  };

  // Handler para carregar capítulo da biblioteca
  const handleLoadFromLibrary = (images: ProcessedImage[]) => {
    setHistory(images);
    setCurrentImage(images[0] || null);
    setIsSidebarOpen(false);
  };

  // State Updates
  const updateImageState = (id: string, partial: Partial<ProcessedImage>) => {
    setHistory(prev => prev.map(img => img.id === id ? { ...img, ...partial } : img));
    if (currentImage?.id === id) setCurrentImage(prev => prev ? { ...prev, ...partial } : null);
  };

  const handleBubbleUpdate = (bubble: TextBubble) => {
    if (!currentImage) return;
    const newBubbles = currentImage.bubbles.map(b => b.id === bubble.id ? bubble : b);
    updateImageState(currentImage.id, { bubbles: newBubbles });
  };
  
  const handleBubbleDelete = (bubbleId: string) => {
    if (!currentImage) return;
    const newBubbles = currentImage.bubbles.filter(b => b.id !== bubbleId);
    updateImageState(currentImage.id, { bubbles: newBubbles });
  };

  const handleBubbleAdd = (bubble: TextBubble) => {
    if (!currentImage) return;
    const newBubbles = [...currentImage.bubbles, bubble];
    updateImageState(currentImage.id, { bubbles: newBubbles });
  };

  const handleImageUpdate = (img: ProcessedImage) => {
    updateImageState(img.id, img);
  };

  // Navigation
  const getCurrentIndex = () => history.findIndex(img => img.id === currentImage?.id);
  const handleNext = () => {
    const idx = getCurrentIndex();
    if (idx !== -1 && idx < history.length - 1) setCurrentImage(history[idx + 1]);
  };
  const handlePrev = () => {
    const idx = getCurrentIndex();
    if (idx > 0) setCurrentImage(history[idx - 1]);
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
                 onClick={() => { setCurrentImage(item); setIsSidebarOpen(false); }}
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
                   onClick={(e) => { e.stopPropagation(); const nh = history.filter(h => h.id !== item.id); setHistory(nh); if(currentImage?.id === item.id) setCurrentImage(nh[0] || null); }}
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
                <select value={ocrEngine} onChange={(e) => setOcrEngine(e.target.value as EngineType)} className="bg-slate-800 border-none text-slate-200 text-xs rounded-md py-1 pl-2 pr-6 focus:ring-1 focus:ring-indigo-500 max-w-[140px] truncate">
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
                    onChange={(e) => setTransEngine(e.target.value as EngineType)} 
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
              <button onClick={() => setShowGoogleSettings(true)} className={`p-2 rounded-xl flex items-center justify-center border ${googleApiKey ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`} title="Google Gemini Key"><CommandLineIcon className="w-5 h-5"/></button>
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
      {showGoogleSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-6 relative animate-fade-in-up">
               <button onClick={() => setShowGoogleSettings(false)} className="absolute top-4 right-4 text-slate-400"><XMarkIcon className="w-5 h-5"/></button>
               <div className="flex items-center gap-2 mb-4">
                  <CommandLineIcon className="w-6 h-6 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">Google Gemini API</h3>
               </div>
               
               <p className="text-xs text-slate-400 mb-4">
                  Insira sua chave de API pessoal do Google AI Studio. Se deixado em branco, o sistema tentará usar a chave padrão do servidor (se configurada).
               </p>

               <div className="space-y-2 mb-4">
                  <label className="text-xs font-medium text-slate-300">API Key</label>
                  <input 
                    type="password" 
                    placeholder="AIzaSy..." 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                    value={googleApiKey} 
                    onChange={e => setGoogleApiKey(e.target.value)} 
                  />
               </div>
               
               <button onClick={saveGoogleKey} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-orange-900/20">
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