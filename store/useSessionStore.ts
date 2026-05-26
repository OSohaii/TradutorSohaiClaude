import { create } from 'zustand';
import { ProcessedImage, TextBubble } from '../types';

/**
 * Per-tab session state: which images are loaded, which one is being
 * viewed, and convenience helpers to mutate them. Intentionally NOT
 * persisted: closing the tab clears the queue. The library (in
 * `useLibraryStore`) is the durable storage.
 *
 * Pre-Phase-2b this lived as `useState` pairs in App.tsx, with mutation
 * logic spread across `processImage`, `handleRetranslate`, `handleFilesSelect`,
 * `updateImageState`, `handleBubbleUpdate`, etc. Centralising it here
 * lets the viewer and any future hook subscribe directly without prop
 * drilling.
 */
export interface SessionState {
  /** The image currently displayed in the viewer. */
  currentImage: ProcessedImage | null;
  /** Newest-first list of images opened in this tab. */
  history: ProcessedImage[];

  // ---- Direct setters ----
  setCurrentImage: (img: ProcessedImage | null) => void;
  setHistory: (history: ProcessedImage[]) => void;

  // ---- Higher-level mutations ----
  /**
   * Prepends new images to the history and focuses the first new one.
   * Mirrors the original App.tsx behavior on file upload.
   */
  addImages: (newImages: ProcessedImage[]) => void;
  /** Removes one image from history; refocuses the next one if it was current. */
  removeImage: (id: string) => void;
  /** Wipes everything, e.g. when loading a chapter from the library. */
  clearHistory: () => void;
  /**
   * Replaces the entire history (and focuses the first entry). Used when
   * the user opens a saved chapter from the library.
   */
  replaceHistory: (images: ProcessedImage[]) => void;

  /**
   * Merges `partial` into both `history[match]` and `currentImage` if
   * the IDs match. Single source of truth for "update one image".
   */
  updateImageState: (id: string, partial: Partial<ProcessedImage>) => void;

  // ---- Bubble helpers (target the current image) ----
  updateBubble: (bubble: TextBubble) => void;
  removeBubble: (bubbleId: string) => void;
  addBubble: (bubble: TextBubble) => void;
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  currentImage: null,
  history: [],

  setCurrentImage: img => set({ currentImage: img }),
  setHistory: history => set({ history }),

  addImages: newImages =>
    set(state => ({
      history: [...newImages, ...state.history],
      // Original code unconditionally focused the first new image; keep
      // that contract so callers don't have to think about it.
      currentImage: newImages[0] ?? state.currentImage,
    })),

  removeImage: id =>
    set(state => {
      const newHistory = state.history.filter(h => h.id !== id);
      const wasCurrent = state.currentImage?.id === id;
      return {
        history: newHistory,
        currentImage: wasCurrent ? newHistory[0] ?? null : state.currentImage,
      };
    }),

  clearHistory: () => set({ history: [], currentImage: null }),

  replaceHistory: images =>
    set({
      history: images,
      currentImage: images[0] ?? null,
    }),

  updateImageState: (id, partial) =>
    set(state => ({
      history: state.history.map(img =>
        img.id === id ? { ...img, ...partial } : img,
      ),
      currentImage:
        state.currentImage?.id === id
          ? { ...state.currentImage, ...partial }
          : state.currentImage,
    })),

  updateBubble: bubble => {
    const cur = get().currentImage;
    if (!cur) return;
    const newBubbles = cur.bubbles.map(b => (b.id === bubble.id ? bubble : b));
    get().updateImageState(cur.id, { bubbles: newBubbles });
  },

  removeBubble: bubbleId => {
    const cur = get().currentImage;
    if (!cur) return;
    const newBubbles = cur.bubbles.filter(b => b.id !== bubbleId);
    get().updateImageState(cur.id, { bubbles: newBubbles });
  },

  addBubble: bubble => {
    const cur = get().currentImage;
    if (!cur) return;
    get().updateImageState(cur.id, { bubbles: [...cur.bubbles, bubble] });
  },
}));
