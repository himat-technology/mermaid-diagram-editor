import { ClipboardPaste, Upload, X } from 'lucide-react';
import { memo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { formatShortcut } from '../../hooks/useKeyboardShortcuts';

export type SidebarTab = 'types' | 'templates' | 'recent';

const TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: 'types', label: 'Types' },
  { id: 'templates', label: 'Templates' },
  { id: 'recent', label: 'Recent' },
];

interface SidebarProps {
  open: boolean;
  isDrawer: boolean;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onClose: () => void;
  onImport: () => void;
  onPaste: () => void;
  recentCount: number;
  children: Record<SidebarTab, ReactNode>;
}

export const Sidebar = memo(function Sidebar({ open, isDrawer, tab, onTabChange, onClose, onImport, onPaste, recentCount, children }: SidebarProps) {
  const tabRefs = useRef<Record<SidebarTab, HTMLButtonElement | null>>({ types: null, templates: null, recent: null });

  const onTabKeyDown = (e: KeyboardEvent) => {
    const idx = TABS.findIndex((t) => t.id === tab);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    else return;
    e.preventDefault();
    onTabChange(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  if (!open) return null;

  return (
    <>
      {isDrawer && <div className="drawer-backdrop" onClick={onClose} aria-hidden />}
      <aside className={`sidebar ${isDrawer ? 'sidebar--drawer' : ''}`} aria-label="Diagrams and templates">
        <div className="sidebar__top">
          <button type="button" className="btn btn--primary btn--block" onClick={onImport} data-tooltip={`Import .mmd, .md or .himatdiagram (${formatShortcut('mod+o')})`} data-tooltip-pos="bottom">
            <Upload size={15} aria-hidden /> Import file
          </button>
          <button type="button" className="icon-btn" onClick={onPaste} aria-label="Paste Mermaid or Markdown" data-tooltip="Paste Mermaid or Markdown" data-tooltip-pos="bottom">
            <ClipboardPaste size={16} aria-hidden />
          </button>
          {isDrawer && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close sidebar">
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
        <div className="tabs" role="tablist" aria-label="Sidebar sections" onKeyDown={onTabKeyDown}>
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`sidebar-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`sidebar-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={`tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
              {t.id === 'recent' && recentCount > 0 && <span className="tab__count">{recentCount}</span>}
            </button>
          ))}
        </div>
        <div className="sidebar__content" role="tabpanel" id={`sidebar-panel-${tab}`} aria-labelledby={`sidebar-tab-${tab}`}>
          {children[tab]}
        </div>
      </aside>
    </>
  );
});
