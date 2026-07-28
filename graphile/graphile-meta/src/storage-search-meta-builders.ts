import type {
  I18nFieldMeta,
  I18nMeta,
  PgCodec,
  RealtimeMeta,
  SearchColumnMeta,
  SearchConfigMeta,
  SearchMeta,
  StorageMeta,
} from './types';

/**
 * Detect storage metadata from a codec's smart tags.
 * Storage tables are identified by @storageFiles and @storageBuckets smart tags.
 */
export function buildStorageMeta(codec: PgCodec): StorageMeta | null {
  const tags = (codec as any).extensions?.tags;
  if (!tags) return null;

  const isFilesTable = !!tags.storageFiles;
  const isBucketsTable = !!tags.storageBuckets;

  if (!isFilesTable && !isBucketsTable) return null;

  return {
    isFilesTable,
    isBucketsTable,
  };
}

/**
 * Detect search metadata from a codec's columns and smart tags.
 *
 * Looks for:
 * - tsvector columns (full-text search)
 * - vector columns (pgvector semantic search)
 * - @searchConfig smart tag (per-table search configuration)
 * - @bm25Index smart tag on columns (BM25 search)
 * - @trgmSearch smart tag (trigram search)
 */
export function buildSearchMeta(
  codec: PgCodec,
  _build: unknown,
  inflectAttr: (attrName: string, codec: PgCodec) => string,
): SearchMeta | null {
  const attributes = codec.attributes;
  if (!attributes) return null;

  const tags = (codec as any).extensions?.tags || {};
  const columns: SearchColumnMeta[] = [];
  const algorithmSet = new Set<string>();

  // Detect columns by type
  for (const [attrName, attr] of Object.entries(attributes)) {
    const pgType = (attr as any)?.codec?.name;
    if (!pgType) continue;

    const inflectedName = inflectAttr(attrName, codec);

    if (pgType === 'tsvector') {
      columns.push({ name: inflectedName, algorithm: 'tsvector' });
      algorithmSet.add('tsvector');
    } else if (pgType === 'vector') {
      columns.push({ name: inflectedName, algorithm: 'vector' });
      algorithmSet.add('vector');
    }

    // Check per-column @bm25Index tag
    const attrTags = (attr as any)?.extensions?.tags;
    if (attrTags?.bm25Index) {
      columns.push({ name: inflectedName, algorithm: 'bm25' });
      algorithmSet.add('bm25');
    }
  }

  // Check for table-level @trgmSearch tag
  if (tags.trgmSearch) {
    algorithmSet.add('trgm');
    // trgm operates on text columns — detect which ones
    for (const [attrName, attr] of Object.entries(attributes)) {
      const pgType = (attr as any)?.codec?.name;
      if (pgType === 'text' || pgType === 'varchar' || pgType === 'citext') {
        const attrTags = (attr as any)?.extensions?.tags;
        if (attrTags?.trgmSearch) {
          columns.push({ name: inflectAttr(attrName, codec), algorithm: 'trgm' });
        }
      }
    }
  }

  // Parse @searchConfig smart tag
  const config = parseSearchConfig(tags);

  // If nothing search-related was found, return null
  if (columns.length === 0 && !config) return null;

  // Determine if unified search is available
  // unifiedSearch requires at least one text-compatible adapter (tsvector or bm25)
  const hasUnifiedSearch =
    algorithmSet.has('tsvector') || algorithmSet.has('bm25');

  return {
    algorithms: Array.from(algorithmSet).sort(),
    columns,
    hasUnifiedSearch,
    config,
  };
}

/**
 * Detect i18n metadata from a codec's @i18n smart tag.
 * The @i18n tag value is the name of the translation table.
 * Translatable fields are discovered by matching text/citext columns
 * between the base table and the translation table codec.
 */
export function buildI18nMeta(
  codec: PgCodec,
  build: unknown,
  inflectAttr: (attrName: string, codec: PgCodec) => string,
): I18nMeta | null {
  const tags = (codec as any).extensions?.tags;
  if (!tags) return null;

  const i18nTag = tags.i18n;
  if (typeof i18nTag !== 'string' || i18nTag.length === 0) return null;

  const attributes = codec.attributes;
  if (!attributes) return { translationTable: i18nTag, translatableFields: [] };

  // Discover translatable fields: text/citext columns on the base table
  const allowedTypes = ['text', 'citext'];
  const translatableFields: I18nFieldMeta[] = [];

  // Try to find the translation codec to get the intersection of fields
  const pgRegistry = (build as any)?.input?.pgRegistry;
  let translationAttrs: Set<string> | null = null;
  if (pgRegistry?.pgResources) {
    for (const r of Object.values(pgRegistry.pgResources)) {
      const sqlName = (r as any)?.codec?.extensions?.pg?.name ?? (r as any)?.codec?.name;
      if (sqlName === i18nTag) {
        const tAttrs = (r as any)?.codec?.attributes;
        if (tAttrs) {
          translationAttrs = new Set(Object.keys(tAttrs));
        }
        break;
      }
    }
  }

  for (const [attrName, attr] of Object.entries(attributes)) {
    const pgType = (attr as any)?.codec?.name;
    if (!pgType || !allowedTypes.includes(pgType)) continue;
    // If we found the translation table, only include columns that exist there too
    if (translationAttrs && !translationAttrs.has(attrName)) continue;
    translatableFields.push({
      name: inflectAttr(attrName, codec),
      type: pgType,
    });
  }

  return {
    translationTable: i18nTag,
    translatableFields,
  };
}

/**
 * Detect realtime metadata from a codec's @realtime smart tag.
 * Tables tagged with @realtime get subscription fields generated.
 */
export function buildRealtimeMeta(
  codec: PgCodec,
  build: unknown,
): RealtimeMeta | null {
  const tags = (codec as any).extensions?.tags;
  if (!tags?.realtime) return null;

  const typeName = (build as any).inflection?.tableType?.(codec);
  if (!typeName) return null;

  return {
    subscriptionFieldName: `on${typeName}Changed`,
  };
}

function parseSearchConfig(
  tags: Record<string, unknown>,
): SearchConfigMeta | null {
  const raw = tags.searchConfig;
  if (!raw) return null;

  let parsed: any;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  } else if (typeof raw === 'object') {
    parsed = raw;
  } else {
    return null;
  }

  return {
    weights: parsed.weights && typeof parsed.weights === 'object'
      ? parsed.weights
      : null,
    boostRecent: !!parsed.boost_recent,
    boostRecencyField: parsed.boost_recency_field || null,
    boostRecencyDecay: typeof parsed.boost_recency_decay === 'number'
      ? parsed.boost_recency_decay
      : null,
  };
}
