import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  createCatalogCacheKey,
  ensureDirectory,
  hasCatalogArtifacts,
  isCatalogExpired,
  readCatalogMeta,
  readOrmAgentCatalog,
  resolveExploreCacheRoot,
  resolveOrmCatalogCachePaths,
  toCatalogId,
  writeActiveCatalogPointer,
  writeCatalogMeta,
  type ActiveOrmCatalogPointer,
  type OrmAgentCatalog,
} from './orm-catalog';

export interface ExploreServiceOptions {
  cwd: string;
  endpoint: string;
  headers: Record<string, string>;
  databaseId?: string;
  apiName?: string;
  metaSchema?: string;
  cacheDir?: string;
  outputDirName?: string;
  ttlMs: number;
  forceRefresh: boolean;
  docs?: {
    agents?: boolean;
    mcp?: boolean;
    skills?: boolean;
  };
}

export interface ExploreServiceResult {
  pointer: ActiveOrmCatalogPointer;
  catalog: OrmAgentCatalog;
  refreshed: boolean;
  cacheRoot: string;
  generatedOutputRoot: string;
}

export const DEFAULT_EXPLORE_TTL_MS = 5 * 60 * 1000;

type CodegenGenerate = (options: {
  endpoint: string;
  headers?: Record<string, string>;
  output: string;
  orm: boolean;
  reactQuery: boolean;
  cli: boolean;
  docs: {
    readme: boolean;
    agents: boolean;
    mcp: boolean;
    skills: boolean;
  };
}) => Promise<{
  success: boolean;
  message: string;
}>;

let cachedGenerate: CodegenGenerate | null = null;
let jitiCreateFactory:
  | Promise<
      | ((
          filename: string,
          options: {
            interopDefault?: boolean;
            debug?: boolean;
          },
        ) => {
          import: (
            specifier: string,
            options?: {
              default?: boolean;
            },
          ) => Promise<Record<string, unknown>>;
        })
      | null
    >
  | null = null;

const dynamicImport = async <TModule>(
  specifier: string,
): Promise<TModule> => {
  const loader = Function(
    'modulePath',
    'return import(modulePath);',
  ) as (modulePath: string) => Promise<TModule>;
  return loader(specifier);
};

const loadJitiCreate = async (): Promise<
  | ((
      filename: string,
      options: {
        interopDefault?: boolean;
        debug?: boolean;
      },
    ) => {
      import: (
        specifier: string,
        options?: {
          default?: boolean;
        },
      ) => Promise<Record<string, unknown>>;
    })
  | null
> => {
  if (!jitiCreateFactory) {
    jitiCreateFactory = (async () => {
      try {
        const mod = await dynamicImport<{
          createJiti?: (
            filename: string,
            options: {
              interopDefault?: boolean;
              debug?: boolean;
            },
          ) => {
            import: (
              specifier: string,
              options?: {
                default?: boolean;
              },
            ) => Promise<Record<string, unknown>>;
          };
          default?:
            | ((
                filename: string,
                options: {
                  interopDefault?: boolean;
                  debug?: boolean;
                },
              ) => {
                import: (
                  specifier: string,
                  options?: {
                    default?: boolean;
                  },
                ) => Promise<Record<string, unknown>>;
              })
            | {
                createJiti?: (
                  filename: string,
                  options: {
                    interopDefault?: boolean;
                    debug?: boolean;
                  },
                ) => {
                  import: (
                    specifier: string,
                    options?: {
                      default?: boolean;
                    },
                  ) => Promise<Record<string, unknown>>;
                };
              };
        }>('jiti');

        if (typeof mod.createJiti === 'function') {
          return mod.createJiti;
        }

        if (typeof mod.default === 'function') {
          return mod.default;
        }

        if (mod.default && typeof mod.default === 'object') {
          if (typeof mod.default.createJiti === 'function') {
            return mod.default.createJiti;
          }
        }

        return null;
      } catch {
        return null;
      }
    })();
  }

  return jitiCreateFactory;
};

const loadGenerate = async (): Promise<CodegenGenerate> => {
  if (cachedGenerate) {
    return cachedGenerate;
  }

  const distCandidates = [
    '@constructive-io/graphql-codegen',
    path.resolve(process.cwd(), 'graphql/codegen/dist/index.js'),
    path.resolve(__dirname, '../../../graphql/codegen/dist/index.js'),
    path.resolve(__dirname, '../../../../graphql/codegen/dist/index.js'),
  ];

  const createJiti = await loadJitiCreate();
  if (createJiti) {
    const jiti = createJiti(__filename, {
      interopDefault: true,
      debug: process.env.JITI_DEBUG === '1',
    });

    for (const candidate of distCandidates) {
      try {
        const mod = await jiti.import(candidate, {
          default: false,
        });

        const maybeGenerate =
          (mod as { generate?: unknown }).generate ||
          (mod as { default?: { generate?: unknown } }).default?.generate;

        if (typeof maybeGenerate === 'function') {
          cachedGenerate = maybeGenerate as CodegenGenerate;
          return cachedGenerate;
        }
      } catch {
        // Try next candidate.
      }
    }
  }

  const candidates = [
    '@constructive-io/graphql-codegen',
    pathToFileURL(path.resolve(process.cwd(), 'graphql/codegen/dist/index.js'))
      .href,
    pathToFileURL(path.resolve(__dirname, '../../../graphql/codegen/dist/index.js'))
      .href,
    pathToFileURL(path.resolve(__dirname, '../../../../graphql/codegen/dist/index.js'))
      .href,
  ];

  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      const mod = (await dynamicImport<{
        generate?: CodegenGenerate;
        default?: {
          generate?: CodegenGenerate;
        };
      }>(candidate)) as {
        generate?: CodegenGenerate;
        default?: {
          generate?: CodegenGenerate;
        };
      };

      const maybeGenerate = mod.generate || mod.default?.generate;
      if (typeof maybeGenerate === 'function') {
        cachedGenerate = maybeGenerate;
        return cachedGenerate;
      }
    } catch (error) {
      lastError = error;
      // Try next candidate.
    }
  }

  const errorMessage =
    lastError instanceof Error
      ? ` ${lastError.message}`
      : '';
  throw new Error(
    `Unable to load @constructive-io/graphql-codegen generate() API.${errorMessage}`,
  );
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const hasAnyToken = (value: string, needles: string[]): boolean => {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
};

const appendIfMissing = (lines: string[], value: string): void => {
  if (lines.some((line) => line === value)) {
    return;
  }

  lines.push(value);
};

export interface ExploreFailureSummaryContext {
  endpoint?: string;
  tokenSource?: string;
  commandPrefix?: string;
}

const loadCachedCatalog = (
  options: ExploreServiceOptions,
): {
  pointer: ActiveOrmCatalogPointer;
  catalog: OrmAgentCatalog;
  cacheRoot: string;
  outputRoot: string;
} | null => {
  const cacheRoot = resolveExploreCacheRoot(options.cwd, options.cacheDir);
  const cacheKey = createCatalogCacheKey({
    endpoint: options.endpoint,
    databaseId: options.databaseId,
    apiName: options.apiName,
    metaSchema: options.metaSchema,
  });
  const paths = resolveOrmCatalogCachePaths({
    cacheRoot,
    catalogId: toCatalogId(cacheKey),
    outputDirName: options.outputDirName,
  });

  if (!hasCatalogArtifacts(paths)) {
    return null;
  }

  const meta = readCatalogMeta(paths.metaPath);
  if (!meta || meta.cacheKey !== cacheKey) {
    return null;
  }

  if (isCatalogExpired(meta.generatedAt, options.ttlMs)) {
    return null;
  }

  const catalog = readOrmAgentCatalog(paths.catalogPath);
  if (!catalog) {
    return null;
  }

  const now = Date.now();
  const pointer: ActiveOrmCatalogPointer = {
    catalogId: meta.catalogId,
    cacheRoot,
    catalogPath: paths.catalogPath,
    ormIndexPath: paths.ormIndexPath,
    endpoint: meta.endpoint,
    updatedAt: now,
    toolCount: catalog.tools.length,
  };

  writeActiveCatalogPointer(paths.activePointerPath, pointer);

  return {
    pointer,
    catalog,
    cacheRoot,
    outputRoot: paths.outputRoot,
  };
};

export async function ensureOrmCatalog(
  options: ExploreServiceOptions,
): Promise<ExploreServiceResult> {
  const generate = await loadGenerate();

  if (!options.forceRefresh) {
    const cached = loadCachedCatalog(options);
    if (cached) {
      return {
        pointer: cached.pointer,
        catalog: cached.catalog,
        refreshed: false,
        cacheRoot: cached.cacheRoot,
        generatedOutputRoot: cached.outputRoot,
      };
    }
  }

  const cacheRoot = resolveExploreCacheRoot(options.cwd, options.cacheDir);
  const cacheKey = createCatalogCacheKey({
    endpoint: options.endpoint,
    databaseId: options.databaseId,
    apiName: options.apiName,
    metaSchema: options.metaSchema,
  });
  const catalogId = toCatalogId(cacheKey);
  const paths = resolveOrmCatalogCachePaths({
    cacheRoot,
    catalogId,
    outputDirName: options.outputDirName,
  });

  ensureDirectory(paths.catalogDir);

  const docs = {
    readme: false,
    agents: options.docs?.agents ?? true,
    mcp: options.docs?.mcp ?? true,
    skills: options.docs?.skills ?? false,
  };

  const result = await generate({
    endpoint: options.endpoint,
    headers: options.headers,
    output: paths.outputRoot,
    orm: true,
    reactQuery: false,
    cli: false,
    docs,
  });

  if (!result.success) {
    throw new Error(
      `Failed to generate ORM catalog: ${result.message || 'unknown error'}`,
    );
  }

  if (!hasCatalogArtifacts(paths)) {
    throw new Error(
      `ORM catalog generation completed without expected artifacts at ${paths.catalogPath}`,
    );
  }

  const catalog = readOrmAgentCatalog(paths.catalogPath);
  if (!catalog) {
    throw new Error(
      `Unable to read generated ORM catalog from ${paths.catalogPath}`,
    );
  }

  const now = Date.now();

  writeCatalogMeta(paths.metaPath, {
    catalogId,
    cacheKey,
    endpoint: options.endpoint,
    databaseId: options.databaseId,
    apiName: options.apiName,
    metaSchema: options.metaSchema,
    generatedAt: now,
    toolCount: catalog.tools.length,
    catalogPath: paths.catalogPath,
    ormIndexPath: paths.ormIndexPath,
  });

  const pointer: ActiveOrmCatalogPointer = {
    catalogId,
    cacheRoot,
    catalogPath: paths.catalogPath,
    ormIndexPath: paths.ormIndexPath,
    endpoint: options.endpoint,
    updatedAt: now,
    toolCount: catalog.tools.length,
  };

  writeActiveCatalogPointer(paths.activePointerPath, pointer);

  return {
    pointer,
    catalog,
    refreshed: true,
    cacheRoot,
    generatedOutputRoot: paths.outputRoot,
  };
}

export function summarizeExploreFailure(
  error: unknown,
  context: ExploreFailureSummaryContext = {},
): string {
  const base = toErrorMessage(error);
  const lines = [base];

  if (context.endpoint) {
    appendIfMissing(lines, `Endpoint: ${context.endpoint}`);
  }
  if (context.tokenSource) {
    appendIfMissing(lines, `Token source: ${context.tokenSource}`);
  }

  const authLikeFailure = hasAnyToken(base, [
    'unauthenticated',
    'unauthorized',
    'forbidden',
    'code=unauthenticated',
    'code=forbidden',
    'http 401',
    'http 403',
  ]);

  if (authLikeFailure) {
    const prefix = context.commandPrefix || 'constructive';
    appendIfMissing(lines, 'Likely cause: access token is invalid, expired, or rejected by endpoint auth.');
    appendIfMissing(lines, 'Check auth with: cnc auth status');
    appendIfMissing(lines, 'Refresh token with: cnc auth set-token <token>');
    appendIfMissing(lines, `Or override this PI session with: /${prefix}-auth-set <token>`);
  }

  if (hasAnyToken(base, ['No __schema field in response', 'Introspection may be disabled'])) {
    appendIfMissing(lines, 'Likely cause: GraphQL introspection is disabled on this endpoint.');
  }

  return lines.join('\n');
}
