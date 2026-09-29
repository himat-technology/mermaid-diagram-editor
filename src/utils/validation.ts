import { detectDiagramType, findHeaderLine } from './diagramDetection';

export const MAX_CODE_LENGTH = 500_000;

export interface ValidationIssue {
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

const PAIRS: Record<string, string> = { '[': ']', '(': ')', '{': '}' };
const CLOSERS = new Set(Object.values(PAIRS));

/** Finds bracket imbalances on a single line, ignoring text inside double quotes. */
export function findUnbalancedBrackets(line: string): { unclosed: Array<{ char: string; column: number }>; unexpected: Array<{ char: string; column: number }> } {
  const stack: Array<{ char: string; column: number }> = [];
  const unexpected: Array<{ char: string; column: number }> = [];
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (ch in PAIRS) stack.push({ char: ch, column: i + 1 });
    else if (CLOSERS.has(ch)) {
      const top = stack[stack.length - 1];
      if (top && PAIRS[top.char] === ch) stack.pop();
      else unexpected.push({ char: ch, column: i + 1 });
    }
  }
  return { unclosed: stack, unexpected };
}

/**
 * Fast structural validation that does not require Mermaid. It catches common problems before the full
 * parser runs, and powers the unit tests. Mermaid's own parser remains the source of truth.
 */
export function validateMermaidCode(code: string): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (code.trim() === '') {
    return { valid: false, issues: [{ message: 'The diagram is empty.', severity: 'error' }] };
  }
  if (code.length > MAX_CODE_LENGTH) {
    issues.push({ message: `The diagram exceeds the maximum size of ${MAX_CODE_LENGTH.toLocaleString()} characters.`, severity: 'error' });
  }

  const header = findHeaderLine(code);
  const type = detectDiagramType(code);
  if (type === 'unknown') {
    issues.push({
      message: `Unknown diagram type "${header.text.split(/\s+/)[0] ?? ''}". The first line must declare a diagram, e.g. "flowchart TD".`,
      line: header.lineIndex + 1 || 1,
      severity: 'error',
    });
  }

  const bracketChecked = type === 'flowchart' || type === 'state' || type === 'block';
  const lines = code.split(/\r?\n/);
  let subgraphDepth = 0;
  let lastSubgraphLine = 0;

  lines.forEach((raw, idx) => {
    const line = raw.replace(/%%.*$/, '');
    if (bracketChecked) {
      const { unclosed, unexpected } = findUnbalancedBrackets(line);
      for (const u of unclosed) {
        issues.push({ message: `Unclosed "${u.char}" (expected "${PAIRS[u.char]}").`, line: idx + 1, column: u.column, severity: 'error' });
      }
      for (const u of unexpected) {
        issues.push({ message: `Unexpected "${u.char}".`, line: idx + 1, column: u.column, severity: 'error' });
      }
    }
    if (type === 'flowchart') {
      const trimmed = line.trim();
      if (/^subgraph\b/.test(trimmed)) {
        subgraphDepth++;
        lastSubgraphLine = idx + 1;
      } else if (trimmed === 'end') {
        subgraphDepth--;
        if (subgraphDepth < 0) {
          issues.push({ message: '"end" without a matching "subgraph".', line: idx + 1, severity: 'error' });
          subgraphDepth = 0;
        }
      }
    }
  });

  if (subgraphDepth > 0) {
    issues.push({ message: `${subgraphDepth} subgraph(s) missing a closing "end".`, line: lastSubgraphLine, severity: 'error' });
  }

  return { valid: !issues.some((i) => i.severity === 'error'), issues };
}
