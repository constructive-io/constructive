import type { GraphileConfig } from 'graphile-config';

const hasOwn = (value: object, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

/** Names owned by the server even when a particular surface is disabled. */
export const CONSTRUCTIVE_PROTECTED_GRAPHILE_PLUGINS = Object.freeze([
  'AuthCookiePlugin',
  'ConstructiveWebSocketOperationAdmissionPlugin',
  'FunctionBindingsPlugin',
  'GrafastCacheLimitsPlugin'
] as const);

const protectedPluginNames = new Set<string>(
  CONSTRUCTIVE_PROTECTED_GRAPHILE_PLUGINS
);

const PROTECTED_SCOPE_FIELDS = Object.freeze({
  grafast: Object.freeze(['context', 'explain']),
  grafserv: Object.freeze([
    'graphqlPath',
    'graphiqlPath',
    'graphiql',
    'graphiqlOnGraphQLGET',
    'websockets',
    'maskError'
  ]),
  schema: Object.freeze(['releaseBuildStateAfterValidation'])
} as const);

export const GRAPHILE_PROTECTED_PRESET_OVERRIDE_CODE =
  'GRAPHILE_PROTECTED_PRESET_OVERRIDE';
export const GRAPHILE_CALLER_PRESET_NOT_TRUSTED_CODE =
  'GRAPHILE_CALLER_PRESET_NOT_TRUSTED';

/**
 * Caller presets are executable server code, not tenant-scoped configuration.
 * This error keeps production deny-by-default unless the deployment explicitly
 * admits that code into the same trust boundary as Constructive itself.
 */
export class GraphileCallerPresetNotTrustedError extends Error {
  readonly code = GRAPHILE_CALLER_PRESET_NOT_TRUSTED_CODE;

  constructor() {
    super(
      'Graphile caller presets are disabled in production unless trustCallerPresetsInProduction is explicitly enabled'
    );
    this.name = 'GraphileCallerPresetNotTrustedError';
  }
}

/**
 * A startup configuration error, never a request error. Values are omitted so
 * connection credentials and plugin configuration cannot leak into logs.
 */
export class GraphileProtectedPresetOverrideError extends Error {
  readonly code = GRAPHILE_PROTECTED_PRESET_OVERRIDE_CODE;

  constructor(
    readonly presetPath: string,
    readonly protectedSetting: string
  ) {
    super(
      `Graphile caller preset '${presetPath}' may not configure protected setting '${protectedSetting}'`
    );
    this.name = 'GraphileProtectedPresetOverrideError';
  }
}

const reject = (path: string, setting: string): never => {
  throw new GraphileProtectedPresetOverrideError(path, setting);
};

const assertScopeDoesNotOverride = (
  preset: Record<string, unknown>,
  path: string,
  scope: keyof typeof PROTECTED_SCOPE_FIELDS
): void => {
  const value = preset[scope];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
  for (const field of PROTECTED_SCOPE_FIELDS[scope]) {
    if (hasOwn(value, field)) reject(path, `${scope}.${field}`);
  }
};

const assertPluginNamesAreNotProtected = (
  value: unknown,
  path: string,
  field: 'plugins' | 'disablePlugins'
): void => {
  if (!Array.isArray(value)) return;
  for (const plugin of value) {
    const name = field === 'plugins'
      ? (plugin as { name?: unknown } | null)?.name
      : plugin;
    if (typeof name === 'string' && protectedPluginNames.has(name)) {
      reject(path, `${field}.${name}`);
    }
  }
};

const assertPresetDoesNotOverrideProtectedSettings = (
  preset: unknown,
  path: string,
  visiting: Set<object>,
  validated: Set<object>
): void => {
  if (typeof preset !== 'object' || preset === null || Array.isArray(preset)) return;
  if (validated.has(preset)) return;
  if (visiting.has(preset)) {
    reject(path, 'extends.circular');
  }

  visiting.add(preset);
  const record = preset as Record<string, unknown>;
  if (hasOwn(record, 'pgServices')) reject(path, 'pgServices');
  assertScopeDoesNotOverride(record, path, 'grafast');
  assertScopeDoesNotOverride(record, path, 'grafserv');
  assertScopeDoesNotOverride(record, path, 'schema');
  assertPluginNamesAreNotProtected(record.plugins, path, 'plugins');
  assertPluginNamesAreNotProtected(record.disablePlugins, path, 'disablePlugins');

  if (Array.isArray(record.extends)) {
    record.extends.forEach((nested, index) => {
      assertPresetDoesNotOverrideProtectedSettings(
        nested,
        `${path}.extends[${index}]`,
        visiting,
        validated
      );
    });
  }
  visiting.delete(preset);
  validated.add(preset);
};

export interface ComposeGraphilePresetInput {
  /** Constructive feature presets applied before trusted caller customization. */
  basePresets: readonly GraphileConfig.Preset[];
  callerExtends?: readonly GraphileConfig.Preset[];
  callerPreset?: Partial<GraphileConfig.Preset>;
  /** Whether caller preset code has been explicitly admitted into the TCB. */
  callerPresetsTrusted: boolean;
  /** Server-owned presets applied after callers, for example cache bounds. */
  protectedPresets?: readonly GraphileConfig.Preset[];
  protectedPlugins: GraphileConfig.Plugin[];
  pgServices: NonNullable<GraphileConfig.Preset['pgServices']>;
  schema: NonNullable<GraphileConfig.Preset['schema']>;
  grafserv: NonNullable<GraphileConfig.Preset['grafserv']>;
  grafast: NonNullable<GraphileConfig.Preset['grafast']>;
}

export interface GraphileCallerPresetInput {
  callerExtends?: readonly GraphileConfig.Preset[];
  callerPreset?: Partial<GraphileConfig.Preset>;
  /** Whether all caller preset code has been admitted into the process TCB. */
  callerPresetsTrusted: boolean;
}

const hasCallerPresetConfiguration = (
  input: GraphileCallerPresetInput
): boolean => {
  if ((input.callerExtends?.length ?? 0) > 0) return true;
  const preset = input.callerPreset;
  if (!preset) return false;
  return Reflect.ownKeys(preset).length > 0;
};

/** Validate eagerly at server construction and again at lazy tenant build. */
export const assertGraphileCallerPresetsSafe = (
  input: GraphileCallerPresetInput
): void => {
  if (!input.callerPresetsTrusted && hasCallerPresetConfiguration(input)) {
    throw new GraphileCallerPresetNotTrustedError();
  }
  const callerExtends = input.callerExtends ?? [];
  const validated = new Set<object>();
  callerExtends.forEach((preset, index) => {
    assertPresetDoesNotOverrideProtectedSettings(
      preset,
      `graphile.extends[${index}]`,
      new Set<object>(),
      validated
    );
  });
  if (input.callerPreset) {
    assertPresetDoesNotOverrideProtectedSettings(
      input.callerPreset,
      'graphile.preset',
      new Set<object>(),
      validated
    );
  }
};

/**
 * Compose trusted caller Graphile configuration inside the server-owned tenant
 * boundary. The root fields are deliberately written by Constructive after all
 * caller presets, so the exact pool, request context, transports, and security
 * plugins cannot be replaced through Graphile's shallow preset merging.
 */
export const composeGraphilePreset = (
  input: ComposeGraphilePresetInput
): GraphileConfig.Preset => {
  const callerExtends = input.callerExtends ?? [];
  assertGraphileCallerPresetsSafe(input);

  return {
    extends: [
      ...input.basePresets,
      ...callerExtends,
      ...(input.callerPreset ? [input.callerPreset] : []),
      ...(input.protectedPresets ?? [])
    ],
    plugins: input.protectedPlugins,
    pgServices: input.pgServices,
    schema: input.schema,
    grafserv: input.grafserv,
    grafast: input.grafast
  };
};
