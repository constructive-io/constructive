/**
 * The GitHub Actions half of baseline selection: run discovery, merge base,
 * artifact download. Everything provider-shaped lives here, so `./baseline`
 * stays a pure decision and the report layer never learns what a workflow run
 * is.
 *
 * The I/O goes through the `gh` CLI, which every GitHub-hosted runner has and
 * which already handles pagination, auth from `GITHUB_TOKEN`, and unzipping an
 * artifact. Reaching the API needs `permissions: actions: read`.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { formatAge } from '../report/compare';
import {
  type BaselineCandidate,
  type BaselineSelection,
  CANDIDATE_LIMIT,
  MAX_BASELINE_AGE_MS,
  selectBaseline
} from './baseline';

export interface GithubBaselineOptions {
  /** `owner/repo`. Default `$GITHUB_REPOSITORY`. */
  repo?: string;
  /** Branch whose runs are candidates — the PR's base. Default from the event. */
  base?: string;
  /** The branch tip to find the merge base of. Default from the event. */
  headSha?: string;
  /** Workflow file whose runs produced the reports. Default the current one. */
  workflow?: string;
  /** Artifact holding `safegres.json`. Default `safegres-reports`. */
  artifact?: string;
  /** Where to unpack it. Default `previous`. */
  dir?: string;
  maxAgeMs?: number;
  candidateLimit?: number;
  now?: number;
  /** Where the selection log goes. Default stdout. */
  log?: (line: string) => void;
}

/** What the caller needs to turn a selection into `safegres audit` flags. */
export interface GithubBaselineResult extends BaselineSelection {
  base: string;
  mergeBaseSha: string;
  /** `https://github.com/<repo>/actions/runs/<id>`, when one was chosen. */
  runUrl?: string;
  /** Pre-formatted age of the chosen run. */
  age?: string;
}

const short = (sha: string): string => sha.slice(0, 9);

const gh = (args: string[]): string => execFileSync('gh', args, { encoding: 'utf8' });

/**
 * `gh run` needs `-R` explicitly: the workspace may be an unpacked artifact
 * with no `.git` for it to infer the repository from. `gh api` carries the
 * repository in the path and rejects the flag.
 */
const ghRun = (repo: string, args: string[]): string => gh(['run', ...args, '-R', repo]);

/** The workflow file of the run this is called from, e.g. `run-tests.yaml`. */
function currentWorkflow(): string | undefined {
  const ref = process.env.GITHUB_WORKFLOW_REF; // owner/repo/.github/workflows/x.yml@refs/…
  if (!ref) return undefined;
  const file = ref.split('@')[0].split('/').pop();
  return file || undefined;
}

/** The PR's head sha, from the event payload the runner wrote to disk. */
function eventHeadSha(): string | undefined {
  const file = process.env.GITHUB_EVENT_PATH;
  if (!file || !fs.existsSync(file)) return undefined;
  const event = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    pull_request?: { head?: { sha?: string }; base?: { ref?: string } };
  };
  return event.pull_request?.head?.sha;
}

function eventBaseRef(): string | undefined {
  const file = process.env.GITHUB_EVENT_PATH;
  if (!file || !fs.existsSync(file)) return undefined;
  const event = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    pull_request?: { base?: { ref?: string } };
  };
  return event.pull_request?.base?.ref ?? process.env.GITHUB_BASE_REF;
}

/**
 * The path, if it holds a report a delta can be measured against — an artifact
 * that exists but is truncated or from an incompatible version would otherwise
 * fail the audit at compare time, which is the one thing a baseline lookup must
 * never do.
 */
function readableReport(file: string, log: (why: string) => void): string | null {
  if (!fs.existsSync(file)) {
    log(`artifact holds no ${path.basename(file)}`);
    return null;
  }
  try {
    const report = JSON.parse(fs.readFileSync(file, 'utf8')) as { summary?: unknown };
    if (report.summary === undefined) throw new Error('no summary');
    return file;
  } catch (err) {
    log(`unusable report — ${(err as Error).message}`);
    return null;
  }
}

/**
 * Select a baseline report from the base branch's recent runs.
 *
 * Throws only on a broken invocation (no repository, no PR context, `gh`
 * missing). A candidate that cannot be used is rejected, not fatal: the caller
 * renders the report without deltas and says why.
 */
export function selectGithubBaseline(options: GithubBaselineOptions = {}): GithubBaselineResult {
  const log = options.log ?? ((line: string) => console.log(line));
  const repo = options.repo ?? process.env.GITHUB_REPOSITORY;
  const base = options.base ?? eventBaseRef();
  const headSha = options.headSha ?? eventHeadSha() ?? process.env.GITHUB_SHA;
  const workflow = options.workflow ?? currentWorkflow();
  const artifact = options.artifact ?? 'safegres-reports';
  const dir = path.resolve(options.dir ?? 'previous');

  if (!repo) throw new Error('GITHUB_REPOSITORY is not set: pass --repo owner/repo');
  if (!base) throw new Error('no base branch: pass --base (this is a pull-request-only feature)');
  if (!headSha) throw new Error('no head commit: pass --head <sha>');
  if (!workflow) throw new Error('no workflow: pass --workflow <file.yaml>');

  // The branch point, from the API rather than `git merge-base`: the audit job
  // may not have checked the repository out, and a shallow clone has no history.
  const mergeBaseSha = (
    JSON.parse(gh(['api', `repos/${repo}/compare/${base}...${headSha}`])) as {
      merge_base_commit: { sha: string };
    }
  ).merge_base_commit.sha;
  log(`merge base with ${base}: ${short(mergeBaseSha)}`);

  const runs = JSON.parse(
    ghRun(repo, [
      'list',
      '--workflow',
      workflow,
      '--branch',
      base,
      '--limit',
      String(options.candidateLimit ?? CANDIDATE_LIMIT),
      '--json',
      'databaseId,headSha,createdAt,updatedAt,conclusion'
    ])
  ) as {
    databaseId: number;
    headSha: string;
    createdAt: string;
    updatedAt: string;
    conclusion: string | null;
  }[];

  const candidates: BaselineCandidate[] = runs.map((r) => ({
    runId: String(r.databaseId),
    headSha: r.headSha,
    // `updatedAt` is when the run concluded; `createdAt` until GitHub records it.
    finishedAt: r.updatedAt || r.createdAt,
    conclusion: r.conclusion
  }));

  const ancestry = new Map<string, boolean>();
  const isAncestor = (sha: string): boolean => {
    if (!ancestry.has(sha)) {
      // `ahead` = the merge base is ahead of the candidate, i.e. the candidate
      // is in its history; `identical` = the baseline *is* the branch point, the
      // ideal case. `behind`/`diverged` are the ones to refuse.
      const status = (
        JSON.parse(gh(['api', `repos/${repo}/compare/${sha}...${mergeBaseSha}`])) as {
          status: string;
        }
      ).status;
      ancestry.set(sha, status === 'ahead' || status === 'identical');
    }
    return ancestry.get(sha) === true;
  };

  const download = (run: BaselineCandidate): string | null => {
    // Emptied first: successive candidates unpack into the same directory, and a
    // leftover report from a rejected one would make the next candidate look
    // usable and put the wrong run's numbers in the delta.
    fs.rmSync(dir, { recursive: true, force: true });
    try {
      ghRun(repo, ['download', run.runId, '-n', artifact, '-D', dir]);
    } catch (err) {
      // The one ignorable failure here: an expired or never-uploaded artifact is
      // a rejected candidate, not a broken job. Anything else (auth, network)
      // fails the same way on the next candidate and surfaces as "no baseline".
      log(`  ${run.runId}: artifact download failed — ${String((err as Error).message).trim()}`);
      return null;
    }
    return readableReport(path.join(dir, 'safegres.json'), (why) => log(`  ${run.runId}: ${why}`));
  };

  const selection = selectBaseline(candidates, {
    mergeBaseSha,
    isAncestor,
    download,
    ...(options.now !== undefined && { now: options.now }),
    maxAgeMs: options.maxAgeMs ?? MAX_BASELINE_AGE_MS
  });

  for (const r of selection.rejected) {
    log(`rejected ${r.runId} (${short(r.headSha)}): ${r.reason}`);
  }

  if (!selection.chosen) {
    log(`no comparison baseline: ${selection.reason}`);
    return { ...selection, base, mergeBaseSha };
  }

  const age = formatAge(selection.chosen.ageMs);
  const runUrl = `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${repo}/actions/runs/${selection.chosen.runId}`;
  log(
    `baseline: run ${selection.chosen.runId} ${base}@${short(selection.chosen.headSha)}, `
      + `${age} old (${selection.chosen.finishedAt})`
  );
  return { ...selection, base, mergeBaseSha, runUrl, age };
}
