import { useEffect, useRef } from 'react';
import { useSessionStore } from '../../store';
import { useToastStore } from '../../store/useToastStore';
import {
  saveSessionToIDB,
  loadSessionFromIDB,
  clearSessionFromIDB,
  SessionSnapshot,
} from '../../services/imageStorage';
import { ProcessedImage } from '../../types';

/**
 * Serializes a ProcessedImage for IDB persistence.
 * Blob URLs cannot be persisted, so we use base64 for imageUrl.
 * maskDataUrl and translatedImageUrl that are blob: URLs are skipped.
 */
function serializeImage(img: ProcessedImage): ProcessedImage {
  return {
    ...img,
    imageUrl: img.base64 || img.imageUrl, // prefer base64
    maskDataUrl: img.maskDataUrl?.startsWith('blob:') ? undefined : img.maskDataUrl,
    translatedImageUrl: img.translatedImageUrl?.startsWith('blob:')
      ? undefined
      : img.translatedImageUrl,
  };
}

/**
 * Hook that auto-saves session to IndexedDB (debounced) and restores on load.
 */
export function useSessionPersistence() {
  const hasRestored = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore session on first mount
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    void (async () => {
      try {
        const snapshot = await loadSessionFromIDB();
        if (snapshot && snapshot.history.length > 0) {
          const { history, currentImageId } = snapshot;
          const store = useSessionStore.getState();

          // Only restore if current session is empty
          if (store.history.length > 0) return;

          store.replaceHistory(history);
          if (currentImageId) {
            const target = history.find(h => h.id === currentImageId);
            if (target) store.setCurrentImage(target);
          }

          useToastStore.getState().addToast(
            `Sessao anterior restaurada (${history.length} paginas)`,
            'info',
          );
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    })();
  }, []);

  // Subscribe to store changes and auto-save (debounced)
  useEffect(() => {
    const unsub = useSessionStore.subscribe((state) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        const { history, currentImage } = state;
        if (history.length === 0) return;

        const snapshot: SessionSnapshot = {
          history: history.map(serializeImage),
          currentImageId: currentImage?.id ?? null,
          savedAt: Date.now(),
        };

        void saveSessionToIDB(snapshot).catch((err) =>
          console.error('Failed to save session:', err),
        );
      }, 800);
    });

    return () => {
      unsub();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);
}

/**
 * Clears the persisted session from IDB and wipes the in-memory store.
 */
export async function clearPersistedSession(): Promise<void> {
  await clearSessionFromIDB();
  useSessionStore.getState().clearHistory();
}
