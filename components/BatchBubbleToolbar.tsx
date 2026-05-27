import React from 'react';
import { FontOption, FontGroup } from './MangaViewer';
import {
  TrashIcon,
  MinusIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface BatchBubbleToolbarProps {
  selectedCount: number;
  allFonts: (FontOption | FontGroup)[];
  onFontChange: (fontFamily: string) => void;
  onBoldToggle: () => void;
  onItalicToggle: () => void;
  onFontSizeChange: (delta: number) => void;
  onDeleteAll: () => void;
  onClear: () => void;
}

const BatchBubbleToolbar: React.FC<BatchBubbleToolbarProps> = ({
  selectedCount,
  allFonts,
  onFontChange,
  onBoldToggle,
  onItalicToggle,
  onFontSizeChange,
  onDeleteAll,
  onClear,
}) => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl px-4 py-2 flex items-center gap-3">
      <span className="text-xs text-indigo-300 font-medium whitespace-nowrap">
        {selectedCount} selecionados
      </span>

      <div className="h-5 w-px bg-slate-600" />

      {/* Font selector */}
      <select
        className="bg-slate-700 border border-slate-600 text-white text-xs rounded px-2 py-1 max-w-[120px]"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onFontChange(e.target.value);
        }}
      >
        <option value="" disabled>Fonte...</option>
        {allFonts.map((item, idx) => {
          if ('group' in item) {
            return (
              <optgroup key={idx} label={item.group}>
                {item.options.map((opt, optIdx) => (
                  <option key={`${idx}-${optIdx}`} value={opt.value}>{opt.name}</option>
                ))}
              </optgroup>
            );
          }
          return <option key={idx} value={item.value}>{item.name}</option>;
        })}
      </select>

      {/* Bold / Italic */}
      <button
        onClick={onBoldToggle}
        className="px-2 py-1 text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 rounded border border-slate-600"
        title="Negrito"
      >
        B
      </button>
      <button
        onClick={onItalicToggle}
        className="px-2 py-1 text-xs italic text-white bg-slate-700 hover:bg-slate-600 rounded border border-slate-600"
        title="Italico"
      >
        I
      </button>

      {/* Font size */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onFontSizeChange(-1)}
          className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded"
          title="Diminuir fonte"
        >
          <MinusIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onFontSizeChange(1)}
          className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded"
          title="Aumentar fonte"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-5 w-px bg-slate-600" />

      {/* Delete all */}
      <button
        onClick={onDeleteAll}
        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
        title="Excluir selecionados"
      >
        <TrashIcon className="w-4 h-4" />
      </button>

      {/* Clear selection */}
      <button
        onClick={onClear}
        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700"
      >
        Limpar
      </button>
    </div>
  );
};

export default BatchBubbleToolbar;
