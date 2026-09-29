import type { RasterFormat } from '../types/export';
import { svgToDataUrl } from './svgUtils';

/** Conservative limits that work across Chrome, Firefox and Safari. */
const MAX_CANVAS_DIMENSION = 16_384;
const MAX_CANVAS_AREA = 16_384 * 16_384 * 0.5;

const RASTER_MIME: Record<RasterFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

export class CanvasTaintedError extends Error {
  constructor() {
    super('The browser blocked reading the rendered image (tainted canvas).');
    this.name = 'CanvasTaintedError';
  }
}

export function clampScale(width: number, height: number, scale: number): number {
  let s = scale;
  if (width * s > MAX_CANVAS_DIMENSION) s = MAX_CANVAS_DIMENSION / width;
  if (height * s > MAX_CANVAS_DIMENSION) s = Math.min(s, MAX_CANVAS_DIMENSION / height);
  if (width * height * s * s > MAX_CANVAS_AREA) s = Math.min(s, Math.sqrt(MAX_CANVAS_AREA / (width * height)));
  return Math.max(0.1, s);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the SVG as an image.'));
    img.src = src;
  });
}

export interface RasterizeOptions {
  width: number;
  height: number;
  scale: number;
  format: RasterFormat;
  quality: number;
  /** Required for JPG (no alpha channel); optional for PNG/WebP. */
  background: string | null;
}

export async function rasterizeSvg(svg: string, options: RasterizeOptions): Promise<{ blob: Blob; scale: number }> {
  const scale = clampScale(options.width, options.height, options.scale);
  const img = await loadImage(svgToDataUrl(svg));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(options.width * scale));
  canvas.height = Math.max(1, Math.round(options.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available.');

  const background = options.background ?? (options.format === 'jpg' ? '#ffffff' : null);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const mime = RASTER_MIME[options.format];
  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`This browser cannot encode ${options.format.toUpperCase()} images.`))),
        mime,
        options.format === 'png' ? undefined : options.quality,
      );
    } catch (e) {
      reject(e instanceof DOMException && e.name === 'SecurityError' ? new CanvasTaintedError() : e);
    }
  });

  if (blob.type && blob.type !== mime) {
    throw new Error(`This browser cannot encode ${options.format.toUpperCase()} images (fell back to ${blob.type}).`);
  }
  return { blob, scale };
}
