# @constructive-io/oauth

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
  <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE">
    <img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/>
  </a>
  <a href="https://www.npmjs.com/package/@constructive-io/oauth">
    <img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Foauth%2Fpackage.json"/>
  </a>
</p>

> Provider-neutral OAuth 2.0 Authorization Code primitives with mandatory S256 PKCE

This package owns reusable provider resolution, authorization URL creation,
token exchange, PKCE, signed-state, redirect validation, and minimal profile
normalization. It deliberately does not own Express routes, tenant lookup,
cookies, sessions, or environment variables; the consuming server supplies
already-resolved, validated runtime configuration.

## Installation

```bash
pnpm add @constructive-io/oauth
```

## Usage

### Authorization and callback

```typescript
import {
  createOAuthClient,
  createSignedState,
  generateCodeVerifier,
} from '@constructive-io/oauth';

const client = createOAuthClient({
  providers: {
    google: {
      clientId: tenantProvider.clientId,
      clientSecret: tenantProvider.clientSecret,
      pkceEnabled: true,
    },
  },
  baseUrl: 'https://api.example.com',
});

const codeVerifier = generateCodeVerifier();
const state = createSignedState(
  { provider: 'google', databaseId, returnPath: '/account' },
  { secret: oauthStateSecret, maxAgeMs: 10 * 60 * 1000 }
);

const { url } = client.getAuthorizationUrl({
  provider: 'google',
  state,
  codeVerifier,
});

// After the caller verifies state and restores the same-flow verifier:
const profile = await client.handleCallback({
  provider: 'google',
  code,
  codeVerifier,
});
```

The caller is responsible for keeping the verifier out of the authorization
URL, binding it to the signed state, clearing transient state after callback,
and issuing a session only after identity persistence succeeds.

### Migration from the legacy Express middleware

The package no longer exports `createOAuthMiddleware` or owns Express routes.
Server applications should use the provider-neutral primitives above and keep
tenant routing, request context, cookies, redirects, identity persistence, and
sessions in their server integration. This is an intentional breaking API
change; do not copy the removed middleware into an application as a fallback.

## Supported Providers

| Provider | Default scopes               |
| -------- | ---------------------------- |
| Google   | `openid`, `email`, `profile` |
| GitHub   | `user:email`, `read:user`    |
| Facebook | `email`, `public_profile`    |
| LinkedIn | `openid`, `profile`, `email` |

The Constructive GraphQL server's initial browser-flow scope enables Google
and GitHub. Other adapters remain protocol primitives and are not implicitly
enabled for a tenant.

## API

### `createOAuthClient(config)`

Creates a client from resolved runtime provider configuration. Authorization
Code exchanges always require a valid PKCE verifier.

### State and redirect primitives

`createSignedState`/`verifySignedState` provide short-lived authenticated
receipts. `resolveSameOriginReturnPath` rejects cross-origin return targets and
normalizes valid targets to relative paths.

### `OAuthProfile`

The normalized user profile returned after authentication:

```typescript
interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string | null;
  emailVerified: boolean | null;
  name: string | null;
  picture: string | null;
}
```

Raw provider responses and tokens are intentionally excluded from the profile.
All failures use registered `@constructive-io/errors` codes; provider response
bodies are not copied into public errors.

## License

MIT
