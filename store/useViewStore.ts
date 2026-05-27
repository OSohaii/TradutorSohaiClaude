import { create } from 'zustand';

export interface ViewState {
  currentView: 'library' | 'studio' | 'reader';
  activeMangaId: string | null;
  activeChapterId: string | null;
  goToLibrary: () => void;
  goToStudio: (mangaId?: string, chapterId?: string) => void;
  goToReader: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  currentView: 'library',
  activeMangaId: null,
  activeChapterId: null,
  goToLibrary: () => set({ currentView: 'library', activeMangaId: null, activeChapterId: null }),
  goToStudio: (mangaId?: string, chapterId?: string) => set({ currentView: 'studio', activeMangaId: mangaId ?? null, activeChapterId: chapterId ?? null }),
  goToReader: () => set({ currentView: 'reader' }),
}));
