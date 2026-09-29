import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.01;
export const MAX_SCALE = 8;
const ZOOM_STEP = 1.2;

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

interface ContentSize {
  width: number;
  height: number;
}

/**
 * Pan (drag / arrow keys) and zoom (wheel, pinch, +/- keys) for the preview canvas. The transform is applied
 * with CSS so the SVG DOM is not re-created while navigating.
 */
export function usePanZoom(containerRef: RefObject<HTMLElement | null>, content: ContentSize | null, defaultScale = 1) {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: defaultScale });
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const contentRef = useRef(content);
  contentRef.current = content;
  const [isPanning, setIsPanning] = useState(false);

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = clientX !== undefined ? clientX - rect.left : rect.width / 2;
      const py = clientY !== undefined ? clientY - rect.top : rect.height / 2;
      setTransform((t) => {
        const scale = clampScale(t.scale * factor);
        const k = scale / t.scale;
        return { scale, x: px - (px - t.x) * k, y: py - (py - t.y) * k };
      });
    },
    [containerRef],
  );

  const center = useCallback(
    (scale: number) => {
      const el = containerRef.current;
      const c = contentRef.current;
      if (!el || !c) return setTransform({ x: 0, y: 0, scale });
      const rect = el.getBoundingClientRect();
      setTransform({ scale, x: (rect.width - c.width * scale) / 2, y: (rect.height - c.height * scale) / 2 });
    },
    [containerRef],
  );

  const fit = useCallback(() => {
    const el = containerRef.current;
    const c = contentRef.current;
    if (!el || !c || c.width === 0 || c.height === 0) return;
    const rect = el.getBoundingClientRect();
    const margin = 32;
    const scale = clampScale(Math.min((rect.width - margin * 2) / c.width, (rect.height - margin * 2) / c.height));
    center(scale);
  }, [center, containerRef]);

  const reset = useCallback(() => center(defaultScale), [center, defaultScale]);
  const zoomIn = useCallback(() => zoomAt(ZOOM_STEP), [zoomAt]);
  const zoomOut = useCallback(() => zoomAt(1 / ZOOM_STEP), [zoomAt]);
  const setScale = useCallback((scale: number) => zoomAt(clampScale(scale) / transformRef.current.scale), [zoomAt]);
  const panBy = useCallback((dx: number, dy: number) => setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy })), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element | null)?.closest('[data-no-pan]')) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || !e.shiftKey) {
        // Pinch gestures arrive as ctrl+wheel with small deltas; mouse wheels send larger steps.
        const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015));
        zoomAt(factor, e.clientX, e.clientY);
      } else {
        panBy(-e.deltaY, -e.deltaX);
      }
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let pointerId: number | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      if ((e.target as Element | null)?.closest('[data-no-pan], button, a, input, select, textarea')) return;
      dragging = true;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      setIsPanning(true);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      panBy(dx, dy);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      dragging = false;
      pointerId = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      setIsPanning(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target !== el || e.ctrlKey || e.metaKey || e.altKey) return;
      const step = e.shiftKey ? 100 : 40;
      const actions: Record<string, () => void> = {
        '+': () => zoomAt(ZOOM_STEP),
        '=': () => zoomAt(ZOOM_STEP),
        '-': () => zoomAt(1 / ZOOM_STEP),
        '0': () => center(defaultScale),
        f: fit,
        ArrowLeft: () => panBy(step, 0),
        ArrowRight: () => panBy(-step, 0),
        ArrowUp: () => panBy(0, step),
        ArrowDown: () => panBy(0, -step),
      };
      const action = actions[e.key];
      if (action) {
        e.preventDefault();
        action();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('keydown', onKeyDown);
    };
  }, [containerRef, zoomAt, panBy, fit, center, defaultScale]);

  return { transform, isPanning, zoomIn, zoomOut, fit, reset, setScale };
}
