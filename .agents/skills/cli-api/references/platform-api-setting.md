# platformApiSetting

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformApiSetting records via csdk CLI

## Usage

```bash
csdk platform-api-setting list
csdk platform-api-setting list --where.<field>.<op> <value> --orderBy <values>
csdk platform-api-setting list --limit 10 --after <cursor>
csdk platform-api-setting find-first --where.<field>.<op> <value>
csdk platform-api-setting get --id <UUID>
csdk platform-api-setting create --apiId <UUID> [--enableAggregates <Boolean>] [--enableBulk <Boolean>] [--enableConnectionFilter <Boolean>] [--enableDirectUploads <Boolean>] [--enableI18N <Boolean>] [--enableLlm <Boolean>] [--enableLtree <Boolean>] [--enableManyToMany <Boolean>] [--enablePostgis <Boolean>] [--enablePresignedUploads <Boolean>] [--enableRealtime <Boolean>] [--enableSearch <Boolean>] [--options <JSON>] [--statementTimeoutMs <BigInt>]
csdk platform-api-setting update --id <UUID> [--apiId <UUID>] [--enableAggregates <Boolean>] [--enableBulk <Boolean>] [--enableConnectionFilter <Boolean>] [--enableDirectUploads <Boolean>] [--enableI18N <Boolean>] [--enableLlm <Boolean>] [--enableLtree <Boolean>] [--enableManyToMany <Boolean>] [--enablePostgis <Boolean>] [--enablePresignedUploads <Boolean>] [--enableRealtime <Boolean>] [--enableSearch <Boolean>] [--options <JSON>] [--statementTimeoutMs <BigInt>]
csdk platform-api-setting delete --id <UUID>
```

## Examples

### List platformApiSetting records

```bash
csdk platform-api-setting list
```

### List platformApiSetting records with pagination

```bash
csdk platform-api-setting list --limit 10 --offset 0
```

### List platformApiSetting records with cursor pagination

```bash
csdk platform-api-setting list --limit 10 --after <cursor>
```

### Find first matching platformApiSetting

```bash
csdk platform-api-setting find-first --where.id.equalTo <value>
```

### List platformApiSetting records with field selection

```bash
csdk platform-api-setting list --select id,id
```

### List platformApiSetting records with filtering and ordering

```bash
csdk platform-api-setting list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a platformApiSetting

```bash
csdk platform-api-setting create --apiId <UUID> [--enableAggregates <Boolean>] [--enableBulk <Boolean>] [--enableConnectionFilter <Boolean>] [--enableDirectUploads <Boolean>] [--enableI18N <Boolean>] [--enableLlm <Boolean>] [--enableLtree <Boolean>] [--enableManyToMany <Boolean>] [--enablePostgis <Boolean>] [--enablePresignedUploads <Boolean>] [--enableRealtime <Boolean>] [--enableSearch <Boolean>] [--options <JSON>] [--statementTimeoutMs <BigInt>]
```

### Get a platformApiSetting by id

```bash
csdk platform-api-setting get --id <value>
```
