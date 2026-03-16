/**
 * Infer PostGraphile table metadata from standard GraphQL introspection
 *
 * This module replaces the need for the _meta query by recognizing PostGraphile's
 * naming conventions and type patterns from standard GraphQL introspection.
 *
 * Key patterns recognized:
 * - Connection types: {PluralName}Connection → entity name
 * - Filter types: {Name}Filter
 * - Input types: Create{Name}Input, Update{Name}Input, Delete{Name}Input
 * - Payload types: Create{Name}Payload, Update{Name}Payload, Delete{Name}Payload
 * - Query operations: {pluralName} (list), {singularName} (single)
 * - Mutation operations: create{Name}, update{Name}, delete{Name}
 */
import { lcFirst, pluralize, singularize, ucFirst } from 'inflekt';

import { stripSmartComments } from '../utils';

import type {
  IntrospectionField,
  IntrospectionInputValue,
  IntrospectionQueryResponse,
  IntrospectionType,
  IntrospectionTypeRef,
} from '../types/introspection';
import { getBaseTypeName, isList, isNonNull, unwrapType } from '../types/introspection';
import type {
  CleanBelongsToRelation,
  CleanField,
  CleanFieldType,
  CleanHasManyRelation,
  CleanHasOneRelation,
  CleanManyToManyRelation,
  CleanRelations,
  CleanTable,
  ConstraintInfo,
  TableConstraints,
  TableInflection,
  TableMetaInput,
  TableQueryNames,
} from '../types/schema';

// ============================================================================
// Pattern Matching Constants
// ============================================================================

/**
 * PostGraphile naming patterns for type detection
 */
const PATTERNS = {
  // Type suffixes
  connection: /^(.+)Connection$/,
  edge: /^(.+)Edge$/,
  filter: /^(.+)Filter$/,
  condition: /^(.+)Condition$/,
  orderBy: /^(.+)OrderBy$/,
  patch: /^(.+)Patch$/,

  // Input type patterns
  createInput: /^Create(.+)Input$/,
  updateInput: /^Update(.+)Input$/,
  deleteInput: /^Delete(.+)Input$/,

  // Payload type patterns
  createPayload: /^Create(.+)Payload$/,
  updatePayload: /^Update(.+)Payload$/,
  deletePayload: /^Delete(.+)Payload$/,

  // Mutation name patterns (camelCase)
  createMutation: /^create([A-Z][a-zA-Z0-9]*)$/,
  updateMutation: /^update([A-Z][a-zA-Z0-9]*)$/,
  deleteMutation: /^delete([A-Z][a-zA-Z0-9]*)$/,
};

/**
 * Built-in GraphQL types to ignore
 */
const BUILTIN_TYPES = new Set([
  'Query',
  'Mutation',
  'Subscription',
  'String',
  'Int',
  'Float',
  'Boolean',
  'ID',
  // PostGraphile built-in types
  'Node',
  'PageInfo',
  'Cursor',
  'UUID',
  'Datetime',
  'Date',
  'Time',
  'JSON',
  'BigInt',
  'BigFloat',
]);

/**
 * Types that start with __ are internal GraphQL types
 */
function isInternalType(name: string): boolean {
  return name.startsWith('__');
}

// ============================================================================
// Main Entry Point
// ============================================================================

export interface InferTablesOptions {
  /**
   * Custom pattern overrides (for non-standard PostGraphile configurations)
   */
  patterns?: Partial<typeof PATTERNS>;
  /**
   * Include PostgreSQL COMMENT descriptions on tables and fields.
   * @default true
   */
  comments?: boolean;
  /**
   * Table metadata from PostGraphile's MetaSchemaPlugin (_meta query).
   * When available, provides accurate relation detection:
   * - Correct M:N classification (not dependent on field naming heuristics)
   * - hasOne vs hasMany distinction
   * - Junction table FK details for M:N mutations
   *
   * When not available (SDL file sources), falls back to cross-referencing heuristic.
   */
  tablesMeta?: TableMetaInput[];
}

/**
 * Infer CleanTable[] from GraphQL introspection by recognizing PostGraphile patterns
 *
 * @param introspection - Standard GraphQL introspection response
 * @param options - Optional configuration
 * @returns Array of CleanTable objects compatible with existing generators
 */
export function inferTablesFromIntrospection(
  introspection: IntrospectionQueryResponse,
  options: InferTablesOptions = {},
): CleanTable[] {
  const { __schema: schema } = introspection;
  const { types, queryType, mutationType } = schema;
  const commentsEnabled = options.comments !== false;
  const tablesMeta = options.tablesMeta;

  // Build lookup maps for efficient access
  const typeMap = buildTypeMap(types);
  const { entityNames, entityToConnection, connectionToEntity } =
    buildEntityConnectionMaps(types, typeMap);
  const queryFields = getTypeFields(typeMap.get(queryType.name));
  const mutationFields = mutationType
    ? getTypeFields(typeMap.get(mutationType.name))
    : [];

  // Build _meta lookup map if available
  const metaMap = tablesMeta
    ? buildTableMetaMap(tablesMeta)
    : null;

  // Step 1: Build CleanTable for each inferred entity
  const tables: CleanTable[] = [];

  for (const entityName of entityNames) {
    const entityType = typeMap.get(entityName);
    if (!entityType) continue;

    // Infer all metadata for this entity
    const { table, hasRealOperation } = buildCleanTable(
      entityName,
      entityType,
      typeMap,
      queryFields,
      mutationFields,
      entityToConnection,
      connectionToEntity,
      commentsEnabled,
    );

    // Only include tables that have at least one real operation
    if (hasRealOperation) {
      tables.push(table);
    }
  }

  // Step 2: Enrich relations with _meta data or cross-referencing heuristic
  if (metaMap) {
    enrichRelationsFromMeta(tables, metaMap);
  } else {
    enrichRelationsFromCrossReference(tables);
  }

  return tables;
}

// ============================================================================
// Entity Detection
// ============================================================================

interface EntityConnectionMaps {
  entityNames: Set<string>;
  entityToConnection: Map<string, string>;
  connectionToEntity: Map<string, string>;
}

/**
 * Infer entity <-> connection mappings from schema types.
 *
 * Prefer deriving entity names from the `nodes` field of connection types.
 * This is robust across v4/v5 naming variations (e.g. `UsersConnection` and
 * `UserConnection`).
 */
function buildEntityConnectionMaps(
  types: IntrospectionType[],
  typeMap: Map<string, IntrospectionType>,
): EntityConnectionMaps {
  const entityNames = new Set<string>();
  const entityToConnection = new Map<string, string>();
  const connectionToEntity = new Map<string, string>();
  const typeNames = new Set(types.map((t) => t.name));

  for (const type of types) {
    // Skip internal types
    if (isInternalType(type.name)) continue;
    if (BUILTIN_TYPES.has(type.name)) continue;

    // Check for Connection pattern
    const connectionMatch = type.name.match(PATTERNS.connection);
    if (connectionMatch) {
      const fallbackEntityName = singularize(connectionMatch[1]);
      const entityName =
        resolveEntityNameFromConnectionType(type, typeMap) ?? fallbackEntityName;

      // Verify the entity type actually exists and is not a built-in/internal type.
      if (
        typeNames.has(entityName) &&
        !BUILTIN_TYPES.has(entityName) &&
        !isInternalType(entityName)
      ) {
        entityNames.add(entityName);
        entityToConnection.set(entityName, type.name);
        connectionToEntity.set(type.name, entityName);
      }
    }
  }

  return {
    entityNames,
    entityToConnection,
    connectionToEntity,
  };
}

/**
 * Attempt to resolve an entity name from a connection type by inspecting its
 * `nodes` field.
 */
function resolveEntityNameFromConnectionType(
  connectionType: IntrospectionType,
  typeMap: Map<string, IntrospectionType>,
): string | null {
  if (!connectionType.fields) return null;

  const nodesField = connectionType.fields.find((field) => field.name === 'nodes');
  if (!nodesField) return null;

  const nodeTypeName = getBaseTypeName(nodesField.type);
  if (!nodeTypeName) return null;

  const nodeType = typeMap.get(nodeTypeName);
  if (!nodeType || nodeType.kind !== 'OBJECT') return null;

  if (nodeTypeName.endsWith('Connection')) return null;
  if (BUILTIN_TYPES.has(nodeTypeName)) return null;
  if (isInternalType(nodeTypeName)) return null;

  return nodeTypeName;
}

// ============================================================================
// Table Building
// ============================================================================

interface BuildCleanTableResult {
  table: CleanTable;
  hasRealOperation: boolean;
}

/**
 * Build a complete CleanTable from an entity type
 */
function buildCleanTable(
  entityName: string,
  entityType: IntrospectionType,
  typeMap: Map<string, IntrospectionType>,
  queryFields: IntrospectionField[],
  mutationFields: IntrospectionField[],
  entityToConnection: Map<string, string>,
  connectionToEntity: Map<string, string>,
  commentsEnabled: boolean,
): BuildCleanTableResult {
  // Extract scalar fields from entity type
  const fields = extractEntityFields(entityType, typeMap, entityToConnection, commentsEnabled);

  // Infer relations from entity fields
  const relations = inferRelations(
    entityType,
    entityToConnection,
    connectionToEntity,
  );

  // Match query and mutation operations
  const queryOps = matchQueryOperations(entityName, queryFields, entityToConnection);
  const mutationOps = matchMutationOperations(entityName, mutationFields);

  // Check if we found at least one real operation (not a fallback)
  const hasRealOperation = !!(
    queryOps.all ||
    queryOps.one ||
    mutationOps.create ||
    mutationOps.update ||
    mutationOps.delete
  );

  // Infer primary key from mutation inputs
  const constraints = inferConstraints(entityName, typeMap);

  // Infer the patch field name from UpdateXxxInput (e.g., "userPatch")
  const patchFieldName = inferPatchFieldName(entityName, typeMap);

  // Build inflection map from discovered types
  const inflection = buildInflection(entityName, typeMap, entityToConnection);

  // Combine query operations with fallbacks for UI purposes
  // (but hasRealOperation indicates if we should include this table)
  const query: TableQueryNames = {
    all: queryOps.all ?? lcFirst(pluralize(entityName)),
    one: queryOps.one,
    create: mutationOps.create ?? `create${entityName}`,
    update: mutationOps.update,
    delete: mutationOps.delete,
    patchFieldName,
  };

  // Extract description from entity type (PostgreSQL COMMENT), strip smart comments
  const description = commentsEnabled ? stripSmartComments(entityType.description) : undefined;

  return {
    table: {
      name: entityName,
      ...(description ? { description } : {}),
      fields,
      relations,
      inflection,
      query,
      constraints,
    },
    hasRealOperation,
  };
}

// ============================================================================
// Field Extraction
// ============================================================================

/**
 * Extract scalar fields from an entity type
 * Excludes relation fields (those returning other entity types or connections)
 */
function extractEntityFields(
  entityType: IntrospectionType,
  typeMap: Map<string, IntrospectionType>,
  entityToConnection: Map<string, string>,
  commentsEnabled: boolean,
): CleanField[] {
  const fields: CleanField[] = [];

  if (!entityType.fields) return fields;

  // Build a lookup of CreateXxxInput fields to infer hasDefault.
  // If a field is NOT NULL on the entity but NOT required in CreateXxxInput,
  // then it likely has a server-side default (serial, uuid_generate_v4, now(), etc.).
  const createInputRequiredFields = buildCreateInputRequiredFieldSet(
    entityType.name,
    typeMap,
  );

  for (const field of entityType.fields) {
    const baseTypeName = getBaseTypeName(field.type);
    if (!baseTypeName) continue;

    // Skip relation fields (those returning other objects or connections)
    const fieldType = typeMap.get(baseTypeName);
    if (fieldType?.kind === 'OBJECT') {
      // Check if it's a Connection type (hasMany) or entity type (belongsTo)
      if (
        baseTypeName.endsWith('Connection') ||
        isEntityType(baseTypeName, entityToConnection)
      ) {
        continue; // Skip relation fields
      }
    }

    // Infer isNotNull from the NON_NULL wrapper on the entity type field
    const fieldIsNotNull = isNonNull(field.type);

    // Infer hasDefault: if a field is NOT NULL on the entity but NOT required
    // in CreateXxxInput, it likely has a default value.
    // Also: if it's absent from CreateInput entirely, it's likely computed/generated.
    let fieldHasDefault: boolean | null = null;
    if (createInputRequiredFields !== null) {
      if (fieldIsNotNull && !createInputRequiredFields.has(field.name)) {
        fieldHasDefault = true;
      } else {
        fieldHasDefault = false;
      }
    }

    // Include scalar, enum, and other non-relation fields
    const fieldDescription = commentsEnabled ? stripSmartComments(field.description) : undefined;
    fields.push({
      name: field.name,
      ...(fieldDescription ? { description: fieldDescription } : {}),
      type: convertToCleanFieldType(field.type),
      isNotNull: fieldIsNotNull,
      hasDefault: fieldHasDefault,
    });
  }

  return fields;
}

/**
 * Build a set of field names that are required (NON_NULL) in the CreateXxxInput type.
 * Returns null if the CreateXxxInput type doesn't exist (no create mutation).
 */
function buildCreateInputRequiredFieldSet(
  entityName: string,
  typeMap: Map<string, IntrospectionType>,
): Set<string> | null {
  const createInputName = `Create${entityName}Input`;
  const createInput = typeMap.get(createInputName);
  if (!createInput?.inputFields) return null;

  // The CreateXxxInput typically has a single field like { user: UserInput! }
  // We need to look inside the actual entity input type (e.g., UserInput)
  const entityInputName = `${entityName}Input`;
  const entityInput = typeMap.get(entityInputName);
  if (!entityInput?.inputFields) return null;

  const requiredFields = new Set<string>();
  for (const inputField of entityInput.inputFields) {
    if (isNonNull(inputField.type)) {
      requiredFields.add(inputField.name);
    }
  }
  return requiredFields;
}

/**
 * Check if a type name is an entity type (has a corresponding Connection)
 */
function isEntityType(
  typeName: string,
  entityToConnection: Map<string, string>,
): boolean {
  return entityToConnection.has(typeName);
}

/**
 * Convert IntrospectionTypeRef to CleanFieldType
 */
function convertToCleanFieldType(
  typeRef: IntrospectionTypeRef,
): CleanFieldType {
  const baseType = unwrapType(typeRef);
  const isArray = isList(typeRef);

  return {
    gqlType: baseType.name ?? 'Unknown',
    isArray,
    // PostgreSQL-specific fields are not available from introspection
    // They were optional anyway and not used by generators
  };
}

// ============================================================================
// Relation Inference
// ============================================================================

/**
 * Infer relations from entity type fields
 */
function inferRelations(
  entityType: IntrospectionType,
  entityToConnection: Map<string, string>,
  connectionToEntity: Map<string, string>,
): CleanRelations {
  const belongsTo: CleanBelongsToRelation[] = [];
  const hasMany: CleanHasManyRelation[] = [];
  const manyToMany: CleanManyToManyRelation[] = [];

  if (!entityType.fields) {
    return { belongsTo, hasOne: [], hasMany, manyToMany };
  }

  for (const field of entityType.fields) {
    const baseTypeName = getBaseTypeName(field.type);
    if (!baseTypeName) continue;

    // Check for Connection type → hasMany or manyToMany
    if (baseTypeName.endsWith('Connection')) {
      const resolvedRelation = inferHasManyOrManyToMany(
        field,
        baseTypeName,
        connectionToEntity,
      );
      if (resolvedRelation.type === 'manyToMany') {
        manyToMany.push(resolvedRelation.relation as CleanManyToManyRelation);
      } else {
        hasMany.push(resolvedRelation.relation as CleanHasManyRelation);
      }
      continue;
    }

    // Check for entity type → belongsTo
    if (isEntityType(baseTypeName, entityToConnection)) {
      belongsTo.push({
        fieldName: field.name,
        isUnique: false, // Can't determine from introspection alone
        referencesTable: baseTypeName,
        type: baseTypeName,
        keys: [], // Would need FK info to populate
      });
    }
  }

  return { belongsTo, hasOne: [], hasMany, manyToMany };
}

/**
 * Determine if a Connection field is hasMany or manyToMany
 *
 * ManyToMany pattern: field name contains "By" and "And"
 * e.g., "productsByOrderItemOrderIdAndProductId"
 */
function inferHasManyOrManyToMany(
  field: IntrospectionField,
  connectionTypeName: string,
  connectionToEntity: Map<string, string>,
):
  | { type: 'hasMany'; relation: CleanHasManyRelation }
  | { type: 'manyToMany'; relation: CleanManyToManyRelation } {
  // Resolve the related entity from discovered connection mappings first.
  const relatedEntityName =
    connectionToEntity.get(connectionTypeName) ?? (() => {
      const match = connectionTypeName.match(PATTERNS.connection);
      const relatedPluralName = match ? match[1] : connectionTypeName;
      return singularize(relatedPluralName);
    })();

  // Check for manyToMany pattern in field name
  const isManyToMany = field.name.includes('By') && field.name.includes('And');

  if (isManyToMany) {
    // For ManyToMany, extract the actual entity name from the field name prefix
    // Field name pattern: {relatedEntities}By{JunctionTable}{Keys}
    // e.g., "usersByMembershipActorIdAndEntityId" → "users" → "User"
    // e.g., "productsByOrderItemOrderIdAndProductId" → "products" → "Product"
    const prefixMatch = field.name.match(/^([a-z]+)By/i);
    const actualEntityName = prefixMatch
      ? singularize(ucFirst(prefixMatch[1]))
      : relatedEntityName;

    // Try to extract junction table from field name
    // Pattern: {relatedEntities}By{JunctionTable}{Keys}
    // e.g., "productsByProductCategoryProductIdAndCategoryId" → "ProductCategory"
    // The junction table name ends where the first field key begins (identified by capital letter after lowercase)
    const junctionMatch = field.name.match(
      /By([A-Z][a-z]+(?:[A-Z][a-z]+)*?)(?:[A-Z][a-z]+Id)/,
    );
    const junctionTable = junctionMatch ? junctionMatch[1] : 'Unknown';

    return {
      type: 'manyToMany',
      relation: {
        fieldName: field.name,
        rightTable: actualEntityName,
        junctionTable,
        type: connectionTypeName,
      },
    };
  }

  return {
    type: 'hasMany',
    relation: {
      fieldName: field.name,
      isUnique: false,
      referencedByTable: relatedEntityName,
      type: connectionTypeName,
      keys: [],
    },
  };
}

// ============================================================================
// Operation Matching
// ============================================================================

interface QueryOperations {
  all: string | null;
  one: string | null;
}

/**
 * Match query operations for an entity
 *
 * Looks for:
 * - List query: returns {PluralName}Connection (e.g., users → UsersConnection)
 * - Single query: returns {EntityName} with id/nodeId arg (e.g., user → User)
 */
function matchQueryOperations(
  entityName: string,
  queryFields: IntrospectionField[],
  entityToConnection: Map<string, string>,
): QueryOperations {
  const pluralName = pluralize(entityName);
  const connectionTypeName =
    entityToConnection.get(entityName) ?? `${pluralName}Connection`;

  let all: string | null = null;
  let one: string | null = null;

  for (const field of queryFields) {
    const returnTypeName = getBaseTypeName(field.type);
    if (!returnTypeName) continue;

    // Match list query by return type (Connection)
    if (returnTypeName === connectionTypeName) {
      // Prefer the simple plural name, but accept any that returns the connection
      if (!all || field.name === lcFirst(pluralName)) {
        all = field.name;
      }
    }

    // Match single query by return type (Entity) and having an id-like arg
    if (returnTypeName === entityName) {
      const hasIdArg = field.args.some(
        (arg) =>
          arg.name === 'id' ||
          arg.name === 'nodeId' ||
          arg.name.toLowerCase().endsWith('id'),
      );

      if (hasIdArg) {
        // Prefer exact match (e.g., "user" for "User")
        if (!one || field.name === lcFirst(entityName)) {
          one = field.name;
        }
      }
    }
  }

  return { all, one };
}

interface MutationOperations {
  create: string | null;
  update: string | null;
  delete: string | null;
}

/**
 * Match mutation operations for an entity
 *
 * Looks for mutations named:
 * - create{EntityName}
 * - update{EntityName} or update{EntityName}ById
 * - delete{EntityName} or delete{EntityName}ById
 */
function matchMutationOperations(
  entityName: string,
  mutationFields: IntrospectionField[],
): MutationOperations {
  let create: string | null = null;
  let update: string | null = null;
  let del: string | null = null;

  const expectedCreate = `create${entityName}`;
  const expectedUpdate = `update${entityName}`;
  const expectedDelete = `delete${entityName}`;

  for (const field of mutationFields) {
    // Exact match for create
    if (field.name === expectedCreate) {
      create = field.name;
    }

    // Match update (could be updateUser or updateUserById)
    if (
      field.name === expectedUpdate ||
      field.name === `${expectedUpdate}ById`
    ) {
      // Prefer non-ById version
      if (!update || field.name === expectedUpdate) {
        update = field.name;
      }
    }

    // Match delete (could be deleteUser or deleteUserById)
    if (
      field.name === expectedDelete ||
      field.name === `${expectedDelete}ById`
    ) {
      // Prefer non-ById version
      if (!del || field.name === expectedDelete) {
        del = field.name;
      }
    }
  }

  return { create, update, delete: del };
}

// ============================================================================
// Constraint Inference
// ============================================================================

/**
 * Infer constraints from mutation input types
 *
 * Primary key can be inferred from Update/Delete mutation input types,
 * which typically have an 'id' field or similar.
 */
function inferConstraints(
  entityName: string,
  typeMap: Map<string, IntrospectionType>,
): TableConstraints {
  const primaryKey: ConstraintInfo[] = [];

  // Try to find Update or Delete input type to extract PK
  const updateInputName = `Update${entityName}Input`;
  const deleteInputName = `Delete${entityName}Input`;

  const updateInput = typeMap.get(updateInputName);
  const deleteInput = typeMap.get(deleteInputName);

  const keyInputField =
    inferPrimaryKeyFromInputObject(updateInput) ||
    inferPrimaryKeyFromInputObject(deleteInput);

  if (keyInputField) {
    primaryKey.push({
      name: 'primary',
      fields: [
        {
          name: keyInputField.name,
          type: convertToCleanFieldType(keyInputField.type),
        },
      ],
    });
  }

  // If no PK found from inputs, try to find 'id' field in entity type
  if (primaryKey.length === 0) {
    const entityType = typeMap.get(entityName);
    if (entityType?.fields) {
      const idField = entityType.fields.find(
        (f) => f.name === 'id' || f.name === 'nodeId',
      );

      if (idField) {
        primaryKey.push({
          name: 'primary',
          fields: [
            {
              name: idField.name,
              type: convertToCleanFieldType(idField.type),
            },
          ],
        });
      }
    }
  }

  return {
    primaryKey,
    foreignKey: [], // Would need FK info to populate
    unique: [], // Would need constraint info to populate
  };
}

/**
 * Infer a single-row lookup key from an Update/Delete input object.
 *
 * Priority:
 * 1. Canonical keys: id, nodeId, rowId
 * 2. Single non-patch/non-clientMutationId scalar-ish field
 *
 * If multiple possible key fields remain, return null to avoid guessing.
 */
function inferPrimaryKeyFromInputObject(
  inputType: IntrospectionType | undefined,
): IntrospectionInputValue | null {
  const inputFields = inputType?.inputFields ?? [];
  if (inputFields.length === 0) return null;

  const canonicalKey = inputFields.find(
    (field) =>
      field.name === 'id' || field.name === 'nodeId' || field.name === 'rowId',
  );
  if (canonicalKey) return canonicalKey;

  const candidates = inputFields.filter((field) => {
    if (field.name === 'clientMutationId') return false;

    const baseTypeName = getBaseTypeName(field.type);
    const lowerName = field.name.toLowerCase();

    // Exclude patch payload fields (patch / fooPatch)
    if (lowerName === 'patch' || lowerName.endsWith('patch')) return false;
    if (baseTypeName?.endsWith('Patch')) return false;

    return true;
  });

  return candidates.length === 1 ? candidates[0] : null;
}

/**
 * Infer the patch field name from an Update input type.
 *
 * PostGraphile v5 uses entity-specific patch field names:
 *   UpdateUserInput     → { id, userPatch: UserPatch }
 *   UpdateDatabaseInput → { id, databasePatch: DatabasePatch }
 *
 * Pattern: {lcFirst(entityTypeName)}Patch
 */
function inferPatchFieldName(
  entityName: string,
  typeMap: Map<string, IntrospectionType>,
): string {
  const updateInputName = `Update${entityName}Input`;
  const updateInput = typeMap.get(updateInputName);
  const inputFields = updateInput?.inputFields ?? [];

  // Find the field whose type name ends in 'Patch'
  const patchField = inputFields.find((f) => {
    const baseName = getBaseTypeName(f.type);
    return baseName?.endsWith('Patch');
  });

  if (patchField) return patchField.name;

  // Fallback: compute from entity name (v5 default inflection)
  return lcFirst(entityName) + 'Patch';
}

// ============================================================================
// Inflection Building
// ============================================================================

/**
 * Build inflection map from discovered types
 */
function buildInflection(
  entityName: string,
  typeMap: Map<string, IntrospectionType>,
  entityToConnection: Map<string, string>,
): TableInflection {
  const pluralName = pluralize(entityName);
  const singularFieldName = lcFirst(entityName);
  const pluralFieldName = lcFirst(pluralName);
  const connectionTypeName =
    entityToConnection.get(entityName) ?? `${pluralName}Connection`;

  // Check which types actually exist in the schema
  const hasFilter = typeMap.has(`${entityName}Filter`);
  const hasPatch = typeMap.has(`${entityName}Patch`);
  const hasUpdatePayload = typeMap.has(`Update${entityName}Payload`);

  // Detect the actual OrderBy type from schema
  // PostGraphile typically generates {PluralName}OrderBy (e.g., AddressesOrderBy)
  // but we check for the actual type in case of custom inflection
  const expectedOrderByType = `${pluralName}OrderBy`;
  const orderByType =
    findOrderByType(entityName, pluralName, typeMap) || expectedOrderByType;

  return {
    allRows: pluralFieldName,
    allRowsSimple: pluralFieldName,
    conditionType: `${entityName}Condition`,
    connection: connectionTypeName,
    createField: `create${entityName}`,
    createInputType: `Create${entityName}Input`,
    createPayloadType: `Create${entityName}Payload`,
    deleteByPrimaryKey: `delete${entityName}`,
    deletePayloadType: `Delete${entityName}Payload`,
    edge: `${pluralName}Edge`,
    edgeField: lcFirst(pluralName),
    enumType: `${entityName}Enum`,
    filterType: hasFilter ? `${entityName}Filter` : null,
    inputType: `${entityName}Input`,
    orderByType,
    patchField: singularFieldName,
    patchType: hasPatch ? `${entityName}Patch` : null,
    tableFieldName: singularFieldName,
    tableType: entityName,
    typeName: entityName,
    updateByPrimaryKey: `update${entityName}`,
    updatePayloadType: hasUpdatePayload ? `Update${entityName}Payload` : null,
  };
}

/**
 * Find the actual OrderBy enum type for an entity from the schema
 *
 * PostGraphile generates OrderBy enums with various patterns:
 * - {PluralName}OrderBy (e.g., AddressesOrderBy, UsersOrderBy)
 * - Sometimes with custom inflection (e.g., SchemataOrderBy for Schema)
 *
 * We search for the actual type in the schema to handle all cases.
 */
function findOrderByType(
  entityName: string,
  pluralName: string,
  typeMap: Map<string, IntrospectionType>,
): string | null {
  // Try the standard pattern first: {PluralName}OrderBy
  const standardName = `${pluralName}OrderBy`;
  if (typeMap.has(standardName)) {
    return standardName;
  }

  // Build a list of candidate OrderBy names to check
  // These are variations of the entity name with common plural suffixes
  const candidates = [
    `${entityName}sOrderBy`, // Simple 's' plural: User -> UsersOrderBy
    `${entityName}esOrderBy`, // 'es' plural: Address -> AddressesOrderBy
    `${entityName}OrderBy`, // No change (already plural or singular OK)
  ];

  // Check each candidate
  for (const candidate of candidates) {
    if (typeMap.has(candidate) && typeMap.get(candidate)?.kind === 'ENUM') {
      return candidate;
    }
  }

  // Fallback: search for an enum that EXACTLY matches the entity plural pattern
  // We look for types that are the pluralized entity name + OrderBy
  // This avoids matching SchemaGrantsOrderBy when looking for Schema's OrderBy
  for (const [typeName, type] of typeMap) {
    if (type.kind !== 'ENUM' || !typeName.endsWith('OrderBy')) continue;

    // Extract the base name (without OrderBy suffix)
    const baseName = typeName.slice(0, -7); // Remove 'OrderBy'

    // Check if singularizing the base name gives us the entity name
    // e.g., 'Schemata' -> 'Schema', 'Users' -> 'User', 'Addresses' -> 'Address'
    if (singularize(baseName) === entityName) {
      return typeName;
    }
  }

  return null;
}

// ============================================================================
// Relation Enrichment — Path A: _meta data available
// ============================================================================

/**
 * Build a lookup map from table name → TableMetaInput
 */
function buildTableMetaMap(
  tablesMeta: TableMetaInput[],
): Map<string, TableMetaInput> {
  const map = new Map<string, TableMetaInput>();
  for (const meta of tablesMeta) {
    map.set(meta.name, meta);
  }
  return map;
}

/**
 * Convert a _meta field to a CleanField
 */
function metaFieldToCleanField(
  metaField: { name: string; type: { pgType: string; gqlType: string; isArray: boolean } },
): CleanField {
  return {
    name: metaField.name,
    type: {
      gqlType: metaField.type.gqlType,
      isArray: metaField.type.isArray,
      pgType: metaField.type.pgType,
    },
  };
}

/**
 * Find a matching relation in an array. Prefers exact fieldName match;
 * falls back to matching by table name only when fieldName is null.
 */
function findMatchingRelation<T extends { fieldName: string | null }>(
  relations: T[],
  fieldName: string | null,
  tableNameKey: keyof T,
  tableName: string,
): T | undefined {
  // Prefer exact fieldName match
  if (fieldName) {
    const byFieldName = relations.find((r) => r.fieldName === fieldName);
    if (byFieldName) return byFieldName;
  }
  // Fall back to table name only when no fieldName match
  return relations.find((r) => (r[tableNameKey] as string) === tableName);
}

/**
 * Enrich relation data using accurate _meta information from MetaSchemaPlugin.
 * Replaces the heuristic-based detection with authoritative data:
 * - Correct M:N classification with junction table FK details
 * - Proper hasOne vs hasMany distinction
 * - FK key fields on belongsTo relations
 */
function enrichRelationsFromMeta(
  tables: CleanTable[],
  metaMap: Map<string, TableMetaInput>,
): void {
  for (const table of tables) {
    const meta = metaMap.get(table.name);
    if (!meta) continue;

    const metaRelations = meta.relations;

    // Rebuild belongsTo with FK key details from _meta
    const enrichedBelongsTo: CleanBelongsToRelation[] = metaRelations.belongsTo.map((bt) => {
      const existing = findMatchingRelation(
        table.relations.belongsTo, bt.fieldName, 'referencesTable', bt.references.name,
      );
      return {
        fieldName: bt.fieldName ?? existing?.fieldName ?? null,
        isUnique: bt.isUnique,
        referencesTable: existing?.referencesTable ?? bt.references.name,
        type: existing?.type ?? bt.type,
        keys: bt.keys.map(metaFieldToCleanField),
      };
    });

    // Use _meta for hasOne (introspection can't distinguish from hasMany)
    const enrichedHasOne: CleanHasOneRelation[] = metaRelations.hasOne.map((ho) => {
      const existing = findMatchingRelation(
        table.relations.hasMany, ho.fieldName, 'referencedByTable', ho.referencedBy.name,
      );
      return {
        fieldName: ho.fieldName ?? existing?.fieldName ?? null,
        isUnique: ho.isUnique,
        referencedByTable: existing?.referencedByTable ?? ho.referencedBy.name,
        type: existing?.type ?? ho.type,
        keys: ho.keys.map(metaFieldToCleanField),
      };
    });

    // Use _meta for hasMany
    const enrichedHasMany: CleanHasManyRelation[] = metaRelations.hasMany.map((hm) => {
      const existing = findMatchingRelation(
        table.relations.hasMany, hm.fieldName, 'referencedByTable', hm.referencedBy.name,
      );
      return {
        fieldName: hm.fieldName ?? existing?.fieldName ?? null,
        isUnique: hm.isUnique,
        referencedByTable: existing?.referencedByTable ?? hm.referencedBy.name,
        type: existing?.type ?? hm.type,
        keys: hm.keys.map(metaFieldToCleanField),
      };
    });

    // Use _meta for M:N — this is the critical fix
    const enrichedManyToMany: CleanManyToManyRelation[] = metaRelations.manyToMany.map((m2m) => {
      // Find matching introspection-based relation (may have been misclassified as hasMany)
      const existingM2M = findMatchingRelation(
        table.relations.manyToMany, m2m.fieldName, 'rightTable', m2m.rightTable.name,
      );
      const existingHasMany = m2m.fieldName
        ? table.relations.hasMany.find((r) => r.fieldName === m2m.fieldName)
        : undefined;
      return {
        fieldName: m2m.fieldName ?? existingM2M?.fieldName ?? existingHasMany?.fieldName ?? null,
        rightTable: existingM2M?.rightTable ?? m2m.rightTable.name,
        junctionTable: existingM2M?.junctionTable ?? m2m.junctionTable.name,
        type: existingM2M?.type ?? existingHasMany?.type ?? m2m.type,
        junctionLeftKeys: m2m.junctionLeftConstraint.fields.map(metaFieldToCleanField),
        junctionRightKeys: m2m.junctionRightConstraint.fields.map(metaFieldToCleanField),
        leftKeys: m2m.leftKeyAttributes.map(metaFieldToCleanField),
        rightKeys: m2m.rightKeyAttributes.map(metaFieldToCleanField),
      };
    });

    // Remove hasMany entries that are actually M:N or hasOne (reclassified by _meta)
    const excludeFieldNames = new Set([
      ...enrichedManyToMany.map((r) => r.fieldName),
      ...enrichedHasOne.map((r) => r.fieldName),
    ]);
    const finalHasMany = enrichedHasMany.filter((r) => !excludeFieldNames.has(r.fieldName));

    table.relations = {
      belongsTo: enrichedBelongsTo,
      hasOne: enrichedHasOne,
      hasMany: finalHasMany,
      manyToMany: enrichedManyToMany,
    };
  }
}

// ============================================================================
// Relation Enrichment — Path B: Cross-referencing heuristic (SDL mode)
// ============================================================================

/**
 * Cross-reference tables to detect M:N relations that were misclassified as hasMany.
 * Works when _meta is not available (SDL file sources).
 *
 * Algorithm:
 * 1. Find junction table candidates: entities with 2+ belongsTo to distinct entities
 * 2. For junction J with belongsTo(A) and belongsTo(B):
 *    - If A has a connection field to B (not to J), mark A→B as M:N through J
 *    - If B has a connection field to A (not to B), mark B→A as M:N through J
 */
function enrichRelationsFromCrossReference(tables: CleanTable[]): void {
  const tableMap = new Map<string, CleanTable>();
  for (const table of tables) {
    tableMap.set(table.name, table);
  }

  // Step 1: Find junction candidates — tables with 2+ distinct belongsTo targets
  const junctionCandidates: Array<{
    junction: CleanTable;
    belongsToPairs: Array<[string, string]>; // pairs of referenced table names
  }> = [];

  for (const table of tables) {
    const belongsToTargets = table.relations.belongsTo.map((r) => r.referencesTable);
    const uniqueTargets = [...new Set(belongsToTargets)];

    if (uniqueTargets.length >= 2) {
      // Generate all pairs of distinct belongsTo targets
      const pairs: Array<[string, string]> = [];
      for (let i = 0; i < uniqueTargets.length; i++) {
        for (let j = i + 1; j < uniqueTargets.length; j++) {
          pairs.push([uniqueTargets[i], uniqueTargets[j]]);
        }
      }
      junctionCandidates.push({ junction: table, belongsToPairs: pairs });
    }
  }

  if (junctionCandidates.length === 0) return;

  // Step 2: For each junction candidate, check if parent tables have cross-connections
  for (const { junction, belongsToPairs } of junctionCandidates) {
    for (const [tableAName, tableBName] of belongsToPairs) {
      const tableA = tableMap.get(tableAName);
      const tableB = tableMap.get(tableBName);
      if (!tableA || !tableB) continue;

      // Check if A has a hasMany to B (not to junction) — this would be the M:N field
      reclassifyIfManyToMany(tableA, tableBName, junction.name);
      // Check if B has a hasMany to A (not to junction)
      reclassifyIfManyToMany(tableB, tableAName, junction.name);
    }
  }
}

/**
 * Check if a table has a hasMany relation to a target that is actually M:N through a junction.
 * If found, reclassify it from hasMany to manyToMany.
 */
function reclassifyIfManyToMany(
  sourceTable: CleanTable,
  targetTableName: string,
  junctionTableName: string,
): void {
  // Find hasMany relations to the target table (not to the junction)
  const hasManyToTarget = sourceTable.relations.hasMany.filter(
    (r) => r.referencedByTable === targetTableName,
  );

  for (const relation of hasManyToTarget) {
    // This hasMany to the target is actually M:N through the junction
    const m2mRelation: CleanManyToManyRelation = {
      fieldName: relation.fieldName,
      rightTable: targetTableName,
      junctionTable: junctionTableName,
      type: relation.type,
    };

    // Move from hasMany to manyToMany
    sourceTable.relations.manyToMany.push(m2mRelation);
    sourceTable.relations.hasMany = sourceTable.relations.hasMany.filter(
      (r) => r !== relation,
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build a map of type name → IntrospectionType for efficient lookup
 */
function buildTypeMap(
  types: IntrospectionType[],
): Map<string, IntrospectionType> {
  const map = new Map<string, IntrospectionType>();
  for (const type of types) {
    map.set(type.name, type);
  }
  return map;
}

/**
 * Get fields from a type, returning empty array if null
 */
function getTypeFields(
  type: IntrospectionType | undefined,
): IntrospectionField[] {
  return type?.fields ?? [];
}
