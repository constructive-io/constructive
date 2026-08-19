import {
  discoverStoragePlanes,
  DOWNLOAD_URL_FIELD,
  type StoragePgRegistry,
  type StoragePlanePair,
  uploadSurfaceNames,
} from 'graphile-storage-registry';

import type {
  I18nFieldMeta,
  I18nMeta,
  MetaBuild,
  PgCodec,
  RealtimeMeta,
  SearchColumnMeta,
  SearchConfigMeta,
  SearchMeta,
  StorageMeta,
} from './types';

const planesCache = new WeakMap<object, StoragePlanePair[]>();

/**
 * Discover the registry's storage planes once per registry. Pairing comes from
 * the registry's actual files→buckets FK relations (graphile-storage-registry),
 * never from table names; a tagged table that cannot be paired throws.
 */
function storagePlanesForBuild(build: MetaBuild): StoragePlanePair[] {
  const registry = build.input.pgRegistry;
  const cached = planesCache.get(registry);
  if (cached) return cached;

  const pgCodecs =
    registry.pgCodecs ??
    Object.fromEntries(
      Object.values(registry.pgResources)
        .map((resource: any) => resource.codec)
        .filter(Boolean)
        .map((codec: any) => [codec.name, codec]),
    );

  const storageRegistry: StoragePgRegistry = {
    pgCodecs: pgCodecs as StoragePgRegistry['pgCodecs'],
    pgRelations: (registry.pgRelations ?? {}) as StoragePgRegistry['pgRelations'],
  };

  const planes = discoverStoragePlanes(storageRegistry);
  planesCache.set(registry, planes);
  return planes;
}

/**
 * Build storage metadata for a codec tagged @storageFiles or @storageBuckets.
 *
 * The plane pairing and upload-surface names derive from the same registry
 * facts and inflection the presigned-url plugin emits from, so `_meta` and the
 * emitted schema cannot disagree. A tagged table with no valid plane is a
 * provisioning bug and throws rather than reporting a partial surface.
 */
export function buildStorageMeta(codec: PgCodec, build: MetaBuild): StorageMeta | null {
  const tags = (codec as any).extensions?.tags;
  if (!tags) return null;

  const isFilesTable = !!tags.storageFiles;
  const isBucketsTable = !!tags.storageBuckets;

  if (!isFilesTable && !isBucketsTable) return null;

  const planes = storagePlanesForBuild(build);
  const plane = planes.find(
    (candidate) => candidate.filesCodec === (codec as any) || candidate.bucketsCodec === (codec as any),
  );
  if (!plane) {
    throw new Error(
      `STORAGE_PLANE_UNPAIRED: storage-tagged table ${codec.name} belongs to no ` +
      `discovered storage plane; check its @storageFiles/@storageBuckets smart tags ` +
      `and the files table's FK to its buckets table.`,
    );
  }

  const names = uploadSurfaceNames(build.inflection as any, plane.filesCodec);

  return {
    isFilesTable,
    isBucketsTable,
    filesType: names.filesTypeName,
    bucketsType: build.inflection.tableType(plane.bucketsCodec as any),
    downloadUrlField: isFilesTable ? DOWNLOAD_URL_FIELD : null,
    upload: {
      mutation: names.uploadMutation,
      inputType: names.uploadInputType,
      payloadType: names.uploadPayloadType,
      bulkMutation: names.bulkUploadMutation,
      bulkInputType: names.bulkUploadInputType,
      bulkPayloadType: names.bulkUploadPayloadType,
      bulkFileInputType: names.bulkUploadFileInputType,
      bulkFilePayloadType: names.bulkUploadFilePayloadType,
      requiresOwnerId: plane.hasOwnerId,
    },
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
