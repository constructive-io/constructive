/**
 * Transform _meta query response to CleanTable[] format
 */
import type {
  CleanTable,
  CleanField,
  CleanFieldType,
  CleanRelations,
  CleanBelongsToRelation,
  CleanHasOneRelation,
  CleanHasManyRelation,
  CleanManyToManyRelation,
  TableInflection,
  TableQueryNames,
  TableConstraints,
  ConstraintInfo,
  ForeignKeyConstraint,
} from '../../types/schema';

import type {
  MetaQueryResponse,
  MetaTable,
  MetaField,
  MetaFieldType,
  MetaConstraint,
  MetaForeignKeyConstraint,
  MetaBelongsToRelation,
  MetaHasRelation,
  MetaManyToManyRelation,
} from './meta-query';

/**
 * Transform _meta response to CleanTable array
 */
export function transformMetaToCleanTables(
  metaResponse: MetaQueryResponse
): CleanTable[] {
  const { tables } = metaResponse._meta;

  return tables.map((table) => transformTable(table));
}

/**
 * Transform a single MetaTable to CleanTable
 */
function transformTable(table: MetaTable): CleanTable {
  return {
    name: table.name,
    fields: transformFields(table.fields),
    relations: transformRelations(table.relations),
    inflection: transformInflection(table.inflection),
    query: transformQuery(table.query),
    constraints: transformConstraints(table),
  };
}

/**
 * Transform MetaField[] to CleanField[]
 */
function transformFields(fields: MetaField[]): CleanField[] {
  return fields.map((field) => ({
    name: field.name,
    type: transformFieldType(field.type),
  }));
}

/**
 * Transform MetaFieldType to CleanFieldType
 */
function transformFieldType(type: MetaFieldType): CleanFieldType {
  return {
    gqlType: type.gqlType,
    isArray: type.isArray,
    modifier: type.modifier,
    pgAlias: type.pgAlias,
    pgType: type.pgType,
    subtype: type.subtype,
    typmod: type.typmod,
  };
}

/**
 * Transform table relations
 */
function transformRelations(relations: MetaTable['relations']): CleanRelations {
  return {
    belongsTo: relations.belongsTo.map(transformBelongsTo),
    hasOne: relations.hasOne.map(transformHasOne),
    hasMany: relations.hasMany.map(transformHasMany),
    manyToMany: relations.manyToMany.map(transformManyToMany),
  };
}

/**
 * Transform belongsTo relation
 */
function transformBelongsTo(rel: MetaBelongsToRelation): CleanBelongsToRelation {
  return {
    fieldName: rel.fieldName,
    isUnique: rel.isUnique,
    referencesTable: rel.references.name,
    type: rel.type,
    keys: transformFields(rel.keys),
  };
}

/**
 * Transform hasOne relation
 */
function transformHasOne(rel: MetaHasRelation): CleanHasOneRelation {
  return {
    fieldName: rel.fieldName,
    isUnique: rel.isUnique,
    referencedByTable: rel.referencedBy.name,
    type: rel.type,
    keys: transformFields(rel.keys),
  };
}

/**
 * Transform hasMany relation
 */
function transformHasMany(rel: MetaHasRelation): CleanHasManyRelation {
  return {
    fieldName: rel.fieldName,
    isUnique: rel.isUnique,
    referencedByTable: rel.referencedBy.name,
    type: rel.type,
    keys: transformFields(rel.keys),
  };
}

/**
 * Transform manyToMany relation
 */
function transformManyToMany(rel: MetaManyToManyRelation): CleanManyToManyRelation {
  return {
    fieldName: rel.fieldName,
    rightTable: rel.rightTable.name,
    junctionTable: rel.junctionTable.name,
    type: rel.type,
  };
}

/**
 * Transform inflection data
 */
function transformInflection(
  inflection: MetaTable['inflection']
): TableInflection {
  return {
    allRows: inflection.allRows,
    allRowsSimple: inflection.allRowsSimple,
    conditionType: inflection.conditionType,
    connection: inflection.connection,
    createField: inflection.createField,
    createInputType: inflection.createInputType,
    createPayloadType: inflection.createPayloadType,
    deleteByPrimaryKey: inflection.deleteByPrimaryKey,
    deletePayloadType: inflection.deletePayloadType,
    edge: inflection.edge,
    edgeField: inflection.edgeField,
    enumType: inflection.enumType,
    filterType: inflection.filterType,
    inputType: inflection.inputType,
    orderByType: inflection.orderByType,
    patchField: inflection.patchField,
    patchType: inflection.patchType,
    tableFieldName: inflection.tableFieldName,
    tableType: inflection.tableType,
    typeName: inflection.typeName,
    updateByPrimaryKey: inflection.updateByPrimaryKey,
    updatePayloadType: inflection.updatePayloadType,
  };
}

/**
 * Transform query names
 */
function transformQuery(query: MetaTable['query']): TableQueryNames {
  return {
    all: query.all,
    one: query.one,
    create: query.create,
    update: query.update,
    delete: query.delete,
  };
}

/**
 * Transform constraints
 */
function transformConstraints(table: MetaTable): TableConstraints {
  return {
    primaryKey: table.primaryKeyConstraints.map(transformConstraint),
    foreignKey: table.foreignKeyConstraints.map(transformForeignKeyConstraint),
    unique: table.uniqueConstraints.map(transformConstraint),
  };
}

/**
 * Transform a basic constraint
 */
function transformConstraint(constraint: MetaConstraint): ConstraintInfo {
  return {
    name: constraint.name,
    fields: transformFields(constraint.fields),
  };
}

/**
 * Transform a foreign key constraint
 */
function transformForeignKeyConstraint(
  constraint: MetaForeignKeyConstraint
): ForeignKeyConstraint {
  return {
    name: constraint.name,
    fields: transformFields(constraint.fields),
    refTable: constraint.refTable.name,
    refFields: transformFields(constraint.refFields),
  };
}

/**
 * Get table names from CleanTable array
 */
export function getTableNames(tables: CleanTable[]): string[] {
  return tables.map((t) => t.name);
}

/**
 * Find a table by name
 */
export function findTable(
  tables: CleanTable[],
  name: string
): CleanTable | undefined {
  return tables.find((t) => t.name === name);
}

/**
 * Filter tables by name pattern (glob-like)
 */
export function filterTables(
  tables: CleanTable[],
  include?: string[],
  exclude?: string[]
): CleanTable[] {
  let result = tables;

  if (include && include.length > 0) {
    result = result.filter((t) => matchesPatterns(t.name, include));
  }

  if (exclude && exclude.length > 0) {
    result = result.filter((t) => !matchesPatterns(t.name, exclude));
  }

  return result;
}

/**
 * Check if a name matches any of the patterns
 * Supports simple glob patterns with * wildcard
 */
function matchesPatterns(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );
      return regex.test(name);
    }
    return name === pattern;
  });
}
