# @constructive-io/infra-secrets

Secret resolution bridge for Constructive function infrastructure.

Resolves function secrets from `app_secrets` with an org-scoped → global cascade.

## Usage

```typescript
import { resolveSecretsMap } from '@constructive-io/infra-secrets';

// Get a pg client (pool or direct connection)
const secrets = await resolveSecretsMap(client, functionId, databaseId);
// → { SMTP_HOST: '...', SMTP_PASSWORD: '...', FROM_EMAIL: '...' }
```

## Resolution Cascade

1. **Org-scoped**: Looks up secret in `app_secrets` with `namespace = database_id`
2. **Global fallback**: Falls back to `namespace = 'default'`
3. **Strict mode** (default): Throws `SecretResolutionError` if a required secret is missing
4. **Non-strict mode**: Returns `null` for missing secrets

## API

### `resolveSecrets(client, function_id, database_id, secrets_schema?, options?)`

Returns an array of `{ name, value, source }` objects.

### `resolveSecretsMap(client, function_id, database_id, secrets_schema?, options?)`

Returns a flat `Record<string, string>` map (omits missing optional secrets).
