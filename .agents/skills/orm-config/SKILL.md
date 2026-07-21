---
name: orm-config
description: ORM client for the config API — provides typed CRUD operations for 5 tables and 13 custom operations
---

# orm-config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the config API — provides typed CRUD operations for 5 tables and 13 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: config, platformConfig, platformInternalSecret, platformSecret, secret
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.config.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [config](references/config.md)
- [platform-config](references/platform-config.md)
- [platform-internal-secret](references/platform-internal-secret.md)
- [platform-secret](references/platform-secret.md)
- [secret](references/secret.md)
- [secrets-del](references/secrets-del.md)
- [secrets-remove-array](references/secrets-remove-array.md)
- [secrets-rotate](references/secrets-rotate.md)
- [secrets-set](references/secrets-set.md)
- [platform-internal-secrets-del](references/platform-internal-secrets-del.md)
- [platform-internal-secrets-remove-array](references/platform-internal-secrets-remove-array.md)
- [platform-internal-secrets-rotate](references/platform-internal-secrets-rotate.md)
- [platform-internal-secrets-set](references/platform-internal-secrets-set.md)
- [platform-secrets-del](references/platform-secrets-del.md)
- [platform-secrets-remove-array](references/platform-secrets-remove-array.md)
- [platform-secrets-rotate](references/platform-secrets-rotate.md)
- [platform-secrets-set](references/platform-secrets-set.md)
- [provision-bucket](references/provision-bucket.md)
