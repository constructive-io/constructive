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
| `useCryptoAddressesQuery` | Query | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useCryptoAddressQuery` | Query | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useCreateCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useUpdateCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useDeleteCryptoAddressMutation` | Mutation | Cryptocurrency wallet addresses owned by users, with network-specific validation and verification |
| `useRoleTypesQuery` | Query | List all roleTypes |
| `useRoleTypeQuery` | Query | Get one roleType |
| `useCreateRoleTypeMutation` | Mutation | Create a roleType |
| `useUpdateRoleTypeMutation` | Mutation | Update a roleType |
| `useDeleteRoleTypeMutation` | Mutation | Delete a roleType |
| `usePhoneNumbersQuery` | Query | User phone numbers with country code, verification, and primary-number management |
| `usePhoneNumberQuery` | Query | User phone numbers with country code, verification, and primary-number management |
| `useCreatePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useUpdatePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useDeletePhoneNumberMutation` | Mutation | User phone numbers with country code, verification, and primary-number management |
| `useConnectedAccountsQuery` | Query | OAuth and social login connections linking external service accounts to users |
| `useConnectedAccountQuery` | Query | OAuth and social login connections linking external service accounts to users |
| `useCreateConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
| `useUpdateConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
| `useDeleteConnectedAccountMutation` | Mutation | OAuth and social login connections linking external service accounts to users |
| `useAuditLogsQuery` | Query | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useAuditLogQuery` | Query | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useCreateAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useUpdateAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useDeleteAuditLogMutation` | Mutation | Append-only audit log of authentication events (sign-in, sign-up, password changes, etc.) |
| `useEmailsQuery` | Query | User email addresses with verification and primary-email management |
| `useEmailQuery` | Query | User email addresses with verification and primary-email management |
| `useCreateEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useUpdateEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useDeleteEmailMutation` | Mutation | User email addresses with verification and primary-email management |
| `useUsersQuery` | Query | List all users |
| `useUserQuery` | Query | Get one user |
| `useCreateUserMutation` | Mutation | Create a user |
| `useUpdateUserMutation` | Mutation | Update a user |
| `useDeleteUserMutation` | Mutation | Delete a user |
| `useCurrentIpAddressQuery` | Query | currentIpAddress |
| `useCurrentUserAgentQuery` | Query | currentUserAgent |
| `useCurrentUserIdQuery` | Query | currentUserId |
| `useCurrentUserQuery` | Query | currentUser |
| `useSignOutMutation` | Mutation | signOut |
| `useSendAccountDeletionEmailMutation` | Mutation | sendAccountDeletionEmail |
| `useCheckPasswordMutation` | Mutation | checkPassword |
| `useConfirmDeleteAccountMutation` | Mutation | confirmDeleteAccount |
| `useSetPasswordMutation` | Mutation | setPassword |
| `useVerifyEmailMutation` | Mutation | verifyEmail |
| `useResetPasswordMutation` | Mutation | resetPassword |
| `useSignInOneTimeTokenMutation` | Mutation | signInOneTimeToken |
| `useSignInMutation` | Mutation | signIn |
| `useSignUpMutation` | Mutation | signUp |
| `useOneTimeTokenMutation` | Mutation | oneTimeToken |
| `useExtendTokenExpiresMutation` | Mutation | extendTokenExpires |
| `useForgotPasswordMutation` | Mutation | forgotPassword |
| `useSendVerificationEmailMutation` | Mutation | sendVerificationEmail |
| `useVerifyPasswordMutation` | Mutation | verifyPassword |
| `useVerifyTotpMutation` | Mutation | verifyTotp |

## Table Hooks

### CryptoAddress

```typescript
// List all cryptoAddresses
const { data, isLoading } = useCryptoAddressesQuery({
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, addressTrgmSimilarity: true, searchScore: true } },
});

// Get one cryptoAddress
const { data: item } = useCryptoAddressQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, address: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, addressTrgmSimilarity: true, searchScore: true } },
});

// Create a cryptoAddress
const { mutate: create } = useCreateCryptoAddressMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', address: '<value>', isVerified: '<value>', isPrimary: '<value>', addressTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### RoleType

```typescript
// List all roleTypes
const { data, isLoading } = useRoleTypesQuery({
  selection: { fields: { id: true, name: true } },
});

// Get one roleType
const { data: item } = useRoleTypeQuery({
  id: '<value>',
  selection: { fields: { id: true, name: true } },
});

// Create a roleType
const { mutate: create } = useCreateRoleTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<value>' });
```

### PhoneNumber

```typescript
// List all phoneNumbers
const { data, isLoading } = usePhoneNumbersQuery({
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, ccTrgmSimilarity: true, numberTrgmSimilarity: true, searchScore: true } },
});

// Get one phoneNumber
const { data: item } = usePhoneNumberQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, cc: true, number: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true, ccTrgmSimilarity: true, numberTrgmSimilarity: true, searchScore: true } },
});

// Create a phoneNumber
const { mutate: create } = useCreatePhoneNumberMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', cc: '<value>', number: '<value>', isVerified: '<value>', isPrimary: '<value>', ccTrgmSimilarity: '<value>', numberTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### ConnectedAccount

```typescript
// List all connectedAccounts
const { data, isLoading } = useConnectedAccountsQuery({
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true, serviceTrgmSimilarity: true, identifierTrgmSimilarity: true, searchScore: true } },
});

// Get one connectedAccount
const { data: item } = useConnectedAccountQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, service: true, identifier: true, details: true, isVerified: true, createdAt: true, updatedAt: true, serviceTrgmSimilarity: true, identifierTrgmSimilarity: true, searchScore: true } },
});

// Create a connectedAccount
const { mutate: create } = useCreateConnectedAccountMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', service: '<value>', identifier: '<value>', details: '<value>', isVerified: '<value>', serviceTrgmSimilarity: '<value>', identifierTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### AuditLog

```typescript
// List all auditLogs
const { data, isLoading } = useAuditLogsQuery({
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true, userAgentTrgmSimilarity: true, searchScore: true } },
});

// Get one auditLog
const { data: item } = useAuditLogQuery({
  id: '<value>',
  selection: { fields: { id: true, event: true, actorId: true, origin: true, userAgent: true, ipAddress: true, success: true, createdAt: true, userAgentTrgmSimilarity: true, searchScore: true } },
});

// Create a auditLog
const { mutate: create } = useCreateAuditLogMutation({
  selection: { fields: { id: true } },
});
create({ event: '<value>', actorId: '<value>', origin: '<value>', userAgent: '<value>', ipAddress: '<value>', success: '<value>', userAgentTrgmSimilarity: '<value>', searchScore: '<value>' });
```

### Email

```typescript
// List all emails
const { data, isLoading } = useEmailsQuery({
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Get one email
const { data: item } = useEmailQuery({
  id: '<value>',
  selection: { fields: { id: true, ownerId: true, email: true, isVerified: true, isPrimary: true, createdAt: true, updatedAt: true } },
});

// Create a email
const { mutate: create } = useCreateEmailMutation({
  selection: { fields: { id: true } },
});
create({ ownerId: '<value>', email: '<value>', isVerified: '<value>', isPrimary: '<value>' });
```

### User

```typescript
// List all users
const { data, isLoading } = useUsersQuery({
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});

// Get one user
const { data: item } = useUserQuery({
  id: '<value>',
  selection: { fields: { id: true, username: true, displayName: true, profilePicture: true, searchTsv: true, type: true, createdAt: true, updatedAt: true, searchTsvRank: true, displayNameTrgmSimilarity: true, searchScore: true } },
});

// Create a user
const { mutate: create } = useCreateUserMutation({
  selection: { fields: { id: true } },
});
create({ username: '<value>', displayName: '<value>', profilePicture: '<value>', searchTsv: '<value>', type: '<value>', searchTsvRank: '<value>', displayNameTrgmSimilarity: '<value>', searchScore: '<value>' });
```

## Custom Operation Hooks

### `useCurrentIpAddressQuery`

currentIpAddress

- **Type:** query
- **Arguments:** none

### `useCurrentUserAgentQuery`

currentUserAgent

- **Type:** query
- **Arguments:** none

### `useCurrentUserIdQuery`

currentUserId

- **Type:** query
- **Arguments:** none

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

### `useConfirmDeleteAccountMutation`

confirmDeleteAccount

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ConfirmDeleteAccountInput (required) |

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

### `useResetPasswordMutation`

resetPassword

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResetPasswordInput (required) |

### `useSignInOneTimeTokenMutation`

signInOneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInOneTimeTokenInput (required) |

### `useSignInMutation`

signIn

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignInInput (required) |

### `useSignUpMutation`

signUp

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SignUpInput (required) |

### `useOneTimeTokenMutation`

oneTimeToken

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | OneTimeTokenInput (required) |

### `useExtendTokenExpiresMutation`

extendTokenExpires

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ExtendTokenExpiresInput (required) |

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

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
