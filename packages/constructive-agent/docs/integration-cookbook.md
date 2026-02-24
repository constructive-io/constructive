# Constructive Agent Integration Cookbook

## 1. Build an allowlisted entity bundle

```ts
import {
  GraphQLOperationRegistry,
  registerEntityCrudBundle,
  createGraphQLToolsFromRegistry,
} from '@constructive-io/constructive-agent';

const registry = new GraphQLOperationRegistry();

registerEntityCrudBundle(registry, {
  entityName: 'animal',
  readById: {
    document: `query ReadAnimal($id: ID!) { animal(id: $id) { id ownerId } }`,
    mapVariables: (args: { id: string }) => ({ id: args.id }),
  },
  create: {
    document: `mutation CreateAnimal($input: AnimalInput!) { createAnimal(input: $input) { id } }`,
    mapVariables: (args: { input: Record<string, unknown> }) => ({ input: args.input }),
  },
  update: {
    document: `mutation UpdateAnimal($id: ID!, $patch: AnimalPatch!) { updateAnimal(id: $id, patch: $patch) { id } }`,
    mapVariables: (args: { id: string; patch: Record<string, unknown> }) => ({
      id: args.id,
      patch: args.patch,
    }),
  },
});

const tools = createGraphQLToolsFromRegistry(registry);
```

## 2. Apply contextual policy + approval matrix

```ts
import {
  CompositePolicyEngine,
  RuleBasedContextualPolicyEngine,
  StaticPolicyEngine,
  DEFAULT_CAPABILITY_POLICY,
  PolicyMatrixApprovalAuthorizer,
} from '@constructive-io/constructive-agent';

const policyEngine = new CompositePolicyEngine([
  new StaticPolicyEngine(DEFAULT_CAPABILITY_POLICY, {
    action: 'deny',
    reason: 'No matching capability rule.',
    riskClass: 'high',
  }),
  new RuleBasedContextualPolicyEngine({
    rules: [
      {
        id: 'prod-cross-owner-write',
        matcher: {
          tenantIds: ['tenant-prod'],
          capabilities: ['write'],
          invocationArgsExists: ['ownerId'],
        },
        action: 'needs_approval',
        reason: 'Production writes require explicit approval.',
      },
    ],
  }),
]);

const approvalAuthorizer = new PolicyMatrixApprovalAuthorizer({
  rules: [
    {
      id: 'ops-tenant-prod',
      effect: 'allow',
      deciders: ['secops-1', 'secops-2'],
      tenantIds: ['tenant-prod'],
      decisions: ['approved', 'rejected'],
      riskClasses: ['low', 'high', 'destructive'],
    },
  ],
});
```

## 3. Runner with live event streaming + control protocol

```ts
import {
  createAgentRunner,
  createPiRuntimeAdapter,
  InMemoryWebBridge,
  InMemoryAgentControlProtocol,
} from '@constructive-io/constructive-agent';

const webBridge = new InMemoryWebBridge();

const runner = createAgentRunner({
  runtimeAdapter: createPiRuntimeAdapter({ policyEngine }),
  approvalAuthorizer,
  eventPublisher: webBridge,
  concurrency: {
    maxGlobalRuns: 20,
    maxRunsPerActor: 2,
    maxRunsPerTenant: 10,
  },
});

const control = new InMemoryAgentControlProtocol(runner, webBridge);

const unsubscribe = control.subscribeAll((event) => {
  console.log(event.type, event.runId);
});

// start, approve/reject, resume, abort via control.execute(...)
```

## 4. Attach metrics/tracing sinks

```ts
import {
  InMemoryMetricsRecorder,
  InMemoryTraceSink,
  createPiRuntimeAdapter,
  createAgentRunner,
} from '@constructive-io/constructive-agent';

const metrics = new InMemoryMetricsRecorder();
const traces = new InMemoryTraceSink();

const runner = createAgentRunner({
  runtimeAdapter: createPiRuntimeAdapter({
    metrics,
    traceSink: traces,
  }),
  metrics,
  traceSink: traces,
});
```

## 5. Persistence baseline

```ts
import { Pool } from 'pg';
import {
  ensureAgentStorageSchema,
  PgRunStore,
  PgEventStore,
  PgApprovalStore,
} from '@constructive-io/constructive-agent';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await ensureAgentStorageSchema(pool, { schema: 'constructive_agent' });

const runStore = new PgRunStore({ client: pool, schema: 'constructive_agent' });
const eventStore = new PgEventStore({ client: pool, schema: 'constructive_agent' });
const approvalStore = new PgApprovalStore({ client: pool, schema: 'constructive_agent' });
```
