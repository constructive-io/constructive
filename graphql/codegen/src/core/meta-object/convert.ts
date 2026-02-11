import type { MetaFieldType } from '../types';

// Input schema types (from _meta query response)
interface MetaSchemaField {
  name: string;
  type: MetaFieldType;
}

interface MetaSchemaConstraint {
  fields: MetaSchemaField[];
}

interface MetaSchemaForeignConstraint {
  fields: MetaSchemaField[];
  refFields: MetaSchemaField[];
  refTable: { name: string };
}

interface MetaSchemaBelongsTo {
  keys: MetaSchemaField[];
  fieldName: string;
}

interface MetaSchemaRelations {
  belongsTo: MetaSchemaBelongsTo[];
}

interface MetaSchemaTable {
  name: string;
  fields: MetaSchemaField[];
  primaryKeyConstraints: MetaSchemaConstraint[];
  uniqueConstraints: MetaSchemaConstraint[];
  foreignKeyConstraints: MetaSchemaForeignConstraint[];
  relations: MetaSchemaRelations;
}

interface MetaSchemaInput {
  _meta: {
    tables: MetaSchemaTable[];
  };
}

// Output types (internal MetaObject format)
interface ConvertedField {
  name: string;
  type: MetaFieldType;
  alias?: string;
}

interface ConvertedConstraint {
  name: string;
  type: MetaFieldType;
  alias?: string;
}

interface ConvertedForeignConstraint {
  refTable: string;
  fromKey: ConvertedField;
  toKey: ConvertedField;
}

interface ConvertedTable {
  name: string;
  fields: ConvertedField[];
  primaryConstraints: ConvertedConstraint[];
  uniqueConstraints: ConvertedConstraint[];
  foreignConstraints: ConvertedForeignConstraint[];
}

interface ConvertedMetaObject {
  tables: ConvertedTable[];
}

/**
 * Convert from raw _meta schema response to internal MetaObject format
 */
export function convertFromMetaSchema(
  metaSchema: MetaSchemaInput,
): ConvertedMetaObject {
  const {
    _meta: { tables },
  } = metaSchema;

  const result: ConvertedMetaObject = {
    tables: [],
  };

  for (const table of tables) {
    result.tables.push({
      name: table.name,
      fields: table.fields.map((f) => pickField(f)),
      primaryConstraints: pickArrayConstraint(table.primaryKeyConstraints),
      uniqueConstraints: pickArrayConstraint(table.uniqueConstraints),
      foreignConstraints: pickForeignConstraint(
        table.foreignKeyConstraints,
        table.relations,
      ),
    });
  }

  return result;
}

function pickArrayConstraint(
  constraints: MetaSchemaConstraint[],
): ConvertedConstraint[] {
  if (constraints.length === 0) return [];
  const c = constraints[0];
  return c.fields.map((field) => pickConstraintField(field));
}

function pickForeignConstraint(
  constraints: MetaSchemaForeignConstraint[],
  relations: MetaSchemaRelations,
): ConvertedForeignConstraint[] {
  if (constraints.length === 0) return [];

  const { belongsTo } = relations;

  return constraints.map((c) => {
    const { fields, refFields, refTable } = c;

    const fromKey = pickField(fields[0]);
    const toKey = pickField(refFields[0]);

    const matchingBelongsTo = belongsTo.find((belongsToItem) => {
      const field = pickField(belongsToItem.keys[0]);
      return field.name === fromKey.name;
    });

    // Ex: 'ownerId' will have an alias of 'owner', which has further selection of 'User' type
    if (matchingBelongsTo) {
      fromKey.alias = matchingBelongsTo.fieldName;
    }

    return {
      refTable: refTable.name,
      fromKey,
      toKey,
    };
  });
}

function pickField(field: MetaSchemaField): ConvertedField {
  return {
    name: field.name,
    type: field.type,
  };
}

function pickConstraintField(field: MetaSchemaField): ConvertedConstraint {
  return {
    name: field.name,
    type: field.type,
  };
}
