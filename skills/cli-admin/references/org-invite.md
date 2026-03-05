# orgInvite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgInvite records via app CLI

## Usage

```bash
app org-invite list
app org-invite get --id <value>
app org-invite create --email <value> --senderId <value> --receiverId <value> --inviteToken <value> --inviteValid <value> --inviteLimit <value> --inviteCount <value> --multiple <value> --data <value> --expiresAt <value> --entityId <value>
app org-invite update --id <value> [--email <value>] [--senderId <value>] [--receiverId <value>] [--inviteToken <value>] [--inviteValid <value>] [--inviteLimit <value>] [--inviteCount <value>] [--multiple <value>] [--data <value>] [--expiresAt <value>] [--entityId <value>]
app org-invite delete --id <value>
```

## Examples

### List all orgInvite records

```bash
app org-invite list
```

### Create a orgInvite

```bash
app org-invite create --email "value" --senderId "value" --receiverId "value" --inviteToken "value" --inviteValid "value" --inviteLimit "value" --inviteCount "value" --multiple "value" --data "value" --expiresAt "value" --entityId "value"
```

### Get a orgInvite by id

```bash
app org-invite get --id <value>
```
