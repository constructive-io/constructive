export type CacheMode = 'old' | 'new';
export type RoutingMode = 'private' | 'public';

export interface PerfPaths {
  repoRoot: string;
  serverDir: string;
  perfDir: string;
}

export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | boolean>;
  raw: string[];
}

export interface CommandContext {
  args: string[];
  paths: PerfPaths;
  dryRun: boolean;
}

export interface CommandDefinition {
  name: string;
  summary: string;
  usage?: string;
  run: (ctx: CommandContext) => Promise<void>;
}

export interface PerfCliOptions {
  paths?: PerfPaths;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

export interface RunProcessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  dryRun?: boolean;
  label?: string;
}

export interface JsonHttpResult {
  ok: boolean;
  status: number;
  elapsedMs: number;
  json?: unknown;
  text?: string;
  error?: string;
}

export interface E2eMatrixResetResult {
  after: string;
  before: string;
  ok: boolean;
  reportPath: string;
  failureCount?: number;
  error?: string;
}

export interface E2eMatrixCaseResult {
  routingMode: RoutingMode;
  cacheMode: CacheMode;
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  resultPath?: string;
  reportExists?: boolean;
  memoryBeforePath?: string;
  memoryBeforeOk?: boolean;
  memoryAfterPath?: string;
  memoryAfterOk?: boolean;
  errors?: number;
  failed?: number;
  totalRequests?: number;
  qps?: number;
  p95Ms?: number | null;
  p99Ms?: number | null;
  heapDeltaMb?: number;
  resetAfter?: E2eMatrixResetResult;
  hardGateFailures?: string[];
  error?: string;
}
