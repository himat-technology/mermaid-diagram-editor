import { Check } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { formatShortcut } from '../../hooks/useKeyboardShortcuts';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export type MenuEntry = MenuItem | { id: string; separator: true } | { id: string; heading: string };

interface MenuProps {
  /** Renders the trigger. Spread the props onto a button. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    onClick: () => void;
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
    'aria-controls': string;
  }) => ReactNode;
  items: MenuEntry[];
  align?: 'start' | 'end';
  label: string;
}

const isItem = (e: MenuEntry): e is MenuItem => 'onSelect' in e;

/** Dropdown menu following the WAI-ARIA menu button pattern (arrow keys, Home/End, Escape, typeahead). */
export function Menu({ trigger, items, align = 'start', label }: MenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const focusItem = (index: number) => {
    const nodes = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not([disabled])');
    if (!nodes || nodes.length === 0) return;
    nodes[(index + nodes.length) % nodes.length].focus();
  };

  useEffect(() => {
    if (!open) return;
    focusItem(0);
    const onDocDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not([disabled])') ?? []);
    const idx = nodes.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(idx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(idx - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(nodes.length - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const start = idx + 1;
      const ordered = [...nodes.slice(start), ...nodes.slice(0, start)];
      ordered.find((n) => n.textContent?.trim().toLowerCase().startsWith(e.key.toLowerCase()))?.focus();
    }
  };

  return (
    <div className="menu">
      {trigger({
        ref: triggerRef,
        onClick: () => setOpen((o) => !o),
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': menuId,
      })}
      {open && (
        <div ref={menuRef} id={menuId} className={`menu__popup menu__popup--${align}`} role="menu" aria-label={label} onKeyDown={onKeyDown}>
          {items.map((entry) => {
            if ('separator' in entry) return <div key={entry.id} className="menu__separator" role="separator" />;
            if ('heading' in entry)
              return (
                <div key={entry.id} className="menu__heading" role="presentation">
                  {entry.heading}
                </div>
              );
            if (!isItem(entry)) return null;
            const checkable = entry.checked !== undefined;
            return (
              <button
                key={entry.id}
                type="button"
                role={checkable ? 'menuitemradio' : 'menuitem'}
                aria-checked={checkable ? entry.checked : undefined}
                className={`menu__item ${entry.danger ? 'menu__item--danger' : ''}`}
                disabled={entry.disabled}
                tabIndex={-1}
                onClick={() => {
                  close();
                  entry.onSelect();
                }}
              >
                <span className="menu__icon" aria-hidden>
                  {checkable ? entry.checked ? <Check size={14} /> : null : entry.icon}
                </span>
                <span className="menu__label">{entry.label}</span>
                {entry.shortcut && <kbd className="menu__shortcut">{formatShortcut(entry.shortcut)}</kbd>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
