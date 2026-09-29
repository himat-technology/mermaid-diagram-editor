import { completeFromList, type Completion } from '@codemirror/autocomplete';
import { foldService, HighlightStyle, indentService, StreamLanguage, type StreamParser } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';
import { HEADER_KEYWORDS } from '../../utils/diagramDetection';

const KEYWORDS = new Set([
  'subgraph', 'end', 'direction', 'style', 'classDef', 'class', 'linkStyle', 'click', 'call', 'href',
  'participant', 'actor', 'as', 'note', 'Note', 'over', 'left', 'right', 'of', 'loop', 'alt', 'else', 'opt', 'par', 'and',
  'critical', 'break', 'rect', 'activate', 'deactivate', 'autonumber', 'box', 'create', 'destroy', 'link', 'links',
  'state', 'title', 'section', 'dateFormat', 'axisFormat', 'tickInterval', 'excludes', 'includes', 'todayMarker', 'weekday',
  'commit', 'branch', 'checkout', 'merge', 'cherry-pick', 'id', 'tag', 'type', 'order',
  'accTitle', 'accDescr', 'showData', 'x-axis', 'y-axis', 'quadrant-1', 'quadrant-2', 'quadrant-3', 'quadrant-4',
  'requirement', 'functionalRequirement', 'performanceRequirement', 'interfaceRequirement', 'physicalRequirement',
  'designConstraint', 'element', 'satisfies', 'traces', 'contains', 'copies', 'derives', 'verifies', 'refines',
  'group', 'service', 'junction', 'in', 'columns', 'space', 'block', 'bar', 'line', 'set', 'union', 'axis', 'curve', 'max', 'min',
  'Person', 'Person_Ext', 'System', 'System_Ext', 'SystemDb', 'SystemQueue', 'Container', 'ContainerDb', 'Component',
  'Rel', 'BiRel', 'Rel_U', 'Rel_D', 'Rel_L', 'Rel_R', 'Boundary', 'System_Boundary', 'Container_Boundary', 'Enterprise_Boundary',
  'TB', 'TD', 'BT', 'LR', 'RL',
]);

const HEADERS = new Set(HEADER_KEYWORDS);

interface State {
  inFrontMatter: boolean;
  frontMatterDone: boolean;
  lineStart: boolean;
}

const parser: StreamParser<State> = {
  name: 'mermaid',
  startState: () => ({ inFrontMatter: false, frontMatterDone: false, lineStart: true }),
  token(stream, state) {
    if (stream.sol()) state.lineStart = true;

    if (stream.sol() && stream.match(/^---\s*$/)) {
      if (!state.frontMatterDone) {
        if (state.inFrontMatter) state.frontMatterDone = true;
        state.inFrontMatter = !state.inFrontMatter;
      }
      return 'meta';
    }
    if (state.inFrontMatter) {
      if (stream.match(/^\s*[\w-]+(?=:)/)) return 'propertyName';
      stream.skipToEnd();
      return 'string';
    }

    if (stream.eatSpace()) return null;

    if (stream.match(/^%%\{.*\}%%/)) return 'meta';
    if (stream.match('%%')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match(/^"(?:[^"\\]|\\.)*"?/)) return 'string';
    if (stream.match(/^`[^`]*`?/)) return 'string';
    if (stream.match(/^\|[^|]*\|/)) return 'labelName';

    if (
      stream.match(/^(<<-->>|<<->>|--?>>|--?[x)]|<?-?\.+-?>?|<?={2,}[>ox]?|<?-{2,}[>ox]?|~~~|\|\|--o\{|\}o--\|\||[|}][|o]--[|o][|{]|\.\.>|<\|--|--\|>|\*--|--\*|o--|--o|->|<-)/)
    ) {
      state.lineStart = false;
      return 'operator';
    }
    if (stream.match(/^:::?[\w-]+/)) return 'className';
    if (stream.match(/^[[\](){}]/)) return 'bracket';
    if (stream.match(/^-?\d+(\.\d+)?(%|px|d|h|m|s|w)?\b/)) return 'number';
    if (stream.match(/^@\{/)) return 'bracket';

    const word = stream.match(/^[A-Za-z_][\w-]*/) as RegExpMatchArray | null;
    if (word) {
      const w = word[0];
      const wasLineStart = state.lineStart;
      state.lineStart = false;
      if (wasLineStart && HEADERS.has(w)) return 'heading';
      if (KEYWORDS.has(w)) return 'keyword';
      if (stream.peek() === ':' && /^(id|type|text|risk|verifymethod|docref|tag|assigned|priority|ticket|icon|label)$/.test(w)) return 'propertyName';
      return 'variableName';
    }

    stream.next();
    state.lineStart = false;
    return null;
  },
  languageData: {
    commentTokens: { line: '%%' },
    indentOnInput: /^\s*end$/,
  },
};

export const mermaidStreamLanguage = StreamLanguage.define(parser);

export const mermaidHighlightStyle = HighlightStyle.define([
  { tag: t.heading, color: 'var(--syn-heading)', fontWeight: '600' },
  { tag: t.keyword, color: 'var(--syn-keyword)' },
  { tag: t.string, color: 'var(--syn-string)' },
  { tag: t.comment, color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: t.meta, color: 'var(--syn-meta)' },
  { tag: t.operator, color: 'var(--syn-operator)', fontWeight: '600' },
  { tag: t.number, color: 'var(--syn-number)' },
  { tag: t.bracket, color: 'var(--syn-bracket)' },
  { tag: t.labelName, color: 'var(--syn-label)' },
  { tag: t.className, color: 'var(--syn-class)' },
  { tag: t.propertyName, color: 'var(--syn-property)' },
  { tag: t.variableName, color: 'var(--syn-variable)' },
]);

const completions: Completion[] = [
  ...HEADER_KEYWORDS.map((label) => ({ label, type: 'class', detail: 'diagram', boost: 2 })),
  ...[...KEYWORDS].map((label) => ({ label, type: 'keyword' })),
  { label: '-->', type: 'operator', detail: 'arrow' },
  { label: '-.->', type: 'operator', detail: 'dotted arrow' },
  { label: '==>', type: 'operator', detail: 'thick arrow' },
  { label: '->>', type: 'operator', detail: 'sequence message' },
  { label: '-->>', type: 'operator', detail: 'sequence reply' },
];

/** Indentation-based folding: a line folds everything below it that is indented deeper. */
const indentFold = foldService.of((state, lineStart, lineEnd) => {
  const line = state.doc.lineAt(lineStart);
  if (!line.text.trim()) return null;
  const indent = /^\s*/.exec(line.text)![0].length;
  let end = lineEnd;
  let foundDeeper = false;
  for (let n = line.number + 1; n <= state.doc.lines; n++) {
    const next = state.doc.line(n);
    if (!next.text.trim()) continue;
    const nextIndent = /^\s*/.exec(next.text)![0].length;
    if (nextIndent <= indent) {
      // Include a closing "end"/"}" at the same level in the fold.
      if (foundDeeper && /^\s*(end|\})\s*$/.test(next.text) && nextIndent === indent) end = next.from - 1;
      break;
    }
    foundDeeper = true;
    end = next.to;
  }
  return foundDeeper && end > lineEnd ? { from: lineEnd, to: end } : null;
});

/** Keeps the previous line's indentation and indents after block openers. */
const blockIndent = indentService.of((context, pos) => {
  const doc = context.state.doc;
  const line = doc.lineAt(pos);
  const prev = line.number > 1 && pos === line.from ? doc.line(line.number - 1) : line;
  const text = prev.text;
  const base = /^\s*/.exec(text)![0].length;
  const unit = context.unit;
  if (prev !== line && /^\s*(end|\})\s*$/.test(line.text)) return Math.max(0, base - unit);
  if (/^\s*(subgraph|loop|alt|opt|par|critical|break|rect|box|state\s.*\{|class\s.*\{|section|group)\b/.test(text) || /[{]\s*$/.test(text)) return base + unit;
  if (/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|mindmap|timeline|gitGraph|pie|quadrantChart|requirementDiagram|C4\w+|kanban|block|architecture|xychart|sankey|radar|venn|treeView|ishikawa)/.test(text)) return base + unit;
  return base;
});

export function mermaidLanguage(): Extension[] {
  return [mermaidStreamLanguage, mermaidStreamLanguage.data.of({ autocomplete: completeFromList(completions) }), indentFold, blockIndent];
}
