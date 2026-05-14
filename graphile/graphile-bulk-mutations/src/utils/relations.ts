/**
 * Relation discovery utilities for bulk relational/nested inserts.
 *
 * Inspects the PostGraphile registry to find "has many" (isReferencee)
 * relations for a given resource. For each qualifying relation, computes
 * column metadata needed to build child INSERT statements.
 */

import type { ColumnSpec } from './sql-builder';

/**
 * Metadata for a single "has many" relation eligible for nested inserts.
 */
export interface NestedRelationInfo {
  /** Registry key of the relation (e.g. "productsByCategoryId") */
  relationName: string;
  /** GraphQL field name on the parent values item type */
  fieldName: string;
  /** The remote (child) PgResource */
  remoteResource: any;
  /** Registry key of the remote resource */
  remoteResourceName: string;
  /** PK columns on the parent that the FK references */
  localAttributes: string[];
  /** FK columns on the child table */
  remoteAttributes: string[];
  /** GraphQL field name → SQL column name for child */
  childFieldToAttr: Record<string, string>;
  /** Column specs for building child INSERT SQL */
  childColumnSpecs: ColumnSpec[];
  /** Compiled SQL table name for the child */
  childCompiledFrom: string;
  /** PK columns on the child table */
  childPkColumns: string[];
}

/**
 * Discover "has many" relations for a resource that qualify for nested
 * inserts. A relation qualifies when:
 *
 * 1. isReferencee is true (the remote table references the local table)
 * 2. isUnique is false (one-to-many, not one-to-one)
 * 3. The remote resource is a regular table (has attributes, uniques, etc.)
 */
export function discoverNestedRelations(
  resource: any,
  pgRegistry: any,
  inflection: any,
  sql: any
): NestedRelationInfo[] {
  const codecName = resource.codec.name;
  const relations = pgRegistry.pgRelations[codecName];
  if (!relations) return [];

  const result: NestedRelationInfo[] = [];

  for (const [relationName, relation] of Object.entries(relations) as [string, any][]) {
    // Only reverse relations (child references parent)
    if (!relation.isReferencee) continue;
    // Only one-to-many (skip one-to-one)
    if (relation.isUnique) continue;

    const remoteResource = relation.remoteResource;
    if (!remoteResource?.codec?.attributes) continue;
    if (remoteResource.codec.polymorphism) continue;
    if (remoteResource.codec.isAnonymous) continue;
    if (!remoteResource.uniques?.length) continue;

    // Build child column metadata (all insertable columns)
    const childFieldToAttr: Record<string, string> = {};
    const childColumnSpecs: ColumnSpec[] = [];

    for (const [attrName, attr] of Object.entries(
      remoteResource.codec.attributes
    ) as [string, any][]) {
      if (attr.extensions?.isInsertable === false) continue;

      const gqlFieldName = inflection.attribute({
        attributeName: attrName,
        codec: remoteResource.codec
      });
      childFieldToAttr[gqlFieldName] = attrName;
      childColumnSpecs.push({
        name: attrName,
        sqlType: sql.compile(attr.codec.sqlType).text
      });
    }

    // Find PK columns for child
    const childPrimaryUnique =
      remoteResource.uniques.find((u: any) => u.isPrimary) ??
      remoteResource.uniques[0];
    const childPkColumns: string[] = [...childPrimaryUnique.attributes];

    const childCompiledFrom = sql.compile(remoteResource.from).text;

    // Find the registry key of the remote resource
    let remoteResourceName = '';
    for (const [name, res] of Object.entries(pgRegistry.pgResources) as [
      string,
      any,
    ][]) {
      if (res === remoteResource) {
        remoteResourceName = name;
        break;
      }
    }

    // Derive a clean GraphQL field name from the remote resource name
    const fieldName = inflection.camelCase(remoteResourceName);

    result.push({
      relationName,
      fieldName,
      remoteResource,
      remoteResourceName,
      localAttributes: [...relation.localAttributes] as string[],
      remoteAttributes: [...relation.remoteAttributes] as string[],
      childFieldToAttr,
      childColumnSpecs,
      childCompiledFrom,
      childPkColumns
    });
  }

  return result;
}
