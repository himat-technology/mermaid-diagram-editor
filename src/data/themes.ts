import type { MermaidTheme } from '../types/settings';

export interface ThemeInfo {
  id: MermaidTheme;
  label: string;
  description: string;
  /** Background the diagram is designed for; used for the preview canvas and "theme background" exports. */
  background: string;
  isDark: boolean;
}

export const THEMES: ThemeInfo[] = [
  { id: 'default', label: 'Default', description: 'Mermaid default purple/yellow palette', background: '#ffffff', isDark: false },
  { id: 'neutral', label: 'Neutral', description: 'Grayscale, good for printing', background: '#ffffff', isDark: false },
  { id: 'dark', label: 'Dark', description: 'Light strokes on a dark canvas', background: '#1e1e2e', isDark: true },
  { id: 'forest', label: 'Forest', description: 'Green palette', background: '#ffffff', isDark: false },
  { id: 'base', label: 'Base', description: 'Minimal theme intended for customization', background: '#ffffff', isDark: false },
  { id: 'neo', label: 'Neo', description: 'Modern light palette (Mermaid 12)', background: '#ffffff', isDark: false },
  { id: 'neo-dark', label: 'Neo Dark', description: 'Modern dark palette (Mermaid 12)', background: '#181825', isDark: true },
];

export const THEME_MAP: Record<MermaidTheme, ThemeInfo> = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<
  MermaidTheme,
  ThemeInfo
>;

export function isMermaidTheme(value: unknown): value is MermaidTheme {
  return typeof value === 'string' && value in THEME_MAP;
}
