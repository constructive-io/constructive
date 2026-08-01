import yanse from 'yanse';

import type { Score } from '../score/score';
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
    lines.push(...scoreLines('score', score, colorEnabled));
    lines.push('');
  }

  if (report.perf) {
    lines.push(...scoreLines('perf score', report.perf.score, colorEnabled));
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

  // Perf findings render in their own section so the two dimensions never
  // read as one list.
  const security = report.perf ? findings.filter((f) => f.dimension !== 'perf') : findings;
  const exposed = security.filter((f) => f.exposed !== false);
  const internal = security.filter((f) => f.exposed === false);

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

  if (security.length === 0) {
    lines.push('no findings.');
  }

  if (report.perf?.diff) {
    const { added, removed, accepted } = report.perf.diff;
    lines.push('', 'performance vs baseline:', '');
    if (added.length === 0) {
      lines.push(`no new perf debt (${accepted.length} accepted, ${removed.length} fixed).`);
    } else {
      lines.push(
        paint('high', `${added.length} new perf finding${added.length === 1 ? '' : 's'} since the baseline:`)
      );
      for (const f of added) lines.push(renderFinding(f, paint));
      lines.push(paint('info', `  (${accepted.length} accepted, ${removed.length} fixed)`));
    }
    if (removed.length > 0) {
      lines.push(
        paint('info', `  fixed since the baseline: ${removed.map((r) => `${r.code} ${r.schema}.${r.table}`).join(', ')} — re-baseline to lock the win in`)
      );
    }
  }

  if (report.perf) {
    const perfExposed = report.perf.findings.filter((f) => f.exposed !== false);
    const perfInternal = report.perf.findings.length - perfExposed.length;
    lines.push('', 'performance (index hygiene) — scored separately from security:', '');
    if (perfExposed.length === 0) {
      lines.push('no perf findings.');
    } else {
      for (const f of perfExposed) lines.push(renderFinding(f, paint));
    }
    if (perfInternal > 0 && !options.verbose) {
      lines.push(
        paint('info', `  (${perfInternal} internal perf advisor${perfInternal === 1 ? 'y' : 'ies'} excluded from the perf score)`)
      );
    } else if (perfInternal > 0) {
      for (const f of report.perf.findings.filter((f) => f.exposed === false)) {
        lines.push(renderFinding(f, paint));
      }
    }

    const { paths, stats, explain } = report.perf;
    if (paths && paths.writeOnceShaped > 0) {
      const acted = { report: 'reported', demote: 'demoted to info', suppress: 'suppressed' }[
        paths.onWriteOncePointer
      ];
      lines.push(
        paint(
          'info',
          `  access paths: ${paths.total} foreign keys — ${paths.read} read by a policy or view, `
            + `${paths.writeOnceShaped} on ${paths.tables} tables write-once shaped (X1 ${acted})`
        )
      );
    }
    if (stats) {
      lines.push(
        paint(
          'info',
          `  runtime statistics: ${stats.tables} tables, counters since ${stats.statsReset ?? 'server start'}`
            + `${stats.scored ? '' : ' (S* findings advisory — perf.scoring.includeStats is false)'}`
        )
      );
      for (const note of stats.notes ?? []) lines.push(paint('info', `  ${note}`));
    }
    if (explain) {
      lines.push(
        paint(
          'info',
          explain.unavailable
            ?? `  planner proof: ${explain.confirmed} confirmed, ${explain.refuted} refuted, ${explain.inconclusive} inconclusive of ${explain.probed} probed`
        )
      );
    }
  }

  if (report.callGraph) {
    lines.push('', renderCallGraph(report.callGraph, { color: colorEnabled }));
  }
  if (report.callGraphDiff) {
    lines.push('', renderCallGraphDiff(report.callGraphDiff, { color: colorEnabled }));
  }

  return lines.join('\n');
}

function scoreLines(label: string, score: Score, colorEnabled: boolean): string[] {
  const gradePaint: (s: string) => string = colorEnabled
    ? score.grade.startsWith('A')
      ? yanse.green
      : score.grade === 'B' || score.grade === 'C'
        ? yanse.yellow
        : yanse.red
    : noop;
  const capNote = score.cappedByUnknownExposure ? '  (capped: exposure unknown)' : '';
  const lines = [
    `${label}: ${gradePaint(`${score.value} (${score.grade})`)}  — model: ${score.model}${capNote}`
  ];
  const scored = score.deductions.filter((d) => !d.unscored);
  const top = scored.slice(0, 3);
  if (top.length > 0) {
    lines.push(
      `  top deductions: ${top.map((d) => `${d.code} −${d.points} (×${d.count})`).join('  ')}`
    );
    // Payoff, not points: what the score becomes if the rule goes to zero.
    lines.push(
      `  by rule: ${scored
        .map((d) => `${d.code} ${d.grade} (+${d.potential.toFixed(1)})`)
        .join('  ')}`
    );
  }
  const unscored = score.deductions.filter((d) => d.unscored);
  if (unscored.length > 0) {
    lines.push(
      `  unscored: ${unscored.map((d) => `${d.code} (×${d.count})`).join('  ')}`
        + '  — zero-weight, fixing these cannot move the score'
    );
  }
  return lines;
}

function renderFinding(f: Finding, paint: (sev: Severity, s: string) => string): string {
  const label = paint(f.severity, SEV_LABEL[f.severity]);
  const loc = [f.schema, f.table].filter(Boolean).join('.') + (f.policy ? `  (${f.policy})` : '');
  const head = `[${label}] ${f.code}  ${loc}`;
  const body = `    ${f.message}`;
  const hint = f.hint ? `    hint: ${f.hint}` : '';
  const evidence = f.evidence
    ? `    plan (${f.evidence.status}): ${f.evidence.plan}${f.evidence.note ? ` — ${f.evidence.note}` : ''}`
    : '';
  return [head, body, hint, evidence].filter(Boolean).join('\n');
}
