import { detectDiagramType, findHeaderLine, HEADER_KEYWORDS } from './diagramDetection';
import { findUnbalancedBrackets } from './validation';

export interface SyntaxFix {
  id: string;
  title: string;
  description: string;
  /** 1-based lines affected, for display. */
  lines: number[];
  apply: (code: string) => string;
}

const CLOSER: Record<string, string> = { '[': ']', '(': ')', '{': '}' };
const FLOW_ARROW = /\s*(<?-{2,}[>xo]?|<?={2,}[>xo]?|<?-\.+-?[>xo]?|~~~)/;

function mapLines(code: string, fn: (line: string, index: number) => string): string {
  const eol = code.includes('\r\n') ? '\r\n' : '\n';
  return code.split(/\r?\n/).map(fn).join(eol);
}

function stripFences(code: string): SyntaxFix | null {
  const m = code.match(/^\s*(`{3,}|~{3,})\s*mermaid[^\n]*\n([\s\S]*?)\n\s*\1\s*$/i);
  if (!m) return null;
  return {
    id: 'strip-fences',
    title: 'Remove Markdown code fences',
    description: 'The source is wrapped in a ```mermaid block. Mermaid expects only the diagram code.',
    lines: [1],
    apply: (c) => {
      const mm = c.match(/^\s*(`{3,}|~{3,})\s*mermaid[^\n]*\n([\s\S]*?)\n\s*\1\s*$/i);
      return mm ? mm[2] + '\n' : c;
    },
  };
}

function smartQuotes(code: string): SyntaxFix | null {
  if (!/[\u201C\u201D\u2018\u2019]/.test(code)) return null;
  const lines = code
    .split(/\r?\n/)
    .map((l, i) => (/[\u201C\u201D\u2018\u2019]/.test(l) ? i + 1 : 0))
    .filter(Boolean);
  return {
    id: 'smart-quotes',
    title: 'Replace curly quotes',
    description: 'Typographic quotes (“ ” ‘ ’) are not valid Mermaid syntax. Replace them with straight quotes.',
    lines,
    apply: (c) => c.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'"),
  };
}

function headerCase(code: string): SyntaxFix | null {
  const header = findHeaderLine(code);
  if (header.lineIndex < 0) return null;
  const word = header.text.split(/\s+/)[0];
  const match = HEADER_KEYWORDS.find((k) => k.toLowerCase() === word.toLowerCase() && k !== word);
  const typo: Record<string, string> = { flowchat: 'flowchart', flowcart: 'flowchart', grpah: 'graph', sequencediagram: 'sequenceDiagram', sequence: 'sequenceDiagram', gitgraph: 'gitGraph', statediagram: 'stateDiagram-v2' };
  const replacement = match ?? typo[word.toLowerCase()];
  if (!replacement || replacement === word) return null;
  return {
    id: 'header-case',
    title: `Change "${word}" to "${replacement}"`,
    description: 'Diagram keywords are case-sensitive.',
    lines: [header.lineIndex + 1],
    apply: (c) => {
      const h = findHeaderLine(c);
      return mapLines(c, (l, i) => (i === h.lineIndex ? l.replace(word, replacement) : l));
    },
  };
}

function missingHeader(code: string): SyntaxFix | null {
  if (detectDiagramType(code) !== 'unknown') return null;
  const header = findHeaderLine(code);
  if (header.lineIndex < 0) return null;
  const word = header.text.split(/\s+/)[0].toLowerCase();
  if (HEADER_KEYWORDS.some((k) => k.toLowerCase() === word)) return null;
  const hasFlowEdges = /(-->|---|==>|-\.->)/.test(code);
  const hasSequence = /->>|-->>/.test(code);
  if (!hasFlowEdges && !hasSequence) return null;
  const decl = hasSequence && !hasFlowEdges ? 'sequenceDiagram' : 'flowchart TD';
  return {
    id: 'missing-header',
    title: `Add "${decl}" declaration`,
    description: 'Every diagram must start with its type. The content looks like a ' + (decl === 'flowchart TD' ? 'flowchart.' : 'sequence diagram.'),
    lines: [header.lineIndex + 1],
    apply: (c) => {
      const h = findHeaderLine(c);
      return mapLines(c, (l, i) => (i === h.lineIndex ? `${decl}\n${l}` : l));
    },
  };
}

/** Closes brackets left open on a line, inserting the closer before the next arrow when there is one. */
export function closeBracketsInLine(line: string): string {
  const { unclosed } = findUnbalancedBrackets(line);
  if (unclosed.length === 0) return line;
  let result = line;
  for (const open of [...unclosed].reverse()) {
    const after = result.slice(open.column);
    const arrow = after.match(FLOW_ARROW);
    const closer = CLOSER[open.char];
    if (arrow && arrow.index !== undefined && arrow.index > 0) {
      const insertAt = open.column + arrow.index;
      const before = result.slice(0, insertAt).replace(/\s+$/, '');
      result = before + closer + result.slice(before.length);
    } else {
      result = result.replace(/\s*$/, '') + closer;
    }
  }
  return result;
}

function unclosedBrackets(code: string): SyntaxFix | null {
  const type = detectDiagramType(code);
  if (type !== 'flowchart' && type !== 'state' && type !== 'block') return null;
  const affected: number[] = [];
  code.split(/\r?\n/).forEach((l, i) => {
    if (l.trim().startsWith('%%')) return;
    if (findUnbalancedBrackets(l).unclosed.length > 0) affected.push(i + 1);
  });
  if (affected.length === 0) return null;
  return {
    id: 'close-brackets',
    title: `Close ${affected.length === 1 ? 'an unclosed bracket' : `${affected.length} unclosed brackets`}`,
    description: 'Adds the missing "]", ")" or "}" after node labels.',
    lines: affected,
    apply: (c) => mapLines(c, (l, i) => (affected.includes(i + 1) ? closeBracketsInLine(l) : l)),
  };
}

function malformedFlowArrows(code: string): SyntaxFix | null {
  if (detectDiagramType(code) !== 'flowchart') return null;
  const header = findHeaderLine(code).lineIndex;
  const patterns: Array<[RegExp, string]> = [
    [/-\s+->/g, '-->'],
    [/--\s+>/g, '-->'],
    [/(^|[^-])-->>/g, '$1-->'],
    [/(^|[^-<=.])->(?!>)/g, '$1-->'],
    [/(^|[^=<])=>(?!>)/g, '$1==>'],
  ];
  const fixLine = (line: string) => {
    if (line.trim().startsWith('%%')) return line;
    // Leave text inside quotes and labels |...| alone.
    return line.replace(/("[^"]*"|\|[^|]*\|)|([^"|]+)/g, (_m, protectedPart: string | undefined, plain: string | undefined) => {
      if (protectedPart) return protectedPart;
      let out = plain ?? '';
      for (const [re, rep] of patterns) out = out.replace(re, rep);
      return out;
    });
  };
  const affected: number[] = [];
  code.split(/\r?\n/).forEach((l, i) => {
    if (i !== header && fixLine(l) !== l) affected.push(i + 1);
  });
  if (affected.length === 0) return null;
  return {
    id: 'flow-arrows',
    title: `Fix ${affected.length} malformed arrow${affected.length === 1 ? '' : 's'}`,
    description: 'Flowchart links use "-->", "==>" or "-.->". Converts "->", "=>", "- ->" and "-->>".',
    lines: affected,
    apply: (c) => {
      const h = findHeaderLine(c).lineIndex;
      return mapLines(c, (l, i) => (i === h ? l : fixLine(l)));
    },
  };
}

function sequenceArrows(code: string): SyntaxFix | null {
  if (detectDiagramType(code) !== 'sequence') return null;
  const re = /^(\s*[\w\s"]+?)\s*(=>|-->(?!>)|—>)\s*([\w"][^:]*:)/;
  const affected: number[] = [];
  code.split(/\r?\n/).forEach((l, i) => {
    if (re.test(l)) affected.push(i + 1);
  });
  if (affected.length === 0) return null;
  return {
    id: 'sequence-arrows',
    title: `Fix ${affected.length} sequence message arrow${affected.length === 1 ? '' : 's'}`,
    description: 'Sequence messages use "->>" (solid) or "-->>" (dashed).',
    lines: affected,
    apply: (c) =>
      mapLines(c, (l) =>
        l.replace(re, (_m, from: string, arrow: string, rest: string) => `${from}${arrow === '-->' ? '-->>' : '->>'}${rest}`),
      ),
  };
}

function specialCharsInLabels(code: string): SyntaxFix | null {
  if (detectDiagramType(code) !== 'flowchart') return null;
  const re = /(\b[\w-]+)\[(?!["/\\[(])([^\]"]*[(){}<>#;][^\]"]*)\]/g;
  const affected: number[] = [];
  code.split(/\r?\n/).forEach((l, i) => {
    re.lastIndex = 0;
    if (re.test(l)) affected.push(i + 1);
  });
  if (affected.length === 0) return null;
  return {
    id: 'quote-labels',
    title: `Quote ${affected.length} label${affected.length === 1 ? '' : 's'} with special characters`,
    description: 'Characters such as ( ) { } ; # inside [ ] labels must be wrapped in double quotes.',
    lines: affected,
    apply: (c) => mapLines(c, (l) => l.replace(re, (_m, id: string, label: string) => `${id}["${label.trim()}"]`)),
  };
}

function missingSubgraphEnd(code: string): SyntaxFix | null {
  if (detectDiagramType(code) !== 'flowchart') return null;
  let depth = 0;
  for (const raw of code.split(/\r?\n/)) {
    const t = raw.trim();
    if (/^subgraph\b/.test(t)) depth++;
    else if (t === 'end') depth = Math.max(0, depth - 1);
  }
  if (depth === 0) return null;
  const total = code.split(/\r?\n/).length;
  return {
    id: 'subgraph-end',
    title: `Add ${depth} missing "end"`,
    description: 'Every "subgraph" block must be closed with "end".',
    lines: [total],
    apply: (c) => c.replace(/\s*$/, '') + '\n' + Array.from({ length: depth }, () => 'end').join('\n') + '\n',
  };
}

/** Returns safe, reviewable fixes for common mistakes. Fixes are never applied without user confirmation. */
export function findSyntaxFixes(code: string): SyntaxFix[] {
  const fence = stripFences(code);
  if (fence) return [fence];
  return [smartQuotes(code), headerCase(code), missingHeader(code), unclosedBrackets(code), malformedFlowArrows(code), sequenceArrows(code), specialCharsInLabels(code), missingSubgraphEnd(code)].filter(
    (f): f is SyntaxFix => f !== null,
  );
}

/** Applies the selected fixes in order, re-detecting each against the current code since earlier fixes can shift lines. */
export function applyFixes(code: string, fixIds: string[]): string {
  let current = code;
  for (const id of fixIds) {
    const fix = findSyntaxFixes(current).find((f) => f.id === id);
    if (fix) current = fix.apply(current);
  }
  return current;
}
