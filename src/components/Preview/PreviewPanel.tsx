import { Loader2, Maximize, Maximize2, Minimize, RefreshCw, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { usePanZoom } from '../../hooks/usePanZoom';
import type { RenderError, RenderStatus } from '../../types/diagram';
import type { PreviewBackground } from '../../types/settings';
import { IconButton } from '../common/IconButton';
import { ErrorPanel } from './ErrorPanel';

export interface PreviewHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  reset: () => void;
  toggleFullscreen: () => void;
  getSvgElement: () => SVGSVGElement | null;
}

interface PreviewPanelProps {
  svg: string | null;
  error: RenderError | null;
  status: RenderStatus;
  isStale: boolean;
  durationMs: number | null;
  /** Changes when a different diagram is opened, triggering an automatic fit. */
  diagramId: string;
  background: PreviewBackground;
  backgroundColor: string | null;
  defaultScale: number;
  fixCount: number;
  onRefresh: () => void;
  onJumpToError: () => void;
  onFixSyntax: () => void;
  onBackgroundChange: (bg: PreviewBackground) => void;
}

interface SvgHostProps {
  svg: string;
  onSize: (size: { width: number; height: number }) => void;
}

/**
 * Inserts sanitized SVG markup by parsing it as XML and importing the nodes, instead of using innerHTML.
 * Memoized so pan/zoom state changes never re-create the SVG DOM.
 */
const SvgHost = memo(function SvgHost({ svg, onSize }: SvgHostProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const el = doc.documentElement;
    if (el.nodeName.toLowerCase() !== 'svg') return;
    const node = document.importNode(el, true) as unknown as SVGSVGElement;
    const vb = node.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
    let width = 0;
    let height = 0;
    if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
      width = vb[2];
      height = vb[3];
    } else {
      width = parseFloat(node.getAttribute('width') ?? '') || 800;
      height = parseFloat(node.getAttribute('height') ?? '') || 600;
    }
    node.setAttribute('width', String(width));
    node.setAttribute('height', String(height));
    node.style.maxWidth = 'none';
    node.setAttribute('role', 'img');
    host.replaceChildren(node);
    onSize({ width, height });
  }, [svg, onSize]);
  return <div ref={ref} className="svg-host" />;
});

const BACKGROUNDS: Array<{ id: PreviewBackground; label: string }> = [
  { id: 'theme', label: 'Theme' },
  { id: 'white', label: 'White' },
  { id: 'transparent', label: 'Transparent' },
  { id: 'custom', label: 'Custom' },
];

const PreviewPanelInner = forwardRef<PreviewHandle, PreviewPanelProps>(function PreviewPanel(
  { svg, error, status, isStale, durationMs, diagramId, background, backgroundColor, defaultScale, fixCount, onRefresh, onJumpToError, onFixSyntax, onBackgroundChange },
  ref,
) {
  const panelRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const { transform, isPanning, zoomIn, zoomOut, fit, reset, setScale } = usePanZoom(canvasRef, size, defaultScale);

  const onSize = useCallback((s: { width: number; height: number }) => {
    setSize((prev) => (prev && prev.width === s.width && prev.height === s.height ? prev : s));
  }, []);

  // Fit automatically when a different diagram is opened (or the first render arrives).
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!size || fittedFor.current === diagramId) return;
    fittedFor.current = diagramId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (size.width * defaultScale > rect.width - 64 || size.height * defaultScale > rect.height - 64) fit();
    else reset();
  }, [size, diagramId, fit, reset, defaultScale]);

  useEffect(() => {
    const onChange = () => {
      const fs = document.fullscreenElement === panelRef.current;
      setIsFullscreen(fs);
      window.setTimeout(fit, 50);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [fit]);

  const toggleFullscreen = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (panel.requestFullscreen && document.fullscreenEnabled) {
      panel.requestFullscreen().catch(() => setMaximized((m) => !m));
    } else {
      // Fallback (e.g. iOS Safari): maximize the panel within the page.
      setMaximized((m) => !m);
      window.setTimeout(fit, 50);
    }
  }, [fit]);

  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]')) setMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maximized]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn,
      zoomOut,
      fit,
      reset,
      toggleFullscreen,
      getSvgElement: () => canvasRef.current?.querySelector('.svg-host > svg') ?? null,
    }),
    [zoomIn, zoomOut, fit, reset, toggleFullscreen],
  );

  const canvasStyle: React.CSSProperties = backgroundColor ? { backgroundColor } : {};
  const zoomPercent = Math.round(transform.scale * 100);

  return (
    <section ref={panelRef} className={`panel preview-panel ${maximized ? 'is-maximized' : ''} ${isFullscreen ? 'is-fullscreen' : ''}`} aria-label="Diagram preview">
      <header className="panel__header">
        <h2 className="panel__title">Preview</h2>
        <span className={`render-status render-status--${status}`} aria-live="polite">
          {status === 'rendering' ? (
            <>
              <Loader2 size={12} className="spin" aria-hidden /> Rendering…
            </>
          ) : status === 'error' ? (
            'Error'
          ) : isStale ? (
            'Out of date'
          ) : durationMs !== null && status === 'success' ? (
            `Rendered in ${durationMs} ms`
          ) : null}
        </span>
        <div className="panel__actions">
          <IconButton label="Render now" shortcut="mod+enter" icon={<RefreshCw size={16} aria-hidden />} onClick={onRefresh} />
          <span className="toolbar-divider" aria-hidden />
          <IconButton label="Zoom out" icon={<ZoomOut size={16} aria-hidden />} onClick={zoomOut} />
          <button type="button" className="zoom-label" onClick={() => setScale(1)} aria-label={`Zoom ${zoomPercent}%. Click to set 100%`} data-tooltip="Set zoom to 100%" data-tooltip-pos="bottom">
            {zoomPercent}%
          </button>
          <IconButton label="Zoom in" icon={<ZoomIn size={16} aria-hidden />} onClick={zoomIn} />
          <IconButton label="Fit to screen" icon={<Maximize2 size={16} aria-hidden />} onClick={fit} />
          <IconButton label="Reset zoom" icon={<RotateCcw size={16} aria-hidden />} onClick={reset} />
          <span className="toolbar-divider" aria-hidden />
          <label className="sr-only" htmlFor="preview-bg">
            Preview background
          </label>
          <select id="preview-bg" className="select select--sm" value={background} onChange={(e) => onBackgroundChange(e.target.value as PreviewBackground)} data-tooltip="Preview background" data-tooltip-pos="bottom">
            {BACKGROUNDS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <IconButton
            label={isFullscreen || maximized ? 'Exit fullscreen preview' : 'Fullscreen preview'}
            icon={isFullscreen || maximized ? <Minimize size={16} aria-hidden /> : <Maximize size={16} aria-hidden />}
            onClick={toggleFullscreen}
            tooltipPosition="left"
          />
        </div>
      </header>
      <div
        ref={canvasRef}
        className={`preview-canvas ${background === 'transparent' ? 'is-transparent' : ''} ${isPanning ? 'is-panning' : ''}`}
        style={canvasStyle}
        tabIndex={0}
        role="application"
        aria-roledescription="Zoomable diagram canvas"
        aria-label="Diagram canvas. Drag or use arrow keys to pan, mouse wheel or plus and minus keys to zoom, F to fit, 0 to reset."
      >
        {svg ? (
          <div
            className={`preview-content ${error ? 'is-outdated' : ''}`}
            style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
          >
            <SvgHost svg={svg} onSize={onSize} />
          </div>
        ) : status === 'rendering' || status === 'idle' ? (
          <div className="preview-empty">
            {status === 'rendering' ? (
              <>
                <Loader2 size={24} className="spin" aria-hidden />
                <p>Loading Mermaid…</p>
              </>
            ) : (
              <p>Start typing Mermaid code to see a live preview.</p>
            )}
          </div>
        ) : !error ? (
          <div className="preview-empty">
            <p>Nothing to show yet.</p>
          </div>
        ) : (
          <div className="preview-empty">
            <p>Fix the error below to see your diagram.</p>
          </div>
        )}
        {error && <ErrorPanel error={error} hasPreviousRender={!!svg} fixCount={fixCount} onJumpToError={onJumpToError} onFixSyntax={onFixSyntax} />}
      </div>
    </section>
  );
});

export const PreviewPanel = memo(PreviewPanelInner);
