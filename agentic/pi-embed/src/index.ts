/**
 * `@agentic-kit/pi-embed` — one embedding of the pi coding agent for both
 * placements. A run's lanes (run log, metering, approvals) are composed from
 * config, so "local" and "cloud" are values, not code paths.
 */

export {
  type ComposedLanes,
  type ComposedRun,
  composeRun,
  type ComposeRunOptions,
  type GateLane,
  type MeteredIdentity,
  type MeteringLane,
  type RunLogLane
} from './lanes';
export {
  type CreateResourceLoader,
  type EmbeddedRun,
  type PiModule,
  type ResourceLoaderRequest,
  startRun,
  type StartRunOptions
} from './session';
