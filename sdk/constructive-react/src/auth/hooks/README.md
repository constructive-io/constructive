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
| `usePrincipalsQuery` | Query | Scoped sub-identities (API keys and agents) with precomputed SPRT |
| `usePrincipalQuery` | Query | Scoped sub-identities (API keys and agents) with precomputed SPRT |
| `useCreatePrincipalMutation` | Mutation | Scoped sub-identities (API keys and agents) with precomputed SPRT |
| `useUpdatePrincipalMutation` | Mutation | Scoped sub-identities (API keys and agents) with precomputed SPRT |
| `useDeletePrincipalMutation` | Mutation | Scoped sub-identities (API keys and agents) with precomputed SPRT |
| `usePrincipalEntitiesQuery` | Query | Association table scoping principals to specific organizations |
| `usePrincipalEntityQuery` | Query | Association table scoping principals to specific organizations |
| `useCreatePrincipalEntityMutation` | Mutation | Association table scoping principals to specific organizations |
| `useUpdatePrincipalEntityMutation` | Mutation | Association table scoping principals to specific organizations |
| `useDeletePrincipalEntityMutation` | Mutation | Association table scoping principals to specific organizations |
| `usePrincipalScopeOverridesQuery` | Query | Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions. |
| `usePrincipalScopeOverrideQuery` | Query | Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions. |
| `useCreatePrincipalScopeOverrideMutation` | Mutation | Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions. |
| `useUpdatePrincipalScopeOverrideMutation` | Mutation | Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions. |
| `useDeletePrincipalScopeOverrideMutation` | Mutation | Per-scope permission overrides for principals. No row = full access; row exists = apply restrictions. |
| `useEmailsQuery` | Query | User email addresses with verification and primary-email management |
| `useEmailQuery` | Query | User email addresses with verification and primary-email management |
| `useCreateEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useUpdateEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useDeleteEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `usePhoneNumbersQuery` | Query | User phone numbers with country code, verification, and primary-number management |
| `usePhoneNumberQuery` | Query | User phone numbers with country code, verification, and primary-number management |
| `useCreatePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useUpdatePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useDeletePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useCryptoAddressesQuery` | Query | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useCryptoAddressQuery` | Query | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useCreateCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useUpdateCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useDeleteCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useWebauthnCredentialsQuery` | Query | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useWebauthnCredentialQuery` | Query | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useCreateWebauthnCredentialMutation` | Mutation | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useUpdateWebauthnCredentialMutation` | Mutation | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useDeleteWebauthnCredentialMutation` | Mutation | WebAuthn/passkey credentials owned by users. One row per registered authenticator (security key, device biometric, synced passkey). Schema mirrors SimpleWebAuthn's canonical Passkey object. |
| `useAuditLogAuthsQuery` | Query | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useAuditLogAuthQuery` | Query | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useCreateAuditLogAuthMutation` | Mutation | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useUpdateAuditLogAuthMutation` | Mutation | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useDeleteAuditLogAuthMutation` | Mutation | Partitioned append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useIdentityProvidersQuery` | Query | List all identityProviders |
| `useCreateIdentityProviderMutation` | Mutation | Create a identityProvider |
| `useRoleTypesQuery` | Query | List all roleTypes |
| `useRoleTypeQuery` | Query | Get one roleType |
| `useCreateRoleTypeMutation` | Mutation | Create a roleType |
| `useUpdateRoleTypeMutation` | Mutation | Update a roleType |
| `useDeleteRoleTypeMutation` | Mutation | Delete a roleType |
| `useUserConnectedAccountsQuery` | Query | List all userConnectedAccounts |
| `useUserConnectedAccountQuery` | Query | Get one userConnectedAccount |
| `useCreateUserConnectedAccountMutation` | Mutation | Create a userConnectedAccount |
| `useUpdateUserConnectedAccountMutation` | Mutation | Update a userConnectedAccount |
| `useDeleteUserConnectedAccountMutation` | Mutation | Delete a userConnectedAccount |
| `useOrgApiKeyListsQuery` | Query | List all orgApiKeyLists |
| `useOrgApiKeyListQuery` | Query | Get one orgApiKeyList |
| `useCreateOrgApiKeyListMutation` | Mutation | Create a orgApiKeyList |
| `useUpdateOrgApiKeyListMutation` | Mutation | Update a orgApiKeyList |
| `useDeleteOrgApiKeyListMutation` | Mutation | Delete a orgApiKeyList |
| `useUsersQuery` | Query | List all users |
| `useUserQuery` | Query | Get one user |
| `useCreateUserMutation` | Mutation | Create a user |
| `useUpdateUserMutation` | Mutation | Update a user |
| `useDeleteUserMutation` | Mutation | Delete a user |
| `useCurrentUserAgentQuery` | Query | currentUserAgent |
| `useCurrentUserIdQuery` | Query | currentUserId |
| `useCurrentIpAddressQuery` | Query | currentIpAddress |
| `useRequireStepUpQuery` | Query | requireStepUp |
| `useCurrentUserQuery` | Query | currentUser |
| `useSignOutMutation` | Mutation | signOut |
| `useSendAccountDeletionEmailMutation` | Mutation | sendAccountDeletionEmail |
| `useCheckPasswordMutation` | Mutation | checkPassword |
| `useDeleteOrgPrincipalMutation` | Mutation | deleteOrgPrincipal |
| `useDeletePrincipalMutation` | Mutation | deletePrincipal |
| `useDisconnectAccountMutation` | Mutation | disconnectAccount |
| `useRevokeApiKeyMutation` | Mutation | revokeApiKey |
| `useRevokeSessionMutation` | Mutation | revokeSession |
| `useVerifyPasswordMutation` | Mutation | verifyPassword |
| `useVerifyTotpMutation` | Mutation | verifyTotp |
| `useConfirmDeleteAccountMutation` | Mutation | confirmDeleteAccount |
| `useRevokeOrgApiKeyMutation` | Mutation | revokeOrgApiKey |
| `useSetPasswordMutation` | Mutation | setPassword |
| `useVerifyEmailMutation` | Mutation | verifyEmail |
| `useProvisionNewUserMutation` | Mutation | provisionNewUser |
| `useResetPasswordMutation` | Mutation | resetPassword |
| `useCreateOrgPrincipalMutation` | Mutation | createOrgPrincipal |
| `useSignInCrossOriginMutation` | Mutation | signInCrossOrigin |
| `useSignInSmsOtpMutation` | Mutation | signInSmsOtp |
| `useSignUpSmsMutation` | Mutation | signUpSms |
| `useSignUpMutation` | Mutation | signUp |
| `useSignInMutation` | Mutation | signIn |
| `useLinkIdentityMutation` | Mutation | linkIdentity |
| `useExtendTokenExpiresMutation` | Mutation | extendTokenExpires |
| `useCreateOrgApiKeyMutation` | Mutation | createOrgApiKey |
| `useCreateApiKeyMutation` | Mutation | createApiKey |
| `useRequestCrossOriginTokenMutation` | Mutation | requestCrossOriginToken |
| `useForgotPasswordMutation` | Mutation | forgotPassword |
| `useSendVerificationEmailMutation` | Mutation | sendVerificationEmail |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### Principal

```typescript
// List all principals
const { data, isLoading } = usePrincipalsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, userId: true, name: true, useAdminOwner: true, isReadOnly: true, bypassStepUp: true } },
});

// Get one principal
const { data: item } = usePrincipalQuery({
  principalId: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, ownerId: true, userId: true, name: true, useAdminOwner: true, isReadOnly: true, bypassStepUp: true } },
});

// Create a principal
const { mutate: create } = useCreatePrincipalMutation({
  selection: { fields: { principalId: true } },
});
create({ id: '<UUID>', ownerId: '<UUID>', userId: '<UUID>', name: '<String>', useAdminOwner: '<Boolean>', isReadOnly: '<Boolean>', bypassStepUp: '<Boolean>' });
```

### PrincipalEntity

```typescript
// List all principalEntities
const { data, isLoading } = usePrincipalEntitiesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, entityId: true, ownerId: true } },
});

// Get one principalEntity
const { data: item } = usePrincipalEntityQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, entityId: true, ownerId: true } },
});

// Create a principalEntity
const { mutate: create } = useCreatePrincipalEntityMutation({
  selection: { fields: { id: true } },
});
create({ principalId: '<UUID>', entityId: '<UUID>', ownerId: '<UUID>' });
```

### PrincipalScopeOverride

```typescript
// List all principalScopeOverrides
const { data, isLoading } = usePrincipalScopeOverridesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, membershipType: true, allowedMask: true, useAdminOwner: true, isActive: true, isReadOnly: true } },
});

// Get one principalScopeOverride
const { data: item } = usePrincipalScopeOverrideQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, principalId: true, membershipType: true, allowedMask: true, useAdminOwner: true, isActive: true, isReadOnly: true } },
});

// Create a principalScopeOverride
const { mutate: create } = useCreatePrincipalScopeOverrideMutation({
  selection: { fields: { id: true } },
});
create({ principalId: '<UUID>', membershipType: '<Int>', allowedMask: '<BitString>', useAdminOwner: '<Boolean>', isActive: '<Boolean>', isReadOnly: '<Boolean>' });
```

### Email

```typescript
// List all emails
const { data, isLoading } = useEmailsQuery({
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Get one email
const { data: item } = useEmailQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Create a email
const { mutate: create } = useCreateEmailMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', email: '<Email>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' });
```

### PhoneNumber

```typescript
// List all phoneNumbers
const { data, isLoading } = usePhoneNumbersQuery({
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Get one phoneNumber
const { data: item } = usePhoneNumberQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Create a phoneNumber
const { mutate: create } = useCreatePhoneNumberMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', cc: '<String>', number: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' });
```

### CryptoAddress

```typescript
// List all cryptoAddresses
const { data, isLoading } = useCryptoAddressesQuery({
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Get one cryptoAddress
const { data: item } = useCryptoAddressQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, name: true, createdAt: true, updatedAt: true } },
});

// Create a cryptoAddress
const { mutate: create } = useCreateCryptoAddressMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', address: '<String>', isVerified: '<Boolean>', isPrimary: '<Boolean>', name: '<String>' });
```

### WebauthnCredential

```typescript
// List all webauthnCredentials
const { data, isLoading } = useWebauthnCredentialsQuery({
  selection: { fields: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } },
});

// Get one webauthnCredential
const { data: item } = useWebauthnCredentialQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, credentialId: true, publicKey: true, signCount: true, webauthnUserId: true, transports: true, credentialDeviceType: true, backupEligible: true, backupState: true, name: true, lastUsedAt: true, createdAt: true, updatedAt: true } },
});

// Create a webauthnCredential
const { mutate: create } = useCreateWebauthnCredentialMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', credentialId: '<String>', publicKey: '<Base64EncodedBinary>', signCount: '<BigInt>', webauthnUserId: '<String>', transports: '<String>', credentialDeviceType: '<String>', backupEligible: '<Boolean>', backupState: '<Boolean>', name: '<String>', lastUsedAt: '<Datetime>' });
```

### AuditLogAuth

```typescript
// List all auditLogAuths
const { data, isLoading } = useAuditLogAuthsQuery({
  selection: { fields: { createdAt: true, id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true } },
});

// Get one auditLogAuth
const { data: item } = useAuditLogAuthQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true } },
});

// Create a auditLogAuth
const { mutate: create } = useCreateAuditLogAuthMutation({
  selection: { fields: { id: true } },
});
create({ event: '<String>', actorId: '<UUID>', origin: '<Origin>', userAgent: '<String>', ipAddress: '<InternetAddress>', success: '<Boolean>' });
```

### IdentityProvider

```typescript
// List all identityProviders
const { data, isLoading } = useIdentityProvidersQuery({
  selection: { fields: { slug: true, kind: true, displayName: true, enabled: true, isBuiltIn: true } },
});

// Create a identityProvider
const { mutate: create } = useCreateIdentityProviderMutation({
  selection: { fields: { id: true } },
});
create({ slug: '<String>', kind: '<String>', displayName: '<String>', enabled: '<Boolean>', isBuiltIn: '<Boolean>' });
```

### RoleType

```typescript
// List all roleTypes
const { data, isLoading } = useRoleTypesQuery({
  selection: { fields: { id: true, name: true } },
});

// Get one roleType
const { data: item } = useRoleTypeQuery({
  id: '<Int>',
  selection: { fields: { id: true, name: true } },
});

// Create a roleType
const { mutate: create } = useCreateRoleTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>' });
```

### UserConnectedAccount

```typescript
// List all userConnectedAccounts
const { data, isLoading } = useUserConnectedAccountsQuery({
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});

// Get one userConnectedAccount
const { data: item } = useUserConnectedAccountQuery({
  id: '<UUID>',
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true } },
});

// Create a userConnectedAccount
const { mutate: create } = useCreateUserConnectedAccountMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<UUID>', service: '<String>', identifier: '<String>', details: '<JSON>', isVerified: '<Boolean>' });
```

### OrgApiKeyList

```typescript
// List all orgApiKeyLists
const { data, isLoading } = useOrgApiKeyListsQuery({
  selection: { fields: { id: true, keyId: true, name: true, principalId: true, orgId: true, expiresAt: true, revokedAt: true, lastUsedAt: true, mfaLevel: true, accessLevel: true, createdAt: true, updatedAt: true } },
});

// Get one orgApiKeyList
const { data: item } = useOrgApiKeyListQuery({
  id: '<UUID>',
  selection: { fields: { id: true, keyId: true, name: true, principalId: true, orgId: true, expiresAt: true, revokedAt: true, lastUsedAt: true, mfaLevel: true, accessLevel: true, createdAt: true, updatedAt: true } },
});

// Create a orgApiKeyList
const { mutate: create } = useCreateOrgApiKeyListMutation({
  selection: { fields: { id: true } },
});
create({ keyId: '<String>', name: '<String>', principalId: '<UUID>', orgId: '<UUID>', expiresAt: '<Datetime>', revokedAt: '<Datetime>', lastUsedAt: '<Datetime>', mfaLevel: '<String>', accessLevel: '<String>' });
```

### User

```typescript
// List all users
const { data, isLoading } = useUsersQuery({
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});

// Get one user
const { data: item } = useUserQuery({
  id: '<UUID>',
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});

// Create a user
const { mutate: create } = useCreateUserMutation({
  selection: { fields: { id: true } },
});
create({ username: '<String>', displayName: '<String>', profilePicture: '<Image>', searchTsv: '<FullText>', type: '<Int>', searchTsvRank: '<Float>', displayNameTrgmSimilarity: '<Float>', searchScore: '<Float>' });
```

## Custom Operation Hooks

### `useCurrentUserAgentQuery`

currentUserAgent

- **Type:** query
- **Arguments:** none

### `useCurrentUserIdQuery`

currentUserId

- **Type:** query
- **Arguments:** none

### `useCurrentIpAddressQuery`

currentIpAddress

- **Type:** query
- **Arguments:** none

### `useRequireStepUpQuery`

requireStepUp

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `stepUpType` | String |

### `useCurrentUserQuery`

currentUser

- **Type:** query
- **Arguments:** none

### `useSignOutMutation`

signOut

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignOutInput (required) |

### `useSendAccountDeletionEmailMutation`

sendAccountDeletionEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendAccountDeletionEmailInput (required) |

### `useCheckPasswordMutation`

checkPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CheckPasswordInput (required) |

### `useDeleteOrgPrincipalMutation`

deleteOrgPrincipal

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | DeleteOrgPrincipalInput (required) |

### `useDeletePrincipalMutation`

deletePrincipal

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | DeletePrincipalInput (required) |

### `useDisconnectAccountMutation`

disconnectAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | DisconnectAccountInput (required) |

### `useRevokeApiKeyMutation`

revokeApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeApiKeyInput (required) |

### `useRevokeSessionMutation`

revokeSession

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeSessionInput (required) |

### `useVerifyPasswordMutation`

verifyPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyPasswordInput (required) |

### `useVerifyTotpMutation`

verifyTotp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyTotpInput (required) |

### `useConfirmDeleteAccountMutation`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmDeleteAccountInput (required) |

### `useRevokeOrgApiKeyMutation`

revokeOrgApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeOrgApiKeyInput (required) |

### `useSetPasswordMutation`

setPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetPasswordInput (required) |

### `useVerifyEmailMutation`

verifyEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | VerifyEmailInput (required) |

### `useProvisionNewUserMutation`

provisionNewUser

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionNewUserInput (required) |

### `useResetPasswordMutation`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResetPasswordInput (required) |

### `useCreateOrgPrincipalMutation`

createOrgPrincipal

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CreateOrgPrincipalInput (required) |

### `useSignInCrossOriginMutation`

signInCrossOrigin

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInCrossOriginInput (required) |

### `useSignInSmsOtpMutation`

signInSmsOtp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInSmsOtpInput (required) |

### `useSignUpSmsMutation`

signUpSms

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpSmsInput (required) |

### `useSignUpMutation`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpInput (required) |

### `useSignInMutation`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInInput (required) |

### `useLinkIdentityMutation`

linkIdentity

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | LinkIdentityInput (required) |

### `useExtendTokenExpiresMutation`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ExtendTokenExpiresInput (required) |

### `useCreateOrgApiKeyMutation`

createOrgApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CreateOrgApiKeyInput (required) |

### `useCreateApiKeyMutation`

createApiKey

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CreateApiKeyInput (required) |

### `useRequestCrossOriginTokenMutation`

requestCrossOriginToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RequestCrossOriginTokenInput (required) |

### `useForgotPasswordMutation`

forgotPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ForgotPasswordInput (required) |

### `useSendVerificationEmailMutation`

sendVerificationEmail

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SendVerificationEmailInput (required) |

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
