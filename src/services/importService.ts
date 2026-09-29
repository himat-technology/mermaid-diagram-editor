import { isMermaidTheme } from '../data/themes';
import type { Diagram, ImportResult, ProjectFile } from '../types/diagram';
import { DEFAULT_CONFIG, type DiagramConfig, type MermaidLook } from '../types/settings';
import { detectDiagramType, extractTitle } from '../utils/diagramDetection';
import { getExtension, readFileAsText, stripExtension } from '../utils/fileUtils';
import { extractMermaidBlocks, looksLikeMarkdownWithMermaid } from '../utils/markdownParser';
import { extractMermaidSourceFromSvg } from '../utils/svgUtils';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

const LOOKS: MermaidLook[] = ['classic', 'handDrawn', 'neo'];

export function serializeProject(diagram: Pick<Diagram, 'name' | 'code' | 'type' | 'theme' | 'config' | 'createdAt' | 'updatedAt'>): string {
  const project: ProjectFile = {
    format: 'himatdiagram',
    version: 1,
    name: diagram.name,
    code: diagram.code,
    type: diagram.type,
    theme: diagram.theme,
    look: diagram.config.look,
    config: { ...diagram.config },
    createdAt: diagram.createdAt,
    updatedAt: diagram.updatedAt,
  };
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(text: string): ProjectFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('The project file is not valid JSON.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ImportError('The project file must contain a JSON object.');
  const obj = data as Record<string, unknown>;
  if (typeof obj.code !== 'string') throw new ImportError('The project file is missing the "code" field.');
  if (obj.format !== undefined && obj.format !== 'himatdiagram') throw new ImportError(`Unsupported project format "${String(obj.format)}".`);

  const rawConfig = obj.config && typeof obj.config === 'object' ? (obj.config as Record<string, unknown>) : {};
  const config: Partial<DiagramConfig> = {};
  for (const key of Object.keys(DEFAULT_CONFIG) as Array<keyof DiagramConfig>) {
    if (typeof rawConfig[key] === typeof DEFAULT_CONFIG[key]) (config as Record<string, unknown>)[key] = rawConfig[key];
  }
  const look = typeof obj.look === 'string' && LOOKS.includes(obj.look as MermaidLook) ? (obj.look as MermaidLook) : config.look ?? DEFAULT_CONFIG.look;
  config.look = look;
  if (config.securityLevel && config.securityLevel !== 'strict' && config.securityLevel !== 'antiscript') delete config.securityLevel;

  return {
    format: 'himatdiagram',
    version: 1,
    name: typeof obj.name === 'string' && obj.name.trim() ? obj.name : 'Imported diagram',
    code: obj.code,
    type: detectDiagramType(obj.code),
    theme: isMermaidTheme(obj.theme) ? obj.theme : 'default',
    look,
    config,
    createdAt: typeof obj.createdAt === 'number' ? obj.createdAt : undefined,
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : undefined,
  };
}

function normalizeSource(text: string): string {
  return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function fromMarkdown(text: string, name: string): ImportResult {
  const blocks = extractMermaidBlocks(text);
  if (blocks.length === 0) throw new ImportError('No ```mermaid code blocks were found in this Markdown file.');
  if (blocks.length === 1) return { kind: 'diagram', name: blocks[0].title !== 'Diagram 1' ? blocks[0].title : name, code: blocks[0].code };
  return { kind: 'blocks', name, blocks };
}

/** Parses the text content of an imported file based on its extension. */
export function parseImportedText(fileName: string, rawText: string): ImportResult {
  const text = normalizeSource(rawText);
  const ext = getExtension(fileName);
  const baseName = stripExtension(fileName) || 'Imported diagram';

  switch (ext) {
    case '.himatdiagram':
    case '.json': {
      const project = deserializeProject(text);
      return { kind: 'diagram', name: project.name, code: project.code, theme: project.theme, config: project.config };
    }
    case '.md':
    case '.markdown':
      return fromMarkdown(text, baseName);
    case '.svg': {
      const source = extractMermaidSourceFromSvg(text);
      if (!source) throw new ImportError('This SVG does not contain embedded Mermaid source. Only SVGs exported with metadata can be imported.');
      return { kind: 'diagram', name: baseName, code: source };
    }
    case '.mmd':
    case '.mermaid':
    case '.txt':
    case '':
      if (looksLikeMarkdownWithMermaid(text)) return fromMarkdown(text, baseName);
      if (!text.trim()) throw new ImportError('The file is empty.');
      return { kind: 'diagram', name: extractTitle(text) ?? baseName, code: text.endsWith('\n') ? text : text + '\n' };
    default:
      throw new ImportError(`Unsupported file type "${ext}". Use .mmd, .mermaid, .md, .markdown or .himatdiagram.`);
  }
}

export async function importFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) throw new ImportError(`"${file.name}" is larger than ${MAX_IMPORT_BYTES / 1024 / 1024} MB.`);
  const text = await readFileAsText(file);
  return parseImportedText(file.name, text);
}

/** Interprets pasted text as a project file, Markdown with Mermaid blocks, or raw Mermaid source. */
export function parsePastedText(rawText: string): ImportResult {
  const text = normalizeSource(rawText).trim();
  if (!text) throw new ImportError('Nothing to import: the pasted text is empty.');
  if (text.startsWith('{')) {
    try {
      const project = deserializeProject(text);
      return { kind: 'diagram', name: project.name, code: project.code, theme: project.theme, config: project.config };
    } catch {
      // Not a project file; fall through and treat it as Mermaid source.
    }
  }
  if (looksLikeMarkdownWithMermaid(text)) return fromMarkdown(text, 'Pasted diagram');
  return { kind: 'diagram', name: extractTitle(text) ?? 'Pasted diagram', code: text + '\n' };
}
