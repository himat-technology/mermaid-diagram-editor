// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_CODE, DIAGRAM_TYPES } from '../data/diagramTypes';
import { TEMPLATES } from '../data/templates';
import { DEFAULT_CONFIG } from '../types/settings';
import { buildMermaidConfig, loadMermaid, sanitizeSvg, validateWithMermaid } from './mermaidService';

// Mermaid and its per-diagram parsers are large; loading them under jsdom can take a while on slow machines.
describe('Mermaid validation', { timeout: 60_000 }, () => {
  beforeAll(async () => {
    await loadMermaid();
  }, 120_000);

  it('accepts the default diagram', async () => {
    expect(await validateWithMermaid(DEFAULT_CODE)).toBeNull();
  });

  it('reports syntax errors with a line number', async () => {
    const error = await validateWithMermaid('flowchart LR\n  A --> B\n  B --> --> C\n');
    expect(error).not.toBeNull();
    expect(error!.line).toBe(3);
    expect(error!.message.length).toBeGreaterThan(0);
  });

  it('reports unknown diagram types', async () => {
    const error = await validateWithMermaid('notADiagram\n  A --> B');
    expect(error?.line).toBe(1);
    expect(error?.message).toMatch(/No diagram type detected/);
  });

  it.each(DIAGRAM_TYPES.map((t) => [t.label, t.template]))('starter template "%s" parses', async (_label, template) => {
    expect(await validateWithMermaid(template)).toBeNull();
  });

  it.each(TEMPLATES.map((t) => [t.name, t.code]))('real-world template "%s" parses', async (_name, code) => {
    expect(await validateWithMermaid(code)).toBeNull();
  });
});

describe('buildMermaidConfig', () => {
  it('maps diagram settings onto Mermaid config', () => {
    const config = buildMermaidConfig('dark', { ...DEFAULT_CONFIG, look: 'handDrawn', fontSize: 20, curve: 'linear' });
    expect(config).toMatchObject({
      startOnLoad: false,
      theme: 'dark',
      look: 'handDrawn',
      securityLevel: 'strict',
      themeVariables: { fontSize: '20px' },
      flowchart: { curve: 'linear' },
    });
  });

  it('can disable HTML labels for raster exports', () => {
    const config = buildMermaidConfig('default', DEFAULT_CONFIG, { htmlLabels: false });
    expect(config.htmlLabels).toBe(false);
    expect(config.flowchart?.htmlLabels).toBe(false);
  });
});

describe('sanitizeSvg', () => {
  it('removes scripts and event handlers but keeps SVG content', () => {
    const dirty =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><style>.a{fill:red}</style><rect class="a" width="5" height="5" onclick="alert(2)"/><foreignObject width="5" height="5"><div xmlns="http://www.w3.org/1999/xhtml"><span>Label</span><img src="x" onerror="alert(3)"/></div></foreignObject></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toMatch(/<script|onclick|onerror|alert\(/);
    expect(clean).toContain('<rect');
    expect(clean).toContain('Label');
    expect(clean).toContain('<style');
  });
});
