---
name: orm-agent
description: ORM client for the agent API — provides typed CRUD operations for 9 tables and 1 custom operations
---

# orm-agent

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

ORM client for the agent API — provides typed CRUD operations for 9 tables and 1 custom operations

## Usage

```typescript
// Import the ORM client
import { db } from './orm';

// Available models: agent, agentMessage, agentPersona, agentPlan, agentPrompt, agentResourceChunk, agentResource, agentTask, ...
db.<model>.findMany({ select: { id: true } }).execute()
db.<model>.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.<model>.create({ data: { ... }, select: { id: true } }).execute()
db.<model>.update({ where: { id: '<UUID>' }, data: { ... }, select: { id: true } }).execute()
db.<model>.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### Query records

```typescript
const items = await db.agent.findMany({
  select: { id: true }
}).execute();
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
