import { AlertTriangle, ChevronDown, ChevronUp, CornerDownRight, Wand2 } from 'lucide-react';
import { memo, useState } from 'react';
import type { RenderError } from '../../types/diagram';

interface ErrorPanelProps {
  error: RenderError;
  hasPreviousRender: boolean;
  fixCount: number;
  onJumpToError: () => void;
  onFixSyntax: () => void;
}

function ErrorPanelInner({ error, hasPreviousRender, fixCount, onJumpToError, onFixSyntax }: ErrorPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = error.line ? `Line ${error.line}${error.column ? `, column ${error.column}` : ''}` : 'Location unknown';

  return (
    <section className={`error-panel ${collapsed ? 'is-collapsed' : ''}`} role="alert" aria-live="assertive" data-no-pan>
      <header className="error-panel__header">
        <AlertTriangle size={16} aria-hidden className="error-panel__icon" />
        <div className="error-panel__heading">
          <strong>Syntax error</strong>
          <span className="error-panel__location">{location}</span>
        </div>
        <div className="error-panel__actions">
          {error.line && (
            <button type="button" className="btn btn--sm" onClick={onJumpToError}>
              <CornerDownRight size={14} aria-hidden /> Jump to error
            </button>
          )}
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={onFixSyntax}
            disabled={fixCount === 0}
            title={fixCount === 0 ? 'No automatic fix available for this error' : undefined}
          >
            <Wand2 size={14} aria-hidden /> Fix syntax{fixCount > 0 ? ` (${fixCount})` : ''}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={collapsed ? 'Expand error details' : 'Collapse error details'}
            aria-expanded={!collapsed}
            data-tooltip={collapsed ? 'Expand' : 'Collapse'}
            data-tooltip-pos="top"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
        </div>
      </header>
      {!collapsed && (
        <div className="error-panel__body">
          <p className="error-panel__message">{error.message}</p>
          {error.excerpt && <pre className="error-panel__excerpt">{error.excerpt}</pre>}
          {hasPreviousRender && <p className="error-panel__note">The preview shows the last valid version of the diagram.</p>}
        </div>
      )}
    </section>
  );
}

export const ErrorPanel = memo(ErrorPanelInner);
