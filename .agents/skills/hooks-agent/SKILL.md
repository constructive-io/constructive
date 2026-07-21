---
name: hooks-agent
description: React Query hooks for the agent API — provides typed query and mutation hooks for 9 tables and 1 custom operations
---

# hooks-agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the agent API — provides typed query and mutation hooks for 9 tables and 1 custom operations

## Usage

```typescript
// Import hooks
import { useAgentsQuery } from './hooks';

// Query hooks: use<Model>Query, use<Model>sQuery
// Mutation hooks: useCreate<Model>Mutation, useUpdate<Model>Mutation, useDelete<Model>Mutation
// Bulk mutation hooks (when enabled): useBulkCreate<Model>Mutation, useBulkUpsert<Model>Mutation, etc.

const { data, isLoading } = useAgentsQuery({
  selection: { fields: { id: true } },
});
```

## Examples

### Query records

```typescript
const { data, isLoading } = useAgentsQuery({
  selection: { fields: { id: true } },
});
```

## References

See the `references/` directory for detailed per-entity API documentation:

- [agent](references/agent.md)
- [agent-message](references/agent-message.md)
- [agent-persona](references/agent-persona.md)
- [agent-plan](references/agent-plan.md)
- [agent-prompt](references/agent-prompt.md)
- [agent-resource-chunk](references/agent-resource-chunk.md)
- [agent-resource](references/agent-resource.md)
- [agent-task](references/agent-task.md)
- [agent-thread](references/agent-thread.md)
- [provision-bucket](references/provision-bucket.md)
