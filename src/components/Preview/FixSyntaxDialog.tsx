import { useMemo, useState } from 'react';
import { applyFixes, findSyntaxFixes } from '../../utils/syntaxFixer';
import { Modal } from '../common/Modal';

interface FixSyntaxDialogProps {
  open: boolean;
  code: string;
  onApply: (code: string) => void;
  onClose: () => void;
}

interface DiffLine {
  kind: 'same' | 'removed' | 'added';
  text: string;
  line: number;
}

/** Minimal line diff (LCS) — inputs are single diagrams, so quadratic cost is fine. */
function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  if (a.length * b.length > 4_000_000) return b.map((text, i) => ({ kind: 'added', text, line: i + 1 }));
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i], line: j + 1 });
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || dp[i][j + 1] >= dp[i + 1][j])) {
      out.push({ kind: 'added', text: b[j], line: j + 1 });
      j++;
    } else {
      out.push({ kind: 'removed', text: a[i], line: i + 1 });
      i++;
    }
  }
  return out;
}

function DialogContent({ code, onApply, onClose }: Omit<FixSyntaxDialogProps, 'open'>) {
  const fixes = useMemo(() => findSyntaxFixes(code), [code]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(fixes.map((f) => f.id)));
  const selectedIds = fixes.filter((f) => selected.has(f.id)).map((f) => f.id);
  const selectedKey = selectedIds.join('|');
  const result = useMemo(() => applyFixes(code, selectedKey ? selectedKey.split('|') : []), [code, selectedKey]);
  const diff = useMemo(() => diffLines(code, result).filter((d, idx, arr) => d.kind !== 'same' || arr.slice(Math.max(0, idx - 1), idx + 2).some((n) => n.kind !== 'same')), [code, result]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      open
      title="Fix syntax"
      description="Review the suggested fixes. Your code only changes when you click Apply, and you can undo with Ctrl/Cmd+Z."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" disabled={selectedIds.length === 0 || result === code} onClick={() => onApply(result)}>
            Apply {selectedIds.length} fix{selectedIds.length === 1 ? '' : 'es'}
          </button>
        </>
      }
    >
      {fixes.length === 0 ? (
        <p className="empty-state">No automatic fixes are available for this error. Check the error message and the highlighted line.</p>
      ) : (
        <>
          <fieldset className="fix-list">
            <legend className="sr-only">Available fixes</legend>
            {fixes.map((fix) => (
              <label key={fix.id} className="fix-item">
                <input type="checkbox" checked={selected.has(fix.id)} onChange={() => toggle(fix.id)} />
                <span>
                  <strong>{fix.title}</strong>
                  <span className="fix-item__desc">
                    {fix.description} {fix.lines.length > 0 && <em>Line{fix.lines.length > 1 ? 's' : ''} {fix.lines.slice(0, 8).join(', ')}{fix.lines.length > 8 ? '…' : ''}</em>}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <h3 className="section-title">Preview of changes</h3>
          <pre className="diff" aria-label="Diff of proposed changes">
            {diff.length === 0 ? (
              <span className="diff__line">No changes</span>
            ) : (
              diff.map((d, idx) => (
                <span key={idx} className={`diff__line diff__line--${d.kind}`}>
                  <span className="diff__sign" aria-hidden>
                    {d.kind === 'added' ? '+' : d.kind === 'removed' ? '−' : ' '}
                  </span>
                  <span className="sr-only">{d.kind === 'added' ? 'Added: ' : d.kind === 'removed' ? 'Removed: ' : ''}</span>
                  {d.text || ' '}
                  {'\n'}
                </span>
              ))
            )}
          </pre>
        </>
      )}
    </Modal>
  );
}

export function FixSyntaxDialog({ open, ...rest }: FixSyntaxDialogProps) {
  if (!open) return null;
  return <DialogContent {...rest} />;
}
