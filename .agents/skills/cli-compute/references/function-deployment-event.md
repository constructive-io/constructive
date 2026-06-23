# functionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for FunctionDeploymentEvent records via csdk CLI

## Usage

```bash
csdk function-deployment-event list
csdk function-deployment-event list --where.<field>.<op> <value> --orderBy <values>
csdk function-deployment-event list --limit 10 --after <cursor>
csdk function-deployment-event find-first --where.<field>.<op> <value>
csdk function-deployment-event get --id <UUID>
csdk function-deployment-event create --deploymentId <UUID> --eventType <String> --databaseId <UUID> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
csdk function-deployment-event update --id <UUID> [--deploymentId <UUID>] [--eventType <String>] [--actorId <UUID>] [--message <String>] [--metadata <JSON>] [--databaseId <UUID>]
csdk function-deployment-event delete --id <UUID>
```

## Examples

### List functionDeploymentEvent records

```bash
csdk function-deployment-event list
```

### List functionDeploymentEvent records with pagination

```bash
csdk function-deployment-event list --limit 10 --offset 0
```

### List functionDeploymentEvent records with cursor pagination

```bash
csdk function-deployment-event list --limit 10 --after <cursor>
```

### Find first matching functionDeploymentEvent

```bash
csdk function-deployment-event find-first --where.id.equalTo <value>
```

### List functionDeploymentEvent records with field selection

```bash
csdk function-deployment-event list --select id,id
```

### List functionDeploymentEvent records with filtering and ordering

```bash
csdk function-deployment-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a functionDeploymentEvent

```bash
csdk function-deployment-event create --deploymentId <UUID> --eventType <String> --databaseId <UUID> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
```

### Get a functionDeploymentEvent by id

```bash
csdk function-deployment-event get --id <value>
```
