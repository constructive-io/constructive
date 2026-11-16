# platformFile

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for PlatformFile records via csdk CLI

## Usage

```bash
csdk platform-file list
csdk platform-file list --where.<field>.<op> <value> --orderBy <values>
csdk platform-file list --limit 10 --after <cursor>
csdk platform-file find-first --where.<field>.<op> <value>
csdk platform-file get --id <UUID>
csdk platform-file update --id <UUID> [--actorId <UUID>] [--bucketId <UUID>] [--contentHash <String>] [--description <String>] [--downloadUrl <String>] [--expiryEnqueuedAt <Datetime>] [--filePath <String>] [--filename <String>] [--isPublic <Boolean>] [--key <String>] [--mimeType <String>] [--promotedAt <Datetime>] [--rejectionReason <String>] [--size <BigInt>] [--status <FileStatus>] [--tags <String>] [--upload <Upload>]
csdk platform-file delete --id <UUID>
```

## Examples

### List platformFile records

```bash
csdk platform-file list
```

### List platformFile records with pagination

```bash
csdk platform-file list --limit 10 --offset 0
```

### List platformFile records with cursor pagination

```bash
csdk platform-file list --limit 10 --after <cursor>
```

### Find first matching platformFile

```bash
csdk platform-file find-first --where.id.equalTo <value>
```

### List platformFile records with field selection

```bash
csdk platform-file list --select id,id
```

### List platformFile records with filtering and ordering

```bash
csdk platform-file list --where.id.equalTo <value> --orderBy ID_ASC
```

### Get a platformFile by id

```bash
csdk platform-file get --id <value>
```
