import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DropOverlayProps {
  onDropFiles: (files: File[]) => void;
}

/** Full-window drag-and-drop target for importing files. */
export function DropOverlay({ onDropFiles }: DropOverlayProps) {
  const [active, setActive] = useState(false);
  const depth = useRef(0);
  const onDropRef = useRef(onDropFiles);
  onDropRef.current = onDropFiles;

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current++;
      setActive(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setActive(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) onDropRef.current(files);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  if (!active) return null;
  return (
    <div className="drop-overlay" aria-hidden>
      <div className="drop-overlay__box">
        <Upload size={32} />
        <p>Drop to import</p>
        <span>.mmd · .mermaid · .md · .markdown · .himatdiagram · .svg (with metadata)</span>
      </div>
    </div>
  );
}
