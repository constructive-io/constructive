import type { BlueprintDefinition } from './blueprint-schema';
import { type FieldDefault, type FieldType, toFieldDefault, toFieldType } from './field-type';
import {
  buildNodeData,
  DATA_NODE_GENERATED_FIELDS,
  getPolicyFieldDefaults,
  getPolicyProvisioningConfig,
} from './policy-provisioning';

const DEFAULT_GRANTS = [
  {
    roles: ['authenticated'],
    privileges: [
      ['select', '*'],
      ['insert', '*'],
      ['update', '*'],
      ['delete', '*'],
    ],
  },
];

const ALL_PRIVILEGES = ['select', 'insert', 'update', 'delete'];

export function expandBlueprintDefaults(definition: BlueprintDefinition): Record<string, unknown> {
  const tables = definition.tables.map((table) => {
    let nodes = table.nodes;
    if (!nodes || nodes.length === 0) {
      const derived: Array<string | { $type: string; data?: Record<string, unknown> }> = ['DataId'];
      for (const policy of table.policies) {
        const config = getPolicyProvisioningConfig(policy.$type);
        if (config?.dataNodeType) {
          const defaults = getPolicyFieldDefaults(policy.$type);
          const policyData = { ...defaults, ...((policy.data as Record<string, unknown>) ?? {}) };
          const nodeData = buildNodeData(policy.$type, policyData);
          const entry: { $type: string; data?: Record<string, unknown> } = {
            $type: config.dataNodeType,
          };
          if (Object.keys(nodeData).length > 0) entry.data = nodeData;
          derived.push(entry);
        }
      }
      derived.push('DataTimestamps');
      nodes = derived;
    } else {
      const getType = (n: string | { $type: string }) => (typeof n === 'string' ? n : n.$type);
      const existingTypes = new Set(nodes.map(getType));

      if (!existingTypes.has('DataId')) {
        nodes = ['DataId', ...nodes];
        existingTypes.add('DataId');
      } else if (getType(nodes[0]) !== 'DataId') {
        nodes = ['DataId', ...nodes.filter((n) => getType(n) !== 'DataId')];
      }

      const missing: Array<string | { $type: string; data?: Record<string, unknown> }> = [];
      for (const policy of table.policies) {
        const config = getPolicyProvisioningConfig(policy.$type);
        if (config?.dataNodeType && !existingTypes.has(config.dataNodeType)) {
          const defaults = getPolicyFieldDefaults(policy.$type);
          const policyData = { ...defaults, ...((policy.data as Record<string, unknown>) ?? {}) };
          const nodeData = buildNodeData(policy.$type, policyData);
          const entry: { $type: string; data?: Record<string, unknown> } = {
            $type: config.dataNodeType,
          };
          if (Object.keys(nodeData).length > 0) entry.data = nodeData;
          missing.push(entry);
          existingTypes.add(config.dataNodeType);
        }
      }

      if (!existingTypes.has('DataTimestamps')) {
        nodes = [...nodes, ...missing, 'DataTimestamps'];
      } else if (missing.length > 0) {
        const tsIdx = nodes.findIndex((n) => getType(n) === 'DataTimestamps');
        if (tsIdx >= 0) {
          nodes = [...nodes.slice(0, tsIdx), ...missing, ...nodes.slice(tsIdx)];
        } else {
          nodes = [...nodes, ...missing];
        }
      }
    }

    const policies = table.policies.map((p) => {
      const defaults = getPolicyFieldDefaults(p.$type);
      const data =
        Object.keys(defaults).length > 0
          ? { ...defaults, ...((p.data as Record<string, unknown>) ?? {}) }
          : p.data;
      return {
        ...p,
        ...(data && { data }),
        privileges: p.privileges ?? ALL_PRIVILEGES,
        policy_role: p.policy_role ?? 'authenticated',
        permissive: p.permissive ?? true,
      };
    });

    const autoFields = new Set(['id']);
    for (const node of nodes) {
      const nodeType = typeof node === 'string' ? node : node.$type;
      for (const f of DATA_NODE_GENERATED_FIELDS[nodeType] ?? []) {
        autoFields.add(f.name);
      }
    }
    const fields = table.fields
      ?.filter((f) => !autoFields.has(f.name))
      .map((f) => {
        const out: { name: string; type: FieldType; is_required?: boolean; default?: FieldDefault } =
          { name: f.name, type: toFieldType(f.type) };
        if (f.is_required) out.is_required = true;
        const def = toFieldDefault(f.default);
        if (def !== undefined) out.default = def;
        return out;
      });

    return {
      table_name: table.table_name,
      use_rls: true,
      grants: DEFAULT_GRANTS,
      nodes,
      policies,
      ...(fields && fields.length > 0 && { fields }),
    };
  });

  return {
    tables,
    ...(definition.relations && definition.relations.length > 0 && { relations: definition.relations }),
  };
}
