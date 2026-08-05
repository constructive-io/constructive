import { timingSafeEqual } from 'node:crypto';

import type { SecurityGucKey } from '@constructive-io/express-context';
import type { Request } from 'express';

import type { ApiOptions } from '../types';

export const INTERNAL_REQUEST_TOKEN_HEADER = 'X-Constructive-Internal-Token';
export const MIN_INTERNAL_REQUEST_SECRET_BYTES = 32;

const PRIVATE_ROUTING_HEADERS = [
  'X-Api-Name',
  'X-Schemata',
  'X-Meta-Schema',
  'X-Database-Id'
] as const;

const PRIVATE_IDENTITY_HEADERS = [
  'X-Actor-Id',
  'X-Entity-Id',
  'X-Organization-Id'
] as const;

const hasHeader = (req: Request, name: string): boolean =>
  req.get(name) !== undefined;

const hasAnyHeader = (req: Request, names: readonly string[]): boolean =>
  names.some((name) => hasHeader(req, name));

const hasBlankHeader = (req: Request, names: readonly string[]): boolean =>
  names.some((name) => {
    const value = req.get(name);
    return value !== undefined && value.trim().length === 0;
  });

const secretIsWellFormed = (secret: string | undefined): secret is string =>
  typeof secret === 'string'
    && Buffer.byteLength(secret) >= MIN_INTERNAL_REQUEST_SECRET_BYTES;

const secretsEqual = (expected: string, actual: string): boolean => {
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length
    && timingSafeEqual(expectedBytes, actualBytes);
};

const forbidden = (message: string): Error & { code: string } =>
  Object.assign(new Error(message), { code: 'INTERNAL_REQUEST_FORBIDDEN' });

/**
 * Reject a configured internal secret at startup when it cannot provide a
 * meaningful bearer-token boundary. Omitting the secret is allowed, but then
 * every reserved internal header and the HTTP cache flush endpoint fail closed.
 */
export const assertInternalRequestSecret = (opts: ApiOptions): void => {
  const secret = opts.api?.internalRequestSecret;
  if (secret !== undefined && !secretIsWellFormed(secret)) {
    throw new Error(
      `api.internalRequestSecret must contain at least ${MIN_INTERNAL_REQUEST_SECRET_BYTES} bytes`
    );
  }
};

/**
 * Authenticate reserved ingress headers before they can influence routing or
 * database claims. The raw X-Schemata selector is deliberately prohibited: an
 * authenticated proxy must select an authoritative API record by name instead
 * of supplying an unchecked physical schema list.
 */
export const authorizeInternalRequest = (
  opts: ApiOptions,
  req: Request
): void => {
  req.internalTrusted = false;

  const hasRoutingHeaders = hasAnyHeader(req, PRIVATE_ROUTING_HEADERS);
  const hasIdentityHeaders = hasAnyHeader(req, PRIVATE_IDENTITY_HEADERS);
  const presentedSecret = req.get(INTERNAL_REQUEST_TOKEN_HEADER);
  const hasInternalCredential = presentedSecret !== undefined;

  if (!hasRoutingHeaders && !hasIdentityHeaders && !hasInternalCredential) {
    return;
  }

  const configuredSecret = opts.api?.internalRequestSecret;
  if (
    !secretIsWellFormed(configuredSecret)
    || !presentedSecret
    || !secretsEqual(configuredSecret, presentedSecret)
  ) {
    throw forbidden('Reserved internal request headers require authentication.');
  }

  // Internal route and actor selectors have no meaning on the public ingress.
  // The token by itself remains valid there so operators can authenticate the
  // cache-administration endpoint for an already-authoritatively-routed host.
  if ((hasRoutingHeaders || hasIdentityHeaders) && opts.api?.isPublic !== false) {
    throw forbidden('Private routing and identity headers are disabled on the public ingress.');
  }

  if (hasHeader(req, 'X-Schemata')) {
    throw forbidden(
      'X-Schemata is not a production-safe routing contract; use X-Api-Name with X-Database-Id.'
    );
  }

  if (hasBlankHeader(req, [...PRIVATE_ROUTING_HEADERS, ...PRIVATE_IDENTITY_HEADERS])) {
    throw forbidden('Reserved internal request headers must not be empty.');
  }

  const hasApiName = hasHeader(req, 'X-Api-Name');
  const hasMetaSchema = hasHeader(req, 'X-Meta-Schema');
  const hasDatabaseId = hasHeader(req, 'X-Database-Id');
  if (hasApiName && hasMetaSchema) {
    throw forbidden('Private requests must select exactly one API surface.');
  }
  if (hasDatabaseId !== (hasApiName || hasMetaSchema)) {
    throw forbidden(
      'X-Database-Id must be paired with exactly one private API selector.'
    );
  }
  if (hasMetaSchema && opts.api?.allowMetaSchemaHeader !== true) {
    throw forbidden(
      'The privileged metadata API is disabled on this ingress.'
    );
  }

  req.internalTrusted = true;
};

/** Translate authenticated private-ingress identity headers only. */
export const getTrustedInternalClaims = (
  req: Request | undefined
): Partial<Record<SecurityGucKey, string>> => {
  if (
    !req
    || req.api?.isPublic !== false
    || req.internalTrusted !== true
    || req.token?.user_id
  ) {
    return {};
  }

  const actorId = req.get('X-Actor-Id');
  if (!actorId) return {};

  const claims: Partial<Record<SecurityGucKey, string>> = {
    'jwt.claims.user_id': actorId,
    'jwt.claims.principal_id': actorId
  };
  const entityId = req.get('X-Entity-Id');
  const organizationId = req.get('X-Organization-Id');
  if (entityId) claims['jwt.claims.entity_id'] = entityId;
  if (organizationId) claims['jwt.claims.organization_id'] = organizationId;
  return claims;
};
