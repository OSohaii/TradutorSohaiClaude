import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  CursorArrowRaysIcon,
  ArrowsPointingOutIcon,
  PaintBrushIcon,
  EyeDropperIcon,
} from '@heroicons/react/24/outline';
import { TextBubble } from '../../types';
import { useStudioStore } from '../../store/useStudioStore';
import type { RightPanelTab, StudioTool } from '../../store/useStudioStore';

interface RightPanelProps {
  bubbles: TextBubble[];
  onClose: () => void;
  undoHistory?: { snapshots: unknown[][]; index: number } | null;
}

const tabs: { id: RightPanelTab; label: string }[] = [
  { id: 'editor', label: 'EDITOR' },
  { id: 'layers', label: 'CAMADAS' },
  { id: 'history', label: 'HISTORICO' },
];

const tools: { icon: typeof CursorArrowRaysIcon | string; label: string; toolId: StudioTool }[] = [
  { icon: 'T', label: 'Texto', toolId: 'text' },
  { icon: CursorArrowRaysIcon, label: 'Selecao', toolId: 'select' },
  { icon: ArrowsPointingOutIcon, label: 'Mover', toolId: 'move' },
  { icon: PaintBrushIcon, label: 'Pincel', toolId: 'brush' },
  { icon: 'E', label: 'Borracha', toolId: 'eraser' },
  { icon: EyeDropperIcon, label: 'Conta-gotas', toolId: 'eyedropper' },
];

const RightPanel: React.FC<RightPanelProps> = ({
  bubbles,
  onClose,
  undoHistory,
}) => {
  const activeTab = useStudioStore(s => s.activeRightTab);
  const setActiveTab = useStudioStore(s => s.setActiveRightTab);
  const selectedLayerId = useStudioStore(s => s.selectedLayerId);
  const setSelectedLayerId = useStudioStore(s => s.setSelectedLayerId);
  const activeTool = useStudioStore(s => s.activeTool);
  const setActiveTool = useStudioStore(s => s.setActiveTool);
  const setIsEditingMode = useStudioStore(s => s.setIsEditingMode);
  const setIsPaintMode = useStudioStore(s => s.setIsPaintMode);
  const overlayOpacity = useStudioStore(s => s.overlayOpacity);
  const setOverlayOpacity = useStudioStore(s => s.setOverlayOpacity);
  const [hiddenLayers, setHiddenLayers] = React.useState<Set<string>>(new Set());

  const handleToolClick = (toolId: StudioTool) => {
    setActiveTool(toolId);
    if (toolId === 'text' || toolId === 'select') {
      setIsEditingMode(true);
      setIsPaintMode(false);
    } else if (toolId === 'brush' || toolId === 'eraser') {
      setIsPaintMode(true);
      setIsEditingMode(false);
    } else {
      setIsEditingMode(false);
      setIsPaintMode(false);
    }
  };

  const toggleLayerVisibility = (id: string) => {
    setHiddenLayers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderLayerItem = (bubble: TextBubble, idx: number) => {
    const isSelected = selectedLayerId === bubble.id;
    const isHidden = hiddenLayers.has(bubble.id);
    const label = bubble.translatedText
      ? bubble.translatedText.slice(0, 20) + (bubble.translatedText.length > 20 ? '...' : '')
      : `Balao ${idx + 1}`;

    return (
      <motion.div
        key={bubble.id}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.03 }}
        onClick={() => setSelectedLayerId(bubble.id)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'bg-purple-500/15 border border-purple-500/30'
            : 'hover:bg-white/5 border border-transparent'
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(bubble.id); }}
          className={`p-0.5 rounded transition-colors pointer-events-none ${
            isHidden ? 'text-slate-600' : 'text-slate-400'
          }`}
          title="Preview apenas"
        >
          {isHidden ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <span className={`text-xs truncate block ${isHidden ? 'text-slate-600' : 'text-slate-300'}`}>
            {label}
          </span>
        </div>
        <span className="text-[9px] text-slate-600 font-mono">
          {bubble.type === 'sfx' ? 'SFX' : 'TXT'}
        </span>
      </motion.div>
    );
  };

  const renderEditorTab = () => (
    <motion.div
      key="editor"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex flex-col gap-3 p-3"
    >
      {/* Layer List */}
      <div>
        <div className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-2">
          Camadas <span className="normal-case tracking-normal text-slate-600">(preview)</span>
        </div>
        <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto scrollbar-thin">
          {bubbles.length === 0 ? (
            <p className="text-xs text-slate-600 italic px-2">Nenhum balao</p>
          ) : (
            bubbles.map((b, i) => renderLayerItem(b, i))
          )}
        </div>
      </div>

      {/* Opacity Slider */}
      <div className="border-t border-white/5 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
            Opacidade
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{overlayOpacity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={overlayOpacity}
          onChange={(e) => setOverlayOpacity(Number(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/30"
        />
      </div>

      {/* Tools Grid */}
      <div className="border-t border-white/5 pt-3">
        <div className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-2">
          Ferramentas
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {tools.map((tool, idx) => {
            const isActive = activeTool === tool.toolId;
            return (
              <button
                key={idx}
                onClick={() => handleToolClick(tool.toolId)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all group ${
                  isActive
                    ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                }`}
                title={tool.label}
              >
                {typeof tool.icon === 'string' ? (
                  <span className={`text-sm font-bold transition-colors ${isActive ? 'text-purple-300' : 'text-slate-400'}`}>
                    {tool.icon}
                  </span>
                ) : (
                  <tool.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-purple-300' : 'text-slate-400'}`} />
                )}
                <span className={`text-[8px] transition-colors ${isActive ? 'text-purple-300' : 'text-slate-500'}`}>
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const renderLayersTab = () => (
    <motion.div
      key="layers"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="flex flex-col gap-0.5 p-3 overflow-y-auto flex-1"
    >
      {bubbles.length === 0 ? (
        <p className="text-xs text-slate-600 italic px-2">Nenhuma camada</p>
      ) : (
        bubbles.map((b, i) => renderLayerItem(b, i))
      )}
    </motion.div>
  );

  const renderHistoryTab = () => {
    const entries = undoHistory?.snapshots ?? [];
    const currentIdx = undoHistory?.index ?? -1;

    return (
      <motion.div
        key="history"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="flex flex-col gap-1 p-3 overflow-y-auto flex-1"
      >
        {entries.length === 0 ? (
          <p className="text-xs text-slate-600 italic px-2">Sem historico</p>
        ) : (
          entries.map((_, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                idx === currentIdx
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : idx < currentIdx
                  ? 'text-slate-400 hover:bg-white/5'
                  : 'text-slate-600'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${
                idx === currentIdx ? 'bg-purple-400' : idx < currentIdx ? 'bg-slate-500' : 'bg-slate-700'
              }`} />
              <span>Acao {idx + 1}</span>
            </div>
          ))
        )}
      </motion.div>
    );
  };

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 260, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden md:flex flex-col h-full bg-[#0a0a0f]/95 backdrop-blur-xl border-l border-white/5 flex-shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold tracking-wide transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'editor' && renderEditorTab()}
          {activeTab === 'layers' && renderLayersTab()}
          {activeTab === 'history' && renderHistoryTab()}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};

export default RightPanel;
