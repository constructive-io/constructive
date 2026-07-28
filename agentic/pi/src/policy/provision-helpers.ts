export type CrudOperation = 'create' | 'read' | 'update' | 'delete';

export interface OperationPolicyConfig {
  roleName: string;
  isPermissive: boolean;
  policyData: Record<string, unknown>;
  isCustomized: boolean;
}

export interface CrudPolicyConfigs {
  create: OperationPolicyConfig;
  read: OperationPolicyConfig;
  update: OperationPolicyConfig;
  delete: OperationPolicyConfig;
}

export const CRUD_OPERATIONS: CrudOperation[] = ['create', 'read', 'update', 'delete'];

export type GrantPrivilege = [string, string | string[]];

export interface GrantEntry {
  roles: string[];
  privileges: GrantPrivilege[];
}

export interface PolicyEntry {
  $type: string;
  data?: Record<string, unknown>;
  privileges?: string[];
  policy_role?: string;
  permissive?: boolean;
  policy_name?: string;
}

export const ALL_CRUD_PRIVILEGES: GrantPrivilege[] = [
  ['select', '*'],
  ['insert', '*'],
  ['update', '*'],
  ['delete', '*'],
];

const CRUD_OP_TO_LOWER_PRIVILEGE: Record<CrudOperation, string> = {
  create: 'insert',
  read: 'select',
  update: 'update',
  delete: 'delete',
};

export function crudOpToPrivilege(op: CrudOperation): string {
  return CRUD_OP_TO_LOWER_PRIVILEGE[op];
}

export function crudOpsToPrivileges(ops: readonly CrudOperation[]): string[] {
  return ops.map(crudOpToPrivilege);
}

export function buildGrants(
  roles: string[] = ['authenticated'],
  privileges: GrantPrivilege[] = ALL_CRUD_PRIVILEGES,
): GrantEntry[] {
  return [{ roles, privileges }];
}

export function buildPolicyEntry(
  type: string,
  opts: Partial<Omit<PolicyEntry, '$type'>> = {},
): PolicyEntry {
  const entry: PolicyEntry = { $type: type };
  if (opts.data && Object.keys(opts.data).length > 0) entry.data = opts.data;
  if (opts.privileges && opts.privileges.length > 0) entry.privileges = opts.privileges;
  if (opts.policy_role) entry.policy_role = opts.policy_role;
  if (opts.permissive !== undefined) entry.permissive = opts.permissive;
  if (opts.policy_name) entry.policy_name = opts.policy_name;
  return entry;
}

export interface OperationGroup {
  roleName: string;
  isPermissive: boolean;
  privileges: string[];
}

export function groupOperationsByConfig(
  enabledOperations: readonly CrudOperation[],
  operations: CrudPolicyConfigs,
): OperationGroup[] {
  const groupMap = new Map<string, OperationGroup>();

  for (const op of enabledOperations) {
    const config = operations[op];
    const key = `${config.roleName}:${config.isPermissive}`;

    let group = groupMap.get(key);
    if (!group) {
      group = { roleName: config.roleName, isPermissive: config.isPermissive, privileges: [] };
      groupMap.set(key, group);
    }
    group.privileges.push(...crudOpsToPrivileges([op]));
  }

  return [...groupMap.values()];
}
