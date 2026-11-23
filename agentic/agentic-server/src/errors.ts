/**
 * A request the gateway rejects before contacting any upstream: an unknown
 * provider pinned by `X-LLM-Provider`, or a body the target dialect cannot
 * express. The router answers it with `400` so a client mistake never reads
 * as a provider outage.
 */
export class BadRequestError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}
