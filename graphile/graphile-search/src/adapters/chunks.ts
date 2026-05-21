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
export function getChunksInfo(codec: any): ChunksInfo | undefined {
  const tags = codec?.extensions?.tags;
  if (!tags) return undefined;
  const raw = tags.hasChunks;
  if (!raw) return undefined;

  let parsed: any;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
  } else if (typeof raw === 'object') {
    parsed = raw;
  } else if (raw === true) {
    return undefined;
  } else {
    return undefined;
  }

  if (!parsed.chunksTable) return undefined;

  const chunksSchema = parsed.chunksSchema
    || codec?.extensions?.pg?.schemaName
    || null;

  // Parse searchIndexes from tag (may be array or JSON string)
  let searchIndexes: string[] = [];
  if (Array.isArray(parsed.searchIndexes)) {
    searchIndexes = parsed.searchIndexes;
  } else if (typeof parsed.searchIndexes === 'string') {
    try {
      const arr = JSON.parse(parsed.searchIndexes);
      if (Array.isArray(arr)) searchIndexes = arr;
    } catch {
      // ignore
    }
  }

  return {
    chunksSchema,
    chunksTableName: parsed.chunksTable,
    parentFkField: parsed.parentFk || 'parent_id',
    parentPkField: parsed.parentPk || 'id',
    embeddingField: parsed.embeddingField || 'embedding',
    contentField: parsed.contentField || 'content',
    searchField: parsed.searchField || null,
    searchIndexes,
  };
}
