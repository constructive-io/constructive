/**
 * Exposure-surface resolution: what is actually reachable, and by whom.
 *
 * A database has more than one way in. The declared API is the one the score
 * is *about* — `resolveExposure` returns it, unchanged, and it stays the
 * headline. `resolvePlanes` returns it alongside every other access path the
 * config declares or an adapter discovers, so a direct connection as some
 * role can be graded too, without moving the number that describes the API.
 */

import type { ExposureConfig, PlaneKind } from '../config/types';
import type { ExposureAdapter, PlaneInput } from '../exposure/adapters';
import { BUILTIN_ADAPTERS, resolveAdapters } from '../exposure/adapters';
import type { QueryExecutor } from './introspect';

export interface ResolvedExposure {
  /** True when a surface was configured or auto-resolved. */
  known: boolean;
  source: string;
  schemas: string[];
  roles?: string[];
}

/** A plane before its reach is computed against the table snapshot. */
export interface ResolvedPlane {
  name: string;
  kind: PlaneKind;
  /** The headline plane: its score is `report.score`. Exactly one is primary. */
  primary: boolean;
  /** Where the plane came from: an adapter name, `config`, or `none`. */
  source: string;
  schemas: string[];
  roles: string[];
}

export const UNKNOWN_EXPOSURE: ResolvedExposure = {
  known: false,
  source: 'none',
  schemas: []
};

/**
 * Resolve the primary exposure surface: the declared API. Adapters run first
 * (static `schemas`/`roles` extend, never replace, what they find), then the
 * static surface, then `UNKNOWN_EXPOSURE`.
 */
export async function resolveExposure(
  exec: QueryExecutor,
  config?: ExposureConfig
): Promise<ResolvedExposure> {
  if (!config) return UNKNOWN_EXPOSURE;

  for (const adapter of adaptersFor(config)) {
    const planes = await runAdapter(exec, adapter);
    if (planes.length === 0) continue;
    const primary = planes.find((p) => p.primary) ?? planes[0];
    return {
      known: true,
      source: adapter.name,
      schemas: union(primary.schemas ?? [], config.schemas),
      roles: union(primary.roles ?? [], config.roles)
    };
  }

  if (config.schemas && config.schemas.length > 0) {
    return {
      known: true,
      source: 'config',
      schemas: [...config.schemas].sort(),
      roles: config.roles
    };
  }

  return UNKNOWN_EXPOSURE;
}

/**
 * Every plane to grade, primary first.
 *
 * The primary plane is the resolved exposure surface — the same set of
 * schemas the score has always been computed against — so adding planes
 * cannot move the headline number. Secondary planes come from adapters (one
 * per API, where a stack has several) and from `exposure.planes`.
 */
export async function resolvePlanes(
  exec: QueryExecutor,
  config: ExposureConfig | undefined,
  primary: ResolvedExposure
): Promise<ResolvedPlane[]> {
  const primaryName = config?.name ?? 'api';
  const planes: ResolvedPlane[] = [
    {
      name: primaryName,
      kind: 'api',
      primary: true,
      source: primary.source,
      schemas: primary.schemas,
      roles: primary.roles ?? []
    }
  ];

  const seen = new Set([primaryName]);
  const push = (input: PlaneInput, source: string): void => {
    if (input.primary || seen.has(input.name)) return;
    seen.add(input.name);
    planes.push({
      name: input.name,
      kind: input.kind ?? defaultKind(input),
      primary: false,
      source,
      schemas: [...(input.schemas ?? [])].sort(),
      roles: [...(input.roles ?? [])].sort()
    });
  };

  if (config && primary.known) {
    for (const adapter of adaptersFor(config)) {
      for (const plane of await runAdapter(exec, adapter)) push(plane, adapter.name);
    }
  }

  const declared = config?.planes ?? [];
  const claimingPrimary = declared.filter((p) => p.primary);
  if (claimingPrimary.length > 1) {
    throw new Error(
      'more than one exposure plane declares `primary: true` '
        + `(${claimingPrimary.map((p) => p.name).join(', ')}) — exactly one plane is the headline score`
    );
  }
  for (const plane of declared) push(plane, 'config');

  // A declared plane may take the headline over from the API surface: a
  // database whose product *is* direct SQL access has no API to grade.
  const override = claimingPrimary[0];
  if (override) {
    planes[0] = {
      name: override.name,
      kind: override.kind ?? defaultKind(override),
      primary: true,
      source: 'config',
      schemas: [...(override.schemas ?? [])].sort(),
      roles: [...(override.roles ?? [])].sort()
    };
  }

  return planes;
}

function defaultKind(plane: PlaneInput): PlaneKind {
  if (plane.kind) return plane.kind;
  return plane.roles && plane.roles.length > 0 && !(plane.schemas && plane.schemas.length > 0)
    ? 'role'
    : 'schema';
}

/** Adapters named by the config, plus the `resolver` alias for the built-in. */
function adaptersFor(config: ExposureConfig): ExposureAdapter[] {
  const adapters = resolveAdapters(config.adapters);
  if (config.resolver && config.resolver !== 'static') {
    const builtin = BUILTIN_ADAPTERS[config.resolver];
    if (builtin && !adapters.some((a) => a.name === builtin.name)) adapters.unshift(builtin);
  }
  return adapters;
}

/** An adapter that isn't present in this database contributes nothing. */
async function runAdapter(exec: QueryExecutor, adapter: ExposureAdapter): Promise<PlaneInput[]> {
  if (!(await adapter.detect(exec))) return [];
  return adapter.resolve(exec);
}

/**
 * Constructive routing-plane introspection.
 *
 * @deprecated Use `constructiveAdapter` from `safegres/adapters`; this wrapper
 * preserves the pre-adapter shape (one union of every API) for callers that
 * still import it.
 */
export async function resolveConstructiveExposure(
  exec: QueryExecutor
): Promise<{ schemas: string[]; roles: string[] } | null> {
  const adapter = BUILTIN_ADAPTERS.constructive;
  if (!(await adapter.detect(exec))) return null;
  const planes = await adapter.resolve(exec);
  const primary = planes.find((p) => p.primary) ?? planes[0];
  if (!primary || (primary.schemas ?? []).length === 0) return null;
  return { schemas: primary.schemas ?? [], roles: primary.roles ?? [] };
}

function union(base: string[], extra?: string[]): string[] {
  if (!extra || extra.length === 0) return base;
  return [...new Set([...base, ...extra])].sort();
}
