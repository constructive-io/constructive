/**
 * Which report a delta is measured against — chosen, validated, explained.
 *
 * A comparison is only as trustworthy as the artifact it subtracts, and CI
 * picking that artifact is where it goes wrong. The shape everyone writes is a
 * one-row query for the base branch's last successful run:
 *
 *   gh run list --workflow ci.yaml --branch main --status success --limit 1
 *
 * `--limit 1` is `per_page=1`, so one API row decides the baseline with nothing
 * checking it and nothing printing which row it was. Observed cost, on the PR
 * this module was written for: that query answered with a `main` run 13.6 days
 * and ~150 successful runs stale, and a PR touching no SQL at all was reported
 * as `Δ vs main: ▼ −0.8, findings 2877 → 3323` — every merge since. A finished,
 * correct run existed; the artifacts had not expired. An unvalidated answer was
 * simply trusted.
 *
 * The fix is not a cleverer query. This takes several candidates and picks the
 * newest that survives three questions:
 *
 *   1. did it succeed, and is its report artifact still downloadable?
 *   2. is it younger than `maxAgeMs`?
 *   3. is its head commit an ancestor of this branch's merge base with the base?
 *
 * (3) is what makes the delta mean "what this branch did": a baseline from the
 * tip of the base branch *after* the branch point charges the branch for merges
 * it never contained, and one from rewritten or unrelated history is not
 * comparable at all. (2) catches a stale baseline that is a legitimate ancestor.
 *
 * No acceptable candidate is not a failure — it is a report with no deltas and
 * a stated reason (`--compare-skipped`). The absolute grade gate and the perf
 * ratchet never read the comparison, so they still apply.
 *
 * This module is pure and provider-agnostic: ancestry and artifact download
 * arrive as callbacks, which is what makes the decision testable without a
 * network. `./github` supplies them from GitHub Actions.
 */

import { formatAge } from '../report/compare';

/** One run of the base branch, as a provider lists them (newest first). */
export interface BaselineCandidate {
  /** Provider's id for the run, as it appears in a URL. */
  runId: string;
  /** Commit the run audited. */
  headSha: string;
  /** ISO 8601. When the run finished, or started if that is all there is. */
  finishedAt: string;
  /** `success` qualifies; anything else (including in-progress) does not. */
  conclusion: string | null;
}

export interface SelectBaselineOptions {
  /** The branch point this comparison must be relative to. */
  mergeBaseSha: string;
  /** Is `sha` in the merge base's history? */
  isAncestor: (sha: string) => boolean;
  /** Fetch a candidate's report; null when the artifact is gone. */
  download: (candidate: BaselineCandidate) => string | null;
  now?: number;
  maxAgeMs?: number;
}

export interface RejectedCandidate {
  runId: string;
  headSha: string;
  reason: string;
}

export interface ChosenBaseline extends BaselineCandidate {
  /** Age at selection time, in milliseconds. */
  ageMs: number;
  /** Path to the downloaded report. */
  path: string;
}

export interface BaselineSelection {
  chosen: ChosenBaseline | null;
  rejected: RejectedCandidate[];
  /** One line for the job summary when `chosen` is null. */
  reason: string | null;
}

/**
 * How stale a baseline may be by default: 48 hours.
 *
 * The window has to be wider than the gap between two base-branch runs, or a
 * branch loses its delta for no reason. Those runs are per merge, so the gap is
 * activity rather than a schedule: on the repository this was measured against,
 * `main` averaged well under an hour between successful runs on a working day
 * and went ~24 hours over a weekend. 48 hours clears the widest observed quiet
 * stretch with room to spare, while still being a *comparison* — anything older
 * describes a schema several merges removed from the branch point.
 */
export const MAX_BASELINE_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * How many runs to consider by default.
 *
 * More than one on principle — trusting a single row is the bug — and enough
 * that an in-progress tip, a cancelled run and a couple of expired artifacts
 * can all be skipped without falling out of the age window. Beyond ~20 the
 * candidates are older than the window anyway, so they cost a request to
 * reject.
 */
export const CANDIDATE_LIMIT = 20;

const short = (sha: string): string => (sha || '').slice(0, 9);

/**
 * The newest candidate that is a sane comparison, and why the others were not.
 *
 * `isAncestor` and `download` are I/O in CI and stubs in tests, and are only
 * asked about a candidate that already passed the cheap checks.
 */
export function selectBaseline(
  candidates: BaselineCandidate[],
  options: SelectBaselineOptions
): BaselineSelection {
  const {
    mergeBaseSha,
    isAncestor,
    download,
    now = Date.now(),
    maxAgeMs = MAX_BASELINE_AGE_MS
  } = options;

  const rejected: RejectedCandidate[] = [];
  const reject = (run: BaselineCandidate, why: string): void => {
    rejected.push({ runId: run.runId, headSha: run.headSha, reason: why });
  };

  for (const run of candidates) {
    if (run.conclusion !== 'success') {
      reject(run, `conclusion ${run.conclusion || 'pending'}`);
      continue;
    }

    const ageMs = now - Date.parse(run.finishedAt);
    if (!(ageMs >= 0)) {
      reject(run, `unreadable timestamp ${run.finishedAt}`);
      continue;
    }
    if (ageMs > maxAgeMs) {
      reject(run, `${formatAge(ageMs)} old, older than the ${formatAge(maxAgeMs)} window`);
      continue;
    }

    if (!isAncestor(run.headSha)) {
      reject(run, `${short(run.headSha)} is not an ancestor of merge base ${short(mergeBaseSha)}`);
      continue;
    }

    const path = download(run);
    if (!path) {
      reject(run, 'no downloadable report artifact');
      continue;
    }

    return { chosen: { ...run, ageMs, path }, rejected, reason: null };
  }

  return {
    chosen: null,
    rejected,
    reason:
      candidates.length > 0
        ? `no run within ${formatAge(maxAgeMs)} whose head is an ancestor of merge base `
          + `${short(mergeBaseSha)} (${rejected.length} candidate(s) rejected)`
        : 'no runs to compare against'
  };
}
