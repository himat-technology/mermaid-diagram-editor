import { memo, useMemo, useState } from 'react';
import { DIAGRAM_TYPES } from '../../data/diagramTypes';
import type { DiagramTypeId, DiagramTypeInfo } from '../../types/diagram';
import { DiagramTypeIcon } from './DiagramTypeIcon';

interface DiagramTypeListProps {
  activeType: DiagramTypeId;
  onSelect: (type: DiagramTypeInfo) => void;
}

export const DiagramTypeList = memo(function DiagramTypeList({ activeType, onSelect }: DiagramTypeListProps) {
  const [query, setQuery] = useState('');
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? DIAGRAM_TYPES.filter((t) => `${t.label} ${t.description} ${t.keywords.join(' ')}`.toLowerCase().includes(q)) : DIAGRAM_TYPES;
  }, [query]);

  return (
    <div className="sidebar-section">
      <label className="sr-only" htmlFor="type-search">
        Filter diagram types
      </label>
      <input id="type-search" className="input input--sm" type="search" placeholder="Filter diagram types…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="item-list" aria-label="Diagram types">
        {items.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              className={`list-item ${activeType === t.id ? 'is-active' : ''}`}
              onClick={() => onSelect(t)}
              aria-current={activeType === t.id ? 'true' : undefined}
              title={`Load the ${t.label} starter template`}
            >
              <span className="list-item__icon">
                <DiagramTypeIcon type={t.id} />
              </span>
              <span className="list-item__text">
                <span className="list-item__title">{t.label}</span>
                <span className="list-item__meta">{t.description}</span>
              </span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="empty-state">No diagram types match “{query}”.</li>}
      </ul>
    </div>
  );
});
