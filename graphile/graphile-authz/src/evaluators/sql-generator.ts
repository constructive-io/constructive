/**
 * SQL Expression Generator for Authz Nodes
 *
 * This module generates SQL WHERE clause expressions from Authz node definitions.
 * The generated SQL can be injected into PostGraphile queries to enforce authorization.
 *
 * The SQL expressions are designed to work with the constructive-db metaschema
 * infrastructure, including SPRT tables, permission bitstrings, and hierarchy closure tables.
 */

import type {
  AuthzNode,
  AuthzNodeType,
  AuthzDirectOwnerPayload,
  AuthzDirectOwnerAnyPayload,
  AuthzMembershipPayload,
  AuthzMembershipByFieldPayload,
  AuthzMembershipByJoinPayload,
  AuthzOrgHierarchyPayload,
  AuthzTemporalPayload,
  AuthzPublishablePayload,
  AuthzArrayContainsActorPayload,
  AuthzArrayContainsActorByJoinPayload,
  AuthzCompositePayload,
  BoolOp,
} from '../types/authz-nodes';
import { getNodeType, getNodePayload } from '../types/authz-nodes';

/**
 * Options for SQL generation.
 */
export interface SqlGeneratorOptions {
  /**
   * Table alias to use for the protected table.
   * @default null (no alias)
   */
  tableAlias?: string | null;

  /**
   * Schema name for the protected table.
   */
  schema?: string;

  /**
   * Table name for the protected table.
   */
  table?: string;

  /**
   * Private schema name for SPRT tables.
   * @default 'app_private'
   */
  privateSchema?: string;

  /**
   * Function name for getting current user ID.
   * @default 'current_user_id()'
   */
  currentUserIdFunc?: string;

  /**
   * Whether to use parameterized queries.
   * @default false
   */
  parameterized?: boolean;

  /**
   * Parameter values (populated when parameterized is true).
   */
  parameters?: unknown[];
}

/**
 * Result of SQL generation.
 */
export interface SqlGeneratorResult {
  /** The generated SQL expression */
  sql: string;

  /** Parameter values (if parameterized) */
  parameters?: unknown[];

  /** Whether the expression is always true */
  isAlwaysTrue?: boolean;

  /** Whether the expression is always false */
  isAlwaysFalse?: boolean;
}

/**
 * Default options for SQL generation.
 */
const DEFAULT_OPTIONS: Required<
  Omit<SqlGeneratorOptions, 'tableAlias' | 'schema' | 'table' | 'parameters'>
> = {
  privateSchema: 'app_private',
  currentUserIdFunc: 'current_user_id()',
  parameterized: false,
};

/**
 * Generates a SQL expression from an Authz node.
 */
export function generateSql(
  node: AuthzNode,
  options: SqlGeneratorOptions = {}
): SqlGeneratorResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const nodeType = getNodeType(node);

  switch (nodeType) {
    case 'AuthzDirectOwner':
      return generateDirectOwner(
        getNodePayload(node, 'AuthzDirectOwner')!,
        opts
      );

    case 'AuthzDirectOwnerAny':
      return generateDirectOwnerAny(
        getNodePayload(node, 'AuthzDirectOwnerAny')!,
        opts
      );

    case 'AuthzMembership':
      return generateMembership(
        getNodePayload(node, 'AuthzMembership')!,
        opts
      );

    case 'AuthzMembershipByField':
      return generateMembershipByField(
        getNodePayload(node, 'AuthzMembershipByField')!,
        opts
      );

    case 'AuthzMembershipByJoin':
      return generateMembershipByJoin(
        getNodePayload(node, 'AuthzMembershipByJoin')!,
        opts
      );

    case 'AuthzOrgHierarchy':
      return generateOrgHierarchy(
        getNodePayload(node, 'AuthzOrgHierarchy')!,
        opts
      );

    case 'AuthzTemporal':
      return generateTemporal(getNodePayload(node, 'AuthzTemporal')!, opts);

    case 'AuthzPublishable':
      return generatePublishable(
        getNodePayload(node, 'AuthzPublishable')!,
        opts
      );

    case 'AuthzArrayContainsActor':
      return generateArrayContainsActor(
        getNodePayload(node, 'AuthzArrayContainsActor')!,
        opts
      );

    case 'AuthzArrayContainsActorByJoin':
      return generateArrayContainsActorByJoin(
        getNodePayload(node, 'AuthzArrayContainsActorByJoin')!,
        opts
      );

    case 'AuthzAllowAll':
      return { sql: 'TRUE', isAlwaysTrue: true };

    case 'AuthzDenyAll':
      return { sql: 'FALSE', isAlwaysFalse: true };

    case 'AuthzComposite':
      return generateComposite(getNodePayload(node, 'AuthzComposite')!, opts);

    default:
      throw new Error(`Unknown Authz node type: ${nodeType as string}`);
  }
}

/**
 * Generates a column reference with optional table alias.
 */
function colRef(column: string, opts: SqlGeneratorOptions): string {
  if (opts.tableAlias) {
    return `${quoteIdent(opts.tableAlias)}.${quoteIdent(column)}`;
  }
  return quoteIdent(column);
}

/**
 * Quotes a SQL identifier.
 */
function quoteIdent(ident: string): string {
  // Simple quoting - in production, use a proper SQL escaping library
  return `"${ident.replace(/"/g, '""')}"`;
}

/**
 * AuthzDirectOwner: {entity_field} = current_user_id()
 */
function generateDirectOwner(
  payload: AuthzDirectOwnerPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const sql = `${colRef(payload.entity_field, opts)} = ${opts.currentUserIdFunc}`;
  return { sql };
}

/**
 * AuthzDirectOwnerAny: {field_1} = current_user_id() OR {field_2} = current_user_id() OR ...
 */
function generateDirectOwnerAny(
  payload: AuthzDirectOwnerAnyPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  if (payload.entity_fields.length === 0) {
    return { sql: 'FALSE', isAlwaysFalse: true };
  }

  if (payload.entity_fields.length === 1) {
    return generateDirectOwner({ entity_field: payload.entity_fields[0] }, opts);
  }

  const conditions = payload.entity_fields.map(
    (field) => `${colRef(field, opts)} = ${opts.currentUserIdFunc}`
  );
  const sql = `(${conditions.join(' OR ')})`;
  return { sql };
}

/**
 * Generates the SPRT table name based on membership type.
 */
function getSprtTableName(
  membershipType: number | string,
  opts: SqlGeneratorOptions
): string {
  // Resolve membership type to a name
  let typeName: string;
  if (typeof membershipType === 'number') {
    switch (membershipType) {
      case 1:
        typeName = 'app';
        break;
      case 2:
        typeName = 'org';
        break;
      case 3:
        typeName = 'group';
        break;
      default:
        typeName = `type_${membershipType}`;
    }
  } else {
    typeName = membershipType;
  }

  return `${quoteIdent(opts.privateSchema!)}.${quoteIdent(`${typeName}_memberships_sprt`)}`;
}

/**
 * Generates permission check conditions for SPRT queries.
 */
function generatePermissionConditions(
  payload: {
    permission?: string;
    permissions?: string[];
    is_admin?: boolean;
    is_owner?: boolean;
    admin_owner_logic?: 'or' | 'and';
  },
  sprtAlias: string
): string[] {
  const conditions: string[] = [];

  // Permission check (bitstring AND)
  if (payload.permission) {
    // Single permission - would need to resolve to bit position
    // For now, use a placeholder that can be resolved at runtime
    conditions.push(
      `(${sprtAlias}."permissions" & get_permission_mask('${payload.permission}')) = get_permission_mask('${payload.permission}')`
    );
  } else if (payload.permissions && payload.permissions.length > 0) {
    // Multiple permissions (ORed together)
    const permList = payload.permissions.map((p) => `'${p}'`).join(', ');
    conditions.push(
      `(${sprtAlias}."permissions" & get_permission_mask(ARRAY[${permList}])) = get_permission_mask(ARRAY[${permList}])`
    );
  }

  // Admin/owner checks
  const adminOwnerConditions: string[] = [];
  if (payload.is_admin) {
    adminOwnerConditions.push(`${sprtAlias}."is_admin" = TRUE`);
  }
  if (payload.is_owner) {
    adminOwnerConditions.push(`${sprtAlias}."is_owner" = TRUE`);
  }

  if (adminOwnerConditions.length > 0) {
    const logic = payload.admin_owner_logic ?? 'or';
    const combined =
      adminOwnerConditions.length === 1
        ? adminOwnerConditions[0]
        : `(${adminOwnerConditions.join(logic === 'or' ? ' OR ' : ' AND ')})`;
    conditions.push(combined);
  }

  return conditions;
}

/**
 * AuthzMembership: EXISTS (SELECT 1 FROM {sprt} WHERE actor_id = current_user_id() ...)
 */
function generateMembership(
  payload: AuthzMembershipPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const sprtTable = getSprtTableName(payload.membership_type, opts);
  const sprtAlias = 'sprt';

  const conditions = [
    `${sprtAlias}."actor_id" = ${opts.currentUserIdFunc}`,
    ...generatePermissionConditions(payload, sprtAlias),
  ];

  const sql = `EXISTS (SELECT 1 FROM ${sprtTable} AS ${sprtAlias} WHERE ${conditions.join(' AND ')})`;
  return { sql };
}

/**
 * AuthzMembershipByField: {entity_field} = ANY (SELECT entity_id FROM {sprt} WHERE ...)
 */
function generateMembershipByField(
  payload: AuthzMembershipByFieldPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  // Default membership type to org (2) if not specified
  const membershipType = payload.membership_type ?? 2;
  const sprtTable = getSprtTableName(membershipType, opts);
  const sprtAlias = 'sprt';

  const conditions = [
    `${sprtAlias}."actor_id" = ${opts.currentUserIdFunc}`,
    ...generatePermissionConditions(payload, sprtAlias),
  ];

  const sql = `${colRef(payload.entity_field, opts)} = ANY (SELECT ${sprtAlias}."entity_id" FROM ${sprtTable} AS ${sprtAlias} WHERE ${conditions.join(' AND ')})`;
  return { sql };
}

/**
 * AuthzMembershipByJoin: JOIN-based membership verification
 */
function generateMembershipByJoin(
  payload: AuthzMembershipByJoinPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const membershipType = payload.membership_type ?? 2;
  const sprtTable = getSprtTableName(membershipType, opts);
  const sprtAlias = 'sprt';
  const joinAlias = 'join_tbl';

  // Build the join table reference
  let joinTable: string;
  if (payload.obj_table_id) {
    // Would need to resolve table ID to schema.table - use placeholder
    joinTable = `/* table_id: ${payload.obj_table_id} */`;
  } else if (payload.obj_schema && payload.obj_table) {
    joinTable = `${quoteIdent(payload.obj_schema)}.${quoteIdent(payload.obj_table)}`;
  } else {
    throw new Error(
      'AuthzMembershipByJoin requires either obj_table_id or obj_schema/obj_table'
    );
  }

  // Build the join field reference
  let joinField: string;
  if (payload.obj_field_id) {
    // Would need to resolve field ID - use placeholder
    joinField = `/* field_id: ${payload.obj_field_id} */`;
  } else if (payload.obj_field) {
    joinField = quoteIdent(payload.obj_field);
  } else {
    throw new Error(
      'AuthzMembershipByJoin requires either obj_field_id or obj_field'
    );
  }

  const conditions = [
    `${sprtAlias}."actor_id" = ${opts.currentUserIdFunc}`,
    ...generatePermissionConditions(payload, sprtAlias),
  ];

  const sql = `${colRef(payload.entity_field, opts)} = ANY (
    SELECT ${joinAlias}.${quoteIdent(payload.entity_field)}
    FROM ${sprtTable} AS ${sprtAlias}
    JOIN ${joinTable} AS ${joinAlias} ON ${sprtAlias}."entity_id" = ${joinAlias}.${joinField}
    WHERE ${conditions.join(' AND ')}
  )`;

  return { sql: sql.replace(/\s+/g, ' ').trim() };
}

/**
 * AuthzOrgHierarchy: Organizational hierarchy visibility
 */
function generateOrgHierarchy(
  payload: AuthzOrgHierarchyPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const entityField = payload.entity_field ?? 'entity_id';
  const hierarchyTable = `${quoteIdent(opts.privateSchema!)}.${quoteIdent('org_hierarchy_acl')}`;
  const hAlias = 'h';

  let conditions: string[];

  if (payload.direction === 'down') {
    // Manager sees subordinates: current user is ancestor, row's anchor is descendant
    conditions = [
      `${hAlias}."entity_id" = ${colRef(entityField, opts)}`,
      `${hAlias}."ancestor_id" = ${opts.currentUserIdFunc}`,
      `${hAlias}."descendant_id" = ${colRef(payload.anchor_field, opts)}`,
    ];
  } else {
    // Subordinate sees managers: current user is descendant, row's anchor is ancestor
    conditions = [
      `${hAlias}."entity_id" = ${colRef(entityField, opts)}`,
      `${hAlias}."descendant_id" = ${opts.currentUserIdFunc}`,
      `${hAlias}."ancestor_id" = ${colRef(payload.anchor_field, opts)}`,
    ];
  }

  if (payload.max_depth !== undefined) {
    conditions.push(`${hAlias}."depth" <= ${payload.max_depth}`);
  }

  const sql = `EXISTS (SELECT 1 FROM ${hierarchyTable} AS ${hAlias} WHERE ${conditions.join(' AND ')})`;
  return { sql };
}

/**
 * AuthzTemporal: Time-window based access control
 */
function generateTemporal(
  payload: AuthzTemporalPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const conditions: string[] = [];

  if (payload.valid_from_field) {
    const op = payload.valid_from_inclusive !== false ? '<=' : '<';
    conditions.push(`${colRef(payload.valid_from_field, opts)} ${op} NOW()`);
  }

  if (payload.valid_until_field) {
    const op = payload.valid_until_inclusive === true ? '>=' : '>';
    conditions.push(
      `(${colRef(payload.valid_until_field, opts)} IS NULL OR ${colRef(payload.valid_until_field, opts)} ${op} NOW())`
    );
  }

  if (conditions.length === 0) {
    return { sql: 'TRUE', isAlwaysTrue: true };
  }

  const sql = conditions.length === 1 ? conditions[0] : `(${conditions.join(' AND ')})`;
  return { sql };
}

/**
 * AuthzPublishable: Published state access control
 */
function generatePublishable(
  payload: AuthzPublishablePayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const isPublishedField = payload.is_published_field ?? 'is_published';
  const publishedAtField = payload.published_at_field ?? 'published_at';
  const requirePublishedAt = payload.require_published_at !== false;

  const conditions = [`${colRef(isPublishedField, opts)} IS TRUE`];

  if (requirePublishedAt) {
    conditions.push(
      `${colRef(publishedAtField, opts)} IS NOT NULL`,
      `${colRef(publishedAtField, opts)} <= NOW()`
    );
  }

  const sql = conditions.length === 1 ? conditions[0] : `(${conditions.join(' AND ')})`;
  return { sql };
}

/**
 * AuthzArrayContainsActor: current_user_id() = ANY({array_field})
 */
function generateArrayContainsActor(
  payload: AuthzArrayContainsActorPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const sql = `${opts.currentUserIdFunc} = ANY(${colRef(payload.array_field, opts)})`;
  return { sql };
}

/**
 * AuthzArrayContainsActorByJoin: Array membership check in a related table
 */
function generateArrayContainsActorByJoin(
  payload: AuthzArrayContainsActorByJoinPayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const relatedTable = `${quoteIdent(payload.owned_schema)}.${quoteIdent(payload.owned_table)}`;

  const sql = `(SELECT ${opts.currentUserIdFunc} = ANY(${quoteIdent(payload.owned_table_key)}) FROM ${relatedTable} WHERE ${quoteIdent(payload.owned_table_ref_key)} = ${colRef(payload.this_object_key, opts)})`;
  return { sql };
}

/**
 * AuthzComposite: Boolean combination of multiple nodes
 */
function generateComposite(
  payload: AuthzCompositePayload,
  opts: SqlGeneratorOptions
): SqlGeneratorResult {
  const { boolop, args } = payload.BoolExpr;

  if (args.length === 0) {
    // Empty AND is TRUE, empty OR is FALSE
    if (boolop === 'AND_EXPR') {
      return { sql: 'TRUE', isAlwaysTrue: true };
    }
    return { sql: 'FALSE', isAlwaysFalse: true };
  }

  // Generate SQL for each argument
  const argResults = args.map((arg) => generateSql(arg, opts));

  // Handle NOT_EXPR (unary)
  if (boolop === 'NOT_EXPR') {
    if (argResults.length !== 1) {
      throw new Error('NOT_EXPR requires exactly one argument');
    }
    const inner = argResults[0];
    if (inner.isAlwaysTrue) {
      return { sql: 'FALSE', isAlwaysFalse: true };
    }
    if (inner.isAlwaysFalse) {
      return { sql: 'TRUE', isAlwaysTrue: true };
    }
    return { sql: `NOT (${inner.sql})` };
  }

  // Handle AND_EXPR and OR_EXPR
  const operator = boolop === 'AND_EXPR' ? ' AND ' : ' OR ';

  // Optimize: check for always true/false
  if (boolop === 'AND_EXPR') {
    // AND with FALSE is FALSE
    if (argResults.some((r) => r.isAlwaysFalse)) {
      return { sql: 'FALSE', isAlwaysFalse: true };
    }
    // Filter out TRUE values
    const filtered = argResults.filter((r) => !r.isAlwaysTrue);
    if (filtered.length === 0) {
      return { sql: 'TRUE', isAlwaysTrue: true };
    }
    if (filtered.length === 1) {
      return filtered[0];
    }
    return { sql: `(${filtered.map((r) => r.sql).join(operator)})` };
  } else {
    // OR with TRUE is TRUE
    if (argResults.some((r) => r.isAlwaysTrue)) {
      return { sql: 'TRUE', isAlwaysTrue: true };
    }
    // Filter out FALSE values
    const filtered = argResults.filter((r) => !r.isAlwaysFalse);
    if (filtered.length === 0) {
      return { sql: 'FALSE', isAlwaysFalse: true };
    }
    if (filtered.length === 1) {
      return filtered[0];
    }
    return { sql: `(${filtered.map((r) => r.sql).join(operator)})` };
  }
}

/**
 * Convenience function to generate SQL for common patterns.
 */
export const AuthzSql = {
  /**
   * Generate SQL for direct owner check.
   */
  directOwner(entityField: string, opts?: SqlGeneratorOptions): string {
    return generateSql({ AuthzDirectOwner: { entity_field: entityField } }, opts).sql;
  },

  /**
   * Generate SQL for membership check.
   */
  membership(
    membershipType: number | string,
    options?: Partial<AuthzMembershipPayload>,
    opts?: SqlGeneratorOptions
  ): string {
    return generateSql(
      { AuthzMembership: { membership_type: membershipType, ...options } },
      opts
    ).sql;
  },

  /**
   * Generate SQL for membership by field check.
   */
  membershipByField(
    entityField: string,
    options?: Partial<Omit<AuthzMembershipByFieldPayload, 'entity_field'>>,
    opts?: SqlGeneratorOptions
  ): string {
    return generateSql(
      { AuthzMembershipByField: { entity_field: entityField, ...options } },
      opts
    ).sql;
  },

  /**
   * Generate SQL for temporal check.
   */
  temporal(
    options: AuthzTemporalPayload,
    opts?: SqlGeneratorOptions
  ): string {
    return generateSql({ AuthzTemporal: options }, opts).sql;
  },

  /**
   * Generate SQL for publishable check.
   */
  publishable(
    options?: AuthzPublishablePayload,
    opts?: SqlGeneratorOptions
  ): string {
    return generateSql({ AuthzPublishable: options ?? {} }, opts).sql;
  },

  /**
   * Generate SQL for composite (AND/OR/NOT) check.
   */
  composite(
    boolop: BoolOp,
    args: AuthzNode[],
    opts?: SqlGeneratorOptions
  ): string {
    return generateSql(
      { AuthzComposite: { BoolExpr: { boolop, args } } },
      opts
    ).sql;
  },
};
