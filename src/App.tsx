import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommandPalette, type Command } from './components/CommandPalette/CommandPalette';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useToast } from './components/common/Toast';
import type { CodeEditorHandle } from './components/Editor/CodeEditor';
import { EditorPanel } from './components/Editor/EditorPanel';
import { DropOverlay } from './components/Import/DropOverlay';
import { PreviewPanel, type PreviewHandle } from './components/Preview/PreviewPanel';
import { RecentDiagrams } from './components/RecentDiagrams/RecentDiagrams';
import type { FlowDirection } from './components/Settings/SettingsDialog';
import { Sidebar, type SidebarTab } from './components/Sidebar/Sidebar';
import { DiagramTypeList } from './components/Templates/DiagramTypeList';
import { TemplateList } from './components/Templates/TemplateList';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Workspace } from './components/Workspace/Workspace';
import { DEFAULT_CODE, DIAGRAM_TYPES } from './data/diagramTypes';
import { TEMPLATES } from './data/templates';
import { THEME_MAP, THEMES } from './data/themes';
import { useAutosave } from './hooks/useAutosave';
import { useDiagramLibrary } from './hooks/useIndexedDB';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useMermaid } from './hooks/useMermaid';
import { usePreferences } from './hooks/usePreferences';
import { copyImage, copySvg, copyText } from './services/clipboardService';
import { buildRasterExport, buildSvgExport, exportDiagram, type ExportSource } from './services/exportService';
import { ImportError, importFile, parsePastedText, serializeProject } from './services/importService';
import { createDiagram, getDiagram, getLastOpenedId, listDiagrams, setLastOpenedId } from './services/storageService';
import { readShareHash } from './services/shareService';
import type { Diagram, DiagramTemplate, DiagramTypeInfo, ImportResult, MermaidBlock } from './types/diagram';
import type { ExportFormat } from './types/export';
import { DEFAULT_CONFIG, type DiagramConfig, type MermaidTheme, type PreviewBackground } from './types/settings';
import { detectDiagramType, findHeaderLine } from './utils/diagramDetection';
import { downloadText, getExportFileName, IMPORT_EXTENSIONS, isSupportedImportFile } from './utils/fileUtils';
import { looksLikeMarkdownWithMermaid } from './utils/markdownParser';
import { findSyntaxFixes } from './utils/syntaxFixer';
import { validateMermaidCode } from './utils/validation';

// Dialogs are not needed for first paint; load them on demand.
const ExportDialog = lazy(() => import('./components/Export/ExportDialog').then((m) => ({ default: m.ExportDialog })));
const ShareDialog = lazy(() => import('./components/Share/ShareDialog').then((m) => ({ default: m.ShareDialog })));
const SettingsDialog = lazy(() => import('./components/Settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog })));
const PasteDialog = lazy(() => import('./components/Import/PasteDialog').then((m) => ({ default: m.PasteDialog })));
const MarkdownBlockPicker = lazy(() => import('./components/Import/MarkdownBlockPicker').then((m) => ({ default: m.MarkdownBlockPicker })));
const FixSyntaxDialog = lazy(() => import('./components/Preview/FixSyntaxDialog').then((m) => ({ default: m.FixSyntaxDialog })));
type Dialog =
  | { kind: 'export'; format?: ExportFormat }
  | { kind: 'share' }
  | { kind: 'settings' }
  | { kind: 'paste' }
  | { kind: 'fix' }
  | { kind: 'palette' }
  | { kind: 'blocks'; fileName: string; blocks: MermaidBlock[] }
  | { kind: 'delete'; diagram: Diagram };

const FLOW_HEADER = /^(\s*)(flowchart|graph)(?:\s+(TB|TD|BT|LR|RL))?\b/;

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || !!el.closest('.cm-editor'));
}

export default function App() {
  const toast = useToast();
  const { preferences, update: updatePreferences, isDark } = usePreferences();
  const library = useDiagramLibrary();
  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('types');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<'code' | 'preview'>('code');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isTablet = useMediaQuery('(max-width: 1100px)');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const sidebarOpen = isTablet ? drawerOpen : preferences.sidebarOpen;

  const editorRef = useRef<CodeEditorHandle>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diagramRef = useRef(diagram);
  diagramRef.current = diagram;

  const autosave = useAutosave(diagram, library.save);

  // ---------------------------------------------------------------- boot
  const openShared = useCallback(
    async (hash: string): Promise<boolean> => {
      const shared = readShareHash(hash);
      if (!shared) return false;
      const d = createDiagram({ name: shared.name, code: shared.code, theme: shared.theme, config: shared.config });
      try {
        await library.save(d);
      } catch {
        // Still show the diagram if storage is unavailable.
      }
      autosave.markSaved(d);
      setDiagram(d);
      // Drop the fragment so a refresh doesn't import the same diagram again.
      history.replaceState(null, '', window.location.pathname + window.location.search);
      toast.success(`Opened shared diagram “${d.name}”`);
      return true;
    },
    [library, autosave, toast],
  );

  const booted = useRef(false);
  useEffect(() => {
    // StrictMode mounts effects twice in development; boot must only run once or it would create duplicates.
    if (booted.current) return;
    booted.current = true;
    (async () => {
      if (window.location.hash && (await openShared(window.location.hash))) return;
      if (window.location.hash) toast.error('The share link is invalid or damaged.');
      let d: Diagram | undefined;
      try {
        const lastId = getLastOpenedId();
        d = lastId ? await getDiagram(lastId) : undefined;
        if (!d) d = (await listDiagrams())[0];
      } catch {
        d = undefined;
      }
      if (!d) {
        d = createDiagram({ name: 'My first diagram', code: DEFAULT_CODE });
        try {
          await library.save(d);
        } catch {
          // In-memory only.
        }
      }
      autosave.markSaved(d);
      setDiagram(d);
    })();
  }, []);

  useEffect(() => {
    const onHash = () => void openShared(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [openShared]);

  useEffect(() => {
    if (diagram?.id) setLastOpenedId(diagram.id);
  }, [diagram?.id]);

  useEffect(() => {
    document.title = diagram ? `${diagram.name} · Mermaid Diagram Editor` : 'Mermaid Diagram Editor';
  }, [diagram]);

  // ---------------------------------------------------------------- rendering
  const code = diagram?.code ?? '';
  const theme = diagram?.theme ?? 'default';
  const config = diagram?.config ?? DEFAULT_CONFIG;
  const mermaid = useMermaid(code, theme, config, { autoRender: preferences.autoRender, delay: preferences.renderDelay, resetKey: diagram?.id });

  const error = useMemo(() => {
    if (!mermaid.error) return null;
    if (mermaid.error.line) return mermaid.error;
    const issue = validateMermaidCode(code).issues.find((i) => i.line);
    return issue ? { ...mermaid.error, line: issue.line, column: issue.column } : mermaid.error;
  }, [mermaid.error, code]);

  const fixCount = useMemo(() => (error ? findSyntaxFixes(code).length : 0), [error, code]);

  // Programmatic code replacements (templates, fixes) render right away instead of waiting for the typing debounce.
  const renderImmediately = useRef(false);
  const { renderNow } = mermaid;
  useEffect(() => {
    if (!renderImmediately.current) return;
    renderImmediately.current = false;
    renderNow();
  }, [code, renderNow]);

  const themeBackground = THEME_MAP[theme].background;
  const previewBackground: string | null =
    config.background === 'transparent' ? null : config.background === 'white' ? '#ffffff' : config.background === 'custom' ? config.customBackground : themeBackground;

  // ---------------------------------------------------------------- diagram mutations
  const updateDiagram = useCallback((patch: Partial<Diagram>) => {
    setDiagram((d) => (d ? { ...d, ...patch, updatedAt: Date.now() } : d));
  }, []);

  const onCodeChange = useCallback((next: string) => {
    setDiagram((d) => (d && d.code !== next ? { ...d, code: next, type: detectDiagramType(next), updatedAt: Date.now() } : d));
  }, []);

  const onConfigChange = useCallback((patch: Partial<DiagramConfig>) => {
    setDiagram((d) => (d ? { ...d, config: { ...d.config, ...patch }, updatedAt: Date.now() } : d));
  }, []);

  const onThemeChange = useCallback((t: MermaidTheme) => updateDiagram({ theme: t }), [updateDiagram]);

  const direction = useMemo<FlowDirection | null>(() => {
    if (diagram?.type !== 'flowchart') return null;
    const header = findHeaderLine(code);
    const m = header.text.match(FLOW_HEADER);
    return m ? ((m[3] as FlowDirection | undefined) ?? 'TD') : null;
  }, [code, diagram?.type]);

  const onDirectionChange = useCallback(
    (dir: FlowDirection) => {
      const current = diagramRef.current;
      if (!current) return;
      const header = findHeaderLine(current.code);
      if (header.lineIndex < 0) return;
      const lines = current.code.split('\n');
      lines[header.lineIndex] = lines[header.lineIndex].replace(FLOW_HEADER, (_m, indent: string, kw: string) => `${indent}${kw} ${dir}`);
      renderImmediately.current = true;
      onCodeChange(lines.join('\n'));
    },
    [onCodeChange],
  );

  // ---------------------------------------------------------------- open / create
  const openDiagramObject = useCallback(
    async (d: Diagram, { persist }: { persist: boolean }) => {
      await autosave.flush();
      if (persist) {
        try {
          await library.save(d);
        } catch {
          toast.error('Could not save to local storage. The diagram is open but not persisted.');
        }
      }
      autosave.markSaved(d);
      setDiagram(d);
      setDrawerOpen(false);
    },
    [autosave, library, toast],
  );

  const createAndOpen = useCallback(
    (partial: Partial<Diagram>) => openDiagramObject(createDiagram({ theme: diagramRef.current?.theme, ...partial }), { persist: true }),
    [openDiagramObject],
  );

  const onNew = useCallback(() => {
    void createAndOpen({ name: 'Untitled diagram', code: DEFAULT_CODE });
    toast.info('New diagram created');
    if (isMobile) setMobilePane('code');
    window.setTimeout(() => editorRef.current?.focus(), 50);
  }, [createAndOpen, toast, isMobile]);

  const onOpenRecent = useCallback(
    async (id: string) => {
      if (id === diagramRef.current?.id) {
        setDrawerOpen(false);
        return;
      }
      const d = await getDiagram(id);
      if (!d) {
        toast.error('That diagram no longer exists.');
        void library.refresh();
        return;
      }
      await openDiagramObject(d, { persist: false });
    },
    [openDiagramObject, library, toast],
  );

  const onSelectType = useCallback(
    (t: DiagramTypeInfo) => {
      renderImmediately.current = true;
      onCodeChange(t.template);
      setDrawerOpen(false);
      if (isMobile) setMobilePane('preview');
      toast.info(`Loaded ${t.label} template. Press Ctrl/Cmd+Z in the editor to undo.`);
    },
    [onCodeChange, isMobile, toast],
  );

  const onSelectTemplate = useCallback(
    (t: DiagramTemplate) => {
      void createAndOpen({ name: t.name, code: t.code });
      if (isMobile) setMobilePane('preview');
      toast.success(`Opened template “${t.name}” as a new diagram`);
    },
    [createAndOpen, isMobile, toast],
  );

  // ---------------------------------------------------------------- import
  const handleImportResult = useCallback(
    async (result: ImportResult, fileName: string) => {
      if (result.kind === 'blocks') {
        setDialog({ kind: 'blocks', fileName, blocks: result.blocks });
        return;
      }
      await createAndOpen({ name: result.name, code: result.code, theme: result.theme ?? diagramRef.current?.theme, config: { ...DEFAULT_CONFIG, ...result.config } });
      toast.success(`Imported “${result.name}”`);
    },
    [createAndOpen, toast],
  );

  const importFiles = useCallback(
    async (files: File[]) => {
      const supported = files.filter((f) => isSupportedImportFile(f.name));
      if (supported.length === 0) {
        toast.error(`Unsupported file. Use ${IMPORT_EXTENSIONS.join(', ')}.`);
        return;
      }
      for (const file of supported) {
        try {
          await handleImportResult(await importFile(file), file.name);
        } catch (err) {
          toast.error(err instanceof ImportError ? err.message : `Could not import “${file.name}”.`);
        }
      }
      if (supported.length < files.length) toast.info(`${files.length - supported.length} unsupported file(s) were skipped.`);
    },
    [handleImportResult, toast],
  );

  const onOpenFile = useCallback(() => fileInputRef.current?.click(), []);

  const onPasteImport = useCallback(
    async (text: string) => {
      try {
        setDialog(null);
        await handleImportResult(parsePastedText(text), 'Pasted content');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not import the pasted content.');
      }
    },
    [handleImportResult, toast],
  );

  // Pasting Mermaid/Markdown anywhere outside a text field imports it.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target) || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (!text.trim()) return;
      if (looksLikeMarkdownWithMermaid(text) || detectDiagramType(text) !== 'unknown') {
        e.preventDefault();
        void onPasteImport(text);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onPasteImport]);

  // ---------------------------------------------------------------- save / library
  const onSave = useCallback(async () => {
    const d = diagramRef.current;
    if (!d) return;
    try {
      await autosave.flush();
      await library.save(d);
      autosave.markSaved(d);
      toast.success('Saved to this browser');
    } catch {
      toast.error('Saving failed. Local storage may be full or disabled.');
    }
  }, [autosave, library, toast]);

  const onRenameFromList = useCallback(
    async (id: string, name: string) => {
      if (id === diagramRef.current?.id) updateDiagram({ name });
      else await library.rename(id, name);
      toast.success('Renamed');
    },
    [library, updateDiagram, toast],
  );

  const onDuplicate = useCallback(
    async (id: string) => {
      await autosave.flush();
      const copy = await library.duplicate(id);
      if (copy) toast.success(`Created “${copy.name}”`);
    },
    [autosave, library, toast],
  );

  const onConfirmDelete = useCallback(
    async (target: Diagram) => {
      setDialog(null);
      await library.remove(target.id);
      toast.success(`Deleted “${target.name}”`);
      if (target.id === diagramRef.current?.id) {
        const next = (await listDiagrams())[0];
        if (next) await openDiagramObject(next, { persist: false });
        else await createAndOpen({ name: 'Untitled diagram', code: DEFAULT_CODE });
      }
    },
    [library, toast, openDiagramObject, createAndOpen],
  );

  const onExportProjectFromList = useCallback(
    async (id: string) => {
      const d = id === diagramRef.current?.id ? diagramRef.current : await getDiagram(id);
      if (!d) return;
      const fileName = getExportFileName(d.name, 'project');
      downloadText(serializeProject(d), fileName, 'application/json');
      toast.success(`Downloaded ${fileName}`);
    },
    [toast],
  );

  // ---------------------------------------------------------------- export / clipboard
  const exportSource: ExportSource | null = useMemo(() => (diagram ? { diagram, svg: mermaid.svg, themeBackground } : null), [diagram, mermaid.svg, themeBackground]);
  const exportSourceRef = useRef(exportSource);
  exportSourceRef.current = exportSource;

  const quickExport = useCallback(
    async (format: ExportFormat) => {
      const source = exportSourceRef.current;
      if (!source) return;
      try {
        const outcome = await exportDiagram(source, {
          format,
          background: format === 'jpg' ? 'white' : 'transparent',
          customBackground: '#ffffff',
          scale: 2,
          padding: 16,
          quality: 0.92,
          includeMetadata: preferences.svgMetadata,
          fileName: source.diagram.name,
        });
        toast.success(`Downloaded ${outcome.fileName}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Export failed.');
      }
    },
    [preferences.svgMetadata, toast],
  );

  const onCopyMermaid = useCallback(async () => {
    const r = await copyText(diagramRef.current?.code ?? '', 'Mermaid source');
    r.ok ? toast.success(r.message) : toast.error(r.message);
  }, [toast]);

  const onCopySvg = useCallback(async () => {
    const source = exportSourceRef.current;
    if (!source?.svg) return toast.error('Nothing rendered yet.');
    try {
      const { svg } = buildSvgExport(source, { background: 'transparent', customBackground: '#fff', padding: 16, includeMetadata: preferences.svgMetadata });
      const r = await copySvg(svg);
      r.ok ? toast.success(r.message) : toast.error(r.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not copy SVG.');
    }
  }, [preferences.svgMetadata, toast]);

  const onCopyImage = useCallback(async () => {
    const source = exportSourceRef.current;
    if (!source?.svg) return toast.error('Nothing rendered yet.');
    const r = await copyImage(async () => (await buildRasterExport(source, { format: 'png', background: 'theme', customBackground: '#fff', padding: 16, scale: 2, quality: 1 })).blob);
    r.ok ? toast.success(r.message) : toast.error(r.message);
  }, [toast]);

  // ---------------------------------------------------------------- view
  const toggleSidebar = useCallback(() => {
    if (isTablet) setDrawerOpen((o) => !o);
    else updatePreferences({ sidebarOpen: !preferences.sidebarOpen });
  }, [isTablet, preferences.sidebarOpen, updatePreferences]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === document.documentElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (document.fullscreenEnabled) document.documentElement.requestFullscreen().catch(() => toast.error('Fullscreen is not available.'));
    else toast.error('Fullscreen is not supported in this browser.');
  }, [toast]);

  const jumpToError = useCallback(() => {
    if (!error?.line) return;
    if (isMobile) setMobilePane('code');
    window.setTimeout(() => editorRef.current?.goTo(error.line!, error.column), isMobile ? 50 : 0);
  }, [error, isMobile]);

  const onApplyFix = useCallback(
    (fixed: string) => {
      setDialog(null);
      renderImmediately.current = true;
      onCodeChange(fixed);
      toast.success('Fixes applied. Press Ctrl/Cmd+Z in the editor to undo.');
    },
    [onCodeChange, toast],
  );

  const toggleUiTheme = useCallback(() => updatePreferences({ uiTheme: isDark ? 'light' : 'dark' }), [isDark, updatePreferences]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]')) setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // ---------------------------------------------------------------- shortcuts & commands
  useKeyboardShortcuts([
    { combo: 'mod+s', handler: () => void onSave() },
    { combo: 'mod+shift+s', handler: () => setDialog({ kind: 'export' }) },
    { combo: 'mod+o', handler: onOpenFile },
    { combo: 'mod+enter', handler: () => mermaid.renderNow() },
    { combo: 'mod+k', handler: () => setDialog((d) => (d?.kind === 'palette' ? null : { kind: 'palette' })), allowInDialog: true },
    { combo: 'alt+n', handler: onNew },
    { combo: 'mod+b', handler: toggleSidebar },
  ]);

  const commands = useMemo<Command[]>(
    () => [
      { id: 'new', group: 'File', label: 'New Diagram', shortcut: 'alt+n', run: onNew },
      { id: 'open', group: 'File', label: 'Open Diagram (import file)', shortcut: 'mod+o', run: onOpenFile },
      { id: 'paste', group: 'File', label: 'Paste Mermaid or Markdown', run: () => setDialog({ kind: 'paste' }) },
      { id: 'save', group: 'File', label: 'Save', shortcut: 'mod+s', run: () => void onSave() },
      { id: 'recent', group: 'File', label: 'Show Recent Diagrams', run: () => { setSidebarTab('recent'); if (isTablet) setDrawerOpen(true); else updatePreferences({ sidebarOpen: true }); } },
      { id: 'export', group: 'Export', label: 'Export…', shortcut: 'mod+shift+s', run: () => setDialog({ kind: 'export' }) },
      { id: 'export-svg', group: 'Export', label: 'Export SVG', run: () => void quickExport('svg') },
      { id: 'export-png', group: 'Export', label: 'Export PNG (2x)', run: () => void quickExport('png') },
      { id: 'export-jpg', group: 'Export', label: 'Export JPG', run: () => setDialog({ kind: 'export', format: 'jpg' }) },
      { id: 'export-webp', group: 'Export', label: 'Export WebP', run: () => setDialog({ kind: 'export', format: 'webp' }) },
      { id: 'export-md', group: 'Export', label: 'Export Markdown', run: () => void quickExport('markdown') },
      { id: 'export-mmd', group: 'Export', label: 'Export Mermaid source (.mmd)', run: () => void quickExport('mmd') },
      { id: 'export-project', group: 'Export', label: 'Export Project (.himatdiagram)', run: () => void quickExport('project') },
      { id: 'share', group: 'Export', label: 'Copy Share Link…', run: () => setDialog({ kind: 'share' }) },
      { id: 'copy-mermaid', group: 'Clipboard', label: 'Copy Mermaid', run: () => void onCopyMermaid() },
      { id: 'copy-svg', group: 'Clipboard', label: 'Copy SVG', run: () => void onCopySvg() },
      { id: 'copy-image', group: 'Clipboard', label: 'Copy Image (PNG)', run: () => void onCopyImage() },
      { id: 'render', group: 'View', label: 'Render Now', shortcut: 'mod+enter', run: () => mermaid.renderNow() },
      { id: 'fit', group: 'View', label: 'Fit Preview', run: () => previewRef.current?.fit() },
      { id: 'zoom-in', group: 'View', label: 'Zoom In', run: () => previewRef.current?.zoomIn() },
      { id: 'zoom-out', group: 'View', label: 'Zoom Out', run: () => previewRef.current?.zoomOut() },
      { id: 'zoom-reset', group: 'View', label: 'Reset Zoom', run: () => previewRef.current?.reset() },
      { id: 'toggle-theme', group: 'View', label: `Toggle Theme (switch to ${isDark ? 'light' : 'dark'} interface)`, run: toggleUiTheme },
      { id: 'toggle-fullscreen', group: 'View', label: 'Toggle Fullscreen', run: toggleFullscreen },
      { id: 'preview-fullscreen', group: 'View', label: 'Fullscreen Preview', run: () => previewRef.current?.toggleFullscreen() },
      { id: 'toggle-sidebar', group: 'View', label: 'Toggle Sidebar', shortcut: 'mod+b', run: toggleSidebar },
      { id: 'search', group: 'Editor', label: 'Search and Replace in Code', shortcut: 'mod+f', run: () => editorRef.current?.openSearch() },
      { id: 'fix', group: 'Editor', label: 'Fix Syntax…', run: () => setDialog({ kind: 'fix' }) },
      { id: 'settings', group: 'Settings', label: 'Open Settings', run: () => setDialog({ kind: 'settings' }) },
      ...THEMES.map((t) => ({ id: `theme-${t.id}`, group: 'Diagram theme', label: `Diagram theme: ${t.label}`, keywords: 'theme color', run: () => onThemeChange(t.id) })),
      ...DIAGRAM_TYPES.map((t) => ({ id: `type-${t.id}`, group: 'Diagram types', label: `Load ${t.label} template`, keywords: t.keywords.join(' '), run: () => onSelectType(t) })),
      ...TEMPLATES.map((t) => ({ id: `tpl-${t.id}`, group: 'Templates', label: `Template: ${t.name}`, keywords: `${t.category} ${t.description}`, run: () => onSelectTemplate(t) })),
    ],
    [onNew, onOpenFile, onSave, isTablet, updatePreferences, quickExport, onCopyMermaid, onCopySvg, onCopyImage, mermaid, isDark, toggleUiTheme, toggleFullscreen, toggleSidebar, onThemeChange, onSelectType, onSelectTemplate],
  );

  // ---------------------------------------------------------------- render
  if (!diagram) {
    return (
      <div className="boot" role="status">
        <div className="spinner" aria-hidden />
        <p>Loading your diagrams…</p>
      </div>
    );
  }

  const closeDialog = () => setDialog(null);

  return (
    <div className={`app ${isMobile ? 'is-mobile' : ''}`}>
      <Toolbar
        name={diagram.name}
        onRename={(name) => updateDiagram({ name })}
        saveStatus={autosave.status}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        onNew={onNew}
        onOpen={onOpenFile}
        onSave={() => void onSave()}
        onExport={() => setDialog({ kind: 'export' })}
        onShare={() => setDialog({ kind: 'share' })}
        onSettings={() => setDialog({ kind: 'settings' })}
        onCommandPalette={() => setDialog({ kind: 'palette' })}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        theme={theme}
        onThemeChange={onThemeChange}
        uiTheme={preferences.uiTheme}
        onUiThemeChange={(uiTheme) => updatePreferences({ uiTheme })}
      />

      <div className="main">
        <Sidebar
          open={sidebarOpen}
          isDrawer={isTablet}
          tab={sidebarTab}
          onTabChange={setSidebarTab}
          onClose={() => setDrawerOpen(false)}
          onImport={onOpenFile}
          onPaste={() => setDialog({ kind: 'paste' })}
          recentCount={library.diagrams.length}
        >
          {{
            types: <DiagramTypeList activeType={diagram.type} onSelect={onSelectType} />,
            templates: <TemplateList onSelect={onSelectTemplate} />,
            recent: (
              <RecentDiagrams
                diagrams={library.diagrams}
                activeId={diagram.id}
                loading={library.loading}
                error={library.error}
                onOpen={(id) => void onOpenRecent(id)}
                onRename={(id, name) => void onRenameFromList(id, name)}
                onDuplicate={(id) => void onDuplicate(id)}
                onDelete={(d) => setDialog({ kind: 'delete', diagram: d })}
                onExport={(id) => void onExportProjectFromList(id)}
              />
            ),
          }}
        </Sidebar>

        <main className="content" id="main">
          <Workspace
            stacked={isMobile}
            mobilePane={mobilePane}
            onMobilePaneChange={setMobilePane}
            editor={
              <EditorPanel
                ref={editorRef}
                code={code}
                type={diagram.type}
                onChange={onCodeChange}
                dark={isDark}
                fontSize={preferences.editorFontSize}
                wordWrap={preferences.editorWordWrap}
                onToggleWordWrap={() => updatePreferences({ editorWordWrap: !preferences.editorWordWrap })}
                onCopy={() => void onCopyMermaid()}
                errorLine={error?.line}
              />
            }
            preview={
              <ErrorBoundary area="Preview">
                <PreviewPanel
                  ref={previewRef}
                  svg={mermaid.svg}
                  error={error}
                  status={mermaid.status}
                  isStale={mermaid.isStale}
                  durationMs={mermaid.durationMs}
                  diagramId={diagram.id}
                  background={config.background}
                  backgroundColor={previewBackground}
                  defaultScale={preferences.previewScale}
                  fixCount={fixCount}
                  onRefresh={mermaid.renderNow}
                  onJumpToError={jumpToError}
                  onFixSyntax={() => setDialog({ kind: 'fix' })}
                  onBackgroundChange={(bg: PreviewBackground) => onConfigChange({ background: bg })}
                />
              </ErrorBoundary>
            }
          />
        </main>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept={IMPORT_EXTENSIONS.join(',')}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length) void importFiles(files);
        }}
      />
      <DropOverlay onDropFiles={(files) => void importFiles(files)} />

      <Suspense fallback={null}>
        {dialog?.kind === 'export' && exportSource && (
          <ExportDialog open onClose={closeDialog} source={exportSource} initialFormat={dialog.format} defaultMetadata={preferences.svgMetadata} hasError={!!error} />
        )}
        {dialog?.kind === 'share' && <ShareDialog open onClose={closeDialog} diagram={diagram} />}
        {dialog?.kind === 'settings' && (
          <SettingsDialog
            open
            onClose={closeDialog}
            theme={theme}
            config={config}
            diagramType={diagram.type}
            direction={direction}
            preferences={preferences}
            onThemeChange={onThemeChange}
            onConfigChange={onConfigChange}
            onDirectionChange={onDirectionChange}
            onPreferencesChange={updatePreferences}
            onResetConfig={() => {
              updateDiagram({ config: { ...DEFAULT_CONFIG }, theme: 'default' });
              toast.info('Diagram settings reset');
            }}
          />
        )}
        {dialog?.kind === 'paste' && <PasteDialog open onClose={closeDialog} onImport={(text) => void onPasteImport(text)} />}
        {dialog?.kind === 'blocks' && (
          <MarkdownBlockPicker
            open
            fileName={dialog.fileName}
            blocks={dialog.blocks}
            onClose={closeDialog}
            onSelect={(block) => {
              const base = dialog.fileName.replace(/\.[^.]+$/, '');
              closeDialog();
              void createAndOpen({ name: block.title.startsWith('Diagram ') ? `${base} – ${block.title}` : block.title, code: block.code });
              toast.success(`Imported diagram ${block.index} from ${dialog.fileName}`);
            }}
          />
        )}
        {dialog?.kind === 'fix' && <FixSyntaxDialog open code={code} onApply={onApplyFix} onClose={closeDialog} />}
        {dialog?.kind === 'palette' && <CommandPalette open onClose={closeDialog} commands={commands} />}
      </Suspense>

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title="Delete diagram?"
        message={dialog?.kind === 'delete' ? `“${dialog.diagram.name}” will be permanently removed from this browser.` : ''}
        confirmLabel="Delete"
        danger
        onCancel={closeDialog}
        onConfirm={() => dialog?.kind === 'delete' && void onConfirmDelete(dialog.diagram)}
      />
    </div>
  );
}
