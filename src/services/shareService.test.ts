import { compressToEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CODE } from '../data/diagramTypes';
import { DEFAULT_CONFIG } from '../types/settings';
import { buildShareUrl, decodeShareData, encodeShareData, readShareHash } from './shareService';

const diagram = {
  name: 'Checkout flow ✓',
  code: DEFAULT_CODE + '  %% unicode: → ✓ 日本語\n',
  theme: 'forest' as const,
  config: { ...DEFAULT_CONFIG, look: 'handDrawn' as const, fontSize: 18 },
};

describe('share links', () => {
  it('round-trips a diagram through the encoded payload', () => {
    const decoded = decodeShareData(encodeShareData(diagram));
    expect(decoded).toEqual({ name: diagram.name, code: diagram.code, theme: 'forest', config: diagram.config });
  });

  it('produces URL-safe output', () => {
    expect(encodeShareData(diagram)).toMatch(/^[A-Za-z0-9+\-$_]+$/);
  });

  it('builds a URL with the data in the fragment only', () => {
    const url = new URL(buildShareUrl(diagram, 'http://localhost:5173/mermaid-editor?x=1#old'));
    expect(url.pathname).toBe('/mermaid-editor');
    expect(url.search).toBe('?x=1');
    expect(url.hash.startsWith('#d=')).toBe(true);
    expect(readShareHash(url.hash)?.code).toBe(diagram.code);
  });

  it('accepts bare fragments without the d= prefix', () => {
    expect(readShareHash('#' + encodeShareData(diagram))?.name).toBe(diagram.name);
  });

  it('only stores non-default config values', () => {
    const minimal = encodeShareData({ ...diagram, config: DEFAULT_CONFIG });
    expect(minimal.length).toBeLessThan(encodeShareData(diagram).length);
  });

  it('returns null for garbage or empty hashes', () => {
    expect(readShareHash('')).toBeNull();
    expect(readShareHash('#')).toBeNull();
    expect(readShareHash('#d=not-valid-data')).toBeNull();
    expect(decodeShareData(compressToEncodedURIComponent('{"v":2,"c":"x"}'))).toBeNull();
  });

  it('rejects unsafe or malformed settings from untrusted links', () => {
    const payload = compressToEncodedURIComponent(JSON.stringify({ v: 1, n: 'x', c: 'flowchart LR', t: 'evil', o: { securityLevel: 'loose', fontSize: 'big', look: 'neo' } }));
    const decoded = decodeShareData(payload)!;
    expect(decoded.theme).toBe('default');
    expect(decoded.config.securityLevel).toBe('strict');
    expect(decoded.config.fontSize).toBe(DEFAULT_CONFIG.fontSize);
    expect(decoded.config.look).toBe('neo');
  });
});
