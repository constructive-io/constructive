import http from 'node:http';
import { URL } from 'node:url';
import { createLogger } from '@pgpmjs/logger';

const logger = createLogger('invoke-function:dispatcher');

export interface DispatchResult {
  status: 'completed' | 'failed';
  result: Record<string, unknown> | null;
  error: string | null;
}

/**
 * Dispatch the actual function execution via HTTP POST to the
 * function's Knative endpoint. Uses the same routing infrastructure
 * as the job worker (INTERNAL_GATEWAY_DEVELOPMENT_MAP or gateway URL).
 */
export async function dispatchFunction(
  taskIdentifier: string,
  payload: Record<string, unknown>,
  databaseId: string
): Promise<DispatchResult> {
  const devMap = getDevMap();
  const gatewayUrl = process.env.INTERNAL_GATEWAY_URL || 'http://localhost:8080';

  let url: string;
  if (devMap && devMap[taskIdentifier]) {
    url = devMap[taskIdentifier];
  } else {
    const base = gatewayUrl.replace(/\/$/, '');
    url = `${base}/${taskIdentifier}`;
  }

  logger.info('Dispatching function', { taskIdentifier, url, databaseId });

  try {
    const response = await postJson(url, payload, databaseId);
    return {
      status: 'completed',
      result: response,
      error: null
    };
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    logger.error('Function dispatch failed', { taskIdentifier, error: message });
    return {
      status: 'failed',
      result: null,
      error: message
    };
  }
}

function getDevMap(): Record<string, string> | null {
  const raw = process.env.INTERNAL_GATEWAY_DEVELOPMENT_MAP;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function postJson(
  urlStr: string,
  body: Record<string, unknown>,
  databaseId: string
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(urlStr);
    } catch (e) {
      return reject(e);
    }

    const payload = JSON.stringify(body);

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Database-Id': databaseId
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : null);
            } catch {
              resolve({ raw: data });
            }
          } else {
            reject(
              new Error(
                `Function returned ${res.statusCode}: ${data.slice(0, 500)}`
              )
            );
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
