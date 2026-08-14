/**
 * `@agentic-kit/pi-ext-metered-model` — route a pi session's model calls through
 * the Constructive metered gateway (`agentic-server`), so cloud runs are metered
 * by the gateway rather than trusting the agent's own accounting.
 */

export {
  createMeteredModelExtension,
  type MeteredModelExtension,
  type MeteredModelExtensionOptions
} from './extension';
export { ACTOR_ID_HEADER, buildIdentityHeaders, DATABASE_ID_HEADER, ENTITY_ID_HEADER, type MeteredIdentity } from './identity';
export {
  DEFAULT_PROVIDER_NAME,
  GATEWAY_API,
  meteredModelConfig,
  type MeteredModelSpec,
  meteredProviderConfig,
  type MeteredProviderOptions,
  normalizeGatewayUrl
} from './provider';
