import { Copy, Search, WrapText } from 'lucide-react';
import { forwardRef, memo, useCallback, useState } from 'react';
import { getDiagramTypeLabel } from '../../data/diagramTypes';
import type { DiagramTypeId } from '../../types/diagram';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { IconButton } from '../common/IconButton';
import { CodeEditor, type CodeEditorHandle } from './CodeEditor';

interface EditorPanelProps {
  code: string;
  type: DiagramTypeId;
  onChange: (code: string) => void;
  dark: boolean;
  fontSize: number;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  onCopy: () => void;
  errorLine?: number;
}

const EditorPanelInner = forwardRef<CodeEditorHandle, EditorPanelProps>(function EditorPanel(
  { code, type, onChange, dark, fontSize, wordWrap, onToggleWordWrap, onCopy, errorLine },
  ref,
) {
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const onCursorChange = useCallback((line: number, column: number) => setCursor({ line, column }), []);
  const lineCount = code.split('\n').length;

  const openSearch = () => {
    if (ref && typeof ref === 'object') ref.current?.openSearch();
  };

  return (
    <section className="panel editor-panel" aria-label="Code editor">
      <header className="panel__header">
        <h2 className="panel__title">Mermaid code</h2>
        <span className="badge" title="Detected diagram type">
          {getDiagramTypeLabel(type)}
        </span>
        <div className="panel__actions">
          <IconButton label="Search and replace" shortcut="mod+f" icon={<Search size={16} aria-hidden />} onClick={openSearch} />
          <IconButton label={wordWrap ? 'Disable word wrap' : 'Enable word wrap'} icon={<WrapText size={16} aria-hidden />} active={wordWrap} onClick={onToggleWordWrap} />
          <IconButton label="Copy Mermaid code" icon={<Copy size={16} aria-hidden />} onClick={onCopy} />
        </div>
      </header>
      <div className="editor-panel__body">
        <ErrorBoundary area="Code editor">
          <CodeEditor ref={ref} value={code} onChange={onChange} onCursorChange={onCursorChange} dark={dark} fontSize={fontSize} wordWrap={wordWrap} errorLine={errorLine} />
        </ErrorBoundary>
      </div>
      <footer className="panel__footer" aria-live="off">
        <span>
          Ln {cursor.line}, Col {cursor.column}
        </span>
        <span>
          {lineCount} lines · {code.length.toLocaleString()} chars
        </span>
      </footer>
    </section>
  );
});

export const EditorPanel = memo(EditorPanelInner);
