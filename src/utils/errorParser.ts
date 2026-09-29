import type { RenderError } from '../types/diagram';

interface JisonHash {
  line?: number;
  loc?: { first_line?: number; first_column?: number; last_line?: number; last_column?: number };
  text?: string;
  token?: string;
  expected?: string[];
}

function cleanMessage(message: string): string {
  return message
    .replace(/^Error:\s*/, '')
    .replace(/\s+at\s+.*$/s, '')
    .trim();
}

/**
 * Converts an error thrown by Mermaid (jison parsers, Langium parsers, or generic errors) into a
 * `RenderError` with a best-effort 1-based line/column mapped to the editor source.
 */
export function parseMermaidError(err: unknown, code: string): RenderError {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : (err as { message?: string })?.message ?? String(err);
  const message = cleanMessage(raw || 'Unknown error while rendering the diagram.');
  const hash = (err as { hash?: JisonHash })?.hash;

  let line: number | undefined;
  let column: number | undefined;

  if (hash?.loc?.first_line !== undefined) {
    line = hash.loc.first_line;
    if (hash.loc.first_column !== undefined) column = hash.loc.first_column + 1;
  } else if (typeof hash?.line === 'number') {
    line = hash.line + 1;
  }

  if (line === undefined) {
    const m = message.match(/line[:\s]+(\d+)(?:[,\s]+col(?:umn)?[:\s]+(\d+))?/i);
    if (m) {
      line = Number(m[1]);
      if (m[2]) column = Number(m[2]);
    }
  }

  if (line === undefined && /No diagram type detected|UnknownDiagramError/i.test(message)) {
    const lines = code.split(/\r?\n/);
    const idx = lines.findIndex((l) => l.trim() !== '' && !l.trim().startsWith('%%'));
    line = idx >= 0 ? idx + 1 : 1;
  }

  const totalLines = code.split(/\r?\n/).length;
  if (line !== undefined) line = Math.min(Math.max(1, line), totalLines);

  return { message: humanize(message), line, column, excerpt: buildExcerpt(code, line, column) };
}

function humanize(message: string): string {
  if (/No diagram type detected/i.test(message)) {
    return 'No diagram type detected. The first line must declare the diagram type, for example "flowchart TD" or "sequenceDiagram".';
  }
  if (/Maximum text size in diagram exceeded/i.test(message)) {
    return 'The diagram is larger than the maximum text size Mermaid allows.';
  }
  return message;
}

export function buildExcerpt(code: string, line?: number, column?: number): string | undefined {
  if (!line) return undefined;
  const lines = code.split(/\r?\n/);
  const start = Math.max(1, line - 1);
  const end = Math.min(lines.length, line + 1);
  const width = String(end).length;
  const out: string[] = [];
  for (let n = start; n <= end; n++) {
    const marker = n === line ? '>' : ' ';
    out.push(`${marker} ${String(n).padStart(width)} | ${lines[n - 1]}`);
    if (n === line && column) out.push(`  ${' '.repeat(width)} | ${' '.repeat(Math.max(0, column - 1))}^`);
  }
  return out.join('\n');
}
