import { execFileSync } from 'child_process';
import fs from 'fs';
import { BoilerplateConfig as GenomicBoilerplateConfig, CacheManager, GitCloner, TemplateScaffolder } from 'genomic';
import os from 'os';
import path from 'path';
export type { BoilerplateSkill } from 'genomic';
export type { SkillInstallFailure,SkillInstallOptions, SkillInstallResult } from 'genomic';
export { SkillInstaller } from 'genomic';
import type { Inquirerer, Question } from 'inquirerer';

/**
 * Supported workspace types for template requirements.
 * - 'pgpm': Requires pgpm workspace (pgpm.json/pgpm.config.js) and creates pgpm.plan/.control files
 * - 'pnpm': Requires pnpm workspace (pnpm-workspace.yaml)
 * - 'lerna': Requires lerna workspace (lerna.json)
 * - 'npm': Requires npm workspace (package.json with workspaces field)
 * - false: No workspace required, can be scaffolded anywhere
 */
export type WorkspaceType = 'pgpm' | 'pnpm' | 'lerna' | 'npm' | false;

export interface BoilerplateConfig extends GenomicBoilerplateConfig {
  /**
   * Specifies what type of workspace this template requires.
   * - 'pgpm': Requires pgpm workspace AND creates pgpm.plan/.control files
   * - 'pnpm': Requires pnpm workspace (pnpm-workspace.yaml), no pgpm files
   * - 'lerna': Requires lerna workspace (lerna.json), no pgpm files
   * - 'npm': Requires npm workspace (package.json with workspaces), no pgpm files
   * - false: No workspace required, no pgpm files
   * 
   * Defaults to 'pgpm' for 'module' type (backward compatibility), false for others.
   */
  requiresWorkspace?: WorkspaceType;
}

export interface InspectTemplateOptions {
  /**
   * The boilerplate path to inspect. When omitted, inspects the template
   * repository root and returns the templateDir for scanning available boilerplates.
   */
  fromPath?: string;
  templateRepo?: string;
  branch?: string;
  cacheTtlMs?: number;
  toolName?: string;
  cwd?: string;
  cacheBaseDir?: string;
  /**
   * Override the base directory for template resolution.
   * When provided, the effective path becomes `join(dir, fromPath)`.
   * When not provided, create-gen-app uses .boilerplates.json's dir as the default.
   */
  dir?: string;
}

export interface InspectTemplateResult {
  /** Path to the cached/cloned template directory (repository root) */
  templateDir: string;
  /** The resolved fromPath after .boilerplates.json resolution */
  resolvedFromPath?: string;
  /** Full path to the resolved template subdirectory */
  resolvedTemplatePath: string;
  /** Whether a cached template was used */
  cacheUsed: boolean;
  /** Whether the cache was expired and refreshed */
  cacheExpired: boolean;
  /** Configuration from .boilerplate.json (includes type, questions, etc.) */
  config: BoilerplateConfig | null;
}

export interface ScaffoldTemplateOptions {
  fromPath: string;
  outputDir: string;
  templateRepo?: string;
  branch?: string;
  answers: Record<string, any>;
  noTty?: boolean;
  cacheTtlMs?: number;
  toolName?: string;
  cwd?: string;
  cacheBaseDir?: string;
  /**
   * Override the base directory for template resolution.
   * When provided, the effective path becomes `join(dir, fromPath)`.
   * When not provided, create-gen-app uses .boilerplates.json's dir as the default.
   */
  dir?: string;
  /**
   * Optional Inquirerer instance to reuse for prompting.
   * If provided, the caller retains ownership and is responsible for closing it.
   * If not provided, a new instance will be created and closed automatically.
   */
  prompter?: Inquirerer;
}

export interface ScaffoldTemplateResult {
  cacheUsed: boolean;
  cacheExpired: boolean;
  cachePath?: string;
  templateDir: string;
  /** Questions loaded from .boilerplate.json, if any */
  questions?: Question[];
}

/**
 * Registry of known boilerplate template repos, keyed by flavor. Add new
 * backends (e.g. `turso`) here rather than sprinkling flavor-specific
 * constants across the codebase.
 */
export const TEMPLATE_REPOS = {
  default: 'https://github.com/constructive-io/pgpm-boilerplates.git',
  pglite: 'https://github.com/constructive-io/pglite-boilerplates.git'
} as const;

export type TemplateRepoFlavor = keyof typeof TEMPLATE_REPOS;

export const DEFAULT_TEMPLATE_REPO = TEMPLATE_REPOS.default;
export const DEFAULT_TEMPLATE_TTL_MS = 1 * 24 * 60 * 60 * 1000; // 1 day
export const DEFAULT_TEMPLATE_TOOL_NAME = 'pgpm';

export interface TemplateSourceInfo {
  repo: string;
  branch?: string;
  remoteSha?: string;
  refreshed: boolean;
  offline: boolean;
  local: boolean;
}

export interface RefreshTemplateCacheOptions {
  templateRepo?: string;
  branch?: string;
  toolName?: string;
  cacheBaseDir?: string;
  cwd?: string;
  force?: boolean;
}

function resolveCacheBaseDir(cacheBaseDir?: string): string | undefined {
  if (cacheBaseDir) {
    return cacheBaseDir;
  }
  if (process.env.PGPM_CACHE_BASE_DIR) {
    return process.env.PGPM_CACHE_BASE_DIR;
  }
  if (process.env.JEST_WORKER_ID) {
    return path.join(os.tmpdir(), `pgpm-cache-${process.env.JEST_WORKER_ID}`);
  }
  return undefined;
}

const templateRefreshMemo = new Map<string, TemplateSourceInfo>();

/**
 * Clear the per-process refresh memo. Primarily useful for tests and callers
 * that begin a new init run in the same process.
 */
export function _resetTemplateRefreshMemo(): void {
  templateRefreshMemo.clear();
}

/**
 * Check the remote template revision and clear a stale local clone.
 *
 * Set PGPM_TEMPLATE_OFFLINE to skip `git ls-remote`, which is useful for tests
 * and environments that must not make network requests.
 */
export function refreshTemplateCache(
  options: RefreshTemplateCacheOptions = {}
): TemplateSourceInfo {
  const {
    templateRepo = DEFAULT_TEMPLATE_REPO,
    branch,
    toolName = DEFAULT_TEMPLATE_TOOL_NAME,
    cacheBaseDir,
    cwd,
    force = false,
  } = options;

  const template =
    templateRepo.startsWith('.') ||
    templateRepo.startsWith('/') ||
    templateRepo.startsWith('~')
      ? path.resolve(cwd ?? process.cwd(), templateRepo)
      : templateRepo;

  if (
    templateRepo.startsWith('.') ||
    templateRepo.startsWith('/') ||
    templateRepo.startsWith('~')
  ) {
    return {
      repo: template,
      branch,
      refreshed: false,
      offline: false,
      local: true,
    };
  }

  const url = new GitCloner().normalizeUrl(templateRepo);
  const cm = new CacheManager({
    toolName,
    baseDir: resolveCacheBaseDir(cacheBaseDir),
  });
  const key = cm.createKey(url, branch);
  const memoKey = `${key}|${force}`;
  const memoized = templateRefreshMemo.get(memoKey);
  if (memoized) return memoized;

  if (process.env.PGPM_TEMPLATE_OFFLINE) {
    const info = {
      repo: url,
      branch,
      refreshed: false,
      offline: true,
      local: false,
    };
    templateRefreshMemo.set(memoKey, info);
    return info;
  }

  let remoteSha: string;
  try {
    const output = execFileSync(
      'git',
      ['ls-remote', '--', url, branch ?? 'HEAD'],
      { stdio: 'pipe', encoding: 'utf-8', timeout: 15_000 }
    );
    const match = output.match(/\b([0-9a-f]{40})\b/i);
    if (!match) throw new Error('git ls-remote returned no commit SHA');
    remoteSha = match[1];
  } catch {
    const info = {
      repo: url,
      branch,
      refreshed: false,
      offline: true,
      local: false,
    };
    templateRefreshMemo.set(memoKey, info);
    return info;
  }

  const refPath = path.join(cm.getMetadataDir(), `${key}.ref.json`);
  let previousSha: string | undefined;
  try {
    const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
    previousSha = typeof ref.sha === 'string' ? ref.sha : undefined;
  } catch {
    // A missing or malformed sidecar is treated as unknown.
  }

  const cachePath = path.join(cm.getReposDir(), key);
  const refreshed =
    force ||
    previousSha !== remoteSha ||
    (fs.existsSync(cachePath) && !previousSha);
  if (refreshed) cm.clear(key);

  fs.mkdirSync(cm.getMetadataDir(), { recursive: true });
  fs.writeFileSync(
    refPath,
    JSON.stringify({ sha: remoteSha, checkedAt: Date.now() }, null, 2)
  );

  const info = {
    repo: url,
    branch,
    remoteSha,
    refreshed,
    offline: false,
    local: false,
  };
  templateRefreshMemo.set(memoKey, info);
  return info;
}

function formatAge(lastUpdated: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function describeTemplateSource(
  info: TemplateSourceInfo,
  opts: { toolName?: string; cacheBaseDir?: string } = {}
): string {
  if (info.local) return `using local template ${info.repo}`;

  const repoDisplay = info.repo
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/\.git$/, '');
  const label = `${repoDisplay}@${info.branch ?? 'HEAD'}`;
  const shortSha = info.remoteSha?.slice(0, 7);
  let fetched: string | undefined;
  if (info.refreshed) {
    fetched = 'fetched just now';
  } else if (info.remoteSha) {
    const url = new GitCloner().normalizeUrl(info.repo);
    const cm = new CacheManager({
      toolName: opts.toolName ?? DEFAULT_TEMPLATE_TOOL_NAME,
      baseDir: resolveCacheBaseDir(opts.cacheBaseDir),
    });
    const key = cm.createKey(url, info.branch);
    const metadata = cm.getMetadata(key);
    if (metadata?.lastUpdated) fetched = `fetched ${formatAge(metadata.lastUpdated)} ago`;
  }

  const details = [
    shortSha,
    fetched,
  ].filter(Boolean).join(', ');
  let result = `using ${label}${details ? ` (${details})` : ''}`;
  if (info.offline) result += ' (offline, using cached copy)';
  return result;
}

export function inspectTemplate(
  options: InspectTemplateOptions
): InspectTemplateResult {
  const {
    fromPath,
    templateRepo = DEFAULT_TEMPLATE_REPO,
    branch,
    cacheTtlMs = DEFAULT_TEMPLATE_TTL_MS,
    toolName = DEFAULT_TEMPLATE_TOOL_NAME,
    cwd,
    cacheBaseDir,
    dir,
  } = options;

  const scaffolder = new TemplateScaffolder({
    toolName,
    ttlMs: cacheTtlMs,
    cacheBaseDir: resolveCacheBaseDir(cacheBaseDir),
  });

  // Compute effective fromPath:
  // - If dir is provided, join it with fromPath and bypass .boilerplates.json
  // - If dir is NOT provided, let create-gen-app use .boilerplates.json
  const effectiveFromPath = dir
    ? fromPath
      ? path.join(dir, fromPath)
      : dir
    : fromPath;

  const template =
    templateRepo.startsWith('.') ||
    templateRepo.startsWith('/') ||
    templateRepo.startsWith('~')
      ? path.resolve(cwd ?? process.cwd(), templateRepo)
      : templateRepo;

  const result = scaffolder.inspect({
    template,
    branch,
    fromPath: effectiveFromPath,
    // When dir is specified, bypass .boilerplates.json resolution entirely
    useBoilerplatesConfig: !dir,
  });

  return {
    templateDir: result.templateDir,
    resolvedFromPath: result.resolvedFromPath,
    resolvedTemplatePath: result.resolvedTemplatePath,
    cacheUsed: result.cacheUsed,
    cacheExpired: result.cacheExpired,
    config: result.config,
  };
}

export async function scaffoldTemplate(
  options: ScaffoldTemplateOptions
): Promise<ScaffoldTemplateResult> {
  const {
    fromPath,
    outputDir,
    templateRepo = DEFAULT_TEMPLATE_REPO,
    branch,
    answers,
    noTty = false,
    cacheTtlMs = DEFAULT_TEMPLATE_TTL_MS,
    toolName = DEFAULT_TEMPLATE_TOOL_NAME,
    cwd,
    cacheBaseDir,
    dir,
    prompter,
  } = options;

  const scaffolder = new TemplateScaffolder({
    toolName,
    ttlMs: cacheTtlMs,
    cacheBaseDir: resolveCacheBaseDir(cacheBaseDir),
  });

  // If dir is provided, join it with fromPath and bypass .boilerplates.json
  // Otherwise, let create-gen-app resolve via .boilerplates.json
  const effectiveFromPath = dir ? path.join(dir, fromPath) : fromPath;

  const template =
    templateRepo.startsWith('.') ||
    templateRepo.startsWith('/') ||
    templateRepo.startsWith('~')
      ? path.resolve(cwd ?? process.cwd(), templateRepo)
      : templateRepo;

  const result = await scaffolder.scaffold({
    template,
    outputDir,
    branch,
    fromPath: effectiveFromPath,
    answers,
    noTty,
    // In noTty mode, never reuse a caller prompter: it may have been created
    // in interactive mode (or already closed), which would route template
    // questions through the TTY prompt path. Letting the templatizer build
    // its own prompter guarantees the noTty flag cascades.
    prompter: noTty ? undefined : prompter,
    // When dir is specified, bypass .boilerplates.json resolution entirely
    useBoilerplatesConfig: !dir,
  });

  return {
    cacheUsed: result.cacheUsed,
    cacheExpired: result.cacheExpired,
    cachePath: result.templateDir,
    templateDir: result.templateDir,
    questions: result.questions,
  };
}
