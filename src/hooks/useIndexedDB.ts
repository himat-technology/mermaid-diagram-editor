import { useCallback, useEffect, useState } from 'react';
import * as storage from '../services/storageService';
import type { Diagram } from '../types/diagram';

/** Reactive view of the IndexedDB diagram library. */
export function useDiagramLibrary() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDiagrams(await storage.listDiagrams());
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Local storage (IndexedDB) is unavailable. Diagrams will not be saved in this browser session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Saves and updates the in-memory list without a full reload. */
  const save = useCallback(async (diagram: Diagram) => {
    const saved = await storage.saveDiagram(diagram);
    setDiagrams((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)].sort((a, b) => b.updatedAt - a.updatedAt));
    return saved;
  }, []);

  const remove = useCallback(async (id: string) => {
    await storage.deleteDiagram(id);
    setDiagrams((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    const updated = await storage.renameDiagram(id, name);
    if (updated) setDiagrams((prev) => [updated, ...prev.filter((d) => d.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt));
    return updated;
  }, []);

  const duplicate = useCallback(async (id: string) => {
    const copy = await storage.duplicateDiagram(id);
    if (copy) setDiagrams((prev) => [copy, ...prev]);
    return copy;
  }, []);

  return { diagrams, loading, error, refresh, save, remove, rename, duplicate };
}
