import React, { useState, useRef } from 'react';
import { useGlossaryStore, GlossaryEntry } from '../../store';
import {
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const GlossaryPanel: React.FC = () => {
  const entries = useGlossaryStore((s) => s.entries);
  const addEntry = useGlossaryStore((s) => s.addEntry);
  const removeEntry = useGlossaryStore((s) => s.removeEntry);
  const updateEntry = useGlossaryStore((s) => s.updateEntry);
  const clearAll = useGlossaryStore((s) => s.clearAll);
  const importCSV = useGlossaryStore((s) => s.importCSV);
  const exportCSV = useGlossaryStore((s) => s.exportCSV);

  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCaseSensitive, setNewCaseSensitive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!newSource.trim() || !newTarget.trim()) return;
    addEntry({ source: newSource.trim(), target: newTarget.trim(), caseSensitive: newCaseSensitive });
    setNewSource('');
    setNewTarget('');
    setNewCaseSensitive(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleStartEdit = (entry: GlossaryEntry) => {
    setEditingId(entry.id);
    setEditSource(entry.source);
    setEditTarget(entry.target);
  };

  const handleSaveEdit = (id: string) => {
    if (editSource.trim() && editTarget.trim()) {
      updateEntry(id, { source: editSource.trim(), target: editTarget.trim() });
    }
    setEditingId(null);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) importCSV(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const csv = exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glossary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white">Glossario ({entries.length})</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            title="Importar CSV"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            disabled={entries.length === 0}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-50"
            title="Exportar CSV"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
          {entries.length > 0 && (
            <button
              onClick={clearAll}
              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg"
              title="Limpar tudo"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {/* Add Entry Form */}
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Termo original"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Traducao"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newSource.trim() || !newTarget.trim()}
            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            title="Adicionar"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
        <label className="flex items-center gap-2 text-[10px] text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={newCaseSensitive}
            onChange={(e) => setNewCaseSensitive(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
          />
          Case-sensitive
        </label>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-slate-600 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
          <p className="text-xs">Nenhum termo no glossario.</p>
          <p className="text-[10px] mt-1">Adicione termos para garantir consistencia nas traducoes.</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-[40vh] overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2 bg-slate-800/50 rounded-lg border border-slate-700 px-3 py-2 group hover:border-indigo-500/30"
            >
              {editingId === entry.id ? (
                <>
                  <input
                    type="text"
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-slate-500 text-xs">=</span>
                  <input
                    type="text"
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button onClick={() => handleSaveEdit(entry.id)} className="p-1 text-green-400 hover:text-green-300">
                    <CheckIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:text-white">
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs text-indigo-300 font-mono truncate">{entry.source}</span>
                  <span className="text-slate-500 text-xs">=</span>
                  <span className="flex-1 text-xs text-emerald-300 font-mono truncate">{entry.target}</span>
                  {entry.caseSensitive && (
                    <span className="text-[8px] bg-slate-700 text-slate-400 px-1 rounded">Aa</span>
                  )}
                  <button
                    onClick={() => handleStartEdit(entry)}
                    className="p-1 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlossaryPanel;
