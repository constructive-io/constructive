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
| `usePlatformConfigDefinitionsQuery` | Query | Registry of valid config keys — declares which config entries the platform recognizes |
| `usePlatformConfigDefinitionQuery` | Query | Registry of valid config keys — declares which config entries the platform recognizes |
| `useCreatePlatformConfigDefinitionMutation` | Mutation | Registry of valid config keys — declares which config entries the platform recognizes |
| `useUpdatePlatformConfigDefinitionMutation` | Mutation | Registry of valid config keys — declares which config entries the platform recognizes |
| `useDeletePlatformConfigDefinitionMutation` | Mutation | Registry of valid config keys — declares which config entries the platform recognizes |
| `usePlatformConfigsQuery` | Query | App-level plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `usePlatformConfigQuery` | Query | App-level plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useCreatePlatformConfigMutation` | Mutation | App-level plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useUpdatePlatformConfigMutation` | Mutation | App-level plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `useDeletePlatformConfigMutation` | Mutation | App-level plaintext key-value config store (like a k8s ConfigMap); admin-only, fully CRUD-exposed |
| `usePlatformSecretsDelMutation` | Mutation | platformSecretsDel |
| `useOrgSecretsDelMutation` | Mutation | orgSecretsDel |
| `usePlatformSecretsRemoveArrayMutation` | Mutation | platformSecretsRemoveArray |
| `useOrgSecretsRemoveArrayMutation` | Mutation | orgSecretsRemoveArray |
| `usePlatformSecretsRotateMutation` | Mutation | platformSecretsRotate |
| `usePlatformSecretsSetMutation` | Mutation | platformSecretsSet |
| `useOrgSecretsRotateMutation` | Mutation | orgSecretsRotate |
| `useOrgSecretsSetMutation` | Mutation | orgSecretsSet |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### PlatformConfigDefinition

```typescript
// List all platformConfigDefinitions
const { data, isLoading } = usePlatformConfigDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, defaultValue: true, isBuiltIn: true, labels: true, annotations: true } },
});

// Get one platformConfigDefinition
const { data: item } = usePlatformConfigDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, defaultValue: true, isBuiltIn: true, labels: true, annotations: true } },
});

// Create a platformConfigDefinition
const { mutate: create } = useCreatePlatformConfigDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', description: '<String>', defaultValue: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>' });
```

### PlatformConfig

```typescript
// List all platformConfigs
const { data, isLoading } = usePlatformConfigsQuery({
  selection: { fields: { id: true, namespaceId: true, name: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } },
});

// Get one platformConfig
const { data: item } = usePlatformConfigQuery({
  id: '<UUID>',
  selection: { fields: { id: true, namespaceId: true, name: true, value: true, labels: true, annotations: true, description: true, createdAt: true, updatedAt: true, expiresAt: true } },
});

// Create a platformConfig
const { mutate: create } = useCreatePlatformConfigMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', name: '<String>', value: '<String>', labels: '<JSON>', annotations: '<JSON>', description: '<String>', expiresAt: '<Datetime>' });
```

## Custom Operation Hooks

### `usePlatformSecretsDelMutation`

platformSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsDelInput (required) |

### `useOrgSecretsDelMutation`

orgSecretsDel

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OrgSecretsDelInput (required) |

### `usePlatformSecretsRemoveArrayMutation`

platformSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsRemoveArrayInput (required) |

### `useOrgSecretsRemoveArrayMutation`

orgSecretsRemoveArray

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OrgSecretsRemoveArrayInput (required) |

### `usePlatformSecretsRotateMutation`

platformSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsRotateInput (required) |

### `usePlatformSecretsSetMutation`

platformSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformSecretsSetInput (required) |

### `useOrgSecretsRotateMutation`

orgSecretsRotate

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OrgSecretsRotateInput (required) |

### `useOrgSecretsSetMutation`

orgSecretsSet

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OrgSecretsSetInput (required) |

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
