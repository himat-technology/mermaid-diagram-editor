import { useEffect, useRef } from 'react';

export interface Shortcut {
  /** e.g. "mod+s", "mod+shift+s", "mod+enter", "mod+k". `mod` is Cmd on macOS and Ctrl elsewhere. */
  combo: string;
  handler: (e: KeyboardEvent) => void;
  /** Allow while a modal dialog is open. Defaults to false. */
  allowInDialog?: boolean;
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

export function formatShortcut(combo: string): string {
  return combo
    .split('+')
    .map((part) => {
      switch (part) {
        case 'mod':
          return isMac ? '⌘' : 'Ctrl';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'enter':
          return isMac ? '↵' : 'Enter';
        case 'escape':
          return 'Esc';
        default:
          return part.length === 1 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1);
      }
    })
    .join(isMac ? '' : '+');
}

function matches(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const wantMod = parts.includes('mod');
  const wantShift = parts.includes('shift');
  const wantAlt = parts.includes('alt');
  const mod = isMac ? e.metaKey : e.ctrlKey;
  if (wantMod !== mod || wantShift !== e.shiftKey || wantAlt !== e.altKey) return false;
  if (isMac ? e.ctrlKey : e.metaKey) return false;
  const pressed = e.key.toLowerCase();
  return pressed === key || (key === 'enter' && pressed === 'enter');
}

/**
 * Global shortcuts registered in the capture phase so they win over the code editor's own bindings
 * (e.g. CodeMirror maps Mod-Enter to "insert blank line"). Plain typing is never intercepted because every
 * shortcut requires a modifier.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  const ref = useRef(shortcuts);
  ref.current = shortcuts;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      const dialogOpen = !!document.querySelector('[role="dialog"][aria-modal="true"]');
      for (const s of ref.current) {
        if (!matches(e, s.combo)) continue;
        if (dialogOpen && !s.allowInDialog) return;
        e.preventDefault();
        e.stopPropagation();
        s.handler(e);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);
}
