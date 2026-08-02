import { type ConfigLoader, createConfigLoader, type ExplainedValue, type LoadResult } from 'confstash';

import { PRESETS } from './presets';
import { resolveRules } from './resolve';
import type { SafegresConfig } from './types';

export type { ConfigLoader, ExplainedValue, LoadResult };

/**
 * The safegres config loader. Discovers `safegres.config.{ts,js,mjs,cjs}`,
 * `.safegresrc{,.json,.yaml,.yml,.js}`, `safegres.json`, or the `"safegres"`
 * package.json key by walking up from cwd; resolves `extends` against the
 * built-in presets (or files / npm packages).
 */
export function safegresConfigLoader(): ConfigLoader<SafegresConfig> {
  return createConfigLoader<SafegresConfig>({
    tool: 'safegres',
    presets: PRESETS,
    defaults: {},
    validate: (config) => {
      resolveRules(config); // throws ConfigValidationError on bad rules/overrides
    }
  });
}

export interface LoadConfigParams {
  cwd?: string;
  /** Explicit config file (skips discovery). */
  configFile?: string;
  /** Preset applied when no `extends` handling is needed from a file (CLI --preset). */
  preset?: string;
  /** Highest-precedence partial config (parsed CLI flags). */
  overrides?: Partial<SafegresConfig>;
  /**
   * Grade under a built-in preset alone: skip config-file discovery entirely,
   * so nothing in the working tree can move the score. For an evaluation
   * harness, where the configuration is part of what is being tested.
   */
  sealed?: boolean;
}

/** Load and merge the effective safegres config. */
export function loadConfig(params: LoadConfigParams = {}): LoadResult<SafegresConfig> {
  if (params.sealed) return loadSealedConfig(params.preset);

  const loader = safegresConfigLoader();
  const overrides: Partial<SafegresConfig> = { ...(params.overrides ?? {}) };
  if (params.preset) {
    const name = params.preset.includes(':') ? params.preset : `safegres:${params.preset}`;
    if (!(name in PRESETS)) {
      throw new Error(`Unknown preset "${params.preset}". Available: ${Object.keys(PRESETS).join(', ')}`);
    }
    overrides.extends = name;
  }
  // `extends` in overrides isn't expanded by confstash (it only expands file
  // layers), so a CLI --preset is merged in as a layer *below* the file config.
  const result = loader.loadSync({
    cwd: params.cwd,
    configFile: params.configFile,
    overrides: stripExtends(overrides)
  });
  if (params.preset) {
    const presetConfig = PRESETS[overrides.extends as string];
    return { ...result, config: mergePreset(presetConfig, result.config) };
  }
  return result;
}

/**
 * The sealed config: one named preset, expanded, and nothing else. No
 * discovery, no overrides, no `extends` to a local file — so the only thing
 * that can change the score is the database.
 */
function loadSealedConfig(preset = 'recommended'): LoadResult<SafegresConfig> {
  const name = preset.includes(':') ? preset : `safegres:${preset}`;
  if (!(name in PRESETS)) {
    throw new Error(`Unknown preset "${preset}". Available: ${Object.keys(PRESETS).join(', ')}`);
  }
  return { config: expandPreset(PRESETS[name]), layers: [], isEmpty: true };
}

function stripExtends(config: Partial<SafegresConfig>): Partial<SafegresConfig> {
  const { extends: _extends, ...rest } = config;
  return rest;
}

function mergePreset(preset: SafegresConfig, over: SafegresConfig): SafegresConfig {
  const base = expandPreset(preset);
  return {
    ...base,
    ...over,
    rules: { ...(base.rules ?? {}), ...(over.rules ?? {}) },
    scoring: { ...(base.scoring ?? {}), ...(over.scoring ?? {}) },
    failOn: { ...(base.failOn ?? {}), ...(over.failOn ?? {}) },
    overrides: [...(base.overrides ?? []), ...(over.overrides ?? [])],
    // Merged per-key so retuning `skipOwned` doesn't silently drop the
    // preset's `ignore` list. Omitted entirely when neither side sets it.
    ...(base.extensions || over.extensions
      ? { extensions: { ...(base.extensions ?? {}), ...(over.extensions ?? {}) } }
      : {})
  };
}

function expandPreset(preset: SafegresConfig): SafegresConfig {
  if (!preset.extends) return preset;
  const parents = Array.isArray(preset.extends) ? preset.extends : [preset.extends];
  let acc: SafegresConfig = {};
  for (const p of parents) {
    const parent = PRESETS[p];
    if (parent) acc = mergePreset(expandPreset(parent), acc);
  }
  const { extends: _extends, ...rest } = preset;
  return mergePreset(acc, rest);
}
