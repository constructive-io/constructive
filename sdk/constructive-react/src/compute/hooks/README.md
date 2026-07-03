# React Query Hooks

<p align="center" width="100%">
  <img height="120" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

## Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configure } from './hooks';

configure({
  endpoint: 'https://api.example.com/graphql',
  headers: { Authorization: 'Bearer <token>' },
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `useGetAllQuery` | Query | List all getAll |
| `useCreateGetAllRecordMutation` | Mutation | Create a getAllRecord |
| `useFunctionApiBindingsQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useFunctionApiBindingQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useCreateFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useUpdateFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useDeleteFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useFunctionDeploymentsQuery` | Query | Function deployment bindings — ties a function definition to a namespace for Knative provisioning and routing |
| `useFunctionDeploymentQuery` | Query | Function deployment bindings — ties a function definition to a namespace for Knative provisioning and routing |
| `useCreateFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a function definition to a namespace for Knative provisioning and routing |
| `useUpdateFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a function definition to a namespace for Knative provisioning and routing |
| `useDeleteFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a function definition to a namespace for Knative provisioning and routing |
| `useResourcesQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useResourceQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useCreateResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useUpdateResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useDeleteResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useFunctionGraphRefsQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useFunctionGraphRefQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useCreateFunctionGraphRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useUpdateFunctionGraphRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useDeleteFunctionGraphRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useFunctionGraphStoresQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useFunctionGraphStoreQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useCreateFunctionGraphStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useUpdateFunctionGraphStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useDeleteFunctionGraphStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useFunctionGraphObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useFunctionGraphObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreateFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdateFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeleteFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useFunctionDeploymentEventsQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useFunctionDeploymentEventQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useCreateFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useUpdateFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useDeleteFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useOrgFunctionExecutionLogsQuery` | Query | Function execution logs — structured console output per invocation |
| `useOrgFunctionExecutionLogQuery` | Query | Function execution logs — structured console output per invocation |
| `useCreateOrgFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useUpdateOrgFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useDeleteOrgFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useResourceEventsQuery` | Query | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useResourceEventQuery` | Query | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useCreateResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useUpdateResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useDeleteResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useFunctionGraphExecutionOutputsQuery` | Query | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useFunctionGraphExecutionOutputQuery` | Query | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useCreateFunctionGraphExecutionOutputMutation` | Mutation | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useUpdateFunctionGraphExecutionOutputMutation` | Mutation | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useDeleteFunctionGraphExecutionOutputMutation` | Mutation | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useFunctionGraphCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useFunctionGraphCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreateFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdateFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeleteFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useSecretDefinitionsQuery` | Query | Global secret name registry — declares which secrets the platform recognizes. Actual values live in app_secrets. |
| `useSecretDefinitionQuery` | Query | Global secret name registry — declares which secrets the platform recognizes. Actual values live in app_secrets. |
| `useCreateSecretDefinitionMutation` | Mutation | Global secret name registry — declares which secrets the platform recognizes. Actual values live in app_secrets. |
| `useUpdateSecretDefinitionMutation` | Mutation | Global secret name registry — declares which secrets the platform recognizes. Actual values live in app_secrets. |
| `useDeleteSecretDefinitionMutation` | Mutation | Global secret name registry — declares which secrets the platform recognizes. Actual values live in app_secrets. |
| `useFunctionExecutionLogsQuery` | Query | Function execution logs — structured console output per invocation |
| `useFunctionExecutionLogQuery` | Query | Function execution logs — structured console output per invocation |
| `useCreateFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useUpdateFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useDeleteFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useFunctionGraphsQuery` | Query | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useFunctionGraphQuery` | Query | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useCreateFunctionGraphMutation` | Mutation | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useUpdateFunctionGraphMutation` | Mutation | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useDeleteFunctionGraphMutation` | Mutation | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useFunctionGraphExecutionNodeStatesQuery` | Query | Per-node execution state — tracks individual node lifecycle for debugging |
| `useFunctionGraphExecutionNodeStateQuery` | Query | Per-node execution state — tracks individual node lifecycle for debugging |
| `useCreateFunctionGraphExecutionNodeStateMutation` | Mutation | Per-node execution state — tracks individual node lifecycle for debugging |
| `useUpdateFunctionGraphExecutionNodeStateMutation` | Mutation | Per-node execution state — tracks individual node lifecycle for debugging |
| `useDeleteFunctionGraphExecutionNodeStateMutation` | Mutation | Per-node execution state — tracks individual node lifecycle for debugging |
| `usePlatformNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeletePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useOrgFunctionInvocationsQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useOrgFunctionInvocationQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useCreateOrgFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useUpdateOrgFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useDeleteOrgFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useFunctionInvocationsQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useFunctionInvocationQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useCreateFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useUpdateFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useDeleteFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `usePlatformNamespaceEventsQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `usePlatformNamespaceEventQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useCreatePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useUpdatePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useDeletePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useFunctionGraphExecutionsQuery` | Query | Ephemeral execution state for flow graph evaluation |
| `useFunctionGraphExecutionQuery` | Query | Ephemeral execution state for flow graph evaluation |
| `useCreateFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `useUpdateFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `useDeleteFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `useFunctionDefinitionsQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useFunctionDefinitionQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useCreateFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useUpdateFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useDeleteFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useReadFunctionGraphQuery` | Query | readFunctionGraph |
| `useValidateFunctionGraphMutation` | Mutation | validateFunctionGraph |
| `useInitEmptyRepoMutation` | Mutation | initEmptyRepo |
| `useSetDataAtPathMutation` | Mutation | setDataAtPath |
| `useImportDefinitionsMutation` | Mutation | importDefinitions |
| `useCopyGraphMutation` | Mutation | copyGraph |
| `useSaveGraphMutation` | Mutation | saveGraph |
| `useAddEdgeAndSaveMutation` | Mutation | addEdgeAndSave |
| `useAddNodeAndSaveMutation` | Mutation | addNodeAndSave |
| `useImportGraphJsonMutation` | Mutation | importGraphJson |
| `useAddEdgeMutation` | Mutation | addEdge |
| `useAddNodeMutation` | Mutation | addNode |
| `useInsertNodeAtPathMutation` | Mutation | insertNodeAtPath |
| `useStartExecutionMutation` | Mutation | startExecution |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### GetAllRecord

```typescript
// List all getAll
const { data, isLoading } = useGetAllQuery({
  selection: { fields: { path: true, data: true } },
});

// Create a getAllRecord
const { mutate: create } = useCreateGetAllRecordMutation({
  selection: { fields: { id: true } },
});
create({ path: '<String>', data: '<JSON>' });
```

### FunctionApiBinding

```typescript
// List all functionApiBindings
const { data, isLoading } = useFunctionApiBindingsQuery({
  selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } },
});

// Get one functionApiBinding
const { data: item } = useFunctionApiBindingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } },
});

// Create a functionApiBinding
const { mutate: create } = useCreateFunctionApiBindingMutation({
  selection: { fields: { id: true } },
});
create({ functionDefinitionId: '<UUID>', apiId: '<UUID>', alias: '<String>', config: '<JSON>' });
```

### FunctionDeployment

```typescript
// List all functionDeployments
const { data, isLoading } = useFunctionDeploymentsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, functionDefinitionId: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } },
});

// Get one functionDeployment
const { data: item } = useFunctionDeploymentQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, functionDefinitionId: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } },
});

// Create a functionDeployment
const { mutate: create } = useCreateFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
create({ functionDefinitionId: '<UUID>', namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' });
```

### Resource

```typescript
// List all resources
const { data, isLoading } = useResourcesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true } },
});

// Get one resource
const { data: item } = useResourceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true } },
});

// Create a resource
const { mutate: create } = useCreateResourceMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' });
```

### FunctionGraphRef

```typescript
// List all functionGraphRefs
const { data, isLoading } = useFunctionGraphRefsQuery({
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});

// Get one functionGraphRef
const { data: item } = useFunctionGraphRefQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, databaseId: true, storeId: true, commitId: true } },
});

// Create a functionGraphRef
const { mutate: create } = useCreateFunctionGraphRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', databaseId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```

### FunctionGraphStore

```typescript
// List all functionGraphStores
const { data, isLoading } = useFunctionGraphStoresQuery({
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});

// Get one functionGraphStore
const { data: item } = useFunctionGraphStoreQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, databaseId: true, hash: true, createdAt: true } },
});

// Create a functionGraphStore
const { mutate: create } = useCreateFunctionGraphStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', databaseId: '<UUID>', hash: '<UUID>' });
```

### FunctionGraphObject

```typescript
// List all functionGraphObjects
const { data, isLoading } = useFunctionGraphObjectsQuery({
  selection: { fields: { id: true, databaseId: true, kids: true, ktree: true, data: true, createdAt: true } },
});

// Get one functionGraphObject
const { data: item } = useFunctionGraphObjectQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, kids: true, ktree: true, data: true, createdAt: true } },
});

// Create a functionGraphObject
const { mutate: create } = useCreateFunctionGraphObjectMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' });
```

### FunctionDeploymentEvent

```typescript
// List all functionDeploymentEvents
const { data, isLoading } = useFunctionDeploymentEventsQuery({
  selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } },
});

// Get one functionDeploymentEvent
const { data: item } = useFunctionDeploymentEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } },
});

// Create a functionDeploymentEvent
const { mutate: create } = useCreateFunctionDeploymentEventMutation({
  selection: { fields: { id: true } },
});
create({ deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', databaseId: '<UUID>' });
```

### OrgFunctionExecutionLog

```typescript
// List all orgFunctionExecutionLogs
const { data, isLoading } = useOrgFunctionExecutionLogsQuery({
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } },
});

// Get one orgFunctionExecutionLog
const { data: item } = useOrgFunctionExecutionLogQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } },
});

// Create a orgFunctionExecutionLog
const { mutate: create } = useCreateOrgFunctionExecutionLogMutation({
  selection: { fields: { id: true } },
});
create({ invocationId: '<UUID>', taskIdentifier: '<String>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', actorId: '<UUID>' });
```

### ResourceEvent

```typescript
// List all resourceEvents
const { data, isLoading } = useResourceEventsQuery({
  selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } },
});

// Get one resourceEvent
const { data: item } = useResourceEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true, databaseId: true } },
});

// Create a resourceEvent
const { mutate: create } = useCreateResourceEventMutation({
  selection: { fields: { id: true } },
});
create({ resourceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', databaseId: '<UUID>' });
```

### FunctionGraphExecutionOutput

```typescript
// List all functionGraphExecutionOutputs
const { data, isLoading } = useFunctionGraphExecutionOutputsQuery({
  selection: { fields: { createdAt: true, id: true, databaseId: true, hash: true, data: true } },
});

// Get one functionGraphExecutionOutput
const { data: item } = useFunctionGraphExecutionOutputQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, databaseId: true, hash: true, data: true } },
});

// Create a functionGraphExecutionOutput
const { mutate: create } = useCreateFunctionGraphExecutionOutputMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', hash: '<Base64EncodedBinary>', data: '<JSON>' });
```

### FunctionGraphCommit

```typescript
// List all functionGraphCommits
const { data, isLoading } = useFunctionGraphCommitsQuery({
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Get one functionGraphCommit
const { data: item } = useFunctionGraphCommitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, message: true, databaseId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Create a functionGraphCommit
const { mutate: create } = useCreateFunctionGraphCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<String>', databaseId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
```

### SecretDefinition

```typescript
// List all secretDefinitions
const { data, isLoading } = useSecretDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, isBuiltIn: true, labels: true, annotations: true, databaseId: true } },
});

// Get one secretDefinition
const { data: item } = useSecretDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, description: true, isBuiltIn: true, labels: true, annotations: true, databaseId: true } },
});

// Create a secretDefinition
const { mutate: create } = useCreateSecretDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', description: '<String>', isBuiltIn: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' });
```

### FunctionExecutionLog

```typescript
// List all functionExecutionLogs
const { data, isLoading } = useFunctionExecutionLogsQuery({
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true, databaseId: true } },
});

// Get one functionExecutionLog
const { data: item } = useFunctionExecutionLogQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true, databaseId: true } },
});

// Create a functionExecutionLog
const { mutate: create } = useCreateFunctionExecutionLogMutation({
  selection: { fields: { id: true } },
});
create({ invocationId: '<UUID>', taskIdentifier: '<String>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', actorId: '<UUID>', databaseId: '<UUID>' });
```

### FunctionGraph

```typescript
// List all functionGraphs
const { data, isLoading } = useFunctionGraphsQuery({
  selection: { fields: { id: true, databaseId: true, storeId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } },
});

// Get one functionGraph
const { data: item } = useFunctionGraphQuery({
  id: '<UUID>',
  selection: { fields: { id: true, databaseId: true, storeId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } },
});

// Create a functionGraph
const { mutate: create } = useCreateFunctionGraphMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', storeId: '<UUID>', context: '<String>', name: '<String>', description: '<String>', definitionsCommitId: '<UUID>', isValid: '<Boolean>', validationErrors: '<JSON>', createdBy: '<UUID>' });
```

### FunctionGraphExecutionNodeState

```typescript
// List all functionGraphExecutionNodeStates
const { data, isLoading } = useFunctionGraphExecutionNodeStatesQuery({
  selection: { fields: { createdAt: true, id: true, executionId: true, databaseId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } },
});

// Get one functionGraphExecutionNodeState
const { data: item } = useFunctionGraphExecutionNodeStateQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, executionId: true, databaseId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } },
});

// Create a functionGraphExecutionNodeState
const { mutate: create } = useCreateFunctionGraphExecutionNodeStateMutation({
  selection: { fields: { id: true } },
});
create({ executionId: '<UUID>', databaseId: '<UUID>', nodeName: '<String>', nodePath: '<String>', status: '<String>', startedAt: '<Datetime>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', outputId: '<UUID>' });
```

### PlatformNamespace

```typescript
// List all platformNamespaces
const { data, isLoading } = usePlatformNamespacesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, labels: true, annotations: true, databaseId: true, sourceDatabaseId: true, sourceScope: true, isManaged: true } },
});

// Get one platformNamespace
const { data: item } = usePlatformNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, labels: true, annotations: true, databaseId: true, sourceDatabaseId: true, sourceScope: true, isManaged: true } },
});

// Create a platformNamespace
const { mutate: create } = useCreatePlatformNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', sourceDatabaseId: '<UUID>', sourceScope: '<String>', isManaged: '<Boolean>' });
```

### OrgFunctionInvocation

```typescript
// List all orgFunctionInvocations
const { data, isLoading } = useOrgFunctionInvocationsQuery({
  selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});

// Get one orgFunctionInvocation
const { data: item } = useOrgFunctionInvocationQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});

// Create a orgFunctionInvocation
const { mutate: create } = useCreateOrgFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' });
```

### FunctionInvocation

```typescript
// List all functionInvocations
const { data, isLoading } = useFunctionInvocationsQuery({
  selection: { fields: { createdAt: true, id: true, actorId: true, databaseId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});

// Get one functionInvocation
const { data: item } = useFunctionInvocationQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, actorId: true, databaseId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});

// Create a functionInvocation
const { mutate: create } = useCreateFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', databaseId: '<UUID>', taskIdentifier: '<String>', payload: '<JSON>', status: '<String>', result: '<JSON>', error: '<String>', durationMs: '<Int>', jobId: '<BigInt>', startedAt: '<Datetime>', completedAt: '<Datetime>', parentInvocationId: '<UUID>', graphExecutionId: '<UUID>' });
```

### PlatformNamespaceEvent

```typescript
// List all platformNamespaceEvents
const { data, isLoading } = usePlatformNamespaceEventsQuery({
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } },
});

// Get one platformNamespaceEvent
const { data: item } = usePlatformNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } },
});

// Create a platformNamespaceEvent
const { mutate: create } = useCreatePlatformNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' });
```

### FunctionGraphExecution

```typescript
// List all functionGraphExecutions
const { data, isLoading } = useFunctionGraphExecutionsQuery({
  selection: { fields: { startedAt: true, id: true, graphId: true, invocationId: true, databaseId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, errorCode: true, errorMessage: true } },
});

// Get one functionGraphExecution
const { data: item } = useFunctionGraphExecutionQuery({
  id: '<UUID>',
  selection: { fields: { startedAt: true, id: true, graphId: true, invocationId: true, databaseId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, errorCode: true, errorMessage: true } },
});

// Create a functionGraphExecution
const { mutate: create } = useCreateFunctionGraphExecutionMutation({
  selection: { fields: { id: true } },
});
create({ startedAt: '<Datetime>', graphId: '<UUID>', invocationId: '<UUID>', databaseId: '<UUID>', outputNode: '<String>', outputPort: '<String>', status: '<String>', inputPayload: '<JSON>', outputPayload: '<JSON>', nodeOutputs: '<JSON>', executionPlan: '<JSON>', currentWave: '<Int>', parentExecutionId: '<UUID>', parentNodeName: '<String>', definitionsCommitId: '<UUID>', tickCount: '<Int>', completedAt: '<Datetime>', maxTicks: '<Int>', maxPendingJobs: '<Int>', timeoutAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>' });
```

### FunctionDefinition

```typescript
// List all functionDefinitions
const { data, isLoading } = useFunctionDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isInvocable: true, maxAttempts: true, priority: true, queueName: true, runtime: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } },
});

// Get one functionDefinition
const { data: item } = useFunctionDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isInvocable: true, maxAttempts: true, priority: true, queueName: true, runtime: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } },
});

// Create a functionDefinition
const { mutate: create } = useCreateFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isInvocable: '<Boolean>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<FunctionRequirement>', requiredConfigs: '<FunctionRequirement>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' });
```

## Custom Operation Hooks

### `useReadFunctionGraphQuery`

readFunctionGraph

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `graphId` | UUID |

### `useValidateFunctionGraphMutation`

validateFunctionGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ValidateFunctionGraphInput (required) |

### `useInitEmptyRepoMutation`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

### `useSetDataAtPathMutation`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

### `useImportDefinitionsMutation`

importDefinitions

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ImportDefinitionsInput (required) |

### `useCopyGraphMutation`

copyGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyGraphInput (required) |

### `useSaveGraphMutation`

saveGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SaveGraphInput (required) |

### `useAddEdgeAndSaveMutation`

addEdgeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddEdgeAndSaveInput (required) |

### `useAddNodeAndSaveMutation`

addNodeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddNodeAndSaveInput (required) |

### `useImportGraphJsonMutation`

importGraphJson

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ImportGraphJsonInput (required) |

### `useAddEdgeMutation`

addEdge

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddEdgeInput (required) |

### `useAddNodeMutation`

addNode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddNodeInput (required) |

### `useInsertNodeAtPathMutation`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InsertNodeAtPathInput (required) |

### `useStartExecutionMutation`

startExecution

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | StartExecutionInput (required) |

### `useProvisionBucketMutation`

Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings.

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ProvisionBucketInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
