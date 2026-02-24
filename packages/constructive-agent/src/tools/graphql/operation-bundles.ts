import type { CapabilityTag, ToolRiskClass } from '../../types/tools';

import {
  GraphQLOperationRegistry,
  type GraphQLOperationDefinition,
} from './operation-registry';

export interface GraphQLOperationBundle {
  name: string;
  operations: GraphQLOperationDefinition<any>[];
}

export interface GraphQLOperationTemplate<TArgs = Record<string, unknown>> {
  toolName?: string;
  label?: string;
  description?: string;
  capability?: CapabilityTag;
  riskClass?: ToolRiskClass;
  document: string;
  mapVariables?: (args: TArgs) => Record<string, unknown>;
}

export interface EntityCrudBundleOptions<
  TReadArgs = { id: string },
  TCreateArgs = Record<string, unknown>,
  TUpdateArgs = Record<string, unknown>,
> {
  entityName: string;
  readById: GraphQLOperationTemplate<TReadArgs>;
  create: GraphQLOperationTemplate<TCreateArgs>;
  update: GraphQLOperationTemplate<TUpdateArgs>;
}

const normalizeName = (value: string): string => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
};

const titleCase = (value: string): string => {
  return value
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
};

const buildDefinition = <TArgs>(
  kind: 'read' | 'create' | 'update',
  entityName: string,
  template: GraphQLOperationTemplate<TArgs>,
): GraphQLOperationDefinition<TArgs> => {
  const normalizedEntity = normalizeName(entityName);
  const entityTitle = titleCase(entityName);

  const defaults: Record<'read' | 'create' | 'update', {
    capability: CapabilityTag;
    riskClass: ToolRiskClass;
  }> = {
    read: {
      capability: 'read',
      riskClass: 'read_only',
    },
    create: {
      capability: 'write',
      riskClass: 'low',
    },
    update: {
      capability: 'write',
      riskClass: 'low',
    },
  };

  const actionLabel: Record<'read' | 'create' | 'update', string> = {
    read: 'Get',
    create: 'Create',
    update: 'Update',
  };

  return {
    toolName: template.toolName || `${kind}_${normalizedEntity}`,
    label: template.label || `${actionLabel[kind]} ${entityTitle}`,
    description:
      template.description ||
      `${actionLabel[kind]} ${entityTitle} via allowlisted GraphQL operation.`,
    capability: template.capability || defaults[kind].capability,
    riskClass: template.riskClass || defaults[kind].riskClass,
    document: template.document,
    mapVariables: template.mapVariables,
  };
};

export const createEntityCrudBundle = <
  TReadArgs = { id: string },
  TCreateArgs = Record<string, unknown>,
  TUpdateArgs = Record<string, unknown>,
>(
  options: EntityCrudBundleOptions<TReadArgs, TCreateArgs, TUpdateArgs>,
): GraphQLOperationBundle => {
  return {
    name: `${normalizeName(options.entityName)}_crud`,
    operations: [
      buildDefinition('read', options.entityName, options.readById),
      buildDefinition('create', options.entityName, options.create),
      buildDefinition('update', options.entityName, options.update),
    ],
  };
};

export const registerOperationBundle = (
  registry: GraphQLOperationRegistry,
  bundle: GraphQLOperationBundle,
): void => {
  for (const operation of bundle.operations) {
    registry.register(operation);
  }
};

export const registerEntityCrudBundle = <
  TReadArgs = { id: string },
  TCreateArgs = Record<string, unknown>,
  TUpdateArgs = Record<string, unknown>,
>(
  registry: GraphQLOperationRegistry,
  options: EntityCrudBundleOptions<TReadArgs, TCreateArgs, TUpdateArgs>,
): GraphQLOperationBundle => {
  const bundle = createEntityCrudBundle(options);
  registerOperationBundle(registry, bundle);
  return bundle;
};
