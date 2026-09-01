/**
 * The baseline guard, against the incident it exists for: a PR that touched no
 * SQL was told it had cost 0.8 points and 446 findings, because the base
 * branch's "last successful run" was a fortnight and ~150 merges old.
 *
 * Everything here is synthetic and deterministic — ancestry and artifact
 * download are stubs, and no candidate is a real commit. `selectBaseline` is a
 * pure function precisely so this needs no git, no network and no clock.
 */

import {
  type BaselineCandidate,
  MAX_BASELINE_AGE_MS,
  selectBaseline,
  type SelectBaselineOptions
} from '../src/ci/baseline';
import { formatAge } from '../src/report/compare';

const NOW = Date.parse('2026-01-15T12:00:00Z');
const minutesAgo = (n: number): string => new Date(NOW - n * 60000).toISOString();

const run = (
  runId: string,
  headSha: string,
  finishedAt: string,
  conclusion: string | null = 'success'
): BaselineCandidate => ({ runId, headSha, finishedAt, conclusion });

/** The base branch's runs, newest first, as a provider lists them. */
const TIP = run('104', 'sha-tip', minutesAgo(1), null); // still running
const BRANCH_POINT = run('103', 'sha-base', minutesAgo(36));
const BEFORE_BASE = run('102', 'sha-older', minutesAgo(41));
const STALE = run('101', 'sha-stale', minutesAgo(13.6 * 24 * 60));
const CANDIDATES = [TIP, BRANCH_POINT, BEFORE_BASE, STALE];

const ANCESTORS = new Set(['sha-base', 'sha-older', 'sha-stale']);

const select = (
  candidates: BaselineCandidate[],
  extra: Partial<SelectBaselineOptions> = {}
) =>
  selectBaseline(candidates, {
    mergeBaseSha: 'sha-base',
    isAncestor: (sha) => ANCESTORS.has(sha),
    download: () => 'previous/safegres.json',
    now: NOW,
    ...extra
  });

describe('selectBaseline', () => {
  it('takes the newest run at or below the branch point', () => {
    const { chosen, reason } = select(CANDIDATES);
    expect(chosen?.runId).toBe('103');
    expect(chosen?.path).toBe('previous/safegres.json');
    expect(reason).toBeNull();
  });

  it('rejects the run the old query returned: stale, though a legitimate ancestor', () => {
    const { chosen, rejected } = select([STALE]);
    expect(chosen).toBeNull();
    expect(rejected).toEqual([
      {
        runId: '101',
        headSha: 'sha-stale',
        reason: '13.6 days old, older than the 2.0 days window'
      }
    ]);
  });

  it('rejects a run whose head is not in the merge base history', () => {
    // The tip of the base branch after the branch point: comparing against it
    // charges the branch for merges it never contained.
    const AHEAD = run('105', 'sha-ahead', minutesAgo(5));
    const { chosen, rejected } = select([AHEAD]);
    expect(chosen).toBeNull();
    expect(rejected[0].reason).toBe(
      'sha-ahead is not an ancestor of merge base sha-base'
    );
  });

  it('rejects a run that did not succeed, in progress or not', () => {
    const { rejected } = select([TIP, run('106', 'sha-base', minutesAgo(2), 'failure')]);
    expect(rejected.map((r) => r.reason)).toEqual(['conclusion pending', 'conclusion failure']);
  });

  it('walks past a run whose artifact is gone', () => {
    const { chosen, rejected } = select(CANDIDATES, {
      download: (c) => (c.runId === '103' ? null : 'previous/safegres.json')
    });
    expect(chosen?.runId).toBe('102');
    expect(rejected.at(-1)).toEqual({
      runId: '103',
      headSha: 'sha-base',
      reason: 'no downloadable report artifact'
    });
  });

  it('reports no baseline rather than choosing badly', () => {
    const { chosen, reason } = select([TIP, STALE]);
    expect(chosen).toBeNull();
    expect(reason).toBe(
      'no run within 2.0 days whose head is an ancestor of merge base sha-base '
        + '(2 candidate(s) rejected)'
    );
  });

  it('says so when there is nothing to compare against at all', () => {
    expect(select([]).reason).toBe('no runs to compare against');
  });

  it('accepts a run at the edge of the window and refuses one past it', () => {
    // A weekend with no merges is the case the window exists to survive.
    const edge = (offsetMs: number) =>
      select([run('107', 'sha-base', new Date(NOW - MAX_BASELINE_AGE_MS + offsetMs).toISOString())]);
    expect(edge(60000).chosen?.runId).toBe('107');
    expect(edge(-60000).chosen).toBeNull();
  });

  it('does not download or resolve ancestry for a candidate the cheap checks reject', () => {
    const isAncestor = jest.fn(() => true);
    const download = jest.fn(() => 'previous/safegres.json');
    select([TIP, STALE, BRANCH_POINT], { isAncestor, download });
    expect(isAncestor).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
  });
});

describe('formatAge', () => {
  it('reads at a glance at every scale', () => {
    expect(formatAge(60000)).toBe('1 minute');
    expect(formatAge(41 * 60000)).toBe('41 minutes');
    expect(formatAge(3.2 * 3600000)).toBe('3.2 hours');
    expect(formatAge(13.6 * 24 * 3600000)).toBe('13.6 days');
  });
});
