# invite

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for Invite records via csdk CLI

## Usage

```bash
csdk invite list
csdk invite get --id <UUID>
csdk invite create [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
csdk invite update --id <UUID> [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
csdk invite delete --id <UUID>
```

## Examples

### List all invite records

```bash
csdk invite list
```

### Create a invite

```bash
csdk invite create [--email <Email>] [--senderId <UUID>] [--inviteToken <String>] [--inviteValid <Boolean>] [--inviteLimit <Int>] [--inviteCount <Int>] [--multiple <Boolean>] [--data <JSON>] [--expiresAt <Datetime>]
```

### Get a invite by id

```bash
csdk invite get --id <value>
```
