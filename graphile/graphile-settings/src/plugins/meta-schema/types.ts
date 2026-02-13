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
}

export interface FieldMeta {
  name: string;
  type: TypeMeta;
  isNotNull: boolean;
  hasDefault: boolean;
}

export interface TypeMeta {
  pgType: string;
  gqlType: string;
  isArray: boolean;
  isNotNull?: boolean;
  hasDefault?: boolean;
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
  isAnonymous?: boolean;
  extensions?: {
    pg?: {
      schemaName?: string;
    };
  };
}

export interface PgAttribute {
  codec?: PgCodec | null;
  notNull?: boolean;
  hasDefault?: boolean;
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
