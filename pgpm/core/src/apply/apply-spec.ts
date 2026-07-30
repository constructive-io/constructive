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

  const isSchemaMap = (value: unknown): boolean =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value as object).length > 0 &&
    Object.entries(value as object).every(
      ([from, to]) => typeof from === 'string' && typeof to === 'string' && !!from && !!to
    );

  const hasSchemas = parsed.schemas !== undefined;
  if (hasSchemas && !isSchemaMap(parsed.schemas)) {
    throw new Error(`${specPath}: "schemas" must be a non-empty string → string map`);
  }

  const ROUTE_KINDS = ['table', 'view', 'function', 'procedure', 'type'];
  const hasRoute = parsed.route !== undefined;
  if (hasRoute) {
    if (!Array.isArray(parsed.route) || parsed.route.length === 0) {
      throw new Error(`${specPath}: "route" must be a non-empty array of route entries`);
    }
    for (const entry of parsed.route) {
      if (
        !entry ||
        typeof entry !== 'object' ||
        typeof entry.fromSchema !== 'string' ||
        !entry.fromSchema ||
        typeof entry.name !== 'string' ||
        !entry.name ||
        typeof entry.toSchema !== 'string' ||
        !entry.toSchema ||
        !ROUTE_KINDS.includes(entry.kind)
      ) {
        throw new Error(
          `${specPath}: each "route" entry needs { fromSchema, kind (${ROUTE_KINDS.join(
            '|'
          )}), name, toSchema } as non-empty strings`
        );
      }
    }
  }

  const hasReuse = parsed.reuse !== undefined;
  if (hasReuse) {
    const reuse = parsed.reuse;
    if (typeof reuse !== 'object' || reuse === null || Array.isArray(reuse)) {
      throw new Error(`${specPath}: "reuse" must be an object`);
    }
    if (!isSchemaMap(reuse.sharedSchema)) {
      throw new Error(
        `${specPath}: "reuse.sharedSchema" must be a non-empty string → string map`
      );
    }
    if (!Array.isArray(reuse.perTenant) || reuse.perTenant.length === 0) {
      throw new Error(
        `${specPath}: "reuse.perTenant" must be a non-empty array of seed objects`
      );
    }
    for (const seed of reuse.perTenant) {
      if (
        !seed ||
        typeof seed !== 'object' ||
        typeof seed.fromSchema !== 'string' ||
        !seed.fromSchema ||
        typeof seed.name !== 'string' ||
        !seed.name ||
        !ROUTE_KINDS.includes(seed.kind)
      ) {
        throw new Error(
          `${specPath}: each "reuse.perTenant" seed needs { fromSchema, kind (${ROUTE_KINDS.join(
            '|'
          )}), name } as non-empty strings`
        );
      }
    }
    if (reuse.sharedName !== undefined && (typeof reuse.sharedName !== 'string' || !reuse.sharedName)) {
      throw new Error(`${specPath}: "reuse.sharedName" must be a non-empty string`);
    }
    if (!hasSchemas) {
      throw new Error(
        `${specPath}: "reuse" requires "schemas" (the per-tenant source → target schema map)`
      );
    }
    for (const seed of reuse.perTenant) {
      if (!(seed.fromSchema in parsed.schemas)) {
        throw new Error(
          `${specPath}: "reuse.perTenant" seed schema "${seed.fromSchema}" has no per-tenant ` +
            `target in "schemas"`
        );
      }
      if (!(seed.fromSchema in reuse.sharedSchema)) {
        throw new Error(
          `${specPath}: "reuse.perTenant" seed schema "${seed.fromSchema}" has no shared ` +
            `target in "reuse.sharedSchema"`
        );
      }
    }
  }

  if (!hasSchemas && !hasRoute) {
    throw new Error(
      `${specPath}: at least one of "schemas" (string → string map) or "route" (object routes) is required`
    );
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
