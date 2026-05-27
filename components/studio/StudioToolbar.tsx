import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  ViewColumnsIcon,
  Square3Stack3DIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  PencilSquareIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import { ProcessedImage } from '../../types';
import { useStudioStore } from '../../store/useStudioStore';

interface StudioToolbarProps {
  currentImage: ProcessedImage | null;
  onGoToLibrary: () => void;
  onGoToReader: () => void;
  onOpenSettings: () => void;
  onOpenFonts: () => void;
  onTogglePagesPanel: () => void;
  onToggleRightPanel: () => void;
  onRetranslate: () => void;
  onTranslateImage: (id: string) => void;
  pagesPanelOpen: boolean;
  rightPanelOpen: boolean;
  hasDonePages: boolean;
}

const StudioToolbar: React.FC<StudioToolbarProps> = ({
  currentImage,
  onGoToLibrary,
  onGoToReader,
  onOpenSettings,
  onOpenFonts,
  onTogglePagesPanel,
  onToggleRightPanel,
  onRetranslate,
  onTranslateImage,
  pagesPanelOpen,
  rightPanelOpen,
  hasDonePages,
}) => {
  const zoom = useStudioStore(s => s.zoom);
  const setZoom = useStudioStore(s => s.setZoom);
  const isEditingMode = useStudioStore(s => s.isEditingMode);
  const setIsEditingMode = useStudioStore(s => s.setIsEditingMode);
  const isPaintMode = useStudioStore(s => s.isPaintMode);
  const setIsPaintMode = useStudioStore(s => s.setIsPaintMode);

  return (
    <header className="h-11 flex items-center justify-between px-3 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl flex-shrink-0">
      {/* Left: Back + Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGoToLibrary}
          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          title="Voltar"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </motion.button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-500 truncate">
          <span className="hover:text-slate-300 cursor-pointer transition-colors" onClick={onGoToLibrary}>
            Projetos
          </span>
          <ChevronRightIcon className="w-3 h-3 flex-shrink-0" />
          <span className="text-slate-300 truncate max-w-[160px] font-medium">
            {currentImage?.fileName || 'Studio'}
          </span>
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Zoom Controls */}
        <div className="hidden md:flex items-center gap-0.5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            title="Zoom out"
          >
            <MagnifyingGlassMinusIcon className="w-3.5 h-3.5" />
          </motion.button>
          <span className="text-[10px] font-mono text-slate-400 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            title="Zoom in"
          >
            <MagnifyingGlassPlusIcon className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        {/* Mode Toggles */}
        <div className="hidden md:flex items-center gap-0.5 ml-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setIsEditingMode(!isEditingMode); setIsPaintMode(false); }}
            className={`p-1.5 rounded-lg transition-all ${
              isEditingMode
                ? 'bg-purple-500/15 text-purple-400'
                : 'hover:bg-white/5 text-slate-400 hover:text-white'
            }`}
            title="Modo Edicao"
          >
            <PencilSquareIcon className="w-3.5 h-3.5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setIsPaintMode(!isPaintMode); setIsEditingMode(false); }}
            className={`p-1.5 rounded-lg transition-all ${
              isPaintMode
                ? 'bg-purple-500/15 text-purple-400'
                : 'hover:bg-white/5 text-slate-400 hover:text-white'
            }`}
            title="Modo Pintura"
          >
            <PaintBrushIcon className="w-3.5 h-3.5" />
          </motion.button>
        </div>

        <div className="hidden md:block w-px h-5 bg-white/5 mx-1" />

        {/* Retranslate All */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetranslate}
          className="hidden md:inline-flex px-2 py-1 items-center gap-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-purple-400 transition-colors text-[10px] font-medium"
          title="Retraduzir tudo"
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          Retraduzir
        </motion.button>

        {/* Translate current image */}
        {currentImage && currentImage.status === 'ocr-done' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onTranslateImage(currentImage.id)}
            className="hidden md:inline-flex px-2 py-1 items-center gap-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-colors text-[10px] font-medium border border-purple-500/20"
            title="Traduzir esta imagem"
          >
            Traduzir
          </motion.button>
        )}

        {/* Toggle panels - hidden below md since panels use hidden md:flex */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTogglePagesPanel}
          className={`hidden md:inline-flex p-1.5 rounded-lg transition-all ${
            pagesPanelOpen
              ? 'bg-purple-500/15 text-purple-400'
              : 'hover:bg-white/5 text-slate-400 hover:text-white'
          }`}
          title="Painel de paginas"
        >
          <Square3Stack3DIcon className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleRightPanel}
          className={`hidden md:inline-flex p-1.5 rounded-lg transition-all ${
            rightPanelOpen
              ? 'bg-purple-500/15 text-purple-400'
              : 'hover:bg-white/5 text-slate-400 hover:text-white'
          }`}
          title="Painel de edicao"
        >
          <ViewColumnsIcon className="w-4 h-4" />
        </motion.button>

        {hasDonePages && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onGoToReader}
            className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-[10px] font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/20 flex items-center gap-1"
          >
            <BookOpenIcon className="w-3.5 h-3.5" />
            Ler
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenFonts}
          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          title="Fontes"
        >
          <span className="text-xs font-bold leading-none">Aa</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          title="Configuracoes"
        >
          <Cog6ToothIcon className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
};

export default StudioToolbar;
