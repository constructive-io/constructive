/**
 * Selection: the layer between analysis and rendering.
 *
 * A `Report` is what the audit found — pure data, the same for everybody. A
 * `ReportView` is what one reader should see: which planes, which dimensions,
 * which sections, how much detail. Renderers consume the view and decide only
 * how it *looks*, so "the team wants the perf score and their direct-role
 * planes in the PR comment" is answered once here, rather than four times in
 * four renderers that drift apart.
 */

import type { ReportConfig } from '../config/types';
import type { Finding, PlaneReport, Report } from '../types';
import type { ScoreDelta } from './compare';

export type ViewSection =
  | 'scores'
  | 'delta'
  | 'findings'
  | 'planes'
  | 'role-access'
  | 'call-graph';

export const ALL_SECTIONS: ViewSection[] = [
  'scores',
  'delta',
  'findings',
  'planes',
  'role-access',
  'call-graph'
];

export type ViewDimension = 'security' | 'perf';

export interface ViewConfig {
  /**
   * Planes to render in full, by name or glob (`*`, `direct:*`). The primary
   * plane is always included. Default: primary only — secondaries are
   * summarized, not expanded.
   */
  planes?: string[];
  /** Dimensions to render. Default: whatever the report has. */
  dimensions?: ViewDimension[];
  /** Sections to render. Default: all of them the report has data for. */
  sections?: ViewSection[];
  /** How much of each section. Default `normal`. */
  detail?: 'summary' | 'normal' | 'verbose';
  /** Drop findings that are not on the primary surface entirely. */
  exposedOnly?: boolean;
}

/** One score to render, with the delta that belongs to it. */
export interface ViewScore {
  /** `security`, `perf`, or `plane:<name>`. */
  id: string;
  label: string;
  dimension: ViewDimension;
  score: import('../score/score').Score;
  /** Present for the primary security/perf scores when the run was compared. */
  delta?: ScoreDelta;
  /** The plane this score describes, when it is not the headline. */
  plane?: PlaneReport;
}

export interface ViewFindings {
  /** Reachable on the primary surface — the scored ones. */
  exposed: Finding[];
  /** Off the primary surface: reported, unscored. */
  internal: Finding[];
}

export interface ReportView {
  report: Report;
  detail: 'summary' | 'normal' | 'verbose';
  /** Headline scores, in render order. */
  scores: ViewScore[];
  /** Secondary planes to mention. Expanded ones are in `expandedPlanes`. */
  planes: PlaneReport[];
  /** Planes the view config asked to see in full. */
  expandedPlanes: PlaneReport[];
  security: ViewFindings;
  perf?: ViewFindings;
  has(section: ViewSection): boolean;
}

/** Glob match over plane names: `*` matches any run of characters. */
export function matchPlane(pattern: string, name: string): boolean {
  if (pattern === name) return true;
  const rx = new RegExp(
    `^${pattern.split('*').map(escapeRegExp).join('.*')}$`
  );
  return rx.test(name);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Everything presentation-adjacent about a report, decided once.
 *
 * Selection never edits the report: `exposedOnly` narrows what the view
 * exposes, and the underlying `report.findings` stays whole so a JSON dump
 * beside a pretty print is still the full picture.
 */
export function selectView(report: Report, config: ViewConfig = {}): ReportView {
  const detail = config.detail ?? 'normal';
  const dimensions = new Set<ViewDimension>(
    config.dimensions ?? (['security', 'perf'] as ViewDimension[])
  );
  const sections = new Set<ViewSection>(config.sections ?? ALL_SECTIONS);

  const scores: ViewScore[] = [];
  if (report.score && dimensions.has('security')) {
    scores.push({
      id: 'security',
      label: 'Security',
      dimension: 'security',
      score: report.score,
      ...(report.comparison?.security ? { delta: report.comparison.security } : {})
    });
  }
  if (report.perf && dimensions.has('perf')) {
    scores.push({
      id: 'perf',
      label: 'Performance',
      dimension: 'perf',
      score: report.perf.score,
      ...(report.comparison?.perf ? { delta: report.comparison.perf } : {})
    });
  }

  const secondary = (report.planes ?? []).filter((p) => !p.primary);
  const patterns = config.planes ?? [];
  const expandedPlanes = secondary.filter((p) => patterns.some((q) => matchPlane(q, p.name)));
  for (const plane of expandedPlanes) {
    if (plane.skipped) continue;
    scores.push({
      id: `plane:${plane.name}`,
      label: plane.name,
      dimension: 'security',
      score: plane.score,
      plane
    });
  }

  const securityAll = report.perf
    ? report.findings.filter((f) => f.dimension !== 'perf')
    : report.findings;

  return {
    report,
    detail,
    scores,
    planes: secondary,
    expandedPlanes,
    security: partition(securityAll, config),
    ...(report.perf && dimensions.has('perf')
      ? { perf: partition(report.perf.findings, config) }
      : {}),
    has(section: ViewSection): boolean {
      if (!sections.has(section)) return false;
      switch (section) {
      case 'delta':
        return report.comparison != null;
      case 'planes':
        return secondary.length > 0;
      case 'role-access':
        return (report.roleAccess?.roles.length ?? 0) > 0;
      case 'call-graph':
        return report.callGraph != null || report.callGraphDiff != null;
      case 'findings':
        return detail !== 'summary';
      default:
        return true;
      }
    }
  };
}

function partition(findings: Finding[], config: ViewConfig): ViewFindings {
  const exposed = findings.filter((f) => f.exposed !== false);
  return {
    exposed,
    internal: config.exposedOnly ? [] : findings.filter((f) => f.exposed === false)
  };
}

/** The config-file half of a view: `report.planes` / `report.dimensions`. */
export function viewConfigFromReportConfig(config: ReportConfig | undefined): ViewConfig {
  if (!config) return {};
  return {
    ...(config.planes ? { planes: config.planes } : {}),
    ...(config.dimensions ? { dimensions: config.dimensions } : {})
  };
}
