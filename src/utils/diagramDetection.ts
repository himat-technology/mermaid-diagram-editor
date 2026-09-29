import type { DiagramTypeId } from '../types/diagram';

const DETECTORS: Array<[RegExp, DiagramTypeId]> = [
  [/^(flowchart|graph)\b/, 'flowchart'],
  [/^sequenceDiagram\b/, 'sequence'],
  [/^classDiagram(-v2)?\b/, 'class'],
  [/^stateDiagram(-v2)?\b/, 'state'],
  [/^erDiagram\b/, 'er'],
  [/^journey\b/, 'journey'],
  [/^gantt\b/, 'gantt'],
  [/^pie\b/, 'pie'],
  [/^gitGraph\b/, 'gitGraph'],
  [/^mindmap\b/, 'mindmap'],
  [/^timeline\b/, 'timeline'],
  [/^quadrantChart\b/, 'quadrant'],
  [/^requirement(Diagram)?\b/, 'requirement'],
  [/^C4(Context|Container|Component|Dynamic|Deployment)\b/, 'c4'],
  [/^architecture(-beta)?\b/, 'architecture'],
  [/^sankey(-beta)?\b/, 'sankey'],
  [/^xychart(-beta)?\b/, 'xychart'],
  [/^block(-beta)?\b/, 'block'],
  [/^kanban\b/, 'kanban'],
  [/^treeView-beta\b/, 'treeView'],
  [/^venn-beta\b/, 'venn'],
  [/^radar-beta\b/, 'radar'],
  [/^ishikawa(-beta)?\b/i, 'ishikawa'],
  [/^packet(-beta)?\b/, 'packet'],
  [/^treemap(-beta)?\b/, 'treemap'],
];

export const HEADER_KEYWORDS = [
  'flowchart',
  'graph',
  'sequenceDiagram',
  'classDiagram',
  'classDiagram-v2',
  'stateDiagram',
  'stateDiagram-v2',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'gitGraph',
  'mindmap',
  'timeline',
  'quadrantChart',
  'requirementDiagram',
  'C4Context',
  'C4Container',
  'C4Component',
  'C4Dynamic',
  'C4Deployment',
  'architecture-beta',
  'sankey-beta',
  'xychart-beta',
  'block-beta',
  'kanban',
  'treeView-beta',
  'venn-beta',
  'radar-beta',
  'ishikawa-beta',
  'packet-beta',
  'treemap-beta',
];

export interface HeaderInfo {
  /** 0-based index of the header line, or -1 if none found. */
  lineIndex: number;
  text: string;
}

/** Finds the diagram declaration line, skipping YAML front matter, `%%` comments/directives and blank lines. */
export function findHeaderLine(code: string): HeaderInfo {
  const lines = code.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;
  if (lines[i]?.trim() === '---') {
    i++;
    while (i < lines.length && lines[i].trim() !== '---') i++;
    i++;
  }
  for (; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed === '' || trimmed.startsWith('%%')) continue;
    return { lineIndex: i, text: trimmed };
  }
  return { lineIndex: -1, text: '' };
}

export function detectDiagramType(code: string): DiagramTypeId {
  const { text } = findHeaderLine(code);
  if (!text) return 'unknown';
  for (const [re, id] of DETECTORS) {
    if (re.test(text)) return id;
  }
  return 'unknown';
}

/** Returns a human readable name derived from `title` statements or front matter, if present. */
export function extractTitle(code: string): string | null {
  const fm = code.match(/^\s*---\s*\n([\s\S]*?)\n\s*---/);
  if (fm) {
    const t = fm[1].match(/^\s*title:\s*["']?(.+?)["']?\s*$/m);
    if (t) return t[1].trim();
  }
  const title = code.match(/^\s*title\s+["']?(.+?)["']?\s*$/m);
  return title ? title[1].trim() : null;
}
