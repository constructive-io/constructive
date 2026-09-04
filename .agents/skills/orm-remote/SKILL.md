---
name: orm-remote
description: ORM client for the remote API — provides typed CRUD operations for 3 tables and 2 custom operations
---

# orm-remote

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the remote API — provides typed CRUD operations for 3 tables and 2 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: machine, machineMessage, machineSession
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.machine.findMany({
  select: { id: true }
}).execute();
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [machine](references/machine.md)
- [machine-message](references/machine-message.md)
- [machine-session](references/machine-session.md)
- [machines-enroll](references/machines-enroll.md)
- [provision-bucket](references/provision-bucket.md)
