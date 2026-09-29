export type MermaidTheme = 'default' | 'neutral' | 'dark' | 'forest' | 'base' | 'neo' | 'neo-dark';

export type MermaidLook = 'classic' | 'handDrawn' | 'neo';

/** Layout engines bundled with Mermaid. `elk` is only applied by diagrams that support it (flowchart, state, class, ER). */
export type MermaidLayout = 'dagre' | 'elk';

/** `loose` and `sandbox` are intentionally not offered: loose enables click callbacks that can run JavaScript. */
export type SecurityLevel = 'strict' | 'antiscript';

export type FlowchartCurve = 'basis' | 'linear' | 'cardinal' | 'monotoneX' | 'step' | 'natural';

export type PreviewBackground = 'theme' | 'transparent' | 'white' | 'custom';

/** Per-diagram rendering configuration that is kept separate from the Mermaid source. */
export interface DiagramConfig {
  look: MermaidLook;
  layout: MermaidLayout;
  curve: FlowchartCurve;
  fontSize: number;
  /** Padding (px) Mermaid leaves around the diagram, for diagram types that support `diagramPadding`. */
  diagramPadding: number;
  securityLevel: SecurityLevel;
  background: PreviewBackground;
  customBackground: string;
}

export type UiTheme = 'light' | 'dark' | 'system';

/** Application-wide preferences stored in localStorage. */
export interface Preferences {
  uiTheme: UiTheme;
  editorFontSize: number;
  editorWordWrap: boolean;
  autoRender: boolean;
  renderDelay: number;
  /** Default zoom applied when a diagram is first rendered or fit is reset. */
  previewScale: number;
  svgMetadata: boolean;
  sidebarOpen: boolean;
}

export const DEFAULT_CONFIG: DiagramConfig = {
  look: 'classic',
  layout: 'dagre',
  curve: 'basis',
  fontSize: 16,
  diagramPadding: 8,
  securityLevel: 'strict',
  background: 'theme',
  customBackground: '#ffffff',
};

export const DEFAULT_PREFERENCES: Preferences = {
  uiTheme: 'system',
  editorFontSize: 14,
  editorWordWrap: false,
  autoRender: true,
  renderDelay: 400,
  previewScale: 1,
  svgMetadata: true,
  sidebarOpen: true,
};
