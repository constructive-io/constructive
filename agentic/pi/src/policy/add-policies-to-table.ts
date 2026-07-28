import { getPolicyCategory, type PolicyProvisioningCategory } from '@agentic-kit/harness';

import type { ModulesClient } from '../context';
import {
  buildGrants,
  buildPolicyEntry,
  CRUD_OPERATIONS,
  type CrudOperation,
  type CrudPolicyConfigs,
  groupOperationsByConfig,
  type PolicyEntry,
} from './provision-helpers';

const SUPPORTED_CATEGORIES: ReadonlySet<PolicyProvisioningCategory> = new Set([
  'has-module',
  'no-fields',
  'needs-table',
]);

export interface AddPoliciesToTablePolicyEntry {
  policyType: string;
  dataNodeType?: string;
  nodeData?: Record<string, unknown>;
  sharedPolicyData: Record<string, unknown>;
  operations: CrudPolicyConfigs;
  enabledOperations?: CrudOperation[];
}

export interface AddPoliciesToTableInput {
  client: ModulesClient;
  databaseId: string;
  schemaId: string;
  tableId: string;
  policies: AddPoliciesToTablePolicyEntry[];
}

export class UnsupportedPolicyCategoryError extends Error {
  constructor(
    public readonly policyType: string,
    public readonly category: PolicyProvisioningCategory,
  ) {
    super(
      `Policy type "${policyType}" has category "${category}" which requires column creation or composite handling — use the policies UI instead.`,
    );
    this.name = 'UnsupportedPolicyCategoryError';
  }
}

export async function addPoliciesToExistingTable(
  input: AddPoliciesToTableInput,
): Promise<{ success: true }> {
  const { client } = input;

  for (const entry of input.policies) {
    const category = getPolicyCategory(entry.policyType);
    if (!SUPPORTED_CATEGORIES.has(category)) {
      throw new UnsupportedPolicyCategoryError(entry.policyType, category);
    }
  }

  const policiesArray: PolicyEntry[] = [];
  const nodesByType = new Map<string, { $type: string; data?: Record<string, unknown> }>();

  for (const entry of input.policies) {
    const groups = groupOperationsByConfig(
      entry.enabledOperations ?? CRUD_OPERATIONS,
      entry.operations,
    );

    for (const group of groups) {
      const ops = group.privileges.join('_');
      const rand = Math.random().toString(36).slice(2, 8);
      policiesArray.push(
        buildPolicyEntry(entry.policyType, {
          privileges: group.privileges,
          policy_role: group.roleName,
          permissive: group.isPermissive,
          data: entry.sharedPolicyData,
          policy_name: `${ops}_${rand}`,
        }),
      );
    }

    if (entry.dataNodeType && !nodesByType.has(entry.dataNodeType)) {
      const nodeData = entry.nodeData ?? {};
      nodesByType.set(entry.dataNodeType, {
        $type: entry.dataNodeType,
        ...(Object.keys(nodeData).length > 0 ? { data: nodeData } : {}),
      });
    }
  }

  const provisionInput: Record<string, unknown> = {
    databaseId: input.databaseId,
    schemaId: input.schemaId,
    tableId: input.tableId,
    grants: buildGrants(),
    policies: policiesArray,
  };

  if (nodesByType.size > 0) {
    provisionInput.nodes = [...nodesByType.values()];
  }

  await client.secureTableProvision
    .create({
      data: provisionInput as Parameters<typeof client.secureTableProvision.create>[0]['data'],
      select: { id: true, tableId: true, tableName: true },
    })
    .unwrap();

  return { success: true };
}
