import type { Diagram } from '../types/diagram';
import type { ExportBackground, ExportOptions, RasterFormat } from '../types/export';
import { downloadBlob, downloadText, getExportFileName, MIME_TYPES } from '../utils/fileUtils';
import { CanvasTaintedError, rasterizeSvg } from '../utils/imageExport';
import { toMarkdown } from '../utils/markdownParser';
import { prepareSvgForExport } from '../utils/svgUtils';
import { serializeProject } from './importService';
import { renderMermaid } from './mermaidService';

export interface ExportSource {
  diagram: Diagram;
  /** Sanitized SVG of the last successful render. */
  svg: string | null;
  themeBackground: string;
}

export function resolveBackground(background: ExportBackground, themeBackground: string, custom: string): string | null {
  switch (background) {
    case 'transparent':
      return null;
    case 'white':
      return '#ffffff';
    case 'theme':
      return themeBackground;
    case 'custom':
      return custom;
  }
}

function requireSvg(source: ExportSource): string {
  if (!source.svg) throw new Error('There is no rendered diagram to export. Fix any syntax errors and render first.');
  return source.svg;
}

export function buildSvgExport(source: ExportSource, options: Pick<ExportOptions, 'background' | 'customBackground' | 'padding' | 'includeMetadata'>) {
  return prepareSvgForExport(requireSvg(source), {
    background: resolveBackground(options.background, source.themeBackground, options.customBackground),
    padding: options.padding,
    metadata: options.includeMetadata ? { title: source.diagram.name, source: source.diagram.code } : null,
  });
}

export async function buildRasterExport(
  source: ExportSource,
  options: Pick<ExportOptions, 'background' | 'customBackground' | 'padding' | 'scale' | 'quality'> & { format: RasterFormat },
): Promise<{ blob: Blob; scale: number }> {
  const background = resolveBackground(options.background, source.themeBackground, options.customBackground);
  const rasterize = (svg: string) => {
    const prepared = prepareSvgForExport(svg, { background, padding: options.padding, metadata: null });
    return rasterizeSvg(prepared.svg, {
      width: prepared.width,
      height: prepared.height,
      scale: options.scale,
      format: options.format,
      quality: options.quality,
      background: options.format === 'jpg' ? (background ?? '#ffffff') : background,
    });
  };
  try {
    return await rasterize(requireSvg(source));
  } catch (err) {
    // Some browsers taint canvases that draw SVG <foreignObject> content. Retry with pure-SVG text labels.
    if (!(err instanceof CanvasTaintedError)) throw err;
    const svg = await renderMermaid(source.diagram.code, source.diagram.theme, source.diagram.config, { htmlLabels: false });
    return rasterize(svg);
  }
}

export interface ExportOutcome {
  fileName: string;
  /** Present when the requested scale had to be reduced to fit browser canvas limits. */
  note?: string;
}

export async function exportDiagram(source: ExportSource, options: ExportOptions): Promise<ExportOutcome> {
  const { diagram } = source;
  const baseName = options.fileName.trim() || diagram.name;

  switch (options.format) {
    case 'svg': {
      const { svg } = buildSvgExport(source, options);
      const fileName = getExportFileName(baseName, 'svg');
      downloadText(svg, fileName, MIME_TYPES.svg);
      return { fileName };
    }
    case 'png':
    case 'jpg':
    case 'webp': {
      const { blob, scale } = await buildRasterExport(source, { ...options, format: options.format });
      const fileName = getExportFileName(baseName, options.format, options.scale);
      downloadBlob(blob, fileName);
      const note = scale < options.scale - 0.01 ? `Scale reduced to ${scale.toFixed(2)}x to stay within browser canvas limits.` : undefined;
      return { fileName, note };
    }
    case 'markdown': {
      const fileName = getExportFileName(baseName, 'markdown');
      downloadText(toMarkdown(diagram.name, diagram.code), fileName, MIME_TYPES.markdown);
      return { fileName };
    }
    case 'mmd': {
      const fileName = getExportFileName(baseName, 'mmd');
      downloadText(diagram.code, fileName, MIME_TYPES.mmd);
      return { fileName };
    }
    case 'project': {
      const fileName = getExportFileName(baseName, 'project');
      downloadText(serializeProject(diagram), fileName, MIME_TYPES.project);
      return { fileName };
    }
  }
}
