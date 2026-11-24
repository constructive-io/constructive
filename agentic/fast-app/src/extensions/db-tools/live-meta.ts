// Contract-gated `_meta` access for app data endpoints (api-<db>).
//
// The deployed `_meta` contract varies across backends: a selection that names
// a field the backend does not serve fails GraphQL validation outright. So the
// selection is built per endpoint from a one-time introspection of `MetaTable`
// field names (the same pattern @constructive-io/sheets uses for type fields),
// and each per-table block below is included only when the contract serves it.
//
// Self-contained on purpose (no constructive imports): the pi package may later
// absorb this module, and the pnpm test runner resolves it directly.

export type GraphqlErrorLike = { message?: string; extensions?: Record<string, unknown> };
export type GraphqlResult<T> = { data?: T; errors?: GraphqlErrorLike[] };
export type GraphqlExecute = (
  query: string,
  variables?: Record<string, unknown>,
) => Promise<GraphqlResult<unknown>>;

export type LiveMetaOperations = {
  all: string;
  // null = the operation does not exist on the live endpoint (not generated or
  // not permitted). Preserve it — callers read absence as a fact.
  one?: string | null;
  create?: string | null;
  update?: string | null;
  delete?: string | null;
};

export type LiveMetaField = {
  name: string;
  // The SQL column name; `name` is the GraphQL field.
  columnName?: string;
  isNotNull?: boolean;
  hasDefault?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  description?: string | null;
  enumValues?: { name: string; values: string[] } | null;
  // The values a check constraint allows (a DataStatusField's set).
  allowedValues?: string[] | null;
  isRequiredOnCreate?: boolean | null;
  isWritableOnCreate?: boolean | null;
  isWritableOnUpdate?: boolean | null;
  type?: {
    gqlType: string;
    isArray: boolean;
    pgType: string;
    subtype: string | null;
    isNotNull: boolean;
    hasDefault: boolean;
  };
};

type NamedRef = { name: string };

export type LiveMetaBelongsToRelation = {
  fieldName: string;
  isUnique: boolean;
  type: string;
  keys: NamedRef[];
  references: NamedRef;
};

export type LiveMetaHasRelation = {
  fieldName: string;
  isUnique: boolean;
  type: string;
  keys: NamedRef[];
  referencedBy: NamedRef;
};

export type LiveMetaManyToManyRelation = {
  fieldName: string;
  type: string;
  junctionTable: NamedRef;
  rightTable: NamedRef;
};

export type LiveMetaRelations = {
  belongsTo: LiveMetaBelongsToRelation[];
  has: LiveMetaHasRelation[];
  hasOne: LiveMetaHasRelation[];
  hasMany: LiveMetaHasRelation[];
  manyToMany: LiveMetaManyToManyRelation[];
};

export type LiveMetaConstraint = { name: string; fields: NamedRef[] };

export type LiveMetaConstraints = {
  primaryKey: LiveMetaConstraint | null;
  unique: LiveMetaConstraint[];
  foreignKey: Array<LiveMetaConstraint & { refTable: NamedRef; refFields: NamedRef[] }>;
};

export type LiveMetaScope = {
  scope: string;
  tier: string;
  keyColumn: string;
  entityTable: string;
  source: string;
};

export type LiveMetaTable = {
  name: string;
  // The SQL table name; `name` is the GraphQL type. Served since mid-October 2026.
  tableName?: string;
  schemaName?: string;
  query?: LiveMetaOperations;
  inflection?: Record<string, string>;
  fields?: LiveMetaField[];
  relations?: LiveMetaRelations;
  constraints?: LiveMetaConstraints;
  storage?: { isFilesTable: boolean; isBucketsTable: boolean } | null;
  search?: {
    hasUnifiedSearch: boolean;
    columns: Array<{ name: string; algorithm: string }>;
  } | null;
  i18n?: {
    translationTable: string;
    translatableFields: Array<{ name: string; type: string }>;
  } | null;
  realtime?: { subscriptionFieldName: string } | null;
  scope?: LiveMetaScope | null;
  // A table of two foreign keys that links two others (many-to-many).
  isJunction?: boolean;
};

/**
 * A table the platform's own modules own, not the app: the site, domain and route
 * tables the site-hosting overlay puts on the app API (`scope: database`). Their
 * rows belong to the platform's lifecycle, so the app gets no screens for them
 * and verify_app doesn't create rows in them.
 */
export function isPlatformTable(table: Pick<LiveMetaTable, 'scope'>): boolean {
  return table.scope?.scope === 'database';
}

export const META_TABLE_TYPE_NAME = 'MetaTable';
export const META_FIELD_TYPE_NAME = 'MetaField';

// The table and the field contract in one round trip.
export const TYPE_FIELDS_QUERY =
  'query TypeFields($tableType: String!, $fieldType: String!) { table: __type(name: $tableType) { fields { name } } field: __type(name: $fieldType) { fields { name } } }';

/** The `MetaTable` and `MetaField` field names a backend serves. */
export type MetaContract = { table: ReadonlySet<string>; field: ReadonlySet<string> };

const FIELD_SELECTION =
  'name isNotNull hasDefault isPrimaryKey isForeignKey description enumValues { name values } type { gqlType isArray pgType subtype isNotNull hasDefault }';

// MetaField facts a newer backend adds for forms; each is selected only where
// the backend serves it, so an older one gets the same query as before.
export const FIELD_EXTRA_SELECTIONS: readonly string[] = [
  'columnName',
  'allowedValues',
  'isRequiredOnCreate',
  'isWritableOnCreate',
  'isWritableOnUpdate',
];

const HAS_RELATION_SELECTION = 'fieldName isUnique type keys { name } referencedBy { name }';

// Ordered (field, selection) pairs — one entry per MetaTable field the helper
// knows how to select. Shapes verified against a live backend on 2026-08-03
// (api-diary-app.launchql.dev); `scope` comes from the graphile-meta contract
// and starts flowing as soon as a backend serves it.
export const TABLE_FIELD_SELECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['name', 'name'],
  ['tableName', 'tableName'],
  ['schemaName', 'schemaName'],
  ['query', 'query { all one create update delete }'],
  [
    'inflection',
    'inflection { tableType allRows connection edge filterType orderByType conditionType patchType createInputType createPayloadType updatePayloadType deletePayloadType }',
  ],
  ['fields', `fields { ${FIELD_SELECTION} }`],
  [
    'relations',
    `relations { belongsTo { fieldName isUnique type keys { name } references { name } } has { ${HAS_RELATION_SELECTION} } hasOne { ${HAS_RELATION_SELECTION} } hasMany { ${HAS_RELATION_SELECTION} } manyToMany { fieldName type junctionTable { name } rightTable { name } } }`,
  ],
  [
    'constraints',
    'constraints { primaryKey { name fields { name } } unique { name fields { name } } foreignKey { name fields { name } refTable { name } refFields { name } } }',
  ],
  ['storage', 'storage { isFilesTable isBucketsTable }'],
  ['search', 'search { hasUnifiedSearch columns { name algorithm } }'],
  ['i18n', 'i18n { translationTable translatableFields { name type } }'],
  ['realtime', 'realtime { subscriptionFieldName }'],
  ['scope', 'scope { scope tier keyColumn entityTable source }'],
  ['isJunction', 'isJunction'],
] as const;

export function createGraphqlExecute(endpoint: string, token?: string): GraphqlExecute {
  return async (query, variables) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });
    // GraphQL validation failures can ride on non-2xx statuses; a JSON body
    // with `errors` is still the more useful signal than the bare status.
    const body = (await response.json().catch((): null => null)) as GraphqlResult<unknown> | null;
    if (!body) {
      throw new Error(`GraphQL request to ${endpoint} failed with HTTP ${response.status}.`);
    }
    return body;
  };
}

export function graphqlErrorText(errors: GraphqlErrorLike[]): string {
  return errors
    .map((e) => {
      const code = e.extensions?.code;
      return e.message || (typeof code === 'string' ? code : '');
    })
    .filter(Boolean)
    .join('; ');
}

type TypeFields = { fields?: Array<{ name?: string } | null> } | null | undefined;

const fieldNames = (type: TypeFields) =>
  new Set(
    (type?.fields ?? []).map((field) => field?.name).filter((name): name is string => !!name),
  );

// null = the endpoint has no MetaTable type, i.e. it is not a Constructive
// data endpoint (or `_meta` is not deployed there).
export async function introspectMetaContract(
  execute: GraphqlExecute,
): Promise<MetaContract | null> {
  const result = await execute(TYPE_FIELDS_QUERY, {
    tableType: META_TABLE_TYPE_NAME,
    fieldType: META_FIELD_TYPE_NAME,
  });
  if (result.errors?.length) {
    throw new Error(graphqlErrorText(result.errors));
  }
  const data = result.data as { table?: TypeFields; field?: TypeFields } | undefined;
  const table = fieldNames(data?.table);
  return table.has('name') ? { table, field: fieldNames(data?.field) } : null;
}

export function buildLiveMetaQuery(
  availableFields: ReadonlySet<string>,
  fieldContract: ReadonlySet<string> = new Set(),
): string {
  const extras = FIELD_EXTRA_SELECTIONS.filter((field) => fieldContract.has(field));
  const selection = TABLE_FIELD_SELECTIONS.filter(([field]) => availableFields.has(field))
    .map(([field, block]) =>
      field === 'fields' && extras.length
        ? `fields { ${FIELD_SELECTION} ${extras.join(' ')} }`
        : block,
    )
    .join(' ');
  return `query LiveMeta { _meta { tables { ${selection} } } }`;
}

const metaQueryCache = new Map<string, Promise<string | null>>();

// One introspection round-trip per endpoint for the process lifetime — the
// served contract only changes with a backend deploy.
export function resolveLiveMetaQuery(
  endpoint: string,
  execute: GraphqlExecute,
): Promise<string | null> {
  const cached = metaQueryCache.get(endpoint);
  if (cached) return cached;
  const pending = introspectMetaContract(execute)
    .then((contract) => (contract ? buildLiveMetaQuery(contract.table, contract.field) : null))
    .catch((err: unknown) => {
      metaQueryCache.delete(endpoint);
      throw err;
    });
  metaQueryCache.set(endpoint, pending);
  return pending;
}

export function parseLiveMetaTables(data: unknown): LiveMetaTable[] {
  const tables = (data as { _meta?: { tables?: Array<LiveMetaTable | null> } } | undefined)?._meta
    ?.tables;
  if (!tables) return [];
  return tables.filter((t): t is LiveMetaTable => Boolean(t?.name));
}

export async function fetchLiveMeta(endpoint: string, token?: string): Promise<LiveMetaTable[]> {
  const execute = createGraphqlExecute(endpoint, token);
  const query = await resolveLiveMetaQuery(endpoint, execute);
  if (!query) {
    throw new Error(
      `The endpoint ${endpoint} does not serve a Constructive \`_meta\` contract (no MetaTable type).`,
    );
  }
  const result = await execute(query);
  if (result.errors?.length) {
    throw new Error(graphqlErrorText(result.errors));
  }
  return parseLiveMetaTables(result.data);
}
