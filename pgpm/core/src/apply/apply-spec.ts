import { existsSync, readFileSync } from 'fs';
import { basename, dirname, join } from 'path';

import { APPLY_SPEC_FILE, ResolvedApplySpec } from './types';

/** Whether a module directory is an apply-spec proxy module. */
export function hasApplySpec(moduleDir: string): boolean {
  return existsSync(join(moduleDir, APPLY_SPEC_FILE));
}

/**
 * Read, validate, and normalize a proxy module's `pgpm.apply.json`.
 *
 * Normalizations: `source` is expanded to its object form and `name` defaults
 * to the proxy directory's name.
 *
 * @throws when the file is missing, unparsable, or structurally invalid.
 */
export function readApplySpec(moduleDir: string): ResolvedApplySpec {
  const specPath = join(moduleDir, APPLY_SPEC_FILE);
  if (!existsSync(specPath)) {
    throw new Error(`No ${APPLY_SPEC_FILE} found in ${moduleDir}`);
  }
  return parseApplySpec(readFileSync(specPath, 'utf-8'), specPath);
}

/** In-memory core of {@link readApplySpec}. */
export function parseApplySpec(content: string, specPath: string): ResolvedApplySpec {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse ${specPath}: ${err instanceof Error ? err.message : err}`);
  }

  const source =
    typeof parsed?.source === 'string' ? { module: parsed.source } : parsed?.source;
  if (!source || typeof source.module !== 'string' || !source.module) {
    throw new Error(
      `${specPath}: "source" (source module name, or { "module": ... }) is required`
    );
  }

  if (
    !parsed.schemas ||
    typeof parsed.schemas !== 'object' ||
    Array.isArray(parsed.schemas) ||
    Object.keys(parsed.schemas).length === 0 ||
    Object.entries(parsed.schemas).some(
      ([from, to]) => typeof from !== 'string' || typeof to !== 'string' || !from || !to
    )
  ) {
    throw new Error(`${specPath}: "schemas" must be a non-empty string → string map`);
  }

  const name = parsed.name ?? basename(dirname(specPath));
  if (typeof name !== 'string' || !name) {
    throw new Error(`${specPath}: "name" must be a non-empty string`);
  }
  if (name === source.module) {
    throw new Error(`${specPath}: apply module "${name}" cannot apply itself`);
  }

  const requires = parsed.requires;
  if (
    requires !== undefined &&
    (!Array.isArray(requires) || requires.some((r: any) => typeof r !== 'string' || !r))
  ) {
    throw new Error(`${specPath}: "requires" must be an array of module names`);
  }
  if (requires?.includes(source.module)) {
    throw new Error(
      `${specPath}: "requires" must not include the source module "${source.module}" — ` +
        `it is source material, not a runtime dependency`
    );
  }

  return { ...parsed, name, source, requires } as ResolvedApplySpec;
}
