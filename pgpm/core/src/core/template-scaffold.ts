import os from 'os';
import path from 'path';
import { TemplateScaffolder, BoilerplateConfig } from 'create-gen-app';
import type { Inquirerer, Question } from 'inquirerer';

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

export const DEFAULT_TEMPLATE_REPO =
  'https://github.com/constructive-io/pgpm-boilerplates.git';
export const DEFAULT_TEMPLATE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
export const DEFAULT_TEMPLATE_TOOL_NAME = 'pgpm';

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
  // - If dir is provided, it OVERRIDES .boilerplates.json resolution
  //   (join dir with fromPath if both provided, otherwise just use dir)
  // - If dir is NOT provided, let create-gen-app use .boilerplates.json
  // - If neither is provided, use undefined (repo root)
  let effectiveFromPath: string | undefined;
  let dirOverride = false;
  if (dir) {
    dirOverride = true;
    effectiveFromPath = fromPath ? path.join(dir, fromPath) : dir;
  } else {
    effectiveFromPath = fromPath;
  }

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
  });

  // When --dir is specified, we bypass .boilerplates.json resolution.
  // Validate that create-gen-app didn't fall back to .boilerplates.json
  // by checking that the resolved path matches what we expected.
  if (dirOverride && effectiveFromPath) {
    const expectedResolvedPath = result.resolvedFromPath;
    // If create-gen-app fell back to .boilerplates.json, the resolvedFromPath
    // would be different from our effectiveFromPath (e.g., "default/supabase/module"
    // instead of "supabase/module")
    if (expectedResolvedPath && expectedResolvedPath !== effectiveFromPath) {
      throw new Error(
        `Directory "${effectiveFromPath}" not found in template repository.\n` +
          `The --dir option bypasses .boilerplates.json resolution.\n` +
          `Available at: ${result.templateDir}`
      );
    }
  }

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

  // If dir is provided, it OVERRIDES .boilerplates.json resolution
  // Otherwise, let create-gen-app resolve via .boilerplates.json
  const dirOverride = Boolean(dir);
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
    prompter,
  });

  // When --dir is specified, we bypass .boilerplates.json resolution.
  // Validate that create-gen-app didn't fall back to .boilerplates.json
  // by checking that the resolved path matches what we expected.
  if (dirOverride && result.fromPath !== effectiveFromPath) {
    throw new Error(
      `Directory "${effectiveFromPath}" not found in template repository.\n` +
        `The --dir option bypasses .boilerplates.json resolution.\n` +
        `Available at: ${result.templateDir}`
    );
  }

  return {
    cacheUsed: result.cacheUsed,
    cacheExpired: result.cacheExpired,
    cachePath: result.templateDir,
    templateDir: result.templateDir,
    questions: result.questions,
  };
}
