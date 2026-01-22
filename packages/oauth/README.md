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

> Minimal OAuth 2.0 client for social authentication

A lightweight OAuth 2.0 client for social authentication with Google, GitHub, Facebook, and LinkedIn. Uses [`@constructive-io/csrf`](../csrf) for secure state management. No external auth library dependencies - uses native fetch for HTTP requests.

## Installation

```bash
pnpm add @constructive-io/oauth
```

## Usage

### Basic Setup

```typescript
import { createOAuthClient } from '@constructive-io/oauth';

const client = createOAuthClient({
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
  baseUrl: 'https://api.example.com',
});

// Generate authorization URL
const { url, state } = client.getAuthorizationUrl({ provider: 'google' });

// After user authorizes, exchange code for profile
const profile = await client.handleCallback({ provider: 'google', code });
```

### Express Middleware

```typescript
import express from 'express';
import cookieParser from 'cookie-parser';
import { createOAuthMiddleware } from '@constructive-io/oauth';

const app = express();
app.use(cookieParser());

const oauth = createOAuthMiddleware({
  providers: {
    google: { clientId: '...', clientSecret: '...' },
    github: { clientId: '...', clientSecret: '...' },
    facebook: { clientId: '...', clientSecret: '...' },
    linkedin: { clientId: '...', clientSecret: '...' },
  },
  baseUrl: 'https://api.example.com',
  onSuccess: async (profile, context) => {
    // Handle successful authentication
    // Create/update user in database, generate session token, etc.
    return { user: profile };
  },
  onError: (error, context) => {
    console.error('OAuth error:', error);
  },
  successRedirect: 'https://app.example.com/dashboard',
  errorRedirect: 'https://app.example.com/login?error=auth_failed',
});

// Mount routes
app.get('/auth/:provider', oauth.initiateAuth);
app.get('/auth/:provider/callback', oauth.handleCallback);
app.get('/auth/providers', oauth.getProviders);
```

## Supported Providers

| Provider | Scopes |
|----------|--------|
| Google | `openid`, `email`, `profile` |
| GitHub | `user:email`, `read:user` |
| Facebook | `email`, `public_profile` |
| LinkedIn | `openid`, `profile`, `email` |

## API

### `createOAuthClient(config)`

Creates an OAuth client instance.

### `createOAuthMiddleware(config)`

Creates Express route handlers for OAuth flows.

### `OAuthProfile`

The normalized user profile returned after authentication:

```typescript
interface OAuthProfile {
  provider: string;      // 'google', 'github', etc.
  providerId: string;    // Provider's unique user ID
  email: string | null;
  name: string | null;
  picture: string | null;
  raw: unknown;          // Original provider response
}
```

## License

MIT
