---
name: orm-config
description: ORM client for the config API — provides typed CRUD operations for 2 tables and 9 custom operations
---

# orm-config

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the config API — provides typed CRUD operations for 2 tables and 9 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: platformConfigDefinition, platformConfig
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.platformConfigDefinition.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [platform-config-definition](references/platform-config-definition.md)
- [platform-config](references/platform-config.md)
- [platform-secrets-del](references/platform-secrets-del.md)
- [org-secrets-del](references/org-secrets-del.md)
- [platform-secrets-remove-array](references/platform-secrets-remove-array.md)
- [org-secrets-remove-array](references/org-secrets-remove-array.md)
- [platform-secrets-rotate](references/platform-secrets-rotate.md)
- [platform-secrets-set](references/platform-secrets-set.md)
- [org-secrets-rotate](references/org-secrets-rotate.md)
- [org-secrets-set](references/org-secrets-set.md)
- [provision-bucket](references/provision-bucket.md)
