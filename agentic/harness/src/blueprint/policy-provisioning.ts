/**
 * VENDORED — verbatim from @constructive-io/data (workspace-only, unpublished):
 *   constructive-client/packages/data/src/policy-provisioning.ts
 *
 * Zero-import pure-config module. Vendored because the package is not published
 * to npm. Keep in sync with the upstream source. Do not edit by hand except to
 * re-sync from upstream.
 */

export const MEMBERSHIP_TYPES = {
  APP: 1,
  ORGANIZATION: 2,
  GROUP: 3,
} as const;

export type PolicyFieldType = 'string' | 'boolean' | 'integer' | 'uuid' | 'uuid[]';
export type PolicyFieldComponent = 'table-select' | 'membership-type-select' | 'permission-select';
export type PolicyProvisioningCategory =
  | 'has-module'
  | 'needs-fields'
  | 'needs-table'
  | 'no-fields';

export interface PolicyFieldOverride {
  type?: PolicyFieldType;
  component?: PolicyFieldComponent;
  label?: string;
  placeholder?: string;
  description?: string;
  defaultValue?: unknown;
  required?: boolean;
  hidden?: boolean;
  pgType?: 'uuid' | 'uuid[]' | 'timestamptz' | 'boolean';
  dependsOn?: string;
  options?: { value: string; label: string; description?: string }[];
}

export interface PolicyProvisioningConfig {
  category: PolicyProvisioningCategory;
  hasDataNode: boolean;
  dataNodeType?: string;
  fieldOverrides?: Record<string, PolicyFieldOverride>;
  disabled?: boolean;
}

export interface GeneratedField {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
}

export type CrudOperation = 'create' | 'read' | 'update' | 'delete';

export interface CrudOperationPolicyConfig {
  roleName: string;
  isPermissive: boolean;
}

export interface GroupedCrudPrivileges {
  roleName: string;
  isPermissive: boolean;
  privileges: string[];
}

export const CRUD_OPERATIONS: CrudOperation[] = ['create', 'read', 'update', 'delete'];

export const CRUD_TO_PRIVILEGE: Record<CrudOperation, string> = {
  create: 'INSERT',
  read: 'SELECT',
  update: 'UPDATE',
  delete: 'DELETE',
};

export const DEFAULT_CRUD_GRANT_PRIVILEGES = [
  ['select', '*'],
  ['insert', '*'],
  ['update', '*'],
  ['delete', '*'],
] as unknown as Record<string, unknown>[];

export const POLICY_PROVISIONING_CONFIG: Record<string, PolicyProvisioningConfig> = {
  AuthzDirectOwner: {
    category: 'has-module',
    hasDataNode: true,
    dataNodeType: 'DataDirectOwner',
    fieldOverrides: {
      entity_field: {
        type: 'string',
        required: true,
        label: 'Owner Field Name',
        placeholder: 'owner_id',
        description: 'Column that stores the owner user ID',
        defaultValue: 'owner_id',
      },
    },
  },
  AuthzEntityMembership: {
    category: 'has-module',
    hasDataNode: true,
    dataNodeType: 'DataEntityMembership',
    fieldOverrides: {
      entity_field: {
        type: 'string',
        required: true,
        label: 'Entity Field Name',
        placeholder: 'entity_id',
        description: 'Column referencing the org/group',
        defaultValue: 'entity_id',
      },
      membership_type: {
        type: 'integer',
        hidden: true,
        defaultValue: MEMBERSHIP_TYPES.ORGANIZATION,
      },
      permission: {
        type: 'string',
        component: 'permission-select',
        label: 'Required Permission',
        description: 'Optional permission the user must have',
      },
      is_admin: {
        type: 'boolean',
        label: 'Admins',
        description: 'People with admin access can view this.',
      },
      is_owner: {
        type: 'boolean',
        label: 'Owners',
        description: 'People who own the membership can view this.',
      },
    },
  },
  AuthzDirectOwnerAny: {
    category: 'needs-fields',
    hasDataNode: false,
    fieldOverrides: {
      entity_fields: {
        type: 'uuid[]',
        required: true,
        label: 'Owner Fields',
        description: 'UUID columns to check for ownership (OR logic)',
        defaultValue: ['owner_id'],
        pgType: 'uuid',
      },
    },
  },
  AuthzAppMembership: {
    category: 'no-fields',
    hasDataNode: false,
    fieldOverrides: {
      permission: {
        type: 'string',
        component: 'permission-select',
        label: 'Required Permission',
        description: 'Optional permission the user must have',
      },
      is_admin: {
        type: 'boolean',
        label: 'Admins',
        description: 'People with admin access can view this.',
      },
      is_owner: {
        type: 'boolean',
        label: 'Owners',
        description: 'People who own the membership can view this.',
      },
    },
  },
  AuthzPublishable: {
    category: 'has-module',
    hasDataNode: true,
    dataNodeType: 'DataPublishable',
    fieldOverrides: {
      is_published_field: {
        type: 'string',
        label: 'Published Flag Field',
        placeholder: 'is_published',
        defaultValue: 'is_published',
      },
      published_at_field: {
        type: 'string',
        label: 'Published At Field',
        placeholder: 'published_at',
        defaultValue: 'published_at',
      },
      require_published_at: {
        type: 'boolean',
        label: 'Require Published At',
        description: 'Also require that the publish date has passed',
        defaultValue: true,
      },
    },
  },
  AuthzTemporal: {
    category: 'needs-fields',
    hasDataNode: false,
    fieldOverrides: {
      valid_from_field: {
        type: 'string',
        required: true,
        label: 'Valid From Field',
        placeholder: 'valid_from',
        description: 'Column for start time',
        defaultValue: 'valid_from',
        pgType: 'timestamptz',
      },
      valid_until_field: {
        type: 'string',
        required: true,
        label: 'Valid Until Field',
        placeholder: 'valid_until',
        description: 'Column for end time',
        defaultValue: 'valid_until',
        pgType: 'timestamptz',
      },
      valid_from_inclusive: {
        type: 'boolean',
        label: 'Include Start',
        description: 'Include start boundary',
        defaultValue: true,
      },
      valid_until_inclusive: {
        type: 'boolean',
        label: 'Include End',
        description: 'Include end boundary',
        defaultValue: false,
      },
    },
  },
  AuthzMemberList: {
    category: 'needs-fields',
    hasDataNode: false,
    fieldOverrides: {
      array_field: {
        type: 'string',
        required: true,
        label: 'Member List Field',
        placeholder: 'allowed_users',
        description: 'Column containing list of user IDs',
        defaultValue: 'allowed_users',
        pgType: 'uuid[]',
      },
    },
  },
  AuthzRelatedMemberList: {
    category: 'needs-table',
    hasDataNode: false,
    fieldOverrides: {
      owned_schema: {
        hidden: true,
      },
      owned_table: {
        type: 'string',
        required: true,
        component: 'table-select',
        label: 'Related Table',
        placeholder: 'groups',
        description: 'Table containing the member list',
      },
      owned_table_key: {
        type: 'uuid',
        required: true,
        label: 'Member List Column',
        placeholder: 'member_ids',
        description: 'List column in related table',
        dependsOn: 'owned_table',
      },
      owned_table_ref_key: {
        type: 'uuid',
        required: true,
        label: 'Reference Key',
        placeholder: 'id',
        description: 'FK column in related table',
        dependsOn: 'owned_table',
      },
      this_object_key: {
        type: 'uuid',
        required: true,
        label: 'Foreign Key',
        placeholder: 'group_id',
        description: 'FK on this table to related table',
      },
    },
  },
  AuthzRelatedEntityMembership: {
    category: 'needs-table',
    hasDataNode: false,
    fieldOverrides: {
      entity_field: {
        type: 'uuid',
        required: true,
        label: 'Foreign Key Field',
        description: 'Field on this table referencing the linked table',
      },
      membership_type: {
        type: 'integer',
        required: true,
        component: 'membership-type-select',
        label: 'Membership Scope',
      },
      obj_schema: {
        hidden: true,
      },
      obj_table: {
        type: 'string',
        required: true,
        component: 'table-select',
        label: 'Linked Table',
        description: 'Table to check for membership',
      },
      obj_field: {
        type: 'uuid',
        required: true,
        label: 'Entity Field on Linked Table',
        description: 'Field containing entity ID for membership check',
        dependsOn: 'obj_table',
      },
      permission: {
        type: 'string',
        component: 'permission-select',
        label: 'Required Permission',
      },
      is_admin: {
        type: 'boolean',
        label: 'Admins',
        description: 'People with admin access can view this.',
      },
      is_owner: {
        type: 'boolean',
        label: 'Owners',
        description: 'People who own the membership can view this.',
      },
    },
  },
  AuthzOrgHierarchy: {
    category: 'has-module',
    hasDataNode: true,
    dataNodeType: 'DataOwnershipInEntity',
    disabled: true,
    fieldOverrides: {
      direction: {
        type: 'string',
        required: true,
        label: 'Direction',
        description: 'Which direction to traverse the org hierarchy',
        defaultValue: 'down',
        options: [
          { value: 'down', label: 'Down', description: 'Managers can see their subordinates' },
          { value: 'up', label: 'Up', description: 'Subordinates can see their managers' },
        ],
      },
      entity_field: {
        type: 'string',
        label: 'Entity Field Name',
        placeholder: 'entity_id',
        description: 'Field referencing the org entity',
        defaultValue: 'entity_id',
      },
      anchor_field: {
        type: 'string',
        required: true,
        label: 'Anchor Field',
        placeholder: 'owner_id',
        description: 'Field referencing the user (e.g., owner_id)',
        defaultValue: 'owner_id',
      },
      max_depth: {
        type: 'integer',
        label: 'Max Depth',
        description: 'Optional max depth to limit visibility',
      },
    },
  },
  AuthzAllowAll: {
    category: 'no-fields',
    hasDataNode: false,
  },
  AuthzDenyAll: {
    category: 'no-fields',
    hasDataNode: false,
  },
  AuthzComposite: {
    category: 'no-fields',
    hasDataNode: false,
  },
};

export const DATA_NODE_GENERATED_FIELDS: Record<string, GeneratedField[]> = {
  DataDirectOwner: [
    {
      name: 'owner_id',
      type: 'uuid',
      nullable: false,
      description: 'References the owning user',
    },
  ],
  DataEntityMembership: [
    {
      name: 'entity_id',
      type: 'uuid',
      nullable: false,
      description: 'References the organization or group',
    },
  ],
  DataOwnershipInEntity: [
    {
      name: 'owner_id',
      type: 'uuid',
      nullable: false,
      description: 'References the owning user',
    },
    {
      name: 'entity_id',
      type: 'uuid',
      nullable: false,
      description: 'References the organization or group',
    },
  ],
  DataPublishable: [
    {
      name: 'is_published',
      type: 'boolean',
      nullable: false,
      description: 'Whether the record is published',
    },
    {
      name: 'published_at',
      type: 'timestamptz',
      nullable: true,
      description: 'When the record was published',
    },
  ],
  DataTimestamps: [
    {
      name: 'created_at',
      type: 'timestamptz',
      nullable: false,
      description: 'When the record was created',
    },
    {
      name: 'updated_at',
      type: 'timestamptz',
      nullable: false,
      description: 'When the record was last updated',
    },
  ],
  DataPeoplestamps: [
    {
      name: 'created_by',
      type: 'uuid',
      nullable: true,
      description: 'User who created the record',
    },
    {
      name: 'updated_by',
      type: 'uuid',
      nullable: true,
      description: 'User who last updated the record',
    },
  ],
  DataSoftDelete: [
    {
      name: 'is_deleted',
      type: 'boolean',
      nullable: false,
      description: 'Whether the record is soft-deleted',
    },
    {
      name: 'deleted_at',
      type: 'timestamptz',
      nullable: true,
      description: 'When the record was deleted',
    },
  ],
};

const AUTO_INJECT_SCHEMA_FIELDS = new Set(['owned_schema', 'obj_schema']);

export function getPolicyProvisioningConfig(
  policyType: string,
): PolicyProvisioningConfig | undefined {
  return POLICY_PROVISIONING_CONFIG[policyType];
}

export function getPolicyCategory(policyType: string): PolicyProvisioningCategory {
  return POLICY_PROVISIONING_CONFIG[policyType]?.category ?? 'no-fields';
}

export function getDataNodeForPolicy(policyType: string): string | undefined {
  return POLICY_PROVISIONING_CONFIG[policyType]?.dataNodeType;
}

export function policyRequiresDataNode(policyType: string): boolean {
  return POLICY_PROVISIONING_CONFIG[policyType]?.hasDataNode === true;
}

export function policyCanBeNodeless(policyType: string): boolean {
  return POLICY_PROVISIONING_CONFIG[policyType]?.hasDataNode !== true;
}

export function getGeneratedFields(dataNodeType: string): GeneratedField[] {
  return DATA_NODE_GENERATED_FIELDS[dataNodeType] ?? [];
}

export function hasGeneratedFields(dataNodeType: string): boolean {
  return dataNodeType in DATA_NODE_GENERATED_FIELDS;
}

export function getPolicyFieldDefaults(policyType: string): Record<string, unknown> {
  const config = POLICY_PROVISIONING_CONFIG[policyType];
  if (!config?.fieldOverrides) {
    return {};
  }

  const defaults: Record<string, unknown> = {};
  for (const [key, override] of Object.entries(config.fieldOverrides)) {
    if (override.defaultValue !== undefined) {
      defaults[key] = override.defaultValue;
    }
  }

  return defaults;
}

export function getFieldsRequiringColumns(
  policyType: string,
): {
  key: string;
  defaultName: string | string[];
  pgType: NonNullable<PolicyFieldOverride['pgType']>;
}[] {
  const config = POLICY_PROVISIONING_CONFIG[policyType];
  if (!config?.fieldOverrides) {
    return [];
  }

  const result: {
    key: string;
    defaultName: string | string[];
    pgType: NonNullable<PolicyFieldOverride['pgType']>;
  }[] = [];
  for (const [key, override] of Object.entries(config.fieldOverrides)) {
    if (!override.pgType) {
      continue;
    }

    const defaultName = Array.isArray(override.defaultValue)
      ? override.defaultValue
      : typeof override.defaultValue === 'string'
        ? override.defaultValue
        : key;

    result.push({
      key,
      defaultName,
      pgType: override.pgType,
    });
  }

  return result;
}

export function sanitizePolicyData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

export function injectSchemaFields(
  policyData: Record<string, unknown>,
  schemaId: string,
  policyType: string,
): Record<string, unknown> {
  const config = POLICY_PROVISIONING_CONFIG[policyType];
  if (!config?.fieldOverrides) {
    return policyData;
  }

  const next = { ...policyData };
  for (const [key, override] of Object.entries(config.fieldOverrides)) {
    if (!AUTO_INJECT_SCHEMA_FIELDS.has(key)) {
      continue;
    }
    if (override.hidden && next[key] === undefined) {
      next[key] = schemaId;
    }
  }

  return next;
}

export function buildNodeDataForDataNodeType(
  dataNodeType: string | undefined,
  policyData: Record<string, unknown>,
): Record<string, unknown> {
  if (!dataNodeType) {
    return {};
  }

  const data: Record<string, unknown> = {};

  if (dataNodeType === 'DataDirectOwner') {
    if (policyData.entity_field && policyData.entity_field !== 'owner_id') {
      data.owner_field_name = policyData.entity_field;
    }
  }

  if (dataNodeType === 'DataEntityMembership') {
    if (policyData.entity_field && policyData.entity_field !== 'entity_id') {
      data.entity_field_name = policyData.entity_field;
    }
  }

  if (dataNodeType === 'DataOwnershipInEntity') {
    if (policyData.entity_field && policyData.entity_field !== 'entity_id') {
      data.entity_field_name = policyData.entity_field;
    }
    if (policyData.anchor_field && policyData.anchor_field !== 'owner_id') {
      data.owner_field_name = policyData.anchor_field;
    }
  }

  return data;
}

export function buildNodeData(
  policyType: string,
  policyData: Record<string, unknown>,
): Record<string, unknown> {
  return buildNodeDataForDataNodeType(getDataNodeForPolicy(policyType), policyData);
}

export function groupCrudOperationsByConfig<T extends string>(
  enabledOperations: T[],
  operations: Record<T, CrudOperationPolicyConfig>,
  privilegeMap: Record<T, string>,
): GroupedCrudPrivileges[] {
  const grouped = new Map<string, GroupedCrudPrivileges>();

  for (const operation of enabledOperations) {
    const config = operations[operation];
    const key = `${config.roleName}:${config.isPermissive}`;
    const current = grouped.get(key) ?? {
      roleName: config.roleName,
      isPermissive: config.isPermissive,
      privileges: [],
    };

    current.privileges.push(privilegeMap[operation]);
    grouped.set(key, current);
  }

  return [...grouped.values()];
}
