import { errors } from '@constructive-io/errors';
import type { GraphileConfig } from 'graphile-config';

type PresetRecord = Record<string, unknown>;

export interface GraphilePresetProtectionPolicy {
  /** Dot-separated preset fields that caller configuration may not own. */
  protectedPaths: readonly string[];
  /** Plugin names that callers may neither register nor disable. */
  protectedPluginNames: readonly string[];
}

export interface GraphileCallerPresetInput {
  callerExtends?: readonly GraphileConfig.Preset[];
  callerPreset?: Partial<GraphileConfig.Preset>;
  /** Whether all caller preset code has been admitted into the process TCB. */
  callerPresetsTrusted: boolean;
}

export interface ComposeGraphilePresetInput extends GraphileCallerPresetInput {
  /** CNC defaults that trusted callers may customize. */
  basePresets: readonly GraphileConfig.Preset[];
  /** CNC-owned presets resolved after caller customization. */
  protectedPresets?: readonly GraphileConfig.Preset[];
  /** CNC-owned root fields that retain final precedence. */
  protectedPreset: GraphileConfig.Preset;
  protection: GraphilePresetProtectionPolicy;
}

const isObjectRecord = (value: unknown): value is PresetRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPlainObjectRecord = (value: unknown): value is PresetRecord => {
  if (!isObjectRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const invalidCallerPreset = (presetPath: string, reason: string): never => {
  throw errors.GRAPHILE_CALLER_PRESET_INVALID({ presetPath, reason });
};

const rejectProtectedOverride = (
  presetPath: string,
  protectedSetting: string
): never => {
  throw errors.GRAPHILE_PROTECTED_PRESET_OVERRIDE({
    presetPath,
    protectedSetting,
  });
};

const readOwnDataProperty = (
  record: PresetRecord,
  field: string,
  presetPath: string
): { present: false } | { present: true; value: unknown } => {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  if (!descriptor) return { present: false };
  if (!('value' in descriptor)) {
    return invalidCallerPreset(
      presetPath,
      `${field} must be declared as a data property`
    );
  }
  return { present: true, value: descriptor.value };
};

/**
 * Accessors and non-object intermediate values count as overrides. They could
 * otherwise hide a protected value from validation and reveal it at resolve
 * time.
 */
const ownsProtectedPath = (
  preset: PresetRecord,
  pathSegments: readonly string[]
): boolean => {
  let current = preset;
  for (let index = 0; index < pathSegments.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(
      current,
      pathSegments[index]
    );
    if (!descriptor) return false;
    if (!('value' in descriptor)) return true;
    if (index === pathSegments.length - 1) return true;
    if (!isObjectRecord(descriptor.value)) return true;
    current = descriptor.value;
  }
  return false;
};

const assertProtectedPathsAreNotOwned = (
  preset: PresetRecord,
  presetPath: string,
  protectedPaths: readonly string[]
): void => {
  for (const protectedSetting of protectedPaths) {
    const pathSegments = protectedSetting.split('.');
    if (ownsProtectedPath(preset, pathSegments)) {
      rejectProtectedOverride(presetPath, protectedSetting);
    }
  }
};

const assertProtectedPluginsAreNotOwned = (
  preset: PresetRecord,
  presetPath: string,
  protectedPluginNames: ReadonlySet<string>
): void => {
  const pluginsProperty = readOwnDataProperty(preset, 'plugins', presetPath);
  if (pluginsProperty.present) {
    const plugins = pluginsProperty.value;
    if (!Array.isArray(plugins)) {
      return invalidCallerPreset(presetPath, 'plugins must be an array');
    }
    plugins.forEach((plugin, index) => {
      const pluginPath = `${presetPath}.plugins[${index}]`;
      if (!isPlainObjectRecord(plugin)) {
        return invalidCallerPreset(pluginPath, 'plugin must be an object');
      }
      const nameProperty = readOwnDataProperty(plugin, 'name', pluginPath);
      const pluginName = nameProperty.present ? nameProperty.value : undefined;
      if (typeof pluginName !== 'string') {
        return invalidCallerPreset(pluginPath, 'plugin name must be a string');
      }
      if (protectedPluginNames.has(pluginName)) {
        rejectProtectedOverride(presetPath, `plugins.${pluginName}`);
      }
    });
  }

  const disabledProperty = readOwnDataProperty(
    preset,
    'disablePlugins',
    presetPath
  );
  if (disabledProperty.present) {
    const disabledPlugins = disabledProperty.value;
    if (!Array.isArray(disabledPlugins)) {
      return invalidCallerPreset(presetPath, 'disablePlugins must be an array');
    }
    disabledPlugins.forEach((pluginName, index) => {
      if (typeof pluginName !== 'string') {
        return invalidCallerPreset(
          `${presetPath}.disablePlugins[${index}]`,
          'disabled plugin name must be a string'
        );
      }
      if (protectedPluginNames.has(pluginName)) {
        rejectProtectedOverride(presetPath, `disablePlugins.${pluginName}`);
      }
    });
  }
};

const assertPresetDoesNotOverrideProtectedSettings = (
  preset: unknown,
  presetPath: string,
  protection: GraphilePresetProtectionPolicy,
  protectedPluginNames: ReadonlySet<string>,
  visiting: Set<object>,
  validated: Set<object>
): void => {
  if (!isPlainObjectRecord(preset)) {
    return invalidCallerPreset(presetPath, 'preset must be a plain object');
  }
  const presetRecord = preset as PresetRecord;
  if (visiting.has(presetRecord)) {
    invalidCallerPreset(presetPath, 'extends must not contain a cycle');
  }
  if (validated.has(presetRecord)) return;

  visiting.add(presetRecord);
  assertProtectedPathsAreNotOwned(
    presetRecord,
    presetPath,
    protection.protectedPaths
  );
  assertProtectedPluginsAreNotOwned(
    presetRecord,
    presetPath,
    protectedPluginNames
  );

  const extendsProperty = readOwnDataProperty(
    presetRecord,
    'extends',
    presetPath
  );
  if (extendsProperty.present) {
    const extendedPresets = extendsProperty.value;
    if (!Array.isArray(extendedPresets)) {
      return invalidCallerPreset(presetPath, 'extends must be an array');
    }
    extendedPresets.forEach((nestedPreset, index) => {
      assertPresetDoesNotOverrideProtectedSettings(
        nestedPreset,
        `${presetPath}.extends[${index}]`,
        protection,
        protectedPluginNames,
        visiting,
        validated
      );
    });
  }

  visiting.delete(presetRecord);
  validated.add(presetRecord);
};

const hasCallerPresetConfiguration = (
  input: GraphileCallerPresetInput
): boolean => {
  if (input.callerExtends !== undefined) {
    if (!Array.isArray(input.callerExtends)) return true;
    if (input.callerExtends.length > 0) return true;
  }
  if (input.callerPreset === undefined) return false;
  if (!isPlainObjectRecord(input.callerPreset)) return true;
  return Reflect.ownKeys(input.callerPreset).length > 0;
};

/** Validate caller code before it enters Graphile's preset resolver. */
export const assertGraphileCallerPresetsSafe = (
  input: GraphileCallerPresetInput,
  protection: GraphilePresetProtectionPolicy
): void => {
  if (!input.callerPresetsTrusted && hasCallerPresetConfiguration(input)) {
    throw errors.GRAPHILE_CALLER_PRESET_NOT_TRUSTED();
  }

  const callerExtends = input.callerExtends ?? [];
  if (!Array.isArray(callerExtends)) {
    invalidCallerPreset('graphile.extends', 'value must be an array');
  }

  const protectedPluginNames = new Set(protection.protectedPluginNames);
  const validated = new Set<object>();
  callerExtends.forEach((preset, index) => {
    assertPresetDoesNotOverrideProtectedSettings(
      preset,
      `graphile.extends[${index}]`,
      protection,
      protectedPluginNames,
      new Set<object>(),
      validated
    );
  });
  if (input.callerPreset !== undefined) {
    assertPresetDoesNotOverrideProtectedSettings(
      input.callerPreset,
      'graphile.preset',
      protection,
      protectedPluginNames,
      new Set<object>(),
      validated
    );
  }
};

/**
 * Compose Graphile configuration in deterministic trust order. CNC-owned root
 * fields are emitted last and therefore keep final precedence.
 */
export const composeGraphilePreset = (
  input: ComposeGraphilePresetInput
): GraphileConfig.Preset => {
  assertGraphileCallerPresetsSafe(input, input.protection);

  const callerExtends = input.callerExtends ?? [];
  const { extends: protectedRootExtends = [], ...protectedRoot } =
    input.protectedPreset;

  return {
    extends: [
      ...input.basePresets,
      ...callerExtends,
      ...(input.callerPreset ? [input.callerPreset] : []),
      ...(input.protectedPresets ?? []),
      ...protectedRootExtends,
    ],
    ...protectedRoot,
  };
};
