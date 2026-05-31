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
| `useAppLimitCapsDefaultsQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useAppLimitCapsDefaultQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useCreateAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useUpdateAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useDeleteAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useOrgLimitCapsDefaultsQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useOrgLimitCapsDefaultQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useCreateOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useUpdateOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useDeleteOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useAppLimitCapsQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useAppLimitCapQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useCreateAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useUpdateAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useDeleteAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useOrgLimitCapsQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useOrgLimitCapQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useCreateOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useUpdateOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useDeleteOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useAppLimitDefaultsQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useAppLimitDefaultQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useCreateAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useUpdateAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useDeleteAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useAppLimitCreditsQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useAppLimitCreditQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useCreateAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useUpdateAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useDeleteAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useAppLimitCreditCodeItemsQuery` | Query | Items within a credit code — each row grants credits for a specific limit definition |
| `useAppLimitCreditCodeItemQuery` | Query | Items within a credit code — each row grants credits for a specific limit definition |
| `useCreateAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useUpdateAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useDeleteAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useAppLimitCreditRedemptionsQuery` | Query | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useAppLimitCreditRedemptionQuery` | Query | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useCreateAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useUpdateAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useDeleteAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useOrgLimitDefaultsQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useOrgLimitDefaultQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useCreateOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useUpdateOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useDeleteOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useOrgLimitCreditsQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useOrgLimitCreditQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useCreateOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useUpdateOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useDeleteOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useAppLimitWarningsQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useAppLimitWarningQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useCreateAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useUpdateAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useDeleteAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useOrgLimitWarningsQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useOrgLimitWarningQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useCreateOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useUpdateOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useDeleteOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useAppLimitCreditCodesQuery` | Query | Redeemable credit codes managed by admins with the add_credits permission |
| `useAppLimitCreditCodeQuery` | Query | Redeemable credit codes managed by admins with the add_credits permission |
| `useCreateAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useUpdateAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useDeleteAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useAppLimitEventsQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useAppLimitEventQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useCreateAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useUpdateAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useDeleteAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useOrgLimitEventsQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useOrgLimitEventQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useCreateOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useUpdateOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useDeleteOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useAppLimitsQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useAppLimitQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useCreateAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useUpdateAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useDeleteAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useOrgLimitAggregatesQuery` | Query | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useOrgLimitAggregateQuery` | Query | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useCreateOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useUpdateOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useDeleteOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useOrgLimitsQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useOrgLimitQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useCreateOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useUpdateOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useDeleteOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useSeedAppLimitCapsDefaultsMutation` | Mutation | seedAppLimitCapsDefaults |
| `useSeedAppLimitDefaultsMutation` | Mutation | seedAppLimitDefaults |
| `useSeedOrgLimitCapsDefaultsMutation` | Mutation | seedOrgLimitCapsDefaults |
| `useSeedOrgLimitDefaultsMutation` | Mutation | seedOrgLimitDefaults |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### AppLimitCapsDefault

```typescript
// List all appLimitCapsDefaults
const { data, isLoading } = useAppLimitCapsDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one appLimitCapsDefault
const { data: item } = useAppLimitCapsDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a appLimitCapsDefault
const { mutate: create } = useCreateAppLimitCapsDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<BigInt>' });
```

### OrgLimitCapsDefault

```typescript
// List all orgLimitCapsDefaults
const { data, isLoading } = useOrgLimitCapsDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true } },
});

// Get one orgLimitCapsDefault
const { data: item } = useOrgLimitCapsDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true } },
});

// Create a orgLimitCapsDefault
const { mutate: create } = useCreateOrgLimitCapsDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<BigInt>' });
```

### AppLimitCap

```typescript
// List all appLimitCaps
const { data, isLoading } = useAppLimitCapsQuery({
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});

// Get one appLimitCap
const { data: item } = useAppLimitCapQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});

// Create a appLimitCap
const { mutate: create } = useCreateAppLimitCapMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', entityId: '<UUID>', max: '<BigInt>' });
```

### OrgLimitCap

```typescript
// List all orgLimitCaps
const { data, isLoading } = useOrgLimitCapsQuery({
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});

// Get one orgLimitCap
const { data: item } = useOrgLimitCapQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, entityId: true, max: true } },
});

// Create a orgLimitCap
const { mutate: create } = useCreateOrgLimitCapMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', entityId: '<UUID>', max: '<BigInt>' });
```

### AppLimitDefault

```typescript
// List all appLimitDefaults
const { data, isLoading } = useAppLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true, softMax: true } },
});

// Get one appLimitDefault
const { data: item } = useAppLimitDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true, softMax: true } },
});

// Create a appLimitDefault
const { mutate: create } = useCreateAppLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<BigInt>', softMax: '<BigInt>' });
```

### AppLimitCredit

```typescript
// List all appLimitCredits
const { data, isLoading } = useAppLimitCreditsQuery({
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } },
});

// Get one appLimitCredit
const { data: item } = useAppLimitCreditQuery({
  id: '<UUID>',
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, amount: true, creditType: true, reason: true } },
});

// Create a appLimitCredit
const { mutate: create } = useCreateAppLimitCreditMutation({
  selection: { fields: { id: true } },
});
create({ defaultLimitId: '<UUID>', actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' });
```

### AppLimitCreditCodeItem

```typescript
// List all appLimitCreditCodeItems
const { data, isLoading } = useAppLimitCreditCodeItemsQuery({
  selection: { fields: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } },
});

// Get one appLimitCreditCodeItem
const { data: item } = useAppLimitCreditCodeItemQuery({
  id: '<UUID>',
  selection: { fields: { id: true, creditCodeId: true, defaultLimitId: true, amount: true, creditType: true } },
});

// Create a appLimitCreditCodeItem
const { mutate: create } = useCreateAppLimitCreditCodeItemMutation({
  selection: { fields: { id: true } },
});
create({ creditCodeId: '<UUID>', defaultLimitId: '<UUID>', amount: '<BigInt>', creditType: '<String>' });
```

### AppLimitCreditRedemption

```typescript
// List all appLimitCreditRedemptions
const { data, isLoading } = useAppLimitCreditRedemptionsQuery({
  selection: { fields: { id: true, creditCodeId: true, entityId: true, organizationId: true, entityType: true } },
});

// Get one appLimitCreditRedemption
const { data: item } = useAppLimitCreditRedemptionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, creditCodeId: true, entityId: true, organizationId: true, entityType: true } },
});

// Create a appLimitCreditRedemption
const { mutate: create } = useCreateAppLimitCreditRedemptionMutation({
  selection: { fields: { id: true } },
});
create({ creditCodeId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>' });
```

### OrgLimitDefault

```typescript
// List all orgLimitDefaults
const { data, isLoading } = useOrgLimitDefaultsQuery({
  selection: { fields: { id: true, name: true, max: true, softMax: true } },
});

// Get one orgLimitDefault
const { data: item } = useOrgLimitDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, max: true, softMax: true } },
});

// Create a orgLimitDefault
const { mutate: create } = useCreateOrgLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', max: '<BigInt>', softMax: '<BigInt>' });
```

### OrgLimitCredit

```typescript
// List all orgLimitCredits
const { data, isLoading } = useOrgLimitCreditsQuery({
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, organizationId: true, entityType: true, amount: true, creditType: true, reason: true } },
});

// Get one orgLimitCredit
const { data: item } = useOrgLimitCreditQuery({
  id: '<UUID>',
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, organizationId: true, entityType: true, amount: true, creditType: true, reason: true } },
});

// Create a orgLimitCredit
const { mutate: create } = useCreateOrgLimitCreditMutation({
  selection: { fields: { id: true } },
});
create({ defaultLimitId: '<UUID>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' });
```

### AppLimitWarning

```typescript
// List all appLimitWarnings
const { data, isLoading } = useAppLimitWarningsQuery({
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } },
});

// Get one appLimitWarning
const { data: item } = useAppLimitWarningQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true } },
});

// Create a appLimitWarning
const { mutate: create } = useCreateAppLimitWarningMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>' });
```

### OrgLimitWarning

```typescript
// List all orgLimitWarnings
const { data, isLoading } = useOrgLimitWarningsQuery({
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } },
});

// Get one orgLimitWarning
const { data: item } = useOrgLimitWarningQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, warningType: true, thresholdValue: true, taskIdentifier: true, entityId: true } },
});

// Create a orgLimitWarning
const { mutate: create } = useCreateOrgLimitWarningMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', warningType: '<String>', thresholdValue: '<BigInt>', taskIdentifier: '<String>', entityId: '<UUID>' });
```

### AppLimitCreditCode

```typescript
// List all appLimitCreditCodes
const { data, isLoading } = useAppLimitCreditCodesQuery({
  selection: { fields: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } },
});

// Get one appLimitCreditCode
const { data: item } = useAppLimitCreditCodeQuery({
  id: '<UUID>',
  selection: { fields: { id: true, code: true, maxRedemptions: true, currentRedemptions: true, expiresAt: true } },
});

// Create a appLimitCreditCode
const { mutate: create } = useCreateAppLimitCreditCodeMutation({
  selection: { fields: { id: true } },
});
create({ code: '<String>', maxRedemptions: '<Int>', currentRedemptions: '<Int>', expiresAt: '<Datetime>' });
```

### AppLimitEvent

```typescript
// List all appLimitEvents
const { data, isLoading } = useAppLimitEventsQuery({
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, organizationId: true, entityType: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Get one appLimitEvent
const { data: item } = useAppLimitEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, organizationId: true, entityType: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Create a appLimitEvent
const { mutate: create } = useCreateAppLimitEventMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' });
```

### OrgLimitEvent

```typescript
// List all orgLimitEvents
const { data, isLoading } = useOrgLimitEventsQuery({
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, organizationId: true, entityType: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Get one orgLimitEvent
const { data: item } = useOrgLimitEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, name: true, actorId: true, entityId: true, organizationId: true, entityType: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Create a orgLimitEvent
const { mutate: create } = useCreateOrgLimitEventMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' });
```

### AppLimit

```typescript
// List all appLimits
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, organizationId: true, entityType: true } },
});

// Get one appLimit
const { data: item } = useAppLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, organizationId: true, entityType: true } },
});

// Create a appLimit
const { mutate: create } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', organizationId: '<UUID>', entityType: '<String>' });
```

### OrgLimitAggregate

```typescript
// List all orgLimitAggregates
const { data, isLoading } = useOrgLimitAggregatesQuery({
  selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true, organizationId: true, entityType: true } },
});

// Get one orgLimitAggregate
const { data: item } = useOrgLimitAggregateQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true, organizationId: true, entityType: true } },
});

// Create a orgLimitAggregate
const { mutate: create } = useCreateOrgLimitAggregateMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', entityId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', reserved: '<BigInt>', organizationId: '<UUID>', entityType: '<String>' });
```

### OrgLimit

```typescript
// List all orgLimits
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, entityId: true, organizationId: true, entityType: true } },
});

// Get one orgLimit
const { data: item } = useOrgLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, entityId: true, organizationId: true, entityType: true } },
});

// Create a orgLimit
const { mutate: create } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', entityId: '<UUID>', organizationId: '<UUID>', entityType: '<String>' });
```

## Custom Operation Hooks

### `useSeedAppLimitCapsDefaultsMutation`

seedAppLimitCapsDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedAppLimitCapsDefaultsInput (required) |

### `useSeedAppLimitDefaultsMutation`

seedAppLimitDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedAppLimitDefaultsInput (required) |

### `useSeedOrgLimitCapsDefaultsMutation`

seedOrgLimitCapsDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedOrgLimitCapsDefaultsInput (required) |

### `useSeedOrgLimitDefaultsMutation`

seedOrgLimitDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedOrgLimitDefaultsInput (required) |

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
