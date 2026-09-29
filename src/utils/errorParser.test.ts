import { describe, expect, it } from 'vitest';
import { buildExcerpt, parseMermaidError } from './errorParser';

const code = 'flowchart LR\n  A --> B\n  B --> [C\n  C --> D';

describe('parseMermaidError', () => {
  it('uses jison location info', () => {
    const err = Object.assign(new Error('Parse error on line 3:\n...\nExpecting ...'), {
      hash: { loc: { first_line: 3, first_column: 8 } },
    });
    expect(parseMermaidError(err, code)).toMatchObject({ line: 3, column: 9 });
  });

  it('falls back to "line X, column Y" in the message (Langium parsers)', () => {
    const err = new Error('Parsing failed: Lexer error on line 2, column 5: unexpected character');
    expect(parseMermaidError(err, code)).toMatchObject({ line: 2, column: 5 });
  });

  it('points unknown diagram errors at the first line', () => {
    const err = new Error('No diagram type detected matching given configuration for text: foo');
    const result = parseMermaidError(err, '\n\nfoo\n');
    expect(result.line).toBe(3);
    expect(result.message).toMatch(/first line must declare/);
  });

  it('clamps out-of-range line numbers', () => {
    const err = Object.assign(new Error('bad'), { hash: { line: 99 } });
    expect(parseMermaidError(err, code).line).toBe(4);
  });

  it('handles non-Error values', () => {
    expect(parseMermaidError('boom', code).message).toBe('boom');
    expect(parseMermaidError({ message: 'obj' }, code).message).toBe('obj');
  });
});

describe('buildExcerpt', () => {
  it('shows context lines with a caret', () => {
    expect(buildExcerpt(code, 3, 9)).toBe(['  2 |   A --> B', '> 3 |   B --> [C', '    |         ^', '  4 |   C --> D'].join('\n'));
  });
});
