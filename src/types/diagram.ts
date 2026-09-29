import type { DiagramConfig, MermaidTheme } from './settings';

export type DiagramTypeId =
  | 'flowchart'
  | 'sequence'
  | 'class'
  | 'state'
  | 'er'
  | 'journey'
  | 'gantt'
  | 'pie'
  | 'gitGraph'
  | 'mindmap'
  | 'timeline'
  | 'quadrant'
  | 'requirement'
  | 'c4'
  | 'architecture'
  | 'sankey'
  | 'xychart'
  | 'block'
  | 'kanban'
  | 'treeView'
  | 'venn'
  | 'radar'
  | 'ishikawa'
  | 'packet'
  | 'treemap'
  | 'unknown';

export interface Diagram {
  id: string;
  name: string;
  code: string;
  type: DiagramTypeId;
  theme: MermaidTheme;
  config: DiagramConfig;
  createdAt: number;
  updatedAt: number;
}

export interface DiagramTypeInfo {
  id: Exclude<DiagramTypeId, 'unknown'>;
  label: string;
  description: string;
  keywords: string[];
  template: string;
}

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
}

export interface RenderError {
  message: string;
  /** 1-based line number within the editor source. */
  line?: number;
  /** 1-based column number. */
  column?: number;
  excerpt?: string;
}

export interface RenderResult {
  svg: string;
  /** Monotonic counter so consumers can tell renders apart. */
  renderId: number;
  durationMs: number;
}

export type RenderStatus = 'idle' | 'rendering' | 'success' | 'error';

/** Serialized `.himatdiagram` project file. */
export interface ProjectFile {
  format: 'himatdiagram';
  version: 1;
  name: string;
  code: string;
  type?: DiagramTypeId;
  theme: MermaidTheme;
  look: DiagramConfig['look'];
  config: Partial<DiagramConfig>;
  createdAt?: number;
  updatedAt?: number;
}

export interface MermaidBlock {
  index: number;
  title: string;
  code: string;
  /** 1-based line of the opening fence in the Markdown file. */
  line: number;
}

export type ImportResult =
  | { kind: 'diagram'; name: string; code: string; theme?: MermaidTheme; config?: Partial<DiagramConfig> }
  | { kind: 'blocks'; name: string; blocks: MermaidBlock[] };
