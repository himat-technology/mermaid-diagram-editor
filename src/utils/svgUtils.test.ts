// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { extractMermaidSourceFromSvg, getSvgStringSize, prepareSvgForExport } from './svgUtils';

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" style="max-width: 200px;" viewBox="-8 -8 200 100"><g><rect width="10" height="10"/></g></svg>';

describe('svgUtils', () => {
  it('reads the size from the viewBox', () => {
    expect(getSvgStringSize(svg)).toEqual({ minX: -8, minY: -8, width: 200, height: 100 });
  });

  it('adds padding, explicit size and a background', () => {
    const out = prepareSvgForExport(svg, { background: '#ffffff', padding: 10, metadata: null });
    expect(out.width).toBe(220);
    expect(out.height).toBe(120);
    expect(out.svg).toContain('viewBox="-18 -18 220 120"');
    expect(out.svg).toContain('width="220"');
    expect(out.svg).toMatch(/<rect[^>]*data-export-background="true"/);
    expect(out.svg).not.toContain('max-width');
  });

  it('keeps transparency when no background is requested', () => {
    const out = prepareSvgForExport(svg, { background: null, padding: 0, metadata: null });
    expect(out.svg).not.toContain('data-export-background');
  });

  it('embeds and extracts metadata including the Mermaid source', () => {
    const source = 'flowchart LR\n  A["x ]]> y"] --> B & C\n';
    const out = prepareSvgForExport(svg, { background: null, padding: 0, metadata: { title: 'My <Diagram>', source } });
    expect(out.svg).toContain('<title data-export="true">My &lt;Diagram&gt;</title>');
    expect(extractMermaidSourceFromSvg(out.svg)).toBe(source);
  });

  it('rejects invalid markup', () => {
    expect(() => getSvgStringSize('<div>nope</div>')).toThrow(/Invalid SVG/);
  });
});
