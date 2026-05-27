import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GlossaryEntry {
  id: string;
  source: string;
  target: string;
  notes?: string;
}

export interface GlossaryState {
  entries: GlossaryEntry[];
  addEntry: (entry: GlossaryEntry) => void;
  editEntry: (id: string, partial: Partial<GlossaryEntry>) => void;
  deleteEntry: (id: string) => void;
  importCSV: (csvText: string) => void;
  exportCSV: () => string;
  clearAll: () => void;
}

export const useGlossaryStore = create<GlossaryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) =>
        set((state) => ({ entries: [...state.entries, entry] })),

      editEntry: (id, partial) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...partial } : e
          ),
        })),

      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      importCSV: (csvText) => {
        const lines = csvText.trim().split('\n');
        const newEntries: GlossaryEntry[] = [];
        for (const line of lines) {
          const parts = line.split(',').map((p) => p.trim());
          if (parts.length >= 2 && parts[0] && parts[1]) {
            newEntries.push({
              id: `glossary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              source: parts[0],
              target: parts[1],
              notes: parts[2] || undefined,
            });
          }
        }
        set((state) => ({ entries: [...state.entries, ...newEntries] }));
      },

      exportCSV: () => {
        const { entries } = get();
        return entries
          .map((e) => `${e.source},${e.target}${e.notes ? `,${e.notes}` : ''}`)
          .join('\n');
      },

      clearAll: () => set({ entries: [] }),
    }),
    { name: 'glossary-store' }
  )
);
