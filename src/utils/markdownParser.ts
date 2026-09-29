import type { MermaidBlock } from '../types/diagram';
import { extractTitle } from './diagramDetection';

const FENCE_OPEN = /^(\s{0,3})(`{3,}|~{3,})\s*mermaid\b[^\n]*$/i;

function isClosingFence(line: string, openFence: string): boolean {
  const m = line.trim().match(/^(`{3,}|~{3,})$/);
  return !!m && m[1][0] === openFence[0] && m[1].length >= openFence.length;
}

/**
 * Extracts fenced ```mermaid (or ~~~mermaid) blocks from Markdown. Each block gets a title from, in order:
 * a title inside the diagram, the nearest preceding heading, or "Diagram N".
 */
export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MermaidBlock[] = [];
  let lastHeading: string | null = null;
  let inOtherFence: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inOtherFence) {
      if (line.trim().startsWith(inOtherFence)) inOtherFence = null;
      continue;
    }

    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      lastHeading = heading[1];
      continue;
    }

    const open = line.match(FENCE_OPEN);
    if (open) {
      const fence = open[2];
      const indent = open[1].length;
      const body: string[] = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (isClosingFence(lines[j], fence)) break;
        body.push(indent > 0 ? lines[j].replace(new RegExp(`^ {0,${indent}}`), '') : lines[j]);
      }
      const code = body.join('\n').replace(/\s+$/, '') + '\n';
      if (code.trim()) {
        const index = blocks.length + 1;
        blocks.push({ index, title: extractTitle(code) ?? lastHeading ?? `Diagram ${index}`, code, line: i + 1 });
      }
      i = j;
      continue;
    }

    const otherFence = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (otherFence) inOtherFence = otherFence[1];
  }

  return blocks;
}

export function looksLikeMarkdownWithMermaid(text: string): boolean {
  return /^\s{0,3}(`{3,}|~{3,})\s*mermaid\b/im.test(text);
}

export function toMarkdown(title: string, code: string): string {
  const safeTitle = title.trim() || 'Untitled diagram';
  const body = code.replace(/\s+$/, '');
  const fence = body.includes('```') ? '~~~' : '```';
  return `# ${safeTitle}\n\n${fence}mermaid\n${body}\n${fence}\n`;
}
