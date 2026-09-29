import DOMPurify from 'dompurify';
import type { Mermaid, MermaidConfig } from 'mermaid';
import type { RenderError } from '../types/diagram';
import type { DiagramConfig, MermaidTheme } from '../types/settings';
import { parseMermaidError } from '../utils/errorParser';
import { MAX_CODE_LENGTH } from '../utils/validation';

let mermaidPromise: Promise<Mermaid> | null = null;

/** Mermaid is large; load it lazily so the editor shell paints first. */
export function loadMermaid(): Promise<Mermaid> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid')
      .then((m) => m.default)
      .catch((err) => {
        mermaidPromise = null;
        throw err;
      });
  }
  return mermaidPromise;
}

export interface RenderOverrides {
  /** HTML labels use <foreignObject>; disabling them gives pure-SVG text, which rasterizes more reliably. */
  htmlLabels?: boolean;
}

export function buildMermaidConfig(theme: MermaidTheme, config: DiagramConfig, overrides: RenderOverrides = {}): MermaidConfig {
  const mermaidConfig: MermaidConfig = {
    startOnLoad: false,
    theme,
    look: config.look,
    layout: config.layout,
    securityLevel: config.securityLevel,
    suppressErrorRendering: true,
    maxTextSize: MAX_CODE_LENGTH,
    maxEdges: 2000,
    fontSize: config.fontSize,
    themeVariables: { fontSize: `${config.fontSize}px` },
    flowchart: { curve: config.curve, diagramPadding: config.diagramPadding },
    class: { diagramPadding: config.diagramPadding },
    er: { diagramPadding: config.diagramPadding },
  };
  if (overrides.htmlLabels === false) {
    mermaidConfig.htmlLabels = false;
    mermaidConfig.flowchart = { ...mermaidConfig.flowchart, htmlLabels: false };
  }
  return mermaidConfig;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Sanitizes Mermaid output with DOMPurify (SVG + HTML profiles for <foreignObject> labels) and returns
 * well-formed XML so it can be embedded, exported and rasterized consistently.
 */
export function sanitizeSvg(svg: string): string {
  const fragment = DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true, html: true },
    ADD_TAGS: ['foreignObject', 'style'],
    ADD_ATTR: ['dominant-baseline', 'text-anchor', 'marker-start', 'marker-end', 'marker-mid', 'refX', 'refY', 'xmlns'],
    HTML_INTEGRATION_POINTS: { foreignobject: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    RETURN_DOM_FRAGMENT: true,
  }) as unknown as DocumentFragment;
  const root = fragment.querySelector('svg');
  if (!root) throw new Error('Mermaid produced no SVG output.');
  root.setAttribute('xmlns', SVG_NS);
  return new XMLSerializer().serializeToString(root);
}

let renderQueue: Promise<unknown> = Promise.resolve();
let renderCounter = 0;

function cleanupRenderArtifacts(id: string): void {
  for (const elId of [id, `d${id}`, `i${id}`]) document.getElementById(elId)?.remove();
}

/** Parses the code with Mermaid and returns the error (or null if valid) without rendering. */
export async function validateWithMermaid(code: string, theme: MermaidTheme = 'default', config?: DiagramConfig): Promise<RenderError | null> {
  const mermaid = await loadMermaid();
  if (config) mermaid.initialize(buildMermaidConfig(theme, config));
  try {
    await mermaid.parse(code);
    return null;
  } catch (err) {
    return parseMermaidError(err, code);
  }
}

export class MermaidRenderError extends Error {
  readonly detail: RenderError;
  constructor(detail: RenderError) {
    super(detail.message);
    this.name = 'MermaidRenderError';
    this.detail = detail;
  }
}

async function renderNow(code: string, theme: MermaidTheme, config: DiagramConfig, overrides: RenderOverrides): Promise<string> {
  const mermaid = await loadMermaid();
  mermaid.initialize(buildMermaidConfig(theme, config, overrides));
  const id = `mde-render-${++renderCounter}`;
  try {
    try {
      await mermaid.parse(code);
    } catch (err) {
      throw new MermaidRenderError(parseMermaidError(err, code));
    }
    try {
      const { svg } = await mermaid.render(id, code);
      return sanitizeSvg(svg);
    } catch (err) {
      if (err instanceof MermaidRenderError) throw err;
      throw new MermaidRenderError(parseMermaidError(err, code));
    }
  } finally {
    cleanupRenderArtifacts(id);
  }
}

/**
 * Renders Mermaid code to sanitized SVG. Mermaid keeps global state, so renders are serialized
 * through a queue to prevent concurrent renders from corrupting each other.
 */
export function renderMermaid(code: string, theme: MermaidTheme, config: DiagramConfig, overrides: RenderOverrides = {}): Promise<string> {
  const task = renderQueue.then(() => renderNow(code, theme, config, overrides));
  renderQueue = task.catch(() => undefined);
  return task;
}
