# platformFunctionDeploymentEvent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFunctionDeploymentEvent records via csdk CLI

## Usage

```bash
csdk platform-function-deployment-event list
csdk platform-function-deployment-event list --where.<field>.<op> <value> --orderBy <values>
csdk platform-function-deployment-event list --limit 10 --after <cursor>
csdk platform-function-deployment-event find-first --where.<field>.<op> <value>
csdk platform-function-deployment-event get --id <UUID>
csdk platform-function-deployment-event create --deploymentId <UUID> --eventType <String> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
csdk platform-function-deployment-event update --id <UUID> [--actorId <UUID>] [--deploymentId <UUID>] [--eventType <String>] [--message <String>] [--metadata <JSON>]
csdk platform-function-deployment-event delete --id <UUID>
```

## Examples

### List platformFunctionDeploymentEvent records

```bash
csdk platform-function-deployment-event list
```

### List platformFunctionDeploymentEvent records with pagination

```bash
csdk platform-function-deployment-event list --limit 10 --offset 0
```

### List platformFunctionDeploymentEvent records with cursor pagination

```bash
csdk platform-function-deployment-event list --limit 10 --after <cursor>
```

### Find first matching platformFunctionDeploymentEvent

```bash
csdk platform-function-deployment-event find-first --where.id.equalTo <value>
```

### List platformFunctionDeploymentEvent records with field selection

```bash
csdk platform-function-deployment-event list --select id,id
```

### List platformFunctionDeploymentEvent records with filtering and ordering

```bash
csdk platform-function-deployment-event list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformFunctionDeploymentEvent

```bash
csdk platform-function-deployment-event create --deploymentId <UUID> --eventType <String> [--actorId <UUID>] [--message <String>] [--metadata <JSON>]
```

### Get a platformFunctionDeploymentEvent by id

```bash
csdk platform-function-deployment-event get --id <value>
```
