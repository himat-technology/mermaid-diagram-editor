import { useCallback, useEffect, useRef, useState } from 'react';
import type { Diagram } from '../types/diagram';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';

/**
 * Persists the diagram after edits settle. `flush()` saves immediately (used by Ctrl+S, before switching
 * diagrams and when the page is hidden).
 */
export function useAutosave(diagram: Diagram | null, save: (d: Diagram) => Promise<unknown>, delay = 800) {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const pending = useRef<Diagram | null>(null);
  const lastSavedVersion = useRef<string | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const versionOf = (d: Diagram) => `${d.id}:${d.updatedAt}`;

  const flush = useCallback(async () => {
    const d = pending.current;
    if (!d) return;
    pending.current = null;
    setStatus('saving');
    try {
      await saveRef.current(d);
      lastSavedVersion.current = versionOf(d);
      setLastSavedAt(Date.now());
      setStatus(pending.current ? 'pending' : 'saved');
    } catch (err) {
      console.error('Autosave failed', err);
      pending.current = pending.current ?? d;
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!diagram) return;
    if (lastSavedVersion.current === null) {
      // First diagram loaded from storage is already persisted.
      lastSavedVersion.current = versionOf(diagram);
      return;
    }
    if (versionOf(diagram) === lastSavedVersion.current) return;
    pending.current = diagram;
    setStatus('pending');
    const timer = window.setTimeout(() => void flush(), delay);
    return () => window.clearTimeout(timer);
  }, [diagram, delay, flush]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onUnload = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onUnload);
    };
  }, [flush]);

  /** Marks a diagram as persisted without saving it again (e.g. right after an explicit save). */
  const markSaved = useCallback((d: Diagram) => {
    lastSavedVersion.current = versionOf(d);
    if (pending.current && versionOf(pending.current) === versionOf(d)) pending.current = null;
    setStatus('saved');
    setLastSavedAt(Date.now());
  }, []);

  return { status, lastSavedAt, flush, markSaved };
}
