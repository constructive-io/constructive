# orgInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgInvite records via csdk CLI

## Usage

```bash
csdk org-invite list
csdk org-invite get --id <UUID>
csdk org-invite create --entityId <UUID> [--email <Email>] [--senderId <UUID>] [--receiverId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
csdk org-invite update --id <UUID> [--email <Email>] [--senderId <UUID>] [--receiverId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>] [--entityId <UUID>]
csdk org-invite delete --id <UUID>
```

## Examples

### List all orgInvite records

```bash
csdk org-invite list
```

### Create a orgInvite

```bash
csdk org-invite create --entityId <UUID> [--email <Email>] [--senderId <UUID>] [--receiverId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
```

### Get a orgInvite by id

```bash
csdk org-invite get --id <value>
```
