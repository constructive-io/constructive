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
| `useOrgGetManagersQuery` | Query | List all orgGetManagers |
| `useCreateOrgGetManagersRecordMutation` | Mutation | Create a orgGetManagersRecord |
| `useOrgGetSubordinatesQuery` | Query | List all orgGetSubordinates |
| `useCreateOrgGetSubordinatesRecordMutation` | Mutation | Create a orgGetSubordinatesRecord |
| `useAppPermissionsQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useAppPermissionQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useCreateAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useUpdateAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useDeleteAppPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useOrgPermissionsQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useOrgPermissionQuery` | Query | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useCreateOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useUpdateOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useDeleteOrgPermissionMutation` | Mutation | Defines available permissions as named bits within a bitmask, used by the RBAC system for access control |
| `useAppLevelRequirementsQuery` | Query | Defines the specific requirements that must be met to achieve a level |
| `useAppLevelRequirementQuery` | Query | Defines the specific requirements that must be met to achieve a level |
| `useCreateAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useUpdateAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useDeleteAppLevelRequirementMutation` | Mutation | Defines the specific requirements that must be met to achieve a level |
| `useAppLimitCreditRedemptionsQuery` | Query | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useAppLimitCreditRedemptionQuery` | Query | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useCreateAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useUpdateAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
| `useDeleteAppLimitCreditRedemptionMutation` | Mutation | Append-only ledger of code redemptions; AFTER INSERT trigger validates and cascades to limit_credits |
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
| `useOrgMembersQuery` | Query | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useOrgMemberQuery` | Query | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useCreateOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useUpdateOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useDeleteOrgMemberMutation` | Mutation | Simplified view of active members in an entity, used for listing who belongs to an org or group |
| `useAppPermissionDefaultsQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useAppPermissionDefaultQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useCreateAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useUpdateAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useDeleteAppPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useAppLimitCreditCodesQuery` | Query | Redeemable credit codes managed by admins with the add_credits permission |
| `useAppLimitCreditCodeQuery` | Query | Redeemable credit codes managed by admins with the add_credits permission |
| `useCreateAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useUpdateAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useDeleteAppLimitCreditCodeMutation` | Mutation | Redeemable credit codes managed by admins with the add_credits permission |
| `useOrgPermissionDefaultsQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useOrgPermissionDefaultQuery` | Query | Stores the default permission bitmask assigned to new members upon joining |
| `useCreateOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useUpdateOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useDeleteOrgPermissionDefaultMutation` | Mutation | Stores the default permission bitmask assigned to new members upon joining |
| `useAppAdminGrantsQuery` | Query | Records of admin role grants and revocations between members |
| `useAppAdminGrantQuery` | Query | Records of admin role grants and revocations between members |
| `useCreateAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useUpdateAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useDeleteAppAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useAppOwnerGrantsQuery` | Query | Records of ownership transfers and grants between members |
| `useAppOwnerGrantQuery` | Query | Records of ownership transfers and grants between members |
| `useCreateAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useUpdateAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useDeleteAppOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useAppAchievementsQuery` | Query | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useAppAchievementQuery` | Query | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useCreateAppAchievementMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useUpdateAppAchievementMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useDeleteAppAchievementMutation` | Mutation | Aggregated user progress for level requirements, tallying the total count; updated via triggers and should not be modified manually |
| `useAppStepsQuery` | Query | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useAppStepQuery` | Query | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useCreateAppStepMutation` | Mutation | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useUpdateAppStepMutation` | Mutation | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
| `useDeleteAppStepMutation` | Mutation | Log of individual user actions toward level requirements; every single step ever taken is recorded here |
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
| `useOrgAdminGrantsQuery` | Query | Records of admin role grants and revocations between members |
| `useOrgAdminGrantQuery` | Query | Records of admin role grants and revocations between members |
| `useCreateOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useUpdateOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useDeleteOrgAdminGrantMutation` | Mutation | Records of admin role grants and revocations between members |
| `useOrgOwnerGrantsQuery` | Query | Records of ownership transfers and grants between members |
| `useOrgOwnerGrantQuery` | Query | Records of ownership transfers and grants between members |
| `useCreateOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useUpdateOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useDeleteOrgOwnerGrantMutation` | Mutation | Records of ownership transfers and grants between members |
| `useMembershipTypesQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useMembershipTypeQuery` | Query | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useCreateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useUpdateMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useDeleteMembershipTypeMutation` | Mutation | Defines the different scopes of membership (e.g. App Member, Organization Member, Group Member) |
| `useAppLimitDefaultsQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useAppLimitDefaultQuery` | Query | Default maximum values for each named limit, applied when no per-actor override exists |
| `useCreateAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useUpdateAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
| `useDeleteAppLimitDefaultMutation` | Mutation | Default maximum values for each named limit, applied when no per-actor override exists |
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
| `useOrgChartEdgeGrantsQuery` | Query | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useOrgChartEdgeGrantQuery` | Query | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useCreateOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useUpdateOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useDeleteOrgChartEdgeGrantMutation` | Mutation | Append-only log of hierarchy edge grants and revocations; triggers apply changes to the edges table |
| `useAppClaimedInvitesQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useAppClaimedInviteQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useCreateAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useUpdateAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useDeleteAppClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useAppGrantsQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useAppGrantQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useCreateAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useUpdateAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useDeleteAppGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useAppMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useAppMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteAppMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgMembershipDefaultsQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgMembershipDefaultQuery` | Query | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useCreateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useUpdateOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useDeleteOrgMembershipDefaultMutation` | Mutation | Default membership settings per entity, controlling initial approval and verification state for new members |
| `useOrgClaimedInvitesQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useOrgClaimedInviteQuery` | Query | Records of successfully claimed invitations, linking senders to receivers |
| `useCreateOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useUpdateOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useDeleteOrgClaimedInviteMutation` | Mutation | Records of successfully claimed invitations, linking senders to receivers |
| `useAppLimitEventsQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useCreateAppLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useOrgLimitEventsQuery` | Query | Append-only log of limit events for historical reporting and audit |
| `useCreateOrgLimitEventMutation` | Mutation | Append-only log of limit events for historical reporting and audit |
| `useOrgGrantsQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useOrgGrantQuery` | Query | Records of individual permission grants and revocations for members via bitmask |
| `useCreateOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useUpdateOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useDeleteOrgGrantMutation` | Mutation | Records of individual permission grants and revocations for members via bitmask |
| `useOrgChartEdgesQuery` | Query | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useOrgChartEdgeQuery` | Query | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useCreateOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useUpdateOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useDeleteOrgChartEdgeMutation` | Mutation | Organizational chart edges defining parent-child reporting relationships between members within an entity |
| `useUsageSnapshotsQuery` | Query | Periodic snapshot of a single metric for a database. Collected by the snapshot_usage() cron job in constructive-limits. Each row records one metric measurement (e.g. reads, writes, storage_bytes) at a point in time, with optional dimensions for sub-metric breakdowns. |
| `useUsageSnapshotQuery` | Query | Periodic snapshot of a single metric for a database. Collected by the snapshot_usage() cron job in constructive-limits. Each row records one metric measurement (e.g. reads, writes, storage_bytes) at a point in time, with optional dimensions for sub-metric breakdowns. |
| `useCreateUsageSnapshotMutation` | Mutation | Periodic snapshot of a single metric for a database. Collected by the snapshot_usage() cron job in constructive-limits. Each row records one metric measurement (e.g. reads, writes, storage_bytes) at a point in time, with optional dimensions for sub-metric breakdowns. |
| `useUpdateUsageSnapshotMutation` | Mutation | Periodic snapshot of a single metric for a database. Collected by the snapshot_usage() cron job in constructive-limits. Each row records one metric measurement (e.g. reads, writes, storage_bytes) at a point in time, with optional dimensions for sub-metric breakdowns. |
| `useDeleteUsageSnapshotMutation` | Mutation | Periodic snapshot of a single metric for a database. Collected by the snapshot_usage() cron job in constructive-limits. Each row records one metric measurement (e.g. reads, writes, storage_bytes) at a point in time, with optional dimensions for sub-metric breakdowns. |
| `useOrgMemberProfilesQuery` | Query | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useOrgMemberProfileQuery` | Query | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useCreateOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useUpdateOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useDeleteOrgMemberProfileMutation` | Mutation | Per-membership profile information visible to other entity members (display name, email, title, bio, avatar) |
| `useAppLevelsQuery` | Query | Defines available levels that users can achieve by completing requirements |
| `useAppLevelQuery` | Query | Defines available levels that users can achieve by completing requirements |
| `useCreateAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useUpdateAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useDeleteAppLevelMutation` | Mutation | Defines available levels that users can achieve by completing requirements |
| `useAppLimitsQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useAppLimitQuery` | Query | Tracks per-actor usage counts against configurable maximum limits |
| `useCreateAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useUpdateAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useDeleteAppLimitMutation` | Mutation | Tracks per-actor usage counts against configurable maximum limits |
| `useAppInvitesQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useAppInviteQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useCreateAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useUpdateAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useDeleteAppInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useOrgMembershipSettingsQuery` | Query | Per-entity settings for the memberships module |
| `useOrgMembershipSettingQuery` | Query | Per-entity settings for the memberships module |
| `useCreateOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
| `useUpdateOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
| `useDeleteOrgMembershipSettingMutation` | Mutation | Per-entity settings for the memberships module |
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
| `useAppMembershipsQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useAppMembershipQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useCreateAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useUpdateAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useDeleteAppMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useOrgInvitesQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useOrgInviteQuery` | Query | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useCreateOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useUpdateOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useDeleteOrgInviteMutation` | Mutation | Invitation records sent to prospective members via email, with token-based redemption and expiration |
| `useOrgMembershipsQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useOrgMembershipQuery` | Query | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useCreateOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useUpdateOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useDeleteOrgMembershipMutation` | Mutation | Tracks membership records linking actors to entities with permission bitmasks, ownership, and admin status |
| `useAppPermissionsGetPaddedMaskQuery` | Query | appPermissionsGetPaddedMask |
| `useOrgPermissionsGetPaddedMaskQuery` | Query | orgPermissionsGetPaddedMask |
| `useOrgIsManagerOfQuery` | Query | orgIsManagerOf |
| `useAppPermissionsGetMaskQuery` | Query | appPermissionsGetMask |
| `useOrgPermissionsGetMaskQuery` | Query | orgPermissionsGetMask |
| `useStepsAchievedQuery` | Query | stepsAchieved |
| `useAppPermissionsGetMaskByNamesQuery` | Query | appPermissionsGetMaskByNames |
| `useOrgPermissionsGetMaskByNamesQuery` | Query | orgPermissionsGetMaskByNames |
| `useAppPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `AppPermission`. |
| `useOrgPermissionsGetByMaskQuery` | Query | Reads and enables pagination through a set of `OrgPermission`. |
| `useStepsRequiredQuery` | Query | Reads and enables pagination through a set of `AppLevelRequirement`. |
| `useSubmitAppInviteCodeMutation` | Mutation | submitAppInviteCode |
| `useSubmitOrgInviteCodeMutation` | Mutation | submitOrgInviteCode |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### OrgGetManagersRecord

```typescript
// List all orgGetManagers
const { data, isLoading } = useOrgGetManagersQuery({
  selection: { fields: { userId: true, depth: true } },
});

// Create a orgGetManagersRecord
const { mutate: create } = useCreateOrgGetManagersRecordMutation({
  selection: { fields: { id: true } },
});
create({ userId: '<UUID>', depth: '<Int>' });
```

### OrgGetSubordinatesRecord

```typescript
// List all orgGetSubordinates
const { data, isLoading } = useOrgGetSubordinatesQuery({
  selection: { fields: { userId: true, depth: true } },
});

// Create a orgGetSubordinatesRecord
const { mutate: create } = useCreateOrgGetSubordinatesRecordMutation({
  selection: { fields: { id: true } },
});
create({ userId: '<UUID>', depth: '<Int>' });
```

### AppPermission

```typescript
// List all appPermissions
const { data, isLoading } = useAppPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one appPermission
const { data: item } = useAppPermissionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a appPermission
const { mutate: create } = useCreateAppPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' });
```

### OrgPermission

```typescript
// List all orgPermissions
const { data, isLoading } = useOrgPermissionsQuery({
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Get one orgPermission
const { data: item } = useOrgPermissionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, bitnum: true, bitstr: true, description: true } },
});

// Create a orgPermission
const { mutate: create } = useCreateOrgPermissionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', bitnum: '<Int>', bitstr: '<BitString>', description: '<String>' });
```

### AppLevelRequirement

```typescript
// List all appLevelRequirements
const { data, isLoading } = useAppLevelRequirementsQuery({
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});

// Get one appLevelRequirement
const { data: item } = useAppLevelRequirementQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, level: true, description: true, requiredCount: true, priority: true, createdAt: true, updatedAt: true } },
});

// Create a appLevelRequirement
const { mutate: create } = useCreateAppLevelRequirementMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', level: '<String>', description: '<String>', requiredCount: '<Int>', priority: '<Int>' });
```

### AppLimitCreditRedemption

```typescript
// List all appLimitCreditRedemptions
const { data, isLoading } = useAppLimitCreditRedemptionsQuery({
  selection: { fields: { id: true, creditCodeId: true, entityId: true } },
});

// Get one appLimitCreditRedemption
const { data: item } = useAppLimitCreditRedemptionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, creditCodeId: true, entityId: true } },
});

// Create a appLimitCreditRedemption
const { mutate: create } = useCreateAppLimitCreditRedemptionMutation({
  selection: { fields: { id: true } },
});
create({ creditCodeId: '<UUID>', entityId: '<UUID>' });
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

### OrgMember

```typescript
// List all orgMembers
const { data, isLoading } = useOrgMembersQuery({
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Get one orgMember
const { data: item } = useOrgMemberQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isAdmin: true, actorId: true, entityId: true } },
});

// Create a orgMember
const { mutate: create } = useCreateOrgMemberMutation({
  selection: { fields: { id: true } },
});
create({ isAdmin: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>' });
```

### AppPermissionDefault

```typescript
// List all appPermissionDefaults
const { data, isLoading } = useAppPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true } },
});

// Get one appPermissionDefault
const { data: item } = useAppPermissionDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true } },
});

// Create a appPermissionDefault
const { mutate: create } = useCreateAppPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>' });
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

### OrgPermissionDefault

```typescript
// List all orgPermissionDefaults
const { data, isLoading } = useOrgPermissionDefaultsQuery({
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Get one orgPermissionDefault
const { data: item } = useOrgPermissionDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, entityId: true } },
});

// Create a orgPermissionDefault
const { mutate: create } = useCreateOrgPermissionDefaultMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', entityId: '<UUID>' });
```

### AppAdminGrant

```typescript
// List all appAdminGrants
const { data, isLoading } = useAppAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appAdminGrant
const { data: item } = useAppAdminGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appAdminGrant
const { mutate: create } = useCreateAppAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### AppOwnerGrant

```typescript
// List all appOwnerGrants
const { data, isLoading } = useAppOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appOwnerGrant
const { data: item } = useAppOwnerGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appOwnerGrant
const { mutate: create } = useCreateAppOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### AppAchievement

```typescript
// List all appAchievements
const { data, isLoading } = useAppAchievementsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Get one appAchievement
const { data: item } = useAppAchievementQuery({
  id: '<UUID>',
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Create a appAchievement
const { mutate: create } = useCreateAppAchievementMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', name: '<String>', count: '<Int>' });
```

### AppStep

```typescript
// List all appSteps
const { data, isLoading } = useAppStepsQuery({
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Get one appStep
const { data: item } = useAppStepQuery({
  id: '<UUID>',
  selection: { fields: { id: true, actorId: true, name: true, count: true, createdAt: true, updatedAt: true } },
});

// Create a appStep
const { mutate: create } = useCreateAppStepMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', name: '<String>', count: '<Int>' });
```

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

### OrgAdminGrant

```typescript
// List all orgAdminGrants
const { data, isLoading } = useOrgAdminGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgAdminGrant
const { data: item } = useOrgAdminGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgAdminGrant
const { mutate: create } = useCreateOrgAdminGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### OrgOwnerGrant

```typescript
// List all orgOwnerGrants
const { data, isLoading } = useOrgOwnerGrantsQuery({
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgOwnerGrant
const { data: item } = useOrgOwnerGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgOwnerGrant
const { mutate: create } = useCreateOrgOwnerGrantMutation({
  selection: { fields: { id: true } },
});
create({ isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### MembershipType

```typescript
// List all membershipTypes
const { data, isLoading } = useMembershipTypesQuery({
  selection: { fields: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } },
});

// Get one membershipType
const { data: item } = useMembershipTypeQuery({
  id: '<Int>',
  selection: { fields: { id: true, name: true, description: true, prefix: true, parentMembershipType: true, hasUsersTableEntry: true } },
});

// Create a membershipType
const { mutate: create } = useCreateMembershipTypeMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', description: '<String>', prefix: '<String>', parentMembershipType: '<Int>', hasUsersTableEntry: '<Boolean>' });
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
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, amount: true, creditType: true, reason: true } },
});

// Get one orgLimitCredit
const { data: item } = useOrgLimitCreditQuery({
  id: '<UUID>',
  selection: { fields: { id: true, defaultLimitId: true, actorId: true, entityId: true, amount: true, creditType: true, reason: true } },
});

// Create a orgLimitCredit
const { mutate: create } = useCreateOrgLimitCreditMutation({
  selection: { fields: { id: true } },
});
create({ defaultLimitId: '<UUID>', actorId: '<UUID>', entityId: '<UUID>', amount: '<BigInt>', creditType: '<String>', reason: '<String>' });
```

### OrgChartEdgeGrant

```typescript
// List all orgChartEdgeGrants
const { data, isLoading } = useOrgChartEdgeGrantsQuery({
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } },
});

// Get one orgChartEdgeGrant
const { data: item } = useOrgChartEdgeGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, entityId: true, childId: true, parentId: true, grantorId: true, isGrant: true, positionTitle: true, positionLevel: true, createdAt: true } },
});

// Create a orgChartEdgeGrant
const { mutate: create } = useCreateOrgChartEdgeGrantMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', grantorId: '<UUID>', isGrant: '<Boolean>', positionTitle: '<String>', positionLevel: '<Int>' });
```

### AppClaimedInvite

```typescript
// List all appClaimedInvites
const { data, isLoading } = useAppClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Get one appClaimedInvite
const { data: item } = useAppClaimedInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true } },
});

// Create a appClaimedInvite
const { mutate: create } = useCreateAppClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>' });
```

### AppGrant

```typescript
// List all appGrants
const { data, isLoading } = useAppGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one appGrant
const { data: item } = useAppGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a appGrant
const { mutate: create } = useCreateAppGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', grantorId: '<UUID>' });
```

### AppMembershipDefault

```typescript
// List all appMembershipDefaults
const { data, isLoading } = useAppMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Get one appMembershipDefault
const { data: item } = useAppMembershipDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isVerified: true } },
});

// Create a appMembershipDefault
const { mutate: create } = useCreateAppMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isVerified: '<Boolean>' });
```

### OrgMembershipDefault

```typescript
// List all orgMembershipDefaults
const { data, isLoading } = useOrgMembershipDefaultsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } },
});

// Get one orgMembershipDefault
const { data: item } = useOrgMembershipDefaultQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, entityId: true } },
});

// Create a orgMembershipDefault
const { mutate: create } = useCreateOrgMembershipDefaultMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', entityId: '<UUID>' });
```

### OrgClaimedInvite

```typescript
// List all orgClaimedInvites
const { data, isLoading } = useOrgClaimedInvitesQuery({
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgClaimedInvite
const { data: item } = useOrgClaimedInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, data: true, senderId: true, receiverId: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgClaimedInvite
const { mutate: create } = useCreateOrgClaimedInviteMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', senderId: '<UUID>', receiverId: '<UUID>', entityId: '<UUID>' });
```

### AppLimitEvent

```typescript
// List all appLimitEvents
const { data, isLoading } = useAppLimitEventsQuery({
  selection: { fields: { name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Create a appLimitEvent
const { mutate: create } = useCreateAppLimitEventMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', entityId: '<UUID>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' });
```

### OrgLimitEvent

```typescript
// List all orgLimitEvents
const { data, isLoading } = useOrgLimitEventsQuery({
  selection: { fields: { name: true, actorId: true, entityId: true, eventType: true, delta: true, numBefore: true, numAfter: true, maxAtEvent: true, reason: true } },
});

// Create a orgLimitEvent
const { mutate: create } = useCreateOrgLimitEventMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', entityId: '<UUID>', eventType: '<String>', delta: '<BigInt>', numBefore: '<BigInt>', numAfter: '<BigInt>', maxAtEvent: '<BigInt>', reason: '<String>' });
```

### OrgGrant

```typescript
// List all orgGrants
const { data, isLoading } = useOrgGrantsQuery({
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Get one orgGrant
const { data: item } = useOrgGrantQuery({
  id: '<UUID>',
  selection: { fields: { id: true, permissions: true, isGrant: true, actorId: true, entityId: true, grantorId: true, createdAt: true, updatedAt: true } },
});

// Create a orgGrant
const { mutate: create } = useCreateOrgGrantMutation({
  selection: { fields: { id: true } },
});
create({ permissions: '<BitString>', isGrant: '<Boolean>', actorId: '<UUID>', entityId: '<UUID>', grantorId: '<UUID>' });
```

### OrgChartEdge

```typescript
// List all orgChartEdges
const { data, isLoading } = useOrgChartEdgesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } },
});

// Get one orgChartEdge
const { data: item } = useOrgChartEdgeQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, entityId: true, childId: true, parentId: true, positionTitle: true, positionLevel: true } },
});

// Create a orgChartEdge
const { mutate: create } = useCreateOrgChartEdgeMutation({
  selection: { fields: { id: true } },
});
create({ entityId: '<UUID>', childId: '<UUID>', parentId: '<UUID>', positionTitle: '<String>', positionLevel: '<Int>' });
```

### UsageSnapshot

```typescript
// List all usageSnapshots
const { data, isLoading } = useUsageSnapshotsQuery({
  selection: { fields: { databaseId: true, metricName: true, metricValue: true, dimensions: true, capturedAt: true, id: true } },
});

// Get one usageSnapshot
const { data: item } = useUsageSnapshotQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, metricName: true, metricValue: true, dimensions: true, capturedAt: true, id: true } },
});

// Create a usageSnapshot
const { mutate: create } = useCreateUsageSnapshotMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', metricName: '<String>', metricValue: '<BigInt>', dimensions: '<JSON>', capturedAt: '<Datetime>' });
```

### OrgMemberProfile

```typescript
// List all orgMemberProfiles
const { data, isLoading } = useOrgMemberProfilesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } },
});

// Get one orgMemberProfile
const { data: item } = useOrgMemberProfileQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, membershipId: true, entityId: true, actorId: true, displayName: true, email: true, title: true, bio: true, profilePicture: true } },
});

// Create a orgMemberProfile
const { mutate: create } = useCreateOrgMemberProfileMutation({
  selection: { fields: { id: true } },
});
create({ membershipId: '<UUID>', entityId: '<UUID>', actorId: '<UUID>', displayName: '<String>', email: '<String>', title: '<String>', bio: '<String>', profilePicture: '<Image>' });
```

### AppLevel

```typescript
// List all appLevels
const { data, isLoading } = useAppLevelsQuery({
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});

// Get one appLevel
const { data: item } = useAppLevelQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, description: true, image: true, ownerId: true, createdAt: true, updatedAt: true } },
});

// Create a appLevel
const { mutate: create } = useCreateAppLevelMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', description: '<String>', image: '<Image>', ownerId: '<UUID>' });
```

### AppLimit

```typescript
// List all appLimits
const { data, isLoading } = useAppLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true } },
});

// Get one appLimit
const { data: item } = useAppLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true } },
});

// Create a appLimit
const { mutate: create } = useCreateAppLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>' });
```

### AppInvite

```typescript
// List all appInvites
const { data, isLoading } = useAppInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Get one appInvite
const { data: item } = useAppInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, email: true, senderId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, expiresAt: true, createdAt: true, updatedAt: true } },
});

// Create a appInvite
const { mutate: create } = useCreateAppInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<Email>', senderId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', profileId: '<UUID>', expiresAt: '<Datetime>' });
```

### OrgMembershipSetting

```typescript
// List all orgMembershipSettings
const { data, isLoading } = useOrgMembershipSettingsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, inviteProfileAssignmentMode: true, populateMemberEmail: true, limitAllocationMode: true } },
});

// Get one orgMembershipSetting
const { data: item } = useOrgMembershipSettingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, entityId: true, deleteMemberCascadeChildren: true, createChildCascadeOwners: true, createChildCascadeAdmins: true, createChildCascadeMembers: true, allowExternalMembers: true, inviteProfileAssignmentMode: true, populateMemberEmail: true, limitAllocationMode: true } },
});

// Create a orgMembershipSetting
const { mutate: create } = useCreateOrgMembershipSettingMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', entityId: '<UUID>', deleteMemberCascadeChildren: '<Boolean>', createChildCascadeOwners: '<Boolean>', createChildCascadeAdmins: '<Boolean>', createChildCascadeMembers: '<Boolean>', allowExternalMembers: '<Boolean>', inviteProfileAssignmentMode: '<String>', populateMemberEmail: '<Boolean>', limitAllocationMode: '<String>' });
```

### OrgLimitAggregate

```typescript
// List all orgLimitAggregates
const { data, isLoading } = useOrgLimitAggregatesQuery({
  selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true } },
});

// Get one orgLimitAggregate
const { data: item } = useOrgLimitAggregateQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, entityId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, reserved: true } },
});

// Create a orgLimitAggregate
const { mutate: create } = useCreateOrgLimitAggregateMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', entityId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', reserved: '<BigInt>' });
```

### OrgLimit

```typescript
// List all orgLimits
const { data, isLoading } = useOrgLimitsQuery({
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, entityId: true } },
});

// Get one orgLimit
const { data: item } = useOrgLimitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, actorId: true, num: true, max: true, softMax: true, windowStart: true, windowDuration: true, planMax: true, purchasedCredits: true, periodCredits: true, entityId: true } },
});

// Create a orgLimit
const { mutate: create } = useCreateOrgLimitMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', actorId: '<UUID>', num: '<BigInt>', max: '<BigInt>', softMax: '<BigInt>', windowStart: '<Datetime>', windowDuration: '<Interval>', planMax: '<BigInt>', purchasedCredits: '<BigInt>', periodCredits: '<BigInt>', entityId: '<UUID>' });
```

### AppMembership

```typescript
// List all appMemberships
const { data, isLoading } = useAppMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});

// Get one appMembership
const { data: item } = useAppMembershipQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isVerified: true, isActive: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, profileId: true } },
});

// Create a appMembership
const { mutate: create } = useCreateAppMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isVerified: '<Boolean>', isActive: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', profileId: '<UUID>' });
```

### OrgInvite

```typescript
// List all orgInvites
const { data, isLoading } = useOrgInvitesQuery({
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, isReadOnly: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Get one orgInvite
const { data: item } = useOrgInviteQuery({
  id: '<UUID>',
  selection: { fields: { id: true, email: true, senderId: true, receiverId: true, inviteToken: true, inviteValid: true, inviteLimit: true, inviteCount: true, multiple: true, data: true, profileId: true, isReadOnly: true, expiresAt: true, createdAt: true, updatedAt: true, entityId: true } },
});

// Create a orgInvite
const { mutate: create } = useCreateOrgInviteMutation({
  selection: { fields: { id: true } },
});
create({ email: '<Email>', senderId: '<UUID>', receiverId: '<UUID>', inviteToken: '<String>', inviteValid: '<Boolean>', inviteLimit: '<Int>', inviteCount: '<Int>', multiple: '<Boolean>', data: '<JSON>', profileId: '<UUID>', isReadOnly: '<Boolean>', expiresAt: '<Datetime>', entityId: '<UUID>' });
```

### OrgMembership

```typescript
// List all orgMemberships
const { data, isLoading } = useOrgMembershipsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isExternal: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, isReadOnly: true, profileId: true } },
});

// Get one orgMembership
const { data: item } = useOrgMembershipQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, isApproved: true, isBanned: true, isDisabled: true, isActive: true, isExternal: true, isOwner: true, isAdmin: true, permissions: true, granted: true, actorId: true, entityId: true, isReadOnly: true, profileId: true } },
});

// Create a orgMembership
const { mutate: create } = useCreateOrgMembershipMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', isApproved: '<Boolean>', isBanned: '<Boolean>', isDisabled: '<Boolean>', isActive: '<Boolean>', isExternal: '<Boolean>', isOwner: '<Boolean>', isAdmin: '<Boolean>', permissions: '<BitString>', granted: '<BitString>', actorId: '<UUID>', entityId: '<UUID>', isReadOnly: '<Boolean>', profileId: '<UUID>' });
```

## Custom Operation Hooks

### `useAppPermissionsGetPaddedMaskQuery`

appPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

### `useOrgPermissionsGetPaddedMaskQuery`

orgPermissionsGetPaddedMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |

### `useOrgIsManagerOfQuery`

orgIsManagerOf

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `pEntityId` | UUID |
  | `pManagerId` | UUID |
  | `pUserId` | UUID |
  | `pMaxDepth` | Int |

### `useAppPermissionsGetMaskQuery`

appPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

### `useOrgPermissionsGetMaskQuery`

orgPermissionsGetMask

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `ids` | [UUID] |

### `useStepsAchievedQuery`

stepsAchieved

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `level` | String |
  | `roleId` | UUID |

### `useAppPermissionsGetMaskByNamesQuery`

appPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

### `useOrgPermissionsGetMaskByNamesQuery`

orgPermissionsGetMaskByNames

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `names` | [String] |

### `useAppPermissionsGetByMaskQuery`

Reads and enables pagination through a set of `AppPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useOrgPermissionsGetByMaskQuery`

Reads and enables pagination through a set of `OrgPermission`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `mask` | BitString |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useStepsRequiredQuery`

Reads and enables pagination through a set of `AppLevelRequirement`.

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `level` | String |
  | `roleId` | UUID |
  | `first` | Int |
  | `offset` | Int |
  | `after` | Cursor |

### `useSubmitAppInviteCodeMutation`

submitAppInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitAppInviteCodeInput (required) |

### `useSubmitOrgInviteCodeMutation`

submitOrgInviteCode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SubmitOrgInviteCodeInput (required) |

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
