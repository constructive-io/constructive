import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { armEnvironmentForHeap, resolveTemplate } from './config';
import type { ArmPlan, ArmProvenance, NodeV8Profile } from './types';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_OLD_SPACE_OPTION = /^--max(?:-|_)old(?:-|_)space(?:-|_)size(?:=(.*))?$/;
const MANAGED_V8_OPTION =
  /^--(?:no[-_])?(?:jitless|optimize[-_]for[-_]size|max[-_]opt)(?:=.*)?$/;
const V8_PROFILE_FLAGS: Readonly<Record<NodeV8Profile, readonly string[]>> = Object.freeze({
  stock: Object.freeze([]),
  'optimize-for-size': Object.freeze(['--optimize-for-size']),
  'baseline-optimize-for-size': Object.freeze([
    '--max-opt=1',
    '--optimize-for-size'
  ]),
  'jitless-optimize-for-size': Object.freeze(['--jitless', '--optimize-for-size'])
});

export interface ArmProcess {
  pid: number | null;
  external: boolean;
  exit: { code: number | null; signal: NodeJS.Signals | null } | null;
  expectedHeapLimitBytes: number | null;
  observabilityHeaders: Readonly<Record<string, string>>;
  provenance: ArmProvenance;
  provenanceErrors: string[];
  stop(): Promise<void>;
}

interface ProvenanceResult {
  provenance: ArmProvenance;
  errors: string[];
}

/** Ephemeral credentials for one spawned arm; never serialize this object. */
export const createObservabilityHeaders = (): Readonly<Record<string, string>> => Object.freeze({
  Authorization: `Bearer ${randomBytes(32).toString('base64url')}`
});

const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');

export const tokenizeNodeOptions = (input: string): string[] => {
  const tokens: string[] = [];
  let token = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let started = false;

  for (const character of input) {
    if (escaped) {
      token += character;
      escaped = false;
      started = true;
    } else if (character === '\\') {
      escaped = true;
      started = true;
    } else if (quote) {
      if (character === quote) quote = null;
      else token += character;
    } else if (character === '"' || character === "'") {
      quote = character;
      started = true;
    } else if (/\s/.test(character)) {
      if (started) {
        tokens.push(token);
        token = '';
        started = false;
      }
    } else {
      token += character;
      started = true;
    }
  }
  if (escaped || quote) throw new Error('NODE_OPTIONS contains an unterminated escape or quote');
  if (started) tokens.push(token);
  return tokens;
};

const quoteNodeOption = (option: string): string => {
  if (/^[^\s"'\\]+$/.test(option)) return option;
  return `"${option.replace(/(["\\])/g, '\\$1')}"`;
};

export const nodeFlagsForV8Profile = (profile: NodeV8Profile): string[] => {
  const flags = V8_PROFILE_FLAGS[profile];
  if (!flags) throw new Error(`unknown Node V8 profile '${profile}'`);
  return [...flags];
};

/** Remove every inherited old-space flag before installing the requested limit. */
export const replaceMaxOldSpaceSize = (nodeOptions: string | undefined, heapMiB: number): string => {
  if (!Number.isSafeInteger(heapMiB) || heapMiB <= 0) {
    throw new Error(`heapMiB must be a positive integer, received ${heapMiB}`);
  }
  const input = nodeOptions?.trim() ? tokenizeNodeOptions(nodeOptions) : [];
  const retained: string[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const match = MAX_OLD_SPACE_OPTION.exec(input[index]);
    if (MANAGED_V8_OPTION.test(input[index])) continue;
    if (!match) {
      retained.push(input[index]);
      continue;
    }
    if (match[1] === undefined && index + 1 < input.length && /^\d+$/.test(input[index + 1])) {
      index += 1;
    }
  }
  retained.push(`--max-old-space-size=${heapMiB}`);
  return retained.map(quoteNodeOption).join(' ');
};

export const expectedHeapLimitForNodeOptions = (
  nodeOptions: string,
  nodeExecutable = process.execPath,
  directNodeFlags: readonly string[] = []
): number => {
  const result = spawnSync(
    nodeExecutable,
    [
      ...directNodeFlags,
      '-e',
      'process.stdout.write(String(require("node:v8").getHeapStatistics().heap_size_limit))'
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: nodeOptions },
      timeout: 15_000
    }
  );
  const limit = Number(result.stdout?.trim());
  if (result.status !== 0 || !Number.isSafeInteger(limit) || limit <= 0) {
    const detail = result.error?.message || result.stderr?.trim() || `exit=${result.status}`;
    throw new Error(`could not resolve expected V8 heap limit: ${detail}`);
  }
  return limit;
};

const gitOutput = (cwd: string, args: string[]): string | null => {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    timeout: 30_000
  });
  return result.status === 0 ? result.stdout.trimEnd() : null;
};

const regularFile = (file: string): boolean => {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

const resolveEntryPath = (command: string[], cwd: string): string | null => {
  const executable = path.basename(command[0] ?? '').toLowerCase();
  const candidates = executable === 'node' || executable === 'node.exe'
    ? command.slice(1).filter((part) => !part.startsWith('-'))
    : command;
  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
    if (regularFile(resolved)) return fs.realpathSync(resolved);
  }
  return null;
};

const directNodeExecArgv = (command: string[], cwd: string): string[] => {
  const executable = path.basename(command[0] ?? '').toLowerCase();
  if (executable !== 'node' && executable !== 'node.exe') return [];
  for (let index = 1; index < command.length; index++) {
    const candidate = command[index];
    if (candidate.startsWith('-')) continue;
    const resolved = path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
    if (regularFile(resolved)) return command.slice(1, index);
  }
  return command.slice(1).filter((argument) => argument.startsWith('-'));
};

interface NodeRuntimeProvenance {
  v8Profile: NodeV8Profile;
  nodeOptions: string | null;
  nodeOptionsArgv: string[];
  nodeExecArgv: string[];
}

export const collectArmProvenance = (
  cwd: string,
  command: string[],
  serverPid: number | null,
  runtime: NodeRuntimeProvenance = {
    v8Profile: 'stock',
    nodeOptions: null,
    nodeOptionsArgv: [],
    nodeExecArgv: directNodeExecArgv(command, cwd)
  }
): ProvenanceResult => {
  const errors: string[] = [];
  const repoRoot = gitOutput(cwd, ['rev-parse', '--show-toplevel']);
  const gitHead = gitOutput(cwd, ['rev-parse', 'HEAD']);
  const gitStatus = gitOutput(cwd, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!repoRoot) errors.push(`could not resolve git worktree root for ${cwd}`);
  if (!gitHead) errors.push(`could not resolve git HEAD for ${cwd}`);
  if (gitStatus == null) errors.push(`could not resolve git status for ${cwd}`);

  const lockfileCandidate = repoRoot ? path.join(repoRoot, 'pnpm-lock.yaml') : null;
  const lockfilePath = lockfileCandidate && regularFile(lockfileCandidate)
    ? fs.realpathSync(lockfileCandidate)
    : null;
  if (!lockfilePath) errors.push('workspace pnpm-lock.yaml was not found');

  const entryPath = resolveEntryPath(command, cwd);
  if (!entryPath) errors.push(`could not resolve an executed entry from command: ${command.join(' ')}`);

  return {
    provenance: {
      cwd,
      command: [...command],
      gitHead,
      worktreeDirty: gitStatus == null ? null : gitStatus.length > 0,
      gitStatusSha256: gitStatus == null ? null : sha256(gitStatus),
      lockfilePath,
      lockfileSha256: lockfilePath ? sha256(fs.readFileSync(lockfilePath)) : null,
      entryPath,
      entrySha256: entryPath ? sha256(fs.readFileSync(entryPath)) : null,
      serverPid,
      v8Profile: runtime.v8Profile,
      nodeOptions: runtime.nodeOptions,
      nodeOptionsArgv: [...runtime.nodeOptionsArgv],
      nodeExecArgv: [...runtime.nodeExecArgv],
      effectiveNodeRuntimeFlags: [
        ...runtime.nodeOptionsArgv,
        ...runtime.nodeExecArgv
      ],
      planSha256: null,
      fleetSha256: null,
      node: process.version,
      v8: process.versions.v8,
      platform: process.platform,
      architecture: process.arch,
      runOrderSeed: null,
      runOrderIndex: null,
      memoryPolicy: null
    },
    errors
  };
};

const assertPinnedProvenance = (arm: ArmPlan, provenance: ArmProvenance): void => {
  if (arm.commit && !provenance.gitHead?.startsWith(arm.commit)) {
    throw new Error(`arm commit mismatch: expected ${arm.commit}, observed ${provenance.gitHead ?? 'unknown'}`);
  }
  if (arm.lockfileSha256 && provenance.lockfileSha256 !== arm.lockfileSha256) {
    throw new Error(
      `arm lockfile mismatch: expected ${arm.lockfileSha256}, observed ${provenance.lockfileSha256 ?? 'unknown'}`
    );
  }
  if (arm.entrySha256 && provenance.entrySha256 !== arm.entrySha256) {
    throw new Error(
      `arm entry mismatch: expected ${arm.entrySha256}, observed ${provenance.entrySha256 ?? 'unknown'}`
    );
  }
};

const waitForReady = async (
  url: string,
  timeoutMs: number,
  child?: ChildProcess,
  getChildError?: () => Error | null
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'not ready';
  while (Date.now() < deadline) {
    const childError = getChildError?.();
    if (childError) throw new Error(`server process failed before readiness: ${childError.message}`);
    if (child?.exitCode != null || child?.signalCode != null) {
      throw new Error(`server exited before readiness: code=${child.exitCode} signal=${child.signalCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(250);
  }
  throw new Error(`server readiness timed out after ${timeoutMs}ms: ${lastError}`);
};

export const startArmProcess = async (
  arm: ArmPlan,
  heapMiB: number,
  artifactDir: string,
  tenantCount: number,
  attestedPostgresVariables: Record<string, string | number> = {}
): Promise<ArmProcess> => {
  const vars = {
    heapMiB,
    port: arm.port,
    artifactDir,
    mode: arm.introspectionMode,
    tenantCount,
    ...attestedPostgresVariables
  };
  const readinessUrl = resolveTemplate(arm.readinessUrl, vars);
  const cwd = path.resolve(arm.cwd ? resolveTemplate(arm.cwd, vars) : process.cwd());
  if (!arm.command?.length) {
    await waitForReady(readinessUrl, arm.startupTimeoutMs ?? 120_000);
    const collected = collectArmProvenance(cwd, [], null);
    return {
      pid: null,
      external: true,
      exit: null,
      expectedHeapLimitBytes: null,
      observabilityHeaders: Object.freeze({}),
      provenance: collected.provenance,
      provenanceErrors: collected.errors,
      stop: async () => undefined
    };
  }

  const configuredCommand = arm.command.map((part) => resolveTemplate(part, vars));
  const v8Profile = arm.v8Profile ?? 'stock';
  const profileFlags = nodeFlagsForV8Profile(v8Profile);
  if (configuredCommand.some((argument) => MANAGED_V8_OPTION.test(argument))) {
    throw new Error('managed V8 flags must be selected through v8Profile');
  }
  const isNodeCommand = ['node', 'node.exe'].includes(
    path.basename(configuredCommand[0]).toLowerCase()
  );
  if (profileFlags.length > 0 && !isNodeCommand) {
    throw new Error(`v8Profile '${v8Profile}' requires a Node command`);
  }
  const command = isNodeCommand
    ? [configuredCommand[0], ...profileFlags, ...configuredCommand.slice(1)]
    : configuredCommand;
  const armEnvironment = armEnvironmentForHeap(arm, heapMiB);
  const nodeOptions = replaceMaxOldSpaceSize(
    armEnvironment.NODE_OPTIONS ?? process.env.NODE_OPTIONS,
    heapMiB
  );
  const nodeExecutable = ['node', 'node.exe'].includes(path.basename(command[0]).toLowerCase())
    ? command[0]
    : process.execPath;
  const expectedHeapLimitBytes = expectedHeapLimitForNodeOptions(
    nodeOptions,
    nodeExecutable,
    profileFlags
  );
  const nodeOptionsArgv = tokenizeNodeOptions(nodeOptions);
  const collected = collectArmProvenance(cwd, command, null, {
    v8Profile,
    nodeOptions,
    nodeOptionsArgv,
    nodeExecArgv: directNodeExecArgv(command, cwd)
  });
  assertPinnedProvenance(arm, collected.provenance);
  const observabilityHeaders = createObservabilityHeaders();
  const observabilityToken = observabilityHeaders.Authorization.slice('Bearer '.length);

  fs.mkdirSync(artifactDir, { recursive: true });
  const logStream = fs.createWriteStream(path.join(artifactDir, 'server.log'), { flags: 'a' });
  const samplerDir = path.join(artifactDir, 'debug-sampler');
  const child = spawn(command[0], command.slice(1), {
    cwd,
    env: {
      ...process.env,
      ...armEnvironment,
      NODE_ENV: 'production',
      GRAPHILE_CACHE_TTL_MS: armEnvironment.GRAPHILE_CACHE_TTL_MS ?? '21600000',
      NODE_OPTIONS: nodeOptions,
      GRAPHILE_INTROSPECTION_MODE: arm.introspectionMode,
      GRAPHQL_OBSERVABILITY_ENABLED: 'true',
      GRAPHQL_OBSERVABILITY_TOKEN: observabilityToken,
      GRAPHQL_DEBUG_SAMPLER_ENABLED: 'true',
      GRAPHQL_DEBUG_SAMPLER_INTERVAL_MS: '1000',
      GRAPHQL_DEBUG_SAMPLER_DIR: samplerDir
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);
  collected.provenance.serverPid = child.pid ?? null;

  let exit: ArmProcess['exit'] = null;
  let childError: Error | null = null;
  child.once('error', (error) => {
    childError = error;
  });
  child.once('exit', (code, signal) => {
    exit = { code, signal };
    logStream.end();
  });
  const stopChild = async (): Promise<void> => {
    if (exit) return;
    if (child.pid == null) {
      logStream.end();
      return;
    }
    child.kill('SIGTERM');
    const deadline = Date.now() + 15_000;
    while (!exit && Date.now() < deadline) await sleep(100);
    if (!exit) child.kill('SIGKILL');
    const killDeadline = Date.now() + 2_000;
    while (!exit && Date.now() < killDeadline) await sleep(50);
  };
  try {
    await waitForReady(
      readinessUrl,
      arm.startupTimeoutMs ?? 120_000,
      child,
      () => childError
    );
  } catch (error) {
    await stopChild();
    throw error;
  }

  return {
    pid: child.pid ?? null,
    external: false,
    expectedHeapLimitBytes,
    observabilityHeaders,
    provenance: collected.provenance,
    provenanceErrors: collected.errors,
    get exit() {
      return exit;
    },
    stop: stopChild
  };
};
