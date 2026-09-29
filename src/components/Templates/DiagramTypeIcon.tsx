import {
  ArrowLeftRight,
  Blend,
  Boxes,
  Brain,
  Building2,
  ChartColumn,
  ChartGantt,
  ChartPie,
  ClipboardCheck,
  Cloud,
  Database,
  FileCode,
  Fish,
  FolderTree,
  GitBranch,
  Grid2x2,
  History,
  LayoutGrid,
  Radar,
  Route,
  Shapes,
  SquareKanban,
  Waves,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { memo } from 'react';
import type { DiagramTypeId } from '../../types/diagram';

const ICONS: Partial<Record<DiagramTypeId, LucideIcon>> = {
  flowchart: Workflow,
  sequence: ArrowLeftRight,
  class: Boxes,
  state: Shapes,
  er: Database,
  journey: Route,
  gantt: ChartGantt,
  pie: ChartPie,
  gitGraph: GitBranch,
  mindmap: Brain,
  timeline: History,
  quadrant: Grid2x2,
  requirement: ClipboardCheck,
  c4: Building2,
  architecture: Cloud,
  sankey: Waves,
  xychart: ChartColumn,
  block: LayoutGrid,
  kanban: SquareKanban,
  treeView: FolderTree,
  venn: Blend,
  radar: Radar,
  ishikawa: Fish,
};

export const DiagramTypeIcon = memo(function DiagramTypeIcon({ type, size = 16 }: { type: DiagramTypeId; size?: number }) {
  const Icon = ICONS[type] ?? FileCode;
  return <Icon size={size} aria-hidden />;
});
