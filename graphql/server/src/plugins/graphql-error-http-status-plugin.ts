import { httpStatusFor } from '@constructive-io/errors';
import type { BufferResult } from 'grafserv';
import type { GraphileConfig } from 'graphile-config';

interface GraphQLResponse {
  errors?: Array<{ extensions?: { code?: unknown } }>;
}

/**
 * Resolve an HTTP status from a serialized GraphQL execution result.
 *
 * Only explicitly configured, registered codes participate. A 5xx response
 * wins over a 4xx response when one operation returns more than one error.
 */
export const resolveGraphQLErrorHttpStatus = (
  buffer: Buffer,
  configuredCodes: ReadonlySet<string>
): number | undefined => {
  let payload: GraphQLResponse;
  try {
    payload = JSON.parse(buffer.toString('utf8')) as GraphQLResponse;
  } catch {
    return undefined;
  }

  const statuses = (payload.errors ?? [])
    .map(error => error.extensions?.code)
    .filter((code): code is string => typeof code === 'string' && configuredCodes.has(code))
    .map(code => httpStatusFor(code))
    .filter(result => result.mapped)
    .map(result => result.status);

  if (statuses.length === 0) return undefined;
  return statuses.find(status => status >= 500) ?? Math.max(...statuses);
};

/**
 * Opt-in grafserv transport mapping for domain errors with an explicit HTTP
 * contract. Standard GraphQL HTTP 200 behavior is unchanged when not enabled.
 */
export const createGraphQLErrorHttpStatusPlugin = (
  configuredCodes: readonly string[]
): GraphileConfig.Plugin => {
  const allowed = new Set(configuredCodes);

  return {
    name: 'GraphQLErrorHttpStatusPlugin',
    version: '1.0.0',
    grafserv: {
      middleware: {
        processRequest: {
          callback: async next => {
            const result = await next();
            if (!result || result.type !== 'buffer') return result;

            const bufferResult = result as BufferResult;
            const statusCode = resolveGraphQLErrorHttpStatus(bufferResult.buffer, allowed);
            return statusCode === undefined
              ? result
              : { ...bufferResult, statusCode };
          }
        }
      }
    }
  };
};
