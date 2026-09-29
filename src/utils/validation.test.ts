import { describe, expect, it } from 'vitest';
import { DEFAULT_CODE } from '../data/diagramTypes';
import { detectDiagramType, extractTitle, findHeaderLine } from './diagramDetection';
import { findUnbalancedBrackets, validateMermaidCode } from './validation';

describe('validateMermaidCode', () => {
  it('accepts the default flowchart', () => {
    expect(validateMermaidCode(DEFAULT_CODE)).toEqual({ valid: true, issues: [] });
  });

  it('rejects empty input', () => {
    const result = validateMermaidCode('   \n  ');
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toMatch(/empty/i);
  });

  it('reports an unknown diagram type on the header line', () => {
    const result = validateMermaidCode('\n\nflowchat LR\nA --> B');
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({ line: 3, severity: 'error' });
    expect(result.issues[0].message).toContain('flowchat');
  });

  it('reports unclosed brackets with line and column', () => {
    const result = validateMermaidCode('flowchart LR\n  A[User --> B[Site]');
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ line: 2, column: 4, message: expect.stringContaining('Unclosed "["') }));
  });

  it('ignores brackets inside quoted labels', () => {
    expect(validateMermaidCode('flowchart LR\n  A["Text with ] bracket"] --> B').valid).toBe(true);
  });

  it('detects missing subgraph end', () => {
    const result = validateMermaidCode('flowchart TD\n subgraph one\n  A --> B\n');
    expect(result.valid).toBe(false);
    expect(result.issues[0].message).toMatch(/missing a closing "end"/);
  });

  it('does not bracket-check diagram types where brackets are unbalanced by design', () => {
    expect(validateMermaidCode('sequenceDiagram\n  A->>B: open ( paren').valid).toBe(true);
  });
});

describe('findUnbalancedBrackets', () => {
  it('finds unexpected closers', () => {
    expect(findUnbalancedBrackets('A] --> B').unexpected).toEqual([{ char: ']', column: 2 }]);
  });
});

describe('diagram detection', () => {
  it.each([
    ['graph TD\nA-->B', 'flowchart'],
    ['sequenceDiagram\nA->>B: hi', 'sequence'],
    ['%% comment\n\nerDiagram\n', 'er'],
    ['---\ntitle: Test\n---\nclassDiagram\n', 'class'],
    ['C4Container\n', 'c4'],
    ['treeView-beta\n', 'treeView'],
    ['ishikawa-beta\n', 'ishikawa'],
    ['nonsense', 'unknown'],
  ])('detects %j as %s', (code, type) => {
    expect(detectDiagramType(code)).toBe(type);
  });

  it('skips front matter when finding the header', () => {
    expect(findHeaderLine('---\ntitle: X\n---\n\nflowchart LR\n')).toEqual({ lineIndex: 4, text: 'flowchart LR' });
  });

  it('extracts titles from front matter and title statements', () => {
    expect(extractTitle('---\ntitle: "My flow"\n---\nflowchart LR')).toBe('My flow');
    expect(extractTitle('pie\n  title Pets\n  "Dogs": 3')).toBe('Pets');
    expect(extractTitle('flowchart LR\nA-->B')).toBeNull();
  });
});
