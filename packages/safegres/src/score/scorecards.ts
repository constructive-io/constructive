import type { ScorecardConfig, ScorecardSelector } from '../config/types';
import { RULES_BY_CODE } from '../rules/registry';
import { type Finding, type Severity, summarize,type Summary } from '../types';
import { computeScore, type Score, type ScoreContext } from './score';

/**
 * One named score over a selected slice of the findings.
 *
 * The headline score answers one question well and every other question
 * badly: a platform team gating on what `anonymous` reaches and an
 * application team gating on house style are not arguing about the same
 * number, and forcing them to is how a single number becomes something
 * nobody trusts. A scorecard is that question, written down — a selector
 * over the findings plus the weighting to grade them with.
 */
export interface ScorecardReport {
  /** Config key, e.g. `anon-surface`. */
  name: string;
  /** Human-readable heading for reports. */
  title?: string;
  /**
   * Why this scorecard exists — what decision it informs. Rendered with the
   * score, because a number whose question is unstated invites the reader to
   * supply their own.
   */
  description?: string;
  /** The findings it selected, graded by its own weighting. */
  score: Score;
  /** How many findings the selector matched. */
  findings: number;
  /** Severity counts over the selected findings. */
  summary: Summary;
  /** The resolved selector, so a report explains its own arithmetic. */
  select: ScorecardSelector;
  /**
   * Reserved scorecards safegres computes itself: `default` is the headline
   * (`report.score`, verbatim) and `raw` is every finding at its declared
   * severity with no exposure filter. Neither can be redefined into
   * something flattering.
   */
  reserved?: boolean;
}

export interface ScorecardContext extends ScoreContext {
  /** Relations on the exposed surface — the default density denominator. */
  exposedTables?: number;
  /** Every relation in the audited schemas — the `all` denominator. */
  totalTables?: number;
}

/**
 * The two scorecards every run carries, whatever the config says.
 *
 * `raw` is the honest one: no exposure filter, no acknowledgements, no
 * preset severity retuning, fail-closed findings weighted like anything
 * else. It is not flattering and it is not meant to be — it is the number
 * that is comparable between two databases, and the one a preset cannot
 * talk down.
 */
export const RESERVED_SCORECARDS: Record<string, ScorecardConfig> = {
  default: {
    title: 'Safegres score',
    description: 'The headline: exposed, fail-open findings at their configured severities.'
  },
  raw: {
    title: 'Raw score',
    description:
      'Every finding at its declared severity, exposure ignored — comparable across databases.',
    select: {
      severities: 'declared',
      exposure: 'all',
      acknowledged: 'include',
      denominator: 'all'
    },
    failClosedWeight: 1,
    maxRuleDensity: false
  }
};

/**
 * Grade each configured scorecard. `default` is not recomputed — it is the
 * headline score passed in, so a scorecard block can never move the number
 * on the badge by redefining what `default` means.
 */
export function computeScorecards(
  findings: Finding[],
  headline: Score,
  cards: Record<string, ScorecardConfig>,
  context: ScorecardContext
): ScorecardReport[] {
  const out: ScorecardReport[] = [];
  for (const [name, card] of Object.entries(cards)) {
    const reserved = name in RESERVED_SCORECARDS;
    const select = { ...(RESERVED_SCORECARDS[name]?.select ?? {}), ...(card.select ?? {}) };
    if (name === 'default') {
      out.push({
        name,
        ...titleOf(name, card),
        score: headline,
        findings: findings.filter((f) => f.exposed !== false && !f.acknowledged).length,
        summary: summarize(findings.filter((f) => f.exposed !== false && !f.acknowledged)),
        select,
        reserved: true
      });
      continue;
    }
    const selected = selectFindings(findings, select);
    const denominator = select.denominator === 'all'
      ? (context.totalTables ?? context.exposedTables)
      : context.exposedTables;
    out.push({
      name,
      ...titleOf(name, card),
      score: computeScore(selected, card, {
        ...context,
        exposedTables: denominator,
        // The selector has already decided what counts; scoring must not
        // filter again, or `exposure: 'all'` would be silently overruled.
        prefiltered: true
      }),
      findings: selected.length,
      summary: summarize(selected),
      select,
      ...(reserved ? { reserved: true } : {})
    });
  }
  return out;
}

function titleOf(name: string, card: ScorecardConfig): { title?: string; description?: string } {
  const base = RESERVED_SCORECARDS[name] ?? {};
  const title = card.title ?? base.title;
  const description = card.description ?? base.description;
  return { ...(title ? { title } : {}), ...(description ? { description } : {}) };
}

/**
 * The findings a scorecard grades. Every clause is a narrowing filter, so an
 * empty selector selects what the headline does: exposed, non-acknowledged,
 * security findings.
 */
export function selectFindings(findings: Finding[], select: ScorecardSelector): Finding[] {
  const dimension = select.dimension ?? 'security';
  const rules = select.rules?.map(matcher);
  const exclude = select.exclude?.map(matcher);
  const roles = select.roles ? new Set(select.roles) : undefined;
  const planes = select.planes ? new Set(select.planes) : undefined;
  const schemas = select.schemas ? new Set(select.schemas) : undefined;
  const severity = select.minSeverity ? SEVERITY_RANK[select.minSeverity] : undefined;

  const selected = findings.filter((f) => {
    if (f.category === 'meta') return false;
    if (dimension !== 'all' && (f.dimension ?? 'security') !== dimension) return false;
    if (select.exposure !== 'all' && f.exposed === false) return false;
    if (select.acknowledged !== 'include' && f.acknowledged) return false;
    if (select.direction && select.direction !== 'any' && f.direction !== select.direction) {
      return false;
    }
    if (rules && !rules.some((m) => m(f.code))) return false;
    if (exclude?.some((m) => m(f.code))) return false;
    if (schemas && (f.schema === undefined || !schemas.has(f.schema))) return false;
    if (roles && !touchesRole(f, roles)) return false;
    if (planes && !f.planes?.some((p) => planes.has(p))) return false;
    if (severity !== undefined && SEVERITY_RANK[f.severity] < severity) return false;
    return true;
  });

  // Declared severities answer "how bad is this really", independent of what
  // a preset chose to quiet down. Copies, never mutation: the findings in
  // the report keep the severity the config resolved.
  return select.severities === 'declared'
    ? selected.map((f) => {
      const declared = RULES_BY_CODE.get(f.code)?.defaultSeverity;
      return declared === undefined || declared === f.severity ? f : { ...f, severity: declared };
    })
    : selected;
}

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

/**
 * A role clause asks "is this finding about one of these roles" — which the
 * finding answers in one of three places: the graded `role` column, a
 * grantee list, or the reachability context a lattice rule attached.
 */
function touchesRole(finding: Finding, roles: Set<string>): boolean {
  if (finding.role && roles.has(finding.role)) return true;
  const context = finding.context as { role?: string; roles?: unknown } | undefined;
  if (context?.role && roles.has(context.role)) return true;
  return Array.isArray(context?.roles)
    && context.roles.some((r) => typeof r === 'string' && roles.has(r));
}

/** Rule code matcher: exact, or a `C*` prefix wildcard. */
function matcher(pattern: string): (code: string) => boolean {
  if (!pattern.endsWith('*')) return (code) => code === pattern;
  const prefix = pattern.slice(0, -1);
  return (code) => code.startsWith(prefix);
}
