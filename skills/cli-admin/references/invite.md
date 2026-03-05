# invite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Invite records via app CLI

## Usage

```bash
app invite list
app invite get --id <value>
app invite create --email <value> --senderId <value> --inviteToken <value> --inviteValid <value> --inviteLimit <value> --inviteCount <value> --multiple <value> --data <value> --expiresAt <value>
app invite update --id <value> [--email <value>] [--senderId <value>] [--inviteToken <value>] [--inviteValid <value>] [--inviteLimit <value>] [--inviteCount <value>] [--multiple <value>] [--data <value>] [--expiresAt <value>]
app invite delete --id <value>
```

## Examples

### List all invite records

```bash
app invite list
```

### Create a invite

```bash
app invite create --email "value" --senderId "value" --inviteToken "value" --inviteValid "value" --inviteLimit "value" --inviteCount "value" --multiple "value" --data "value" --expiresAt "value"
```

### Get a invite by id

```bash
app invite get --id <value>
```
