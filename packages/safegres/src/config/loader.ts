import { type ConfigLoader, createConfigLoader, type ExplainedValue, type LoadResult } from 'confstash';
import * as path from 'path';

import { PRESETS } from './presets';
import { resolveRules } from './resolve';
import type { OverrideEntry, SafegresConfig } from './types';
import { validateConfigShape } from './validate';

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
      validateConfigShape(config); // unknown keys, wrong value kinds
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

/**
 * Where a configured *path* should resolve from. A repository that splits its
 * config into a shared base and a per-job file has two directories in play,
 * and `ci/baseline.json` written in the base means the base's `ci/`, whichever
 * file inherited it.
 */
export interface ConfigPathBase {
  /** Directory to resolve a value declared at this dotted key against. */
  dirFor(key: string): string;
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
  const result = describeExtendsFailure(() =>
    loader.loadSync({
      cwd: params.cwd,
      configFile: params.configFile,
      overrides: stripExtends(overrides)
    })
  );
  const config = withUnionedOverrides(result);
  if (params.preset) {
    const presetConfig = PRESETS[overrides.extends as string];
    return { ...result, config: mergePreset(presetConfig, config) };
  }
  return { ...result, config };
}

/**
 * A missing `extends` target surfaces from the loader as a bare `ENOENT` on a
 * path nobody typed — the resolved one. Say what it was reached from, and that
 * a name is a preset while a path is a file, which is the actual mistake.
 */
function describeExtendsFailure(load: () => LoadResult<SafegresConfig>): LoadResult<SafegresConfig> {
  try {
    return load();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('ENOENT')) throw error;
    throw new Error(
      `${message}\nsafegres: an "extends" target could not be read. A built-in preset is a name `
        + `(${Object.keys(PRESETS).join(', ')}); anything else is resolved as a path relative to `
        + 'the file that declared it, or as an npm package.'
    );
  }
}

/**
 * `overrides` is a list of scoped exceptions, so inheriting one file from
 * another has to *add* to it. Array-typed keys otherwise replace — a child
 * that narrows `exposure.schemas` means the narrower list — but replacing here
 * would silently drop the base file's exceptions, which is how a shared config
 * turns into two divergent copies. Preset chains have always unioned it; this
 * makes a file chain agree.
 */
function withUnionedOverrides(result: LoadResult<SafegresConfig>): SafegresConfig {
  const seen = new Set<string>();
  const unioned: OverrideEntry[] = [];
  for (const layer of result.layers) {
    for (const override of layer.config.overrides ?? []) {
      const key = JSON.stringify(override);
      if (seen.has(key)) continue;
      seen.add(key);
      unioned.push(override);
    }
  }
  if (unioned.length === 0) return result.config;
  return { ...result.config, overrides: unioned };
}

/**
 * Resolve each configured path against the file that declared it, so an
 * inherited `perf.baseline` keeps pointing at the base file's directory.
 * Values that came from a preset or from CLI overrides have no directory of
 * their own and fall back to the discovered config file, then to `cwd`.
 */
export function configPathBase(
  result: LoadResult<SafegresConfig>,
  cwd: string = process.cwd()
): ConfigPathBase {
  const fallback = result.filepath ? path.dirname(result.filepath) : cwd;
  return {
    dirFor(key: string): string {
      // Highest precedence first: the layer that won the merge is the layer
      // whose directory the value is written relative to.
      for (let i = result.layers.length - 1; i >= 0; i--) {
        const layer = result.layers[i];
        if (valueAt(layer.config, key) === undefined) continue;
        return layer.source === 'file' && layer.origin ? path.dirname(layer.origin) : fallback;
      }
      return fallback;
    }
  };
}

function valueAt(config: Partial<SafegresConfig>, key: string): unknown {
  let node: unknown = config;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
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
