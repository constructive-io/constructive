import type { Table, TableInflection, TableQueryNames } from '@constructive-io/graphql-query/types/schema';

// Vendored from constructive-client's `@constructive-io/data` (not published to
// the registry). We query the per-DB data endpoint's `_meta` introspection and
// reshape each table into the `Table` shape `buildPostGraphileCreate` expects.
// Relations are intentionally left empty: the create-mutation builder only reads
// them to skip relational fields in the return selection, and every `_meta` field
// is a real scalar column, so selecting them all is valid.
//
// Only fields the live backend's `_meta` actually exposes are selected here —
// over-selecting (e.g. MetaType.modifier or MetaInflection.createField) fails
// GraphQL validation. The reshapers below tolerate the omitted fields.

export const META_QUERY = `
  query DbToolsMeta {
    _meta {
      tables {
        name
        query { all one create update delete }
        inflection {
          allRows
          conditionType
          connection
          createInputType
          createPayloadType
          deletePayloadType
          edge
          filterType
          orderByType
          patchType
          tableType
          updatePayloadType
        }
        fields {
          name
          isNotNull
          hasDefault
          type {
            gqlType
            isArray
            pgType
            subtype
            isNotNull
            hasDefault
          }
        }
      }
    }
  }
`;

type RawType = {
  gqlType: string;
  isArray: boolean;
  modifier?: string | number | null;
  pgAlias?: string | null;
  pgType?: string | null;
  subtype?: string | null;
  typmod?: number | null;
  isNotNull?: boolean | null;
  hasDefault?: boolean | null;
};

type RawField = {
  name: string;
  isNotNull?: boolean | null;
  hasDefault?: boolean | null;
  type: RawType;
};

type RawInflection = Partial<Record<keyof TableInflection, string | null>>;

type RawQuery = {
  all: string;
  one?: string | null;
  create?: string | null;
  update?: string | null;
  delete?: string | null;
};

export type RawMetaTable = {
  name: string;
  query?: RawQuery | null;
  inflection?: RawInflection | null;
  fields?: (RawField | null)[] | null;
};

export type MetaResponse = {
  _meta?: { tables?: (RawMetaTable | null)[] | null } | null;
};

function pgFieldToCamelCase(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function convertInflection(inflection: RawInflection | null | undefined): TableInflection | undefined {
  if (!inflection) return undefined;
  const s = (key: keyof TableInflection): string => inflection[key] ?? '';
  const n = (key: keyof TableInflection): string | null => inflection[key] ?? null;
  return {
    allRows: s('allRows'),
    allRowsSimple: s('allRowsSimple'),
    conditionType: s('conditionType'),
    connection: s('connection'),
    createField: s('createField'),
    createInputType: s('createInputType'),
    createPayloadType: s('createPayloadType'),
    deleteByPrimaryKey: n('deleteByPrimaryKey'),
    deletePayloadType: s('deletePayloadType'),
    edge: s('edge'),
    edgeField: s('edgeField'),
    enumType: s('enumType'),
    filterType: n('filterType'),
    inputType: s('inputType'),
    orderByType: s('orderByType'),
    patchField: s('patchField'),
    patchType: n('patchType'),
    tableFieldName: s('tableFieldName'),
    tableType: s('tableType'),
    typeName: s('typeName'),
    updateByPrimaryKey: n('updateByPrimaryKey'),
    updatePayloadType: n('updatePayloadType'),
  };
}

function convertQuery(query: RawQuery | null | undefined): TableQueryNames | undefined {
  if (!query) return undefined;
  return {
    all: query.all,
    one: query.one ?? null,
    create: query.create ?? '',
    update: query.update ?? null,
    delete: query.delete ?? null,
  };
}

export function cleanTable(meta: RawMetaTable): Table {
  return {
    name: meta.name,
    inflection: convertInflection(meta.inflection),
    query: convertQuery(meta.query),
    fields: (meta.fields ?? [])
      .filter((f): f is RawField => Boolean(f))
      .map((field) => ({
        name: pgFieldToCamelCase(field.name),
        type: {
          gqlType: field.type.gqlType,
          isArray: field.type.isArray,
          modifier: field.type.modifier,
          pgAlias: field.type.pgAlias,
          pgType: field.type.pgType,
          subtype: field.type.subtype,
          typmod: field.type.typmod,
        },
        isNotNull: field.isNotNull ?? field.type.isNotNull ?? null,
        hasDefault: field.hasDefault ?? field.type.hasDefault ?? null,
      })),
    relations: { belongsTo: [], hasOne: [], hasMany: [], manyToMany: [] },
  };
}

function normalizeTableLookupKey(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getTableLookupVariants(value: string | null | undefined): string[] {
  const normalized = normalizeTableLookupKey(value);
  if (!normalized) return [];
  const variants = new Set<string>([normalized]);
  if (normalized.endsWith('y')) {
    variants.add(`${normalized}s`);
    variants.add(`${normalized.slice(0, -1)}ies`);
  }
  if (normalized.endsWith('ies')) {
    variants.add(`${normalized.slice(0, -3)}y`);
  }
  if (/(s|x|z|ch|sh)$/.test(normalized)) variants.add(`${normalized}es`);
  if (normalized.endsWith('es')) variants.add(normalized.slice(0, -2));
  if (!normalized.endsWith('s')) variants.add(`${normalized}s`);
  if (normalized.endsWith('s')) variants.add(normalized.slice(0, -1));
  return [...variants].filter(Boolean);
}

// Resolve a user-supplied table name (snake_case singular or plural) against the
// PascalCase-singular `_meta` table names, tolerating pluralization differences.
export function findMetaTable(tables: RawMetaTable[], requested: string): RawMetaTable | undefined {
  const index = new Map<string, RawMetaTable>();
  for (const table of tables) {
    const keys = [
      table.name,
      table.query?.all,
      table.query?.one,
      table.inflection?.tableType,
      table.inflection?.tableFieldName,
      table.inflection?.allRows,
    ];
    for (const key of keys) {
      for (const variant of getTableLookupVariants(key)) {
        if (!index.has(variant)) index.set(variant, table);
      }
    }
  }
  for (const variant of getTableLookupVariants(requested)) {
    const match = index.get(variant);
    if (match) return match;
  }
  return undefined;
}
