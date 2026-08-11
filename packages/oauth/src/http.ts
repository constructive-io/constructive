import {
  ProviderAdapterError,
  type ValidatedEndpoint
} from './types';

const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024;

export interface ProviderJsonRequestOptions {
  timeoutMs: number;
  fetch?: typeof fetch;
  maxResponseBytes?: number;
}

const readBoundedBody = async (
  response: Response,
  maxBytes: number
): Promise<string> => {
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ProviderAdapterError(
      'INVALID_RESPONSE',
      'The Provider response exceeded the allowed size.'
    );
  }

  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'The Provider response exceeded the allowed size.'
      );
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
};

/** Bounded, no-redirect JSON request for already allowlisted endpoints. */
export const requestProviderJson = async (
  endpoint: ValidatedEndpoint,
  init: Omit<RequestInit, 'redirect' | 'signal'>,
  options: ProviderJsonRequestOptions
): Promise<unknown> => {
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The Provider request timeout is invalid.'
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);

  try {
    const response = await (options.fetch ?? fetch)(endpoint, {
      ...init,
      redirect: 'error',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'The Provider returned an unsuccessful response.',
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (
      !contentType.includes('application/json') &&
      !contentType.includes('+json')
    ) {
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'The Provider returned an unsupported response type.'
      );
    }

    const body = await readBoundedBody(
      response,
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES
    );
    try {
      return JSON.parse(body);
    } catch (cause) {
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'The Provider returned invalid JSON.',
        { cause }
      );
    }
  } catch (cause) {
    if (cause instanceof ProviderAdapterError) throw cause;
    throw new ProviderAdapterError(
      timedOut ? 'REQUEST_TIMEOUT' : 'NETWORK_FAILURE',
      timedOut
        ? 'The Provider request timed out.'
        : 'The Provider request failed.',
      { cause }
    );
  } finally {
    clearTimeout(timeout);
  }
};
