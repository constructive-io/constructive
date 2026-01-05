/**
 * The _meta GraphQL query for introspecting PostGraphile schema
 * This query fetches all table metadata including fields, constraints, and relations
 */

export const META_QUERY = `
query Meta {
  _meta {
    tables {
      name
      query {
        all
        create
        delete
        one
        update
      }
      fields {
        name
        type {
          gqlType
          isArray
          modifier
          pgAlias
          pgType
          subtype
          typmod
        }
      }
      inflection {
        allRows
        allRowsSimple
        conditionType
        connection
        createField
        createInputType
        createPayloadType
        deleteByPrimaryKey
        deletePayloadType
        edge
        edgeField
        enumType
        filterType
        inputType
        orderByType
        patchField
        patchType
        tableFieldName
        tableType
        typeName
        updateByPrimaryKey
        updatePayloadType
      }
      primaryKeyConstraints {
        name
        fields {
          name
          type {
            gqlType
            isArray
            modifier
            pgAlias
            pgType
            subtype
            typmod
          }
        }
      }
      uniqueConstraints {
        name
        fields {
          name
          type {
            gqlType
            isArray
            modifier
            pgAlias
            pgType
            subtype
            typmod
          }
        }
      }
      foreignKeyConstraints {
        name
        fields {
          name
          type {
            gqlType
            isArray
            modifier
            pgAlias
            pgType
            subtype
            typmod
          }
        }
        refFields {
          name
          type {
            gqlType
            isArray
            modifier
            pgAlias
            pgType
            subtype
            typmod
          }
        }
        refTable {
          name
        }
      }
      relations {
        belongsTo {
          fieldName
          isUnique
          keys {
            name
            type {
              gqlType
              isArray
              modifier
              pgAlias
              pgType
              subtype
              typmod
            }
          }
          references {
            name
          }
          type
        }
        hasOne {
          fieldName
          isUnique
          keys {
            name
            type {
              gqlType
              isArray
              modifier
              pgAlias
              pgType
              subtype
              typmod
            }
          }
          referencedBy {
            name
          }
          type
        }
        hasMany {
          fieldName
          isUnique
          keys {
            name
            type {
              gqlType
              isArray
              modifier
              pgAlias
              pgType
              subtype
              typmod
            }
          }
          referencedBy {
            name
          }
          type
        }
        manyToMany {
          fieldName
          junctionTable {
            name
          }
          rightTable {
            name
          }
          type
        }
      }
    }
  }
}
`;

/**
 * Types for the _meta query response
 */
export interface MetaFieldType {
  gqlType: string;
  isArray: boolean;
  modifier: string | number | null;
  pgAlias: string | null;
  pgType: string | null;
  subtype: string | null;
  typmod: number | null;
}

export interface MetaField {
  name: string;
  type: MetaFieldType;
}

export interface MetaConstraint {
  name: string;
  fields: MetaField[];
}

export interface MetaForeignKeyConstraint extends MetaConstraint {
  refFields: MetaField[];
  refTable: { name: string };
}

export interface MetaTableQuery {
  all: string;
  create: string;
  delete: string | null;
  one: string;
  update: string | null;
}

export interface MetaTableInflection {
  allRows: string;
  allRowsSimple: string;
  conditionType: string;
  connection: string;
  createField: string;
  createInputType: string;
  createPayloadType: string;
  deleteByPrimaryKey: string | null;
  deletePayloadType: string;
  edge: string;
  edgeField: string;
  enumType: string;
  filterType: string | null;
  inputType: string;
  orderByType: string;
  patchField: string;
  patchType: string | null;
  tableFieldName: string;
  tableType: string;
  typeName: string;
  updateByPrimaryKey: string | null;
  updatePayloadType: string | null;
}

export interface MetaBelongsToRelation {
  fieldName: string | null;
  isUnique: boolean;
  keys: MetaField[];
  references: { name: string };
  type: string | null;
}

export interface MetaHasRelation {
  fieldName: string | null;
  isUnique: boolean;
  keys: MetaField[];
  referencedBy: { name: string };
  type: string | null;
}

export interface MetaManyToManyRelation {
  fieldName: string | null;
  junctionTable: { name: string };
  rightTable: { name: string };
  type: string | null;
}

export interface MetaTableRelations {
  belongsTo: MetaBelongsToRelation[];
  hasOne: MetaHasRelation[];
  hasMany: MetaHasRelation[];
  manyToMany: MetaManyToManyRelation[];
}

export interface MetaTable {
  name: string;
  query: MetaTableQuery;
  fields: MetaField[];
  inflection: MetaTableInflection;
  primaryKeyConstraints: MetaConstraint[];
  uniqueConstraints: MetaConstraint[];
  foreignKeyConstraints: MetaForeignKeyConstraint[];
  relations: MetaTableRelations;
}

export interface MetaQueryResponse {
  _meta: {
    tables: MetaTable[];
  };
}
