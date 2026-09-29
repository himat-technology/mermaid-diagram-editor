import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  closeDatabase,
  createDiagram,
  deleteDiagram,
  duplicateDiagram,
  getDiagram,
  listDiagrams,
  renameDiagram,
  saveDiagram,
  searchDiagrams,
} from './storageService';

beforeEach(async () => {
  await closeDatabase();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('mermaid-diagram-editor');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
});

describe('storageService (IndexedDB)', () => {
  it('creates diagrams with defaults and detected type', () => {
    const d = createDiagram({ code: 'sequenceDiagram\nA->>B: hi' });
    expect(d).toMatchObject({ name: 'Untitled diagram', type: 'sequence', theme: 'default' });
    expect(d.id).toBeTruthy();
    expect(d.createdAt).toBe(d.updatedAt);
  });

  it('saves and loads a diagram', async () => {
    const d = createDiagram({ name: 'Saved' });
    await saveDiagram(d);
    expect(await getDiagram(d.id)).toEqual(d);
  });

  it('lists diagrams by most recently modified', async () => {
    await saveDiagram(createDiagram({ name: 'old', updatedAt: 1000 }));
    await saveDiagram(createDiagram({ name: 'newest', updatedAt: 3000 }));
    await saveDiagram(createDiagram({ name: 'middle', updatedAt: 2000 }));
    expect((await listDiagrams()).map((d) => d.name)).toEqual(['newest', 'middle', 'old']);
  });

  it('renames, duplicates and deletes', async () => {
    const d = await saveDiagram(createDiagram({ name: 'Original', updatedAt: 1 }));
    const renamed = await renameDiagram(d.id, '  Renamed  ');
    expect(renamed?.name).toBe('Renamed');
    expect(renamed!.updatedAt).toBeGreaterThan(1);

    const copy = await duplicateDiagram(d.id);
    expect(copy).toMatchObject({ name: 'Renamed (copy)', code: d.code });
    expect(copy!.id).not.toBe(d.id);
    expect(await listDiagrams()).toHaveLength(2);

    await deleteDiagram(d.id);
    expect(await getDiagram(d.id)).toBeUndefined();
    expect(await listDiagrams()).toHaveLength(1);
  });

  it('searches names and source', async () => {
    await saveDiagram(createDiagram({ name: 'Payment flow', code: 'flowchart LR\nA-->B' }));
    await saveDiagram(createDiagram({ name: 'Other', code: 'sequenceDiagram\nStripe->>API: webhook' }));
    expect((await searchDiagrams('payment')).map((d) => d.name)).toEqual(['Payment flow']);
    expect((await searchDiagrams('stripe')).map((d) => d.name)).toEqual(['Other']);
    expect(await searchDiagrams('')).toHaveLength(2);
  });

  it('returns undefined for missing ids', async () => {
    expect(await renameDiagram('missing', 'x')).toBeUndefined();
    expect(await duplicateDiagram('missing')).toBeUndefined();
  });
});
