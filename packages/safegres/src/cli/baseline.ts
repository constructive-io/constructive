import { Logger } from '@pgpmjs/logger';
import { appendFileSync } from 'fs';
import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';

import { CANDIDATE_LIMIT, MAX_BASELINE_AGE_MS } from '../ci/baseline';
import { type GithubBaselineResult, selectGithubBaseline } from '../ci/github';

const log = new Logger('safegres');

const usage = `
safegres baseline — choose the report a delta is measured against

  safegres baseline --provider github [OPTIONS]

Finds the base branch's most recent run that is a sane comparison — succeeded,
young enough, and audited a commit in this branch's merge-base history — and
downloads its report. When nothing qualifies it says why and exits 0: the audit
then runs with no deltas, and the absolute gates still apply.

The result is written to $GITHUB_OUTPUT when the runner provides one, as
compare / compare-ref / compare-sha / compare-run-id / compare-run-url /
compare-age / compare-skipped — the same names \`safegres audit\` takes as
flags, so the next step is \`--compare "\${{ steps.<id>.outputs.compare }}"\`.

Options:
  --provider <name>        Where the runs live. Only "github" today
  --repo <owner/repo>      Default $GITHUB_REPOSITORY
  --base <ref>             Base branch whose runs are candidates
                           (default: the pull request's base)
  --head <sha>             Branch tip to take the merge base of
                           (default: the pull request's head)
  --workflow <file>        Workflow file that produced the reports
                           (default: the workflow this runs in)
  --artifact <name>        Artifact holding safegres.json
                           (default: safegres-reports)
  --dir <dir>              Where to unpack it (default: previous)
  --max-age-hours <n>      Staleness limit (default: ${MAX_BASELINE_AGE_MS / 3600000})
  --candidates <n>         Runs to consider (default: ${CANDIDATE_LIMIT})
  --json                   Print the selection as JSON
  --help, -h               Show this help message

Needs \`permissions: actions: read\` to list runs and download artifacts.
`;

/** `key=value` into a GitHub Actions file, or stdout when running locally. */
function emit(file: string | undefined, key: string, value: string): void {
  const line = `${key}=${value}`;
  if (file) appendFileSync(file, `${line}\n`);
  else process.stdout.write(`(${key}) ${value}\n`);
}

function publish(result: GithubBaselineResult): void {
  const file = process.env.GITHUB_OUTPUT;
  if (result.chosen) {
    emit(file, 'compare', result.chosen.path);
    emit(file, 'compare-ref', result.base);
    emit(file, 'compare-sha', result.chosen.headSha);
    emit(file, 'compare-run-id', result.chosen.runId);
    if (result.runUrl) emit(file, 'compare-run-url', result.runUrl);
    if (result.age) emit(file, 'compare-age', result.age);
  } else {
    emit(file, 'compare-skipped', result.reason ?? 'no baseline');
  }
}

export default async (
  argv: ParsedArgs,
  _prompter: Inquirerer,
  _options: CLIOptions
): Promise<void> => {
  if (argv.help || argv.h) {
    process.stdout.write(usage);
    return;
  }

  const provider = typeof argv.provider === 'string' ? argv.provider : 'github';
  if (provider !== 'github') {
    log.error(`unknown --provider ${provider} (only "github" is implemented)`);
    process.exit(2);
  }

  const hours = Number(argv['max-age-hours']);
  const candidates = Number(argv.candidates);

  let result: GithubBaselineResult;
  try {
    result = selectGithubBaseline({
      ...(typeof argv.repo === 'string' && { repo: argv.repo }),
      ...(typeof argv.base === 'string' && { base: argv.base }),
      ...(typeof argv.head === 'string' && { headSha: argv.head }),
      ...(typeof argv.workflow === 'string' && { workflow: argv.workflow }),
      ...(typeof argv.artifact === 'string' && { artifact: argv.artifact }),
      ...(typeof argv.dir === 'string' && { dir: argv.dir }),
      ...(Number.isFinite(hours) && hours > 0 && { maxAgeMs: hours * 3600000 }),
      ...(Number.isFinite(candidates) && candidates > 0 && { candidateLimit: candidates })
    });
  } catch (err) {
    // Fail-soft, loudly: a missing PR context, a token without `actions: read`
    // or a `gh` that is not installed must not fail an audit that is perfectly
    // able to run without deltas — but the reason travels into the report as
    // the skip message rather than being swallowed.
    const message = (err as Error).message.trim();
    log.error(`no comparison baseline: ${message}`);
    publish({ chosen: null, rejected: [], reason: message, base: '', mergeBaseSha: '' });
    return;
  }

  publish(result);
  if (argv.json === true) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};
