
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProcessedImage, ViewMode, TextBubble } from '../types';
import BubbleOverlay from './BubbleOverlay';
import { useSessionStore } from '../store';
import { 
  MagnifyingGlassPlusIcon, 
  MagnifyingGlassMinusIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  PaintBrushIcon,
  SparklesIcon,
  SquaresPlusIcon,
  StopIcon,
  CubeTransparentIcon,
  ArrowsPointingOutIcon,
  SunIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  Bars3BottomRightIcon,
  ArrowsPointingInIcon,
  AdjustmentsVerticalIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface MangaViewerProps {
  image: ProcessedImage;
  onNext?: () => void;
  onPrev?: () => void;
  onBubbleUpdate?: (bubble: TextBubble) => void;
  onBubbleDelete?: (bubbleId: string) => void;
  onBubbleAdd?: (bubble: TextBubble) => void;
  onImageUpdate?: (image: ProcessedImage) => void;
  onToggleStrip?: () => void;
  stripMode?: boolean;
  isCleanMode?: boolean;
  defaultFont?: string;
  globalBold?: boolean;
  globalItalic?: boolean;
  globalBubbleScale?: number;
  customFonts?: FontOption[];
}

export type FontOption = { name: string; value: string; type?: 'font' };
export type FontGroup = { group: string; options: FontOption[]; type: 'group' };

export const AVAILABLE_FONTS: (FontOption | FontGroup)[] = [
  { name: 'CC Wild Words (BR)', value: '"CC Wild Words Roman BR", "CC Wild Words", "Comic Sans MS", sans-serif' },
  {
    group: 'Clássicos do Mangá',
    type: 'group',
    options: [
      { name: 'Anime Ace', value: '"Anime Ace", sans-serif' },
      { name: 'Anime Ace 2.0 BB', value: '"Anime Ace 2.0 BB", sans-serif' },
      { name: 'Manga Temple', value: '"Manga Temple", sans-serif' },
      { name: 'Komika Axis', value: '"Komika Axis", sans-serif' },
    ]
  },
  {
    group: 'Diálogos Manga',
    type: 'group',
    options: [
        { name: 'Comic Neue', value: '"Comic Neue", "Comic Sans MS", sans-serif' },
        { name: 'Kalam', value: '"Kalam", "Coming Soon", cursive' },
        { name: 'Architects Daughter', value: '"Architects Daughter", cursive' },
    ]
  },
  {
    group: 'SFX & Pincel',
    type: 'group',
    options: [
        { name: 'Permanent Marker', value: '"Permanent Marker", display' },
        { name: 'Bangers', value: '"Bangers", display' },
    ]
  },
  { name: 'Comic (Padrão)', value: '"Comic Sans MS", sans-serif' },
];

export const DEFAULT_FONT_VALUE = (AVAILABLE_FONTS[0] as FontOption).value;

const MangaViewer: React.FC<MangaViewerProps> = ({ 
  image, 
  onNext, 
  onPrev,
  onBubbleUpdate,
  onBubbleDelete,
  onBubbleAdd,
  onImageUpdate,
  onToggleStrip,
  stripMode = false,
  isCleanMode = false,
  defaultFont,
  globalBold = true,
  globalItalic = false,
  globalBubbleScale = 1.0,
  customFonts = []
}) => {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.TRANSLATED);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isAddingBubble, setIsAddingBubble] = useState(false);
  const [newBubbleStart, setNewBubbleStart] = useState<{x: number, y: number} | null>(null);
  
  const [hideBubbleBorders, setHideBubbleBorders] = useState(true);
  const [isBubbleTransparent, setIsBubbleTransparent] = useState(false);
  const [showTextStroke, setShowTextStroke] = useState(true);
  
  const [isPaintMode, setIsPaintMode] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [paintColor, setPaintColor] = useState('#FFFFFF');
  
  // Inline Edit State
  const [editingBubbleId, setEditingBubbleId] = useState<string | null>(null);
  const [calculatedFontSizes, setCalculatedFontSizes] = useState<Record<string, number>>({});

  // Bubble undo/redo lives in the session store now (B8/B9 fix in
  // PR #8). The viewer reads `canUndo`/`canRedo` reactively and calls
  // `pushSnapshot()` before each mutation. Pre-PR #8 history was
  // local `useState<TextBubble[][]>`, snapshotting only the bubbles
  // array; undo applied via per-bubble `onBubbleUpdate`, which silently
  // skipped adds and deletes. The store now snapshots the full bubbles
  // array per image and `undoBubbles` replaces it wholesale, so adds
  // and deletes are reversible.
  const pushSnapshot = useSessionStore(s => s.pushBubbleSnapshot);
  const undoBubbles = useSessionStore(s => s.undoBubbles);
  const redoBubbles = useSessionStore(s => s.redoBubbles);
  const canUndo = useSessionStore(s => {
    const cur = s.currentImage;
    if (!cur || cur.id !== image.id) return false;
    const entry = s.bubbleHistory[image.id];
    return !!entry && entry.index > 0;
  });
  const canRedo = useSessionStore(s => {
    const cur = s.currentImage;
    if (!cur || cur.id !== image.id) return false;
    const entry = s.bubbleHistory[image.id];
    return !!entry && entry.index < entry.snapshots.length - 1;
  });

  const [copiedStyle, setCopiedStyle] = useState<Partial<TextBubble> | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDrawing = useRef(false);

  const isFullServerResult = !!image.translatedImageUrl && image.bubbles.length === 0;
  const hasOverlays = image.bubbles.length > 0;
  const activeImageUrl = (viewMode === ViewMode.TRANSLATED && image.translatedImageUrl) ? image.translatedImageUrl : image.imageUrl;

  const allFonts = useMemo(() => {
    if (customFonts.length === 0) return AVAILABLE_FONTS;
    return [...customFonts, ...AVAILABLE_FONTS];
  }, [customFonts]);

  const activeBubble = useMemo(() => 
    image.bubbles.find(b => b.id === editingBubbleId), 
  [image.bubbles, editingBubbleId]);

  // Índice do balão atual para navegação
  const currentBubbleIndex = useMemo(() => 
    image.bubbles.findIndex(b => b.id === editingBubbleId),
  [image.bubbles, editingBubbleId]);

  // Navegação entre balões
  const navigateBubble = (direction: 'next' | 'prev') => {
    if (image.bubbles.length === 0) return;
    
    let newIndex: number;
    if (currentBubbleIndex === -1) {
      newIndex = direction === 'next' ? 0 : image.bubbles.length - 1;
    } else {
      newIndex = direction === 'next' 
        ? (currentBubbleIndex + 1) % image.bubbles.length
        : (currentBubbleIndex - 1 + image.bubbles.length) % image.bubbles.length;
    }
    setEditingBubbleId(image.bubbles[newIndex].id);
  };

  // Salvar estado para undo (delegado ao store; preserva o nome local
  // para minimizar churn nos call sites do toolbar).
  const saveToHistory = () => {
    pushSnapshot();
  };

  // Undo / Redo: thin wrappers ao redor do store (que substitui
  // `image.bubbles` por completo, então add/delete são reversíveis).
  const handleUndo = () => {
    undoBubbles();
  };

  const handleRedo = () => {
    redoBubbles();
  };

  // Copiar estilo do balão atual
  const copyStyle = () => {
    if (activeBubble) {
      setCopiedStyle({
        fontFamily: activeBubble.fontFamily,
        fontSize: activeBubble.fontSize,
        fontWeight: activeBubble.fontWeight,
        fontStyle: activeBubble.fontStyle,
        textAlign: activeBubble.textAlign,
        color: activeBubble.color,
        scale: activeBubble.scale,
        lineHeight: activeBubble.lineHeight,
      });
    }
  };

  // Colar estilo no balão atual
  const pasteStyle = () => {
    if (activeBubble && copiedStyle && onBubbleUpdate) {
      saveToHistory();
      onBubbleUpdate({ ...activeBubble, ...copiedStyle });
    }
  };

  // Fechar edição com ESC e outros atalhos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC - Fechar edição ou cancelar criação de balão
      if (e.key === 'Escape') {
        if (isAddingBubble) {
          setIsAddingBubble(false);
          setNewBubbleStart(null);
          return;
        }
        if (editingBubbleId) {
          setEditingBubbleId(null);
          return;
        }
      }

      // Atalhos que funcionam quando um balão está selecionado
      if (activeBubble && onBubbleUpdate) {
        // Ctrl+B - Negrito
        if (e.ctrlKey && e.key === 'b') {
          e.preventDefault();
          saveToHistory();
          onBubbleUpdate({ 
            ...activeBubble, 
            fontWeight: activeBubble.fontWeight === 'bold' ? 'normal' : 'bold' 
          });
          return;
        }

        // Ctrl+I - Itálico
        if (e.ctrlKey && e.key === 'i') {
          e.preventDefault();
          saveToHistory();
          onBubbleUpdate({ 
            ...activeBubble, 
            fontStyle: activeBubble.fontStyle === 'italic' ? 'normal' : 'italic' 
          });
          return;
        }

        // Delete ou Backspace - Deletar balão (quando não está editando texto)
        if ((e.key === 'Delete' || e.key === 'Backspace') && !document.activeElement?.tagName.match(/INPUT|TEXTAREA/i)) {
          e.preventDefault();
          if (onBubbleDelete) {
            saveToHistory();
            onBubbleDelete(activeBubble.id);
            setEditingBubbleId(null);
          }
          return;
        }

        // + ou = - Aumentar fonte
        if ((e.key === '+' || e.key === '=') && !e.ctrlKey) {
          e.preventDefault();
          const currentSize = activeBubble.fontSize || calculatedFontSizes[activeBubble.id] || 14;
          saveToHistory();
          onBubbleUpdate({ ...activeBubble, fontSize: Math.min(currentSize + 2, 120) });
          return;
        }

        // - Diminuir fonte
        if (e.key === '-' && !e.ctrlKey) {
          e.preventDefault();
          const currentSize = activeBubble.fontSize || calculatedFontSizes[activeBubble.id] || 14;
          saveToHistory();
          onBubbleUpdate({ ...activeBubble, fontSize: Math.max(currentSize - 2, 6) });
          return;
        }

        // Ctrl+Shift+C - Copiar estilo
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          e.preventDefault();
          copyStyle();
          return;
        }

        // Ctrl+Shift+V - Colar estilo
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
          e.preventDefault();
          pasteStyle();
          return;
        }
      }

      // Tab / Shift+Tab - Navegação entre balões (funciona no modo edição)
      if (e.key === 'Tab' && isEditingMode) {
        e.preventDefault();
        navigateBubble(e.shiftKey ? 'prev' : 'next');
        return;
      }

      // Ctrl+Z - Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Shift+Z ou Ctrl+Y - Redo
      if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingBubbleId, activeBubble, isEditingMode, onBubbleUpdate, onBubbleDelete, calculatedFontSizes, copiedStyle, undoBubbles, redoBubbles]);

  useEffect(() => {
    setZoom(1);
    setIsEditingMode(false); 
    setIsPaintMode(false);
    setEditingBubbleId(null);
  }, [image.id]);

  useEffect(() => {
    if (isFullServerResult || stripMode) return; 
    const canvas = canvasRef.current;
    const img = imgRef.current;
    
    if (canvas && img && image.status === 'done') {
      const initCanvas = () => {
        if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
             canvas.width = img.naturalWidth;
             canvas.height = img.naturalHeight;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (image.maskDataUrl) {
            const maskImg = new Image();
            maskImg.onload = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(maskImg, 0, 0);
            };
            maskImg.src = image.maskDataUrl;
          } else {
             ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      };
      if (img.complete) initCanvas();
      else img.onload = initCanvas;
    }
  }, [image.id, image.status, image.maskDataUrl, isFullServerResult, stripMode]);

  const startEditingBubble = (bubble: TextBubble | null) => {
    setEditingBubbleId(bubble ? bubble.id : null);
  };

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaintMode) return;
    isDrawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
       const { x, y } = getCoords(e);
       ctx.beginPath(); ctx.moveTo(x, y); ctx.strokeStyle = paintColor; ctx.lineWidth = brushSize; ctx.lineCap = 'round'; ctx.lineTo(x, y); ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPaintMode || !isDrawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { const { x, y } = getCoords(e); ctx.lineTo(x, y); ctx.stroke(); }
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
      if (canvasRef.current && onImageUpdate) onImageUpdate({ ...image, maskDataUrl: canvasRef.current.toDataURL() });
    }
  };

  // Funções para criar novo balão
  const handleAddBubbleStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingBubble) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1000;
    const y = ((e.clientY - rect.top) / rect.height) * 1000;
    
    setNewBubbleStart({ x, y });
  };

  const handleAddBubbleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Podemos adicionar preview visual aqui se necessário
  };

  const handleAddBubbleEnd = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingBubble || !newBubbleStart || !onBubbleAdd) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const endX = ((e.clientX - rect.left) / rect.width) * 1000;
    const endY = ((e.clientY - rect.top) / rect.height) * 1000;
    
    // Verificar tamanho mínimo
    const minSize = 30;
    const width = Math.abs(endX - newBubbleStart.x);
    const height = Math.abs(endY - newBubbleStart.y);
    
    if (width < minSize || height < minSize) {
      // Criar balão padrão se área muito pequena
      const newBubble: TextBubble = {
        id: `bubble-${Date.now()}`,
        originalText: '',
        translatedText: 'Texto aqui',
        box: {
          xmin: Math.max(0, newBubbleStart.x - 50),
          ymin: Math.max(0, newBubbleStart.y - 30),
          xmax: Math.min(1000, newBubbleStart.x + 50),
          ymax: Math.min(1000, newBubbleStart.y + 30),
        },
        type: 'dialogue'
      };
      saveToHistory();
      onBubbleAdd(newBubble);
      setEditingBubbleId(newBubble.id);
    } else {
      // Criar balão com área desenhada
      const newBubble: TextBubble = {
        id: `bubble-${Date.now()}`,
        originalText: '',
        translatedText: 'Texto aqui',
        box: {
          xmin: Math.min(newBubbleStart.x, endX),
          ymin: Math.min(newBubbleStart.y, endY),
          xmax: Math.max(newBubbleStart.x, endX),
          ymax: Math.max(newBubbleStart.y, endY),
        },
        type: 'dialogue'
      };
      saveToHistory();
      onBubbleAdd(newBubble);
      setEditingBubbleId(newBubble.id);
    }
    
    setIsAddingBubble(false);
    setNewBubbleStart(null);
    setIsEditingMode(true);
  };

  const handleDownload = async () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pre-load all fonts used by bubbles
    const uniqueFonts = [...new Set(image.bubbles.map(b => b.fontFamily || defaultFont || 'sans-serif'))];
    await Promise.all(uniqueFonts.map(f => document.fonts.load(`bold 16px ${f}`).catch(() => {})));
    await document.fonts.ready;

    // 1. Draw base image
    ctx.drawImage(img, 0, 0);

    // 2. Draw mask/paint layer
    if (canvasRef.current) {
      ctx.drawImage(canvasRef.current, 0, 0);
    }

    // Helper: draw rounded rect using arc (no roundRect for compat)
    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    // 3. Draw bubbles
    for (const bubble of image.bubbles) {
      const bWidth = (bubble.box.xmax - bubble.box.xmin) / 1000 * canvas.width;
      const bHeight = (bubble.box.ymax - bubble.box.ymin) / 1000 * canvas.height;
      const bx = bubble.box.xmin / 1000 * canvas.width;
      const by = bubble.box.ymin / 1000 * canvas.height;

      const bubbleScale = bubble.scale ?? globalBubbleScale;
      const sWidth = bWidth * bubbleScale;
      const sHeight = bHeight * bubbleScale;
      const sx = bx + (bWidth - sWidth) / 2;
      const sy = by + (bHeight - sHeight) / 2;

      const centerX = sx + sWidth / 2;
      const centerY = sy + sHeight / 2;
      const rot = (bubble.rotation || 0) * Math.PI / 180;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rot);

      // Draw background
      if (!isBubbleTransparent && bubble.type !== 'sfx') {
        ctx.fillStyle = 'white';
        drawRoundedRect(-sWidth / 2, -sHeight / 2, sWidth, sHeight, 10);
        ctx.fill();
      }

      // Text properties
      const bFontSize = bubble.fontSize || calculatedFontSizes[bubble.id] || 14;
      const bFont = bubble.fontFamily || defaultFont || 'sans-serif';
      const bWeight = bubble.fontWeight || (globalBold ? 'bold' : 'normal');
      const bStyle = bubble.fontStyle || (globalItalic ? 'italic' : 'normal');
      const bColor = bubble.color || '#000000';
      const bLineHeight = (bubble.lineHeight || 1.15) * bFontSize;
      const shouldUpper = bFont.includes("CC Wild Words Roman BR") || bFont.includes("Anime Ace BR");

      ctx.font = `${bStyle} ${bWeight} ${bFontSize}px ${bFont}`;
      ctx.textAlign = (bubble.textAlign || 'center') as CanvasTextAlign;
      ctx.textBaseline = 'middle';

      // Apply textTransform
      let text = bubble.translatedText;
      if (shouldUpper) text = text.toUpperCase();

      // Word wrap
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      const maxLineWidth = sWidth * 0.9;
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(testLine).width > maxLineWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      const totalTextHeight = lines.length * bLineHeight;
      const textStartY = -totalTextHeight / 2 + bLineHeight / 2;
      const textX = bubble.textAlign === 'left' ? -sWidth * 0.45
                   : bubble.textAlign === 'right' ? sWidth * 0.45
                   : 0;

      // Draw text-shadow (4 offsets to replicate CSS text-shadow)
      const shadowOffset = 1;
      ctx.fillStyle = '#ffffff';
      for (const [dx, dy] of [[-shadowOffset, -shadowOffset], [shadowOffset, -shadowOffset], [-shadowOffset, shadowOffset], [shadowOffset, shadowOffset]] as [number, number][]) {
        let lineY = textStartY;
        for (const line of lines) {
          ctx.fillText(line.trim(), textX + dx, lineY + dy);
          lineY += bLineHeight;
        }
      }

      // Draw main text
      ctx.fillStyle = bColor;
      let lineY = textStartY;
      for (const line of lines) {
        ctx.fillText(line.trim(), textX, lineY);
        lineY += bLineHeight;
      }

      ctx.restore();
    }

    const link = document.createElement('a');
    link.download = `traducao_${image.fileName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={`flex flex-col h-full ${stripMode ? '' : 'bg-slate-900 rounded-lg border border-slate-700 shadow-2xl overflow-hidden'} relative`}>
      
      {!stripMode && !isCleanMode && (
        <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3 md:px-4 sticky top-0 z-50">
          <div className="flex items-center space-x-2">
             <button onClick={onPrev} disabled={!onPrev} className={`p-1.5 rounded-lg transition-colors ${onPrev ? 'text-white hover:bg-slate-700' : 'text-slate-600'}`}>
               <ChevronLeftIcon className="w-5 h-5" />
             </button>
             <button onClick={onNext} disabled={!onNext} className={`p-1.5 rounded-lg transition-colors ${onNext ? 'text-white hover:bg-slate-700' : 'text-slate-600'}`}>
               <ChevronRightIcon className="w-5 h-5" />
             </button>
             <div className="h-6 w-px bg-slate-600 mx-1 hidden sm:block"></div>
             <span className={`text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded ${image.status === 'done' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {image.status === 'done' ? (isFullServerResult ? 'IMG' : 'OCR') : '...'}
             </span>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {image.status === 'done' && hasOverlays && (
              <>
                <button onClick={handleDownload} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg" title="Baixar Página Traduzida">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-slate-700 mx-1"></div>
                <button onClick={() => { setIsPaintMode(!isPaintMode); setIsEditingMode(false); setIsAddingBubble(false); }} className={`p-2 rounded-lg ${isPaintMode ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`} title="Pintar (Whiteout)">
                  <PaintBrushIcon className="w-5 h-5" />
                </button>
                <button onClick={() => { setIsEditingMode(!isEditingMode); setIsPaintMode(false); setIsAddingBubble(false); }} className={`p-2 rounded-lg ${isEditingMode ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`} title="Manipulação Direta">
                  <PencilSquareIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { setIsAddingBubble(!isAddingBubble); setIsPaintMode(false); setIsEditingMode(false); }} 
                  className={`p-2 rounded-lg ${isAddingBubble ? 'bg-green-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`} 
                  title="Adicionar Balão (clique na imagem)"
                >
                  <SquaresPlusIcon className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                  <button onClick={() => setHideBubbleBorders(!hideBubbleBorders)} className={`p-1.5 rounded-md ${hideBubbleBorders ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-white'}`} title="Ocultar Bordas">
                    <StopIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsBubbleTransparent(!isBubbleTransparent)} className={`p-1.5 rounded-md ${isBubbleTransparent ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-white'}`} title="Fundo Transparente">
                    <CubeTransparentIcon className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
            
            <div className="h-6 w-px bg-slate-600 mx-1 hidden sm:block"></div>

            <button onClick={() => setViewMode(prev => prev === ViewMode.TRANSLATED ? ViewMode.ORIGINAL : ViewMode.TRANSLATED)} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg">
               {viewMode === ViewMode.TRANSLATED ? <EyeIcon className="w-5 h-5"/> : <EyeSlashIcon className="w-5 h-5"/>}
            </button>
            
            <div className="flex items-center hidden md:flex">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg"><MagnifyingGlassMinusIcon className="w-4 h-4" /></button>
              <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg"><MagnifyingGlassPlusIcon className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      <div 
        ref={containerRef}
        className={`flex-1 relative bg-slate-950 ${stripMode ? '' : 'overflow-auto flex justify-center items-start p-4 scrollbar-hide'}`}
      >
        {/* Overlay para capturar cliques fora - fecha edição */}
        {editingBubbleId && (
          <div 
            className="absolute inset-0 z-[15]" 
            onClick={() => setEditingBubbleId(null)}
          />
        )}
        
        <div 
          className="relative transition-transform duration-200 ease-out origin-top z-[20]"
          style={{ 
            width: stripMode ? '100%' : (image.status === 'done' ? 'auto' : '100%'), 
            maxWidth: stripMode ? '100%' : '1200px',
            transform: stripMode ? 'none' : `scale(${zoom})`,
          }}
        >
          <img 
            ref={imgRef}
            src={activeImageUrl} 
            alt="Manga Page" 
            className="w-full h-auto shadow-2xl select-none"
            style={{ display: 'block' }}
            onClick={() => editingBubbleId && setEditingBubbleId(null)}
          />

          {/* Overlay para adicionar novo balão */}
          {isAddingBubble && image.status === 'done' && (
            <div 
              className="absolute inset-0 z-30 cursor-crosshair"
              onMouseDown={handleAddBubbleStart}
              onMouseMove={handleAddBubbleMove}
              onMouseUp={handleAddBubbleEnd}
              style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
                Clique para adicionar um balão
              </div>
            </div>
          )}

          {image.status === 'done' && !isFullServerResult && !stripMode && (
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
              className={`absolute inset-0 z-10 w-full h-full ${isPaintMode ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
            />
          )}

          {image.status === 'done' && hasOverlays && (
            <div 
              className={`absolute inset-0 w-full h-full z-20 ${isPaintMode ? 'pointer-events-none opacity-40' : ''}`}
              onClick={(e) => {
                // Fecha edição se clicou no container (não em um balão)
                if (e.target === e.currentTarget && editingBubbleId) {
                  setEditingBubbleId(null);
                }
              }}
            >
              {image.bubbles.map(bubble => {
                const isVisible = (viewMode === ViewMode.TRANSLATED) || isEditingMode;
                if (!isVisible) return null;

                return (
                  <BubbleOverlay 
                    key={bubble.id} 
                    bubble={bubble} 
                    isEditing={isEditingMode && !stripMode} 
                    activeEditingId={editingBubbleId}
                    hideBorder={hideBubbleBorders}
                    isTransparent={isBubbleTransparent}
                    onUpdate={onBubbleUpdate}
                    onEditStart={startEditingBubble}
                    onDelete={onBubbleDelete}
                    defaultFont={defaultFont}
                    enableTextStroke={showTextStroke}
                    globalBold={globalBold}
                    globalItalic={globalItalic}
                    globalBubbleScale={globalBubbleScale}
                    onFontSizeCalculated={(size) => setCalculatedFontSizes(prev => ({...prev, [bubble.id]: size}))}
                    fontSizeCalculatedValue={calculatedFontSizes[bubble.id]}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Unified Toolbar */}
      {activeBubble && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-3 rounded-2xl shadow-2xl animate-fade-in-up max-w-[95vw]"
          onMouseDown={(e) => e.stopPropagation()} 
          onClick={(e) => e.stopPropagation()}
        >
           {/* Header com navegação e botão de fechar */}
           <div className="flex items-center justify-between mb-3 gap-4">
             <div className="flex items-center gap-2">
                {/* Navegação entre balões */}
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                  <button 
                    onClick={() => navigateBubble('prev')}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    title="Balão anterior (Shift+Tab)"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-indigo-400 font-mono px-2">
                    {currentBubbleIndex + 1}/{image.bubbles.length}
                  </span>
                  <button 
                    onClick={() => navigateBubble('next')}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                    title="Próximo balão (Tab)"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
                
                <span className="text-xs font-bold text-white">Editar Balão</span>
                <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-2 py-0.5 rounded-md font-mono">
                   {activeBubble.fontSize || (calculatedFontSizes[activeBubble.id] ? Math.round(calculatedFontSizes[activeBubble.id]) : 'Auto')}px
                </span>
             </div>
             
             <div className="flex items-center gap-1">
                {/* Copiar/Colar estilo */}
                <button 
                  onClick={copyStyle}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Copiar estilo (Ctrl+Shift+C)"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={pasteStyle}
                  disabled={!copiedStyle}
                  className={`p-1.5 rounded-lg transition-colors ${copiedStyle ? 'text-indigo-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
                  title="Colar estilo (Ctrl+Shift+V)"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
                
                {/* Undo/Redo */}
                <div className="w-px h-4 bg-slate-700 mx-1" />
                <button 
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`p-1.5 rounded-lg transition-colors ${canUndo ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
                  title="Desfazer (Ctrl+Z)"
                >
                  <ArrowUturnLeftIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`p-1.5 rounded-lg transition-colors ${canRedo ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
                  title="Refazer (Ctrl+Shift+Z)"
                >
                  <ArrowUturnRightIcon className="w-4 h-4" />
                </button>
                
                <div className="w-px h-4 bg-slate-700 mx-1" />
                <button 
                  onClick={() => startEditingBubble(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="Fechar (ESC)"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
             </div>
           </div>

           {/* Linha 1: Fonte, Tamanho, Cor, B/I */}
           <div className="flex items-center gap-2 flex-wrap mb-2">
              {/* Fonte */}
              <select 
                value={activeBubble.fontFamily || defaultFont} 
                onChange={(e) => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, fontFamily: e.target.value }); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 max-w-[130px]"
              >
                {allFonts.map((font, idx) => {
                  if ('group' in font) return (
                    <optgroup key={idx} label={font.group}>
                      {font.options.map((opt, subIdx) => (
                        <option key={`${idx}-${subIdx}`} value={opt.value}>{opt.name}</option>
                      ))}
                    </optgroup>
                  );
                  return <option key={idx} value={font.value}>{font.name}</option>;
                })}
              </select>
              
              {/* Tamanho com botões +/- */}
              <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700">
                <button 
                  onClick={() => {
                    const currentSize = activeBubble.fontSize || calculatedFontSizes[activeBubble.id] || 14;
                    saveToHistory();
                    onBubbleUpdate && onBubbleUpdate({ ...activeBubble, fontSize: Math.max(currentSize - 2, 6) });
                  }}
                  className="px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-l-lg"
                  title="Diminuir fonte (-)"
                >
                  <MinusIcon className="w-3 h-3" />
                </button>
                <input 
                  type="number" 
                  value={activeBubble.fontSize || ''} 
                  onChange={(e) => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, fontSize: parseInt(e.target.value) || undefined }); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Auto"
                  className="w-12 bg-transparent text-white text-xs text-center border-x border-slate-700 py-1.5"
                />
                <button 
                  onClick={() => {
                    const currentSize = activeBubble.fontSize || calculatedFontSizes[activeBubble.id] || 14;
                    saveToHistory();
                    onBubbleUpdate && onBubbleUpdate({ ...activeBubble, fontSize: Math.min(currentSize + 2, 120) });
                  }}
                  className="px-2 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-r-lg"
                  title="Aumentar fonte (+)"
                >
                  <PlusIcon className="w-3 h-3" />
                </button>
              </div>

              {/* Separador */}
              <div className="w-px h-6 bg-slate-700" />

              {/* Cor do texto */}
              <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg border border-slate-700 px-2 py-1">
                <span className="text-[10px] text-slate-500">Cor</span>
                <input 
                  type="color"
                  value={activeBubble.color || '#000000'}
                  onChange={(e) => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, color: e.target.value }); }}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  title="Cor do texto"
                />
              </div>

              {/* Separador */}
              <div className="w-px h-6 bg-slate-700" />

              {/* Negrito/Itálico */}
              <div className="flex bg-slate-800 rounded-lg border border-slate-700">
                <button 
                  onClick={() => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, fontWeight: activeBubble.fontWeight === 'bold' ? 'normal' : 'bold' }); }}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-l-lg transition-colors ${activeBubble.fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Negrito (Ctrl+B)"
                >
                  B
                </button>
                <button 
                  onClick={() => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, fontStyle: activeBubble.fontStyle === 'italic' ? 'normal' : 'italic' }); }}
                  className={`px-2.5 py-1.5 text-xs italic font-serif rounded-r-lg border-l border-slate-700 transition-colors ${activeBubble.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Itálico (Ctrl+I)"
                >
                  I
                </button>
              </div>

              {/* Separador */}
              <div className="w-px h-6 bg-slate-700" />

              {/* Deletar */}
              <button 
                onClick={() => { 
                  if(window.confirm('Deletar este balão?')) { 
                    saveToHistory();
                    onBubbleDelete && onBubbleDelete(activeBubble.id); 
                    startEditingBubble(null); 
                  }
                }}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                title="Deletar balão (Delete)"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
           </div>

           {/* Linha 2: Alinhamento, Escala, Line Height, Rotação */}
           <div className="flex items-center gap-2 flex-wrap">
              {/* Alinhamento Horizontal */}
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700 p-1">
                <span className="text-[9px] text-slate-500 px-1">Alin.</span>
                {(['left', 'center', 'right'] as const).map(align => (
                  <button 
                    key={align}
                    onClick={() => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, textAlign: align }); }}
                    className={`p-1 rounded transition-colors ${activeBubble.textAlign === align || (!activeBubble.textAlign && align === 'center') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    title={align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
                  >
                    {align === 'left' ? <Bars3BottomLeftIcon className="w-3.5 h-3.5"/> : align === 'center' ? <Bars3Icon className="w-3.5 h-3.5"/> : <Bars3BottomRightIcon className="w-3.5 h-3.5"/>}
                  </button>
                ))}
              </div>

              {/* Separador */}
              <div className="w-px h-6 bg-slate-700" />

              {/* Escala */}
              <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg border border-slate-700 px-2 py-1">
                <span className="text-[10px] text-slate-500">Escala</span>
                <input 
                  type="range" min="0.5" max="1.5" step="0.05"
                  value={activeBubble.scale || 1}
                  onMouseDown={(e) => e.stopPropagation()}
                  onInput={(e) => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, scale: parseFloat((e.target as HTMLInputElement).value) }); }}
                  className="w-14 h-1 bg-slate-700 rounded-lg appearance-none accent-indigo-500"
                />
                <span className="text-[10px] text-indigo-400 w-8">{Math.round((activeBubble.scale || 1) * 100)}%</span>
              </div>

              {/* Separador */}
              <div className="w-px h-6 bg-slate-700" />

              {/* Line Height */}
              <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg border border-slate-700 px-2 py-1">
                <span className="text-[10px] text-slate-500">Linha</span>
                <input 
                  type="range" min="0.8" max="2" step="0.1"
                  value={activeBubble.lineHeight || 1.15}
                  onMouseDown={(e) => e.stopPropagation()}
                  onInput={(e) => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, lineHeight: parseFloat((e.target as HTMLInputElement).value) }); }}
                  className="w-12 h-1 bg-slate-700 rounded-lg appearance-none accent-indigo-500"
                />
                <span className="text-[10px] text-indigo-400 w-6">{(activeBubble.lineHeight || 1.15).toFixed(1)}</span>
              </div>

              {/* Separador */}
              <div className="w-px h-6 bg-slate-700" />

              {/* Rotação */}
              <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg border border-slate-700 px-2 py-1">
                <span className="text-[10px] text-slate-500">Rot.</span>
                <input 
                  type="range" min="-45" max="45" step="1"
                  value={activeBubble.rotation || 0}
                  onMouseDown={(e) => e.stopPropagation()}
                  onInput={(e) => { saveToHistory(); onBubbleUpdate && onBubbleUpdate({ ...activeBubble, rotation: parseInt((e.target as HTMLInputElement).value) }); }}
                  className="w-12 h-1 bg-slate-700 rounded-lg appearance-none accent-indigo-500"
                />
                <span className="text-[10px] text-indigo-400 w-6">{activeBubble.rotation || 0}°</span>
              </div>
           </div>

           {/* Dica */}
           <p className="text-[10px] text-slate-600 mt-2 text-center">
             Tab/Shift+Tab: navegar • Ctrl+B/I: estilo • +/-: fonte • Delete: remover • ESC: fechar
           </p>
        </div>
      )}
    </div>
  );
};

export default MangaViewer;
