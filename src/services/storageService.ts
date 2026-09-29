import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DEFAULT_CODE } from '../data/diagramTypes';
import type { Diagram } from '../types/diagram';
import { DEFAULT_CONFIG } from '../types/settings';
import { detectDiagramType } from '../utils/diagramDetection';

const DB_NAME = 'mermaid-diagram-editor';
const DB_VERSION = 1;
const STORE = 'diagrams';
const LAST_OPENED_KEY = 'mde:lastOpenedId';

interface EditorDB extends DBSchema {
  diagrams: {
    key: string;
    value: Diagram;
    indexes: { updatedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<EditorDB>> | null = null;

function getDB(): Promise<IDBPDatabase<EditorDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EditorDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
      blocking() {
        // Another tab wants to upgrade: release our connection.
        void dbPromise?.then((db) => db.close());
        dbPromise = null;
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDiagram(partial: Partial<Diagram> = {}): Diagram {
  const now = Date.now();
  const code = partial.code ?? DEFAULT_CODE;
  return {
    id: partial.id ?? generateId(),
    name: partial.name?.trim() || 'Untitled diagram',
    code,
    type: partial.type ?? detectDiagramType(code),
    theme: partial.theme ?? 'default',
    config: { ...DEFAULT_CONFIG, ...partial.config },
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

/** All diagrams, most recently modified first. */
export async function listDiagrams(): Promise<Diagram[]> {
  const db = await getDB();
  const items = await db.getAllFromIndex(STORE, 'updatedAt');
  return items.reverse();
}

export async function getDiagram(id: string): Promise<Diagram | undefined> {
  const db = await getDB();
  return db.get(STORE, id);
}

export async function saveDiagram(diagram: Diagram): Promise<Diagram> {
  const db = await getDB();
  const toSave: Diagram = { ...diagram, type: detectDiagramType(diagram.code), config: { ...DEFAULT_CONFIG, ...diagram.config } };
  await db.put(STORE, toSave);
  return toSave;
}

export async function deleteDiagram(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
  if (getLastOpenedId() === id) setLastOpenedId(null);
}

export async function renameDiagram(id: string, name: string): Promise<Diagram | undefined> {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const existing = await tx.store.get(id);
  if (!existing) {
    await tx.done;
    return undefined;
  }
  const updated: Diagram = { ...existing, name: name.trim() || existing.name, updatedAt: Date.now() };
  await tx.store.put(updated);
  await tx.done;
  return updated;
}

export async function duplicateDiagram(id: string): Promise<Diagram | undefined> {
  const source = await getDiagram(id);
  if (!source) return undefined;
  const now = Date.now();
  const copy: Diagram = { ...source, id: generateId(), name: `${source.name} (copy)`, createdAt: now, updatedAt: now };
  return saveDiagram(copy);
}

export async function searchDiagrams(query: string): Promise<Diagram[]> {
  const all = await listDiagrams();
  return filterDiagrams(all, query);
}

export function filterDiagrams(diagrams: Diagram[], query: string): Diagram[] {
  const q = query.trim().toLowerCase();
  if (!q) return diagrams;
  return diagrams.filter((d) => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
}

export function getLastOpenedId(): string | null {
  try {
    return localStorage.getItem(LAST_OPENED_KEY);
  } catch {
    return null;
  }
}

export function setLastOpenedId(id: string | null): void {
  try {
    if (id) localStorage.setItem(LAST_OPENED_KEY, id);
    else localStorage.removeItem(LAST_OPENED_KEY);
  } catch {
    // localStorage may be unavailable (private mode); the last-opened hint is optional.
  }
}

/** Closes the cached connection. Used by tests to start from a clean database. */
export async function closeDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
