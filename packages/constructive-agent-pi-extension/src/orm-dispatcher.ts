import {
  existsSync,
  lstatSync,
  mkdirSync,
  symlinkSync,
} from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  toSelectObject,
  type OrmCatalogTool,
  type OrmSelectPolicy,
} from './orm-catalog';

interface OrmModule {
  createClient?: (config: {
    endpoint: string;
    headers?: Record<string, string>;
  }) => Record<string, unknown>;
  default?: {
    createClient?: (config: {
      endpoint: string;
      headers?: Record<string, string>;
    }) => Record<string, unknown>;
  };
}

export interface ExecuteOrmDispatcherOptions {
  ormIndexPath: string;
  endpoint: string;
  headers: Record<string, string>;
  tool: OrmCatalogTool;
  args: Record<string, unknown>;
  select?: Record<string, unknown>;
  selectPolicy: OrmSelectPolicy;
  dryRun?: boolean;
}

export interface ExecuteOrmDispatcherResult {
  data: unknown;
  invocation: {
    target: string;
    method: string;
    args: unknown;
    select?: Record<string, unknown>;
  };
}

export type OrmInputValidationMode = 'strict' | 'permissive';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const dynamicImport = async <TModule>(
  specifier: string,
): Promise<TModule> => {
  const loader = Function(
    'modulePath',
    'return import(modulePath);',
  ) as (modulePath: string) => Promise<TModule>;
  return loader(specifier);
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const REQUIRED_ORM_RUNTIME_PACKAGES: Array<string[]> = [
  ['@0no-co', 'graphql.web'],
  ['gql-ast'],
  ['graphql'],
];

const resolveRuntimeNodeModules = (): string | null => {
  const candidates = [
    path.resolve(__dirname, '../node_modules'),
    path.resolve(
      process.cwd(),
      'packages/constructive-agent-pi-extension/node_modules',
    ),
    path.resolve(process.cwd(), 'node_modules'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const ensureOrmRuntimeDependenciesAvailable = (
  runtimeNodeModules: string,
): void => {
  for (const packagePath of REQUIRED_ORM_RUNTIME_PACKAGES) {
    const fullPath = path.join(runtimeNodeModules, ...packagePath);
    if (existsSync(fullPath)) {
      continue;
    }

    throw new Error(
      `Missing ORM runtime dependency: ${packagePath.join('/')}. Run pnpm install and rebuild constructive-agent-pi-extension.`,
    );
  }
};

const ensureGeneratedNodeModulesLink = (ormIndexPath: string): void => {
  const outputRoot = path.resolve(path.dirname(path.dirname(ormIndexPath)));
  const generatedNodeModules = path.join(outputRoot, 'node_modules');
  const runtimeNodeModules = resolveRuntimeNodeModules();

  if (!runtimeNodeModules) {
    throw new Error(
      'Unable to resolve extension runtime node_modules for generated ORM runtime.',
    );
  }

  ensureOrmRuntimeDependenciesAvailable(runtimeNodeModules);

  if (existsSync(generatedNodeModules)) {
    const stats = lstatSync(generatedNodeModules);
    if (stats.isDirectory() || stats.isSymbolicLink()) {
      return;
    }
  }

  mkdirSync(outputRoot, {
    recursive: true,
  });
  symlinkSync(
    runtimeNodeModules,
    generatedNodeModules,
    process.platform === 'win32' ? 'junction' : 'dir',
  );
};

const getMethod = (
  value: Record<string, unknown>,
  key: string,
): ((...args: unknown[]) => unknown) => {
  const method = value[key];
  if (typeof method !== 'function') {
    throw new Error(`Generated ORM client method is missing: ${key}`);
  }

  return method as (...args: unknown[]) => unknown;
};

export const normalizeOrmToolArgs = (
  tool: OrmCatalogTool,
  rawArgs: Record<string, unknown>,
): Record<string, unknown> => {
  const { orm } = tool._meta;
  const args = { ...rawArgs };

  if (orm.argShape === 'modelFindMany') {
    if (!('first' in args) || args.first === undefined) {
      if ('take' in args && args.take !== undefined) {
        args.first = args.take;
      } else if ('limit' in args && args.limit !== undefined) {
        args.first = args.limit;
      }
    }

    if (!('offset' in args) || args.offset === undefined) {
      if ('skip' in args && args.skip !== undefined) {
        args.offset = args.skip;
      }
    }

    delete args.take;
    delete args.limit;
    delete args.skip;
  }

  return args;
};

const getValidationSchema = (
  tool: OrmCatalogTool,
  mode: OrmInputValidationMode,
): Record<string, unknown> => {
  if (!isRecord(tool.inputSchema)) {
    return {};
  }

  if (mode === 'strict') {
    return tool.inputSchema;
  }

  if (tool._meta.orm.argShape !== 'modelCreateFlat') {
    return tool.inputSchema;
  }

  const schema = { ...tool.inputSchema };
  delete schema.required;
  return schema;
};

const readInputSchemaErrors = (
  schema: Record<string, unknown>,
  value: unknown,
  path: string,
): string[] => {
  const schemaType = normalizeString(schema.type);

  if (!schemaType || schemaType === 'object') {
    if (!isRecord(value)) {
      return [`${path} must be an object`];
    }

    const errors: string[] = [];
    const required = Array.isArray(schema.required)
      ? schema.required.filter((entry): entry is string => typeof entry === 'string')
      : [];

    for (const key of required) {
      if (!(key in value) || value[key] === undefined) {
        errors.push(`${path}.${key} is required`);
      }
    }

    const properties = isRecord(schema.properties)
      ? (schema.properties as Record<string, unknown>)
      : {};

    for (const [key, childSchema] of Object.entries(properties)) {
      if (!(key in value) || value[key] === undefined) {
        continue;
      }

      if (!isRecord(childSchema)) {
        continue;
      }

      errors.push(
        ...readInputSchemaErrors(childSchema, value[key], `${path}.${key}`),
      );
    }

    const additionalProperties = schema.additionalProperties;
    if (additionalProperties === false) {
      const allowed = new Set(Object.keys(properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          errors.push(`${path}.${key} is not allowed`);
        }
      }
    }

    return errors;
  }

  if (schemaType === 'array') {
    if (!Array.isArray(value)) {
      return [`${path} must be an array`];
    }

    const itemSchema = isRecord(schema.items)
      ? (schema.items as Record<string, unknown>)
      : null;
    if (!itemSchema) {
      return [];
    }

    const errors: string[] = [];
    for (const [index, entry] of value.entries()) {
      errors.push(
        ...readInputSchemaErrors(itemSchema, entry, `${path}[${index}]`),
      );
    }
    return errors;
  }

  if (schemaType === 'string') {
    return typeof value === 'string' ? [] : [`${path} must be a string`];
  }

  if (schemaType === 'boolean') {
    return typeof value === 'boolean' ? [] : [`${path} must be a boolean`];
  }

  if (schemaType === 'number') {
    return typeof value === 'number' ? [] : [`${path} must be a number`];
  }

  if (schemaType === 'integer') {
    return typeof value === 'number' && Number.isInteger(value)
      ? []
      : [`${path} must be an integer`];
  }

  return [];
};

export const validateOrmToolInput = (
  tool: OrmCatalogTool,
  value: Record<string, unknown>,
  options?: {
    mode?: OrmInputValidationMode;
  },
): string[] => {
  const schema = getValidationSchema(tool, options?.mode || 'permissive');
  if (!isRecord(schema)) {
    return [];
  }

  const normalizedValue = normalizeOrmToolArgs(tool, value);
  return readInputSchemaErrors(schema, normalizedValue, 'args');
};

const resolveSelectObject = (
  options: ExecuteOrmDispatcherOptions,
): Record<string, unknown> | undefined => {
  const { tool } = options;
  const { orm } = tool._meta;

  if (!orm.supportsSelect) {
    return undefined;
  }

  if (isRecord(options.select) && Object.keys(options.select).length > 0) {
    return options.select;
  }

  if (options.selectPolicy === 'require-explicit') {
    throw new Error(
      `Tool ${tool.name} requires select fields. Provide { select: { field: true } } in the dispatcher input.`,
    );
  }

  if (options.selectPolicy === 'auto-full-scalar') {
    const fullScalarSelect = toSelectObject(orm.scalarFields);
    if (fullScalarSelect) {
      return fullScalarSelect;
    }
  }

  const minimalSelect = toSelectObject(orm.defaultSelect);
  if (minimalSelect) {
    return minimalSelect;
  }

  return {
    __typename: true,
  };
};

const ormModuleCache = new Map<string, Promise<OrmModule>>();

type JitiCreate = (
  filename: string,
  options: {
    interopDefault?: boolean;
    debug?: boolean;
  },
) => {
  import: (
    specifier: string,
    options?: {
      default?: boolean;
    },
  ) => Promise<OrmModule>;
};

let jitiCreateFactory: Promise<JitiCreate | null> | null = null;

const loadJitiCreate = async (): Promise<JitiCreate | null> => {
  if (!jitiCreateFactory) {
    jitiCreateFactory = (async () => {
      try {
        const mod = await dynamicImport<{
          createJiti?: JitiCreate;
          default?: {
            createJiti?: JitiCreate;
          };
        }>('jiti');

        return mod.createJiti || mod.default?.createJiti || null;
      } catch {
        return null;
      }
    })();
  }

  return jitiCreateFactory;
};

const loadOrmModule = async (ormIndexPath: string): Promise<OrmModule> => {
  ensureGeneratedNodeModulesLink(ormIndexPath);

  const cacheKey = ormIndexPath;
  const cached = ormModuleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const loadPromise = (async () => {
    const createJiti = await loadJitiCreate();
    if (createJiti) {
      const jiti = createJiti(__filename, {
        interopDefault: true,
        debug: process.env.JITI_DEBUG === '1',
      });

      return jiti.import(ormIndexPath, {
        default: false,
      });
    }

    return dynamicImport<OrmModule>(pathToFileURL(ormIndexPath).href);
  })();

  ormModuleCache.set(cacheKey, loadPromise);
  return loadPromise;
};

const extractDataOrThrow = (
  result: unknown,
  toolName: string,
): unknown => {
  if (!isRecord(result) || typeof result.ok !== 'boolean') {
    return result;
  }

  if (result.ok) {
    return result.data;
  }

  if (!Array.isArray(result.errors)) {
    throw new Error(`ORM execution failed for ${toolName}`);
  }

  const messages = result.errors
    .map((entry) => (isRecord(entry) ? normalizeString(entry.message) : undefined))
    .filter((entry): entry is string => Boolean(entry));

  throw new Error(
    messages.length > 0
      ? messages.join('; ')
      : `ORM execution failed for ${toolName}`,
  );
};

const resolveModelArgs = (
  tool: OrmCatalogTool,
  rawArgs: Record<string, unknown>,
  select: Record<string, unknown> | undefined,
): unknown => {
  const { orm } = tool._meta;
  const args = { ...rawArgs };

  if (orm.argShape === 'modelFindMany') {
    return {
      ...args,
      ...(select ? { select } : {}),
    };
  }

  if (orm.argShape === 'modelFindOne') {
    return {
      ...args,
      ...(select ? { select } : {}),
    };
  }

  if (orm.argShape === 'modelCreateFlat') {
    const nestedData = isRecord(args.data) ? { ...args.data } : {};
    for (const field of orm.editableFields) {
      if (field in args && args[field] !== undefined) {
        nestedData[field] = args[field];
      }
    }

    return {
      data: nestedData,
      ...(select ? { select } : {}),
    };
  }

  if (orm.argShape === 'modelUpdateFlat') {
    if (!orm.pkField || !(orm.pkField in args)) {
      throw new Error(`Missing primary key field ${orm.pkField || 'id'}`);
    }

    const nestedData = isRecord(args.data) ? { ...args.data } : {};
    for (const field of orm.editableFields) {
      if (field in args && args[field] !== undefined) {
        nestedData[field] = args[field];
      }
    }

    return {
      where: {
        [orm.pkField]: args[orm.pkField],
      },
      data: nestedData,
      ...(select ? { select } : {}),
    };
  }

  if (orm.argShape === 'modelDeleteFlat') {
    if (!orm.pkField || !(orm.pkField in args)) {
      throw new Error(`Missing primary key field ${orm.pkField || 'id'}`);
    }

    return {
      where: {
        [orm.pkField]: args[orm.pkField],
      },
      ...(select ? { select } : {}),
    };
  }

  throw new Error(`Unsupported ORM model arg shape: ${orm.argShape}`);
};

export async function executeOrmDispatcherCall(
  options: ExecuteOrmDispatcherOptions,
): Promise<ExecuteOrmDispatcherResult> {
  const module = await loadOrmModule(options.ormIndexPath);
  const createClient = module.createClient || module.default?.createClient;
  if (typeof createClient !== 'function') {
    throw new Error(
      `Generated ORM client at ${options.ormIndexPath} does not export createClient()`,
    );
  }

  const client = createClient({
    endpoint: options.endpoint,
    headers: options.headers,
  }) as Record<string, unknown>;

  const select = resolveSelectObject(options);
  const { orm } = options.tool._meta;
  const normalizedArgs = normalizeOrmToolArgs(options.tool, options.args);

  if (orm.kind === 'model') {
    if (!orm.model) {
      throw new Error(`Missing model metadata for tool ${options.tool.name}`);
    }

    const model = client[orm.model];
    if (!isRecord(model)) {
      throw new Error(`Generated ORM client has no model accessor: db.${orm.model}`);
    }

    const method = getMethod(model, orm.method);
    const mappedArgs = resolveModelArgs(options.tool, normalizedArgs, select);

    if (options.dryRun) {
      return {
        data: {
          dryRun: true,
          tool: options.tool.name,
          target: `db.${orm.model}`,
          method: orm.method,
          args: mappedArgs,
        },
        invocation: {
          target: `db.${orm.model}`,
          method: orm.method,
          args: mappedArgs,
          select,
        },
      };
    }

    const queryBuilder = method.call(model, mappedArgs) as {
      execute?: () => Promise<unknown>;
    };

    if (!queryBuilder || typeof queryBuilder.execute !== 'function') {
      throw new Error(
        `Generated ORM method db.${orm.model}.${orm.method} did not return a query builder`,
      );
    }

    const execution = await queryBuilder.execute();
    return {
      data: extractDataOrThrow(execution, options.tool.name),
      invocation: {
        target: `db.${orm.model}`,
        method: orm.method,
        args: mappedArgs,
        select,
      },
    };
  }

  if (!orm.accessor || !orm.operationName) {
    throw new Error(`Missing custom operation metadata for tool ${options.tool.name}`);
  }

  const accessor = client[orm.accessor];
  if (!isRecord(accessor)) {
    throw new Error(`Generated ORM client has no accessor: db.${orm.accessor}`);
  }

  const operation = getMethod(accessor, orm.operationName);
  const hasArgs = orm.hasArgs;
  const callArgs: unknown[] = [];

  if (hasArgs) {
    callArgs.push(normalizedArgs);
  }

  if (orm.supportsSelect) {
    const operationOptions = {
      select: select || {
        __typename: true,
      },
    };

    if (hasArgs) {
      callArgs.push(operationOptions);
    } else {
      callArgs.push(operationOptions);
    }
  }

  if (options.dryRun) {
    return {
      data: {
        dryRun: true,
        tool: options.tool.name,
        target: `db.${orm.accessor}`,
        method: orm.operationName,
        args: callArgs,
      },
      invocation: {
        target: `db.${orm.accessor}`,
        method: orm.operationName,
        args: callArgs,
        select,
      },
    };
  }

  const queryBuilder = operation.call(accessor, ...callArgs) as {
    execute?: () => Promise<unknown>;
  };

  if (!queryBuilder || typeof queryBuilder.execute !== 'function') {
    throw new Error(
      `Generated ORM method db.${orm.accessor}.${orm.operationName} did not return a query builder`,
    );
  }

  const execution = await queryBuilder.execute();
  return {
    data: extractDataOrThrow(execution, options.tool.name),
    invocation: {
      target: `db.${orm.accessor}`,
      method: orm.operationName,
      args: callArgs,
      select,
    },
  };
}
