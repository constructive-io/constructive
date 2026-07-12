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
| `useInfraGetAllQuery` | Query | List all infraGetAll |
| `useCreateInfraGetAllRecordMutation` | Mutation | Create a infraGetAllRecord |
| `useGetAllQuery` | Query | List all getAll |
| `useCreateGetAllRecordMutation` | Mutation | Create a getAllRecord |
| `useInfraRefsQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useInfraRefQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useCreateInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useUpdateInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useDeleteInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useInfraStoresQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useInfraStoreQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useCreateInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useUpdateInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useDeleteInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useFunctionApiBindingsQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useFunctionApiBindingQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useCreateFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useUpdateFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useDeleteFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
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
| `usePlatformFunctionApiBindingsQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `usePlatformFunctionApiBindingQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useCreatePlatformFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useUpdatePlatformFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useDeletePlatformFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `usePlatformResourcesRequirementsStatesQuery` | Query | List all platformResourcesRequirementsStates |
| `useCreatePlatformResourcesRequirementsStateMutation` | Mutation | Create a platformResourcesRequirementsState |
| `useResourcesRequirementsStatesQuery` | Query | List all resourcesRequirementsStates |
| `useCreateResourcesRequirementsStateMutation` | Mutation | Create a resourcesRequirementsState |
| `usePlatformResourceStatusChecksQuery` | Query | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `usePlatformResourceStatusCheckQuery` | Query | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useCreatePlatformResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useUpdatePlatformResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useDeletePlatformResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `usePlatformFunctionDeploymentsQuery` | Query | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `usePlatformFunctionDeploymentQuery` | Query | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useCreatePlatformFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useUpdatePlatformFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useDeletePlatformFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `usePlatformResourcesQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `usePlatformResourceQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useCreatePlatformResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useUpdatePlatformResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useDeletePlatformResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `usePlatformResourceDefinitionsQuery` | Query | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `usePlatformResourceDefinitionQuery` | Query | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useCreatePlatformResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useUpdatePlatformResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useDeletePlatformResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useInfraObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useInfraObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreateInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdateInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeleteInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useFunctionGraphObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useFunctionGraphObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreateFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdateFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeleteFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `usePlatformFunctionDeploymentEventsQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `usePlatformFunctionDeploymentEventQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useCreatePlatformFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useUpdatePlatformFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useDeletePlatformFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `usePlatformResourceEventsQuery` | Query | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `usePlatformResourceEventQuery` | Query | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useCreatePlatformResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useUpdatePlatformResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useDeletePlatformResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useResourceStatusChecksQuery` | Query | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useResourceStatusCheckQuery` | Query | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useCreateResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useUpdateResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useDeleteResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useFunctionDeploymentsQuery` | Query | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useFunctionDeploymentQuery` | Query | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useCreateFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useUpdateFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useDeleteFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useResourcesQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useResourceQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useCreateResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useUpdateResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useDeleteResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useResourceDefinitionsQuery` | Query | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useResourceDefinitionQuery` | Query | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useCreateResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useUpdateResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useDeleteResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useFunctionDeploymentEventsQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useFunctionDeploymentEventQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useCreateFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useUpdateFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useDeleteFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `usePlatformFunctionExecutionLogsQuery` | Query | Function execution logs — structured console output per invocation |
| `usePlatformFunctionExecutionLogQuery` | Query | Function execution logs — structured console output per invocation |
| `useCreatePlatformFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useUpdatePlatformFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useDeletePlatformFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
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
| `useInfraCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useInfraCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreateInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdateInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeleteInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useFunctionGraphCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useFunctionGraphCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreateFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdateFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeleteFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useFunctionExecutionLogsQuery` | Query | Function execution logs — structured console output per invocation |
| `useFunctionExecutionLogQuery` | Query | Function execution logs — structured console output per invocation |
| `useCreateFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useUpdateFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useDeleteFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `usePlatformResourcesResolvedRequirementsQuery` | Query | List all platformResourcesResolvedRequirements |
| `useCreatePlatformResourcesResolvedRequirementMutation` | Mutation | Create a platformResourcesResolvedRequirement |
| `useResourcesResolvedRequirementsQuery` | Query | List all resourcesResolvedRequirements |
| `useCreateResourcesResolvedRequirementMutation` | Mutation | Create a resourcesResolvedRequirement |
| `useDbPresetsQuery` | Query | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useDbPresetQuery` | Query | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useCreateDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useUpdateDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useDeleteDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `usePlatformNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeletePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
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
| `useNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreateNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdateNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeleteNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformFunctionInvocationsQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `usePlatformFunctionInvocationQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useCreatePlatformFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useUpdatePlatformFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
| `useDeletePlatformFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions by task_identifier string. |
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
| `useIntegrationProvidersQuery` | Query | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useIntegrationProviderQuery` | Query | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useCreateIntegrationProviderMutation` | Mutation | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useUpdateIntegrationProviderMutation` | Mutation | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useDeleteIntegrationProviderMutation` | Mutation | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useNamespaceEventsQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useNamespaceEventQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useCreateNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useUpdateNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useDeleteNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useFunctionGraphExecutionsQuery` | Query | Ephemeral execution state for flow graph evaluation |
| `useFunctionGraphExecutionQuery` | Query | Ephemeral execution state for flow graph evaluation |
| `useCreateFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `useUpdateFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `useDeleteFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `usePlatformFunctionDefinitionsQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `usePlatformFunctionDefinitionQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useCreatePlatformFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useUpdatePlatformFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useDeletePlatformFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useFunctionDefinitionsQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useFunctionDefinitionQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useCreateFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useUpdateFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useDeleteFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useReadFunctionGraphQuery` | Query | readFunctionGraph |
| `useValidateFunctionGraphMutation` | Mutation | validateFunctionGraph |
| `useInfraInitEmptyRepoMutation` | Mutation | infraInitEmptyRepo |
| `useInitEmptyRepoMutation` | Mutation | initEmptyRepo |
| `useImportDefinitionsMutation` | Mutation | importDefinitions |
| `useInfraSetDataAtPathMutation` | Mutation | infraSetDataAtPath |
| `useSetDataAtPathMutation` | Mutation | setDataAtPath |
| `useCopyGraphMutation` | Mutation | copyGraph |
| `useSaveGraphMutation` | Mutation | saveGraph |
| `useAddEdgeAndSaveMutation` | Mutation | addEdgeAndSave |
| `useAddNodeAndSaveMutation` | Mutation | addNodeAndSave |
| `useImportGraphJsonMutation` | Mutation | importGraphJson |
| `useAddEdgeMutation` | Mutation | addEdge |
| `useAddNodeMutation` | Mutation | addNode |
| `useInfraInsertNodeAtPathMutation` | Mutation | infraInsertNodeAtPath |
| `useInsertNodeAtPathMutation` | Mutation | insertNodeAtPath |
| `useStartExecutionMutation` | Mutation | startExecution |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |

## Table Hooks

### InfraGetAllRecord

```typescript
// List all infraGetAll
const { data, isLoading } = useInfraGetAllQuery({
  selection: { fields: { path: true, data: true } },
});

// Create a infraGetAllRecord
const { mutate: create } = useCreateInfraGetAllRecordMutation({
  selection: { fields: { id: true } },
});
create({ path: '<String>', data: '<JSON>' });
```

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

### InfraRef

```typescript
// List all infraRefs
const { data, isLoading } = useInfraRefsQuery({
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});

// Get one infraRef
const { data: item } = useInfraRefQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});

// Create a infraRef
const { mutate: create } = useCreateInfraRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```

### InfraStore

```typescript
// List all infraStores
const { data, isLoading } = useInfraStoresQuery({
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});

// Get one infraStore
const { data: item } = useInfraStoreQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});

// Create a infraStore
const { mutate: create } = useCreateInfraStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', scopeId: '<UUID>', hash: '<UUID>' });
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

### FunctionGraphRef

```typescript
// List all functionGraphRefs
const { data, isLoading } = useFunctionGraphRefsQuery({
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});

// Get one functionGraphRef
const { data: item } = useFunctionGraphRefQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, scopeId: true, storeId: true, commitId: true } },
});

// Create a functionGraphRef
const { mutate: create } = useCreateFunctionGraphRefMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', commitId: '<UUID>' });
```

### FunctionGraphStore

```typescript
// List all functionGraphStores
const { data, isLoading } = useFunctionGraphStoresQuery({
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});

// Get one functionGraphStore
const { data: item } = useFunctionGraphStoreQuery({
  id: '<UUID>',
  selection: { fields: { id: true, name: true, scopeId: true, hash: true, createdAt: true } },
});

// Create a functionGraphStore
const { mutate: create } = useCreateFunctionGraphStoreMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', scopeId: '<UUID>', hash: '<UUID>' });
```

### PlatformFunctionApiBinding

```typescript
// List all platformFunctionApiBindings
const { data, isLoading } = usePlatformFunctionApiBindingsQuery({
  selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } },
});

// Get one platformFunctionApiBinding
const { data: item } = usePlatformFunctionApiBindingQuery({
  id: '<UUID>',
  selection: { fields: { id: true, functionDefinitionId: true, apiId: true, alias: true, config: true } },
});

// Create a platformFunctionApiBinding
const { mutate: create } = useCreatePlatformFunctionApiBindingMutation({
  selection: { fields: { id: true } },
});
create({ functionDefinitionId: '<UUID>', apiId: '<UUID>', alias: '<String>', config: '<JSON>' });
```

### PlatformResourcesRequirementsState

```typescript
// List all platformResourcesRequirementsStates
const { data, isLoading } = usePlatformResourcesRequirementsStatesQuery({
  selection: { fields: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } },
});

// Create a platformResourcesRequirementsState
const { mutate: create } = useCreatePlatformResourcesRequirementsStateMutation({
  selection: { fields: { id: true } },
});
create({ resourceId: '<UUID>', slug: '<String>', secretsHash: '<String>', configHash: '<String>', requirementsHash: '<String>', secretsObjectName: '<String>', configObjectName: '<String>' });
```

### ResourcesRequirementsState

```typescript
// List all resourcesRequirementsStates
const { data, isLoading } = useResourcesRequirementsStatesQuery({
  selection: { fields: { resourceId: true, slug: true, secretsHash: true, configHash: true, requirementsHash: true, secretsObjectName: true, configObjectName: true } },
});

// Create a resourcesRequirementsState
const { mutate: create } = useCreateResourcesRequirementsStateMutation({
  selection: { fields: { id: true } },
});
create({ resourceId: '<UUID>', slug: '<String>', secretsHash: '<String>', configHash: '<String>', requirementsHash: '<String>', secretsObjectName: '<String>', configObjectName: '<String>' });
```

### PlatformResourceStatusCheck

```typescript
// List all platformResourceStatusChecks
const { data, isLoading } = usePlatformResourceStatusChecksQuery({
  selection: { fields: { id: true, resourceId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } },
});

// Get one platformResourceStatusCheck
const { data: item } = usePlatformResourceStatusCheckQuery({
  id: '<UUID>',
  selection: { fields: { id: true, resourceId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } },
});

// Create a platformResourceStatusCheck
const { mutate: create } = useCreatePlatformResourceStatusCheckMutation({
  selection: { fields: { id: true } },
});
create({ resourceId: '<UUID>', requestedBy: '<UUID>', requestedAt: '<Datetime>', completedAt: '<Datetime>', status: '<String>', result: '<JSON>' });
```

### PlatformFunctionDeployment

```typescript
// List all platformFunctionDeployments
const { data, isLoading } = usePlatformFunctionDeploymentsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true } },
});

// Get one platformFunctionDeployment
const { data: item } = usePlatformFunctionDeploymentQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true } },
});

// Create a platformFunctionDeployment
const { mutate: create } = useCreatePlatformFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>' });
```

### PlatformResource

```typescript
// List all platformResources
const { data, isLoading } = usePlatformResourcesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } },
});

// Get one platformResource
const { data: item } = usePlatformResourceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } },
});

// Create a platformResource
const { mutate: create } = useCreatePlatformResourceMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' });
```

### PlatformResourceDefinition

```typescript
// List all platformResourceDefinitions
const { data, isLoading } = usePlatformResourceDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true } },
});

// Get one platformResourceDefinition
const { data: item } = usePlatformResourceDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true } },
});

// Create a platformResourceDefinition
const { mutate: create } = useCreatePlatformResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>' });
```

### InfraObject

```typescript
// List all infraObjects
const { data, isLoading } = useInfraObjectsQuery({
  selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } },
});

// Get one infraObject
const { data: item } = useInfraObjectQuery({
  id: '<UUID>',
  selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } },
});

// Create a infraObject
const { mutate: create } = useCreateInfraObjectMutation({
  selection: { fields: { id: true } },
});
create({ scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' });
```

### FunctionGraphObject

```typescript
// List all functionGraphObjects
const { data, isLoading } = useFunctionGraphObjectsQuery({
  selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } },
});

// Get one functionGraphObject
const { data: item } = useFunctionGraphObjectQuery({
  id: '<UUID>',
  selection: { fields: { id: true, scopeId: true, kids: true, ktree: true, data: true, createdAt: true } },
});

// Create a functionGraphObject
const { mutate: create } = useCreateFunctionGraphObjectMutation({
  selection: { fields: { id: true } },
});
create({ scopeId: '<UUID>', kids: '<UUID>', ktree: '<String>', data: '<JSON>' });
```

### PlatformFunctionDeploymentEvent

```typescript
// List all platformFunctionDeploymentEvents
const { data, isLoading } = usePlatformFunctionDeploymentEventsQuery({
  selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true } },
});

// Get one platformFunctionDeploymentEvent
const { data: item } = usePlatformFunctionDeploymentEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, deploymentId: true, eventType: true, actorId: true, message: true, metadata: true } },
});

// Create a platformFunctionDeploymentEvent
const { mutate: create } = useCreatePlatformFunctionDeploymentEventMutation({
  selection: { fields: { id: true } },
});
create({ deploymentId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>' });
```

### PlatformResourceEvent

```typescript
// List all platformResourceEvents
const { data, isLoading } = usePlatformResourceEventsQuery({
  selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true } },
});

// Get one platformResourceEvent
const { data: item } = usePlatformResourceEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, resourceId: true, eventType: true, actorId: true, message: true, metadata: true } },
});

// Create a platformResourceEvent
const { mutate: create } = useCreatePlatformResourceEventMutation({
  selection: { fields: { id: true } },
});
create({ resourceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>' });
```

### ResourceStatusCheck

```typescript
// List all resourceStatusChecks
const { data, isLoading } = useResourceStatusChecksQuery({
  selection: { fields: { id: true, resourceId: true, databaseId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } },
});

// Get one resourceStatusCheck
const { data: item } = useResourceStatusCheckQuery({
  id: '<UUID>',
  selection: { fields: { id: true, resourceId: true, databaseId: true, requestedBy: true, requestedAt: true, completedAt: true, status: true, result: true } },
});

// Create a resourceStatusCheck
const { mutate: create } = useCreateResourceStatusCheckMutation({
  selection: { fields: { id: true } },
});
create({ resourceId: '<UUID>', databaseId: '<UUID>', requestedBy: '<UUID>', requestedAt: '<Datetime>', completedAt: '<Datetime>', status: '<String>', result: '<JSON>' });
```

### FunctionDeployment

```typescript
// List all functionDeployments
const { data, isLoading } = useFunctionDeploymentsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } },
});

// Get one functionDeployment
const { data: item } = useFunctionDeploymentQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } },
});

// Create a functionDeployment
const { mutate: create } = useCreateFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' });
```

### Resource

```typescript
// List all resources
const { data, isLoading } = useResourcesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } },
});

// Get one resource
const { data: item } = useResourceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, spec: true, status: true, statusObserved: true, lastError: true, errorCount: true, labels: true, annotations: true, databaseId: true, requiredSecrets: true, requiredConfigs: true, integrations: true, resourceDefinitionId: true } },
});

// Create a resource
const { mutate: create } = useCreateResourceMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', lastError: '<String>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', resourceDefinitionId: '<UUID>' });
```

### ResourceDefinition

```typescript
// List all resourceDefinitions
const { data, isLoading } = useResourceDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true, databaseId: true } },
});

// Get one resourceDefinition
const { data: item } = useResourceDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true, namespaceId: true, kind: true, name: true, slug: true, description: true, defaultSpec: true, requiredSecrets: true, requiredConfigs: true, integrations: true, labels: true, annotations: true, stepUpMinAge: true, databaseId: true } },
});

// Create a resourceDefinition
const { mutate: create } = useCreateResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ createdBy: '<UUID>', updatedBy: '<UUID>', namespaceId: '<UUID>', kind: '<String>', name: '<String>', slug: '<String>', description: '<String>', defaultSpec: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', labels: '<JSON>', annotations: '<JSON>', stepUpMinAge: '<Interval>', databaseId: '<UUID>' });
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

### PlatformFunctionExecutionLog

```typescript
// List all platformFunctionExecutionLogs
const { data, isLoading } = usePlatformFunctionExecutionLogsQuery({
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } },
});

// Get one platformFunctionExecutionLog
const { data: item } = usePlatformFunctionExecutionLogQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, invocationId: true, taskIdentifier: true, logLevel: true, message: true, metadata: true, actorId: true } },
});

// Create a platformFunctionExecutionLog
const { mutate: create } = useCreatePlatformFunctionExecutionLogMutation({
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
  selection: { fields: { createdAt: true, id: true, scopeId: true, hash: true, data: true } },
});

// Get one functionGraphExecutionOutput
const { data: item } = useFunctionGraphExecutionOutputQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, scopeId: true, hash: true, data: true } },
});

// Create a functionGraphExecutionOutput
const { mutate: create } = useCreateFunctionGraphExecutionOutputMutation({
  selection: { fields: { id: true } },
});
create({ scopeId: '<UUID>', hash: '<Base64EncodedBinary>', data: '<JSON>' });
```

### InfraCommit

```typescript
// List all infraCommits
const { data, isLoading } = useInfraCommitsQuery({
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Get one infraCommit
const { data: item } = useInfraCommitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Create a infraCommit
const { mutate: create } = useCreateInfraCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
```

### FunctionGraphCommit

```typescript
// List all functionGraphCommits
const { data, isLoading } = useFunctionGraphCommitsQuery({
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Get one functionGraphCommit
const { data: item } = useFunctionGraphCommitQuery({
  id: '<UUID>',
  selection: { fields: { id: true, message: true, scopeId: true, storeId: true, parentIds: true, authorId: true, committerId: true, treeId: true, date: true } },
});

// Create a functionGraphCommit
const { mutate: create } = useCreateFunctionGraphCommitMutation({
  selection: { fields: { id: true } },
});
create({ message: '<String>', scopeId: '<UUID>', storeId: '<UUID>', parentIds: '<UUID>', authorId: '<UUID>', committerId: '<UUID>', treeId: '<UUID>', date: '<Datetime>' });
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

### PlatformResourcesResolvedRequirement

```typescript
// List all platformResourcesResolvedRequirements
const { data, isLoading } = usePlatformResourcesResolvedRequirementsQuery({
  selection: { fields: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } },
});

// Create a platformResourcesResolvedRequirement
const { mutate: create } = useCreatePlatformResourcesResolvedRequirementMutation({
  selection: { fields: { id: true } },
});
create({ resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' });
```

### ResourcesResolvedRequirement

```typescript
// List all resourcesResolvedRequirements
const { data, isLoading } = useResourcesResolvedRequirementsQuery({
  selection: { fields: { resourceId: true, slug: true, namespaceId: true, requirementKind: true, name: true, required: true, atomId: true, present: true, secretsObjectName: true, configObjectName: true } },
});

// Create a resourcesResolvedRequirement
const { mutate: create } = useCreateResourcesResolvedRequirementMutation({
  selection: { fields: { id: true } },
});
create({ resourceId: '<UUID>', slug: '<String>', namespaceId: '<UUID>', requirementKind: '<String>', name: '<String>', required: '<Boolean>', atomId: '<UUID>', present: '<Boolean>', secretsObjectName: '<String>', configObjectName: '<String>' });
```

### DbPreset

```typescript
// List all dbPresets
const { data, isLoading } = useDbPresetsQuery({
  selection: { fields: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } },
});

// Get one dbPreset
const { data: item } = useDbPresetQuery({
  id: '<UUID>',
  selection: { fields: { id: true, storeId: true, slug: true, definition: true, commitId: true, modulesHash: true, label: true, description: true, active: true, createdAt: true, updatedAt: true } },
});

// Create a dbPreset
const { mutate: create } = useCreateDbPresetMutation({
  selection: { fields: { id: true } },
});
create({ storeId: '<UUID>', slug: '<String>', definition: '<JSON>', commitId: '<UUID>', modulesHash: '<UUID>', label: '<String>', description: '<String>', active: '<Boolean>' });
```

### PlatformNamespace

```typescript
// List all platformNamespaces
const { data, isLoading } = usePlatformNamespacesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } },
});

// Get one platformNamespace
const { data: item } = usePlatformNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, isManaged: true } },
});

// Create a platformNamespace
const { mutate: create } = useCreatePlatformNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', isManaged: '<Boolean>' });
```

### FunctionGraph

```typescript
// List all functionGraphs
const { data, isLoading } = useFunctionGraphsQuery({
  selection: { fields: { id: true, scopeId: true, storeId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } },
});

// Get one functionGraph
const { data: item } = useFunctionGraphQuery({
  id: '<UUID>',
  selection: { fields: { id: true, scopeId: true, storeId: true, context: true, name: true, description: true, definitionsCommitId: true, isValid: true, validationErrors: true, createdBy: true, createdAt: true, updatedAt: true } },
});

// Create a functionGraph
const { mutate: create } = useCreateFunctionGraphMutation({
  selection: { fields: { id: true } },
});
create({ scopeId: '<UUID>', storeId: '<UUID>', context: '<String>', name: '<String>', description: '<String>', definitionsCommitId: '<UUID>', isValid: '<Boolean>', validationErrors: '<JSON>', createdBy: '<UUID>' });
```

### FunctionGraphExecutionNodeState

```typescript
// List all functionGraphExecutionNodeStates
const { data, isLoading } = useFunctionGraphExecutionNodeStatesQuery({
  selection: { fields: { createdAt: true, id: true, executionId: true, scopeId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } },
});

// Get one functionGraphExecutionNodeState
const { data: item } = useFunctionGraphExecutionNodeStateQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, executionId: true, scopeId: true, nodeName: true, nodePath: true, status: true, startedAt: true, completedAt: true, errorCode: true, errorMessage: true, outputId: true } },
});

// Create a functionGraphExecutionNodeState
const { mutate: create } = useCreateFunctionGraphExecutionNodeStateMutation({
  selection: { fields: { id: true } },
});
create({ executionId: '<UUID>', scopeId: '<UUID>', nodeName: '<String>', nodePath: '<String>', status: '<String>', startedAt: '<Datetime>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', outputId: '<UUID>' });
```

### Namespace

```typescript
// List all namespaces
const { data, isLoading } = useNamespacesQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } },
});

// Get one namespace
const { data: item } = useNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, name: true, namespaceName: true, description: true, isActive: true, status: true, lastError: true, labels: true, annotations: true, databaseId: true, isManaged: true } },
});

// Create a namespace
const { mutate: create } = useCreateNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ name: '<String>', namespaceName: '<String>', description: '<String>', isActive: '<Boolean>', status: '<String>', lastError: '<String>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>', isManaged: '<Boolean>' });
```

### PlatformFunctionInvocation

```typescript
// List all platformFunctionInvocations
const { data, isLoading } = usePlatformFunctionInvocationsQuery({
  selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});

// Get one platformFunctionInvocation
const { data: item } = usePlatformFunctionInvocationQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, actorId: true, taskIdentifier: true, payload: true, status: true, result: true, error: true, durationMs: true, jobId: true, startedAt: true, completedAt: true, parentInvocationId: true, graphExecutionId: true } },
});

// Create a platformFunctionInvocation
const { mutate: create } = useCreatePlatformFunctionInvocationMutation({
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
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true } },
});

// Get one platformNamespaceEvent
const { data: item } = usePlatformNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true } },
});

// Create a platformNamespaceEvent
const { mutate: create } = useCreatePlatformNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>' });
```

### IntegrationProvider

```typescript
// List all integrationProviders
const { data, isLoading } = useIntegrationProvidersQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, slug: true, name: true, description: true, category: true, icon: true, logo: true, brand: true, requiredSecrets: true, requiredConfigs: true } },
});

// Get one integrationProvider
const { data: item } = useIntegrationProviderQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, slug: true, name: true, description: true, category: true, icon: true, logo: true, brand: true, requiredSecrets: true, requiredConfigs: true } },
});

// Create a integrationProvider
const { mutate: create } = useCreateIntegrationProviderMutation({
  selection: { fields: { id: true } },
});
create({ slug: '<String>', name: '<String>', description: '<String>', category: '<String>', icon: '<String>', logo: '<Image>', brand: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>' });
```

### NamespaceEvent

```typescript
// List all namespaceEvents
const { data, isLoading } = useNamespaceEventsQuery({
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } },
});

// Get one namespaceEvent
const { data: item } = useNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, id: true, namespaceId: true, eventType: true, actorId: true, message: true, metadata: true, cpuMillicores: true, memoryBytes: true, storageBytes: true, networkIngressBytes: true, networkEgressBytes: true, podCount: true, metrics: true, databaseId: true } },
});

// Create a namespaceEvent
const { mutate: create } = useCreateNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ namespaceId: '<UUID>', eventType: '<String>', actorId: '<UUID>', message: '<String>', metadata: '<JSON>', cpuMillicores: '<Int>', memoryBytes: '<BigInt>', storageBytes: '<BigInt>', networkIngressBytes: '<BigInt>', networkEgressBytes: '<BigInt>', podCount: '<Int>', metrics: '<JSON>', databaseId: '<UUID>' });
```

### FunctionGraphExecution

```typescript
// List all functionGraphExecutions
const { data, isLoading } = useFunctionGraphExecutionsQuery({
  selection: { fields: { startedAt: true, id: true, graphId: true, invocationId: true, scopeId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, lastProgressAt: true, errorCode: true, errorMessage: true } },
});

// Get one functionGraphExecution
const { data: item } = useFunctionGraphExecutionQuery({
  id: '<UUID>',
  selection: { fields: { startedAt: true, id: true, graphId: true, invocationId: true, scopeId: true, outputNode: true, outputPort: true, status: true, inputPayload: true, outputPayload: true, nodeOutputs: true, executionPlan: true, currentWave: true, parentExecutionId: true, parentNodeName: true, definitionsCommitId: true, tickCount: true, completedAt: true, maxTicks: true, maxPendingJobs: true, timeoutAt: true, lastProgressAt: true, errorCode: true, errorMessage: true } },
});

// Create a functionGraphExecution
const { mutate: create } = useCreateFunctionGraphExecutionMutation({
  selection: { fields: { id: true } },
});
create({ startedAt: '<Datetime>', graphId: '<UUID>', invocationId: '<UUID>', scopeId: '<UUID>', outputNode: '<String>', outputPort: '<String>', status: '<String>', inputPayload: '<JSON>', outputPayload: '<JSON>', nodeOutputs: '<JSON>', executionPlan: '<JSON>', currentWave: '<Int>', parentExecutionId: '<UUID>', parentNodeName: '<String>', definitionsCommitId: '<UUID>', tickCount: '<Int>', completedAt: '<Datetime>', maxTicks: '<Int>', maxPendingJobs: '<Int>', timeoutAt: '<Datetime>', lastProgressAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>' });
```

### PlatformFunctionDefinition

```typescript
// List all platformFunctionDefinitions
const { data, isLoading } = usePlatformFunctionDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } },
});

// Get one platformFunctionDefinition
const { data: item } = usePlatformFunctionDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true } },
});

// Create a platformFunctionDefinition
const { mutate: create } = useCreatePlatformFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isPublished: '<Boolean>', accessChannels: '<String>', publishedAt: '<Datetime>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', targetSchema: '<String>', targetFunction: '<String>', moduleTable: '<String>', functionColumns: '<JSON>', payloadArgs: '<JSON>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>' });
```

### FunctionDefinition

```typescript
// List all functionDefinitions
const { data, isLoading } = useFunctionDefinitionsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true, databaseId: true } },
});

// Get one functionDefinition
const { data: item } = useFunctionDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { id: true, createdAt: true, updatedAt: true, scope: true, name: true, taskIdentifier: true, description: true, isPublished: true, accessChannels: true, publishedAt: true, maxAttempts: true, priority: true, queueName: true, runtime: true, targetSchema: true, targetFunction: true, moduleTable: true, functionColumns: true, payloadArgs: true, image: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, isBuiltIn: true, requiredSecrets: true, requiredConfigs: true, integrations: true, requiredBuckets: true, requiredModels: true, inputs: true, outputs: true, props: true, volatile: true, icon: true, category: true, databaseId: true } },
});

// Create a functionDefinition
const { mutate: create } = useCreateFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ scope: '<String>', name: '<String>', taskIdentifier: '<String>', description: '<String>', isPublished: '<Boolean>', accessChannels: '<String>', publishedAt: '<Datetime>', maxAttempts: '<Int>', priority: '<Int>', queueName: '<String>', runtime: '<String>', targetSchema: '<String>', targetFunction: '<String>', moduleTable: '<String>', functionColumns: '<JSON>', payloadArgs: '<JSON>', image: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', isBuiltIn: '<Boolean>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>', integrations: '<String>', requiredBuckets: '<String>', requiredModels: '<String>', inputs: '<JSON>', outputs: '<JSON>', props: '<JSON>', volatile: '<Boolean>', icon: '<String>', category: '<String>', databaseId: '<UUID>' });
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

### `useInfraInitEmptyRepoMutation`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInitEmptyRepoInput (required) |

### `useInitEmptyRepoMutation`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

### `useImportDefinitionsMutation`

importDefinitions

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ImportDefinitionsInput (required) |

### `useInfraSetDataAtPathMutation`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraSetDataAtPathInput (required) |

### `useSetDataAtPathMutation`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

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

### `useInfraInsertNodeAtPathMutation`

infraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInsertNodeAtPathInput (required) |

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
