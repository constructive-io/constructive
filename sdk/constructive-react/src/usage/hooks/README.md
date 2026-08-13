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
| `useAppAchievementRewardsQuery` | Query | Defines rewards granted when a level is achieved; supports limit_credits and meter_credits |
| `useAppAchievementRewardQuery` | Query | Defines rewards granted when a level is achieved; supports limit_credits and meter_credits |
| `useCreateAppAchievementRewardMutation` | Mutation | Defines rewards granted when a level is achieved; supports limit_credits and meter_credits |
| `useUpdateAppAchievementRewardMutation` | Mutation | Defines rewards granted when a level is achieved; supports limit_credits and meter_credits |
| `useDeleteAppAchievementRewardMutation` | Mutation | Defines rewards granted when a level is achieved; supports limit_credits and meter_credits |
| `useAppEventAggregatesQuery` | Query | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useAppEventAggregateQuery` | Query | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useCreateAppEventAggregateMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useUpdateAppEventAggregateMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useDeleteAppEventAggregateMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useAppEventsQuery` | Query | Partitioned append-only log of individual user actions; every single event ever recorded |
| `useAppEventQuery` | Query | Partitioned append-only log of individual user actions; every single event ever recorded |
| `useCreateAppEventMutation` | Mutation | Partitioned append-only log of individual user actions; every single event ever recorded |
| `useUpdateAppEventMutation` | Mutation | Partitioned append-only log of individual user actions; every single event ever recorded |
| `useDeleteAppEventMutation` | Mutation | Partitioned append-only log of individual user actions; every single event ever recorded |
| `useAppEventTypesQuery` | Query | Catalog of known event types with per-type configuration for aggregation, retention, and level participation |
| `useAppEventTypeQuery` | Query | Catalog of known event types with per-type configuration for aggregation, retention, and level participation |
| `useCreateAppEventTypeMutation` | Mutation | Catalog of known event types with per-type configuration for aggregation, retention, and level participation |
| `useUpdateAppEventTypeMutation` | Mutation | Catalog of known event types with per-type configuration for aggregation, retention, and level participation |
| `useDeleteAppEventTypeMutation` | Mutation | Catalog of known event types with per-type configuration for aggregation, retention, and level participation |
| `useAppLevelsQuery` | Query | Defines available levels that users can achieve by completing requirements |
| `useAppLevelQuery` | Query | Defines available levels that users can achieve by completing requirements |
| `useCreateAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useUpdateAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useDeleteAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useAppLevelGrantsQuery` | Query | Records when a user achieves a level; prevents duplicate reward grants |
| `useAppLevelGrantQuery` | Query | Records when a user achieves a level; prevents duplicate reward grants |
| `useCreateAppLevelGrantMutation` | Mutation | Records when a user achieves a level; prevents duplicate reward grants |
| `useUpdateAppLevelGrantMutation` | Mutation | Records when a user achieves a level; prevents duplicate reward grants |
| `useDeleteAppLevelGrantMutation` | Mutation | Records when a user achieves a level; prevents duplicate reward grants |
| `useAppLevelRequirementsQuery` | Query | Defines the specific requirements that must be met to achieve a level |
| `useAppLevelRequirementQuery` | Query | Defines the specific requirements that must be met to achieve a level |
| `useCreateAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useUpdateAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useDeleteAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useAppLimitCapsQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useAppLimitCapQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useCreateAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useUpdateAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useDeleteAppLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useAppLimitCapsDefaultsQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useAppLimitCapsDefaultQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useCreateAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useUpdateAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useDeleteAppLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useAppLimitsQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useAppLimitQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useCreateAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useUpdateAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useDeleteAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useAppLimitCreditCodesQuery` | Query | Redeemable credit codes managed by admins with the add_credits capability |
| `useAppLimitCreditCodeQuery` | Query | Redeemable credit codes managed by admins with the add_credits capability |
| `useCreateAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits capability |
| `useUpdateAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits capability |
| `useDeleteAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits capability |
| `useAppLimitCreditCodeItemsQuery` | Query | Items within a credit code — each row grants credits for a specific limit definition |
| `useAppLimitCreditCodeItemQuery` | Query | Items within a credit code — each row grants credits for a specific limit definition |
| `useCreateAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useUpdateAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useDeleteAppLimitCreditCodeItemMutation` | Mutation | Items within a credit code — each row grants credits for a specific limit definition |
| `useAppLimitCreditsQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useAppLimitCreditQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useCreateAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useUpdateAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useDeleteAppLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useAppLimitCreditRedemptionsQuery` | Query | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useAppLimitCreditRedemptionQuery` | Query | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useCreateAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useUpdateAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useDeleteAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useAppLimitDefaultsQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useAppLimitDefaultQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useCreateAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useUpdateAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useDeleteAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useAppLimitEventsQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useAppLimitEventQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useCreateAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useUpdateAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useDeleteAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useAppLimitWarningsQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useAppLimitWarningQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useCreateAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useUpdateAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useDeleteAppLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useBillingUsageSummariesQuery` | Query | Permanent monthly usage summary per entity per meter (user-facing billing dashboard) |
| `useBillingUsageSummaryQuery` | Query | Permanent monthly usage summary per entity per meter (user-facing billing dashboard) |
| `useCreateBillingUsageSummaryMutation` | Mutation | Permanent monthly usage summary per entity per meter (user-facing billing dashboard) |
| `useUpdateBillingUsageSummaryMutation` | Mutation | Permanent monthly usage summary per entity per meter (user-facing billing dashboard) |
| `useDeleteBillingUsageSummaryMutation` | Mutation | Permanent monthly usage summary per entity per meter (user-facing billing dashboard) |
| `useLedgersQuery` | Query | Append-only event log for all billing events (usage, grants, adjustments) |
| `useLedgerQuery` | Query | Append-only event log for all billing events (usage, grants, adjustments) |
| `useCreateLedgerMutation` | Mutation | Append-only event log for all billing events (usage, grants, adjustments) |
| `useUpdateLedgerMutation` | Mutation | Append-only event log for all billing events (usage, grants, adjustments) |
| `useDeleteLedgerMutation` | Mutation | Append-only event log for all billing events (usage, grants, adjustments) |
| `useMetersQuery` | Query | Defines billable meters (what to track: quotas, feature flags, credit pools) |
| `useMeterQuery` | Query | Defines billable meters (what to track: quotas, feature flags, credit pools) |
| `useCreateMeterMutation` | Mutation | Defines billable meters (what to track: quotas, feature flags, credit pools) |
| `useUpdateMeterMutation` | Mutation | Defines billable meters (what to track: quotas, feature flags, credit pools) |
| `useDeleteMeterMutation` | Mutation | Defines billable meters (what to track: quotas, feature flags, credit pools) |
| `useMeterCreditsQuery` | Query | Append-only ledger of credit grants for billing meters that automatically update balances |
| `useMeterCreditQuery` | Query | Append-only ledger of credit grants for billing meters that automatically update balances |
| `useCreateMeterCreditMutation` | Mutation | Append-only ledger of credit grants for billing meters that automatically update balances |
| `useUpdateMeterCreditMutation` | Mutation | Append-only ledger of credit grants for billing meters that automatically update balances |
| `useDeleteMeterCreditMutation` | Mutation | Append-only ledger of credit grants for billing meters that automatically update balances |
| `useMeterDefaultsQuery` | Query | Default meter catalog: defines which meters are available and their default plan_limit values for new entities |
| `useMeterDefaultQuery` | Query | Default meter catalog: defines which meters are available and their default plan_limit values for new entities |
| `useCreateMeterDefaultMutation` | Mutation | Default meter catalog: defines which meters are available and their default plan_limit values for new entities |
| `useUpdateMeterDefaultMutation` | Mutation | Default meter catalog: defines which meters are available and their default plan_limit values for new entities |
| `useDeleteMeterDefaultMutation` | Mutation | Default meter catalog: defines which meters are available and their default plan_limit values for new entities |
| `useMeterSourcesQuery` | Query | Maps billing meters to typed usage summary table columns for automated usage reconciliation. Each row tells reconcile_typed_usage() which column to aggregate and how. |
| `useMeterSourceQuery` | Query | Maps billing meters to typed usage summary table columns for automated usage reconciliation. Each row tells reconcile_typed_usage() which column to aggregate and how. |
| `useCreateMeterSourceMutation` | Mutation | Maps billing meters to typed usage summary table columns for automated usage reconciliation. Each row tells reconcile_typed_usage() which column to aggregate and how. |
| `useUpdateMeterSourceMutation` | Mutation | Maps billing meters to typed usage summary table columns for automated usage reconciliation. Each row tells reconcile_typed_usage() which column to aggregate and how. |
| `useDeleteMeterSourceMutation` | Mutation | Maps billing meters to typed usage summary table columns for automated usage reconciliation. Each row tells reconcile_typed_usage() which column to aggregate and how. |
| `useOrgLimitAggregatesQuery` | Query | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useOrgLimitAggregateQuery` | Query | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useCreateOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useUpdateOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useDeleteOrgLimitAggregateMutation` | Mutation | Tracks aggregate entity-level usage counts (org-wide caps, no per-user breakdown) |
| `useOrgLimitCapsQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useOrgLimitCapQuery` | Query | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useCreateOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useUpdateOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useDeleteOrgLimitCapMutation` | Mutation | Per-entity cap overrides. Allows specific orgs/entities to have different cap values than the scope default. |
| `useOrgLimitCapsDefaultsQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useOrgLimitCapsDefaultQuery` | Query | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useCreateOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useUpdateOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useDeleteOrgLimitCapsDefaultMutation` | Mutation | Default cap values for static configuration limits (max file size, feature flags, etc.). Not metered — just read by consumers. |
| `useOrgLimitsQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useOrgLimitQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useCreateOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useUpdateOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useDeleteOrgLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useOrgLimitCreditsQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useOrgLimitCreditQuery` | Query | Append-only ledger of credit grants that automatically update limit ceilings |
| `useCreateOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useUpdateOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useDeleteOrgLimitCreditMutation` | Mutation | Append-only ledger of credit grants that automatically update limit ceilings |
| `useOrgLimitDefaultsQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useOrgLimitDefaultQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useCreateOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useUpdateOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useDeleteOrgLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useOrgLimitEventsQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useOrgLimitEventQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useCreateOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useUpdateOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useDeleteOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useOrgLimitWarningsQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useOrgLimitWarningQuery` | Query | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useCreateOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useUpdateOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `useDeleteOrgLimitWarningMutation` | Mutation | Warning configuration for soft limits. Each row defines a warning threshold and the job task to enqueue when usage approaches it. |
| `usePlanCapsQuery` | Query | Maps each plan to feature flag cap values (written to limit_caps when plan is applied) |
| `usePlanCapQuery` | Query | Maps each plan to feature flag cap values (written to limit_caps when plan is applied) |
| `useCreatePlanCapMutation` | Mutation | Maps each plan to feature flag cap values (written to limit_caps when plan is applied) |
| `useUpdatePlanCapMutation` | Mutation | Maps each plan to feature flag cap values (written to limit_caps when plan is applied) |
| `useDeletePlanCapMutation` | Mutation | Maps each plan to feature flag cap values (written to limit_caps when plan is applied) |
| `usePlansQuery` | Query | Defines plan tiers with named limit configurations |
| `usePlanQuery` | Query | Defines plan tiers with named limit configurations |
| `useCreatePlanMutation` | Mutation | Defines plan tiers with named limit configurations |
| `useUpdatePlanMutation` | Mutation | Defines plan tiers with named limit configurations |
| `useDeletePlanMutation` | Mutation | Defines plan tiers with named limit configurations |
| `usePlanLimitsQuery` | Query | Maps each plan to specific limit names and their maximum allowed values |
| `usePlanLimitQuery` | Query | Maps each plan to specific limit names and their maximum allowed values |
| `useCreatePlanLimitMutation` | Mutation | Maps each plan to specific limit names and their maximum allowed values |
| `useUpdatePlanLimitMutation` | Mutation | Maps each plan to specific limit names and their maximum allowed values |
| `useDeletePlanLimitMutation` | Mutation | Maps each plan to specific limit names and their maximum allowed values |
| `usePlanMeterLimitsQuery` | Query | Maps each plan to billing meter quotas (plan_limit values written to balances when plan is applied) |
| `usePlanMeterLimitQuery` | Query | Maps each plan to billing meter quotas (plan_limit values written to balances when plan is applied) |
| `useCreatePlanMeterLimitMutation` | Mutation | Maps each plan to billing meter quotas (plan_limit values written to balances when plan is applied) |
| `useUpdatePlanMeterLimitMutation` | Mutation | Maps each plan to billing meter quotas (plan_limit values written to balances when plan is applied) |
| `useDeletePlanMeterLimitMutation` | Mutation | Maps each plan to billing meter quotas (plan_limit values written to balances when plan is applied) |
| `usePlanOverridesQuery` | Query | Per-entity limit overrides that take precedence over plan defaults |
| `usePlanOverrideQuery` | Query | Per-entity limit overrides that take precedence over plan defaults |
| `useCreatePlanOverrideMutation` | Mutation | Per-entity limit overrides that take precedence over plan defaults |
| `useUpdatePlanOverrideMutation` | Mutation | Per-entity limit overrides that take precedence over plan defaults |
| `useDeletePlanOverrideMutation` | Mutation | Per-entity limit overrides that take precedence over plan defaults |
| `usePlanPricingsQuery` | Query | Billing intervals and pricing for each plan tier |
| `usePlanPricingQuery` | Query | Billing intervals and pricing for each plan tier |
| `useCreatePlanPricingMutation` | Mutation | Billing intervals and pricing for each plan tier |
| `useUpdatePlanPricingMutation` | Mutation | Billing intervals and pricing for each plan tier |
| `useDeletePlanPricingMutation` | Mutation | Billing intervals and pricing for each plan tier |
| `usePlanSubscriptionsQuery` | Query | Assigns a plan to an entity with subscription lifecycle (start, end, active state) |
| `usePlanSubscriptionQuery` | Query | Assigns a plan to an entity with subscription lifecycle (start, end, active state) |
| `useCreatePlanSubscriptionMutation` | Mutation | Assigns a plan to an entity with subscription lifecycle (start, end, active state) |
| `useUpdatePlanSubscriptionMutation` | Mutation | Assigns a plan to an entity with subscription lifecycle (start, end, active state) |
| `useDeletePlanSubscriptionMutation` | Mutation | Assigns a plan to an entity with subscription lifecycle (start, end, active state) |
| `useCaptureAppLimitDefaultsQuery` | Query | captureAppLimitDefaults |
| `useCaptureOrgLimitDefaultsQuery` | Query | captureOrgLimitDefaults |
| `useCaptureTrustLadderQuery` | Query | captureTrustLadder |
| `useEventsAchievedQuery` | Query | eventsAchieved |
| `useEventsRequiredQuery` | Query | Reads and enables pagination through a set of `AppLevelRequirement`. |
| `useGrantAchievementMutation` | Mutation | grantAchievement |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `useRecomputeCapabilitiesMutation` | Mutation | recomputeCapabilities |
| `useRevokeAchievementMutation` | Mutation | revokeAchievement |
| `useSeedAppLimitCapsDefaultsMutation` | Mutation | seedAppLimitCapsDefaults |
| `useSeedAppLimitDefaultsMutation` | Mutation | seedAppLimitDefaults |
| `useSeedMeterDefaultsMutation` | Mutation | seedMeterDefaults |
| `useSeedOrgLimitCapsDefaultsMutation` | Mutation | seedOrgLimitCapsDefaults |
| `useSeedOrgLimitDefaultsMutation` | Mutation | seedOrgLimitDefaults |
| `useSeedPlanMutation` | Mutation | seedPlan |
| `useSeedTrustLadderMutation` | Mutation | seedTrustLadder |

## Table Hooks

### AppAchievementReward

```typescript
// List all appAchievementRewards
const { data, isLoading } = useAppAchievementRewardsQuery({
  selection: { fields: { amount: true, createdAt: true, creditType: true, expiresInterval: true, id: true, levelName: true, rewardType: true, targetName: true, updatedAt: true } },
});

// Get one appAchievementReward
const { data: item } = useAppAchievementRewardQuery({
  id: '<UUID>',
  selection: { fields: { amount: true, createdAt: true, creditType: true, expiresInterval: true, id: true, levelName: true, rewardType: true, targetName: true, updatedAt: true } },
});

// Create a appAchievementReward
const { mutate: create } = useCreateAppAchievementRewardMutation({
  selection: { fields: { id: true } },
});
create({ amount: '<Int>', creditType: '<String>', expiresInterval: '<Interval>', levelName: '<String>', rewardType: '<String>', targetName: '<String>' });
```

### AppEventAggregate

```typescript
// List all appEventAggregates
const { data, isLoading } = useAppEventAggregatesQuery({
  selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true, periodStart: true, updatedAt: true } },
});

// Get one appEventAggregate
const { data: item } = useAppEventAggregateQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true, periodStart: true, updatedAt: true } },
});

// Create a appEventAggregate
const { mutate: create } = useCreateAppEventAggregateMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', count: '<Int>', name: '<String>', periodStart: '<Datetime>' });
```

### AppEvent

```typescript
// List all appEvents
const { data, isLoading } = useAppEventsQuery({
  selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true } },
});

// Get one appEvent
const { data: item } = useAppEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, count: true, createdAt: true, id: true, name: true } },
});

// Create a appEvent
const { mutate: create } = useCreateAppEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', count: '<Int>', name: '<String>' });
```

### AppEventType

```typescript
// List all appEventTypes
const { data, isLoading } = useAppEventTypesQuery({
  selection: { fields: { aggregation: true, category: true, createdAt: true, description: true, feedsLevels: true, id: true, isActive: true, name: true, periodInterval: true, updatedAt: true } },
});

// Get one appEventType
const { data: item } = useAppEventTypeQuery({
  id: '<UUID>',
  selection: { fields: { aggregation: true, category: true, createdAt: true, description: true, feedsLevels: true, id: true, isActive: true, name: true, periodInterval: true, updatedAt: true } },
});

// Create a appEventType
const { mutate: create } = useCreateAppEventTypeMutation({
  selection: { fields: { id: true } },
});
create({ aggregation: '<String>', category: '<String>', description: '<String>', feedsLevels: '<Boolean>', isActive: '<Boolean>', name: '<String>', periodInterval: '<Interval>' });
```

### AppLevel

```typescript
// List all appLevels
const { data, isLoading } = useAppLevelsQuery({
  selection: { fields: { createdAt: true, description: true, id: true, image: true, name: true, ownerId: true, updatedAt: true } },
});

// Get one appLevel
const { data: item } = useAppLevelQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, description: true, id: true, image: true, name: true, ownerId: true, updatedAt: true } },
});

// Create a appLevel
const { mutate: create } = useCreateAppLevelMutation({
  selection: { fields: { id: true } },
});
create({ description: '<String>', image: '<Image>', name: '<String>', ownerId: '<UUID>' });
```

### AppLevelGrant

```typescript
// List all appLevelGrants
const { data, isLoading } = useAppLevelGrantsQuery({
  selection: { fields: { actorId: true, createdAt: true, expiresAt: true, id: true, levelName: true, periodStart: true, updatedAt: true } },
});

// Get one appLevelGrant
const { data: item } = useAppLevelGrantQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, expiresAt: true, id: true, levelName: true, periodStart: true, updatedAt: true } },
});

// Create a appLevelGrant
const { mutate: create } = useCreateAppLevelGrantMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', expiresAt: '<Datetime>', levelName: '<String>', periodStart: '<Datetime>' });
```

### AppLevelRequirement

```typescript
// List all appLevelRequirements
const { data, isLoading } = useAppLevelRequirementsQuery({
  selection: { fields: { createdAt: true, description: true, groupKey: true, id: true, level: true, metric: true, name: true, priority: true, requiredCount: true, updatedAt: true } },
});

// Get one appLevelRequirement
const { data: item } = useAppLevelRequirementQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, description: true, groupKey: true, id: true, level: true, metric: true, name: true, priority: true, requiredCount: true, updatedAt: true } },
});

// Create a appLevelRequirement
const { mutate: create } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
create({ description: '<String>', groupKey: '<String>', level: '<String>', metric: '<String>', name: '<String>', priority: '<Int>', requiredCount: '<Int>' });
```

### AppLimitCap

```typescript
// List all appLimitCaps
const { data, isLoading } = useAppLimitCapsQuery({
  selection: { fields: { entityId: true, id: true, max: true, name: true } },
});

// Get one appLimitCap
const { data: item } = useAppLimitCapQuery({
  id: '<UUID>',
  selection: { fields: { entityId: true, id: true, max: true, name: true } },
});

// Create a appLimitCap
const { mutate: create } = useCreateAppLimitCapMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', max: '<BigInt>', name: '<String>' });
```

### AppLimitCapsDefault

```typescript
// List all appLimitCapsDefaults
const { data, isLoading } = useAppLimitCapsDefaultsQuery({
  selection: { fields: { id: true, max: true, name: true } },
});

// Get one appLimitCapsDefault
const { data: item } = useAppLimitCapsDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, max: true, name: true } },
});

// Create a appLimitCapsDefault
const { mutate: create } = useCreateAppLimitCapsDefaultMutation({
  selection: { fields: { id: true } },
});
create({ max: '<BigInt>', name: '<String>' });
```

### AppLimit

```typescript
// List all appLimits
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { actorId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } },
});

// Get one appLimit
const { data: item } = useAppLimitQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } },
});

// Create a appLimit
const { mutate: create } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' });
```

### AppLimitCreditCode

```typescript
// List all appLimitCreditCodes
const { data, isLoading } = useAppLimitCreditCodesQuery({
  selection: { fields: { code: true, currentRedemptions: true, expiresAt: true, id: true, maxRedemptions: true } },
});

// Get one appLimitCreditCode
const { data: item } = useAppLimitCreditCodeQuery({
  id: '<UUID>',
  selection: { fields: { code: true, currentRedemptions: true, expiresAt: true, id: true, maxRedemptions: true } },
});

// Create a appLimitCreditCode
const { mutate: create } = useCreateAppLimitCreditCodeMutation({
  selection: { fields: { id: true } },
});
create({ code: '<String>', currentRedemptions: '<Int>', expiresAt: '<Datetime>', maxRedemptions: '<Int>' });
```

### AppLimitCreditCodeItem

```typescript
// List all appLimitCreditCodeItems
const { data, isLoading } = useAppLimitCreditCodeItemsQuery({
  selection: { fields: { amount: true, creditCodeId: true, creditType: true, defaultLimitId: true, id: true } },
});

// Get one appLimitCreditCodeItem
const { data: item } = useAppLimitCreditCodeItemQuery({
  id: '<UUID>',
  selection: { fields: { amount: true, creditCodeId: true, creditType: true, defaultLimitId: true, id: true } },
});

// Create a appLimitCreditCodeItem
const { mutate: create } = useCreateAppLimitCreditCodeItemMutation({
  selection: { fields: { id: true } },
});
create({ amount: '<BigInt>', creditCodeId: '<UUID>', creditType: '<String>', defaultLimitId: '<UUID>' });
```

### AppLimitCredit

```typescript
// List all appLimitCredits
const { data, isLoading } = useAppLimitCreditsQuery({
  selection: { fields: { actorId: true, amount: true, creditType: true, defaultLimitId: true, id: true, reason: true } },
});

// Get one appLimitCredit
const { data: item } = useAppLimitCreditQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, amount: true, creditType: true, defaultLimitId: true, id: true, reason: true } },
});

// Create a appLimitCredit
const { mutate: create } = useCreateAppLimitCreditMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', defaultLimitId: '<UUID>', reason: '<String>' });
```

### AppLimitCreditRedemption

```typescript
// List all appLimitCreditRedemptions
const { data, isLoading } = useAppLimitCreditRedemptionsQuery({
  selection: { fields: { creditCodeId: true, entityId: true, entityType: true, id: true, organizationId: true } },
});

// Get one appLimitCreditRedemption
const { data: item } = useAppLimitCreditRedemptionQuery({
  id: '<UUID>',
  selection: { fields: { creditCodeId: true, entityId: true, entityType: true, id: true, organizationId: true } },
});

// Create a appLimitCreditRedemption
const { mutate: create } = useCreateAppLimitCreditRedemptionMutation({
  selection: { fields: { id: true } },
});
create({ creditCodeId: '<UUID>', entityId: '<UUID>', entityType: '<String>', organizationId: '<UUID>' });
```

### AppLimitDefault

```typescript
// List all appLimitDefaults
const { data, isLoading } = useAppLimitDefaultsQuery({
  selection: { fields: { id: true, max: true, name: true, softMax: true } },
});

// Get one appLimitDefault
const { data: item } = useAppLimitDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, max: true, name: true, softMax: true } },
});

// Create a appLimitDefault
const { mutate: create } = useCreateAppLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ max: '<BigInt>', name: '<String>', softMax: '<BigInt>' });
```

### AppLimitEvent

```typescript
// List all appLimitEvents
const { data, isLoading } = useAppLimitEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } },
});

// Get one appLimitEvent
const { data: item } = useAppLimitEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } },
});

// Create a appLimitEvent
const { mutate: create } = useCreateAppLimitEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', eventType: '<String>', maxAtEvent: '<BigInt>', name: '<String>', numAfter: '<BigInt>', numBefore: '<BigInt>', organizationId: '<UUID>', reason: '<String>' });
```

### AppLimitWarning

```typescript
// List all appLimitWarnings
const { data, isLoading } = useAppLimitWarningsQuery({
  selection: { fields: { id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } },
});

// Get one appLimitWarning
const { data: item } = useAppLimitWarningQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } },
});

// Create a appLimitWarning
const { mutate: create } = useCreateAppLimitWarningMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', taskIdentifier: '<String>', thresholdValue: '<BigInt>', warningType: '<String>' });
```

### BillingUsageSummary

```typescript
// List all billingUsageSummaries
const { data, isLoading } = useBillingUsageSummariesQuery({
  selection: { fields: { creditsConsumed: true, entityId: true, entityType: true, id: true, meterSlug: true, organizationId: true, overageUnits: true, periodEnd: true, periodStart: true, planLimit: true, quantityUsed: true } },
});

// Get one billingUsageSummary
const { data: item } = useBillingUsageSummaryQuery({
  id: '<UUID>',
  selection: { fields: { creditsConsumed: true, entityId: true, entityType: true, id: true, meterSlug: true, organizationId: true, overageUnits: true, periodEnd: true, periodStart: true, planLimit: true, quantityUsed: true } },
});

// Create a billingUsageSummary
const { mutate: create } = useCreateBillingUsageSummaryMutation({
  selection: { fields: { id: true } },
});
create({ creditsConsumed: '<BigInt>', entityId: '<UUID>', entityType: '<String>', meterSlug: '<String>', organizationId: '<UUID>', overageUnits: '<BigInt>', periodEnd: '<Datetime>', periodStart: '<Datetime>', planLimit: '<BigInt>', quantityUsed: '<BigInt>' });
```

### Ledger

```typescript
// List all ledgers
const { data, isLoading } = useLedgersQuery({
  selection: { fields: { createdAt: true, delta: true, entityId: true, entityType: true, entryType: true, id: true, ledgerClass: true, metadata: true, meterSlug: true, organizationId: true, usageAfter: true } },
});

// Get one ledger
const { data: item } = useLedgerQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, delta: true, entityId: true, entityType: true, entryType: true, id: true, ledgerClass: true, metadata: true, meterSlug: true, organizationId: true, usageAfter: true } },
});

// Create a ledger
const { mutate: create } = useCreateLedgerMutation({
  selection: { fields: { id: true } },
});
create({ delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', entryType: '<String>', ledgerClass: '<String>', metadata: '<JSON>', meterSlug: '<String>', organizationId: '<UUID>', usageAfter: '<BigInt>' });
```

### Meter

```typescript
// List all meters
const { data, isLoading } = useMetersQuery({
  selection: { fields: { aggregation: true, categoryMeter: true, creditCost: true, displayName: true, id: true, isActive: true, meterType: true, periodInterval: true, rolloverCap: true, slug: true, unit: true } },
});

// Get one meter
const { data: item } = useMeterQuery({
  id: '<UUID>',
  selection: { fields: { aggregation: true, categoryMeter: true, creditCost: true, displayName: true, id: true, isActive: true, meterType: true, periodInterval: true, rolloverCap: true, slug: true, unit: true } },
});

// Create a meter
const { mutate: create } = useCreateMeterMutation({
  selection: { fields: { id: true } },
});
create({ aggregation: '<String>', categoryMeter: '<String>', creditCost: '<Int>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', periodInterval: '<Interval>', rolloverCap: '<BigInt>', slug: '<String>', unit: '<String>' });
```

### MeterCredit

```typescript
// List all meterCredits
const { data, isLoading } = useMeterCreditsQuery({
  selection: { fields: { amount: true, createdAt: true, creditType: true, entityId: true, entityType: true, expiresAt: true, id: true, meterId: true, organizationId: true, reason: true } },
});

// Get one meterCredit
const { data: item } = useMeterCreditQuery({
  id: '<UUID>',
  selection: { fields: { amount: true, createdAt: true, creditType: true, entityId: true, entityType: true, expiresAt: true, id: true, meterId: true, organizationId: true, reason: true } },
});

// Create a meterCredit
const { mutate: create } = useCreateMeterCreditMutation({
  selection: { fields: { id: true } },
});
create({ amount: '<BigInt>', creditType: '<String>', entityId: '<UUID>', entityType: '<String>', expiresAt: '<Datetime>', meterId: '<UUID>', organizationId: '<UUID>', reason: '<String>' });
```

### MeterDefault

```typescript
// List all meterDefaults
const { data, isLoading } = useMeterDefaultsQuery({
  selection: { fields: { categoryMeter: true, creditCost: true, defaultPlanLimit: true, displayName: true, id: true, isActive: true, meterType: true, slug: true, unit: true } },
});

// Get one meterDefault
const { data: item } = useMeterDefaultQuery({
  id: '<UUID>',
  selection: { fields: { categoryMeter: true, creditCost: true, defaultPlanLimit: true, displayName: true, id: true, isActive: true, meterType: true, slug: true, unit: true } },
});

// Create a meterDefault
const { mutate: create } = useCreateMeterDefaultMutation({
  selection: { fields: { id: true } },
});
create({ categoryMeter: '<String>', creditCost: '<BigFloat>', defaultPlanLimit: '<BigInt>', displayName: '<String>', isActive: '<Boolean>', meterType: '<String>', slug: '<String>', unit: '<String>' });
```

### MeterSource

```typescript
// List all meterSources
const { data, isLoading } = useMeterSourcesQuery({
  selection: { fields: { aggregationType: true, dimensionPath: true, id: true, isActive: true, meterSlug: true, sourceMetric: true } },
});

// Get one meterSource
const { data: item } = useMeterSourceQuery({
  id: '<UUID>',
  selection: { fields: { aggregationType: true, dimensionPath: true, id: true, isActive: true, meterSlug: true, sourceMetric: true } },
});

// Create a meterSource
const { mutate: create } = useCreateMeterSourceMutation({
  selection: { fields: { id: true } },
});
create({ aggregationType: '<String>', dimensionPath: '<String>', isActive: '<Boolean>', meterSlug: '<String>', sourceMetric: '<String>' });
```

### OrgLimitAggregate

```typescript
// List all orgLimitAggregates
const { data, isLoading } = useOrgLimitAggregatesQuery({
  selection: { fields: { entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, reserved: true, softMax: true, windowDuration: true, windowStart: true } },
});

// Get one orgLimitAggregate
const { data: item } = useOrgLimitAggregateQuery({
  id: '<UUID>',
  selection: { fields: { entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, reserved: true, softMax: true, windowDuration: true, windowStart: true } },
});

// Create a orgLimitAggregate
const { mutate: create } = useCreateOrgLimitAggregateMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', reserved: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' });
```

### OrgLimitCap

```typescript
// List all orgLimitCaps
const { data, isLoading } = useOrgLimitCapsQuery({
  selection: { fields: { entityId: true, id: true, max: true, name: true } },
});

// Get one orgLimitCap
const { data: item } = useOrgLimitCapQuery({
  id: '<UUID>',
  selection: { fields: { entityId: true, id: true, max: true, name: true } },
});

// Create a orgLimitCap
const { mutate: create } = useCreateOrgLimitCapMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', max: '<BigInt>', name: '<String>' });
```

### OrgLimitCapsDefault

```typescript
// List all orgLimitCapsDefaults
const { data, isLoading } = useOrgLimitCapsDefaultsQuery({
  selection: { fields: { id: true, max: true, name: true } },
});

// Get one orgLimitCapsDefault
const { data: item } = useOrgLimitCapsDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, max: true, name: true } },
});

// Create a orgLimitCapsDefault
const { mutate: create } = useCreateOrgLimitCapsDefaultMutation({
  selection: { fields: { id: true } },
});
create({ max: '<BigInt>', name: '<String>' });
```

### OrgLimit

```typescript
// List all orgLimits
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { actorId: true, entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } },
});

// Get one orgLimit
const { data: item } = useOrgLimitQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, entityId: true, entityType: true, id: true, max: true, name: true, num: true, organizationId: true, periodCredits: true, planMax: true, purchasedCredits: true, softMax: true, windowDuration: true, windowStart: true } },
});

// Create a orgLimit
const { mutate: create } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', entityId: '<UUID>', entityType: '<String>', max: '<BigInt>', name: '<String>', num: '<BigInt>', organizationId: '<UUID>', periodCredits: '<BigInt>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', softMax: '<BigInt>', windowDuration: '<Interval>', windowStart: '<Datetime>' });
```

### OrgLimitCredit

```typescript
// List all orgLimitCredits
const { data, isLoading } = useOrgLimitCreditsQuery({
  selection: { fields: { actorId: true, amount: true, creditType: true, defaultLimitId: true, entityId: true, entityType: true, id: true, organizationId: true, reason: true } },
});

// Get one orgLimitCredit
const { data: item } = useOrgLimitCreditQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, amount: true, creditType: true, defaultLimitId: true, entityId: true, entityType: true, id: true, organizationId: true, reason: true } },
});

// Create a orgLimitCredit
const { mutate: create } = useCreateOrgLimitCreditMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', amount: '<BigInt>', creditType: '<String>', defaultLimitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', organizationId: '<UUID>', reason: '<String>' });
```

### OrgLimitDefault

```typescript
// List all orgLimitDefaults
const { data, isLoading } = useOrgLimitDefaultsQuery({
  selection: { fields: { id: true, max: true, name: true, softMax: true } },
});

// Get one orgLimitDefault
const { data: item } = useOrgLimitDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, max: true, name: true, softMax: true } },
});

// Create a orgLimitDefault
const { mutate: create } = useCreateOrgLimitDefaultMutation({
  selection: { fields: { id: true } },
});
create({ max: '<BigInt>', name: '<String>', softMax: '<BigInt>' });
```

### OrgLimitEvent

```typescript
// List all orgLimitEvents
const { data, isLoading } = useOrgLimitEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } },
});

// Get one orgLimitEvent
const { data: item } = useOrgLimitEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, delta: true, entityId: true, entityType: true, eventType: true, id: true, maxAtEvent: true, name: true, numAfter: true, numBefore: true, organizationId: true, reason: true } },
});

// Create a orgLimitEvent
const { mutate: create } = useCreateOrgLimitEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', delta: '<BigInt>', entityId: '<UUID>', entityType: '<String>', eventType: '<String>', maxAtEvent: '<BigInt>', name: '<String>', numAfter: '<BigInt>', numBefore: '<BigInt>', organizationId: '<UUID>', reason: '<String>' });
```

### OrgLimitWarning

```typescript
// List all orgLimitWarnings
const { data, isLoading } = useOrgLimitWarningsQuery({
  selection: { fields: { entityId: true, id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } },
});

// Get one orgLimitWarning
const { data: item } = useOrgLimitWarningQuery({
  id: '<UUID>',
  selection: { fields: { entityId: true, id: true, name: true, taskIdentifier: true, thresholdValue: true, warningType: true } },
});

// Create a orgLimitWarning
const { mutate: create } = useCreateOrgLimitWarningMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', name: '<String>', taskIdentifier: '<String>', thresholdValue: '<BigInt>', warningType: '<String>' });
```

### PlanCap

```typescript
// List all planCaps
const { data, isLoading } = usePlanCapsQuery({
  selection: { fields: { capName: true, capValue: true, id: true, planId: true } },
});

// Get one planCap
const { data: item } = usePlanCapQuery({
  id: '<UUID>',
  selection: { fields: { capName: true, capValue: true, id: true, planId: true } },
});

// Create a planCap
const { mutate: create } = useCreatePlanCapMutation({
  selection: { fields: { id: true } },
});
create({ capName: '<String>', capValue: '<BigInt>', planId: '<UUID>' });
```

### Plan

```typescript
// List all plans
const { data, isLoading } = usePlansQuery({
  selection: { fields: { description: true, id: true, isActive: true, name: true } },
});

// Get one plan
const { data: item } = usePlanQuery({
  id: '<UUID>',
  selection: { fields: { description: true, id: true, isActive: true, name: true } },
});

// Create a plan
const { mutate: create } = useCreatePlanMutation({
  selection: { fields: { id: true } },
});
create({ description: '<String>', isActive: '<Boolean>', name: '<String>' });
```

### PlanLimit

```typescript
// List all planLimits
const { data, isLoading } = usePlanLimitsQuery({
  selection: { fields: { id: true, limitName: true, maxValue: true, planId: true } },
});

// Get one planLimit
const { data: item } = usePlanLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, limitName: true, maxValue: true, planId: true } },
});

// Create a planLimit
const { mutate: create } = useCreatePlanLimitMutation({
  selection: { fields: { id: true } },
});
create({ limitName: '<String>', maxValue: '<BigInt>', planId: '<UUID>' });
```

### PlanMeterLimit

```typescript
// List all planMeterLimits
const { data, isLoading } = usePlanMeterLimitsQuery({
  selection: { fields: { id: true, meterSlug: true, planId: true, planLimit: true } },
});

// Get one planMeterLimit
const { data: item } = usePlanMeterLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, meterSlug: true, planId: true, planLimit: true } },
});

// Create a planMeterLimit
const { mutate: create } = useCreatePlanMeterLimitMutation({
  selection: { fields: { id: true } },
});
create({ meterSlug: '<String>', planId: '<UUID>', planLimit: '<BigInt>' });
```

### PlanOverride

```typescript
// List all planOverrides
const { data, isLoading } = usePlanOverridesQuery({
  selection: { fields: { entityId: true, expiresAt: true, id: true, limitName: true, maxValue: true, reason: true } },
});

// Get one planOverride
const { data: item } = usePlanOverrideQuery({
  id: '<UUID>',
  selection: { fields: { entityId: true, expiresAt: true, id: true, limitName: true, maxValue: true, reason: true } },
});

// Create a planOverride
const { mutate: create } = useCreatePlanOverrideMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', expiresAt: '<Datetime>', limitName: '<String>', maxValue: '<BigInt>', reason: '<String>' });
```

### PlanPricing

```typescript
// List all planPricings
const { data, isLoading } = usePlanPricingsQuery({
  selection: { fields: { billingInterval: true, currency: true, discountPercent: true, id: true, isActive: true, planId: true, price: true } },
});

// Get one planPricing
const { data: item } = usePlanPricingQuery({
  id: '<UUID>',
  selection: { fields: { billingInterval: true, currency: true, discountPercent: true, id: true, isActive: true, planId: true, price: true } },
});

// Create a planPricing
const { mutate: create } = useCreatePlanPricingMutation({
  selection: { fields: { id: true } },
});
create({ billingInterval: '<String>', currency: '<String>', discountPercent: '<BigFloat>', isActive: '<Boolean>', planId: '<UUID>', price: '<BigInt>' });
```

### PlanSubscription

```typescript
// List all planSubscriptions
const { data, isLoading } = usePlanSubscriptionsQuery({
  selection: { fields: { endsAt: true, entityId: true, entityType: true, id: true, isActive: true, organizationId: true, planId: true, startsAt: true } },
});

// Get one planSubscription
const { data: item } = usePlanSubscriptionQuery({
  id: '<UUID>',
  selection: { fields: { endsAt: true, entityId: true, entityType: true, id: true, isActive: true, organizationId: true, planId: true, startsAt: true } },
});

// Create a planSubscription
const { mutate: create } = useCreatePlanSubscriptionMutation({
  selection: { fields: { id: true } },
});
create({ endsAt: '<Datetime>', entityId: '<UUID>', entityType: '<String>', isActive: '<Boolean>', organizationId: '<UUID>', planId: '<UUID>', startsAt: '<Datetime>' });
```

## Custom Operation Hooks

### `useCaptureAppLimitDefaultsQuery`

captureAppLimitDefaults

- **Type:** query
- **Arguments:** none

### `useCaptureOrgLimitDefaultsQuery`

captureOrgLimitDefaults

- **Type:** query
- **Arguments:** none

### `useCaptureTrustLadderQuery`

captureTrustLadder

- **Type:** query
- **Arguments:** none

### `useEventsAchievedQuery`

eventsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `level` | String |
  | `roleId` | UUID |

### `useEventsRequiredQuery`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `after` | Cursor |
  | `first` | Int |
  | `level` | String |
  | `offset` | Int |
  | `roleId` | UUID |

### `useGrantAchievementMutation`

grantAchievement

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | GrantAchievementInput (required) |

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

### `useRecomputeCapabilitiesMutation`

recomputeCapabilities

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RecomputeCapabilitiesInput (required) |

### `useRevokeAchievementMutation`

revokeAchievement

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | RevokeAchievementInput (required) |

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

### `useSeedMeterDefaultsMutation`

seedMeterDefaults

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedMeterDefaultsInput (required) |

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

### `useSeedPlanMutation`

seedPlan

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedPlanInput (required) |

### `useSeedTrustLadderMutation`

seedTrustLadder

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SeedTrustLadderInput (required) |
