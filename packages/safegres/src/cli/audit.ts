import { Logger } from '@pgpmjs/logger';
import * as fs from 'fs';
import { CLIOptions, Inquirerer, ParsedArgs } from 'inquirerer';
import * as path from 'path';

import { diffCallGraph, parseBaseline, serializeBaseline, toBaseline } from '../callgraph/baseline';
import { audit, type AuditOptions } from '../commands/audit';
import { configPathBase, loadConfig } from '../config/loader';
import type { Grade } from '../config/types';
import { diffPerf, parsePerfBaseline, serializePerfBaseline, toPerfBaseline } from '../perf/baseline';
import { compareReports, parseSnapshot, serializeSnapshot, toSnapshot } from '../report/compare';
import { emitGithub, postStickyComment, renderGithubComment, renderGithubSummary } from '../report/github';
import { renderJson } from '../report/json';
import { renderMarkdown } from '../report/markdown';
import { renderPretty } from '../report/pretty';
import { buildSourceIndex, renderSarif } from '../report/sarif';
import { matchPlane, type ViewConfig, viewConfigFromReportConfig } from '../report/view';
import { meetsGrade } from '../score/score';
import type { Finding, Report, Severity } from '../types';
import { meetsThreshold, SEVERITY_ORDER, summarize } from '../types';
import {
  buildClient,
  configParamsFromArgv,
  csvList,
  extensionScopeFromArgv,
  resolveRunPaths
} from './shared';

const log = new Logger('safegres');

/**
 * `--pgpm` mode needs the optional peer dependency `pgsql-test`, so the
 * helper module is loaded lazily with a friendly error when it's missing.
 */
function importPgpmTest(): typeof import('../pgpm-test') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../pgpm-test');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      log.error('--pgpm requires the optional peer dependency "pgsql-test" — install it (e.g. `npm i -D pgsql-test`) and retry');
      process.exit(2);
    }
    throw err;
  }
}

const usage = `
safegres audit — Postgres security and performance auditor

  safegres audit [OPTIONS]

Connection (priority order, top wins):
  --pgpm [dir]             No connection needed: deploy the pgpm workspace at
                           [dir] (default: nearest from cwd) into an ephemeral
                           test database and audit it (requires pgsql-test)
  --connection <url>       Full PostgreSQL connection string
  --host <host>            PostgreSQL host        (else PGHOST,    default localhost)
  --port <port>            PostgreSQL port        (else PGPORT,    default 5432)
  --user <user>            PostgreSQL user        (else PGUSER,    default postgres)
  --password <pw>          PostgreSQL password    (else PGPASSWORD,default password)
  --database <db>          PostgreSQL database    (else PGDATABASE,default postgres)

Configuration:
  --config <path>          Explicit config file (else discovered: safegres.config.{ts,js,mjs,cjs},
                           .safegresrc{,.json,.yaml,.yml,.js}, safegres.json, package.json "safegres")
  --preset <name>          Apply a built-in preset. Posture: recommended, strict, minimal.
                           Stack: constructive, postgrest, supabase, graphile, hasura.
                           Composable: multi-tenant, oltp (extends: [stack, posture]).
  --rule <CODE=SETTING>    Retune a rule (repeatable), e.g. --rule A3=off --rule A5=high
  --sealed                 Grade under a built-in preset ALONE: no config-file
                           discovery, and --config/--rule/--exposure-schemas and
                           every baseline flag are refused. For evaluating an
                           agent, where editing the rules is the cheapest way to
                           win. Pair with --preset; the resolved rule set is
                           fingerprinted into report.provenance either way
  --verify-fingerprint <f> Exit non-zero unless the run's configuration
                           fingerprint is <f> — the harness's proof that the
                           score it is reading was produced under its own rules

Exposure (what the score is computed against):
  --exposure-schemas <csv> Declare the API-exposed schemas; findings outside
                           them become unscored internal advisories
  --exposed-only           Hide internal (non-exposed) findings from output
  --plane <name|glob>      Expand a secondary access plane (repeatable; '*' for
                           all). Planes are declared in exposure.planes and
                           graded separately — the headline score is always the
                           primary (API) plane and never moves

Performance dimension (optional; scored separately from security):
  --perf                   Also audit index hygiene (X1/X5/X6/X7/X8), policy-aware
                           index coverage (X2/X3/X4) and policy cost (P1/P1b),
                           scored on its own 0-100 axis (report.perf)
  --fail-on-perf-score <n> Exit non-zero if the perf score is below n (0-100)
  --fail-on-perf-grade <g> Exit non-zero if the perf grade is below g (A+|A|B|C|D)
  --write-perf-baseline <file>
                           Snapshot today's perf findings to <file> as accepted
                           debt (implies --perf)
  --perf-baseline <file>   Diff perf findings against a committed baseline and
                           report only NEW debt (implies --perf)
  --fail-on-new-perf       Exit non-zero when --perf-baseline finds new debt
  --stats                  Also run the runtime-statistics rules (S1-S4) from
                           pg_stat_user_tables and, when installed,
                           pg_stat_statements (implies --perf). Workload-
                           dependent: only meaningful against a database that
                           has served representative traffic
  --explain                Prove each probeable perf finding with
                           EXPLAIN (GENERIC_PLAN) and attach the plan as
                           evidence; findings the planner refutes are reported
                           but unscored (implies --perf, needs PostgreSQL 16+)

Comparison with a previous run (what changed, not just what is):
  --compare <file>         Diff scores, severity counts and per-rule counts
                           against a previous run and render the delta.
                           <file> is any earlier --format json output, or a
                           snapshot written by --write-snapshot
  --compare-ref <label>    How to name the previous run in the report
                           (e.g. "main", a commit sha). Default "previous run"
  --write-snapshot <file>  Write the aggregate slice of this run (scores,
                           counts, per-rule counts) for a later --compare,
                           when keeping the whole report is too much

Call graph (unscored; human review):
  --call-graph             Analyze the functions reachable from the exposed entry
                           points and list trust boundaries: SECURITY DEFINER hops,
                           RLS-bypass paths, auth-context mutations, internal-table
                           reach, and opaque (dynamic SQL) nodes
  --write-baseline <file>  Snapshot the call-graph boundaries to <file>
                           (implies --call-graph)
  --baseline <file>        Diff the call graph against a committed snapshot and
                           report NEW trust boundaries (implies --call-graph)
  --fail-on-new-boundaries Exit non-zero when --baseline finds new boundaries

Audit options:
  --schemas <csv>          Limit to these schemas (default: all non-system)
  --exclude-schemas <csv>  Skip these schemas
  --ignore-extensions <csv> Skip everything in these extensions' schemas, for
                           objects an extension creates without registering a
                           dependency (e.g. pg_partman's child partitions)
  --audit-extension-owned  Audit relations owned by an installed extension too
                           (skipped by default — they are not yours to alter)
  --roles <csv>            Audit grants only for these roles (default: all)
  --exclude-roles <csv>    Skip grants for these roles
  --format <fmt>           "pretty" (default) | "json" | "json-pretty" | "markdown" | "sarif"
                           (markdown is for CI: a GitHub job summary or PR comment;
                           sarif uploads to GitHub code scanning)
  --sarif-sources <dir>    With --format sarif: scan <dir> for the CREATE TABLE /
                           CREATE POLICY that defines each object, so alerts point
                           at the SQL that produced the finding
  --out <dir>              Write safegres.json, safegres.md and safegres.sarif
                           into <dir> (created as needed)
  --write-json <file>      Also write the JSON report to <file>
  --write-markdown <file>  Also write the markdown report to <file>
  --write-sarif <file>     Also write the SARIF report to <file>
                           (one audit, as many outputs as CI needs)
  --summary, -q            Print only exposure, score, and severity counts (no findings)
  --verbose                Expand internal (non-exposed) advisories (listed as a count otherwise)
  --fail-on <severity>     Exit non-zero if any finding >= severity
                           (critical|high|medium|low|info; default: none)
  --fail-on-score <n>      Exit non-zero if the score is below n (0-100)
  --fail-on-grade <g>      Exit non-zero if the grade is below g (A+|A|B|C|D)
  --report-only            Evaluate and report every gate, then exit 0 anyway —
                           the way to run a gated config as an advisory job
  --skip-ast               Skip AST-level anti-pattern checks (faster)
  --no-color               Disable ANSI colors in pretty output
  --help, -h               Show this help message

GitHub Actions:
  --github                 Write the job summary to $GITHUB_STEP_SUMMARY and
                           emit workflow annotations (auto-detected when
                           GITHUB_ACTIONS=true). Configure what appears with
                           report.github in the config file
  --github-comment         Upsert the sticky PR comment (needs GITHUB_TOKEN)
  --write-github-comment <file>
                           Write the PR-comment markdown to <file> instead of
                           posting it

Everything a CI job repeats every run belongs in the config file instead, so
the job is just \`safegres audit\` (paths are relative to the config file):

  {
    "extends": "safegres:constructive",
    "source":  { "pgpm": "application/app" },
    "callGraph": { "enabled": true },
    "perf":    { "enabled": true, "baseline": "ci/perf-baseline.json", "failOnNew": true },
    "outputs": { "dir": "safegres-reports" },
    "failOn":  { "grade": "B" }
  }
`;

export default async (
  argv: ParsedArgs,
  _prompter: Inquirerer,
  _options: CLIOptions
): Promise<void> => {
  if (argv.help || argv.h) {
    process.stdout.write(usage);
    return;
  }

  // minimist parses `--no-color` as `color: false`.
  const colorEnabled = argv.color !== false;

  const pgpmCwd = typeof argv.pgpm === 'string' ? argv.pgpm : undefined;
  const sealed = argv.sealed === true;
  if (sealed) {
    // Everything below is a way to change the score without changing the
    // database. A sealed run refuses them outright rather than ignoring them:
    // an evaluation that silently dropped the flag it was handed would be
    // reporting a number for rules nobody chose.
    const banned = [
      'config',
      'rule',
      'baseline',
      'write-baseline',
      'perf-baseline',
      'write-perf-baseline',
      'exposure-schemas'
    ].filter((flag) => argv[flag] !== undefined);
    if (banned.length > 0) {
      log.error(`--sealed refuses local configuration: remove ${banned.map((f) => `--${f}`).join(', ')}`);
      process.exit(2);
    }
  }
  const loaded = loadConfig({ cwd: pgpmCwd, ...configParamsFromArgv(argv) });
  const config = loaded.config;

  const { pgpm: pgpmSource, usePgpm, perfBaseline, callGraphBaseline, outputs } = resolveRunPaths(
    argv,
    config,
    configPathBase(loaded)
  );

  const exposureSchemas = csvList(argv['exposure-schemas']);
  const auditOptions: AuditOptions = {
    schemas: csvList(argv.schemas),
    excludeSchemas: csvList(argv['exclude-schemas']),
    extensions: extensionScopeFromArgv(argv, config),
    includeRoles: csvList(argv.roles),
    excludeRoles: csvList(argv['exclude-roles']),
    skipAstChecks: argv['skip-ast'] === true,
    perf:
      argv.perf === true
      || perfBaseline !== undefined
      || typeof argv['write-perf-baseline'] === 'string'
        ? true
        : undefined,
    stats: argv.stats === true ? true : undefined,
    explain: argv.explain === true ? true : undefined,
    callGraph:
      argv['call-graph'] === true
      || config.callGraph?.enabled === true
      || callGraphBaseline !== undefined
      || typeof argv['write-baseline'] === 'string',
    exposure: exposureSchemas
      ? { ...config.exposure, schemas: exposureSchemas }
      : undefined,
    config,
    sealed,
    ...(typeof argv.preset === 'string' ? { preset: argv.preset } : {})
  };

  let report: Report;
  if (usePgpm) {
    const { auditPgpmWorkspace } = importPgpmTest();
    report = await auditPgpmWorkspace({ ...auditOptions, cwd: pgpmSource });
  } else {
    const client = buildClient(argv);
    await client.connect();
    try {
      report = await audit(client, auditOptions);
    } finally {
      await client.end();
    }
  }

  if (typeof argv['write-baseline'] === 'string' && report.callGraph) {
    fs.writeFileSync(argv['write-baseline'], serializeBaseline(toBaseline(report.callGraph)));
    log.info(`wrote call-graph baseline: ${argv['write-baseline']}`);
  }

  if (typeof argv['write-perf-baseline'] === 'string' && report.perf) {
    fs.writeFileSync(
      argv['write-perf-baseline'],
      serializePerfBaseline(toPerfBaseline(report.perf.findings))
    );
    log.info(`wrote perf baseline: ${argv['write-perf-baseline']}`);
  }

  if (perfBaseline !== undefined && report.perf) {
    let raw: string;
    try {
      raw = fs.readFileSync(perfBaseline, 'utf8');
    } catch {
      log.error(
        `cannot read perf baseline: ${perfBaseline} (create one with --write-perf-baseline)`
      );
      process.exit(2);
    }
    report.perf.diff = diffPerf(report.perf.findings, parsePerfBaseline(raw));
  }

  if (outputs.snapshot !== undefined) {
    writeOut(
      outputs.snapshot,
      serializeSnapshot(
        toSnapshot(report, typeof argv['compare-ref'] === 'string' ? { ref: argv['compare-ref'] } : {})
      )
    );
    log.info(`wrote snapshot: ${outputs.snapshot}`);
  }

  if (typeof argv.compare === 'string') {
    let raw: string;
    try {
      raw = fs.readFileSync(argv.compare, 'utf8');
    } catch {
      log.error(
        `cannot read --compare file: ${argv.compare} `
          + '(any earlier `--format json` report or `--write-snapshot` output works)'
      );
      process.exit(2);
    }
    let previous;
    try {
      previous = parseSnapshot(raw);
    } catch (err) {
      log.error(`--compare file is not a safegres report: ${(err as Error).message}`);
      process.exit(2);
    }
    if (typeof argv['compare-ref'] === 'string') previous.ref = argv['compare-ref'];
    report.comparison = compareReports(previous, report);
  }

  if (callGraphBaseline !== undefined && report.callGraph) {
    let raw: string;
    try {
      raw = fs.readFileSync(callGraphBaseline, 'utf8');
    } catch {
      log.error(`cannot read call-graph baseline: ${callGraphBaseline} (create one with --write-baseline)`);
      process.exit(2);
    }
    report.callGraphDiff = diffCallGraph(report.callGraph, parseBaseline(raw));
  }

  if (argv['exposed-only'] === true) {
    report.findings = report.findings.filter((f) => f.exposed !== false);
    report.summary = summarize(report.findings);
  }

  const planeSelectors = listArg(argv.plane);
  const viewConfig: ViewConfig = {
    ...viewConfigFromReportConfig(config.report),
    ...(planeSelectors.length > 0 ? { planes: planeSelectors } : {}),
    ...(argv['exposed-only'] === true ? { exposedOnly: true } : {})
  };

  const fmt = typeof argv.format === 'string' ? argv.format : 'pretty';
  let output: string;
  switch (fmt) {
  case 'json':
    output = renderJson(report);
    break;
  case 'json-pretty':
    output = renderJson(report, { pretty: true });
    break;
  case 'sarif':
    output = renderSarif(report, {
      sources: outputs.sarifSources ? buildSourceIndex(outputs.sarifSources) : undefined
    });
    break;
  case 'markdown':
  case 'md':
    output = renderMarkdown(report, {
      summary: argv.summary === true,
      verbose: argv.verbose === true,
      view: viewConfig
    });
    break;
  case 'pretty':
    output = renderPretty(report, {
      color: colorEnabled,
      summary: argv.summary === true,
      verbose: argv.verbose === true,
      view: viewConfig
    });
    break;
  default:
    log.error(`Unknown --format: ${fmt}`);
    process.exit(2);
  }
  process.stdout.write(output);
  process.stdout.write('\n');

  // One audit, as many renderings as CI asked for.
  if (outputs.json !== undefined) {
    writeOut(outputs.json, `${renderJson(report, { pretty: true })}\n`);
    log.info(`wrote json report: ${outputs.json}`);
  }
  if (outputs.markdown !== undefined) {
    writeOut(
      outputs.markdown,
      `${renderMarkdown(report, { verbose: argv.verbose === true, view: viewConfig })}\n`
    );
    log.info(`wrote markdown report: ${outputs.markdown}`);
  }
  if (outputs.sarif !== undefined) {
    writeOut(
      outputs.sarif,
      `${renderSarif(report, {
        sources: outputs.sarifSources ? buildSourceIndex(outputs.sarifSources) : undefined
      })}\n`
    );
    log.info(`wrote sarif report: ${outputs.sarif}`);
  }

  // Gates are evaluated before anything exits, so the GitHub renderers can
  // annotate exactly the findings that failed the build.
  let failed = false;
  const gateFailures: Finding[] = [];
  const fail = (message: string): void => {
    log.error(message);
    failed = true;
  };

  // Checked first: if the ruler is wrong, nothing measured with it is worth
  // gating on.
  const expected = argv['verify-fingerprint'];
  if (typeof expected === 'string' && report.provenance?.fingerprint !== expected) {
    fail(
      `configuration fingerprint ${report.provenance?.fingerprint ?? 'unknown'} `
        + `does not match --verify-fingerprint ${expected}`
    );
  }

  const failOnSeverity =
    typeof argv['fail-on'] === 'string' ? (argv['fail-on'] as Severity) : config.failOn?.severity;
  if (failOnSeverity) {
    if (!(failOnSeverity in SEVERITY_ORDER)) {
      log.error(`Unknown --fail-on severity: ${failOnSeverity}`);
      process.exit(2);
    }
    const over = report.findings.filter((f) => meetsThreshold(f.severity, failOnSeverity));
    if (over.length > 0) {
      gateFailures.push(...over);
      fail(`${over.length} finding(s) at or above --fail-on ${failOnSeverity}`);
    }
  }

  const failOnScore =
    typeof argv['fail-on-score'] === 'number' ? argv['fail-on-score'] : config.failOn?.score;
  if (failOnScore != null && report.score && report.score.value < failOnScore) {
    fail(`score ${report.score.value} is below --fail-on-score ${failOnScore}`);
  }

  const failOnGrade =
    typeof argv['fail-on-grade'] === 'string' ? (argv['fail-on-grade'] as Grade) : config.failOn?.grade;
  if (failOnGrade && report.score && !meetsGrade(report.score.grade, failOnGrade)) {
    fail(`grade ${report.score.grade} is below --fail-on-grade ${failOnGrade}`);
  }

  const failOnPerfScore =
    typeof argv['fail-on-perf-score'] === 'number'
      ? argv['fail-on-perf-score']
      : config.failOn?.perfScore;
  if (failOnPerfScore != null && report.perf && report.perf.score.value < failOnPerfScore) {
    fail(`perf score ${report.perf.score.value} is below --fail-on-perf-score ${failOnPerfScore}`);
  }

  const failOnPerfGrade =
    typeof argv['fail-on-perf-grade'] === 'string'
      ? (argv['fail-on-perf-grade'] as Grade)
      : config.failOn?.perfGrade;
  if (failOnPerfGrade && report.perf && !meetsGrade(report.perf.score.grade, failOnPerfGrade)) {
    fail(`perf grade ${report.perf.score.grade} is below --fail-on-perf-grade ${failOnPerfGrade}`);
  }

  // Per-plane gates. A secondary plane gates nothing unless the config asks:
  // the direct-connection surface is legitimately worse than the API's, and a
  // parity gate would only get the plane deleted.
  for (const [pattern, gate] of Object.entries(config.failOn?.planes ?? {})) {
    const planes = (report.planes ?? []).filter((p) => !p.skipped && matchPlane(pattern, p.name));
    for (const plane of planes) {
      if (gate.score != null && plane.score.value < gate.score) {
        fail(`plane ${plane.name} score ${plane.score.value} is below failOn.planes["${pattern}"].score ${gate.score}`);
      }
      if (gate.grade && !meetsGrade(plane.score.grade, gate.grade)) {
        fail(`plane ${plane.name} grade ${plane.score.grade} is below failOn.planes["${pattern}"].grade ${gate.grade}`);
      }
    }
  }

  const failOnNewPerf = argv['fail-on-new-perf'] === true || config.perf?.failOnNew === true;
  if (failOnNewPerf && report.perf?.diff && report.perf.diff.added.length > 0) {
    const count = report.perf.diff.added.length;
    gateFailures.push(...report.perf.diff.added);
    fail(
      `${count} new performance finding${count === 1 ? '' : 's'} since the perf baseline — fix them, or re-baseline with --write-perf-baseline to accept`
    );
  }

  if (
    (argv['fail-on-new-boundaries'] === true || config.callGraph?.failOnNew === true)
    && report.callGraphDiff
    && report.callGraphDiff.added.length > 0
  ) {
    fail(
      `${report.callGraphDiff.added.length} new trust boundar${report.callGraphDiff.added.length === 1 ? 'y' : 'ies'} since the baseline — review and re-baseline to accept`
    );
  }

  // GitHub output: on by default inside Actions, because a report nobody has
  // to wire up is a report people actually read.
  const githubConfig = config.report?.github;
  const githubMode =
    argv.github === true || (argv.github !== false && process.env.GITHUB_ACTIONS === 'true');
  const githubOptions = {
    ...(githubConfig ? { config: githubConfig } : {}),
    gateFailures,
    view: viewConfig
  };
  if (githubMode) {
    if (!emitGithub(report, githubOptions)) {
      log.warn('--github: no $GITHUB_STEP_SUMMARY in the environment — summary not written');
      process.stdout.write(`${renderGithubSummary(report, githubOptions)}\n`);
    }
  }

  if (outputs.githubComment !== undefined) {
    writeOut(outputs.githubComment, `${renderGithubComment(report, githubOptions)}\n`);
    log.info(`wrote github comment: ${outputs.githubComment}`);
  }

  if (argv['github-comment'] === true) {
    const result = await postStickyComment(renderGithubComment(report, githubOptions));
    if (result.posted) log.info('updated the safegres PR comment');
    else log.warn(`--github-comment: not posted — ${result.reason}`);
  }

  if (failed && argv['report-only'] !== true) process.exit(1);
  if (failed) log.warn('--report-only: gates failed, exiting 0');
};

/** Write an output file, creating its directory: CI should not have to mkdir. */
function writeOut(file: string, contents: string): void {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, contents);
}

/** A repeatable flag: `--plane a --plane b` (minimist gives an array). */
function listArg(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  return [];
}
