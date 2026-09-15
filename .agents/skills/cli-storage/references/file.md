# file

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for File records via csdk CLI

## Usage

```bash
csdk file list
csdk file list --where.<field>.<op> <value> --orderBy <values>
csdk file list --limit 10 --after <cursor>
csdk file find-first --where.<field>.<op> <value>
csdk file get --id <UUID>
csdk file create --actorId <UUID> --bucketId <UUID> --databaseId <UUID> --key <String> --mimeType <String> --size <BigInt> [--contentHash <String>] [--description <String>] [--expiryEnqueuedAt <Datetime>] [--filename <String>] [--isPublic <Boolean>] [--promotedAt <Datetime>] [--status <FileStatus>] [--tags <String>] [--upload <Upload>]
csdk file update --id <UUID> [--actorId <UUID>] [--bucketId <UUID>] [--contentHash <String>] [--databaseId <UUID>] [--description <String>] [--expiryEnqueuedAt <Datetime>] [--filename <String>] [--isPublic <Boolean>] [--key <String>] [--mimeType <String>] [--promotedAt <Datetime>] [--size <BigInt>] [--status <FileStatus>] [--tags <String>] [--upload <Upload>]
csdk file delete --id <UUID>
```

## Examples

### List file records

```bash
csdk file list
```

### List file records with pagination

```bash
csdk file list --limit 10 --offset 0
```

### List file records with cursor pagination

```bash
csdk file list --limit 10 --after <cursor>
```

### Find first matching file

```bash
csdk file find-first --where.id.equalTo <value>
```

### List file records with field selection

```bash
csdk file list --select id,id
```

### List file records with filtering and ordering

```bash
csdk file list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a file

```bash
csdk file create --actorId <UUID> --bucketId <UUID> --databaseId <UUID> --key <String> --mimeType <String> --size <BigInt> [--contentHash <String>] [--description <String>] [--expiryEnqueuedAt <Datetime>] [--filename <String>] [--isPublic <Boolean>] [--promotedAt <Datetime>] [--status <FileStatus>] [--tags <String>] [--upload <Upload>]
```

### Get a file by id

```bash
csdk file get --id <value>
```
