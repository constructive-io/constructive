# @constructive-io/constructive-agent

Experimental agent runtime for Constructive, designed to layer PI agent primitives on top of Constructive GraphQL and PostgreSQL RLS boundaries.

## Status

This package is experimental and currently has:

- Run state and event contracts
- Tool registry and policy interfaces
- Dynamic rule-based contextual policy engine
- Approval policy-matrix authorizer (tenant/tool/capability/risk scoped)
- In-memory stores for runs/events/approvals
- PostgreSQL stores for runs/events/approvals + schema bootstrap helpers
- PI runtime adapter (`createPiRuntimeAdapter`) with policy-gated tool execution
- Approval workflow (`needs_approval`, approve/reject, resume)
- Redaction + argument hashing for approval safety/auditability
- Event replay helper (`replayRunEvents`)
- Runner concurrency controls (global/actor/tenant limits)
- Runner interruption controls (`abortRun`)
- Live run event publishing + control protocol adapter
- Typed GraphQL operation bundles for entity CRUD registration
- Metrics/tracing sink wiring for run/tool/policy/approval lifecycle
- Local headless harness helpers (`createLocalRunner`, `runLocal`)
- ADRs for identity propagation, event storage, and tool allowlist strategy

## Design Principles

1. RLS-first identity propagation through Constructive GraphQL endpoints.
2. Tool allowlist only; no arbitrary GraphQL execution by default.
3. Capability-tagged tools with policy decisions before execution.
4. Event journaling for replay and audit.
5. Sensitive argument redaction in persisted event/approval trails.

## Docs

- [Architecture](./docs/architecture.md)
- [Threat Model](./docs/threat-model.md)
- [Runbook](./docs/runbook.md)
- [Integration Cookbook](./docs/integration-cookbook.md)

## Quick Start (Experimental)

```ts
import {
  createAgentRunner,
  createPiRuntimeAdapter,
  createGraphQLHealthCheckTool,
} from '@constructive-io/constructive-agent';

const runner = createAgentRunner({
  runtimeAdapter: createPiRuntimeAdapter(),
});

const run = await runner.startRun({
  model: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    systemPrompt: 'You are a careful assistant.',
    thinkingLevel: 'off',
  },
  identity: {
    actorId: 'user-123',
    accessToken: process.env.ACCESS_TOKEN!,
    graphqlEndpoint: 'https://api.example.com/graphql',
    databaseId: 'db-1',
    apiName: 'main-api',
  },
  prompt: 'Check backend health.',
  tools: [createGraphQLHealthCheckTool()],
  limits: {
    maxTurns: 3,
    maxToolCalls: 5,
    maxRuntimeMs: 15000,
  },
});

const events = await runner.getEvents(run.id);
console.log(run.status, events.length);
```

## Approval + Resume Flow

```ts
const run = await runner.startRun(config);

if (run.status === 'needs_approval') {
  const approvals = await runner.listApprovals(run.id);
  console.log(approvals[0]?.status); // pending

  const resumed = await runner.approvePending(run.id, {
    decidedBy: 'operator-1',
    reason: 'approved after review',
  });

  console.log(resumed.status); // completed (if no further approvals needed)
}
```

## PostgreSQL Durability Setup

```ts
import { Pool } from 'pg';
import {
  createAgentRunner,
  createPiRuntimeAdapter,
  ensureAgentStorageSchema,
  PgRunStore,
  PgEventStore,
  PgApprovalStore,
} from '@constructive-io/constructive-agent';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await ensureAgentStorageSchema(pool, { schema: 'constructive_agent' });

const runner = createAgentRunner({
  runStore: new PgRunStore({ client: pool, schema: 'constructive_agent' }),
  eventStore: new PgEventStore({ client: pool, schema: 'constructive_agent' }),
  approvalStore: new PgApprovalStore({ client: pool, schema: 'constructive_agent' }),
  runtimeAdapter: createPiRuntimeAdapter(),
});
```
