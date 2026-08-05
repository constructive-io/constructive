import * as dataplanPg from '@dataplan/pg';
import * as graphileBuildPg from 'graphile-build-pg';

export type IntrospectionClientReleaseMode = 'reuse' | 'destroy';

export interface IntrospectionClientReleaseCapabilities {
  dataplanPg: unknown;
  graphileBuildPg: unknown;
}

const REQUIRED_DATAPLAN_PG_RELEASE_CAPABILITY =
  'dataplan-pg-exact-client-destroy-v1';
const REQUIRED_GRAPHILE_BUILD_PG_RELEASE_CAPABILITY =
  'graphile-build-pg-exact-client-destroy-v1';

const runtimeIntrospectionClientReleaseCapabilities = Object.freeze({
  dataplanPg: (dataplanPg as Record<string, unknown>).exactClientReleaseCapability,
  graphileBuildPg:
    (graphileBuildPg as Record<string, unknown>).introspectionClientReleaseCapability
});

/**
 * Dependency patches do not propagate through a published package. Destroy
 * mode is accepted only when both upstream seams advertise the exact protocol
 * this package was tested against.
 */
export function assertIntrospectionClientReleaseCapabilities(
  mode: IntrospectionClientReleaseMode,
  capabilities: IntrospectionClientReleaseCapabilities =
  runtimeIntrospectionClientReleaseCapabilities
): void {
  if (mode === 'reuse') return;

  const missing: string[] = [];
  if (capabilities.dataplanPg !== REQUIRED_DATAPLAN_PG_RELEASE_CAPABILITY) {
    missing.push('@dataplan/pg');
  }
  if (
    capabilities.graphileBuildPg
    !== REQUIRED_GRAPHILE_BUILD_PG_RELEASE_CAPABILITY
  ) {
    missing.push('graphile-build-pg');
  }
  if (missing.length > 0) {
    throw new Error(
      `GRAPHILE_INTROSPECTION_CLIENT_DESTROY_UNSUPPORTED:${missing.join(',')}`
    );
  }
}
