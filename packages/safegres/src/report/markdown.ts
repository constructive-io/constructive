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

  out.push(...scoreTable(report), '');

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
  if (options.summary) return out.join('\n');

  const security = report.perf
    ? report.findings.filter((f) => f.dimension !== 'perf')
    : report.findings;
  out.push(...findingSection('Security findings', security, options), '');

  if (report.perf) {
    out.push(...findingSection('Performance findings', report.perf.findings, options));
    const { paths, stats, explain, diff } = report.perf;
    const notes: string[] = [];
    if (paths && paths.cold > 0) {
      notes.push(
        `Access paths: ${paths.cold} of ${paths.total} foreign keys across ${paths.tables} `
          + 'provisioning-config tables are written once and read by nothing, so X1 does not '
          + 'ask for an index on them (`perf.paths.infer: false` to disable).'
      );
    }
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

function scoreTable(report: Report): string[] {
  const rows: string[] = [];
  if (report.score) rows.push(scoreRow('Security', report.score));
  if (report.perf) rows.push(scoreRow('Performance', report.perf.score));
  if (rows.length === 0) return [];
  return ['| Dimension | Score | Grade | Top deductions |', '| --- | --- | --- | --- |', ...rows];
}

function scoreRow(label: string, score: Score): string {
  const top = score.deductions
    .slice(0, 3)
    .map((d) => `\`${d.code}\` −${d.points} (×${d.count})`)
    .join(', ');
  const capped = score.cappedByUnknownExposure ? ' (capped)' : '';
  return `| ${label} | **${score.value}**${capped} | **${score.grade}** | ${top || '—'} |`;
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
