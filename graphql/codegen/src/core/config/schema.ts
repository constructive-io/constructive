import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';

import type {
  GraphQLSDKConfigTarget,
  GraphQLSDKMultiConfig,
} from '../../types/config';

export type NormalizedCodegenConfig =
  | { kind: 'single'; target: GraphQLSDKConfigTarget }
  | { kind: 'multi'; targets: GraphQLSDKMultiConfig };

export interface ConfigValidationFailure {
  message: string;
  path: string;
}

const stringArray = {
  type: 'array',
  items: { type: 'string' },
} as const;

const filterSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    include: stringArray,
    exclude: stringArray,
    systemExclude: stringArray,
  },
} as const;

const targetSchema = {
  $id: 'https://constructive.dev/graphql-codegen/target/v1',
  type: 'object',
  additionalProperties: false,
  properties: {
    endpoint: { type: 'string' },
    schemaFile: { type: 'string' },
    schemaDir: { type: 'string' },
    db: {
      type: 'object',
      additionalProperties: false,
      properties: {
        config: { type: 'object', additionalProperties: true },
        pgpm: {
          type: 'object',
          additionalProperties: false,
          properties: {
            modulePath: { type: 'string' },
            workspacePath: { type: 'string' },
            moduleName: { type: 'string' },
          },
        },
        schemas: stringArray,
        apiNames: stringArray,
        keepDb: { type: 'boolean' },
      },
    },
    headers: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    output: { type: 'string' },
    tables: filterSchema,
    queries: filterSchema,
    mutations: filterSchema,
    excludeFields: stringArray,
    hooks: {
      type: 'object',
      additionalProperties: false,
      properties: {
        queries: { type: 'boolean' },
        mutations: { type: 'boolean' },
        queryKeyPrefix: { type: 'string' },
      },
    },
    postgraphile: {
      type: 'object',
      additionalProperties: false,
      properties: { schema: { type: 'string' } },
    },
    codegen: {
      type: 'object',
      additionalProperties: false,
      properties: {
        skipQueryField: { type: 'boolean' },
        comments: { type: 'boolean' },
        condition: { type: 'boolean' },
      },
    },
    orm: { type: 'boolean' },
    reactQuery: { type: 'boolean' },
    cli: {
      anyOf: [
        { type: 'boolean' },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            toolName: { type: 'string' },
            builtinNames: {
              type: 'object',
              additionalProperties: false,
              properties: {
                auth: { type: 'string' },
                context: { type: 'string' },
                config: { type: 'string' },
              },
            },
            entryPoint: { type: 'boolean' },
          },
        },
      ],
    },
    docs: {
      anyOf: [
        { type: 'boolean' },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            readme: { type: 'boolean' },
            agents: { type: 'boolean' },
            skills: { type: 'boolean' },
          },
        },
      ],
    },
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        output: { type: 'string' },
        filename: { type: 'string' },
      },
    },
    skillsPath: { type: 'string' },
    queryKeys: {
      type: 'object',
      additionalProperties: false,
      properties: {
        style: { enum: ['flat', 'hierarchical'] },
        relationships: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: false,
            required: ['parent', 'foreignKey'],
            properties: {
              parent: { type: 'string' },
              foreignKey: { type: 'string' },
              ancestors: stringArray,
            },
          },
        },
        generateScopedKeys: { type: 'boolean' },
        generateCascadeHelpers: { type: 'boolean' },
        generateMutationKeys: { type: 'boolean' },
      },
    },
    watch: {
      type: 'object',
      additionalProperties: false,
      properties: {
        pollInterval: { type: 'number' },
        debounce: { type: 'number' },
        touchFile: { type: 'string' },
        clearScreen: { type: 'boolean' },
      },
    },
    authorization: { type: 'string' },
    verbose: { type: 'boolean' },
    dryRun: { type: 'boolean' },
    skipCustomOperations: { type: 'boolean' },
  },
} as const;

const multiSchema = {
  $id: 'https://constructive.dev/graphql-codegen/targets/v1',
  type: 'object',
  minProperties: 1,
  additionalProperties: { $ref: targetSchema.$id },
} as const;

const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addSchema(targetSchema);
const validateTarget = ajv.getSchema(
  targetSchema.$id
) as ValidateFunction<GraphQLSDKConfigTarget>;
const validateTargets = ajv.compile(
  multiSchema
) as ValidateFunction<GraphQLSDKMultiConfig>;

const targetPropertyNames = new Set(Object.keys(targetSchema.properties));

const pointerSegment = (value: string): string =>
  value.replace(/~/g, '~0').replace(/\//g, '~1');

const issuePath = (error: ErrorObject | undefined): string => {
  if (!error) return '/';
  if (
    error.keyword === 'additionalProperties' &&
    typeof error.params.additionalProperty === 'string'
  ) {
    return `${error.instancePath}/${pointerSegment(error.params.additionalProperty)}`;
  }
  return error.instancePath || '/';
};

const failureFrom = (
  errors: ErrorObject[] | null | undefined
): ConfigValidationFailure => {
  const error = errors?.[0];
  return {
    path: issuePath(error),
    message: error?.message ?? 'must match the codegen configuration schema',
  };
};

export function normalizeCodegenConfig(
  value: unknown
): NormalizedCodegenConfig | ConfigValidationFailure {
  const singleValid = validateTarget(value);
  const singleErrors = validateTarget.errors;
  const multiValid = validateTargets(value);
  const multiErrors = validateTargets.errors;

  if (singleValid && !multiValid) {
    return { kind: 'single', target: value };
  }
  if (multiValid && !singleValid) {
    return { kind: 'multi', targets: value };
  }
  if (singleValid && multiValid) {
    // Some legacy single-target documents such as { headers: {} } are also
    // valid target maps. Preserve their historical meaning. A colliding target
    // with real target fields only validates as multi-target.
    return { kind: 'single', target: value };
  }

  const looksLikeSingleTarget =
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).some((key) => targetPropertyNames.has(key));
  return failureFrom(looksLikeSingleTarget ? singleErrors : multiErrors);
}
