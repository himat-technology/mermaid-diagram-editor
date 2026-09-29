export interface SvgSize {
  width: number;
  height: number;
  minX: number;
  minY: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function parseLength(value: string | null): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) && !value.trim().endsWith('%') ? n : null;
}

export function parseSvg(svg: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid SVG markup');
  }
  return root as unknown as SVGSVGElement;
}

/** Intrinsic size of an SVG, preferring the viewBox (Mermaid often sets width="100%"). */
export function getSvgSize(el: SVGSVGElement): SvgSize {
  const vb = el.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
    return { minX: vb[0], minY: vb[1], width: vb[2], height: vb[3] };
  }
  const width = parseLength(el.getAttribute('width')) ?? 800;
  const height = parseLength(el.getAttribute('height')) ?? 600;
  return { minX: 0, minY: 0, width, height };
}

export function getSvgStringSize(svg: string): SvgSize {
  return getSvgSize(parseSvg(svg));
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

export interface PrepareSvgOptions {
  /** CSS color, or null for a transparent background. */
  background: string | null;
  padding: number;
  metadata?: { title: string; source: string } | null;
}

/**
 * Produces a standalone SVG document for export: explicit pixel size, optional padding and background,
 * and optional `<title>`/`<desc>`/`<metadata>` containing the diagram title and Mermaid source.
 */
export function prepareSvgForExport(svg: string, options: PrepareSvgOptions): { svg: string; width: number; height: number } {
  const el = parseSvg(svg);
  const doc = el.ownerDocument;
  const size = getSvgSize(el);
  const pad = Math.max(0, options.padding);
  const minX = size.minX - pad;
  const minY = size.minY - pad;
  const width = Math.ceil(size.width + pad * 2);
  const height = Math.ceil(size.height + pad * 2);

  el.setAttribute('xmlns', SVG_NS);
  if (!el.getAttribute('xmlns:xlink')) el.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  el.setAttribute('viewBox', `${minX} ${minY} ${size.width + pad * 2} ${size.height + pad * 2}`);
  el.setAttribute('width', String(width));
  el.setAttribute('height', String(height));
  el.removeAttribute('style');
  if (options.background) el.setAttribute('style', `background-color: ${options.background};`);

  if (options.background) {
    const rect = doc.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(minX));
    rect.setAttribute('y', String(minY));
    rect.setAttribute('width', String(size.width + pad * 2));
    rect.setAttribute('height', String(size.height + pad * 2));
    rect.setAttribute('fill', options.background);
    rect.setAttribute('data-export-background', 'true');
    const firstGraphic = Array.from(el.children).find((c) => !['style', 'defs', 'title', 'desc', 'metadata'].includes(c.nodeName.toLowerCase()));
    el.insertBefore(rect, firstGraphic ?? null);
  }

  if (options.metadata) {
    for (const tag of ['title', 'desc', 'metadata']) {
      Array.from(el.children)
        .filter((c) => c.nodeName.toLowerCase() === tag && c.getAttribute('data-export') === 'true')
        .forEach((c) => c.remove());
    }
    const title = doc.createElementNS(SVG_NS, 'title');
    title.setAttribute('data-export', 'true');
    title.textContent = options.metadata.title;
    const desc = doc.createElementNS(SVG_NS, 'desc');
    desc.setAttribute('data-export', 'true');
    desc.textContent = 'Created with Mermaid Diagram Editor';
    const meta = doc.createElementNS(SVG_NS, 'metadata');
    meta.setAttribute('data-export', 'true');
    const source = doc.createElementNS('https://mermaid.js.org/schema', 'mermaid:source');
    // CDATA cannot contain "]]>", so split the source across adjacent sections at each occurrence.
    const parts = options.metadata.source.split(']]>');
    parts.forEach((part, i) => {
      const text = (i > 0 ? '>' : '') + part + (i < parts.length - 1 ? ']]' : '');
      source.appendChild(doc.createCDATASection(text));
    });
    meta.appendChild(source);
    el.insertBefore(meta, el.firstChild);
    el.insertBefore(desc, el.firstChild);
    el.insertBefore(title, el.firstChild);
  }

  const xml = new XMLSerializer().serializeToString(el);
  return { svg: `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${xml}`, width, height };
}

/** Reads Mermaid source embedded by `prepareSvgForExport`, allowing exported SVGs to be re-imported. */
export function extractMermaidSourceFromSvg(svg: string): string | null {
  const m = svg.match(/<mermaid:source[^>]*>([\s\S]*?)<\/mermaid:source>/);
  if (!m) return null;
  const sections = [...m[1].matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((s) => s[1]);
  return sections.length ? sections.join('') : null;
}

export function svgToDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export { escapeXml };
