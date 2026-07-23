/**
 * SMS provider configuration options for Constructive runtimes.
 *
 * Production providers are intentionally configuration-only here. Runtime
 * packages decide which providers they implement and validate that required
 * provider-specific values are present before sending.
 */
export interface DevSmsOptions {
  /** Base URL for the local DevSms API, e.g. http://localhost:4000 */
  baseUrl?: string;
}

export interface SmsOptions {
  /** SMS provider implementation to use; runtimes may register custom names. */
  provider?: string;
  /** Optional sender ID/default source address for providers that support it. */
  senderId?: string;
  /** Outbound provider HTTP timeout in milliseconds. */
  requestTimeoutMs?: number;
  /** Validate/render messages without sending them to the provider. */
  dryRun?: boolean;
  /** DevSms local provider options. */
  devsms?: DevSmsOptions;
}

/**
 * Honest fallbacks for every environment (12factor-env class 1).
 *
 * These live in the domain-default layer rather than the env parser so config
 * files can override them when the corresponding env variables are absent.
 */
export const smsDefaults: SmsOptions = {
  requestTimeoutMs: 5000,
  dryRun: false,
};
