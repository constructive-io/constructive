/**
 * Core schema types for representing PostGraphile table metadata
 * These are "clean" versions that remove nullable/undefined complexity
 */

/**
 * Represents a database table with its fields and relations
 */
export interface CleanTable {
  name: string;
  fields: CleanField[];
  relations: CleanRelations;
  /** PostGraphile inflection rules for this table */
  inflection?: TableInflection;
  /** Query operation names from introspection */
  query?: TableQueryNames;
  /** Constraint information */
  constraints?: TableConstraints;
}

/**
 * PostGraphile-generated names for this table
 */
export interface TableInflection {
  /** All rows connection query name (e.g., "users") */
  allRows: string;
  /** Simple all rows query name */
  allRowsSimple: string;
  /** Condition type name (e.g., "UserCondition") */
  conditionType: string;
  /** Connection type name (e.g., "UsersConnection") */
  connection: string;
  /** Create field name */
  createField: string;
  /** Create input type (e.g., "CreateUserInput") */
  createInputType: string;
  /** Create payload type */
  createPayloadType: string;
  /** Delete by primary key mutation name */
  deleteByPrimaryKey: string | null;
  /** Delete payload type */
  deletePayloadType: string;
  /** Edge type name */
  edge: string;
  /** Edge field name */
  edgeField: string;
  /** Enum type name */
  enumType: string;
  /** Filter type name (e.g., "UserFilter") */
  filterType: string | null;
  /** Input type name (e.g., "UserInput") */
  inputType: string;
  /** OrderBy enum type (e.g., "UsersOrderBy") */
  orderByType: string;
  /** Patch field name */
  patchField: string;
  /** Patch type (e.g., "UserPatch") */
  patchType: string | null;
  /** Table field name (singular, e.g., "user") */
  tableFieldName: string;
  /** Table type name (e.g., "User") */
  tableType: string;
  /** Type name */
  typeName: string;
  /** Update by primary key mutation name */
  updateByPrimaryKey: string | null;
  /** Update payload type */
  updatePayloadType: string | null;
}

/**
 * Query operation names from introspection
 */
export interface TableQueryNames {
  /** All rows query name */
  all: string;
  /** Single row query name */
  one: string | null;
  /** Create mutation name */
  create: string;
  /** Update mutation name */
  update: string | null;
  /** Delete mutation name */
  delete: string | null;
}

/**
 * Table constraints
 */
export interface TableConstraints {
  primaryKey: ConstraintInfo[];
  foreignKey: ForeignKeyConstraint[];
  unique: ConstraintInfo[];
}

export interface ConstraintInfo {
  name: string;
  fields: CleanField[];
}

export interface ForeignKeyConstraint extends ConstraintInfo {
  refTable: string;
  refFields: CleanField[];
}

/**
 * Represents a field/column in a table
 */
export interface CleanField {
  name: string;
  type: CleanFieldType;
}

/**
 * Field type information from PostGraphile introspection
 */
export interface CleanFieldType {
  /** GraphQL type name (e.g., "String", "UUID", "Int") */
  gqlType: string;
  /** Whether this is an array type */
  isArray: boolean;
  /** Type modifier (for precision, length, etc.) */
  modifier?: string | number | null;
  /** PostgreSQL type alias (domain name) */
  pgAlias?: string | null;
  /** PostgreSQL native type (e.g., "text", "uuid", "integer") */
  pgType?: string | null;
  /** Subtype for composite types */
  subtype?: string | null;
  /** Type modifier from PostgreSQL */
  typmod?: number | null;
}

/**
 * All relation types for a table
 */
export interface CleanRelations {
  belongsTo: CleanBelongsToRelation[];
  hasOne: CleanHasOneRelation[];
  hasMany: CleanHasManyRelation[];
  manyToMany: CleanManyToManyRelation[];
}

/**
 * BelongsTo relation (foreign key on this table)
 */
export interface CleanBelongsToRelation {
  fieldName: string | null;
  isUnique: boolean;
  referencesTable: string;
  type: string | null;
  keys: CleanField[];
}

/**
 * HasOne relation (foreign key on other table, unique)
 */
export interface CleanHasOneRelation {
  fieldName: string | null;
  isUnique: boolean;
  referencedByTable: string;
  type: string | null;
  keys: CleanField[];
}

/**
 * HasMany relation (foreign key on other table, not unique)
 */
export interface CleanHasManyRelation {
  fieldName: string | null;
  isUnique: boolean;
  referencedByTable: string;
  type: string | null;
  keys: CleanField[];
}

/**
 * ManyToMany relation (through junction table)
 */
export interface CleanManyToManyRelation {
  fieldName: string | null;
  rightTable: string;
  junctionTable: string;
  type: string | null;
}

// ============================================================================
// Clean Operation Types (from GraphQL introspection)
// ============================================================================

/**
 * Clean representation of a GraphQL operation (query or mutation)
 * Derived from introspection data
 */
export interface CleanOperation {
  /** Operation name (e.g., "login", "currentUser", "cars") */
  name: string;
  /** Operation kind */
  kind: 'query' | 'mutation';
  /** Arguments/variables for the operation */
  args: CleanArgument[];
  /** Return type */
  returnType: CleanTypeRef;
  /** Description from schema */
  description?: string;
  /** Whether this is deprecated */
  isDeprecated?: boolean;
  /** Deprecation reason */
  deprecationReason?: string;
}

/**
 * Clean representation of an operation argument
 */
export interface CleanArgument {
  /** Argument name */
  name: string;
  /** Argument type */
  type: CleanTypeRef;
  /** Default value (as string) */
  defaultValue?: string;
  /** Description from schema */
  description?: string;
}

/**
 * Clean type reference - simplified from introspection TypeRef
 */
export interface CleanTypeRef {
  /** Type kind */
  kind: 'SCALAR' | 'OBJECT' | 'INPUT_OBJECT' | 'ENUM' | 'LIST' | 'NON_NULL';
  /** Type name (null for LIST and NON_NULL wrappers) */
  name: string | null;
  /** Inner type for LIST and NON_NULL wrappers */
  ofType?: CleanTypeRef;
  /** Resolved TypeScript type string */
  tsType?: string;
  /** Fields for OBJECT types */
  fields?: CleanObjectField[];
  /** Input fields for INPUT_OBJECT types */
  inputFields?: CleanArgument[];
  /** Values for ENUM types */
  enumValues?: string[];
}

/**
 * Field on an object type
 */
export interface CleanObjectField {
  /** Field name */
  name: string;
  /** Field type */
  type: CleanTypeRef;
  /** Description */
  description?: string;
}

// ============================================================================
// Type Registry
// ============================================================================

/**
 * Registry of all types in the schema for resolution
 */
export type TypeRegistry = Map<string, ResolvedType>;

/**
 * Resolved type with all details populated
 */
export interface ResolvedType {
  kind: 'SCALAR' | 'OBJECT' | 'INPUT_OBJECT' | 'ENUM' | 'INTERFACE' | 'UNION';
  name: string;
  description?: string;
  /** Fields for OBJECT types */
  fields?: CleanObjectField[];
  /** Input fields for INPUT_OBJECT types */
  inputFields?: CleanArgument[];
  /** Values for ENUM types */
  enumValues?: string[];
  /** Possible types for UNION types */
  possibleTypes?: string[];
}
