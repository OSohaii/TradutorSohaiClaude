import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * User-uploaded fonts (TTF/OTF/WOFF). Each font lives as a base64 data
 * URL so the file is fully self-contained inside localStorage; on
 * rehydrate we re-register every entry with `document.fonts.add(...)`
 * so the browser actually knows how to render text in that family.
 *
 * Caveat: localStorage caps out around 5 MB total, so heavy fonts will
 * eventually fail. The PR roadmap (Phase 4) moves this to IndexedDB.
 */
export interface StoredFont {
  /** Family name as registered with `document.fonts.add()`. */
  name: string;
  /** CSS `font-family` value, e.g. `"Foo", sans-serif`. */
  value: string;
  /** Base64 data URL of the original font file. */
  data: string;
}

interface FontsState {
  customFonts: StoredFont[];
  /** True while a newly uploaded font is being parsed/registered. */
  isLoading: boolean;
  /** True after `registerLoadedFonts()` finished its first pass. */
  hasHydratedFontFaces: boolean;

  // ---- Actions ----
  addFont: (font: StoredFont) => Promise<void>;
  removeFont: (index: number) => void;
  setLoading: (v: boolean) => void;
  /**
   * Iterates over the persisted list and calls `document.fonts.add()`
   * for each entry. Idempotent: subsequent calls become a no-op once
   * `hasHydratedFontFaces` is true.
   */
  registerLoadedFonts: () => Promise<void>;
}

const registerOne = async (font: StoredFont): Promise<boolean> => {
  try {
    const face = new FontFace(font.name, `url(${font.data})`);
    const loaded = await face.load();
    document.fonts.add(loaded);
    return true;
  } catch (err) {
    console.error(`[fonts] failed to register ${font.name}:`, err);
    return false;
  }
};

export const useFontsStore = create<FontsState>()(
  persist(
    (set, get) => ({
      customFonts: [],
      isLoading: false,
      hasHydratedFontFaces: false,

      addFont: async font => {
        const ok = await registerOne(font);
        if (!ok) return;
        const next = [...get().customFonts, font];
        try {
          set({ customFonts: next });
        } catch (e) {
          console.warn('[fonts] could not persist font (quota?)', e);
        }
      },

      removeFont: index => {
        const next = get().customFonts.filter((_, i) => i !== index);
        set({ customFonts: next });
        // We intentionally don't unregister the FontFace from
        // `document.fonts`: doing so would require holding the
        // FontFace reference per entry, and stale registrations are
        // harmless (the family just stops being used).
      },

      setLoading: v => set({ isLoading: v }),

      registerLoadedFonts: async () => {
        if (get().hasHydratedFontFaces) return;
        const fonts = get().customFonts;
        // Run in parallel; failures are logged inside `registerOne`.
        await Promise.all(fonts.map(registerOne));
        set({ hasHydratedFontFaces: true });
      },
    }),
    {
      name: 'mangalens-fonts',
      storage: createJSONStorage(() => localStorage),
      // Persist only the actual font list. Loading flags are session-only.
      partialize: state => ({ customFonts: state.customFonts }),
    },
  ),
);
