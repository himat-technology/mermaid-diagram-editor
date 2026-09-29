import { useState } from 'react';
import { getDiagramTypeLabel } from '../../data/diagramTypes';
import type { MermaidBlock } from '../../types/diagram';
import { detectDiagramType } from '../../utils/diagramDetection';
import { Modal } from '../common/Modal';
import { DiagramTypeIcon } from '../Templates/DiagramTypeIcon';

interface MarkdownBlockPickerProps {
  open: boolean;
  fileName: string;
  blocks: MermaidBlock[];
  onSelect: (block: MermaidBlock) => void;
  onClose: () => void;
}

function PickerContent({ fileName, blocks, onSelect, onClose }: Omit<MarkdownBlockPickerProps, 'open'>) {
  const [selected, setSelected] = useState(0);
  const block = blocks[selected];
  return (
    <Modal
      open
      title="Choose a diagram"
      description={`"${fileName}" contains ${blocks.length} Mermaid diagrams. Pick the one to open.`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onSelect(block)}>
            Open diagram {block.index}
          </button>
        </>
      }
    >
      <div className="block-picker">
        <ul className="item-list block-picker__list" role="listbox" aria-label="Mermaid diagrams in file">
          {blocks.map((b, i) => {
            const type = detectDiagramType(b.code);
            return (
              <li key={b.index} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={i === selected}
                  className={`list-item ${i === selected ? 'is-active' : ''}`}
                  onClick={() => setSelected(i)}
                  onDoubleClick={() => onSelect(b)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      const next = Math.min(blocks.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)));
                      setSelected(next);
                      (e.currentTarget.parentElement?.parentElement?.children[next]?.querySelector('button') as HTMLButtonElement | null)?.focus();
                    }
                  }}
                >
                  <span className="list-item__icon">
                    <DiagramTypeIcon type={type} />
                  </span>
                  <span className="list-item__text">
                    <span className="list-item__title">
                      #{b.index} · {b.title}
                    </span>
                    <span className="list-item__meta">
                      {getDiagramTypeLabel(type)} · line {b.line} · {b.code.split('\n').length - 1} lines
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <pre className="block-picker__preview" aria-label={`Source of diagram ${block.index}`}>
          {block.code}
        </pre>
      </div>
    </Modal>
  );
}

export function MarkdownBlockPicker({ open, ...rest }: MarkdownBlockPickerProps) {
  if (!open || rest.blocks.length === 0) return null;
  return <PickerContent {...rest} />;
}
