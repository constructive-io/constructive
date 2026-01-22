# @constructive-io/oauth

> Minimal OAuth 2.0 client for social authentication

A lightweight OAuth 2.0 client for social authentication with Google, GitHub, Facebook, and LinkedIn. No external auth library dependencies - uses native fetch for HTTP requests.

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
