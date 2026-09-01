/**
 * GitHub Actions output: job summary, workflow annotations, and a sticky PR
 * comment.
 *
 * This is a *renderer*, not a second audit — everything here reads the same
 * `ReportView` the terminal renderer reads, so what CI says and what a
 * developer sees locally cannot disagree.
 *
 * On color: GitHub Markdown has none. The only way to get a real green/red
 * score is an image, so scores render as shields.io badges by default, with
 * 🟢/🟡/🔴 as the offline fallback (`report.github.badges: false`).
 */

import * as fs from 'fs';

import type { GithubReportConfig } from '../config/types';
import type { Grade } from '../config/types';
import type { Score } from '../score/score';
import type { Finding, Report } from '../types';
import { describeBaseline } from './compare';
import { renderMarkdown } from './markdown';
import { matchPlane, selectView, type ViewConfig, type ViewScore } from './view';

/** Marker that makes the PR comment sticky: one comment, edited in place. */
export const COMMENT_MARKER = '<!-- safegres-report -->';

const GRADE_COLOR: Record<string, string> = {
  'A+': 'brightgreen',
  A: 'brightgreen',
  B: 'green',
  C: 'yellow',
  D: 'orange',
  F: 'red'
};

const GRADE_DOT: Record<string, string> = {
  'A+': '🟢',
  A: '🟢',
  B: '🟢',
  C: '🟡',
  D: '🟠',
  F: '🔴'
};

export interface GithubRenderOptions {
  config?: GithubReportConfig;
  /** Findings that tripped a gate, for `annotations: 'gate-failures'`. */
  gateFailures?: Finding[];
  /** Extra view selection (planes, dimensions) from `report` config. */
  view?: ViewConfig;
}

/** A score as a shields.io badge, or as a colored dot when badges are off. */
export function scoreBadge(label: string, score: Score, badges: boolean): string {
  const color = GRADE_COLOR[score.grade] ?? 'lightgrey';
  if (!badges) return `${GRADE_DOT[score.grade] ?? '⚪'} **${label} ${score.value} (${score.grade})**`;
  const text = encodeURIComponent(`${score.value} (${score.grade})`);
  const name = encodeURIComponent(label);
  return `![${label} ${score.value} ${score.grade}](https://img.shields.io/badge/${name}-${text}-${color})`;
}

export function gradeBadge(label: string, grade: Grade, badges: boolean): string {
  const color = GRADE_COLOR[grade] ?? 'lightgrey';
  if (!badges) return `${GRADE_DOT[grade] ?? '⚪'} **${label} ${grade}**`;
  return `![${label} ${grade}](https://img.shields.io/badge/${encodeURIComponent(label)}-${grade}-${color})`;
}

/**
 * The job summary: the badges a reviewer reads first, then the full markdown
 * report. `summary` picks which scores get a badge — `security`, `perf`, and
 * `planes:<glob>` for the secondary planes a team cares about.
 */
export function renderGithubSummary(report: Report, options: GithubRenderOptions = {}): string {
  const config = options.config ?? {};
  const badges = config.badges !== false;
  const selectors = config.summary ?? ['security', 'perf'];
  const viewConfig: ViewConfig = {
    planes: planePatterns(selectors),
    ...(config.detail ? { detail: config.detail } : {}),
    ...options.view
  };
  const view = selectView(report, viewConfig);

  const out: string[] = [];
  const line = selectedScores(view.scores, selectors)
    .map((s) => scoreBadge(s.label, s.score, badges))
    .join(' ');
  if (line) out.push(line, '');

  out.push(renderMarkdown(report, { view: viewConfig }));
  return out.join('\n');
}

/**
 * GitHub rejects an issue comment body over 65536 characters, and a comment
 * that fails to post is worse than a short one — so a comment carrying the
 * report degrades (verbose → normal → summary → a pointer at the job summary)
 * rather than being truncated at a byte boundary by the API.
 */
export const COMMENT_MAX_CHARS = 65536;

/**
 * The sticky PR comment: shorter than the summary by default. A comment is read
 * on the way past, so out of the box it carries the scores, the movement, and
 * what is new, with the full finding tables in the job summary and the SARIF
 * alerts.
 *
 * `comment.sections` chooses what it says. `report` puts the whole markdown
 * report in the comment at `comment.detail` (default `summary`: scores,
 * exposure, counts, the delta and the ratchet verdict — no per-finding tables),
 * which is the same render the job summary uses, so the two cannot disagree.
 */
export function renderGithubComment(report: Report, options: GithubRenderOptions = {}): string {
  const wanted = options.config?.comment?.detail ?? 'summary';
  const chain: Array<'verbose' | 'normal' | 'summary'> =
    wanted === 'verbose' ? ['verbose', 'normal', 'summary'] : wanted === 'normal' ? ['normal', 'summary'] : ['summary'];
  for (const detail of chain) {
    const body = commentBody(report, options, detail);
    if (body.length <= COMMENT_MAX_CHARS) return body;
  }
  return commentBody(report, options, null);
}

/**
 * One comment body. `detail` is the report section's detail, or null to drop
 * the report and say where it went — which is how the size cap is honored.
 */
function commentBody(
  report: Report,
  options: GithubRenderOptions,
  detail: 'summary' | 'normal' | 'verbose' | null
): string {
  const config = options.config ?? {};
  const badges = config.badges !== false;
  const sections = new Set(config.comment?.sections ?? ['scores', 'delta', 'new-findings']);
  const selectors = config.summary ?? ['security', 'perf'];
  const view = selectView(report, { planes: planePatterns(selectors), ...options.view });
  // `findings` is the old name for `report`; both mean "the markdown report".
  const wantsReport = sections.has('report') || sections.has('findings');
  const withReport = wantsReport && detail != null;

  const out: string[] = [COMMENT_MARKER, '## safegres', ''];

  if (sections.has('scores')) {
    out.push(
      selectedScores(view.scores, selectors)
        .map((s) => scoreBadge(s.label, s.score, badges))
        .join(' '),
      ''
    );
    // Everything below is in the report too, so it is said once.
    if (report.exposure && !withReport) {
      out.push(
        report.exposure.known
          ? `Exposure (${report.exposure.source}): **${report.exposure.exposedTables}/`
            + `${report.exposure.totalTables}** tables reachable.`
          : '> [!WARNING]\n> Exposure unknown — the whole database is assumed reachable, '
            + 'and the score is capped.',
        ''
      );
    }
  }

  if (sections.has('planes') && view.planes.length > 0) {
    out.push(
      '| Plane | Kind | Relations | Grade |',
      '| --- | --- | ---: | --- |',
      ...view.planes.map((p) =>
        p.skipped
          ? `| \`${p.name}\` | ${p.kind} | — | not graded |`
          : `| \`${p.name}\` | ${p.kind} | ${p.exposedTables} | **${p.score.grade}** (${p.score.value}) |`
      ),
      ''
    );
  }

  // The report renders the comparison (or the reason there is none) itself.
  const wantsDelta = sections.has('delta') && !withReport;

  if (wantsDelta && report.comparison) {
    const cmp = report.comparison;
    const since = describeBaseline(cmp.previous);
    if (cmp.unchanged) {
      out.push(`_No change since ${since}._`, '');
    } else {
      out.push(`**Changes since ${since}**`, '');
      for (const [dimension, d] of [
        ['security', cmp.security],
        ['performance', cmp.perf]
      ] as const) {
        if (!d) continue;
        const arrow = d.delta > 0 ? '🟢 ▲' : d.delta < 0 ? '🔴 ▼' : '⚪';
        out.push(
          `- ${dimension}: ${arrow} ${d.delta > 0 ? '+' : ''}${d.delta.toFixed(1)} `
            + `(${d.before} → ${d.after}${d.gradeBefore === d.gradeAfter ? '' : `, ${d.gradeBefore} → ${d.gradeAfter}`})`
        );
      }
      out.push('');
    }
  } else if (wantsDelta && report.comparisonSkipped) {
    out.push(
      `_No delta baseline: ${report.comparisonSkipped}. `
        + 'The absolute score and the perf baseline still gate this run._',
      ''
    );
  }

  if (sections.has('new-findings')) {
    const diff = report.perf?.diff;
    // The ratchet's verdict, even when it is "nothing new": a comment that only
    // speaks up on new debt cannot be distinguished from one that never ran.
    // The report carries this line itself, so it is not repeated under it.
    if (diff && !withReport) {
      out.push(
        `Perf baseline: **${diff.added.length} new**, ${diff.accepted.length} accepted, `
          + `${diff.removed.length} resolved.`,
        ''
      );
    }
    const added = diff?.added ?? [];
    if (added.length > 0) {
      out.push(
        `**${added.length} new performance finding${added.length === 1 ? '' : 's'} since the baseline**`,
        '',
        ...added.slice(0, 10).map((f) => `- \`${f.code}\` ${location(f)} — ${f.message}`),
        ''
      );
    }
  }

  if (withReport) {
    out.push(renderMarkdown(report, { title: 'Report', view: { detail, ...options.view } }), '');
  } else if (wantsReport) {
    out.push(
      '_The report is too large for a PR comment — it is in the job summary and the '
        + 'reports artifact._',
      ''
    );
  }

  return out.join('\n');
}

/**
 * Workflow annotations. Default `gate-failures`: annotating every advisory on
 * a large schema buries the one finding that actually blocked the merge.
 */
export function renderAnnotations(report: Report, options: GithubRenderOptions = {}): string[] {
  const mode = options.config?.annotations ?? 'gate-failures';
  if (mode === 'none') return [];
  const findings =
    mode === 'all'
      ? report.findings.filter((f) => f.exposed !== false && !f.acknowledged)
      : (options.gateFailures ?? []);
  return findings.map((f) => {
    const level = f.severity === 'critical' || f.severity === 'high' ? 'error' : 'warning';
    const title = `${f.code} ${location(f)}`.trim();
    return `::${level} title=${escapeProperty(title)}::${escapeData(f.message)}`;
  });
}

/**
 * Write the summary to `$GITHUB_STEP_SUMMARY` and print the annotations.
 * Returns false when not running under GitHub Actions, so a caller can fall
 * back to stdout rather than silently producing nothing.
 */
export function emitGithub(report: Report, options: GithubRenderOptions = {}): boolean {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  for (const annotation of renderAnnotations(report, options)) {
    process.stdout.write(`${annotation}\n`);
  }
  if (!summaryPath) return false;
  fs.appendFileSync(summaryPath, `${renderGithubSummary(report, options)}\n`);
  return true;
}

/**
 * Upsert the sticky comment on the current pull request. No-op (returning a
 * reason) when the environment has no PR or no token: a report is not worth
 * failing a build over, but silence about *why* is how integrations rot.
 */
export async function postStickyComment(
  body: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<{ posted: boolean; reason?: string }> {
  const token = env.GITHUB_TOKEN ?? env.INPUT_GITHUB_TOKEN;
  const repo = env.GITHUB_REPOSITORY;
  if (!token) return { posted: false, reason: 'no GITHUB_TOKEN in the environment' };
  if (!repo) return { posted: false, reason: 'no GITHUB_REPOSITORY in the environment' };

  const pr = pullRequestNumber(env);
  if (pr == null) return { posted: false, reason: 'not running on a pull_request event' };

  const api = env.GITHUB_API_URL ?? 'https://api.github.com';
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'content-type': 'application/json'
  };

  const listed = await fetch(`${api}/repos/${repo}/issues/${pr}/comments?per_page=100`, { headers });
  if (!listed.ok) {
    return { posted: false, reason: `GitHub API ${listed.status} listing comments` };
  }
  const comments = (await listed.json()) as Array<{ id: number; body?: string }>;
  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

  const target = existing
    ? `${api}/repos/${repo}/issues/comments/${existing.id}`
    : `${api}/repos/${repo}/issues/${pr}/comments`;
  const written = await fetch(target, {
    method: existing ? 'PATCH' : 'POST',
    headers,
    body: JSON.stringify({ body })
  });
  if (!written.ok) return { posted: false, reason: `GitHub API ${written.status} writing comment` };
  return { posted: true };
}

function pullRequestNumber(env: NodeJS.ProcessEnv): number | null {
  const eventPath = env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return null;
  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8')) as {
      pull_request?: { number?: number };
      issue?: { number?: number };
    };
    return event.pull_request?.number ?? event.issue?.number ?? null;
  } catch {
    return null;
  }
}

/** `planes:direct:*` in a summary selector is a plane glob for the view. */
function planePatterns(selectors: string[]): string[] {
  return selectors
    .filter((s) => s.startsWith('planes:'))
    .map((s) => s.slice('planes:'.length));
}

function selectedScores(scores: ViewScore[], selectors: string[]): ViewScore[] {
  const planes = planePatterns(selectors);
  return scores.filter((s) => {
    if (s.plane) return planes.some((p) => matchPlane(p, s.plane!.name));
    return selectors.includes(s.id);
  });
}

function location(f: Finding): string {
  return [f.schema, f.table].filter(Boolean).join('.') + (f.policy ? ` (${f.policy})` : '');
}

// https://github.com/actions/toolkit/blob/main/packages/core/src/command.ts
function escapeData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}
