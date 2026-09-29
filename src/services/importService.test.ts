import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../types/settings';
import { deserializeProject, ImportError, importFile, parseImportedText, parsePastedText, serializeProject } from './importService';
import { createDiagram } from './storageService';

describe('.mmd / .mermaid import', () => {
  it('loads raw mermaid source and uses the file name', () => {
    const result = parseImportedText('checkout-flow.mmd', 'flowchart LR\r\n  A --> B');
    expect(result).toEqual({ kind: 'diagram', name: 'checkout-flow', code: 'flowchart LR\n  A --> B\n' });
  });

  it('strips a UTF-8 BOM', () => {
    const result = parseImportedText('a.mermaid', '\uFEFFsequenceDiagram\n  A->>B: hi\n');
    expect(result).toMatchObject({ kind: 'diagram', code: 'sequenceDiagram\n  A->>B: hi\n' });
  });

  it('uses a title statement as the name when present', () => {
    expect(parseImportedText('x.mmd', 'pie\n  title Pets\n  "Dogs": 3\n')).toMatchObject({ name: 'Pets' });
  });

  it('rejects empty files', () => {
    expect(() => parseImportedText('empty.mmd', '  \n')).toThrow(ImportError);
  });

  it('reads File objects', async () => {
    const file = new File(['graph TD\n  X --> Y\n'], 'from-disk.mmd', { type: 'text/plain' });
    await expect(importFile(file)).resolves.toMatchObject({ kind: 'diagram', name: 'from-disk', code: 'graph TD\n  X --> Y\n' });
  });
});

describe('markdown import', () => {
  it('opens a single block directly', () => {
    expect(parseImportedText('readme.md', '# Doc\n\n## Flow\n```mermaid\nflowchart LR\nA-->B\n```\n')).toEqual({
      kind: 'diagram',
      name: 'Flow',
      code: 'flowchart LR\nA-->B\n',
    });
  });

  it('returns all blocks when there are several', () => {
    const result = parseImportedText('doc.markdown', '```mermaid\nflowchart LR\nA-->B\n```\n```mermaid\npie\n"a": 1\n```\n');
    expect(result.kind).toBe('blocks');
    if (result.kind === 'blocks') expect(result.blocks).toHaveLength(2);
  });

  it('errors when no blocks exist', () => {
    expect(() => parseImportedText('doc.md', '# nothing')).toThrow(/No ```mermaid code blocks/);
  });
});

describe('.himatdiagram serialization', () => {
  const diagram = createDiagram({
    name: 'Payments',
    code: 'sequenceDiagram\n  A->>B: pay\n',
    theme: 'dark',
    config: { ...DEFAULT_CONFIG, look: 'handDrawn', fontSize: 20 },
  });

  it('serializes to the documented JSON structure', () => {
    const json = JSON.parse(serializeProject(diagram));
    expect(json).toMatchObject({
      format: 'himatdiagram',
      version: 1,
      name: 'Payments',
      code: diagram.code,
      theme: 'dark',
      look: 'handDrawn',
      config: { fontSize: 20, look: 'handDrawn' },
    });
  });

  it('round-trips through deserializeProject and file import', () => {
    const text = serializeProject(diagram);
    const project = deserializeProject(text);
    expect(project).toMatchObject({ name: 'Payments', code: diagram.code, theme: 'dark', look: 'handDrawn', type: 'sequence' });
    expect(project.config).toEqual(diagram.config);
    expect(parseImportedText('payments.himatdiagram', text)).toEqual({
      kind: 'diagram',
      name: 'Payments',
      code: diagram.code,
      theme: 'dark',
      config: diagram.config,
    });
  });

  it('accepts the minimal documented structure', () => {
    const project = deserializeProject(JSON.stringify({ name: 'My Diagram', code: 'flowchart LR\nA-->B', theme: 'neutral', look: 'classic', config: {} }));
    expect(project).toMatchObject({ name: 'My Diagram', theme: 'neutral', look: 'classic', config: { look: 'classic' } });
  });

  it('sanitizes invalid values', () => {
    const project = deserializeProject(JSON.stringify({ code: 'x', theme: 'hacker', look: 'weird', config: { securityLevel: 'loose', fontSize: '12' } }));
    expect(project.name).toBe('Imported diagram');
    expect(project.theme).toBe('default');
    expect(project.look).toBe('classic');
    expect(project.config.securityLevel).toBeUndefined();
    expect(project.config.fontSize).toBeUndefined();
  });

  it('rejects malformed files', () => {
    expect(() => deserializeProject('not json')).toThrow(/not valid JSON/);
    expect(() => deserializeProject('[]')).toThrow(/JSON object/);
    expect(() => deserializeProject('{"name":"x"}')).toThrow(/"code"/);
    expect(() => deserializeProject('{"code":"x","format":"other"}')).toThrow(/Unsupported project format/);
  });
});

describe('paste import', () => {
  it('detects raw mermaid, markdown and project JSON', () => {
    expect(parsePastedText('  flowchart LR\n A-->B  ')).toMatchObject({ kind: 'diagram', code: 'flowchart LR\n A-->B\n' });
    expect(parsePastedText('text\n```mermaid\npie\n"a": 1\n```')).toMatchObject({ kind: 'diagram', code: 'pie\n"a": 1\n' });
    expect(parsePastedText('{"name":"P","code":"graph TD\\nA-->B"}')).toMatchObject({ kind: 'diagram', name: 'P' });
  });

  it('rejects empty paste', () => {
    expect(() => parsePastedText('   ')).toThrow(ImportError);
  });
});
