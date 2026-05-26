import { create } from 'zustand';
import { LibraryState, Manga, Chapter } from '../types/library';
import { ProcessedImage } from '../types';
import {
  loadLibrary,
  saveLibrary,
  addManga as addMangaPure,
  updateManga as updateMangaPure,
  deleteManga as deleteMangaPure,
  addChapter as addChapterPure,
  updateChapter as updateChapterPure,
  deleteChapter as deleteChapterPure,
  addPagesToChapter as addPagesToChapterPure,
} from '../services/libraryService';

/**
 * Wraps the library `LibraryState` (mangas + selection cursors) and
 * mirrors `libraryService` mutations so any subscriber gets the same
 * snapshot. Pre-Phase-2b, the state lived inside `LibraryManager` via
 * `useState(loadLibrary)`, which meant App.tsx couldn't observe library
 * changes (e.g. the user creating a new manga in the modal didn't
 * propagate anywhere). With this store every component that needs the
 * library subscribes to the same source.
 *
 * Persistence model: we DO NOT use the zustand `persist` middleware
 * here because `libraryService` already implements the
 * localStorage-for-metadata + IndexedDB-for-images split it inherits
 * from earlier code. Instead, every action calls the matching pure
 * function from `libraryService` and persists the result via
 * `saveLibrary()`. This keeps the IDB migration helpers (`migrateOldData`)
 * working without re-implementing them at the store layer.
 */
export interface LibraryStoreState extends LibraryState {
  // ---- Mutations ----
  addManga: (manga: Manga) => void;
  updateManga: (mangaId: string, updates: Partial<Manga>) => void;
  deleteManga: (mangaId: string) => void;

  addChapter: (mangaId: string, chapter: Chapter) => void;
  updateChapter: (
    mangaId: string,
    chapterId: string,
    updates: Partial<Chapter>,
  ) => void;
  deleteChapter: (mangaId: string, chapterId: string) => void;

  /**
   * Persists the given session images as pages of `chapterId` (writes
   * the originals to IndexedDB via `libraryService`). Async because the
   * page conversion creates thumbnails and base64 versions of the
   * images.
   */
  addPagesToChapter: (
    mangaId: string,
    chapterId: string,
    images: ProcessedImage[],
  ) => Promise<void>;

  // ---- Selection cursors (UI helpers) ----
  setCurrentMangaId: (id: string | null) => void;
  setCurrentChapterId: (id: string | null) => void;
}

/**
 * Hydrate from `libraryService.loadLibrary()` synchronously at module
 * import time so the first React render already sees the persisted
 * mangas instead of an empty array. `loadLibrary` does kick off an
 * async migration of legacy data internally (fire-and-forget, see
 * libraryService.migrateOldData) — that is bug B12 from the audit, out
 * of scope here.
 */
const initialState: LibraryState =
  typeof window === 'undefined'
    ? { mangas: [], currentMangaId: null, currentChapterId: null }
    : loadLibrary();

export const useLibraryStore = create<LibraryStoreState>()((set, get) => ({
  ...initialState,

  addManga: manga => {
    const next = addMangaPure(get(), manga);
    set(next);
    saveLibrary(next);
  },

  updateManga: (mangaId, updates) => {
    const next = updateMangaPure(get(), mangaId, updates);
    set(next);
    saveLibrary(next);
  },

  deleteManga: mangaId => {
    const next = deleteMangaPure(get(), mangaId);
    set(next);
    saveLibrary(next);
    // Note: bug A6 from the audit (orphan images in IndexedDB after
    // delete) is intentionally left as-is in this PR. Phase 4 wires
    // `imageStorage.deleteImages(...)` into these handlers.
  },

  addChapter: (mangaId, chapter) => {
    const next = addChapterPure(get(), mangaId, chapter);
    set(next);
    saveLibrary(next);
  },

  updateChapter: (mangaId, chapterId, updates) => {
    const next = updateChapterPure(get(), mangaId, chapterId, updates);
    set(next);
    saveLibrary(next);
  },

  deleteChapter: (mangaId, chapterId) => {
    const next = deleteChapterPure(get(), mangaId, chapterId);
    set(next);
    saveLibrary(next);
  },

  addPagesToChapter: async (mangaId, chapterId, images) => {
    // The pure helper runs `processedImageToPage` on each image, which
    // writes the originals to IndexedDB and trims the metadata down to
    // what fits in localStorage. Returns the new state.
    const next = await addPagesToChapterPure(get(), mangaId, chapterId, images);
    set(next);
    saveLibrary(next);
  },

  setCurrentMangaId: id =>
    set(state => {
      const next = { ...state, currentMangaId: id };
      saveLibrary(next);
      return { currentMangaId: id };
    }),

  setCurrentChapterId: id =>
    set(state => {
      const next = { ...state, currentChapterId: id };
      saveLibrary(next);
      return { currentChapterId: id };
    }),
}));
