import { forwardRef, memo, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { formatShortcut } from '../../hooks/useKeyboardShortcuts';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  shortcut?: string;
  /** Show the label text next to the icon (hidden on narrow screens). */
  showLabel?: boolean;
  active?: boolean;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/** Icon button with an accessible name and a CSS tooltip that includes the keyboard shortcut. */
const IconButtonInner = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, shortcut, showLabel = false, active, tooltipPosition = 'bottom', className = '', ...rest },
  ref,
) {
  const tooltip = shortcut ? `${label} (${formatShortcut(shortcut)})` : label;
  return (
    <button
      ref={ref}
      type="button"
      className={`${showLabel ? 'tool-btn' : 'icon-btn'} ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      aria-keyshortcuts={shortcut?.replace('mod', 'Control')}
      aria-pressed={active}
      data-tooltip={tooltip}
      data-tooltip-pos={tooltipPosition}
      {...rest}
    >
      {icon}
      {showLabel && <span className="tool-btn__label">{label}</span>}
    </button>
  );
});

export const IconButton = memo(IconButtonInner);
