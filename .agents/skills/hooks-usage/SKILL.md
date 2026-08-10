---
name: hooks-usage
description: React Query hooks for the usage API — provides typed query and mutation hooks for 38 tables and 16 custom operations
---

# hooks-usage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the usage API — provides typed query and mutation hooks for 38 tables and 16 custom operations

## Usage

```typescript
// Import hooks
import { useAppAchievementRewardsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useAppAchievementRewardsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useAppAchievementRewardsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [app-achievement-reward](references/app-achievement-reward.md)
- [app-event-aggregate](references/app-event-aggregate.md)
- [app-event](references/app-event.md)
- [app-event-type](references/app-event-type.md)
- [app-level](references/app-level.md)
- [app-level-grant](references/app-level-grant.md)
- [app-level-requirement](references/app-level-requirement.md)
- [app-limit-cap](references/app-limit-cap.md)
- [app-limit-caps-default](references/app-limit-caps-default.md)
- [app-limit](references/app-limit.md)
- [app-limit-credit-code](references/app-limit-credit-code.md)
- [app-limit-credit-code-item](references/app-limit-credit-code-item.md)
- [app-limit-credit](references/app-limit-credit.md)
- [app-limit-credit-redemption](references/app-limit-credit-redemption.md)
- [app-limit-default](references/app-limit-default.md)
- [app-limit-event](references/app-limit-event.md)
- [app-limit-warning](references/app-limit-warning.md)
- [billing-usage-summary](references/billing-usage-summary.md)
- [ledger](references/ledger.md)
- [meter](references/meter.md)
- [meter-credit](references/meter-credit.md)
- [meter-default](references/meter-default.md)
- [meter-source](references/meter-source.md)
- [org-limit-aggregate](references/org-limit-aggregate.md)
- [org-limit-cap](references/org-limit-cap.md)
- [org-limit-caps-default](references/org-limit-caps-default.md)
- [org-limit](references/org-limit.md)
- [org-limit-credit](references/org-limit-credit.md)
- [org-limit-default](references/org-limit-default.md)
- [org-limit-event](references/org-limit-event.md)
- [org-limit-warning](references/org-limit-warning.md)
- [plan-cap](references/plan-cap.md)
- [plan](references/plan.md)
- [plan-limit](references/plan-limit.md)
- [plan-meter-limit](references/plan-meter-limit.md)
- [plan-override](references/plan-override.md)
- [plan-pricing](references/plan-pricing.md)
- [plan-subscription](references/plan-subscription.md)
- [capture-app-limit-defaults](references/capture-app-limit-defaults.md)
- [capture-org-limit-defaults](references/capture-org-limit-defaults.md)
- [capture-trust-ladder](references/capture-trust-ladder.md)
- [events-achieved](references/events-achieved.md)
- [events-required](references/events-required.md)
- [grant-achievement](references/grant-achievement.md)
- [provision-bucket](references/provision-bucket.md)
- [recompute-capabilities](references/recompute-capabilities.md)
- [revoke-achievement](references/revoke-achievement.md)
- [seed-app-limit-caps-defaults](references/seed-app-limit-caps-defaults.md)
- [seed-app-limit-defaults](references/seed-app-limit-defaults.md)
- [seed-meter-defaults](references/seed-meter-defaults.md)
- [seed-org-limit-caps-defaults](references/seed-org-limit-caps-defaults.md)
- [seed-org-limit-defaults](references/seed-org-limit-defaults.md)
- [seed-plan](references/seed-plan.md)
- [seed-trust-ladder](references/seed-trust-ladder.md)
