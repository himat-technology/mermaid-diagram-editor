import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from '@codemirror/search';
import { Compartment, EditorSelection, EditorState, StateEffect, StateField } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  crosshairCursor,
  Decoration,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
  type DecorationSet,
} from '@codemirror/view';
import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import { mermaidHighlightStyle, mermaidLanguage } from './mermaidLanguage';

export interface CodeEditorHandle {
  focus: () => void;
  goTo: (line: number, column?: number) => void;
  openSearch: () => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  dark: boolean;
  fontSize: number;
  wordWrap: boolean;
  errorLine?: number;
}

const setErrorLine = StateEffect.define<number | null>();
const errorLineDecoration = Decoration.line({ class: 'cm-error-line' });

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        if (e.value === null || e.value < 1 || e.value > tr.state.doc.lines) deco = Decoration.none;
        else deco = Decoration.set([errorLineDecoration.range(tr.state.doc.line(e.value).from)]);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const lightTheme = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--editor-bg)', color: 'var(--text)' },
    '.cm-gutters': { backgroundColor: 'var(--editor-gutter)', color: 'var(--text-muted)', borderRight: '1px solid var(--border)' },
    '.cm-activeLine': { backgroundColor: 'var(--editor-active-line)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--editor-active-line)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: 'var(--editor-selection) !important' },
    '.cm-cursor': { borderLeftColor: 'var(--text)' },
  },
  { dark: false },
);

const baseTheme = EditorView.theme({
  '&': { height: '100%' },
  // Ligatures would merge Mermaid arrows like "-->" into a single glyph.
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6', fontVariantLigatures: 'none', fontFeatureSettings: '"liga" 0, "calt" 0' },
  '.cm-content': { padding: '8px 0' },
  '.cm-error-line': { backgroundColor: 'var(--error-line-bg)', outline: '1px solid var(--error-line-border)' },
  '.cm-panels': { fontFamily: 'var(--font-sans)' },
});

/** CodeMirror 6 wrapped as a controlled React component. */
const CodeEditorInner = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, onCursorChange, dark, fontSize, wordWrap, errorLine },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorRef = useRef(onCursorChange);
  onCursorRef.current = onCursorChange;
  const themeCompartment = useRef(new Compartment());
  const fontCompartment = useRef(new Compartment());
  const wrapCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!hostRef.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ activateOnTyping: true }),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        search({ top: true }),
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, indentWithTab]),
        mermaidLanguage(),
        syntaxHighlighting(mermaidHighlightStyle),
        errorLineField,
        baseTheme,
        themeCompartment.current.of(dark ? oneDark : lightTheme),
        fontCompartment.current.of(EditorView.theme({ '&': { fontSize: `${fontSize}px` } })),
        wrapCompartment.current.of(wordWrap ? EditorView.lineWrapping : []),
        EditorView.contentAttributes.of({ 'aria-label': 'Mermaid source code editor' }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) {
            const head = update.state.selection.main.head;
            const line = update.state.doc.lineAt(head);
            onCursorRef.current?.(line.number, head - line.from + 1);
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor is created once; later prop changes are applied through compartments/transactions.
  }, []);

  // External value changes (template load, import, fix) replace the document; this stays undoable.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      selection: EditorSelection.cursor(Math.min(view.state.selection.main.head, value.length)),
    });
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: themeCompartment.current.reconfigure(dark ? oneDark : lightTheme) });
  }, [dark]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: fontCompartment.current.reconfigure(EditorView.theme({ '&': { fontSize: `${fontSize}px` } })) });
  }, [fontSize]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: wrapCompartment.current.reconfigure(wordWrap ? EditorView.lineWrapping : []) });
  }, [wordWrap]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setErrorLine.of(errorLine ?? null) });
  }, [errorLine, value]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => viewRef.current?.focus(),
      goTo: (line, column = 1) => {
        const view = viewRef.current;
        if (!view) return;
        const l = view.state.doc.line(Math.min(Math.max(1, line), view.state.doc.lines));
        const pos = Math.min(l.from + Math.max(0, column - 1), l.to);
        view.dispatch({ selection: EditorSelection.cursor(pos), effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
        view.focus();
      },
      openSearch: () => {
        const view = viewRef.current;
        if (view) openSearchPanel(view);
      },
    }),
    [],
  );

  return <div ref={hostRef} className="code-editor" />;
});

export const CodeEditor = memo(CodeEditorInner);
