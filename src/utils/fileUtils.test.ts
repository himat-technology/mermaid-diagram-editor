import { describe, expect, it } from 'vitest';
import { formatRelativeTime, getExportFileName, getExtension, isSupportedImportFile, sanitizeFileName, stripExtension } from './fileUtils';

describe('export filename generation', () => {
  it.each([
    ['My Diagram', 'svg', undefined, 'my-diagram.svg'],
    ['My Diagram', 'png', 1, 'my-diagram.png'],
    ['My Diagram', 'png', 2, 'my-diagram@2x.png'],
    ['My Diagram', 'jpg', 3, 'my-diagram@3x.jpg'],
    ['My Diagram', 'webp', 4, 'my-diagram@4x.webp'],
    ['My Diagram', 'markdown', undefined, 'my-diagram.md'],
    ['My Diagram', 'mmd', undefined, 'my-diagram.mmd'],
    ['My Diagram', 'project', undefined, 'my-diagram.himatdiagram'],
  ] as const)('%s as %s @%sx -> %s', (name, format, scale, expected) => {
    expect(getExportFileName(name, format, scale)).toBe(expected);
  });

  it('strips unsafe characters and accents', () => {
    expect(sanitizeFileName('  Café / Order: "Flow" <v2>?  ')).toBe('cafe-order-flow-v2');
    expect(sanitizeFileName('../../etc/passwd')).toBe('etcpasswd');
  });

  it('falls back when nothing usable remains', () => {
    expect(sanitizeFileName('???')).toBe('diagram');
    expect(getExportFileName('', 'svg')).toBe('diagram.svg');
  });

  it('limits length', () => {
    expect(sanitizeFileName('a'.repeat(200))).toHaveLength(80);
  });
});

describe('file helpers', () => {
  it('parses extensions', () => {
    expect(getExtension('diagram.MMD')).toBe('.mmd');
    expect(getExtension('noext')).toBe('');
    expect(stripExtension('my.flow.himatdiagram')).toBe('my.flow');
    expect(stripExtension('.hidden')).toBe('.hidden');
  });

  it('recognizes supported import files', () => {
    expect(isSupportedImportFile('a.mmd')).toBe(true);
    expect(isSupportedImportFile('a.markdown')).toBe(true);
    expect(isSupportedImportFile('a.himatdiagram')).toBe(true);
    expect(isSupportedImportFile('a.png')).toBe(false);
  });

  it('formats relative times', () => {
    const now = 1_700_000_000_000;
    expect(formatRelativeTime(now - 1000, now)).toBe('just now');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe('3 h ago');
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe('2 d ago');
  });
});
