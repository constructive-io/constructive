/**
 * Introspection module exports
 */

export { META_QUERY } from './meta-query';
export type {
  MetaQueryResponse,
  MetaTable,
  MetaField,
  MetaFieldType,
  MetaConstraint,
  MetaForeignKeyConstraint,
  MetaTableQuery,
  MetaTableInflection,
  MetaBelongsToRelation,
  MetaHasRelation,
  MetaManyToManyRelation,
  MetaTableRelations,
} from './meta-query';

export { fetchMeta, validateEndpoint } from './fetch-meta';
export type { FetchMetaOptions, FetchMetaResult } from './fetch-meta';

export {
  transformMetaToCleanTables,
  getTableNames,
  findTable,
  filterTables,
} from './transform';
