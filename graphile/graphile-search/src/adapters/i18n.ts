/**
 * Translation vectors for a table with translations.
 *
 * A table the DataI18n module translated carries `@i18n <translations table>`.
 * When that translations table has a vector column of the same name (the
 * metaschema gives it one whenever the base table has one), vector search can
 * compare a query with the translation in the request's language.
 */

export interface I18nVectorInfo {
  schema: string;
  tableName: string;
  /** Translations column referencing the base row (`<base table>_id`). */
  parentFkField: string;
  parentPkField: string;
  langField: string;
  embeddingField: string;
  /** Translations column recording the model each translation vector came from. */
  modelColumn: string | null;
}

export function getI18nVectorInfo(
  codec: any,
  attributeName: string,
  dimensions: number | undefined,
  build: any
): I18nVectorInfo | undefined {
  const tableName = codec?.extensions?.tags?.i18n;
  const pg = codec?.extensions?.pg;
  if (typeof tableName !== 'string' || !tableName || !pg?.schemaName || !pg?.name) return undefined;

  const codecs = Object.values(build?.input?.pgRegistry?.pgCodecs ?? {}) as any[];
  const translations = codecs.find(
    (c) => c?.attributes && c.extensions?.pg?.schemaName === pg.schemaName && c.extensions?.pg?.name === tableName
  );
  const attributes = translations?.attributes as Record<string, any> | undefined;
  const vector = attributes?.[attributeName];
  if (vector?.codec?.name !== 'vector') return undefined;
  // A translation vector of another width cannot be compared with the query.
  const translationDimensions = vector.extensions?.vectorDimensions;
  if (dimensions && translationDimensions && dimensions !== translationDimensions) return undefined;

  const parentFkField = `${pg.name}_id`;
  const langField = 'lang_code';
  if (!attributes[parentFkField] || !attributes[langField] || !codec.attributes?.id) return undefined;

  const modelColumn =
    Object.entries(attributes).find(([, other]) => other.extensions?.tags?.embeddingModelOf === attributeName)?.[0] ??
    null;

  return {
    schema: pg.schemaName,
    tableName,
    parentFkField,
    parentPkField: 'id',
    langField,
    embeddingField: attributeName,
    modelColumn,
  };
}
