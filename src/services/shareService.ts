import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { isMermaidTheme } from '../data/themes';
import type { Diagram } from '../types/diagram';
import { DEFAULT_CONFIG, type DiagramConfig, type MermaidTheme } from '../types/settings';

export const SHARE_HASH_PREFIX = 'd=';
/** Most browsers handle far longer URLs, but chat apps and some servers truncate beyond this. */
export const SHARE_URL_WARN_LENGTH = 8000;

interface SharePayloadV1 {
  v: 1;
  n: string;
  c: string;
  t: MermaidTheme;
  /** Only config values that differ from the defaults, to keep URLs short. */
  o?: Partial<DiagramConfig>;
}

export interface SharedDiagram {
  name: string;
  code: string;
  theme: MermaidTheme;
  config: DiagramConfig;
}

function configDiff(config: DiagramConfig): Partial<DiagramConfig> | undefined {
  const diff: Partial<DiagramConfig> = {};
  for (const key of Object.keys(DEFAULT_CONFIG) as Array<keyof DiagramConfig>) {
    if (config[key] !== DEFAULT_CONFIG[key]) (diff as Record<string, unknown>)[key] = config[key];
  }
  return Object.keys(diff).length ? diff : undefined;
}

function sanitizeConfig(input: unknown): Partial<DiagramConfig> {
  if (!input || typeof input !== 'object') return {};
  const out: Partial<DiagramConfig> = {};
  const src = input as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_CONFIG) as Array<keyof DiagramConfig>) {
    if (key in src && typeof src[key] === typeof DEFAULT_CONFIG[key]) (out as Record<string, unknown>)[key] = src[key];
  }
  // Never allow a share link to lower the security level below the safe options we expose.
  if (out.securityLevel && out.securityLevel !== 'strict' && out.securityLevel !== 'antiscript') delete out.securityLevel;
  return out;
}

export function encodeShareData(diagram: Pick<Diagram, 'name' | 'code' | 'theme' | 'config'>): string {
  const payload: SharePayloadV1 = { v: 1, n: diagram.name, c: diagram.code, t: diagram.theme };
  const o = configDiff(diagram.config);
  if (o) payload.o = o;
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShareData(encoded: string): SharedDiagram | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const data = JSON.parse(json) as Partial<SharePayloadV1>;
    if (data.v !== 1 || typeof data.c !== 'string') return null;
    return {
      name: typeof data.n === 'string' && data.n.trim() ? data.n.slice(0, 200) : 'Shared diagram',
      code: data.c,
      theme: isMermaidTheme(data.t) ? data.t : 'default',
      config: { ...DEFAULT_CONFIG, ...sanitizeConfig(data.o) },
    };
  } catch {
    return null;
  }
}

/** Builds a URL that carries the whole diagram in the fragment, which browsers never send to servers. */
export function buildShareUrl(diagram: Pick<Diagram, 'name' | 'code' | 'theme' | 'config'>, baseUrl: string): string {
  const url = new URL(baseUrl);
  url.hash = SHARE_HASH_PREFIX + encodeShareData(diagram);
  return url.toString();
}

/** Accepts `#d=<data>`, `d=<data>` or a bare `#<data>` fragment. */
export function readShareHash(hash: string): SharedDiagram | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  const encoded = raw.startsWith(SHARE_HASH_PREFIX) ? raw.slice(SHARE_HASH_PREFIX.length) : raw;
  return decodeShareData(encoded);
}
