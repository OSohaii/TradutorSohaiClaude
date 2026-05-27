import React from 'react';
import { TextBubble } from '../types';
import { FontOption, FontGroup } from './MangaViewer';
import {
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface BatchBubbleToolbarProps {
  selectedIds: string[];
  bubbles: TextBubble[];
  allFonts: (FontOption | FontGroup)[];
  onUpdate: (bubble: TextBubble) => void;
  onDelete: (bubbleId: string) => void;
  onClear: () => void;
  pushSnapshot: () => void;
}

const BatchBubbleToolbar: React.FC<BatchBubbleToolbarProps> = ({
  selectedIds,
  bubbles,
  allFonts,
  onUpdate,
  onDelete,
  onClear,
  pushSnapshot,
}) => {
  const selectedBubbles = bubbles.filter((b) => selectedIds.includes(b.id));

  const flatFonts = allFonts.flatMap((item) =>
    'group' in item ? item.options : [item],
  );

  const applyToAll = (updater: (b: TextBubble) => TextBubble) => {
    pushSnapshot();
    selectedBubbles.forEach((b) => {
      onUpdate(updater(b));
    });
  };

  const handleFontChange = (value: string) => {
    applyToAll((b) => ({ ...b, fontFamily: value }));
  };

  const handleBoldToggle = () => {
    const allBold = selectedBubbles.every((b) => b.fontWeight === 'bold');
    const newWeight = allBold ? 'normal' : 'bold';
    applyToAll((b) => ({ ...b, fontWeight: newWeight }));
  };

  const handleItalicToggle = () => {
    const allItalic = selectedBubbles.every((b) => b.fontStyle === 'italic');
    const newStyle = allItalic ? 'normal' : 'italic';
    applyToAll((b) => ({ ...b, fontStyle: newStyle }));
  };

  const handleFontSizeChange = (delta: number) => {
    applyToAll((b) => ({ ...b, fontSize: (b.fontSize || 14) + delta }));
  };

  const handleDeleteAll = () => {
    pushSnapshot();
    selectedIds.forEach((id) => onDelete(id));
    onClear();
  };

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl px-4 py-2 flex items-center gap-3">
      <span className="text-xs text-slate-400 font-medium">
        {selectedIds.length} selecionados
      </span>

      <div className="h-5 w-px bg-slate-600" />

      {/* Font selector */}
      <select
        onChange={(e) => handleFontChange(e.target.value)}
        className="bg-slate-900 border border-slate-700 text-white text-xs rounded px-2 py-1 max-w-[120px]"
        defaultValue=""
      >
        <option value="" disabled>
          Fonte
        </option>
        {flatFonts.map((f) => (
          <option key={f.value} value={f.value}>
            {f.name}
          </option>
        ))}
      </select>

      {/* Bold */}
      <button
        onClick={handleBoldToggle}
        className="px-2 py-1 text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 rounded"
        title="Bold"
      >
        B
      </button>

      {/* Italic */}
      <button
        onClick={handleItalicToggle}
        className="px-2 py-1 text-xs italic text-white bg-slate-700 hover:bg-slate-600 rounded"
        title="Italic"
      >
        I
      </button>

      {/* Font size */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFontSizeChange(-1)}
          className="px-1.5 py-1 text-xs text-white bg-slate-700 hover:bg-slate-600 rounded"
        >
          A-
        </button>
        <button
          onClick={() => handleFontSizeChange(1)}
          className="px-1.5 py-1 text-xs text-white bg-slate-700 hover:bg-slate-600 rounded"
        >
          A+
        </button>
      </div>

      <div className="h-5 w-px bg-slate-600" />

      {/* Delete all */}
      <button
        onClick={handleDeleteAll}
        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded"
        title="Excluir selecionados"
      >
        <TrashIcon className="w-4 h-4" />
      </button>

      {/* Clear selection */}
      <button
        onClick={onClear}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
        title="Limpar selecao"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default BatchBubbleToolbar;
