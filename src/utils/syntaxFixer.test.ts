import { describe, expect, it } from 'vitest';
import { applyFixes, closeBracketsInLine, findSyntaxFixes } from './syntaxFixer';

const ids = (code: string) => findSyntaxFixes(code).map((f) => f.id);

describe('findSyntaxFixes', () => {
  it('finds nothing for valid code', () => {
    expect(findSyntaxFixes('flowchart LR\n  A[User] --> B[Site]\n')).toEqual([]);
  });

  it('closes a missing bracket before the arrow', () => {
    expect(closeBracketsInLine('  A[User --> B[Site]')).toBe('  A[User] --> B[Site]');
    expect(closeBracketsInLine('  A --> B(Result')).toBe('  A --> B(Result)');
    const code = 'flowchart LR\n  A[User --> B\n';
    expect(applyFixes(code, ids(code))).toBe('flowchart LR\n  A[User] --> B\n');
  });

  it('fixes malformed flowchart arrows but not quoted text', () => {
    const code = 'flowchart LR\n  A -> B\n  B => C\n  C - -> D\n  D --> E["a -> b"]\n';
    expect(ids(code)).toContain('flow-arrows');
    expect(applyFixes(code, ['flow-arrows'])).toBe('flowchart LR\n  A --> B\n  B ==> C\n  C --> D\n  D --> E["a -> b"]\n');
  });

  it('adds a missing header', () => {
    const code = 'A --> B\nB --> C\n';
    expect(applyFixes(code, ['missing-header'])).toBe('flowchart TD\nA --> B\nB --> C\n');
  });

  it('fixes header casing and typos', () => {
    expect(applyFixes('sequencediagram\n  A->>B: hi\n', ['header-case'])).toBe('sequenceDiagram\n  A->>B: hi\n');
    expect(applyFixes('flowchat LR\n  A --> B\n', ['header-case'])).toBe('flowchart LR\n  A --> B\n');
  });

  it('replaces curly quotes', () => {
    expect(applyFixes('flowchart LR\n  A[“Hi”] --> B\n', ['smart-quotes'])).toBe('flowchart LR\n  A["Hi"] --> B\n');
  });

  it('quotes labels containing parentheses', () => {
    expect(applyFixes('flowchart LR\n  A[Call API (v2)] --> B\n', ['quote-labels'])).toBe('flowchart LR\n  A["Call API (v2)"] --> B\n');
  });

  it('adds missing subgraph end', () => {
    expect(applyFixes('flowchart TD\n  subgraph S\n    A --> B\n', ['subgraph-end'])).toBe('flowchart TD\n  subgraph S\n    A --> B\nend\n');
  });

  it('strips markdown fences', () => {
    expect(applyFixes('```mermaid\nflowchart LR\n  A --> B\n```', ['strip-fences'])).toBe('flowchart LR\n  A --> B\n');
  });

  it('fixes sequence arrows', () => {
    expect(applyFixes('sequenceDiagram\n  Alice => Bob: Hi\n', ['sequence-arrows'])).toBe('sequenceDiagram\n  Alice->>Bob: Hi\n');
  });

  it('applies multiple fixes even when line numbers shift', () => {
    const code = 'A[Start --> B\nB -> C\n';
    const fixed = applyFixes(code, ['missing-header', 'close-brackets', 'flow-arrows']);
    expect(fixed).toBe('flowchart TD\nA[Start] --> B\nB --> C\n');
  });
});
