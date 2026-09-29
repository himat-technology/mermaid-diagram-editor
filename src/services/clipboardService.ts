export interface ClipboardResult {
  ok: boolean;
  message: string;
}

function legacyCopyText(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  textarea.remove();
  if (previousRange && selection) {
    selection.removeAllRanges();
    selection.addRange(previousRange);
  }
  return ok;
}

export async function copyText(text: string, label = 'Text'): Promise<ClipboardResult> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, message: `${label} copied to clipboard` };
    } catch {
      // Permission denied or document not focused: fall back to execCommand below.
    }
  }
  if (legacyCopyText(text)) return { ok: true, message: `${label} copied to clipboard` };
  return { ok: false, message: `Could not copy ${label.toLowerCase()}. Your browser blocked clipboard access.` };
}

export function supportsImageClipboard(): boolean {
  return typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write && window.isSecureContext;
}

/**
 * Copies SVG markup. Where supported, the clipboard also gets an `image/svg+xml` representation so design
 * tools can paste it as a vector; the plain-text markup is always included.
 */
export async function copySvg(svg: string): Promise<ClipboardResult> {
  if (supportsImageClipboard()) {
    const supportsSvg = typeof ClipboardItem.supports === 'function' ? ClipboardItem.supports('image/svg+xml') : false;
    try {
      const items: Record<string, Blob> = { 'text/plain': new Blob([svg], { type: 'text/plain' }) };
      if (supportsSvg) items['image/svg+xml'] = new Blob([svg], { type: 'image/svg+xml' });
      await navigator.clipboard.write([new ClipboardItem(items)]);
      return { ok: true, message: 'SVG copied to clipboard' };
    } catch {
      // Fall back to plain text.
    }
  }
  return copyText(svg, 'SVG');
}

/**
 * Copies a PNG. The blob is passed as a promise so Safari keeps the user-activation needed for clipboard writes
 * while the image is still being generated.
 */
export async function copyImage(createPng: () => Promise<Blob>): Promise<ClipboardResult> {
  if (!supportsImageClipboard()) {
    return { ok: false, message: 'This browser does not support copying images. Use Export → PNG instead.' };
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': createPng() })]);
    return { ok: true, message: 'Image copied to clipboard' };
  } catch (err) {
    const reason = err instanceof Error && err.message ? ` (${err.message})` : '';
    return { ok: false, message: `Could not copy the image${reason}. Use Export → PNG instead.` };
  }
}
