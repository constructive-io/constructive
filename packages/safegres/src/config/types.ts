import type { ExposureAdapter } from '../exposure/adapters';
import type { Dimension, Direction, Severity } from '../types';

/**
 * `'off'` disables a rule; a severity retunes it; `[severity, options]`
 * reserves room for rule-specific options (forward-compatible).
 */
export type RuleSetting = 'off' | Severity | [Severity, Record<string, unknown>];

/**
 * Rule settings keyed by rule code or prefix wildcard (`A*`, `P*`, `*`).
 * Exact codes always win over wildcards.
 */
export type RulesConfig = Record<string, RuleSetting>;

/** Per-scope retuning, ESLint `overrides`-style. */
export interface OverrideEntry {
  /**
   * Glob patterns matched against the qualified `schema.table` name
   * (`*` matches any run of characters), e.g. `public.audit_log`, `metrics.*`.
   */
  tables: string[];
  rules: RulesConfig;
}

export type Grade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * The exposure surface: what is actually reachable through the exposed APIs.
 * Findings on non-exposed schemas contribute nothing to the score — they are
 * reported as internal advisories. When no surface is configured or
 * resolvable, the whole database is assumed reachable, a W1 warning is
 * emitted, and the score is capped.
 */
export interface ExposureConfig {
  /**
   * How to resolve the surface:
   * - `static` (default): use `schemas` / `roles` as given.
   * - `constructive`: introspect the Constructive routing plane
   *   (`routing_public.apis` → `api_schemas` → `metaschema_public.schema`,
   *   plus the platform plane) to discover exposed schemas and API roles.
   *
   * - `postgraphile`: contribute no planes, but read behavior tags so the
   *   planes another resolver or `schemas` establishes are narrowed from
   *   "every relation in the schema" to the relations the generated API can
   *   address. Pair it with `schemas`, or use it alone for the reach only.
   *
   * Equivalent to listing the corresponding built-in in `adapters`.
   */
  resolver?: 'static' | 'constructive' | 'postgraphile';
  /**
   * Exposure adapters: objects implementing `ExposureAdapter`, or the name of
   * a built-in (`'constructive'`, `'postgraphile'`). An adapter whose `detect()` succeeds
   * contributes planes; static `schemas`/`roles` extend, never replace, what
   * it found. Adapters are values, not module names — a custom one is an
   * object you construct, and nothing is resolved by package name.
   */
  adapters?: Array<string | ExposureAdapter>;
  /** Schemas reachable from the exposed APIs (static resolver). */
  schemas?: string[];
  /** Roles reachable from the API edge (static resolver). */
  roles?: string[];
  /**
   * The subset of `roles` an unauthenticated caller arrives as. Adapters
   * resolve this themselves (`apis.anon_role`, `pgrst.db_anon_role`, ...);
   * set it only for a surface you are declaring statically.
   */
  anonRoles?: string[];
  /** Name of the primary plane. Default `api`. */
  name?: string;
  /**
   * Let adapters narrow a plane's reach from its schemas to the relations the
   * generated API can actually address (`postgraphile` reads behavior tags for
   * this). Default `true`; an adapter that cannot answer changes nothing.
   *
   * Set `false` to grade every relation in an exposed schema as exposed, which
   * is the safer reading if you do not trust your behavior declarations.
   */
  reach?: boolean;
  /**
   * Additional access planes to grade: the ways into the database that are
   * not the declared API. Each is scored on the security axis with the same
   * model, reported alongside the primary plane, and — unless `failOn.planes`
   * says otherwise — gates nothing.
   */
  planes?: PlaneConfig[];
}

/** What kind of access path a plane describes. */
export type PlaneKind = 'api' | 'role' | 'schema';

/**
 * One graded access plane. `api`/`schema` planes are a set of schemas; a
 * `role` plane is whatever its roles can effectively reach (direct grants,
 * grants TO PUBLIC, and role inheritance), so it never has to be kept in
 * sync with a schema list by hand.
 */
export interface PlaneConfig {
  /** Plane identifier, e.g. `api`, `direct:app`, `internal`. */
  name: string;
  /** Default: `role` when `roles` is set and `schemas` is not, else `schema`. */
  kind?: PlaneKind;
  /**
   * Make this plane the headline score (`report.score`). At most one plane
   * may claim it; declaring two is a configuration error rather than a
   * silent pick. Default: the declared API surface is primary.
   */
  primary?: boolean;
  schemas?: string[];
  roles?: string[];
  /** The subset of `roles` reachable without authenticating. */
  anonRoles?: string[];
}

/**
 * Declared-public surface: intent, stated in config. Open reads on declared
 * tables are acknowledged — reported as info and excluded from the score.
 * Open reads anywhere else stay findings, even in `*_public`-named schemas;
 * naming is never treated as intent.
 */
export interface PublicConfig {
  /**
   * Glob patterns matched against the qualified `schema.table` name
   * (`*` matches any run of characters) for tables whose open SELECT
   * (`USING (true)`) policies are by design, e.g. reference/pricing tables
   * or a deliberate public directory.
   */
  read?: string[];
}

export interface ScoringConfig {
  /**
   * Scoring model:
   * - `density` (default): severity-weighted findings per exposed table with
   *   exponential falloff — does not saturate on large schemas.
   * - `weighted`: legacy flat deductions with a per-rule cap.
   */
  model?: 'density' | 'weighted';
  /** Points deducted per finding of each severity. */
  weights?: Partial<Record<Severity, number>>;
  /** Per-rule weight override — beats the severity weight. */
  perRuleWeights?: Record<string, number>;
  /** Cap on total deduction any single rule can contribute (weighted model). */
  maxDeductionPerRule?: number;
  /**
   * Cap on any single rule's contribution (density model), as a fraction of
   * the points that would take the score to F on their own. Default 0.5 — one
   * rule at its cap costs two grade bands, and an F still takes breadth.
   *
   * The density curve has no natural ceiling, so before this a rule's weight
   * and its *fan-out* were indistinguishable: L19 emitting one finding per
   * (relation × function) pair took a real audit from A+ to F on one severity
   * notch. `false` removes the cap.
   */
  maxRuleDensity?: number | false;
  /**
   * Multiplier applied to fail-closed findings' weights (density model).
   * Default 0 — denied-at-runtime hygiene findings don't reduce the score.
   */
  failClosedWeight?: number;
  /** Density falloff constant (density model). Default 0.17. */
  densityK?: number;
  /**
   * Maximum score when no exposure surface is configured/resolvable.
   * Default 80. `false` disables the cap.
   */
  unknownExposureCap?: number | false;
  /** Any finding at/above this severity caps the grade (e.g. 'critical' -> 'C'). */
  floorOnCritical?: Grade | false;
  /** Minimum score for each grade; anything below the lowest is 'F'. */
  gradeBands?: Partial<Record<Exclude<Grade, 'F'>, number>>;
}

/**
 * A named score over a slice of the findings: a selector plus the weighting
 * to grade what it selects with. Every scoring key is available per card, so
 * a scorecard is a full `ScoringConfig` with a question attached.
 *
 * The point is that "how secure is this database" is not one question. A
 * platform team gates on what `anonymous` reaches; an application team gates
 * on house style; a compliance reviewer wants the number that no preset
 * softened. Collapsing those into a single grade means at least two of them
 * are reading a number that does not answer their question — and the first
 * time it disagrees with their judgement, they stop reading it at all.
 *
 * ```jsonc
 * "scorecards": {
 *   "anon-surface": {
 *     "description": "What an unauthenticated caller reaches.",
 *     "select": { "roles": ["anonymous"], "direction": "fail-open" },
 *     "perRuleWeights": { "L19": 10 },
 *     "floorOnCritical": "C"
 *   },
 *   "sql-conventions": { "select": { "rules": ["C*"], "exposure": "all" } }
 * }
 * ```
 *
 * Findings are never filtered by a scorecard — only *scored* by one. The
 * report always carries every finding, so no configuration of this block can
 * hide anything; it can only decide what a given number is about.
 */
export interface ScorecardConfig extends ScoringConfig {
  /** Heading for reports. Defaults to the config key. */
  title?: string;
  /** What decision this score informs. Rendered with it. */
  description?: string;
  /** Which findings it grades. An empty selector grades what the headline does. */
  select?: ScorecardSelector;
}

/**
 * Which findings a scorecard grades. Every clause narrows; omitting one
 * means "don't care", and an empty selector is the headline's own slice
 * (exposed, non-acknowledged, security-dimension).
 */
export interface ScorecardSelector {
  /** Rule codes or `C*` prefix wildcards to include. Default: all. */
  rules?: string[];
  /** Rule codes or wildcards to drop after `rules` has selected. */
  exclude?: string[];
  /** `security` (default), `perf`, or `all` — the two axes in one number. */
  dimension?: Dimension | 'all';
  /** Only findings about these roles (the finding's role, grantee, or reach context). */
  roles?: string[];
  /** Only findings reachable on these access planes. */
  planes?: string[];
  /** Only findings in these schemas. */
  schemas?: string[];
  /** `fail-open` leaks, `fail-closed` denials, or `any`. Default: any. */
  direction?: Direction | 'any';
  /** Drop findings below this severity before scoring. */
  minSeverity?: Severity;
  /**
   * `exposed` (default) grades only what the API surface reaches; `all`
   * ignores exposure entirely — the honest, database-to-database number.
   */
  exposure?: 'exposed' | 'all';
  /** `include` grades acknowledged findings too. Default: skip them. */
  acknowledged?: 'skip' | 'include';
  /**
   * `configured` (default) uses the severities this config resolved;
   * `declared` uses each rule's registry default, so a preset that quiets a
   * rule cannot quiet the score that is supposed to catch it.
   */
  severities?: 'configured' | 'declared';
  /**
   * Density denominator: `exposed` relations (default) or `all` of them.
   * A card that ignores exposure should normalize by everything, or it
   * divides a wider numerator by a narrower denominator.
   */
  denominator?: 'exposed' | 'all';
}

/**
 * The optional performance dimension: index-hygiene and policy-cost rules
 * (`X*`, plus P1/P1b), scored on their own axis against the same exposure
 * surface. Off by default — `safegres perf` / `--perf` / `enabled: true`.
 */
export interface PerfConfig {
  /** Collect and score perf findings without passing `--perf`. */
  enabled?: boolean;
  /**
   * Rule settings for perf-dimension codes only. Applied on top of the
   * top-level `rules`; naming a security rule here is a config error.
   */
  rules?: RulesConfig;
  /**
   * Glob patterns matched against the qualified `schema.table` name for
   * tables whose perf findings are intentional (cold audit logs, tiny
   * lookup tables the planner will seq-scan anyway). Acknowledged findings
   * are reported as info and excluded from the perf score.
   */
  ignore?: string[];
  /** Scoring settings for the perf axis (defaults mirror the security score). */
  scoring?: PerfScoringConfig;
  /** Runtime statistics (`--stats`, `S*`). Off unless enabled here or by flag. */
  stats?: PerfStatsConfig;
  /** Planner proof (`--explain`). Off unless enabled here or by flag. */
  explain?: PerfExplainConfig;
  /**
   * Baseline of accepted perf debt. Present → the run diffs against it, the
   * same as `--perf-baseline`. Writing one stays a flag (`--write-perf-baseline`):
   * accepting debt is an act, not a setting.
   */
  baseline?: string;
  /** Exit non-zero on a perf finding that isn't in the baseline. */
  failOnNew?: boolean;
  /** Access-path classification, which decides whether X1 applies to a key. */
  paths?: PerfPathsConfig;
}

export interface PerfPathsConfig {
  /**
   * Collect access-path signals for every foreign key. Default true. Signals
   * are reported, and by default change no finding and no score; set false to
   * skip the introspection entirely.
   */
  infer?: boolean;
  /**
   * Write-once pointers a table needs before the `config-record` signal fires.
   * Default 2. Raise it for a narrower signal.
   */
  minPointers?: number;
  /**
   * What X1 does with a key whose only evidence is shape — it looks like a
   * write-once provisioning pointer, but nothing has proven the path is
   * unreachable.
   *
   * - `report` (default) — the finding stands, with the signals attached.
   * - `demote` — the finding drops to `info`, so it is read rather than gated
   *   on and contributes nothing to the score.
   * - `suppress` — no finding. Only defensible once you know the generated API
   *   does not expose these relations; a shape is not a proof.
   */
  onWriteOncePointer?: 'report' | 'demote' | 'suppress';
}

export interface PerfScoringConfig extends ScoringConfig {
  /**
   * Whether runtime-statistics findings (`S*`) count toward the perf score.
   * Default true — asking for `--stats` is the opt-in. Set false to keep the
   * grade purely deterministic and read the `S*` findings as advisories.
   */
  includeStats?: boolean;
}

/**
 * Thresholds for the runtime-statistics rules. Every one is a floor: below
 * it the workload hasn't said enough for the finding to mean anything.
 */
export interface PerfStatsConfig {
  /** Collect and check runtime statistics without passing `--stats`. */
  enabled?: boolean;
  /** Ignore tables with fewer live rows than this. Default 1000. */
  minRows?: number;
  /** S1 fires when sequential scans exceed index scans by this factor. Default 10. */
  seqScanRatio?: number;
  /** S2 ignores indexes smaller than this many bytes. Default 1048576 (1 MiB). */
  minIndexBytes?: number;
  /** S3 fires above this dead/live tuple ratio. Default 0.2. */
  deadTupleRatio?: number;
  /** S4 fires for statements at or above this share of total time. Default 0.05. */
  minTimeShare?: number;
  /** S4 reports at most this many statements. Default 5. */
  topStatements?: number;
}

export interface PerfExplainConfig {
  /** Probe findings with EXPLAIN without passing `--explain`. */
  enabled?: boolean;
  /**
   * Below this planner row estimate a sequential scan is the right plan, so a
   * probe can refute a finding but never confirm one. Default 1000.
   */
  minRows?: number;
}

/**
 * Extension objects are a database's `node_modules`: they live in the same
 * catalog and scan like anything else, but they are the extension author's
 * to secure and tune, and altering them breaks `pg_dump` and upgrades.
 */
export interface ExtensionsConfig {
  /**
   * Skip relations an extension owns (`pg_depend.deptype = 'e'`) and their
   * partitions. Default `true`. Set `false` to audit them anyway — useful
   * when auditing an extension itself.
   */
  skipOwned?: boolean;
  /**
   * Extension names whose *schemas* are skipped wholesale, for objects an
   * extension creates at runtime and never registers as dependencies.
   * `pg_partman` is the motivating case: its child partitions and templates
   * carry no dependency on the extension, so ownership alone misses them.
   * Unknown or uninstalled names are ignored.
   */
  ignore?: string[];
}

export interface FailOnConfig {
  /** Exit non-zero if any finding is at/above this severity. */
  severity?: Severity;
  /** Exit non-zero if the score is below this value (0-100). */
  score?: number;
  /** Exit non-zero if the grade is below this letter. */
  grade?: Grade;
  /** Exit non-zero if the perf score is below this value (0-100). */
  perfScore?: number;
  /** Exit non-zero if the perf grade is below this letter. */
  perfGrade?: Grade;
  /**
   * Per-plane gates, keyed by plane name. Secondary planes gate nothing by
   * default: an internal role legitimately reaches internal tables, so its
   * plane scores worse than the API's by construction and gating it at parity
   * would only force the plane to be deleted. A floor (`{ grade: 'D' }`) is
   * the useful shape — the direct-connection surface may be a D, but it may
   * not become an F.
   */
  planes?: Record<string, PlaneFailOnConfig>;
  /**
   * Per-scorecard gates, keyed by scorecard name. This is where a team's own
   * question becomes its own build failure — `{ "anon-surface": { "grade": "A" } }`
   * gates on that and nothing else.
   */
  scorecards?: Record<string, PlaneFailOnConfig>;
}

export interface PlaneFailOnConfig {
  /** Exit non-zero if the plane's score is below this value (0-100). */
  score?: number;
  /** Exit non-zero if the plane's grade is below this letter. */
  grade?: Grade;
}

/** Which scores and sections a rendered report shows. */
/**
 * The database under audit. A repository that always audits the same thing —
 * a pgpm workspace deployed into an ephemeral database — should say so once,
 * in the file, rather than in every invocation.
 */
export interface SourceConfig {
  /**
   * Deploy the pgpm workspace or module at this path (relative to the config
   * file) into an ephemeral test database and audit that. Equivalent to
   * `--pgpm <dir>`; requires the optional peer dependency `pgsql-test`.
   * A connection named on the command line (`--connection`, `--database`,
   * `--host`, `--port`) wins: the same config then audits that database.
   */
  pgpm?: string;
}

/**
 * Files one run writes. Paths are relative to the config file, and the
 * directories are created as needed: the point is that a CI job is
 * `safegres audit`, with the artifact list versioned alongside the rules.
 */
export interface OutputsConfig {
  /**
   * Write the whole set into one directory as `safegres.json`, `safegres.md`
   * and `safegres.sarif`. The usual case, and nobody has to remember three
   * paths; the keys below still override an individual file.
   */
  dir?: string;
  json?: string;
  markdown?: string;
  sarif?: string;
  /** Root scanned to resolve SARIF findings to their SQL source lines. */
  sarifSources?: string;
  /** Aggregate-only snapshot, for a later run's `compare`. */
  snapshot?: string;
  /** The rendered sticky PR comment, for a workflow that posts it itself. */
  githubComment?: string;
}

export interface CallGraphConfig {
  /** Build the call-graph audit without passing `--call-graph`. */
  enabled?: boolean;
  /** Baseline of accepted trust boundaries; enables the diff. */
  baseline?: string;
  /** Exit non-zero on a boundary that isn't in the baseline. */
  failOnNew?: boolean;
}

export interface ReportConfig {
  /**
   * Planes to render, by name or glob (`primary`, `*`, `direct:*`). Default:
   * the primary plane in full, secondaries as a one-line advisory.
   */
  planes?: string[];
  /** Dimensions to render. Default: both. */
  dimensions?: Array<'security' | 'perf'>;
  /** GitHub Actions output (job summary, annotations, PR comment). */
  github?: GithubReportConfig;
}

/**
 * What the GitHub integration emits. Defaults render both headline scores,
 * the delta against the compared run, and annotations for gate failures only.
 */
export interface GithubReportConfig {
  /**
   * Scores in the job summary, in order. `security`, `perf`, and
   * `planes:<glob>` for secondary planes (e.g. `planes:direct:*`).
   * Default `['security', 'perf']`.
   */
  summary?: string[];
  /** Sticky PR comment. */
  comment?: GithubCommentConfig;
  /** Which findings become workflow annotations. Default `gate-failures`. */
  annotations?: 'all' | 'gate-failures' | 'none';
  /**
   * How much of the report goes in the job summary. Default `normal`. Set
   * `summary` on a database with thousands of findings: GitHub truncates a job
   * summary at 1 MB, and a truncated report is worse than a short one.
   */
  detail?: 'summary' | 'normal' | 'verbose';
  /**
   * Render scores as colored shields.io badges. Default `true`; `false` falls
   * back to 🟢/🟡/🔴 text, which needs no network fetch.
   */
  badges?: boolean;
}

export interface GithubCommentConfig {
  /** Reuse one comment per PR instead of appending. Default `true`. */
  sticky?: boolean;
  /**
   * Sections to include, in this order: `scores` (badges + exposure), `planes`,
   * `delta`, `new-findings` (the perf ratchet verdict and what it caught), and
   * `report` — the same markdown report the job summary carries, at `detail`.
   * `findings` is the old name for `report`. Default
   * `['scores', 'delta', 'new-findings']`; add `report` to review the audit
   * without leaving the PR.
   */
  sections?: Array<'scores' | 'delta' | 'new-findings' | 'report' | 'findings' | 'planes'>;
  /**
   * How much of the report the `report` section carries. Default `summary` —
   * scores, exposure, counts, the delta and the ratchet verdict, with no
   * per-finding tables, because a comment is read on the way past and GitHub
   * rejects a body over 64 KB. `normal`/`verbose` add the finding tables and
   * degrade back to `summary` when the body would not fit.
   */
  detail?: 'summary' | 'normal' | 'verbose';
}

/**
 * The full safegres configuration, loadable from `safegres.config.{ts,js,mjs,cjs}`,
 * `.safegresrc{,.json,.yaml,.yml,.js}`, `safegres.json`, or the `"safegres"`
 * key in package.json.
 */
export interface SafegresConfig {
  /**
   * Presets (`safegres:recommended`, …), relative paths (`./safegres.base.json`),
   * or npm packages — recursively, lowest precedence first.
   *
   * A path is resolved against the file that declared it, and so is every
   * *path-valued* key inherited from it (`source.pgpm`, `perf.baseline`,
   * `outputs.*`, `eval.corpus`): a baseline written in a shared base file means
   * that file's directory, whichever job inherited it. Objects merge per key
   * and arrays replace, except `overrides`, which is a list of scoped
   * exceptions and so unions across the chain.
   */
  extends?: string | string[];
  /** The exposed API surface — what the score is computed against. */
  exposure?: ExposureConfig;
  /** Tables whose open reads are deliberate (declared public surface). */
  public?: PublicConfig;
  /** How to treat objects belonging to installed extensions. */
  extensions?: ExtensionsConfig;
  /** The optional performance dimension. */
  perf?: PerfConfig;
  schemas?: string[];
  excludeSchemas?: string[];
  roles?: string[];
  excludeRoles?: string[];
  rules?: RulesConfig;
  overrides?: OverrideEntry[];
  scoring?: ScoringConfig;
  /**
   * Named scores over slices of the same findings — see `ScorecardConfig`.
   * Merged with the reserved `default` and `raw` cards, which always run.
   */
  scorecards?: Record<string, ScorecardConfig>;
  failOn?: FailOnConfig;
  /** Where the database to audit comes from, when it isn't a live connection. */
  source?: SourceConfig;
  /** Files a single run writes, so CI doesn't have to spell them as flags. */
  outputs?: OutputsConfig;
  /** The unscored call-graph audit (`--call-graph`) and its baseline. */
  callGraph?: CallGraphConfig;
  /** What a rendered report shows — selection, not analysis. */
  report?: ReportConfig;
  /** Defaults for `safegres eval` — which corpus, graded by which preset. */
  eval?: EvalConfig;
}

/**
 * `safegres eval` defaults. Deliberately only says *what* to run: a case is
 * graded by a named preset, never by the rest of this file, so a project can
 * point eval at its own corpus without also being able to move the answers.
 */
export interface EvalConfig {
  /** Corpus directory of `<id>/{case.json,schema.sql}`. Defaults to the shipped one. */
  corpus?: string;
  /** Preset every case is graded under. Defaults to `recommended`. */
  preset?: string;
  /** Case ids (or id prefixes) to run. Defaults to all of them. */
  cases?: string[];
}
