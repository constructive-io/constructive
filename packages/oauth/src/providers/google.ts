import {
  createLocalJWKSet,
  type JSONWebKeySet,
  jwtVerify
} from 'jose';

import type { ProviderAdapter } from '../adapter';
import {
  createAuthorizationUrl,
  validateProviderCallbackUri
} from '../authorization';
import { validateProviderEndpoint } from '../endpoint';
import { requestProviderJson } from '../http';
import { deriveS256CodeChallenge } from '../primitives';
import {
  type IdentityProviderConfiguration,
  type NormalizedExternalIdentity,
  ProviderAdapterError,
  type ValidatedEndpoint,
  type ValidatedProviderConfiguration
} from '../types';
import {
  compactProfile,
  configurationValue,
  isRecord,
  optionalString,
  safeAvatarUrl,
  safeProfileValue,
  validateCommonConfiguration
} from './common';

const GOOGLE_AUTHORIZATION_ENDPOINTS = [
  'https://accounts.google.com/o/oauth2/v2/auth'
] as const;
const GOOGLE_TOKEN_ENDPOINTS = ['https://oauth2.googleapis.com/token'] as const;
const GOOGLE_ISSUERS = ['https://accounts.google.com'] as const;
const GOOGLE_JWKS_ENDPOINTS = [
  'https://www.googleapis.com/oauth2/v3/certs',
  'https://www.googleapis.com/oauth2/v1/certs'
] as const;

export interface ValidatedGoogleConfiguration
  extends ValidatedProviderConfiguration {
  issuer: string;
  acceptableAudiences: readonly string[];
  jwks?: JSONWebKeySet;
  jwksEndpoint?: ValidatedEndpoint;
}

const validateJwks = (value: Record<string, unknown> | null): JSONWebKeySet | undefined => {
  if (!value) return undefined;
  if (!Array.isArray(value.keys)) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The Google Provider JWKS configuration is invalid.'
    );
  }
  return value as unknown as JSONWebKeySet;
};

const validateGoogleConfiguration = (
  input: IdentityProviderConfiguration
): ValidatedGoogleConfiguration => {
  if (input.skipNonceCheck) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'OIDC nonce verification is required for Google.'
    );
  }
  if (!input.scopes.includes('openid')) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The Google Provider must include the openid scope.'
    );
  }

  const authorizationEndpoint = validateProviderEndpoint(
    configurationValue(input, input.authorizationUrl, 'authorization_endpoint'),
    GOOGLE_AUTHORIZATION_ENDPOINTS
  );
  const tokenEndpoint = validateProviderEndpoint(
    configurationValue(input, input.tokenUrl, 'token_endpoint'),
    GOOGLE_TOKEN_ENDPOINTS
  );
  const issuerEndpoint = validateProviderEndpoint(
    configurationValue(input, input.issuerUrl, 'issuer'),
    GOOGLE_ISSUERS
  );
  const jwks = validateJwks(input.jwks);
  const jwksValue = configurationValue(input, null, 'jwks_uri');
  const jwksEndpoint = jwksValue
    ? validateProviderEndpoint(jwksValue, GOOGLE_JWKS_ENDPOINTS)
    : undefined;
  if (!jwks && !jwksEndpoint) {
    throw new ProviderAdapterError(
      'INVALID_CONFIGURATION',
      'The Google Provider has no configured JWKS source.'
    );
  }

  return {
    ...validateCommonConfiguration(
      input,
      'google',
      authorizationEndpoint,
      tokenEndpoint
    ),
    issuer: issuerEndpoint.replace(/\/$/, ''),
    acceptableAudiences: [input.clientId, ...input.acceptableClientIds],
    jwks,
    jwksEndpoint
  };
};

export const googleAdapter: ProviderAdapter<ValidatedGoogleConfiguration> = {
  kind: 'google',

  validateConfiguration: validateGoogleConfiguration,

  createAuthorizationRequest: input => {
    if (!input.nonce) {
      throw new ProviderAdapterError(
        'INVALID_AUTHORIZATION_INPUT',
        'Google authorization requires an OIDC nonce.'
      );
    }
    return {
      url: createAuthorizationUrl({
        endpoint: input.config.authorizationEndpoint,
        clientId: input.config.clientId,
        redirectUri: input.redirectUri,
        scopes: input.config.scopes,
        state: input.state,
        codeChallenge: input.codeChallenge,
        nonce: input.nonce,
        extraParameters: input.config.extraAuthorizationParams
      })
    };
  },

  completeAuthorization: async input => {
    deriveS256CodeChallenge(input.codeVerifier);
    validateProviderCallbackUri(input.redirectUri);
    if (!input.code || !input.nonce) {
      throw new ProviderAdapterError(
        'INVALID_AUTHORIZATION_INPUT',
        'Google callback verification requires a code and the original nonce.'
      );
    }

    const tokenResponse = await requestProviderJson(
      input.config.tokenEndpoint,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: input.config.clientId,
          client_secret: input.config.clientSecret,
          code: input.code,
          code_verifier: input.codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: input.redirectUri
        }).toString()
      },
      { timeoutMs: input.requestTimeoutMs, fetch: input.fetch }
    );
    if (!isRecord(tokenResponse)) {
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'Google returned an invalid token response.'
      );
    }
    const identityToken = optionalString(tokenResponse, 'id_token');
    if (!identityToken) {
      throw new ProviderAdapterError(
        'INVALID_RESPONSE',
        'Google did not return an identity token.'
      );
    }

    let jwks = input.config.jwks;
    if (!jwks && input.config.jwksEndpoint) {
      const remote = await requestProviderJson(
        input.config.jwksEndpoint,
        { headers: { Accept: 'application/json' } },
        { timeoutMs: input.requestTimeoutMs, fetch: input.fetch }
      );
      if (!isRecord(remote) || !Array.isArray(remote.keys)) {
        throw new ProviderAdapterError(
          'INVALID_RESPONSE',
          'Google returned an invalid JWKS response.'
        );
      }
      jwks = remote as unknown as JSONWebKeySet;
    }

    try {
      const { payload } = await jwtVerify(identityToken, createLocalJWKSet(jwks!), {
        algorithms: ['RS256'],
        audience: [...input.config.acceptableAudiences],
        issuer: input.config.issuer
      });
      if (payload.nonce !== input.nonce || typeof payload.sub !== 'string') {
        throw new ProviderAdapterError(
          'IDENTITY_VERIFICATION_FAILED',
          'Google identity verification failed.'
        );
      }

      return {
        providerKey: input.config.providerKey,
        subject: payload.sub,
        email: safeProfileValue(payload.email),
        profile: compactProfile({
          name: safeProfileValue(payload.name),
          avatarUrl: safeAvatarUrl(payload.picture),
          emailVerified:
            typeof payload.email_verified === 'boolean'
              ? payload.email_verified
              : undefined
        })
      } satisfies NormalizedExternalIdentity;
    } catch (cause) {
      if (cause instanceof ProviderAdapterError) throw cause;
      throw new ProviderAdapterError(
        'IDENTITY_VERIFICATION_FAILED',
        'Google identity verification failed.',
        { cause }
      );
    }
  }
};
