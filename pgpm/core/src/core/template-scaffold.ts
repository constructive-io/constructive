import fs from 'fs';
import os from 'os';
import path from 'path';
import { CacheManager, GitCloner, Templatizer } from 'create-gen-app';
import { Inquirerer, Question } from 'inquirerer';

export type TemplateKind = 'workspace' | 'module';

export interface ScaffoldTemplateOptions {
  type: TemplateKind;
  outputDir: string;
  templateRepo?: string;
  branch?: string;
  templatePath?: string;
  answers: Record<string, any>;
  noTty?: boolean;
  cacheTtlMs?: number;
  toolName?: string;
  cwd?: string;
  cacheBaseDir?: string;
  /** Override the boilerplate directory (e.g., "default", "supabase") */
  dir?: string;
  /**
   * Optional Inquirerer instance to reuse for prompting.
   * If provided, the caller retains ownership and is responsible for closing it.
   * If not provided, a new instance will be created and closed automatically by create-gen-app.
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

const templatizer = new Templatizer();

const looksLikePath = (value: string): boolean => {
  return (
    value.startsWith('.') || value.startsWith('/') || value.startsWith('~')
  );
};

interface BoilerplatesConfig {
  dir?: string;
}

interface BoilerplateConfig {
  type?: string;
  questions?: Question[];
}

function readBoilerplatesConfig(templateDir: string): BoilerplatesConfig | null {
  const configPath = path.join(templateDir, '.boilerplates.json');
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as BoilerplatesConfig;
    } catch {
      return null;
    }
  }
  return null;
}

function readBoilerplateConfig(boilerplatePath: string): BoilerplateConfig | null {
  const jsonPath = path.join(boilerplatePath, '.boilerplate.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      return JSON.parse(content) as BoilerplateConfig;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Resolve the template path using the metadata-driven resolution.
 *
 * Resolution order:
 * 1. If explicit `templatePath` is provided, use it directly
 * 2. If `.boilerplates.json` exists, use its `dir` field to find the base directory
 * 3. Look for `{baseDir}/{type}` (e.g., "default/module")
 * 4. Fallback to legacy structure: `{type}` directly in root
 */
const resolveFromPath = (
  templateDir: string,
  templatePath: string | undefined,
  type: TemplateKind,
  dirOverride?: string
): { fromPath: string; resolvedTemplatePath: string } => {
  if (templatePath) {
    const candidateDir = path.isAbsolute(templatePath)
      ? templatePath
      : path.join(templateDir, templatePath);
    if (
      fs.existsSync(candidateDir) &&
      fs.statSync(candidateDir).isDirectory()
    ) {
      return {
        fromPath: path.relative(templateDir, candidateDir) || '.',
        resolvedTemplatePath: candidateDir,
      };
    }
    return {
      fromPath: templatePath,
      resolvedTemplatePath: path.join(templateDir, templatePath),
    };
  }

  const rootConfig = readBoilerplatesConfig(templateDir);
  const baseDir = dirOverride ?? rootConfig?.dir;

  if (baseDir) {
    const newStructurePath = path.join(templateDir, baseDir, type);
    if (
      fs.existsSync(newStructurePath) &&
      fs.statSync(newStructurePath).isDirectory()
    ) {
      return {
        fromPath: path.join(baseDir, type),
        resolvedTemplatePath: newStructurePath,
      };
    }
  }

  const legacyPath = path.join(templateDir, type);
  if (fs.existsSync(legacyPath) && fs.statSync(legacyPath).isDirectory()) {
    return {
      fromPath: type,
      resolvedTemplatePath: legacyPath,
    };
  }

  return {
    fromPath: type,
    resolvedTemplatePath: path.join(templateDir, type),
  };
};

/**
 * Scaffold a template using create-gen-app components.
 * This provides pgpm-specific defaults and path resolution.
 */
export async function scaffoldTemplate(
  options: ScaffoldTemplateOptions
): Promise<ScaffoldTemplateResult> {
  const {
    type,
    outputDir,
    templateRepo = DEFAULT_TEMPLATE_REPO,
    branch,
    templatePath,
    answers,
    noTty = false,
    cacheTtlMs = DEFAULT_TEMPLATE_TTL_MS,
    toolName = DEFAULT_TEMPLATE_TOOL_NAME,
    cwd,
    cacheBaseDir,
    dir,
    prompter,
  } = options;

  const resolvedRepo = looksLikePath(templateRepo)
    ? path.resolve(cwd ?? process.cwd(), templateRepo)
    : templateRepo;

  if (
    looksLikePath(templateRepo) &&
    fs.existsSync(resolvedRepo) &&
    fs.statSync(resolvedRepo).isDirectory()
  ) {
    const { fromPath, resolvedTemplatePath } = resolveFromPath(
      resolvedRepo,
      templatePath,
      type,
      dir
    );

    const boilerplateConfig = readBoilerplateConfig(resolvedTemplatePath);

    await templatizer.process(resolvedRepo, outputDir, {
      argv: answers,
      noTty,
      fromPath,
      prompter,
    } as any);

    return {
      cacheUsed: false,
      cacheExpired: false,
      templateDir: resolvedRepo,
      questions: boilerplateConfig?.questions,
    };
  }

  const cacheManager = new CacheManager({
    toolName,
    ttl: cacheTtlMs,
    baseDir:
      cacheBaseDir ??
      process.env.PGPM_CACHE_BASE_DIR ??
      (process.env.JEST_WORKER_ID
        ? path.join(os.tmpdir(), `pgpm-cache-${process.env.JEST_WORKER_ID}`)
        : undefined),
  });

  const gitCloner = new GitCloner();
  const normalizedUrl = gitCloner.normalizeUrl(resolvedRepo);
  const cacheKey = cacheManager.createKey(normalizedUrl, branch);

  const expiredMetadata = cacheManager.checkExpiration(cacheKey);
  if (expiredMetadata) {
    cacheManager.clear(cacheKey);
  }

  let templateDir: string;
  let cacheUsed = false;
  const cachedPath = cacheManager.get(cacheKey);
  if (cachedPath && !expiredMetadata) {
    templateDir = cachedPath;
    cacheUsed = true;
  } else {
    const tempDest = path.join(cacheManager.getReposDir(), cacheKey);
    gitCloner.clone(normalizedUrl, tempDest, {
      branch,
      depth: 1,
      singleBranch: true,
    });
    cacheManager.set(cacheKey, tempDest);
    templateDir = tempDest;
  }

  const { fromPath, resolvedTemplatePath } = resolveFromPath(
    templateDir,
    templatePath,
    type,
    dir
  );

  const boilerplateConfig = readBoilerplateConfig(resolvedTemplatePath);

  await templatizer.process(templateDir, outputDir, {
    argv: answers,
    noTty,
    fromPath,
    prompter,
  } as any);

  return {
    cacheUsed,
    cacheExpired: Boolean(expiredMetadata),
    cachePath: templateDir,
    templateDir,
    questions: boilerplateConfig?.questions,
  };
}
