import type {
  CallGraphConfig,
  EvalConfig,
  ExposureConfig,
  ExtensionsConfig,
  FailOnConfig,
  GithubCommentConfig,
  GithubReportConfig,
  OutputsConfig,
  OverrideEntry,
  PerfConfig,
  PerfExplainConfig,
  PerfPathsConfig,
  PerfScoringConfig,
  PerfStatsConfig,
  PlaneConfig,
  PlaneFailOnConfig,
  PublicConfig,
  ReportConfig,
  SafegresConfig,
  ScoringConfig,
  SourceConfig
} from './types';

/**
 * The shape of the config file, as data: what an editor completes against
 * (JSON Schema, via `toJsonSchema`) and what a load validates against, from
 * one declaration.
 *
 * Drift is a compile error, not a stale file. `Shape<T>` maps over
 * `Required<T>`, so a key added to `SafegresConfig` that nobody described
 * here fails to typecheck — which is the only reason a hand-written schema
 * for a growing interface is defensible at all.
 */
export type Shape<T> = { [K in keyof Required<T>]: Node };

/** One described value. `any` is the honest answer for a live JS object. */
export type Node =
  | { type: 'any'; description: string }
  | { type: 'string'; description: string; enum?: readonly string[] }
  | { type: 'number'; description: string }
  | { type: 'boolean'; description: string }
  | { type: 'array'; description: string; items: Node }
  | { type: 'object'; description: string; properties: Record<string, Node> }
  /** A map with arbitrary keys — `rules`, `failOn.planes`, … */
  | { type: 'record'; description: string; values: Node }
  /** A key whose value may be more than one of the above. */
  | { type: 'union'; description: string; of: Node[] };

const str = (description: string, values?: readonly string[]): Node =>
  values ? { type: 'string', description, enum: values } : { type: 'string', description };
const num = (description: string): Node => ({ type: 'number', description });
const bool = (description: string): Node => ({ type: 'boolean', description });
const list = (description: string, items: Node): Node => ({ type: 'array', description, items });
const obj = <T>(description: string, properties: Shape<T>): Node => ({
  type: 'object',
  description,
  properties: properties as Record<string, Node>
});
const oneOf = (description: string, ...of: Node[]): Node => ({ type: 'union', description, of });

const GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;

/** `'off' | Severity | [Severity, options]`. */
const RULE_SETTING: Node = oneOf(
  'off, a severity, or [severity, options]',
  str('Rule setting', ['off', ...SEVERITIES]),
  list('Severity plus rule options', { type: 'any', description: 'Severity or options object' })
);

const RULES: Node = {
  type: 'record',
  description: 'Rule settings by code or prefix wildcard (A*, P*, *). Exact codes win.',
  values: RULE_SETTING
};

const PLANE: Shape<PlaneConfig> = {
  name: str('Plane identifier, e.g. api, direct:app, internal'),
  kind: str('What kind of access path this plane describes', ['api', 'role', 'schema']),
  primary: bool('Make this plane the headline score. At most one plane may claim it.'),
  schemas: list('Schemas this plane reaches', str('Schema name')),
  roles: list('Roles this plane grants access as', str('Role name')),
  anonRoles: list('The subset of roles reachable without authenticating', str('Role name'))
};

const EXPOSURE: Shape<ExposureConfig> = {
  resolver: str('How to resolve the exposed surface', ['static', 'constructive', 'postgraphile']),
  adapters: list(
    'Exposure adapters: built-in names, or ExposureAdapter objects in a JS/TS config',
    { type: 'any', description: 'Built-in name or adapter object' }
  ),
  schemas: list('Schemas reachable from the exposed APIs', str('Schema name')),
  roles: list('Roles reachable at the API edge', str('Role name')),
  anonRoles: list('The subset of roles an unauthenticated caller arrives as', str('Role name')),
  name: str('Name of the primary plane. Default api.'),
  reach: bool('Let adapters narrow a plane to the relations the API can address. Default true.'),
  planes: list('Additional access planes to grade', obj('One graded access plane', PLANE))
};

const SCORING: Shape<ScoringConfig> = {
  model: str('Scoring model. Default density.', ['density', 'weighted']),
  weights: { type: 'record', description: 'Points deducted per finding severity', values: num('Points') },
  perRuleWeights: { type: 'record', description: 'Per-rule weight, beating the severity weight', values: num('Points') },
  maxDeductionPerRule: num('Cap on one rule\u2019s total deduction (weighted model)'),
  failClosedWeight: num('Multiplier for fail-closed findings. Default 0.'),
  densityK: num('Density falloff constant. Default 0.17.'),
  unknownExposureCap: oneOf(
    'Maximum score when no exposure surface resolves. Default 80; false disables the cap.',
    num('Cap'),
    bool('false to disable')
  ),
  floorOnCritical: oneOf(
    'Grade any critical finding floors the score at. Default C; false disables.',
    str('Grade', GRADES),
    bool('false to disable')
  ),
  gradeBands: { type: 'record', description: 'Minimum score for each grade', values: num('Score') }
};

const PERF_SCORING: Shape<PerfScoringConfig> = {
  ...SCORING,
  includeStats: bool('Whether S* runtime-statistics findings count toward the perf score. Default true.')
};

const PERF_STATS: Shape<PerfStatsConfig> = {
  enabled: bool('Collect runtime statistics without passing --stats'),
  minRows: num('Ignore tables with fewer live rows than this. Default 1000.'),
  seqScanRatio: num('S1 fires above this seq-scan/index-scan ratio. Default 10.'),
  minIndexBytes: num('S2 ignores indexes smaller than this. Default 1048576.'),
  deadTupleRatio: num('S3 fires above this dead/live tuple ratio. Default 0.2.'),
  minTimeShare: num('S4 reports statements at or above this share of total time. Default 0.05.'),
  topStatements: num('S4 reports at most this many statements. Default 5.')
};

const PERF_EXPLAIN: Shape<PerfExplainConfig> = {
  enabled: bool('Probe findings with EXPLAIN without passing --explain'),
  minRows: num('Below this planner row estimate a seq scan is right. Default 1000.')
};

const PERF_PATHS: Shape<PerfPathsConfig> = {
  infer: bool('Collect access-path signals for every foreign key. Default true.'),
  minPointers: num('Write-once pointers before the config-record signal fires. Default 2.'),
  onWriteOncePointer: str('What X1 does with a shape-only write-once pointer', [
    'report',
    'demote',
    'suppress'
  ])
};

const PERF: Shape<PerfConfig> = {
  enabled: bool('Collect and score perf findings without passing --perf'),
  rules: RULES,
  ignore: list('Table globs whose perf findings are intentional', str('schema.table glob')),
  scoring: obj('Scoring for the perf axis', PERF_SCORING),
  stats: obj('Runtime statistics (S*)', PERF_STATS),
  explain: obj('Planner proof (--explain)', PERF_EXPLAIN),
  baseline: str('Baseline of accepted perf debt; its presence enables the diff'),
  failOnNew: bool('Exit non-zero on a perf finding absent from the baseline'),
  paths: obj('Access-path classification, which decides whether X1 applies', PERF_PATHS)
};

const FAIL_ON_PLANE: Shape<PlaneFailOnConfig> = {
  score: num('Exit non-zero below this plane score'),
  grade: str('Exit non-zero below this plane grade', GRADES)
};

const FAIL_ON: Shape<FailOnConfig> = {
  severity: str('Exit non-zero on any finding at or above this severity', SEVERITIES),
  score: num('Exit non-zero below this security score'),
  grade: str('Exit non-zero below this security grade', GRADES),
  perfScore: num('Exit non-zero below this perf score'),
  perfGrade: str('Exit non-zero below this perf grade', GRADES),
  planes: {
    type: 'record',
    description: 'Per-plane gates, keyed by plane name. A floor is the useful shape.',
    values: obj('One plane gate', FAIL_ON_PLANE)
  }
};

const GITHUB_COMMENT: Shape<GithubCommentConfig> = {
  sticky: bool('Reuse one comment per PR instead of appending. Default true.'),
  sections: list(
    'Sections to include. Default scores, delta, new-findings.',
    str('Section', ['scores', 'delta', 'new-findings', 'findings', 'planes'])
  )
};

const GITHUB: Shape<GithubReportConfig> = {
  summary: list('Scores in the job summary, in order (security, perf, planes:<glob>)', str('Score')),
  comment: obj('Sticky PR comment', GITHUB_COMMENT),
  annotations: str('Which findings become annotations. Default gate-failures.', [
    'all',
    'gate-failures',
    'none'
  ]),
  detail: str('How much of the report goes in the job summary. Default normal.', [
    'summary',
    'normal',
    'verbose'
  ]),
  badges: bool('Render scores as colored shields.io badges. Default true.')
};

const REPORT: Shape<ReportConfig> = {
  planes: list('Planes to render, by name or glob', str('Plane name or glob')),
  dimensions: list('Dimensions to render. Default both.', str('Dimension', ['security', 'perf'])),
  github: obj('GitHub Actions output', GITHUB)
};

const OVERRIDE: Shape<OverrideEntry> = {
  tables: list('schema.table globs this entry applies to', str('schema.table glob')),
  rules: RULES
};

const OUTPUTS: Shape<OutputsConfig> = {
  dir: str('Write safegres.{json,md,sarif} into this directory'),
  json: str('Path for the JSON report'),
  markdown: str('Path for the Markdown report'),
  sarif: str('Path for the SARIF report'),
  sarifSources: str('Root scanned to resolve SARIF findings to SQL source lines'),
  snapshot: str('Path for the aggregate-only snapshot, for a later compare'),
  githubComment: str('Path for the rendered sticky PR comment')
};

const SOURCE: Shape<SourceConfig> = {
  pgpm: str('Deploy the pgpm workspace at this path into an ephemeral database and audit it')
};

const CALL_GRAPH: Shape<CallGraphConfig> = {
  enabled: bool('Build the call-graph audit without passing --call-graph'),
  baseline: str('Baseline of accepted trust boundaries; enables the diff'),
  failOnNew: bool('Exit non-zero on a boundary absent from the baseline')
};

const EVAL: Shape<EvalConfig> = {
  corpus: str('Corpus directory of <id>/{case.json,schema.sql}'),
  preset: str('Preset every case is graded under. Default recommended.'),
  cases: list('Case ids (or id prefixes) to run', str('Case id'))
};

const PUBLIC: Shape<PublicConfig> = {
  read: list('Table globs whose open SELECT policies are by design', str('schema.table glob'))
};

const EXTENSIONS: Shape<ExtensionsConfig> = {
  skipOwned: bool('Skip relations an extension owns. Default true.'),
  ignore: list('Extension names whose schemas are skipped wholesale', str('Extension name'))
};

/** The config file, described. */
export const CONFIG_SHAPE: Shape<SafegresConfig> = {
  extends: oneOf(
    'Presets (safegres:recommended, \u2026), relative file paths, or npm packages',
    str('Preset name, path, or package'),
    list('Several, lowest precedence first', str('Preset name, path, or package'))
  ),
  exposure: obj('The exposed API surface \u2014 what the score is computed against', EXPOSURE),
  public: obj('Declared-public surface: open reads that are deliberate', PUBLIC),
  extensions: obj('How to treat objects belonging to installed extensions', EXTENSIONS),
  perf: obj('The optional performance dimension', PERF),
  schemas: list('Only audit these schemas', str('Schema name')),
  excludeSchemas: list('Never audit these schemas', str('Schema name')),
  roles: list('Only audit these roles', str('Role name')),
  excludeRoles: list('Never audit these roles', str('Role name')),
  rules: RULES,
  overrides: list('Per-scope retuning, ESLint overrides-style', obj('One override', OVERRIDE)),
  scoring: obj('The security scoring model', SCORING),
  failOn: obj('Gates \u2014 what makes the run exit non-zero', FAIL_ON),
  source: obj('Where the database to audit comes from', SOURCE),
  outputs: obj('Files a single run writes', OUTPUTS),
  callGraph: obj('The unscored call-graph audit and its baseline', CALL_GRAPH),
  report: obj('What a rendered report shows \u2014 selection, not analysis', REPORT),
  eval: obj('Defaults for safegres eval', EVAL)
};

export const SCHEMA_ID = 'https://raw.githubusercontent.com/constructive-io/constructive/main/packages/safegres/schema/safegres.schema.json';

/** The described shape as a draft-07 JSON Schema, for editors. */
export function toJsonSchema(): Record<string, unknown> {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: SCHEMA_ID,
    title: 'safegres configuration',
    description:
      'Configuration for safegres, the PostgreSQL security and performance auditor. '
      + 'Discovered as safegres.config.{ts,js,mjs,cjs}, .safegresrc{,.json,.yaml,.yml,.js}, '
      + 'safegres.json, or the "safegres" key in package.json.',
    type: 'object',
    additionalProperties: false,
    properties: {
      $schema: { type: 'string', description: 'JSON Schema reference, for editor completion.' },
      ...objectProperties(CONFIG_SHAPE as Record<string, Node>)
    }
  };
}

function objectProperties(shape: Record<string, Node>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, node] of Object.entries(shape)) out[key] = jsonNode(node);
  return out;
}

function jsonNode(node: Node): Record<string, unknown> {
  const description = node.description;
  switch (node.type) {
  case 'any':
    return { description };
  case 'string':
    return node.enum ? { type: 'string', enum: [...node.enum], description } : { type: 'string', description };
  case 'number':
  case 'boolean':
    return { type: node.type, description };
  case 'array':
    return { type: 'array', items: jsonNode(node.items), description };
  case 'object':
    return {
      type: 'object',
      additionalProperties: false,
      properties: objectProperties(node.properties),
      description
    };
  case 'record':
    return { type: 'object', additionalProperties: jsonNode(node.values), description };
  case 'union':
    return { anyOf: node.of.map(jsonNode), description };
  }
}
