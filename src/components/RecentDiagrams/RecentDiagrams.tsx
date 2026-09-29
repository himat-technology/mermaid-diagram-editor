import { CopyPlus, Download, Ellipsis, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { getDiagramTypeLabel } from '../../data/diagramTypes';
import { filterDiagrams } from '../../services/storageService';
import type { Diagram } from '../../types/diagram';
import { formatRelativeTime } from '../../utils/fileUtils';
import { Menu } from '../common/Menu';
import { DiagramTypeIcon } from '../Templates/DiagramTypeIcon';

type SortKey = 'updated' | 'created' | 'name';

interface RecentDiagramsProps {
  diagrams: Diagram[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (diagram: Diagram) => void;
  onExport: (id: string) => void;
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (value: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      className="input input--sm rename-input"
      aria-label="Diagram name"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone(value);
        if (e.key === 'Escape') {
          e.stopPropagation();
          onDone(null);
        }
      }}
    />
  );
}

export const RecentDiagrams = memo(function RecentDiagrams({ diagrams, activeId, loading, error, onOpen, onRename, onDuplicate, onDelete, onExport }: RecentDiagramsProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(() => {
    const filtered = filterDiagrams(diagrams, query);
    const sorted = [...filtered];
    if (sort === 'updated') sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    if (sort === 'created') sorted.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [diagrams, query, sort]);

  return (
    <div className="sidebar-section">
      <div className="recent-controls">
        <label className="sr-only" htmlFor="recent-search">
          Search saved diagrams
        </label>
        <input id="recent-search" className="input input--sm" type="search" placeholder="Search diagrams…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="sr-only" htmlFor="recent-sort">
          Sort diagrams
        </label>
        <select id="recent-sort" className="select select--sm" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="updated">Last modified</option>
          <option value="created">Created</option>
          <option value="name">Name</option>
        </select>
      </div>
      {error && <p className="notice notice--error">{error}</p>}
      {loading ? (
        <p className="empty-state">Loading saved diagrams…</p>
      ) : items.length === 0 ? (
        <p className="empty-state">{query ? `No diagrams match “${query}”.` : 'No saved diagrams yet. Your work is saved here automatically.'}</p>
      ) : (
        <ul className="item-list" aria-label="Saved diagrams">
          {items.map((d) => (
            <li key={d.id} className={`recent-item ${d.id === activeId ? 'is-active' : ''}`}>
              {renamingId === d.id ? (
                <div className="list-item">
                  <span className="list-item__icon">
                    <DiagramTypeIcon type={d.type} />
                  </span>
                  <RenameInput
                    initial={d.name}
                    onDone={(value) => {
                      setRenamingId(null);
                      if (value !== null && value.trim() && value.trim() !== d.name) onRename(d.id, value.trim());
                    }}
                  />
                </div>
              ) : (
                <button type="button" className={`list-item ${d.id === activeId ? 'is-active' : ''}`} onClick={() => onOpen(d.id)} aria-current={d.id === activeId ? 'true' : undefined}>
                  <span className="list-item__icon">
                    <DiagramTypeIcon type={d.type} />
                  </span>
                  <span className="list-item__text">
                    <span className="list-item__title">{d.name}</span>
                    <span className="list-item__meta">
                      {getDiagramTypeLabel(d.type)} · <time dateTime={new Date(d.updatedAt).toISOString()}>{formatRelativeTime(d.updatedAt, now)}</time>
                    </span>
                  </span>
                </button>
              )}
              <Menu
                label={`Actions for ${d.name}`}
                align="end"
                trigger={(props) => (
                  <button type="button" className="icon-btn recent-item__menu" aria-label={`More actions for ${d.name}`} data-tooltip="More actions" data-tooltip-pos="left" {...props}>
                    <Ellipsis size={16} aria-hidden />
                  </button>
                )}
                items={[
                  { id: 'open', label: 'Open', icon: <FolderOpen size={14} />, onSelect: () => onOpen(d.id) },
                  { id: 'rename', label: 'Rename', icon: <Pencil size={14} />, onSelect: () => setRenamingId(d.id) },
                  { id: 'duplicate', label: 'Duplicate', icon: <CopyPlus size={14} />, onSelect: () => onDuplicate(d.id) },
                  { id: 'export', label: 'Download project file', icon: <Download size={14} />, onSelect: () => onExport(d.id) },
                  { id: 'sep', separator: true },
                  { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, danger: true, onSelect: () => onDelete(d) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
