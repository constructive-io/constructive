import { QuoteUtils } from '@pgsql/quotes';

import type { StorageModuleConfig } from './types';
import {
  loadAllStorageModules,
  type StorageModuleCacheScope,
} from './storage-module-cache';

export type StoragePgClient = {
  query: (opts: {
    text: string;
    values?: unknown[];
  }) => Promise<{ rows: any[] }>;
};

export type StorageWithPgClient = <T>(
  pgSettings: unknown,
  callback: (pgClient: StoragePgClient) => Promise<T> | T,
) => Promise<T>;

export function assertStorageRequestContext(
  withPgClient: StorageWithPgClient | null | undefined,
  pgSettings: unknown,
): asserts withPgClient is StorageWithPgClient {
  if (typeof withPgClient !== 'function') {
    throw new Error('STORAGE_CONTEXT_UNAVAILABLE');
  }
  if (typeof pgSettings !== 'object' || pgSettings === null || Array.isArray(pgSettings)) {
    throw new Error('STORAGE_REQUEST_SETTINGS_UNAVAILABLE');
  }
}

export type PreloadedStorageModules = readonly StorageModuleConfig[] | undefined;

const QUALIFIED_IDENTIFIER = /^("(?:[^"]|"")+"|[a-z_][a-z0-9_$]*)\.("(?:[^"]|"")+"|[a-z_][a-z0-9_$]*)$/;

function decodeIdentifier(identifier: string): string {
  return identifier.startsWith('"')
    ? identifier.slice(1, -1).replace(/""/g, '"')
    : identifier;
}

function normalizeQualifiedIdentifier(
  value: string,
  label: string,
): { schema: string; objectName: string; sql: string } {
  const match = QUALIFIED_IDENTIFIER.exec(value);
  if (!match) throw new Error(`STORAGE_MODULE_METADATA_INVALID:${label}`);

  const schema = decodeIdentifier(match[1]);
  const objectName = decodeIdentifier(match[2]);
  if (
    schema.length === 0 ||
    objectName.length === 0 ||
    schema.includes('\0') ||
    objectName.includes('\0') ||
    Buffer.byteLength(schema, 'utf8') > 63 ||
    Buffer.byteLength(objectName, 'utf8') > 63
  ) {
    throw new Error(`STORAGE_MODULE_METADATA_INVALID:${label}`);
  }
  return {
    schema,
    objectName,
    sql: QuoteUtils.quoteQualifiedIdentifier(schema, objectName),
  };
}

/**
 * Capture an immutable per-build snapshot. `undefined` deliberately remains
 * distinct from an empty list: only the former enables the generic SQL path.
 */
export function snapshotPreloadedStorageModules(
  modules: readonly StorageModuleConfig[] | undefined,
): PreloadedStorageModules {
  if (modules === undefined) {
    return undefined;
  }

  const ids = new Set<string>();
  const scopes = new Set<string>();
  const buckets = new Set<string>();
  const files = new Set<string>();
  const normalized = modules.map((module) => {
    if (
      !module ||
      typeof module.id !== 'string' ||
      module.id.length === 0 ||
      typeof module.scope !== 'string' ||
      module.scope.length === 0 ||
      typeof module.schemaName !== 'string' ||
      typeof module.bucketsTableName !== 'string' ||
      typeof module.filesTableName !== 'string'
    ) {
      throw new Error('STORAGE_MODULE_METADATA_INVALID');
    }

    const bucketName = normalizeQualifiedIdentifier(
      module.bucketsQualifiedName,
      `buckets:${module.id}`,
    );
    const fileName = normalizeQualifiedIdentifier(
      module.filesQualifiedName,
      `files:${module.id}`,
    );
    if (
      bucketName.schema !== module.schemaName ||
      bucketName.objectName !== module.bucketsTableName ||
      fileName.schema !== module.schemaName ||
      fileName.objectName !== module.filesTableName
    ) {
      throw new Error(`STORAGE_MODULE_METADATA_INCONSISTENT:${module.id}`);
    }

    let entityQualifiedName: string | null = null;
    if (module.scope === 'app') {
      if (module.entityTableId !== null || module.entityQualifiedName !== null) {
        throw new Error(`STORAGE_MODULE_METADATA_INVALID:${module.id}`);
      }
    } else {
      if (!module.entityTableId || !module.entityQualifiedName) {
        throw new Error(`STORAGE_MODULE_METADATA_INVALID:${module.id}`);
      }
      entityQualifiedName = normalizeQualifiedIdentifier(
        module.entityQualifiedName,
        `entity:${module.id}`,
      ).sql;
    }

    if (
      ids.has(module.id) ||
      scopes.has(module.scope) ||
      buckets.has(bucketName.sql) ||
      files.has(fileName.sql)
    ) {
      throw new Error('STORAGE_MODULE_METADATA_AMBIGUOUS');
    }
    ids.add(module.id);
    scopes.add(module.scope);
    buckets.add(bucketName.sql);
    files.add(fileName.sql);

    return Object.freeze({
      ...module,
      bucketsQualifiedName: bucketName.sql,
      filesQualifiedName: fileName.sql,
      entityQualifiedName,
      allowedOrigins: module.allowedOrigins
        ? Object.freeze([...module.allowedOrigins])
        : null,
    }) as StorageModuleConfig;
  });

  const unchanged = Object.isFrozen(modules) && modules.every((module, index) =>
    Object.isFrozen(module) &&
    (module.allowedOrigins === null || Object.isFrozen(module.allowedOrigins)) &&
    module.bucketsQualifiedName === normalized[index].bucketsQualifiedName &&
    module.filesQualifiedName === normalized[index].filesQualifiedName &&
    module.entityQualifiedName === normalized[index].entityQualifiedName,
  );
  return unchanged ? modules : Object.freeze(normalized);
}

/**
 * Preloaded configuration is authoritative and never acquires a metadata
 * client. The database branch exists only for generic package consumers that
 * did not supply a control-plane snapshot; because callers reach this helper
 * from request execution, that fallback must carry the exact request settings.
 */
export async function loadStorageModulesForBuild(
  preloaded: PreloadedStorageModules,
  withPgClient: StorageWithPgClient,
  pgSettings: unknown,
  databaseId: string,
  cacheScope: StorageModuleCacheScope,
): Promise<readonly StorageModuleConfig[]> {
  if (preloaded !== undefined) {
    return preloaded;
  }

  assertStorageRequestContext(withPgClient, pgSettings);
  return withPgClient(pgSettings, (pgClient) =>
    loadAllStorageModules(pgClient, databaseId, cacheScope),
  );
}
