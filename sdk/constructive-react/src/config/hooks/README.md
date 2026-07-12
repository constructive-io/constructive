# React Query Hooks

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure } from './hooks';

configure({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `usePlatformConfigsQuery` | Query | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `usePlatformConfigQuery` | Query | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useCreatePlatformConfigMutation` | Mutation | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useUpdatePlatformConfigMutation` | Mutation | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useDeletePlatformConfigMutation` | Mutation | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useConfigsQuery` | Query | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useConfigQuery` | Query | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useCreateConfigMutation` | Mutation | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useUpdateConfigMutation` | Mutation | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useDeleteConfigMutation` | Mutation | Namespace-backed plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `usePlatformInternalSecretsQuery` | Query | List all platformInternalSecrets |
| `usePlatformInternalSecretQuery` | Query | Get one platformInternalSecret |
| `useCreatePlatformInternalSecretMutation` | Mutation | Create a platformInternalSecret |
| `useUpdatePlatformInternalSecretMutation` | Mutation | Update a platformInternalSecret |
| `useDeletePlatformInternalSecretMutation` | Mutation | Delete a platformInternalSecret |
| `usePlatformSecretsQuery` | Query | List all platformSecrets |
| `usePlatformSecretQuery` | Query | Get one platformSecret |
| `useCreatePlatformSecretMutation` | Mutation | Create a platformSecret |
| `useUpdatePlatformSecretMutation` | Mutation | Update a platformSecret |
| `useDeletePlatformSecretMutation` | Mutation | Delete a platformSecret |
| `useSecretsQuery` | Query | List all secrets |
| `useSecretQuery` | Query | Get one secret |
| `useCreateSecretMutation` | Mutation | Create a secret |
| `useUpdateSecretMutation` | Mutation | Update a secret |
| `useDeleteSecretMutation` | Mutation | Delete a secret |
| `usePlatformInternalSecretsDelMutation` | Mutation | platformInternalSecretsDel |
| `usePlatformSecretsDelMutation` | Mutation | platformSecretsDel |
| `use_secretsDelMutation` | Mutation | _secretsDel |
| `usePlatformInternalSecretsRemoveArrayMutation` | Mutation | platformInternalSecretsRemoveArray |
| `usePlatformSecretsRemoveArrayMutation` | Mutation | platformSecretsRemoveArray |
| `use_secretsRemoveArrayMutation` | Mutation | _secretsRemoveArray |
| `usePlatformInternalSecretsRotateMutation` | Mutation | platformInternalSecretsRotate |
| `usePlatformInternalSecretsSetMutation` | Mutation | platformInternalSecretsSet |
| `usePlatformSecretsRotateMutation` | Mutation | platformSecretsRotate |
| `use_secretsRotateMutation` | Mutation | _secretsRotate |
| `usePlatformSecretsSetMutation` | Mutation | platformSecretsSet |
| `use_secretsSetMutation` | Mutation | _secretsSet |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### PlatformConfig

```typescript
// List all platformConfigs
const { data, isLoading } = usePlatformConfigsQuery({
  selection: { fields: { id: true, namespaceId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } },
});

// Get one platformConfig
const { data: item } = usePlatformConfigQuery({
  id: '<UUID>',
  selection: { fields: { id: true, namespaceId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } },
});

// Create a platformConfig
const { mutate: create } = useCreatePlatformConfigMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' });
```

### Config

```typescript
// List all configs
const { data, isLoading } = useConfigsQuery({
  selection: { fields: { id: true, namespaceId: true, databaseId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } },
});

// Get one config
const { data: item } = useConfigQuery({
  id: '<UUID>',
  selection: { fields: { id: true, namespaceId: true, databaseId: true, name: true, provider: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } },
});

// Create a config
const { mutate: create } = useCreateConfigMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', databaseId: '<UUID>', name: '<String>', provider: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' });
```

### PlatformInternalSecret

```typescript
// List all platformInternalSecrets
const { data, isLoading } = usePlatformInternalSecretsQuery({
  selection: { fields: { id: true, name: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});

// Get one platformInternalSecret
const { data: item } = usePlatformInternalSecretQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});

// Create a platformInternalSecret
const { mutate: create } = useCreatePlatformInternalSecretMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' });
```

### PlatformSecret

```typescript
// List all platformSecrets
const { data, isLoading } = usePlatformSecretsQuery({
  selection: { fields: { id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});

// Get one platformSecret
const { data: item } = usePlatformSecretQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});

// Create a platformSecret
const { mutate: create } = useCreatePlatformSecretMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' });
```

### Secret

```typescript
// List all secrets
const { data, isLoading } = useSecretsQuery({
  selection: { fields: { databaseId: true, id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});

// Get one secret
const { data: item } = useSecretQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, id: true, name: true, provider: true, namespaceId: true, description: true, labels: true, annotations: true, createdAt: true, updatedAt: true, rotatedAt: true, retiredAt: true } },
});

// Create a secret
const { mutate: create } = useCreateSecretMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', name: '<String>', provider: '<String>', namespaceId: '<UUID>', description: '<String>', labels: '<JSON>', annotations: '<JSON>', rotatedAt: '<Datetime>', retiredAt: '<Datetime>' });
```

## Custom Operation Hooks

### `usePlatformInternalSecretsDelMutation`

platformInternalSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsDelInput (required) |

### `usePlatformSecretsDelMutation`

platformSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsDelInput (required) |

### `use_secretsDelMutation`

_secretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsDelInput (required) |

### `usePlatformInternalSecretsRemoveArrayMutation`

platformInternalSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsRemoveArrayInput (required) |

### `usePlatformSecretsRemoveArrayMutation`

platformSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsRemoveArrayInput (required) |

### `use_secretsRemoveArrayMutation`

_secretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsRemoveArrayInput (required) |

### `usePlatformInternalSecretsRotateMutation`

platformInternalSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsRotateInput (required) |

### `usePlatformInternalSecretsSetMutation`

platformInternalSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInternalSecretsSetInput (required) |

### `usePlatformSecretsRotateMutation`

platformSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsRotateInput (required) |

### `use_secretsRotateMutation`

_secretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsRotateInput (required) |

### `usePlatformSecretsSetMutation`

platformSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsSetInput (required) |

### `use_secretsSetMutation`

_secretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | _SecretsSetInput (required) |

### `useProvisionBucketMutation`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
