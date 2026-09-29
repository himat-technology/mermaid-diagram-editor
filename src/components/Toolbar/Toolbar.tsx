import { AlertCircle, Check, Command, Download, Expand, FilePlus, FolderOpen, Loader2, Monitor, Moon, Palette, PanelLeft, Save, Settings, Share2, Shrink, Sun } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { THEMES } from '../../data/themes';
import type { SaveStatus } from '../../hooks/useAutosave';
import type { MermaidTheme, UiTheme } from '../../types/settings';
import { IconButton } from '../common/IconButton';
import { Menu } from '../common/Menu';

interface ToolbarProps {
  name: string;
  onRename: (name: string) => void;
  saveStatus: SaveStatus;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExport: () => void;
  onShare: () => void;
  onSettings: () => void;
  onCommandPalette: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  theme: MermaidTheme;
  onThemeChange: (theme: MermaidTheme) => void;
  uiTheme: UiTheme;
  onUiThemeChange: (theme: UiTheme) => void;
}

const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: 'Saved locally',
  pending: 'Unsaved changes',
  saving: 'Saving…',
  error: 'Save failed',
};

function DiagramNameInput({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [value, setValue] = useState(name);
  useEffect(() => setValue(name), [name]);
  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setValue(name);
  };
  return (
    <input
      className="name-input"
      aria-label="Diagram name"
      value={value}
      maxLength={120}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setValue(name);
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export const Toolbar = memo(function Toolbar(props: ToolbarProps) {
  const { name, onRename, saveStatus, sidebarOpen, onToggleSidebar, theme, onThemeChange, uiTheme, onUiThemeChange, isFullscreen } = props;

  return (
    <header className="toolbar" role="banner">
      <div className="toolbar__group toolbar__group--left">
        <IconButton label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} icon={<PanelLeft size={18} aria-hidden />} onClick={onToggleSidebar} active={sidebarOpen} />
        <div className="brand" aria-label="Mermaid Diagram Editor">
          <img src="./favicon.svg" alt="" width={22} height={22} />
          <span className="brand__name">Mermaid Editor</span>
        </div>
        <span className="toolbar-divider" aria-hidden />
        <DiagramNameInput name={name} onRename={onRename} />
        <span className={`save-status save-status--${saveStatus}`} role="status" aria-live="polite" title={SAVE_LABEL[saveStatus]}>
          {saveStatus === 'saving' ? <Loader2 size={13} className="spin" aria-hidden /> : saveStatus === 'error' ? <AlertCircle size={13} aria-hidden /> : saveStatus === 'saved' ? <Check size={13} aria-hidden /> : <span className="dot" aria-hidden />}
          <span className="save-status__label">{SAVE_LABEL[saveStatus]}</span>
        </span>
      </div>

      <nav className="toolbar__group toolbar__group--right" aria-label="Main actions">
        <IconButton label="New" showLabel shortcut="alt+n" icon={<FilePlus size={16} aria-hidden />} onClick={props.onNew} />
        <IconButton label="Open" showLabel shortcut="mod+o" icon={<FolderOpen size={16} aria-hidden />} onClick={props.onOpen} />
        <IconButton label="Save" showLabel shortcut="mod+s" icon={<Save size={16} aria-hidden />} onClick={props.onSave} />
        <IconButton label="Export" showLabel shortcut="mod+shift+s" icon={<Download size={16} aria-hidden />} onClick={props.onExport} />
        <IconButton label="Share" showLabel icon={<Share2 size={16} aria-hidden />} onClick={props.onShare} />
        <span className="toolbar-divider" aria-hidden />
        <Menu
          label="Theme"
          align="end"
          trigger={(triggerProps) => (
            <button type="button" className="tool-btn" aria-label="Theme" data-tooltip="Diagram and interface theme" data-tooltip-pos="bottom" {...triggerProps}>
              <Palette size={16} aria-hidden />
              <span className="tool-btn__label">Theme</span>
            </button>
          )}
          items={[
            { id: 'h-diagram', heading: 'Diagram theme' },
            ...THEMES.map((t) => ({ id: `theme-${t.id}`, label: t.label, checked: theme === t.id, onSelect: () => onThemeChange(t.id) })),
            { id: 'sep', separator: true },
            { id: 'h-ui', heading: 'Interface' },
            { id: 'ui-light', label: 'Light', icon: <Sun size={14} />, checked: uiTheme === 'light', onSelect: () => onUiThemeChange('light') },
            { id: 'ui-dark', label: 'Dark', icon: <Moon size={14} />, checked: uiTheme === 'dark', onSelect: () => onUiThemeChange('dark') },
            { id: 'ui-system', label: 'System', icon: <Monitor size={14} />, checked: uiTheme === 'system', onSelect: () => onUiThemeChange('system') },
          ]}
        />
        <IconButton label="Settings" icon={<Settings size={17} aria-hidden />} onClick={props.onSettings} />
        <IconButton
          label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          icon={isFullscreen ? <Shrink size={17} aria-hidden /> : <Expand size={17} aria-hidden />}
          onClick={props.onToggleFullscreen}
        />
        <IconButton label="Command palette" shortcut="mod+k" icon={<Command size={17} aria-hidden />} onClick={props.onCommandPalette} tooltipPosition="left" />
      </nav>
    </header>
  );
});
