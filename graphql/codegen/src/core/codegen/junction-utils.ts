/**
 * Junction table utilities for M:N relation code generation
 *
 * Shared by ORM model-generator (add/remove methods) and
 * React Query hook generators (junction mutation hooks + invalidation).
 */
import { singularize } from 'inflekt';

import type { CleanField, CleanManyToManyRelation, CleanTable } from '../../types/schema';
import {
  fieldTypeToTs,
  getCreateInputTypeName,
  getCreateMutationName,
  getDeleteInputTypeName,
  getScalarFields,
  getTableNames,
  ucFirst,
} from './utils';

// ============================================================================
// Types
// ============================================================================

export interface JunctionInfo {
  junctionTypeName: string;
  junctionSingularName: string;
  junctionCreateMutation: string;
  junctionDeleteMutation: string;
  junctionCreateInputType: string;
  junctionDeleteInputType: string;
  leftFkField: { name: string; tsType: string };
  rightFkField: { name: string; tsType: string };
  hasExtraFields: boolean;
  addMethodName: string;
  removeMethodName: string;
}

/**
 * Pre-computed junction mutation metadata — passed to mutation-keys,
 * invalidation, and hook generators so they don't need to resolve themselves.
 */
export interface JunctionMutationMeta {
  leftTable: CleanTable;
  rightTable: CleanTable;
  info: JunctionInfo;
}

// ============================================================================
// Resolution
// ============================================================================

/**
 * Resolve junction table metadata needed to generate add/remove methods.
 * Returns null if the junction table is missing, lacks mutations, or FK fields can't be resolved.
 */
export function resolveJunctionInfo(
  table: CleanTable,
  relation: CleanManyToManyRelation,
  allTables: CleanTable[],
  needsDisambiguation: boolean,
): JunctionInfo | null {
  const junctionTable = allTables.find((t) => t.name === relation.junctionTable);
  if (!junctionTable) return null;

  const junctionNames = getTableNames(junctionTable);
  const junctionDeleteMutation = junctionTable.query?.delete;
  if (!junctionDeleteMutation) return null;

  const junctionCreateMutation = getCreateMutationName(junctionTable);

  const rightTable = allTables.find((t) => t.name === relation.rightTable);
  if (!rightTable) return null;

  const rightNames = getTableNames(rightTable);

  // Resolve FK fields — prefer _meta data, fall back to junction's belongsTo relations
  let leftFk: CleanField | undefined;
  let rightFk: CleanField | undefined;

  if (relation.junctionLeftKeys?.length && relation.junctionRightKeys?.length) {
    leftFk = relation.junctionLeftKeys[0];
    rightFk = relation.junctionRightKeys[0];
  } else {
    const leftBelongsTo = junctionTable.relations.belongsTo.find(
      (r) => r.referencesTable === table.name,
    );
    const rightBelongsTo = junctionTable.relations.belongsTo.find(
      (r) => r.referencesTable === relation.rightTable && r !== leftBelongsTo,
    );
    if (!leftBelongsTo?.keys?.[0] || !rightBelongsTo?.keys?.[0]) return null;
    leftFk = leftBelongsTo.keys[0];
    rightFk = rightBelongsTo.keys[0];
  }

  // Determine method names from relation fieldName or right table name
  const fieldName = relation.fieldName;
  const singularRight = fieldName
    ? ucFirst(singularize(fieldName))
    : rightNames.typeName;

  const suffix = needsDisambiguation ? `Via${junctionNames.typeName}` : '';

  // Check if junction has extra fields (non-FK scalar fields)
  const junctionScalarFields = getScalarFields(junctionTable);
  const fkFieldNames = new Set([leftFk.name, rightFk.name]);
  const hasExtraFields = junctionScalarFields.some(
    (f) => !fkFieldNames.has(f.name),
  );

  return {
    junctionTypeName: junctionNames.typeName,
    junctionSingularName: junctionNames.singularName,
    junctionCreateMutation,
    junctionDeleteMutation,
    junctionCreateInputType: getCreateInputTypeName(junctionTable),
    junctionDeleteInputType: getDeleteInputTypeName(junctionTable),
    leftFkField: {
      name: leftFk.name,
      tsType: fieldTypeToTs(leftFk.type),
    },
    rightFkField: {
      name: rightFk.name,
      tsType: fieldTypeToTs(rightFk.type),
    },
    hasExtraFields,
    addMethodName: `add${singularRight}${suffix}`,
    removeMethodName: `remove${singularRight}${suffix}`,
  };
}

/**
 * Determine which M:N relations need disambiguation (multiple to same right table).
 */
export function getDisambiguationSet(relations: CleanManyToManyRelation[]): Set<number> {
  const rightTableCounts = new Map<string, number>();
  for (const rel of relations) {
    rightTableCounts.set(
      rel.rightTable,
      (rightTableCounts.get(rel.rightTable) ?? 0) + 1,
    );
  }
  const needsDisambiguation = new Set<number>();
  relations.forEach((rel, i) => {
    if ((rightTableCounts.get(rel.rightTable) ?? 0) > 1) {
      needsDisambiguation.add(i);
    }
  });
  return needsDisambiguation;
}

/**
 * Collect all junction mutation metadata from a set of tables.
 * Called once in the codegen orchestrator and passed to all generators.
 */
export function collectJunctionMutations(tables: CleanTable[]): JunctionMutationMeta[] {
  const result: JunctionMutationMeta[] = [];
  const tableMap = new Map(tables.map((t) => [t.name, t]));

  for (const table of tables) {
    const m2m = table.relations.manyToMany;
    if (!m2m.length) continue;

    const disambigSet = getDisambiguationSet(m2m);

    m2m.forEach((rel, i) => {
      const info = resolveJunctionInfo(table, rel, tables, disambigSet.has(i));
      if (!info) return;

      // rightTable is guaranteed to exist if resolveJunctionInfo succeeded
      const rightTable = tableMap.get(rel.rightTable)!;
      result.push({ leftTable: table, rightTable, info });
    });
  }

  return result;
}

// ============================================================================
// Naming helpers
// ============================================================================

/**
 * Get the hook name for a junction mutation (add or remove).
 * e.g., "usePostAddTagMutation" / "usePostRemoveTagMutation"
 */
export function getJunctionHookName(
  jm: JunctionMutationMeta,
  kind: 'add' | 'remove',
): string {
  const leftNames = getTableNames(jm.leftTable);
  const methodName = kind === 'add' ? jm.info.addMethodName : jm.info.removeMethodName;
  return `use${leftNames.typeName}${ucFirst(methodName)}Mutation`;
}
