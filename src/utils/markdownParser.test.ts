import { describe, expect, it } from 'vitest';
import { extractMermaidBlocks, looksLikeMarkdownWithMermaid, toMarkdown } from './markdownParser';

const doc = `# Architecture

Some intro text.

## Login flow

\`\`\`mermaid
sequenceDiagram
  A->>B: login
\`\`\`

\`\`\`js
// not mermaid
const x = "\`\`\`mermaid";
\`\`\`

## Services

~~~mermaid
flowchart LR
  A --> B
~~~

\`\`\`mermaid
---
title: Pie with title
---
pie
  "a": 1
\`\`\`
`;

describe('extractMermaidBlocks', () => {
  it('extracts all mermaid blocks with titles and line numbers', () => {
    const blocks = extractMermaidBlocks(doc);
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({ index: 1, title: 'Login flow', line: 7, code: 'sequenceDiagram\n  A->>B: login\n' });
    expect(blocks[1]).toMatchObject({ index: 2, title: 'Services', code: 'flowchart LR\n  A --> B\n' });
    expect(blocks[2].title).toBe('Pie with title');
  });

  it('ignores mermaid fences nested in other code blocks', () => {
    const blocks = extractMermaidBlocks('```md\n```mermaid\nflowchart LR\n```\n');
    expect(blocks).toHaveLength(0);
  });

  it('returns an empty array when there are no blocks', () => {
    expect(extractMermaidBlocks('# Title\n\nNo diagrams here.')).toEqual([]);
  });

  it('handles CRLF line endings and unterminated fences', () => {
    const blocks = extractMermaidBlocks('```mermaid\r\nflowchart LR\r\n  A --> B');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].code).toBe('flowchart LR\n  A --> B\n');
  });

  it('falls back to "Diagram N" titles', () => {
    const blocks = extractMermaidBlocks('```mermaid\nflowchart LR\nA-->B\n```\n\n```mermaid\npie\n"x": 1\n```');
    expect(blocks.map((b) => b.title)).toEqual(['Diagram 1', 'Diagram 2']);
  });
});

describe('markdown helpers', () => {
  it('detects markdown containing mermaid', () => {
    expect(looksLikeMarkdownWithMermaid(doc)).toBe(true);
    expect(looksLikeMarkdownWithMermaid('flowchart LR\nA-->B')).toBe(false);
  });

  it('generates markdown with a title and fenced block', () => {
    expect(toMarkdown('My Diagram', 'flowchart LR\nA --> B\n\n')).toBe('# My Diagram\n\n```mermaid\nflowchart LR\nA --> B\n```\n');
  });

  it('round-trips through extraction', () => {
    const md = toMarkdown('Round trip', 'flowchart TD\n  X --> Y\n');
    expect(extractMermaidBlocks(md)[0]).toMatchObject({ title: 'Round trip', code: 'flowchart TD\n  X --> Y\n' });
  });
});
