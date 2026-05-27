import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '../../store';
import { saveSessionToIDB, loadSessionFromIDB, clearSessionFromIDB } from '../../services/imageStorage';
import { ProcessedImage } from '../../types';

interface SessionData {
  currentImageId: string | null;
  history: Array<{
    id: string;
    fileName: string;
    status: ProcessedImage['status'];
  }>;
}

const DEBOUNCE_MS = 2000;

/**
 * Hook that auto-saves session state to IndexedDB with debounce,
 * and restores session on app load.
 */
export function useSessionPersistence() {
  const currentImage = useSessionStore(s => s.currentImage);
  const history = useSessionStore(s => s.history);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  // Restore session on first load
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    void (async () => {
      try {
        const data = await loadSessionFromIDB() as SessionData | null;
        if (!data || !data.history || data.history.length === 0) return;
        // Session restoration is informational only - actual image data
        // must be reloaded from IndexedDB images store. We store just
        // metadata for awareness.
        console.info('[SessionPersistence] Found saved session with', data.history.length, 'pages');
      } catch {
        // Silently ignore restore errors
      }
    })();
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const sessionData: SessionData = {
        currentImageId: currentImage?.id ?? null,
        history: history.map(h => ({
          id: h.id,
          fileName: h.fileName,
          status: h.status,
        })),
      };

      void saveSessionToIDB(sessionData).catch(() => {
        // Silently ignore save errors
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentImage, history]);
}

/**
 * Clears the saved session from IndexedDB.
 */
export async function clearSession(): Promise<void> {
  await clearSessionFromIDB();
}

/**
 * Hook-friendly wrapper that returns clearSession as a callback.
 */
export function useClearSession() {
  return useCallback(() => {
    void clearSession();
  }, []);
}
