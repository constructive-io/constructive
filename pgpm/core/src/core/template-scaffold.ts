import os from 'os';
import path from 'path';
import { TemplateScaffolder } from 'create-gen-app';
import { Inquirerer, Question } from 'inquirerer';

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
    prompter,
  } = options;

  const scaffolder = new TemplateScaffolder({
    toolName,
    ttlMs: cacheTtlMs,
    cacheBaseDir: resolveCacheBaseDir(cacheBaseDir),
  });

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
    fromPath,
    answers,
    noTty,
    prompter,
  });

  return {
    cacheUsed: result.cacheUsed,
    cacheExpired: result.cacheExpired,
    cachePath: result.templateDir,
    templateDir: result.templateDir,
    questions: result.questions,
  };
}
