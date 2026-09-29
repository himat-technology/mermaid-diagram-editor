import { useState } from 'react';
import { detectDiagramType } from '../../utils/diagramDetection';
import { getDiagramTypeLabel } from '../../data/diagramTypes';
import { extractMermaidBlocks, looksLikeMarkdownWithMermaid } from '../../utils/markdownParser';
import { Modal } from '../common/Modal';

interface PasteDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (text: string) => void;
}

function describe(text: string): string {
  if (!text.trim()) return 'Paste Mermaid code, Markdown containing ```mermaid blocks, or a .himatdiagram JSON project.';
  if (text.trim().startsWith('{')) return 'Looks like a project file (JSON).';
  if (looksLikeMarkdownWithMermaid(text)) {
    const n = extractMermaidBlocks(text).length;
    return `Markdown with ${n} Mermaid block${n === 1 ? '' : 's'}.`;
  }
  const type = detectDiagramType(text);
  return type === 'unknown' ? 'No diagram type detected — it will be imported as-is.' : `Mermaid ${getDiagramTypeLabel(type)}.`;
}

function PasteDialogContent({ onClose, onImport }: Omit<PasteDialogProps, 'open'>) {
  const [text, setText] = useState('');
  return (
    <Modal
      open
      title="Paste diagram"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" disabled={!text.trim()} onClick={() => onImport(text)}>
            Import as new diagram
          </button>
        </>
      }
    >
      <label className="field__label" htmlFor="paste-input">
        Content
      </label>
      <textarea
        id="paste-input"
        className="input paste-input"
        rows={14}
        spellCheck={false}
        placeholder={'flowchart LR\n  A --> B'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim()) {
            e.preventDefault();
            onImport(text);
          }
        }}
      />
      <p className="field__hint" aria-live="polite">
        {describe(text)}
      </p>
    </Modal>
  );
}

export function PasteDialog({ open, ...rest }: PasteDialogProps) {
  if (!open) return null;
  return <PasteDialogContent {...rest} />;
}
