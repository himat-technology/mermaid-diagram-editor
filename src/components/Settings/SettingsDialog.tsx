import { THEMES } from '../../data/themes';
import type { DiagramTypeId } from '../../types/diagram';
import { DEFAULT_CONFIG, type DiagramConfig, type FlowchartCurve, type MermaidTheme, type Preferences, type PreviewBackground } from '../../types/settings';
import { Modal } from '../common/Modal';

export type FlowDirection = 'TB' | 'TD' | 'BT' | 'LR' | 'RL';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  theme: MermaidTheme;
  config: DiagramConfig;
  diagramType: DiagramTypeId;
  direction: FlowDirection | null;
  preferences: Preferences;
  onThemeChange: (theme: MermaidTheme) => void;
  onConfigChange: (patch: Partial<DiagramConfig>) => void;
  onDirectionChange: (direction: FlowDirection) => void;
  onPreferencesChange: (patch: Partial<Preferences>) => void;
  onResetConfig: () => void;
}

const CURVES: Array<{ id: FlowchartCurve; label: string }> = [
  { id: 'basis', label: 'Basis (smooth)' },
  { id: 'linear', label: 'Linear' },
  { id: 'cardinal', label: 'Cardinal' },
  { id: 'monotoneX', label: 'Monotone X' },
  { id: 'natural', label: 'Natural' },
  { id: 'step', label: 'Step' },
];

const ELK_TYPES: DiagramTypeId[] = ['flowchart', 'state', 'class', 'er'];
const LOOK_TYPES: DiagramTypeId[] = ['flowchart', 'state', 'class', 'er', 'sequence', 'requirement', 'mindmap', 'kanban', 'block', 'architecture', 'c4', 'treeView'];

export function SettingsDialog(props: SettingsDialogProps) {
  const { open, onClose, theme, config, diagramType, direction, preferences, onThemeChange, onConfigChange, onDirectionChange, onPreferencesChange, onResetConfig } = props;
  const isFlow = diagramType === 'flowchart';

  return (
    <Modal
      open={open}
      title="Settings"
      description="Diagram settings are stored with the current diagram. Editor settings apply everywhere."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="btn" onClick={onResetConfig}>
            Reset diagram settings
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="settings">
        <section className="settings__section" aria-labelledby="settings-diagram">
          <h3 id="settings-diagram" className="section-title">
            Diagram
          </h3>
          <div className="settings__grid">
            <div className="field">
              <label className="field__label" htmlFor="set-theme">
                Theme
              </label>
              <select id="set-theme" className="select" value={theme} onChange={(e) => onThemeChange(e.target.value as MermaidTheme)}>
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-look">
                Look
              </label>
              <select id="set-look" className="select" value={config.look} onChange={(e) => onConfigChange({ look: e.target.value as DiagramConfig['look'] })}>
                <option value="classic">Classic</option>
                <option value="handDrawn">Hand-drawn</option>
                <option value="neo">Neo</option>
              </select>
              {!LOOK_TYPES.includes(diagramType) && <span className="field__hint">This diagram type may ignore the look setting.</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-layout">
                Layout engine
              </label>
              <select id="set-layout" className="select" value={config.layout} onChange={(e) => onConfigChange({ layout: e.target.value as DiagramConfig['layout'] })}>
                <option value="dagre">Dagre (default)</option>
                <option value="elk">ELK (better for large graphs)</option>
              </select>
              {!ELK_TYPES.includes(diagramType) && <span className="field__hint">Only flowchart, state, class and ER diagrams use this.</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-direction">
                Direction
              </label>
              <select id="set-direction" className="select" value={direction ?? 'TD'} disabled={!isFlow} onChange={(e) => onDirectionChange(e.target.value as FlowDirection)}>
                <option value="TD">Top → bottom (TD)</option>
                <option value="BT">Bottom → top (BT)</option>
                <option value="LR">Left → right (LR)</option>
                <option value="RL">Right → left (RL)</option>
              </select>
              <span className="field__hint">{isFlow ? 'Updates the direction in the flowchart declaration.' : 'Available for flowcharts.'}</span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-curve">
                Edge curve
              </label>
              <select id="set-curve" className="select" value={config.curve} disabled={!isFlow} onChange={(e) => onConfigChange({ curve: e.target.value as FlowchartCurve })}>
                {CURVES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              {!isFlow && <span className="field__hint">Available for flowcharts.</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-font">
                Font size: {config.fontSize}px
              </label>
              <input id="set-font" type="range" min={10} max={28} step={1} value={config.fontSize} onChange={(e) => onConfigChange({ fontSize: Number(e.target.value) })} />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-padding">
                Diagram padding: {config.diagramPadding}px
              </label>
              <input id="set-padding" type="range" min={0} max={64} step={2} value={config.diagramPadding} onChange={(e) => onConfigChange({ diagramPadding: Number(e.target.value) })} />
              <span className="field__hint">Applies to flowchart, class and ER diagrams.</span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-security">
                Security level
              </label>
              <select id="set-security" className="select" value={config.securityLevel} onChange={(e) => onConfigChange({ securityLevel: e.target.value as DiagramConfig['securityLevel'] })}>
                <option value="strict">Strict (recommended)</option>
                <option value="antiscript">Antiscript</option>
              </select>
              <span className="field__hint">Strict encodes HTML in labels and disables click events. Output is always sanitized.</span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-bg">
                Preview background
              </label>
              <div className="inline-fields">
                <select id="set-bg" className="select" value={config.background} onChange={(e) => onConfigChange({ background: e.target.value as PreviewBackground })}>
                  <option value="theme">Theme</option>
                  <option value="white">White</option>
                  <option value="transparent">Transparent (checkerboard)</option>
                  <option value="custom">Custom</option>
                </select>
                {config.background === 'custom' && (
                  <input type="color" className="color-input" aria-label="Custom preview background" value={config.customBackground} onChange={(e) => onConfigChange({ customBackground: e.target.value })} />
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="settings__section" aria-labelledby="settings-editor">
          <h3 id="settings-editor" className="section-title">
            Editor &amp; preview
          </h3>
          <div className="settings__grid">
            <div className="field">
              <label className="field__label" htmlFor="set-ui">
                Interface theme
              </label>
              <select id="set-ui" className="select" value={preferences.uiTheme} onChange={(e) => onPreferencesChange({ uiTheme: e.target.value as Preferences['uiTheme'] })}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-editor-font">
                Editor font size: {preferences.editorFontSize}px
              </label>
              <input id="set-editor-font" type="range" min={11} max={22} value={preferences.editorFontSize} onChange={(e) => onPreferencesChange({ editorFontSize: Number(e.target.value) })} />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-scale">
                Preview scale: {Math.round(preferences.previewScale * 100)}%
              </label>
              <input id="set-scale" type="range" min={0.25} max={3} step={0.05} value={preferences.previewScale} onChange={(e) => onPreferencesChange({ previewScale: Number(e.target.value) })} />
              <span className="field__hint">Zoom level used by “Reset zoom”.</span>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="set-delay">
                Render delay: {preferences.renderDelay} ms
              </label>
              <input id="set-delay" type="range" min={150} max={2000} step={50} value={preferences.renderDelay} onChange={(e) => onPreferencesChange({ renderDelay: Number(e.target.value) })} />
              <span className="field__hint">Pause after typing before the preview updates.</span>
            </div>

            <label className="checkbox">
              <input type="checkbox" checked={preferences.autoRender} onChange={(e) => onPreferencesChange({ autoRender: e.target.checked })} />
              <span>
                Render automatically
                <span className="field__hint">When off, press Ctrl/Cmd+Enter to render.</span>
              </span>
            </label>

            <label className="checkbox">
              <input type="checkbox" checked={preferences.editorWordWrap} onChange={(e) => onPreferencesChange({ editorWordWrap: e.target.checked })} />
              <span>Word wrap in editor</span>
            </label>

            <label className="checkbox">
              <input type="checkbox" checked={preferences.svgMetadata} onChange={(e) => onPreferencesChange({ svgMetadata: e.target.checked })} />
              <span>
                SVG metadata by default
                <span className="field__hint">Embed title and Mermaid source in exported SVGs.</span>
              </span>
            </label>
          </div>
        </section>
        <p className="field__hint">Defaults: theme Default, look {DEFAULT_CONFIG.look}, font {DEFAULT_CONFIG.fontSize}px, security {DEFAULT_CONFIG.securityLevel}.</p>
      </div>
    </Modal>
  );
}
