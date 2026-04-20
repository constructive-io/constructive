# orgMembershipSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgMembershipSetting records via csdk CLI

## Usage

```bash
csdk org-membership-setting list
csdk org-membership-setting list --where.<field>.<op> <value> --orderBy <values>
csdk org-membership-setting list --limit 10 --after <cursor>
csdk org-membership-setting find-first --where.<field>.<op> <value>
csdk org-membership-setting get --id <UUID>
csdk org-membership-setting create --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--deleteMemberCascadeChildren <Boolean>] [--createChildCascadeOwners <Boolean>] [--createChildCascadeAdmins <Boolean>] [--createChildCascadeMembers <Boolean>] [--allowExternalMembers <Boolean>] [--populateMemberEmail <Boolean>]
csdk org-membership-setting update --id <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--entityId <UUID>] [--deleteMemberCascadeChildren <Boolean>] [--createChildCascadeOwners <Boolean>] [--createChildCascadeAdmins <Boolean>] [--createChildCascadeMembers <Boolean>] [--allowExternalMembers <Boolean>] [--populateMemberEmail <Boolean>]
csdk org-membership-setting delete --id <UUID>
```

## Examples

### List orgMembershipSetting records

```bash
csdk org-membership-setting list
```

### List orgMembershipSetting records with pagination

```bash
csdk org-membership-setting list --limit 10 --offset 0
```

### List orgMembershipSetting records with cursor pagination

```bash
csdk org-membership-setting list --limit 10 --after <cursor>
```

### Find first matching orgMembershipSetting

```bash
csdk org-membership-setting find-first --where.id.equalTo <value>
```

### List orgMembershipSetting records with field selection

```bash
csdk org-membership-setting list --select id,id
```

### List orgMembershipSetting records with filtering and ordering

```bash
csdk org-membership-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a orgMembershipSetting

```bash
csdk org-membership-setting create --entityId <UUID> [--createdBy <UUID>] [--updatedBy <UUID>] [--deleteMemberCascadeChildren <Boolean>] [--createChildCascadeOwners <Boolean>] [--createChildCascadeAdmins <Boolean>] [--createChildCascadeMembers <Boolean>] [--allowExternalMembers <Boolean>] [--populateMemberEmail <Boolean>]
```

### Get a orgMembershipSetting by id

```bash
csdk org-membership-setting get --id <value>
```
