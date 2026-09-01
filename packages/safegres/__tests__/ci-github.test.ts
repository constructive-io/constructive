/**
 * The provider plumbing around the guard: which API answers become candidates,
 * what an unusable artifact does, and that a rejected candidate's report cannot
 * be mistaken for the next candidate's.
 */

import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { selectGithubBaseline } from '../src/ci/github';

jest.mock('child_process', () => ({ execFileSync: jest.fn() }));
const exec = execFileSync as jest.MockedFunction<typeof execFileSync>;

const NOW = Date.parse('2026-01-15T12:00:00Z');
const minutesAgo = (n: number) => new Date(NOW - n * 60000).toISOString();

const REPO = 'o/r';
const MERGE_BASE = '60f238e19aa';

/** Runs as `gh run list --json` returns them, newest first. */
const RUNS = [
  // Merged into main after this branch left it: a successful run that would
  // charge the branch for someone else's merges.
  { databaseId: 104, headSha: 'ffffffffff1', updatedAt: minutesAgo(1), conclusion: 'success' },
  { databaseId: 103, headSha: MERGE_BASE, updatedAt: minutesAgo(36), conclusion: 'success' },
  { databaseId: 102, headSha: 'aaaaaaaaaa2', updatedAt: minutesAgo(41), conclusion: 'success' }
];

/** A report is only usable if it parses and carries a summary. */
function writeReport(dir: string, body: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'safegres.json'), body);
}

interface Stubs {
  /** What `gh run download <id>` leaves behind, per run. */
  artifacts?: Record<string, string | 'gone'>;
}

function stubGh(dir: string, { artifacts = {} }: Stubs = {}): void {
  exec.mockImplementation(((_cmd: string, args: string[]) => {
    const [verb, subject] = args;
    if (verb === 'api' && subject.includes('...')) {
      const [left] = subject.split('/compare/')[1].split('...');
      // `main...<head>` asks for the branch point; `<sha>...<mergeBase>` asks
      // whether the candidate is in its history.
      if (left === 'main') return JSON.stringify({ merge_base_commit: { sha: MERGE_BASE } });
      return JSON.stringify({ status: left === 'ffffffffff1' ? 'diverged' : 'ahead' });
    }
    if (verb === 'run' && args[1] === 'list') return JSON.stringify(RUNS);
    if (verb === 'run' && args[1] === 'download') {
      const body = artifacts[args[2]] ?? '{"summary":{"total":1}}';
      if (body === 'gone') throw new Error('artifact not found');
      writeReport(dir, body);
      return '';
    }
    throw new Error(`unexpected gh ${args.join(' ')}`);
  }) as never);
}

describe('selectGithubBaseline', () => {
  let dir: string;

  beforeEach(() => {
    dir = join(mkdtempSync(join(tmpdir(), 'safegres-baseline-')), 'previous');
    exec.mockReset();
  });

  const select = (stubs?: Stubs) => {
    stubGh(dir, stubs);
    return selectGithubBaseline({
      repo: REPO,
      base: 'main',
      headSha: 'deadbeef123',
      workflow: 'run-tests.yaml',
      dir,
      now: NOW,
      log: () => {}
    });
  };

  it('names the run, the commit, the age and a link to it', () => {
    const result = select();
    expect(result.chosen?.runId).toBe('103');
    expect(result.mergeBaseSha).toBe(MERGE_BASE);
    expect(result.age).toBe('36 minutes');
    expect(result.runUrl).toBe(`https://github.com/${REPO}/actions/runs/103`);
    expect(result.chosen?.path).toBe(join(dir, 'safegres.json'));
  });

  it('refuses a run whose head diverged from the branch point', () => {
    expect(select().rejected[0]).toEqual({
      runId: '104',
      headSha: 'ffffffffff1',
      reason: `fffffffff is not an ancestor of merge base ${MERGE_BASE.slice(0, 9)}`
    });
  });

  it('walks past a truncated report instead of failing the audit with it', () => {
    const result = select({ artifacts: { 103: '{"summ' } });
    expect(result.chosen?.runId).toBe('102');
  });

  it('walks past an expired artifact', () => {
    expect(select({ artifacts: { 103: 'gone' } }).chosen?.runId).toBe('102');
  });

  it('does not let a rejected run\u2019s report stand in for the next candidate', () => {
    // 103's artifact is unusable, and 102's download writes nothing: without
    // clearing the directory, 103's file would be read as 102's baseline.
    const result = select({ artifacts: { 103: 'null', 102: 'gone' } });
    expect(result.chosen).toBeNull();
    expect(result.reason).toContain('no run within');
  });
});
