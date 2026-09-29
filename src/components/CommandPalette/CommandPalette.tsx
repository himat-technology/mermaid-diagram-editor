import { Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatShortcut } from '../../hooks/useKeyboardShortcuts';

export interface Command {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

/** Subsequence match with a bonus for contiguous and word-start matches. Returns -1 for no match. */
function score(text: string, query: string): number {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  const direct = t.indexOf(q);
  if (direct >= 0) return 1000 - direct + (direct === 0 || t[direct - 1] === ' ' ? 200 : 0);
  let ti = 0;
  let s = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return -1;
    s += found === ti ? 5 : 1;
    ti = found + 1;
  }
  return s;
}

function PaletteContent({ onClose, commands }: Omit<CommandPaletteProps, 'open'>) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return commands.filter((c) => c.group !== 'Diagram types' && c.group !== 'Templates').concat(commands.filter((c) => c.group === 'Templates').slice(0, 4));
    return commands
      .map((c) => ({ c, s: Math.max(score(c.label, q), score(`${c.group} ${c.keywords ?? ''}`, q) - 50) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 50)
      .map((r) => r.c);
  }, [commands, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const execute = (cmd: Command | undefined) => {
    if (!cmd) return;
    onClose();
    // Let the palette unmount (and restore focus) before running the command.
    window.setTimeout(cmd.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
  };

  let lastGroup = '';
  return createPortal(
    <div className="modal-backdrop modal-backdrop--top" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKeyDown}>
        <div className="palette__search">
          <Search size={16} aria-hidden />
          <input
            ref={inputRef}
            className="palette__input"
            placeholder="Type a command, template or diagram type…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            aria-autocomplete="list"
          />
          <kbd>Esc</kbd>
        </div>
        <ul ref={listRef} id={listId} className="palette__list" role="listbox" aria-label="Commands">
          {results.length === 0 && <li className="empty-state">No matching commands.</li>}
          {results.map((cmd, i) => {
            const header = cmd.group !== lastGroup ? cmd.group : null;
            lastGroup = cmd.group;
            return (
              <li key={cmd.id} role="presentation">
                {header && (
                  <div className="palette__group" role="presentation">
                    {header}
                  </div>
                )}
                <div
                  id={`${listId}-${cmd.id}`}
                  role="option"
                  aria-selected={i === active}
                  data-index={i}
                  className={`palette__item ${i === active ? 'is-active' : ''}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => execute(cmd)}
                >
                  <span>{cmd.label}</span>
                  {cmd.shortcut && <kbd>{formatShortcut(cmd.shortcut)}</kbd>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

export function CommandPalette({ open, ...rest }: CommandPaletteProps) {
  if (!open) return null;
  return <PaletteContent {...rest} />;
}
