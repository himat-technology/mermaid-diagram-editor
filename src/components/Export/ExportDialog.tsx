import { Clipboard, Code, Download, FileCode, FileJson, FileText, Image, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { copyImage, copySvg, copyText, supportsImageClipboard } from '../../services/clipboardService';
import { buildRasterExport, buildSvgExport, exportDiagram, type ExportSource } from '../../services/exportService';
import type { ExportBackground, ExportFormat, ExportOptions } from '../../types/export';
import { getExportFileName } from '../../utils/fileUtils';
import { clampScale } from '../../utils/imageExport';
import { getSvgStringSize } from '../../utils/svgUtils';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  source: ExportSource;
  initialFormat?: ExportFormat;
  defaultMetadata: boolean;
  /** The current source has errors, so image exports use the last successful render. */
  hasError?: boolean;
}

const FORMATS: Array<{ id: ExportFormat; label: string; hint: string; icon: typeof Image }> = [
  { id: 'svg', label: 'SVG', hint: 'Vector image', icon: FileCode },
  { id: 'png', label: 'PNG', hint: 'Lossless image', icon: Image },
  { id: 'jpg', label: 'JPG', hint: 'Compressed image', icon: Image },
  { id: 'webp', label: 'WebP', hint: 'Modern image', icon: Image },
  { id: 'markdown', label: 'Markdown', hint: '.md with code block', icon: FileText },
  { id: 'mmd', label: 'Mermaid', hint: '.mmd source', icon: Code },
  { id: 'project', label: 'Project', hint: '.himatdiagram', icon: FileJson },
];

const BACKGROUNDS: Array<{ id: ExportBackground; label: string }> = [
  { id: 'transparent', label: 'Transparent' },
  { id: 'white', label: 'White' },
  { id: 'theme', label: 'Theme' },
  { id: 'custom', label: 'Custom' },
];

const isImage = (f: ExportFormat) => f === 'svg' || f === 'png' || f === 'jpg' || f === 'webp';
const isRaster = (f: ExportFormat) => f === 'png' || f === 'jpg' || f === 'webp';

function ExportDialogContent({ onClose, source, initialFormat = 'svg', defaultMetadata, hasError }: Omit<ExportDialogProps, 'open'>) {
  const toast = useToast();
  const [options, setOptions] = useState<ExportOptions>({
    format: initialFormat,
    background: 'transparent',
    customBackground: '#ffffff',
    scale: 2,
    padding: 16,
    quality: 0.92,
    includeMetadata: defaultMetadata,
    fileName: source.diagram.name,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));

  useEffect(() => {
    // JPG has no alpha channel.
    if (options.format === 'jpg' && options.background === 'transparent') set('background', 'white');
  }, [options.format, options.background]);

  const size = useMemo(() => {
    if (!source.svg) return null;
    try {
      return getSvgStringSize(source.svg);
    } catch {
      return null;
    }
  }, [source.svg]);

  const outputSize = size
    ? (() => {
        const w = size.width + options.padding * 2;
        const h = size.height + options.padding * 2;
        const s = isRaster(options.format) ? clampScale(w, h, options.scale) : 1;
        return `${Math.round(w * s)} × ${Math.round(h * s)} px`;
      })()
    : null;

  const needsSvg = isImage(options.format);
  const canExport = !needsSvg || !!source.svg;

  const run = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const onDownload = () =>
    run('download', async () => {
      const outcome = await exportDiagram(source, options);
      toast.success(`Downloaded ${outcome.fileName}`);
      if (outcome.note) toast.info(outcome.note);
    });

  const onCopySvg = () =>
    run('copy-svg', async () => {
      const { svg } = buildSvgExport(source, options);
      const r = await copySvg(svg);
      r.ok ? toast.success(r.message) : toast.error(r.message);
    });

  const onCopyImage = () =>
    run('copy-image', async () => {
      const r = await copyImage(async () => (await buildRasterExport(source, { ...options, format: 'png' })).blob);
      r.ok ? toast.success(r.message) : toast.error(r.message);
    });

  const onCopySource = () =>
    run('copy-src', async () => {
      const r = await copyText(source.diagram.code, 'Mermaid source');
      r.ok ? toast.success(r.message) : toast.error(r.message);
    });

  return (
    <Modal
      open
      title="Export diagram"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <div className="modal__footer-left">
            <button type="button" className="btn btn--sm" onClick={onCopySource} disabled={!!busy}>
              <Clipboard size={14} aria-hidden /> Copy Mermaid
            </button>
            <button type="button" className="btn btn--sm" onClick={onCopySvg} disabled={!!busy || !source.svg}>
              <Clipboard size={14} aria-hidden /> Copy SVG
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={onCopyImage}
              disabled={!!busy || !source.svg || !supportsImageClipboard()}
              title={supportsImageClipboard() ? undefined : 'Your browser does not support copying images'}
            >
              <Clipboard size={14} aria-hidden /> Copy image
            </button>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn--primary" onClick={onDownload} disabled={!!busy || !canExport}>
            {busy === 'download' ? <Loader2 size={14} className="spin" aria-hidden /> : <Download size={14} aria-hidden />} Download
          </button>
        </>
      }
    >
      <div className="export">
        <fieldset className="format-grid">
          <legend className="field__label">Format</legend>
          {FORMATS.map((f) => (
            <label key={f.id} className={`format-option ${options.format === f.id ? 'is-active' : ''}`}>
              <input type="radio" name="export-format" value={f.id} checked={options.format === f.id} onChange={() => set('format', f.id)} className="sr-only" />
              <f.icon size={18} aria-hidden />
              <span className="format-option__label">{f.label}</span>
              <span className="format-option__hint">{f.hint}</span>
            </label>
          ))}
        </fieldset>

        <div className="export__options">
          <div className="field">
            <label className="field__label" htmlFor="export-name">
              File name
            </label>
            <input id="export-name" className="input" value={options.fileName} onChange={(e) => set('fileName', e.target.value)} />
            <span className="field__hint">Saves as {getExportFileName(options.fileName || source.diagram.name, options.format, isRaster(options.format) ? options.scale : undefined)}</span>
          </div>

          {isImage(options.format) && (
            <>
              <div className="field">
                <span className="field__label" id="bg-label">
                  Background
                </span>
                <div className="segmented" role="radiogroup" aria-labelledby="bg-label">
                  {BACKGROUNDS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={options.background === b.id}
                      className={`segmented__item ${options.background === b.id ? 'is-active' : ''}`}
                      disabled={b.id === 'transparent' && options.format === 'jpg'}
                      onClick={() => set('background', b.id)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                {options.background === 'custom' && (
                  <input type="color" className="color-input" aria-label="Custom background color" value={options.customBackground} onChange={(e) => set('customBackground', e.target.value)} />
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="export-padding">
                  Padding: {options.padding}px
                </label>
                <input id="export-padding" type="range" min={0} max={200} step={4} value={options.padding} onChange={(e) => set('padding', Number(e.target.value))} />
              </div>
            </>
          )}

          {isRaster(options.format) && (
            <div className="field">
              <span className="field__label" id="scale-label">
                Scale
              </span>
              <div className="segmented" role="radiogroup" aria-labelledby="scale-label">
                {[1, 2, 3, 4].map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={options.scale === s} className={`segmented__item ${options.scale === s ? 'is-active' : ''}`} onClick={() => set('scale', s)}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {(options.format === 'jpg' || options.format === 'webp') && (
            <div className="field">
              <label className="field__label" htmlFor="export-quality">
                Quality: {Math.round(options.quality * 100)}%
              </label>
              <input id="export-quality" type="range" min={0.1} max={1} step={0.01} value={options.quality} onChange={(e) => set('quality', Number(e.target.value))} />
            </div>
          )}

          {options.format === 'svg' && (
            <label className="checkbox">
              <input type="checkbox" checked={options.includeMetadata} onChange={(e) => set('includeMetadata', e.target.checked)} />
              <span>
                Include metadata
                <span className="field__hint">Embeds the title and Mermaid source so the SVG can be re-imported.</span>
              </span>
            </label>
          )}

          {needsSvg && hasError && source.svg && (
            <p className="notice notice--warning">The code currently has a syntax error. Image exports use the last successfully rendered version.</p>
          )}
          {needsSvg && (
            <p className="field__hint">
              {source.svg ? `Output size: ${outputSize ?? 'unknown'}` : 'There is no rendered diagram yet. Fix any syntax errors first.'}
            </p>
          )}
          {!needsSvg && <p className="field__hint">Text exports use the current editor source, even if it has syntax errors.</p>}
        </div>
      </div>
    </Modal>
  );
}

export function ExportDialog({ open, ...rest }: ExportDialogProps) {
  if (!open) return null;
  return <ExportDialogContent {...rest} />;
}
