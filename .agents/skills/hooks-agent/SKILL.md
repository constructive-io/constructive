---
name: hooks-agent
description: React Query hooks for the agent API — provides typed query and mutation hooks for 21 tables and 1 custom operations
---

# hooks-agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

React Query hooks for the agent API — provides typed query and mutation hooks for 21 tables and 1 custom operations

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
- [platform-agent](references/platform-agent.md)
- [platform-agent-event](references/platform-agent-event.md)
- [platform-agent-message](references/platform-agent-message.md)
- [platform-agent-persona](references/platform-agent-persona.md)
- [platform-agent-plan](references/platform-agent-plan.md)
- [platform-agent-prompt](references/platform-agent-prompt.md)
- [platform-agent-resource-chunk](references/platform-agent-resource-chunk.md)
- [platform-agent-resource](references/platform-agent-resource.md)
- [platform-agent-run](references/platform-agent-run.md)
- [platform-agent-run-workspace](references/platform-agent-run-workspace.md)
- [platform-agent-task](references/platform-agent-task.md)
- [platform-agent-thread](references/platform-agent-thread.md)
- [provision-bucket](references/provision-bucket.md)
