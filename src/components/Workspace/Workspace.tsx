import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface WorkspaceProps {
  editor: ReactNode;
  preview: ReactNode;
  /** On small screens only one pane is visible at a time. */
  stacked: boolean;
  mobilePane: 'code' | 'preview';
  onMobilePaneChange: (pane: 'code' | 'preview') => void;
}

const SPLIT_KEY = 'mde:split';

function loadSplit(): number {
  const v = Number(localStorage.getItem(SPLIT_KEY));
  return Number.isFinite(v) && v >= 20 && v <= 80 ? v : 42;
}

export const Workspace = memo(function Workspace({ editor, preview, stacked, mobilePane, onMobilePaneChange }: WorkspaceProps) {
  const [split, setSplit] = useState(loadSplit);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(SPLIT_KEY, String(split));
    } catch {
      // Optional persistence.
    }
  }, [split]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.classList.add('is-resizing');
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(80, Math.max(20, pct)));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    document.body.classList.remove('is-resizing');
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') setSplit((s) => Math.max(20, s - step));
    else if (e.key === 'ArrowRight') setSplit((s) => Math.min(80, s + step));
    else if (e.key === 'Home') setSplit(20);
    else if (e.key === 'End') setSplit(80);
    else return;
    e.preventDefault();
  }, []);

  if (stacked) {
    return (
      <div className="workspace workspace--stacked">
        <div className="pane-switch" role="tablist" aria-label="View">
          {(['code', 'preview'] as const).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={mobilePane === p} className={`pane-switch__btn ${mobilePane === p ? 'is-active' : ''}`} onClick={() => onMobilePaneChange(p)}>
              {p === 'code' ? 'Code' : 'Preview'}
            </button>
          ))}
        </div>
        {/* Both panes stay mounted so the editor keeps its state and the preview keeps rendering. */}
        <div className={`workspace__pane ${mobilePane === 'code' ? '' : 'is-hidden'}`}>{editor}</div>
        <div className={`workspace__pane ${mobilePane === 'preview' ? '' : 'is-hidden'}`}>{preview}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="workspace" style={{ gridTemplateColumns: `${split}% 6px minmax(0, 1fr)` }}>
      <div className="workspace__pane">{editor}</div>
      <div
        className="splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize editor and preview"
        aria-valuemin={20}
        aria-valuemax={80}
        aria-valuenow={Math.round(split)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={() => setSplit(42)}
      />
      <div className="workspace__pane">{preview}</div>
    </div>
  );
});
