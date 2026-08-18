---
name: cli-storage
description: CLI tool (csdk) for the storage API — provides CRUD commands for 4 tables and 5 custom operations
---

# cli-storage

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CLI tool (csdk) for the storage API — provides CRUD commands for 4 tables and 5 custom operations

## Usage

```bash
# Context management
csdk context create <name> --endpoint <url>
csdk context use <name>

# Authentication
csdk auth set-token <token>

# Config variables
csdk config set <key> <value>
csdk config get <key>

# CRUD for any table (e.g. bucket)
csdk bucket list
csdk bucket get --id <value>
csdk bucket create --<field> <value>

# Non-interactive mode (skip all prompts, use flags only)
csdk --no-tty bucket list
```

## Examples

### Set up and query

```bash
csdk context create local --endpoint http://localhost:5000/graphql
csdk context use local
csdk auth set-token <token>
csdk bucket list
```

### Non-interactive mode (for scripts and CI)

```bash
csdk --no-tty bucket create --<field> <value>
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [context](references/context.md)
- [auth](references/auth.md)
- [config](references/config.md)
- [bucket](references/bucket.md)
- [file](references/file.md)
- [platform-bucket](references/platform-bucket.md)
- [platform-file](references/platform-file.md)
- [files-rename](references/files-rename.md)
- [platform-files-rename](references/platform-files-rename.md)
- [provision-bucket](references/provision-bucket.md)
- [upload-platform-file](references/upload-platform-file.md)
- [upload-platform-files](references/upload-platform-files.md)
