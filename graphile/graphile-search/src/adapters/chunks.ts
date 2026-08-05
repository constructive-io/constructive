/**
 * Shared @hasChunks smart tag utilities.
 *
 * Extracts chunk table metadata from the @hasChunks smart tag on a codec.
 * Used by pgvector, tsvector, BM25, and trgm adapters to build lateral
 * subqueries against the chunks table for chunk-aware search.
 */

/**
 * Chunks table info detected from @hasChunks smart tag.
 */
export interface ChunksInfo {
  chunksSchema: string | null;
  chunksTableName: string;
  parentFkField: string;
  parentPkField: string;
  embeddingField: string;
  /** Text content field on chunks table (e.g. "content") */
  contentField: string;
  /** tsvector field on chunks table, if fulltext search is enabled (e.g. "search") */
  searchField: string | null;
  /** Which search indexes are created on the chunks table (e.g. ["fulltext", "bm25"]) */
  searchIndexes: string[];
}

interface PgIdentity {
  serviceName: string;
  schemaName: string;
  name: string;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
    throw new Error(`[graphile-search] @hasChunks ${label} must be a non-empty PostgreSQL identifier`);
  }
  return value;
}

function pgIdentity(value: any, label: string): PgIdentity {
  const pg = value?.extensions?.pg;
  if (!pg?.serviceName || !pg?.schemaName || !pg?.name) {
    throw new Error(
      `[graphile-search] ${label} is missing exact service/schema/table metadata`
    );
  }
  return {
    serviceName: pg.serviceName,
    schemaName: pg.schemaName,
    name: pg.name,
  };
}

function configuredSchemas(build: any, serviceName: string): ReadonlySet<string> | null {
  const services = build?.resolvedPreset?.pgServices;
  if (!Array.isArray(services)) return null;
  const matches = services.filter(
    (service: any) => (service?.name ?? 'main') === serviceName
  );
  if (matches.length !== 1) {
    throw new Error(
      `[graphile-search] @hasChunks cannot resolve exact service '${serviceName}' ` +
      `(matches=${matches.length})`
    );
  }
  const service = matches[0];
  const schemas = service?.schemas;
  if (!Array.isArray(schemas) || schemas.length === 0) {
    throw new Error(
      `[graphile-search] @hasChunks service '${serviceName}' has no configured schema allowlist`
    );
  }
  const dependencySchemas = service?.introspectionAllowedDependencySchemas;
  if (dependencySchemas !== undefined && !Array.isArray(dependencySchemas)) {
    throw new Error(
      `[graphile-search] @hasChunks service '${serviceName}' has an invalid dependency schema allowlist`
    );
  }
  return new Set([...schemas, ...(dependencySchemas ?? [])]);
}

function parseSearchIndexes(value: unknown): string[] {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error('[graphile-search] @hasChunks searchIndexes must be a JSON string array');
    }
  }
  if (parsed == null) return [];
  if (!Array.isArray(parsed)) {
    throw new Error('[graphile-search] @hasChunks searchIndexes must be an array');
  }
  return parsed.map((entry) => requireNonEmptyString(entry, 'searchIndexes entry'));
}

/**
 * Read @hasChunks smart tag from codec extensions.
 *
 * The tag value is a JSON object like:
 * {
 *   "chunksTable": "documents_chunks",
 *   "chunksSchema": "app_private",    // optional, defaults to parent table's schema
 *   "parentFk": "document_id",         // optional, defaults to "parent_id"
 *   "parentPk": "id",                  // optional, defaults to "id"
 *   "embeddingField": "embedding",     // optional, defaults to "embedding"
 *   "contentField": "content",         // optional, defaults to "content"
 *   "searchField": "search",           // optional, null if no fulltext
 *   "searchIndexes": ["fulltext","bm25"] // optional, defaults to []
 * }
 */
export function getChunksInfo(codec: any, build?: any): ChunksInfo | undefined {
  const tags = codec?.extensions?.tags;
  if (!tags) return undefined;
  const raw = tags.hasChunks;
  if (!raw) return undefined;

  let parsed: any;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('[graphile-search] @hasChunks must contain valid JSON');
    }
  } else if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    parsed = raw;
  } else {
    throw new Error('[graphile-search] @hasChunks must be a JSON object');
  }

  const chunksTableName = requireNonEmptyString(parsed.chunksTable, 'chunksTable');
  const parentPg = codec?.extensions?.pg;
  const chunksSchema = requireNonEmptyString(
    parsed.chunksSchema || parentPg?.schemaName,
    'chunksSchema'
  );
  const parentFkField = requireNonEmptyString(parsed.parentFk || 'parent_id', 'parentFk');
  const parentPkField = requireNonEmptyString(parsed.parentPk || 'id', 'parentPk');
  const embeddingField = requireNonEmptyString(
    parsed.embeddingField || 'embedding',
    'embeddingField'
  );
  const contentField = requireNonEmptyString(parsed.contentField || 'content', 'contentField');
  const searchField = parsed.searchField == null
    ? null
    : requireNonEmptyString(parsed.searchField, 'searchField');
  const searchIndexes = parseSearchIndexes(parsed.searchIndexes);

  const pgRegistry = build?.input?.pgRegistry ?? build?.pgRegistry;
  if (pgRegistry) {
    const parentIdentity = pgIdentity(codec, 'parent codec');
    const allowedSchemas = configuredSchemas(build, parentIdentity.serviceName);
    if (allowedSchemas && !allowedSchemas.has(chunksSchema)) {
      throw new Error(
        `[graphile-search] @hasChunks on '${parentIdentity.schemaName}.${parentIdentity.name}' ` +
        `references schema '${chunksSchema}' outside service '${parentIdentity.serviceName}'`
      );
    }

    const matches = Object.values(pgRegistry.pgResources ?? {}).filter((resource: any) => {
      if (resource?.parameters || !resource?.codec?.attributes) return false;
      const pg = resource.codec.extensions?.pg;
      return pg?.serviceName === parentIdentity.serviceName &&
        pg?.schemaName === chunksSchema &&
        pg?.name === chunksTableName;
    }) as any[];
    if (matches.length !== 1) {
      throw new Error(
        `[graphile-search] @hasChunks on '${parentIdentity.schemaName}.${parentIdentity.name}' ` +
        `must resolve exactly one '${chunksSchema}.${chunksTableName}' resource ` +
        `(matches=${matches.length})`
      );
    }

    const chunkIdentity = pgIdentity(matches[0].codec, 'chunks codec');
    const chunkAttributes = matches[0].codec.attributes;
    for (const [field, label] of [
      [parentFkField, 'parentFk'],
      [embeddingField, 'embeddingField'],
      [contentField, 'contentField'],
      ...(searchField ? [[searchField, 'searchField']] : []),
    ] as Array<[string, string]>) {
      if (!chunkAttributes[field]) {
        throw new Error(
          `[graphile-search] @hasChunks ${label} '${field}' does not exist on ` +
          `'${chunkIdentity.schemaName}.${chunkIdentity.name}'`
        );
      }
    }
    if (!codec?.attributes?.[parentPkField]) {
      throw new Error(
        `[graphile-search] @hasChunks parentPk '${parentPkField}' does not exist on ` +
        `'${parentIdentity.schemaName}.${parentIdentity.name}'`
      );
    }
  }

  return {
    chunksSchema,
    chunksTableName,
    parentFkField,
    parentPkField,
    embeddingField,
    contentField,
    searchField,
    searchIndexes,
  };
}
