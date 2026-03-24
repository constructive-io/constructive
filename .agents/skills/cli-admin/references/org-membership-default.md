# orgMembershipDefault

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMembershipDefault records via csdk CLI

## Usage

```bash
csdk org-membership-default list
csdk org-membership-default get --id <UUID>
csdk org-membership-default create --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--deleteMemberCascadeGroups <Boolean>] [--createGroupsCascadeMembers <Boolean>]
csdk org-membership-default update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--entityId <UUID>] [--deleteMemberCascadeGroups <Boolean>] [--createGroupsCascadeMembers <Boolean>]
csdk org-membership-default delete --id <UUID>
```

## Examples

### List all orgMembershipDefault records

```bash
csdk org-membership-default list
```

### Create a orgMembershipDefault

```bash
csdk org-membership-default create --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--isApproved <Boolean>] [--deleteMemberCascadeGroups <Boolean>] [--createGroupsCascadeMembers <Boolean>]
```

### Get a orgMembershipDefault by id

```bash
csdk org-membership-default get --id <value>
```
