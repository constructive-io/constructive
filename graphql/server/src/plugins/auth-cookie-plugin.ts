import '../middleware/types';

import { Logger } from '@pgpmjs/logger';
import type { Request } from 'express';
import type { BufferResult } from 'grafserv';
import type { GraphileConfig } from 'graphile-config';
import {
  type FragmentDefinitionNode,
  Kind,
  parse,
  type SelectionSetNode
} from 'graphql';

import {
  CookieConfig,
  DEVICE_TOKEN_COOKIE_NAME,
  getDeviceTokenCookieConfig,
  getSessionCookieConfig,
  SESSION_COOKIE_NAME,
} from '../middleware/cookie';

const log = new Logger('auth-cookie');

/**
 * Serialize a cookie to a Set-Cookie header value.
 */
const serializeCookie = (name: string, value: string, config: CookieConfig): string => {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (config.maxAge !== undefined) {
    parts.push(`Max-Age=${config.maxAge}`);
  }
  if (config.domain) {
    parts.push(`Domain=${config.domain}`);
  }
  if (config.path) {
    parts.push(`Path=${config.path}`);
  }
  if (config.secure) {
    parts.push('Secure');
  }
  if (config.httpOnly) {
    parts.push('HttpOnly');
  }
  if (config.sameSite) {
    parts.push(`SameSite=${config.sameSite.charAt(0).toUpperCase() + config.sameSite.slice(1)}`);
  }

  return parts.join('; ');
};

/**
 * Serialize a cookie for clearing (expired).
 */
const serializeClearCookie = (name: string, config: CookieConfig): string => {
  const parts = [`${encodeURIComponent(name)}=`];
  parts.push('Max-Age=0');
  if (config.domain) {
    parts.push(`Domain=${config.domain}`);
  }
  if (config.path) {
    parts.push(`Path=${config.path}`);
  }
  if (config.secure) {
    parts.push('Secure');
  }
  if (config.httpOnly) {
    parts.push('HttpOnly');
  }
  if (config.sameSite) {
    parts.push(`SameSite=${config.sameSite.charAt(0).toUpperCase() + config.sameSite.slice(1)}`);
  }
  return parts.join('; ');
};

/**
 * Auth mutations that should set session cookie on success.
 */
const SIGN_IN_MUTATIONS = new Set([
  'signIn',
  'signUp',
  'signInUnifiedLogin',
  'signUpUnifiedLogin',
  'signInSso',
  'signUpSso',
  'signInMagicLink',
  'signUpMagicLink',
  'signInEmailOtp',
  'signInSmsOtp',
  'signUpSms',
  'completeMfaChallenge',
  'signInOneTimeToken',
  'signInCrossOrigin',
]);

const UNIFIED_AUTH_SIGN_IN_MUTATIONS = new Set([
  'signInUnifiedLogin',
  'signUpUnifiedLogin'
]);

/**
 * Auth mutations that should clear the session cookie.
 */
const SIGN_OUT_MUTATIONS = new Set([
  'signOut',
  'revokeSession',
  'revokeAllSessions',
]);

interface GraphQLRequestBody {
  query?: string;
  operationName?: string;
  variables?: Record<string, unknown>;
}

interface GraphQLResponse {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

export interface MutationField {
  fieldName: string;
  responseKey: string;
}

const collectMutationFields = (
  selectionSet: SelectionSetNode,
  fragments: ReadonlyMap<string, FragmentDefinitionNode>,
  visited: Set<string>
): MutationField[] => {
  const fields: MutationField[] = [];
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      fields.push({
        fieldName: selection.name.value,
        responseKey: selection.alias?.value ?? selection.name.value
      });
      continue;
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      fields.push(...collectMutationFields(selection.selectionSet, fragments, visited));
      continue;
    }
    if (!visited.has(selection.name.value)) {
      const fragment = fragments.get(selection.name.value);
      if (fragment) {
        visited.add(selection.name.value);
        fields.push(...collectMutationFields(fragment.selectionSet, fragments, visited));
      }
    }
  }
  return fields;
};

/** Parse the selected operation and preserve aliases used as response keys. */
export const extractMutationFields = (
  query: string,
  operationName?: string
): MutationField[] => {
  const document = parse(query);
  const operations = document.definitions.filter(
    definition => definition.kind === Kind.OPERATION_DEFINITION
  );
  const operation = operationName
    ? operations.find(definition => definition.name?.value === operationName)
    : operations.length === 1
      ? operations[0]
      : undefined;
  if (!operation || operation.operation !== 'mutation') return [];

  const fragments = new Map(
    document.definitions
      .filter(
        (definition): definition is FragmentDefinitionNode =>
          definition.kind === Kind.FRAGMENT_DEFINITION
      )
      .map(fragment => [fragment.name.value, fragment])
  );
  return collectMutationFields(operation.selectionSet, fragments, new Set());
};

/**
 * Extract access token from mutation response.
 */
const extractAccessToken = (
  data: Record<string, unknown>,
  mutationName: string
): string | undefined => {
  const result = data[mutationName] as Record<string, unknown> | undefined;
  if (!result) return undefined;

  // Check for non-empty string tokens
  if (typeof result.accessToken === 'string' && result.accessToken) return result.accessToken;
  if (typeof result.access_token === 'string' && result.access_token) return result.access_token;

  const nested = result.result as Record<string, unknown> | undefined;
  if (nested) {
    if (typeof nested.accessToken === 'string' && nested.accessToken) return nested.accessToken;
    if (typeof nested.access_token === 'string' && nested.access_token) return nested.access_token;
  }

  return undefined;
};

/**
 * Extract device ID from mutation response.
 */
const extractDeviceId = (
  data: Record<string, unknown>,
  mutationName: string
): string | undefined => {
  const result = data[mutationName] as Record<string, unknown> | undefined;
  if (!result) return undefined;

  if (typeof result.deviceId === 'string') return result.deviceId;
  if (typeof result.device_id === 'string') return result.device_id;

  const nested = result.result as Record<string, unknown> | undefined;
  if (nested) {
    if (typeof nested.deviceId === 'string') return nested.deviceId;
    if (typeof nested.device_id === 'string') return nested.device_id;
  }

  return undefined;
};

/**
 * Check if request includes remember_me flag.
 */
export const hasRememberMe = (variables?: Record<string, unknown>): boolean => {
  if (!variables) return false;
  if (variables.rememberMe === true || variables.remember_me === true) return true;
  const input = variables.input;
  return Boolean(
    input &&
    typeof input === 'object' &&
    !Array.isArray(input) &&
    ((input as Record<string, unknown>).rememberMe === true ||
      (input as Record<string, unknown>).remember_me === true)
  );
};

/**
 * Get Express request from grafserv request context.
 */
const getExpressRequest = (requestContext: Partial<Grafast.RequestContext>): Request | undefined => {
  return (requestContext as { expressv4?: { req?: Request } })?.expressv4?.req;
};

/**
 * AuthCookiePlugin - grafserv middleware plugin that handles auth cookie lifecycle.
 *
 * This plugin intercepts GraphQL responses and:
 * - Sets session cookies on successful sign-in mutations
 * - Clears session cookies on sign-out mutations
 * - Handles device token cookies for trusted device tracking
 */
export const AuthCookiePlugin: GraphileConfig.Plugin = {
  name: 'AuthCookiePlugin',
  version: '1.0.0',
  grafserv: {
    middleware: {
      processRequest: {
        callback: async (next, event) => {
          const result = await next();

          // Only process buffer results (JSON responses)
          if (!result || result.type !== 'buffer') {
            return result;
          }

          const bufferResult = result as BufferResult;
          const req = getExpressRequest(event.requestDigest.requestContext);

          // Skip if no Express request or not a POST
          if (!req || event.requestDigest.method !== 'POST') {
            return result;
          }

          // Get request body for mutation detection
          // grafserv provides getBody() which returns { type: 'buffer', buffer: Buffer }
          let body: GraphQLRequestBody | undefined;
          if (typeof event.requestDigest.getBody === 'function') {
            const rawBody = await event.requestDigest.getBody() as { type?: string; buffer?: Buffer };
            if (rawBody?.type === 'buffer' && rawBody.buffer) {
              const jsonStr = rawBody.buffer.toString('utf8');
              body = JSON.parse(jsonStr) as GraphQLRequestBody;
            }
          }
          body = body || (req.body as GraphQLRequestBody);
          if (!body?.query) {
            return result;
          }

          // Extract mutation names
          const mutationFields = extractMutationFields(body.query, body.operationName);
          if (mutationFields.length === 0) {
            return result;
          }

          // Check for auth mutations
          const signInMutation = mutationFields.find(field =>
            SIGN_IN_MUTATIONS.has(field.fieldName)
          );
          const signOutMutation = mutationFields.find(field =>
            SIGN_OUT_MUTATIONS.has(field.fieldName)
          );

          if (!signInMutation && !signOutMutation) {
            return result;
          }

          log.debug(
            `[auth-cookie] Detected auth mutation: ${
              signInMutation?.fieldName ?? signOutMutation?.fieldName
            }`
          );

          // Parse response body. Failures deliberately propagate; a logging or
          // cookie fallback cannot replace the authentication result semantics.
          const payload = bufferResult.buffer.toString('utf8');
          const graphqlResponse = JSON.parse(payload) as GraphQLResponse;

          // Skip if there are GraphQL errors
          if (graphqlResponse.errors?.length || !graphqlResponse.data) {
            return result;
          }

          const data = graphqlResponse.data;
          const authSettings = req.api?.authSettings;
          const cookiesToSet: string[] = [];

          // Handle sign-out mutations
          if (signOutMutation && data[signOutMutation.responseKey]) {
            log.info('[auth-cookie] Sign-out mutation succeeded, clearing session cookie');
            const config = getSessionCookieConfig(authSettings);
            cookiesToSet.push(serializeClearCookie(SESSION_COOKIE_NAME, config));
            // Also clear device token on sign-out
            const deviceConfig = getDeviceTokenCookieConfig(authSettings);
            cookiesToSet.push(serializeClearCookie(DEVICE_TOKEN_COOKIE_NAME, deviceConfig));
          }

          // Handle sign-in mutations
          if (signInMutation) {
            const accessToken = extractAccessToken(data, signInMutation.responseKey);
            if (accessToken) {
              const rememberMe = hasRememberMe(body.variables);
              const baseConfig = getSessionCookieConfig(authSettings, rememberMe);
              // The Tenant auth-center credential is first party and host only.
              // A Site receives its own credential during handoff redemption.
              const config = UNIFIED_AUTH_SIGN_IN_MUTATIONS.has(signInMutation.fieldName)
                ? {
                  ...baseConfig,
                  domain: undefined,
                  httpOnly: true,
                  secure: true
                }
                : baseConfig;
              log.info(`[auth-cookie] Sign-in mutation succeeded, setting session cookie (rememberMe=${rememberMe})`);
              cookiesToSet.push(serializeCookie(SESSION_COOKIE_NAME, accessToken, config));

              const deviceId = extractDeviceId(data, signInMutation.responseKey);
              if (deviceId) {
                log.info('[auth-cookie] Device ID returned, setting device token cookie');
                const deviceConfig = getDeviceTokenCookieConfig(authSettings);
                cookiesToSet.push(serializeCookie(DEVICE_TOKEN_COOKIE_NAME, deviceId, deviceConfig));
              }
            }
          }

          // Set cookies directly on Express response and return modified headers
          if (cookiesToSet.length > 0) {
            const res = (event.requestDigest.requestContext as { expressv4?: { res?: { setHeader: (name: string, value: string[]) => void; getHeader: (name: string) => string | string[] | undefined } } })?.expressv4?.res;

            if (res?.setHeader) {
              // Get existing Set-Cookie headers from Express response
              const existingCookies = res.getHeader('Set-Cookie');
              const allCookies: string[] = [];

              if (existingCookies) {
                if (Array.isArray(existingCookies)) {
                  allCookies.push(...existingCookies);
                } else {
                  allCookies.push(existingCookies);
                }
              }
              allCookies.push(...cookiesToSet);

              // Set as array to get multiple Set-Cookie headers
              res.setHeader('Set-Cookie', allCookies);
            }

            // Also update the BufferResult headers for grafserv to pass through
            const updatedHeaders = { ...bufferResult.headers };

            // Remove set-cookie from grafserv headers since we set it on Express
            delete updatedHeaders['set-cookie'];

            return {
              ...bufferResult,
              headers: updatedHeaders,
            };
          }

          return result;
        },
      },
    },
  },
};
