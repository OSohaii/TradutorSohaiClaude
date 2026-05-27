import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface GlossaryEntry {
  id: string;
  source: string;
  target: string;
  caseSensitive: boolean;
}

export interface GlossaryState {
  entries: GlossaryEntry[];
  addEntry: (entry: Omit<GlossaryEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, partial: Partial<Omit<GlossaryEntry, 'id'>>) => void;
  clearAll: () => void;
  importCSV: (csvText: string) => void;
  exportCSV: () => string;
}

export const useGlossaryStore = create<GlossaryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            { ...entry, id: `glossary-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
          ],
        })),

      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      updateEntry: (id, partial) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...partial } : e,
          ),
        })),

      clearAll: () => set({ entries: [] }),

      importCSV: (csvText) => {
        const lines = csvText.split('\n').filter((l) => l.trim());
        const newEntries: GlossaryEntry[] = [];
        for (const line of lines) {
          // Skip header line if present
          if (line.toLowerCase().startsWith('source,') || line.toLowerCase().startsWith('"source"')) continue;
          const parts = line.split(',');
          if (parts.length >= 2) {
            const source = parts[0].trim().replace(/^"|"$/g, '');
            const target = parts[1].trim().replace(/^"|"$/g, '');
            if (source && target) {
              newEntries.push({
                id: `glossary-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                source,
                target,
                caseSensitive: parts[2]?.trim().toLowerCase() === 'true',
              });
            }
          }
        }
        if (newEntries.length > 0) {
          set((state) => ({ entries: [...state.entries, ...newEntries] }));
        }
      },

      exportCSV: () => {
        const { entries } = get();
        const header = 'source,target,caseSensitive';
        const rows = entries.map(
          (e) => `"${e.source.replace(/"/g, '""')}","${e.target.replace(/"/g, '""')}",${e.caseSensitive}`,
        );
        return [header, ...rows].join('\n');
      },
    }),
    {
      name: 'glossary-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
