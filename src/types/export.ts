export type ExportFormat = 'svg' | 'png' | 'jpg' | 'webp' | 'markdown' | 'mmd' | 'project';

export type RasterFormat = 'png' | 'jpg' | 'webp';

export type ExportBackground = 'transparent' | 'white' | 'theme' | 'custom';

export interface ExportOptions {
  format: ExportFormat;
  background: ExportBackground;
  customBackground: string;
  /** Pixel ratio for raster exports (1-4). */
  scale: number;
  /** Extra padding (px) around the diagram. */
  padding: number;
  /** 0-1 quality for lossy formats. */
  quality: number;
  includeMetadata: boolean;
  fileName: string;
}

export interface ExportContext {
  name: string;
  code: string;
  svg: string | null;
  themeBackground: string;
}
