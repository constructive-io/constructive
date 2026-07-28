export interface TableMeta {
  name: string;
  schemaName: string;
  fields: FieldMeta[];
  indexes: IndexMeta[];
  constraints: ConstraintsMeta;
  foreignKeyConstraints: ForeignKeyConstraintMeta[];
  primaryKeyConstraints: PrimaryKeyConstraintMeta[];
  uniqueConstraints: UniqueConstraintMeta[];
  relations: RelationsMeta;
  inflection: InflectionMeta;
  query: QueryMeta;
  storage: StorageMeta | null;
  search: SearchMeta | null;
  i18n: I18nMeta | null;
  realtime: RealtimeMeta | null;
  scope: ScopeMeta | null;
}

/** Coarse provisioning tier a table's scope belongs to. */
export type ScopeTier = 'global' | 'database' | 'entity';

export interface ScopeMeta {
  /** The provisioning scope, e.g. 'platform', 'app', 'database', 'org', 'user' */
  scope: string;
  /** Coarse bucket: global (platform/app), database, or entity */
  tier: ScopeTier;
  /** Inflected scope key column (e.g. 'databaseId', 'orgId'), or null for global tiers */
  keyColumn: string | null;
  /** SQL name of the entity table for entity scopes, else null */
  entityTable: string | null;
  /** Provenance of the scope metadata. Always the @scope smart tag. */
  source: 'smartTag';
}

export interface StorageMeta {
  /** Whether this table is tagged as a storage files table */
  isFilesTable: boolean;
  /** Whether this table is tagged as a storage buckets table */
  isBucketsTable: boolean;
}

export interface SearchColumnMeta {
  /** Column name (camelCase inflected) */
  name: string;
  /** Search algorithm: 'tsvector', 'bm25', 'trgm', 'vector' */
  algorithm: string;
}

export interface SearchMeta {
  /** Which search algorithms are active on this table */
  algorithms: string[];
  /** Searchable columns with their algorithm */
  columns: SearchColumnMeta[];
  /** Whether unifiedSearch composite filter is available */
  hasUnifiedSearch: boolean;
  /** Per-table search config from @searchConfig smart tag */
  config: SearchConfigMeta | null;
}

export interface SearchConfigMeta {
  /** Per-adapter score weights */
  weights: Record<string, number> | null;
  /** Whether recency boosting is enabled */
  boostRecent: boolean;
  /** Field used for recency decay */
  boostRecencyField: string | null;
  /** Exponential decay factor per day */
  boostRecencyDecay: number | null;
}

export interface I18nFieldMeta {
  /** Inflected GraphQL field name */
  name: string;
  /** PostgreSQL column type (text, citext) */
  type: string;
}

export interface I18nMeta {
  /** Name of the translation table */
  translationTable: string;
  /** Fields that are translatable */
  translatableFields: I18nFieldMeta[];
}

export interface RealtimeMeta {
  /** The generated subscription field name (e.g. onPostChanged) */
  subscriptionFieldName: string;
}

export interface EnumMeta {
  /** The PostgreSQL enum type name */
  name: string;
  /** Allowed values for this enum */
  values: string[];
}

export interface FieldMeta {
  name: string;
  type: TypeMeta;
  isNotNull: boolean;
  hasDefault: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description: string | null;
  enumValues: EnumMeta | null;
}

export interface TypeMeta {
  pgType: string;
  gqlType: string;
  isArray: boolean;
  isNotNull?: boolean;
  hasDefault?: boolean;
  subtype?: string | null;
  /**
   * How the client must serialize/parse this scalar. `null` for plain scalars
   * (String/Int/Float/Boolean/JSON/enum) whose wire format is obvious from
   * `gqlType` — populated only for scalars introspection can't fully describe.
   */
  encoding?: ScalarEncodingMeta | null;
}

/** The machine kind a scalar marshals as on the client. */
export type ScalarEncodingKind =
  | 'bigint'
  | 'datetime'
  | 'date'
  | 'time'
  | 'interval'
  | 'uuid'
  | 'geojson'
  | 'point'
  | 'inet'
  | 'ltree'
  | 'vector'
  | 'bytea'
  | 'composite';

export interface ScalarEncodingMeta {
  /** Deterministic kind derived from the underlying (unwrapped) codec. */
  kind: ScalarEncodingKind;
  /** For 'vector': element scalar (e.g. 'float'), else null. */
  elementType?: string | null;
  /** For 'vector': declared length from typmod, else null. */
  dimensions?: number | null;
  /** For 'geojson': geometry subtype (Point/LineString/Polygon/…), else null. */
  geometrySubtype?: string | null;
  /** For 'geojson': spatial reference id, else null. */
  srid?: number | null;
  /** For 'ltree': values are dot-separated path strings ('a.b.c'). */
  dotPath?: boolean;
  /** For 'composite': nested attribute encodings. */
  fields?: { name: string; type: TypeMeta }[] | null;
}

export interface IndexMeta {
  name: string;
  isUnique: boolean;
  isPrimary: boolean;
  columns: string[];
  fields: FieldMeta[];
}

export interface ConstraintsMeta {
  primaryKey: PrimaryKeyConstraintMeta | null;
  unique: UniqueConstraintMeta[];
  foreignKey: ForeignKeyConstraintMeta[];
}

export interface PrimaryKeyConstraintMeta {
  name: string;
  fields: FieldMeta[];
}

export interface UniqueConstraintMeta {
  name: string;
  fields: FieldMeta[];
}

export interface ForeignKeyConstraintMeta {
  name: string;
  fields: FieldMeta[];
  referencedTable: string;
  referencedFields: string[];
  refFields: FieldMeta[];
  refTable: { name: string };
}

export interface RelationsMeta {
  belongsTo: BelongsToRelation[];
  has: HasRelation[];
  hasOne: HasRelation[];
  hasMany: HasRelation[];
  manyToMany: ManyToManyRelation[];
}

export interface BelongsToRelation {
  fieldName: string | null;
  isUnique: boolean;
  type: string | null;
  keys: FieldMeta[];
  references: { name: string };
}

export interface HasRelation {
  fieldName: string | null;
  isUnique: boolean;
  type: string | null;
  keys: FieldMeta[];
  referencedBy: { name: string };
}

export interface ManyToManyRelation {
  fieldName: string | null;
  type: string | null;
  junctionTable: { name: string };
  junctionLeftConstraint: ForeignKeyConstraintMeta;
  junctionLeftKeyAttributes: FieldMeta[];
  junctionRightConstraint: ForeignKeyConstraintMeta;
  junctionRightKeyAttributes: FieldMeta[];
  leftKeyAttributes: FieldMeta[];
  rightKeyAttributes: FieldMeta[];
  rightTable: { name: string };
}

export interface InflectionMeta {
  tableType: string;
  allRows: string;
  connection: string;
  edge: string;
  filterType: string | null;
  orderByType: string;
  conditionType: string;
  patchType: string | null;
  createInputType: string;
  createPayloadType: string;
  updatePayloadType: string | null;
  deletePayloadType: string;
}

export interface QueryMeta {
  all: string;
  one: string | null;
  create: string | null;
  update: string | null;
  delete: string | null;
}

export interface PgCodec {
  name: string;
  attributes?: Record<string, PgAttribute>;
  arrayOfCodec?: PgCodec | null;
  domainOfCodec?: PgCodec | null;
  isAnonymous?: boolean;
  extensions?: {
    pg?: {
      schemaName?: string;
    };
  };
}

export interface PgAttributeExtensions extends Record<string, unknown> {
  geometrySubtype?: string | null;
  geometrySrid?: number | null;
  vectorDimensions?: number | null;
}

export interface PgAttribute {
  codec?: PgCodec | null;
  notNull?: boolean;
  hasDefault?: boolean;
  description?: string | null;
  extensions?: PgAttributeExtensions | null;
}

export interface PgUnique {
  attributes: string[];
  isPrimary?: boolean;
  tags?: {
    name?: string;
  };
}

export interface PgRelation {
  isReferencee?: boolean;
  localAttributes?: string[];
  remoteAttributes?: string[];
  remoteResource?: PgTableResource | null;
}

export interface PgTableResource {
  codec?: PgCodec;
  uniques?: PgUnique[];
  relations?: Record<string, PgRelation>;
  parameters?: unknown;
  isVirtual?: boolean;
  isUnique?: boolean;
  getRelation?: (relationName: string) => PgRelation | undefined;
  getRelations?: () => Record<string, PgRelation>;
}

export interface PgManyToManyRelationDetails {
  leftTable: PgTableResource;
  leftRelationName: string;
  junctionTable: PgTableResource;
  rightRelationName: string;
  rightTable: PgTableResource;
  allowsMultipleEdgesToNode?: boolean;
}

export interface MetaInflection {
  tableType: (codec: PgCodec) => string;
  _attributeName?: (input: { attributeName: string; codec: PgCodec }) => string;
  camelCase?: (value: string) => string;
  _manyToManyRelation?: (details: PgManyToManyRelationDetails) => string | null | undefined;
  allRows?: (resource: PgTableResource) => string | null | undefined;
  connectionType?: (tableType: string) => string | null | undefined;
  edgeType?: (tableType: string) => string | null | undefined;
  filterType?: (tableType: string) => string | null | undefined;
  orderByType?: (tableType: string) => string | null | undefined;
  conditionType?: (tableType: string) => string | null | undefined;
  patchType?: (tableType: string) => string | null | undefined;
  createInputType?: (resource: PgTableResource) => string | null | undefined;
  createPayloadType?: (resource: PgTableResource) => string | null | undefined;
  updatePayloadType?: (resource: PgTableResource) => string | null | undefined;
  deletePayloadType?: (resource: PgTableResource) => string | null | undefined;
  tableFieldName?: (resource: PgTableResource) => string | null | undefined;
  createField?: (resource: PgTableResource) => string | null | undefined;
  updateByKeys?: (resource: PgTableResource) => string | null | undefined;
  deleteByKeys?: (resource: PgTableResource) => string | null | undefined;
}

export interface GqlTypeResolverBuild {
  hasGraphQLTypeForPgCodec?: (
    codec: PgCodec,
    mode?: 'output' | 'input' | string,
  ) => boolean;
  getGraphQLTypeNameByPgCodec?: (
    codec: PgCodec,
    mode?: 'output' | 'input' | string,
  ) => string | null | undefined;
}

export interface MetaBuild extends GqlTypeResolverBuild {
  input: {
    pgRegistry: {
      pgResources: Record<string, PgTableResource>;
    };
  };
  inflection: MetaInflection;
  options?: {
    pgSchemas?: string[];
    [key: string]: unknown;
  };
  pgManyToManyRealtionshipsByResource?: Map<unknown, unknown>;
}

export interface PgCodecExtensions {
  pg?: {
    schemaName?: string;
  };
  tags?: Record<string, unknown>;
}
