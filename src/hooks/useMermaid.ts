import { useCallback, useEffect, useRef, useState } from 'react';
import { MermaidRenderError, renderMermaid } from '../services/mermaidService';
import type { RenderError, RenderStatus } from '../types/diagram';
import type { DiagramConfig, MermaidTheme } from '../types/settings';

interface UseMermaidOptions {
  autoRender: boolean;
  delay: number;
  /** Changing this (e.g. the open diagram id) renders immediately instead of waiting for the debounce. */
  resetKey?: string;
}

export interface MermaidState {
  /** Last successfully rendered SVG. Kept while the current source has errors. */
  svg: string | null;
  error: RenderError | null;
  status: RenderStatus;
  durationMs: number | null;
  /** Increments on each successful render so consumers can react (e.g. refit). */
  renderCount: number;
  /** True when the preview reflects older source than the editor (auto-render off or debounce pending). */
  isStale: boolean;
  renderNow: () => void;
}

/** Background options only affect the preview canvas, not Mermaid output. */
function renderKey(code: string, theme: MermaidTheme, config: DiagramConfig): string {
  const { background: _bg, customBackground: _cb, ...rest } = config;
  return `${theme}\u0000${JSON.stringify(rest)}\u0000${code}`;
}

/**
 * Debounced Mermaid rendering. Only the latest request's result is applied; earlier in-flight renders are
 * discarded when they resolve. Theme/config changes render immediately.
 */
export function useMermaid(code: string, theme: MermaidTheme, config: DiagramConfig, { autoRender, delay, resetKey }: UseMermaidOptions): MermaidState {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<RenderError | null>(null);
  const [status, setStatus] = useState<RenderStatus>('idle');
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [renderedKey, setRenderedKey] = useState<string | null>(null);

  const requestId = useRef(0);
  const lastStartedKey = useRef<string | null>(null);
  const latest = useRef({ code, theme, config });
  latest.current = { code, theme, config };

  const currentKey = renderKey(code, theme, config);
  const { background: _bg, customBackground: _cb, ...renderConfig } = config;
  const configKey = JSON.stringify(renderConfig);

  const run = useCallback(async (force: boolean) => {
    const { code: c, theme: t, config: cfg } = latest.current;
    const key = renderKey(c, t, cfg);
    if (!force && key === lastStartedKey.current) return;
    lastStartedKey.current = key;
    const id = ++requestId.current;

    if (!c.trim()) {
      setSvg(null);
      setError(null);
      setStatus('idle');
      setRenderedKey(key);
      return;
    }

    setStatus('rendering');
    const started = performance.now();
    try {
      const result = await renderMermaid(c, t, cfg);
      if (id !== requestId.current) return;
      setSvg(result);
      setError(null);
      setStatus('success');
      setDurationMs(Math.round(performance.now() - started));
      setRenderCount((n) => n + 1);
    } catch (err) {
      if (id !== requestId.current) return;
      const detail: RenderError =
        err instanceof MermaidRenderError ? err.detail : { message: err instanceof Error ? err.message : 'Failed to render the diagram.' };
      setError(detail);
      setStatus('error');
    } finally {
      if (id === requestId.current) setRenderedKey(key);
    }
  }, []);

  useEffect(() => {
    void run(false);
  }, [theme, configKey, resetKey, run]);

  useEffect(() => {
    if (!autoRender) return;
    const timer = window.setTimeout(() => void run(false), delay);
    return () => window.clearTimeout(timer);
  }, [code, autoRender, delay, run]);

  const renderNow = useCallback(() => void run(true), [run]);

  return {
    svg,
    error,
    status,
    durationMs,
    renderCount,
    isStale: renderedKey !== null && renderedKey !== currentKey && status !== 'rendering',
    renderNow,
  };
}
