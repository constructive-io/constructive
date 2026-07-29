import yanse from 'yanse';

import type { Finding, Report, Severity } from '../types';
import { renderCallGraph, renderCallGraphDiff } from './callgraph';

const SEV_LABEL: Record<Severity, string> = {
  critical: 'CRIT',
  high: 'HIGH',
  medium: 'MED ',
  low: 'LOW ',
  info: 'INFO'
};

type Painter = (s: string) => string;
const SEV_PAINT: Record<Severity, Painter> = {
  critical: (s) => yanse.bold(yanse.red(s)),
  high: yanse.red,
  medium: yanse.yellow,
  low: yanse.cyan,
  info: yanse.gray
};

const noop: Painter = (s) => s;

export interface RenderPrettyOptions {
  color?: boolean;
  /** Only render the exposure line, score, and severity summary — no per-finding lines. */
  summary?: boolean;
  /** Expand the internal (non-exposed) advisories instead of collapsing them to a count. */
  verbose?: boolean;
}

export function renderPretty(report: Report, options: RenderPrettyOptions = {}): string {
  const colorEnabled = options.color ?? process.stdout.isTTY === true;
  const paint = (sev: Severity, s: string) => (colorEnabled ? SEV_PAINT[sev](s) : noop(s));

  const { summary: s, findings, score, exposure } = report;
  const lines: string[] = [
    `safegres ${report.version}  (${report.generatedAt})`,
    ''
  ];

  if (exposure) {
    if (exposure.known) {
      lines.push(
        `exposure: ${exposure.schemas.length} schema(s) via ${exposure.source}`
          + `  — ${exposure.exposedTables}/${exposure.totalTables} tables exposed`
      );
      if (exposure.roles && exposure.roles.length > 0) {
        lines.push(`  api roles: ${exposure.roles.join(', ')}`);
      }
    } else {
      lines.push(
        paint('medium', 'exposure: unknown — entire database assumed reachable (score capped)')
      );
    }
    lines.push('');
  }

  if (score) {
    const gradePaint: (s: string) => string = colorEnabled
      ? score.grade.startsWith('A')
        ? yanse.green
        : score.grade === 'B' || score.grade === 'C'
          ? yanse.yellow
          : yanse.red
      : noop;
    const capNote = score.cappedByUnknownExposure ? '  (capped: exposure unknown)' : '';
    lines.push(`score: ${gradePaint(`${score.value} (${score.grade})`)}  — model: ${score.model}${capNote}`);
    const top = score.deductions.slice(0, 3);
    if (top.length > 0) {
      lines.push(
        `  top deductions: ${top.map((d) => `${d.code} −${d.points} (×${d.count})`).join('  ')}`
      );
    }
    lines.push('');
  }

  lines.push(
    `summary: ${paint('critical', String(s.critical))} critical  `
      + `${paint('high', String(s.high))} high  `
      + `${paint('medium', String(s.medium))} medium  `
      + `${paint('low', String(s.low))} low  `
      + `${paint('info', String(s.info))} info`
  );

  // --summary: score + counts only, no per-finding lines.
  if (options.summary) {
    if (report.callGraph) {
      lines.push('', renderCallGraph(report.callGraph, { color: colorEnabled, summary: true }));
    }
    if (report.callGraphDiff) {
      lines.push('', renderCallGraphDiff(report.callGraphDiff, { color: colorEnabled }));
    }
    return lines.join('\n');
  }
  lines.push('');

  const exposed = findings.filter((f) => f.exposed !== false);
  const internal = findings.filter((f) => f.exposed === false);

  for (const f of exposed) {
    lines.push(renderFinding(f, paint));
  }

  if (internal.length > 0) {
    // Collapse internal advisories to a count by default; --verbose lists them.
    if (options.verbose) {
      lines.push(
        '',
        `internal advisories (${internal.length}) — not exposed via any API, excluded from the score:`,
        ''
      );
      for (const f of internal) {
        lines.push(renderFinding(f, paint));
      }
    } else {
      lines.push(
        '',
        paint(
          'info',
          `internal advisories (${internal.length}) — not exposed via any API, `
            + 'excluded from the score; run with --verbose to list.'
        )
      );
    }
  }

  if (findings.length === 0) {
    lines.push('no findings.');
  }

  if (report.callGraph) {
    lines.push('', renderCallGraph(report.callGraph, { color: colorEnabled }));
  }
  if (report.callGraphDiff) {
    lines.push('', renderCallGraphDiff(report.callGraphDiff, { color: colorEnabled }));
  }

  return lines.join('\n');
}

function renderFinding(f: Finding, paint: (sev: Severity, s: string) => string): string {
  const label = paint(f.severity, SEV_LABEL[f.severity]);
  const loc = [f.schema, f.table].filter(Boolean).join('.') + (f.policy ? `  (${f.policy})` : '');
  const head = `[${label}] ${f.code}  ${loc}`;
  const body = `    ${f.message}`;
  const hint = f.hint ? `    hint: ${f.hint}` : '';
  return [head, body, hint].filter(Boolean).join('\n');
}
