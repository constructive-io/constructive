/**
 * Markdown rendering (`--format markdown`), for the places CI reads a report:
 * a GitHub job summary (`$GITHUB_STEP_SUMMARY`) or a PR comment.
 *
 * The pretty renderer is a terminal artifact — ANSI colors, fixed-width
 * severity labels, a long scrollable list. A PR comment is read once, by
 * someone deciding whether to look further, so this renders the same report
 * as tables: scores first, then findings grouped by rule, with the noisy
 * parts (internal advisories, accepted debt) collapsed into `<details>`.
 */

import type { Score } from '../score/score';
import type { Finding, Report, Severity } from '../types';
import { formatDelta, type ReportComparison, type ScoreDelta } from './compare';

const SEV_ICON: Record<Severity, string> = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
  info: '⚪'
};

export interface RenderMarkdownOptions {
  /** Scores and counts only — no per-finding tables. */
  summary?: boolean;
  /** Expand internal (non-exposed) advisories instead of collapsing them. */
  verbose?: boolean;
  /** Heading text. Default `safegres`. */
  title?: string;
}

export function renderMarkdown(report: Report, options: RenderMarkdownOptions = {}): string {
  const out: string[] = [`## ${options.title ?? 'safegres'}`, ''];

  out.push(...scoreTable(report, options), '');

  if (report.exposure) {
    const { known, source, exposedTables, totalTables, roles } = report.exposure;
    out.push(
      known
        ? `Exposure (${source}): **${exposedTables}/${totalTables}** tables reachable`
          + `${roles && roles.length > 0 ? ` via \`${roles.join('`, `')}\`` : ''}.`
        : '> [!WARNING]\n> Exposure unknown — the entire database is assumed reachable and the score is capped.',
      ''
    );
  }

  out.push(countsTable(report), '');

  if (report.comparison) out.push(...comparisonSection(report.comparison), '');

  if (options.summary) return out.join('\n');

  const security = report.perf
    ? report.findings.filter((f) => f.dimension !== 'perf')
    : report.findings;
  out.push(...findingSection('Security findings', security, options), '');

  if (report.perf) {
    out.push(...findingSection('Performance findings', report.perf.findings, options));
    const { stats, explain, diff } = report.perf;
    const notes: string[] = [];
    if (stats) {
      notes.push(
        `Runtime statistics: ${stats.tables} tables, counters since ${stats.statsReset ?? 'server start'}`
          + `${stats.scored ? '' : ' (advisory — `includeStats` is false)'}.`
      );
      for (const note of stats.notes ?? []) notes.push(note);
    }
    if (explain) {
      notes.push(
        explain.unavailable
          ?? `Planner proof: ${explain.confirmed} confirmed, ${explain.refuted} refuted, `
            + `${explain.inconclusive} inconclusive of ${explain.probed} probed.`
      );
    }
    if (notes.length > 0) out.push('', notes.map((n) => `_${n}_`).join('  \n'));

    if (diff) {
      out.push('', '### Performance vs baseline', '');
      out.push(
        diff.added.length === 0
          ? `No new perf debt (${diff.accepted.length} accepted, ${diff.removed.length} fixed).`
          : `**${diff.added.length} new** since the baseline `
            + `(${diff.accepted.length} accepted, ${diff.removed.length} fixed):`
      );
      if (diff.added.length > 0) out.push('', findingTable(diff.added));
    }
    out.push('');
  }

  return out.join('\n');
}

function scoreTable(report: Report, options: RenderMarkdownOptions): string[] {
  const cmp = report.comparison;
  const rows: string[] = [];
  if (report.score) rows.push(scoreRow('Security', report.score, !!cmp, cmp?.security));
  if (report.perf) rows.push(scoreRow('Performance', report.perf.score, !!cmp, cmp?.perf));
  if (rows.length === 0) return [];
  const deltaHeader = cmp ? ` Δ vs ${cmp.previous.ref ?? 'previous run'} |` : '';
  return [
    `| Dimension | Score | Grade |${deltaHeader} Top deductions |`,
    `| --- | --- | --- |${cmp ? ' --- |' : ''} --- |`,
    ...rows,
    '',
    ...ruleTable('Security', report.score, options),
    ...ruleTable('Performance', report.perf?.score, options)
  ];
}

function scoreRow(label: string, score: Score, compared: boolean, delta?: ScoreDelta): string {
  const top = score.deductions
    .filter((d) => !d.unscored)
    .slice(0, 3)
    .map((d) => `\`${d.code}\` −${d.points} (×${d.count})`)
    .join(', ');
  const capped = score.cappedByUnknownExposure ? ' (capped)' : '';
  // The column exists for the whole table or not at all: a dimension the
  // previous run didn't have still needs its cell.
  const deltaCell = compared ? ` ${delta ? scoreDeltaCell(delta) : '— (new)'} |` : '';
  return `| ${label} | **${score.value}**${capped} | **${score.grade}** |${deltaCell} ${top || '—'} |`;
}

/**
 * The movement, made legible at a glance: an arrow for the direction, the
 * grade transition when it crossed a band, and the finding count either way —
 * a score can hold still while findings move underneath it.
 */
function scoreDeltaCell(d: ScoreDelta): string {
  const arrow = d.delta > 0 ? '🟢 ▲' : d.delta < 0 ? '🔴 ▼' : '⚪';
  const score = d.delta === 0 ? 'no change' : `${formatDelta(d.delta, 1)} (from ${d.before})`;
  const grade = d.gradeBefore === d.gradeAfter ? '' : ` · ${d.gradeBefore} → ${d.gradeAfter}`;
  const findings =
    d.findingsAfter === d.findingsBefore
      ? ''
      : ` · ${d.findingsBefore} → ${d.findingsAfter} findings`;
  return `${arrow} ${score}${grade}${findings}`;
}

/**
 * Rendered after the counts so the two tables can be read together: what the
 * numbers are, then which way they moved.
 */
function comparisonSection(cmp: ReportComparison): string[] {
  const since = cmp.previous.ref ?? cmp.previous.generatedAt ?? 'the previous run';
  if (cmp.unchanged) return ['', `_No change since ${since}._`];

  const out = ['', `<details open><summary>Changes since ${since}</summary>`, ''];

  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
  const moved = severities.filter((sev) => cmp.summary[sev].delta !== 0);
  if (moved.length > 0) {
    out.push(
      `| ${moved.map((sev) => `${SEV_ICON[sev]} ${sev}`).join(' | ')} |`,
      `| ${moved.map(() => '---').join(' | ')} |`,
      `| ${moved
        .map((sev) => {
          const s = cmp.summary[sev];
          return `${s.before} → **${s.after}** (${formatDelta(s.delta)})`;
        })
        .join(' | ')} |`,
      ''
    );
  }

  if (cmp.rules.length > 0) {
    out.push(
      '| Rule | Dimension | Before | After | Δ |',
      '| --- | --- | ---: | ---: | --- |',
      ...cmp.rules.map(
        (r) =>
          `| \`${r.code}\` | ${r.dimension} | ${r.before} | ${r.after} | `
          + `${r.delta > 0 ? '🔴 ▲' : '🟢 ▼'} ${formatDelta(r.delta)} |`
      ),
      ''
    );
  }

  out.push('</details>');
  return out;
}

/**
 * Per-rule breakdown. `Payoff` is what the dimension score becomes if that
 * rule alone goes to zero — the number worth ranking work by, and not
 * proportional to the finding count, because the curve is exponential.
 */
function ruleTable(label: string, score: Score | undefined, options: RenderMarkdownOptions): string[] {
  if (!score || score.deductions.length === 0) return [];
  const table = [
    '| Rule | Findings | Points | Grade | Payoff |',
    '| --- | ---: | ---: | --- | ---: |',
    ...score.deductions.map((d) =>
      d.unscored
        ? `| \`${d.code}\` | ${d.count} | — | — | *unscored* |`
        : `| \`${d.code}\` | ${d.count} | −${d.points} | **${d.grade}** | +${d.potential.toFixed(1)} |`
    )
  ];
  return options.verbose
    ? [`### ${label} by rule`, '', ...table, '']
    : [`<details><summary>${label} by rule</summary>`, '', ...table, '', '</details>', ''];
}

function countsTable(report: Report): string {
  const s = report.summary;
  return [
    '| 🔴 critical | 🟠 high | 🟡 medium | 🔵 low | ⚪ info |',
    '| --- | --- | --- | --- | --- |',
    `| ${s.critical} | ${s.high} | ${s.medium} | ${s.low} | ${s.info} |`
  ].join('\n');
}

function findingSection(
  heading: string,
  findings: Finding[],
  options: RenderMarkdownOptions
): string[] {
  const out = [`### ${heading}`, ''];
  const exposed = findings.filter((f) => f.exposed !== false);
  const internal = findings.filter((f) => f.exposed === false);

  if (exposed.length === 0) out.push('No findings.');
  else out.push(findingTable(exposed));

  if (internal.length > 0) {
    const table = findingTable(internal);
    out.push(
      '',
      options.verbose
        ? table
        : `<details><summary>${internal.length} internal `
          + `advisor${internal.length === 1 ? 'y' : 'ies'} — not exposed via any API, `
          + `excluded from the score</summary>\n\n${table}\n\n</details>`
    );
  }
  return out;
}

function findingTable(findings: Array<Pick<Finding, 'code' | 'severity' | 'schema' | 'table' | 'policy' | 'message'>>): string {
  const rows = findings.map((f) => {
    const where = [f.schema, f.table].filter(Boolean).join('.') || '—';
    const policy = f.policy ? ` \`${f.policy}\`` : '';
    return `| ${SEV_ICON[f.severity]} ${f.severity} | \`${f.code}\` | ${where}${policy} | ${escapeCell(f.message)} |`;
  });
  return ['| Severity | Rule | Relation | Finding |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

/** Keep a message inside its table cell: no pipes, no line breaks. */
function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
}
