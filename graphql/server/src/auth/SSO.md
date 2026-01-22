# SSO (Single Sign-On) Configuration Guide

This document explains how to configure and use the SSO functionality in Constructive GraphQL Server, which supports Google, GitHub, Facebook, and LinkedIn OAuth 2.0 authentication.

## Table of Contents

- [Environment Variables](#environment-variables)
- [OAuth Provider Setup](#oauth-provider-setup)
- [Frontend Integration](#frontend-integration)
- [Workflow](#workflow)
- [Database Support](#database-support)

## Environment Variables

### Required Environment Variables

#### Google OAuth

- **`GOOGLE_CLIENT_ID`** (Required)
  - **Purpose**: Google OAuth 2.0 Client ID
  - **How to obtain**: Create an OAuth 2.0 Client ID in [Google Cloud Console](https://console.cloud.google.com/)
  - **Example**: `714839223514-hk5gtbobijoe7lm2fm96pkju8orltveu.apps.googleusercontent.com`

- **`GOOGLE_CLIENT_SECRET`** (Required)
  - **Purpose**: Google OAuth 2.0 Client Secret
  - **How to obtain**: Generated together with Client ID in Google Cloud Console
  - **Security Note**: Keep this secure and never commit it to version control

#### GitHub OAuth

- **`GITHUB_CLIENT_ID`** (Required)
  - **Purpose**: GitHub OAuth App Client ID
  - **How to obtain**: Create an OAuth App in GitHub Settings > Developer settings > OAuth Apps
  - **Example**: `Ov23lieKjyAZoLXZ7GiF`

- **`GITHUB_CLIENT_SECRET`** (Required)
  - **Purpose**: GitHub OAuth App Client Secret
  - **How to obtain**: Generated in GitHub OAuth App settings page
  - **Security Note**: Keep this secure and never commit it to version control

#### Facebook OAuth

- **`FACEBOOK_CLIENT_ID`** (Required)
  - **Purpose**: Facebook App ID
  - **How to obtain**: Create a Facebook App in [Facebook Developers](https://developers.facebook.com/)
  - **Example**: `1234567890123456`

- **`FACEBOOK_CLIENT_SECRET`** (Required)
  - **Purpose**: Facebook App Secret
  - **How to obtain**: Generated in Facebook App Settings > Basic
  - **Security Note**: Keep this secure and never commit it to version control

#### LinkedIn OAuth

- **`LINKEDIN_CLIENT_ID`** (Required)
  - **Purpose**: LinkedIn OAuth 2.0 Client ID
  - **How to obtain**: Create an OAuth 2.0 app in [LinkedIn Developers](https://www.linkedin.com/developers/)
  - **Example**: `86abc123def456`

- **`LINKEDIN_CLIENT_SECRET`** (Required)
  - **Purpose**: LinkedIn OAuth 2.0 Client Secret
  - **How to obtain**: Generated in LinkedIn app settings
  - **Security Note**: Keep this secure and never commit it to version control

### Optional Environment Variables

- **`OAUTH_FRONTEND_CALLBACK_URL`** (Optional)
  - **Purpose**: Frontend callback page URL after successful SSO login
  - **Default**: If not set, uses development default `http://localhost:3001/auth/success`
  - **Priority Order**:
    1. Request parameter `redirect_uri` or `redirect` (highest priority)
    2. Environment variable `OAUTH_FRONTEND_CALLBACK_URL`
    3. Default value `http://localhost:3001/auth/success`
  - **Example**: `https://yourdomain.com/auth/success`

### Environment Variables Example

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Frontend Callback URL (optional)
OAUTH_FRONTEND_CALLBACK_URL=https://yourdomain.com/auth/success
```

## OAuth Provider Setup

### Google OAuth Setup

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing project
3. Enable Google+ API
4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized redirect URIs: `http://your-backend-domain:port/auth/google/callback`
     - Example: `http://localhost:3000/auth/google/callback`
     - Production: `https://api.yourdomain.com/auth/google/callback`
5. Copy Client ID and Client Secret to environment variables

### GitHub OAuth Setup

1. Visit GitHub Settings > [Developer settings](https://github.com/settings/developers) > OAuth Apps
2. Click "New OAuth App"
3. Fill in application information:
   - **Application name**: Your application name
   - **Homepage URL**: Your application homepage URL
   - **Authorization callback URL**: `http://your-backend-domain:port/auth/github/callback`
     - Example: `http://localhost:3000/auth/github/callback`
     - Production: `https://api.yourdomain.com/auth/github/callback`
4. Click "Register application"
5. Copy Client ID, then click "Generate a new client secret" to generate Client Secret
6. Set Client ID and Client Secret in environment variables

### Facebook OAuth Setup

1. Visit [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select an existing app
3. Add "Facebook Login" product to your app
4. Configure Facebook Login:
   - **Valid OAuth Redirect URIs**: `http://your-backend-domain:port/auth/facebook/callback`
     - Example: `http://localhost:3000/auth/facebook/callback`
     - Production: `https://api.yourdomain.com/auth/facebook/callback`
5. Go to Settings > Basic to find your App ID and App Secret
6. Set App ID and App Secret in environment variables as `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET`

### LinkedIn OAuth Setup

1. Visit [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app or select an existing app
3. In the "Auth" tab, configure:
   - **Authorized redirect URLs**: `http://your-backend-domain:port/auth/linkedin/callback`
     - Example: `http://localhost:3000/auth/linkedin/callback`
     - Production: `https://api.yourdomain.com/auth/linkedin/callback`
4. Request access to the following scopes:
   - `r_emailaddress` (to get user's email)
   - `r_liteprofile` (to get basic profile information)
5. Copy Client ID and Client Secret from the "Auth" tab
6. Set Client ID and Client Secret in environment variables as `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`

## Frontend Integration

### 1. Add SSO Login Buttons

Add Google and GitHub login buttons to your login page:

```tsx
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = 'http://api.localhost:3000/auth/google';
  };

  const handleGitHubLogin = () => {
    // Redirect to backend GitHub OAuth endpoint
    window.location.href = 'http://api.localhost:3000/auth/github';
  };

  const handleFacebookLogin = () => {
    // Redirect to backend Facebook OAuth endpoint
    window.location.href = 'http://api.localhost:3000/auth/facebook';
  };

  const handleLinkedInLogin = () => {
    // Redirect to backend LinkedIn OAuth endpoint
    window.location.href = 'http://api.localhost:3000/auth/linkedin';
  };

  return (
    <div>
      <Button onClick={handleGoogleLogin}>
        Continue with Google
      </Button>
      <Button onClick={handleGitHubLogin}>
        Continue with GitHub
      </Button>
      <Button onClick={handleFacebookLogin}>
        Continue with Facebook
      </Button>
      <Button onClick={handleLinkedInLogin}>
        Continue with LinkedIn
      </Button>
    </div>
  );
}
```

### 2. Create SSO Success Callback Page

Create a page to handle the SSO login success callback (e.g., `/auth/success`):

```tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TokenManager } from '@/lib/auth/token-manager';
import { useAppStore, useAuthActions } from '@/store/app-store';
import { getSchemaContext } from '@/app-config';

export function AuthSSOSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const authActions = useAuthActions();

  useEffect(() => {
    // Read data from URL parameter (JSON string)
    const dataParam = searchParams.get('data');
    
    if (!dataParam) {
      router.push('/login');
      return;
    }

    try {
      // Parse JSON data (URL parameter is automatically decoded)
      const data = JSON.parse(dataParam);
      
      const {
        id,
        userId,
        accessToken,
        accessTokenExpiresAt,
        email,
        createdAt,
        provider
      } = data;

      // Validate required fields
      if (!accessToken || !provider || !id || !userId || !email) {
        console.error('Missing required token fields from SSO callback');
        router.push('/login');
        return;
      }

      // Get current context and scope
      const context = getSchemaContext();
      const dashboardScope =
        context === 'dashboard' 
          ? useAppStore.getState().dashboardScope.databaseId ?? undefined 
          : undefined;

      // Construct API Token object
      const apiToken = {
        id,
        userId,
        accessToken,
        accessTokenExpiresAt,
        createdAt: createdAt || new Date().toISOString(),
      };

      // Store Token (default rememberMe: true)
      TokenManager.setToken(apiToken, true, context, dashboardScope);

      // Create user information
      const user = {
        id: userId,
        email: email,
      };

      // Update authentication state
      authActions.setAuthenticated(user, apiToken, true, context, dashboardScope);

      // Redirect to home page or dashboard
      router.push('/');
    } catch (error) {
      console.error('Failed to parse SSO callback data', error);
      router.push('/login');
    }
  }, [searchParams, router, authActions]);

  return <div>Processing login...</div>;
}
```

### 3. Callback Data Format

After successful SSO login, the backend will pass data as a JSON string through the URL parameter `data`:

```json
{
  "id": "token-id",
  "userId": "user-uuid",
  "accessToken": "jwt-token",
  "accessTokenExpiresAt": "2024-01-21T12:00:00Z",
  "email": "user@example.com",
  "createdAt": "2024-01-21T10:00:00Z",
  "provider": "google" // or "github", "facebook", "linkedin"
}
```

## Workflow

### SSO Login Flow

1. **User clicks SSO login button**
   - Frontend redirects to backend OAuth endpoint: `/auth/google`, `/auth/github`, `/auth/facebook`, or `/auth/linkedin`

2. **Backend redirects to OAuth Provider**
   - Backend uses Passport.js to redirect user to OAuth Provider authorization page (Google/GitHub/Facebook/LinkedIn)

3. **User authorization**
   - User completes authorization on OAuth Provider page

4. **OAuth Provider callback**
   - OAuth Provider redirects back to backend callback endpoint: `/auth/google/callback`, `/auth/github/callback`, `/auth/facebook/callback`, or `/auth/linkedin/callback`

5. **Backend processes callback**
   - Backend validates authorization code
   - Retrieves user information (email, name, etc.)
   - Determines corresponding database based on request domain
   - Creates/updates user and connected_account records in the corresponding database
   - Generates API Token

6. **Redirect to frontend**
   - Backend redirects to frontend callback page (`OAUTH_FRONTEND_CALLBACK_URL`)
   - URL parameter contains JSON-formatted token data: `?data={...}`

7. **Frontend processing**
   - Frontend parses JSON data from URL parameter
   - Stores Token to local storage
   - Updates application authentication state
   - Redirects to application home page

## Database Support

### Multi-Database Support

The SSO functionality supports multi-database architecture. The system automatically identifies the corresponding database based on the request domain:

- **Database identification**: Queries `services_public.domains` table by request domain (domain/subdomain) to find the corresponding API and database
- **Schema naming convention**:
  - `constructive` database: 
    - `constructive_user_identifiers_public` (connected_accounts table)
    - `constructive_users_public` (users table)
    - `constructive_auth_private` (api_tokens table)
  - Other databases (e.g., `peptide`):
    - `{dbname}-user-identifiers-public` (connected_accounts table)
    - `{dbname}-users-public` (users table)
    - `{dbname}-auth-private` (api_tokens table)

### Data Storage

SSO login creates/updates records in the following tables:

1. **`connected_accounts` table** (in corresponding user-identifiers schema)
   - Stores OAuth Provider information
   - Fields: `service` (google/github/facebook/linkedin), `identifier` (provider user ID), `owner_id`, `details`, `is_verified`

2. **`users` table** (in corresponding users schema)
   - Creates new user record if user doesn't exist

3. **`emails` table** (in corresponding user-identifiers schema)
   - Stores user email information

4. **`api_tokens` table** (in corresponding auth-private schema)
   - Generates API Token with 30-day expiration

## Troubleshooting

### Common Issues

1. **"Google OAuth not configured" warning**
   - Check if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables are set
   - Ensure environment variables are properly loaded

2. **"GitHub OAuth not configured" warning**
   - Check if `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables are set
   - Ensure environment variables are properly loaded

3. **"Facebook OAuth not configured" warning**
   - Check if `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` environment variables are set
   - Ensure environment variables are properly loaded

4. **"LinkedIn OAuth not configured" warning**
   - Check if `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` environment variables are set
   - Ensure environment variables are properly loaded

5. **"Unable to determine database from request domain" error**
   - Check if domain is correctly configured in `services_public.domains` table
   - Ensure API configuration is correctly associated with database

6. **Redirect failure**
   - Check if `OAUTH_FRONTEND_CALLBACK_URL` environment variable is correctly set
   - Check if OAuth Provider callback URL configuration matches backend endpoint

7. **Frontend unable to parse data**
   - Ensure frontend callback page correctly handles URL parameter `data`
   - Check if JSON parsing is correct

## Security Considerations

1. **Environment Variable Security**
   - Never commit Client Secret to version control
   - Use environment variable management tools (e.g., `.env` file, but don't commit to Git)
   - Use secure key management services in production

2. **HTTPS**
   - Production environment must use HTTPS
   - OAuth Provider callback URLs must use HTTPS

3. **Token Security**
   - API Token expiration is set to 30 days
   - Frontend should securely store Token (consider using httpOnly cookies or secure local storage)

4. **Domain Validation**
   - Ensure OAuth Provider callback URL configuration matches backend actual endpoint
   - Prevent redirect attacks

## Example Configuration

### Development Environment (.env.local)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Frontend Callback
OAUTH_FRONTEND_CALLBACK_URL=http://localhost:3001/auth/success
```

### Production Environment

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-production-github-client-id
GITHUB_CLIENT_SECRET=your-production-github-client-secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your-production-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-production-facebook-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-production-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-production-linkedin-client-secret

# Frontend Callback
OAUTH_FRONTEND_CALLBACK_URL=https://yourdomain.com/auth/success
```

## Related Files

- Backend OAuth Router: `src/auth/oauth.ts`
- Google Provider: `src/auth/providers/google.ts`
- GitHub Provider: `src/auth/providers/github.ts`
- Facebook Provider: `src/auth/providers/facebook.ts`
- LinkedIn Provider: `src/auth/providers/linkedin.ts`
- Common Functions: `src/auth/common.ts`
