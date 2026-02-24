import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import * as path from 'node:path';

export type OrmSelectPolicy =
  | 'auto-minimal'
  | 'require-explicit'
  | 'auto-full-scalar';

export type OrmToolMethod =
  | 'findMany'
  | 'findOne'
  | 'create'
  | 'update'
  | 'delete'
  | 'query'
  | 'mutation';

export type OrmToolArgShape =
  | 'modelFindMany'
  | 'modelFindOne'
  | 'modelCreateFlat'
  | 'modelUpdateFlat'
  | 'modelDeleteFlat'
  | 'customOperation';

export interface OrmToolPolicyMeta {
  capability: 'read' | 'write' | 'destructive';
  riskClass: 'read_only' | 'low' | 'destructive';
}

export interface OrmToolDispatchMeta {
  kind: 'model' | 'custom';
  method: OrmToolMethod;
  model?: string;
  accessor?: 'query' | 'mutation';
  operationName?: string;
  pkField?: string;
  hasArgs: boolean;
  argShape: OrmToolArgShape;
  supportsSelect: boolean;
  defaultSelect: string[];
  scalarFields: string[];
  editableFields: string[];
}

export interface OrmCatalogTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  _meta: {
    orm: OrmToolDispatchMeta;
    policy: OrmToolPolicyMeta;
  };
}

export interface OrmAgentCatalog {
  version: number;
  generatedAt: string;
  tools: OrmCatalogTool[];
}

export interface OrmCatalogMeta {
  catalogId: string;
  cacheKey: string;
  endpoint: string;
  databaseId?: string;
  apiName?: string;
  metaSchema?: string;
  generatedAt: number;
  toolCount: number;
  catalogPath: string;
  ormIndexPath: string;
}

export interface ActiveOrmCatalogPointer {
  catalogId: string;
  cacheRoot: string;
  catalogPath: string;
  ormIndexPath: string;
  endpoint: string;
  updatedAt: number;
  toolCount: number;
}

export interface OrmCatalogCachePaths {
  cacheRoot: string;
  catalogId: string;
  catalogDir: string;
  outputRoot: string;
  catalogPath: string;
  ormIndexPath: string;
  metaPath: string;
  activePointerPath: string;
}

const ACTIVE_POINTER_FILE_NAME = 'active-catalog.json';
const META_FILE_NAME = 'catalog-meta.json';
const AGENT_CATALOG_FILE_NAME = 'agent-catalog.json';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const ensureDirectory = (directory: string): void => {
  mkdirSync(directory, {
    recursive: true,
  });
};

export const resolveExploreCacheRoot = (
  cwd: string,
  explicitCacheDir?: string,
): string => {
  const cacheRoot = normalizeString(explicitCacheDir);
  if (cacheRoot) {
    return path.resolve(cwd, cacheRoot);
  }

  return path.join(cwd, '.constructive', 'agent');
};

export const createCatalogCacheKey = (input: {
  endpoint: string;
  databaseId?: string;
  apiName?: string;
  metaSchema?: string;
}): string => {
  const normalized = JSON.stringify({
    endpoint: input.endpoint,
    databaseId: normalizeString(input.databaseId),
    apiName: normalizeString(input.apiName),
    metaSchema: normalizeString(input.metaSchema),
  });

  return createHash('sha256').update(normalized).digest('hex');
};

export const toCatalogId = (cacheKey: string): string => {
  return cacheKey.slice(0, 16);
};

export const resolveOrmCatalogCachePaths = (options: {
  cacheRoot: string;
  catalogId: string;
  outputDirName?: string;
}): OrmCatalogCachePaths => {
  const outputDirName = normalizeString(options.outputDirName) || 'generated';
  const catalogDir = path.join(options.cacheRoot, 'catalogs', options.catalogId);
  const outputRoot = path.join(catalogDir, outputDirName);

  return {
    cacheRoot: options.cacheRoot,
    catalogId: options.catalogId,
    catalogDir,
    outputRoot,
    catalogPath: path.join(outputRoot, 'orm', AGENT_CATALOG_FILE_NAME),
    ormIndexPath: path.join(outputRoot, 'orm', 'index.ts'),
    metaPath: path.join(catalogDir, META_FILE_NAME),
    activePointerPath: path.join(options.cacheRoot, ACTIVE_POINTER_FILE_NAME),
  };
};

const readJsonFile = <TValue>(filePath: string): TValue | null => {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as TValue;
  } catch {
    return null;
  }
};

const writeJsonFile = (filePath: string, value: unknown): void => {
  ensureDirectory(path.dirname(filePath));
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const isOrmDispatchMeta = (value: unknown): value is OrmToolDispatchMeta => {
  if (!isRecord(value)) {
    return false;
  }

  if (!normalizeString(value.kind)) {
    return false;
  }

  return Boolean(normalizeString(value.method));
};

const isOrmCatalogTool = (value: unknown): value is OrmCatalogTool => {
  if (!isRecord(value)) {
    return false;
  }

  if (!normalizeString(value.name) || !isRecord(value.inputSchema)) {
    return false;
  }

  const meta = value._meta;
  if (!isRecord(meta) || !isRecord(meta.orm) || !isRecord(meta.policy)) {
    return false;
  }

  if (!isOrmDispatchMeta(meta.orm)) {
    return false;
  }

  return Boolean(normalizeString(meta.policy.capability));
};

export const readOrmAgentCatalog = (
  catalogPath: string,
): OrmAgentCatalog | null => {
  const parsed = readJsonFile<unknown>(catalogPath);
  if (!isRecord(parsed) || !Array.isArray(parsed.tools)) {
    return null;
  }

  const tools = parsed.tools.filter(isOrmCatalogTool);
  if (tools.length === 0) {
    return null;
  }

  return {
    version: Number(parsed.version || 1),
    generatedAt:
      normalizeString(parsed.generatedAt) || new Date(0).toISOString(),
    tools,
  };
};

export const readCatalogMeta = (metaPath: string): OrmCatalogMeta | null => {
  return readJsonFile<OrmCatalogMeta>(metaPath);
};

export const writeCatalogMeta = (
  metaPath: string,
  meta: OrmCatalogMeta,
): void => {
  writeJsonFile(metaPath, meta);
};

export const readActiveCatalogPointer = (
  cacheRoot: string,
): ActiveOrmCatalogPointer | null => {
  return readJsonFile<ActiveOrmCatalogPointer>(
    path.join(cacheRoot, ACTIVE_POINTER_FILE_NAME),
  );
};

export const writeActiveCatalogPointer = (
  pointerPath: string,
  pointer: ActiveOrmCatalogPointer,
): void => {
  writeJsonFile(pointerPath, pointer);
};

export const hasCatalogArtifacts = (paths: OrmCatalogCachePaths): boolean => {
  return existsSync(paths.catalogPath) && existsSync(paths.ormIndexPath);
};

export const isCatalogExpired = (
  generatedAt: number,
  ttlMs: number,
  now: number = Date.now(),
): boolean => {
  if (ttlMs <= 0) {
    return true;
  }

  return now - generatedAt > ttlMs;
};

export const toSelectObject = (
  fields: string[] | undefined,
): Record<string, true> | undefined => {
  if (!fields || fields.length === 0) {
    return undefined;
  }

  const select: Record<string, true> = {};
  for (const field of fields) {
    if (!normalizeString(field)) {
      continue;
    }
    select[field] = true;
  }

  return Object.keys(select).length > 0 ? select : undefined;
};
