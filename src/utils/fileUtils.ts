import type { ExportFormat } from '../types/export';

export const IMPORT_EXTENSIONS = ['.mmd', '.mermaid', '.md', '.markdown', '.himatdiagram', '.json', '.txt', '.svg'] as const;

export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  svg: 'svg',
  png: 'png',
  jpg: 'jpg',
  webp: 'webp',
  markdown: 'md',
  mmd: 'mmd',
  project: 'himatdiagram',
};

export const MIME_TYPES: Record<ExportFormat, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  markdown: 'text/markdown',
  mmd: 'text/plain',
  project: 'application/json',
};

/** Converts a diagram name into a safe, portable file base name. */
export function sanitizeFileName(name: string, fallback = 'diagram'): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .toLowerCase()
    .slice(0, 80);
  return cleaned || fallback;
}

export function getExportFileName(name: string, format: ExportFormat, scale?: number): string {
  const base = sanitizeFileName(name);
  const suffix = (format === 'png' || format === 'jpg' || format === 'webp') && scale && scale > 1 ? `@${scale}x` : '';
  return `${base}${suffix}.${EXPORT_EXTENSIONS[format]}`;
}

export function getExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : '';
}

export function stripExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

export function isSupportedImportFile(fileName: string): boolean {
  return (IMPORT_EXTENSIONS as readonly string[]).includes(getExtension(fileName));
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadText(text: string, fileName: string, mime = 'text/plain'): void {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), fileName);
}

export function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsText(file);
  });
}

export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < 45_000) return 'just now';
  if (diff < hour) return `${Math.round(diff / minute)} min ago`;
  if (diff < day) return `${Math.round(diff / hour)} h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)} d ago`;
  return new Date(timestamp).toLocaleDateString();
}
