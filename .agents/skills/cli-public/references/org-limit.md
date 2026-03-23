# orgLimit

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for OrgLimit records via csdk CLI

## Usage

```bash
csdk org-limit list
csdk org-limit get --id <UUID>
csdk org-limit create --actorId <UUID> --entityId <UUID> [--name <String>] [--num <Int>] [--max <Int>]
csdk org-limit update --id <UUID> [--name <String>] [--actorId <UUID>] [--num <Int>] [--max <Int>] [--entityId <UUID>]
csdk org-limit delete --id <UUID>
```

## Examples

### List all orgLimit records

```bash
csdk org-limit list
```

### Create a orgLimit

```bash
csdk org-limit create --actorId <UUID> --entityId <UUID> [--name <String>] [--num <Int>] [--max <Int>]
```

### Get a orgLimit by id

```bash
csdk org-limit get --id <value>
```
