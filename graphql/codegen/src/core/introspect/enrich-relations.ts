/**
 * M:N Relation Enrichment
 *
 * After table inference from introspection, enriches ManyToManyRelation objects
 * with junction key field metadata from _cachedTablesMeta (MetaSchemaPlugin).
 */
import type { Table } from '../../types/schema';
import type { MetaTableInfo } from './source/types';

/**
 * Enrich M:N relations with junction key field metadata from _meta.
 * Mutates the tables array in-place.
 */
export function enrichManyToManyRelations(
  tables: Table[],
  tablesMeta?: MetaTableInfo[],
): void {
  if (!tablesMeta?.length) return;

  const metaByName = new Map(tablesMeta.map((m) => [m.name, m]));

  for (const table of tables) {
    const meta = metaByName.get(table.name);
    if (!meta?.relations.manyToMany.length) continue;

    for (const rel of table.relations.manyToMany) {
      const metaRel = meta.relations.manyToMany.find(
        (m) => m.fieldName === rel.fieldName,
      );
      if (!metaRel) continue;

      rel.junctionLeftKeyFields = metaRel.junctionLeftKeyAttributes.map(
        (a) => a.name,
      );
      rel.junctionRightKeyFields = metaRel.junctionRightKeyAttributes.map(
        (a) => a.name,
      );
      rel.leftKeyFields = metaRel.leftKeyAttributes.map((a) => a.name);
      rel.rightKeyFields = metaRel.rightKeyAttributes.map((a) => a.name);
    }
  }
}
