import { memo, useMemo, useState } from 'react';
import { TEMPLATES } from '../../data/templates';
import type { DiagramTemplate } from '../../types/diagram';
import { detectDiagramType } from '../../utils/diagramDetection';
import { DiagramTypeIcon } from './DiagramTypeIcon';

interface TemplateListProps {
  onSelect: (template: DiagramTemplate) => void;
}

export const TemplateList = memo(function TemplateList({ onSelect }: TemplateListProps) {
  const [query, setQuery] = useState('');
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? TEMPLATES.filter((t) => `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q)) : TEMPLATES;
  }, [query]);

  return (
    <div className="sidebar-section">
      <label className="sr-only" htmlFor="template-search">
        Filter templates
      </label>
      <input id="template-search" className="input input--sm" type="search" placeholder="Filter templates…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul className="item-list" aria-label="Real-world templates">
        {items.map((t) => (
          <li key={t.id}>
            <button type="button" className="list-item" onClick={() => onSelect(t)} title={`Open "${t.name}" as a new diagram`}>
              <span className="list-item__icon">
                <DiagramTypeIcon type={detectDiagramType(t.code)} />
              </span>
              <span className="list-item__text">
                <span className="list-item__title">
                  {t.name} <span className="tag">{t.category}</span>
                </span>
                <span className="list-item__meta">{t.description}</span>
              </span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="empty-state">No templates match “{query}”.</li>}
      </ul>
    </div>
  );
});
