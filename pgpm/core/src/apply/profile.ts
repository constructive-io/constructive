import { loadConfigSyncFromDir } from '@pgpmjs/env';
import { mergeRoutingProfiles, PgpmRoutingProfile, PgpmWorkspaceConfig } from '@pgpmjs/types';

import { ResolvedApplySpec } from './types';

/**
 * Load the workspace-level routing profile (the `portability` field of the
 * workspace `pgpm.json` / `pgpm.config.js`). Returns `undefined` when the
 * workspace has no config file or no profile.
 */
export function loadWorkspaceRoutingProfile(
  workspacePath: string
): PgpmRoutingProfile | undefined {
  let config: PgpmWorkspaceConfig;
  try {
    config = loadConfigSyncFromDir(workspacePath) as PgpmWorkspaceConfig;
  } catch {
    return undefined;
  }
  return config?.portability;
}

/**
 * Resolve the routing profile effective for one apply spec: defaults →
 * workspace `portability` → the spec's own routing keys, merged per key
 * (inner scope wins; see {@link mergeRoutingProfiles}).
 */
export function resolveEffectiveApplySpec(
  spec: ResolvedApplySpec,
  workspaceProfile?: PgpmRoutingProfile
): ResolvedApplySpec {
  if (!workspaceProfile) return spec;
  const merged = mergeRoutingProfiles(workspaceProfile, {
    schemas: spec.schemas,
    route: spec.route,
    extensions: spec.extensions,
    roles: spec.roles
  });
  return { ...spec, ...merged };
}
