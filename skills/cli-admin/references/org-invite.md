# orgInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgInvite records via csdk CLI

## Usage

```bash
csdk org-invite list
csdk org-invite get --id <value>
csdk org-invite create --entityId <value> --inviteTokenTrgmSimilarity <value> --searchScore <value> [--email <value>] [--senderId <value>] [--receiverId <value>] [--inviteToken <value>] [--inviteValid <value>] [--inviteLimit <value>] [--inviteCount <value>] [--multiple <value>] [--data <value>] [--expiresAt <value>]
csdk org-invite update --id <value> [--email <value>] [--senderId <value>] [--receiverId <value>] [--inviteToken <value>] [--inviteValid <value>] [--inviteLimit <value>] [--inviteCount <value>] [--multiple <value>] [--data <value>] [--expiresAt <value>] [--entityId <value>] [--inviteTokenTrgmSimilarity <value>] [--searchScore <value>]
csdk org-invite delete --id <value>
```

## Examples

### List all orgInvite records

```bash
csdk org-invite list
```

### Create a orgInvite

```bash
csdk org-invite create --entityId <value> --inviteTokenTrgmSimilarity <value> --searchScore <value> [--email <value>] [--senderId <value>] [--receiverId <value>] [--inviteToken <value>] [--inviteValid <value>] [--inviteLimit <value>] [--inviteCount <value>] [--multiple <value>] [--data <value>] [--expiresAt <value>]
```

### Get a orgInvite by id

```bash
csdk org-invite get --id <value>
```
