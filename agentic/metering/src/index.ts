/**
 * `@agentic-kit/metering` — harness-neutral metering for an agent run: the
 * Constructive gateway as a resolved model endpoint, the run identity that
 * travels with every call, and the `/v1/usage` report a self-reporting run
 * delivers.
 *
 * No harness SDK is imported here. An adapter registers `MeteredGateway` with
 * its own harness and feeds `toUsageReport()` from its own message events.
 */

export {
  DEFAULT_PROVIDER_NAME,
  GATEWAY_API,
  type MeteredGateway,
  type MeteredGatewayOptions,
  type MeteredModel,
  type MeteredModelCost,
  type MeteredModelSpec,
  normalizeGatewayUrl,
  resolveMeteredGateway,
  resolveMeteredModel
} from './gateway';
export {
  ACTOR_ID_HEADER,
  buildIdentityHeaders,
  DATABASE_ID_HEADER,
  ENTITY_ID_HEADER,
  type MeteredIdentity
} from './identity';
export {
  httpUsageSink,
  type HttpUsageSinkOptions,
  UsageReporter,
  type UsageReporterOptions,
  type UsageSink
} from './reporter';
export {
  type AssistantUsageMessage,
  isAssistantMessage,
  toUsageReport,
  type ToUsageReportOptions,
  type UsageReport
} from './usage-report';
