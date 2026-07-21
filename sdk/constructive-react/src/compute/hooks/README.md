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
| `useDbPresetsQuery` | Query | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useDbPresetQuery` | Query | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useCreateDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useUpdateDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useDeleteDbPresetMutation` | Mutation | Database provisioning preset catalog — merkle-versioned head over the infra store |
| `useFunctionApiBindingsQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useFunctionApiBindingQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useCreateFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useUpdateFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useDeleteFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useFunctionDefinitionsQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useFunctionDefinitionQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useCreateFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useUpdateFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useDeleteFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useFunctionDeploymentsQuery` | Query | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useFunctionDeploymentQuery` | Query | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useCreateFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useUpdateFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useDeleteFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useFunctionDeploymentEventsQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useFunctionDeploymentEventQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useCreateFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useUpdateFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useDeleteFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useFunctionExecutionLogsQuery` | Query | Function execution logs — structured console output per invocation |
| `useFunctionExecutionLogQuery` | Query | Function execution logs — structured console output per invocation |
| `useCreateFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useUpdateFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useDeleteFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useFunctionGraphCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useFunctionGraphCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreateFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdateFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeleteFunctionGraphCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useFunctionGraphsQuery` | Query | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useFunctionGraphQuery` | Query | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useCreateFunctionGraphMutation` | Mutation | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useUpdateFunctionGraphMutation` | Mutation | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useDeleteFunctionGraphMutation` | Mutation | Flow graph definitions — FBP graphs stored in the dedicated graph Merkle store |
| `useFunctionGraphExecutionsQuery` | Query | Ephemeral execution state for flow graph evaluation |
| `useFunctionGraphExecutionQuery` | Query | Ephemeral execution state for flow graph evaluation |
| `useCreateFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `useUpdateFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `useDeleteFunctionGraphExecutionMutation` | Mutation | Ephemeral execution state for flow graph evaluation |
| `useFunctionGraphExecutionNodeStatesQuery` | Query | Per-node execution state — tracks individual node lifecycle for debugging |
| `useFunctionGraphExecutionNodeStateQuery` | Query | Per-node execution state — tracks individual node lifecycle for debugging |
| `useCreateFunctionGraphExecutionNodeStateMutation` | Mutation | Per-node execution state — tracks individual node lifecycle for debugging |
| `useUpdateFunctionGraphExecutionNodeStateMutation` | Mutation | Per-node execution state — tracks individual node lifecycle for debugging |
| `useDeleteFunctionGraphExecutionNodeStateMutation` | Mutation | Per-node execution state — tracks individual node lifecycle for debugging |
| `useFunctionGraphExecutionOutputsQuery` | Query | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useFunctionGraphExecutionOutputQuery` | Query | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useCreateFunctionGraphExecutionOutputMutation` | Mutation | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useUpdateFunctionGraphExecutionOutputMutation` | Mutation | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useDeleteFunctionGraphExecutionOutputMutation` | Mutation | Content-addressed store for execution outputs — hash-referenced from node_outputs |
| `useFunctionGraphObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useFunctionGraphObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreateFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdateFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeleteFunctionGraphObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
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
| `useFunctionInvocationAttemptsQuery` | Query | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `useFunctionInvocationAttemptQuery` | Query | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `useCreateFunctionInvocationAttemptMutation` | Mutation | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `useUpdateFunctionInvocationAttemptMutation` | Mutation | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `useDeleteFunctionInvocationAttemptMutation` | Mutation | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `useFunctionInvocationsQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `useFunctionInvocationQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `useCreateFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `useUpdateFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `useDeleteFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `useGetAllTreeNodesQuery` | Query | List all getAllTreeNodes |
| `useCreateGetAllTreeNodesRecordMutation` | Mutation | Create a getAllTreeNodesRecord |
| `useInfraCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useInfraCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreateInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdateInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeleteInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useInfraGetAllTreeNodesQuery` | Query | List all infraGetAllTreeNodes |
| `useCreateInfraGetAllTreeNodesRecordMutation` | Mutation | Create a infraGetAllTreeNodesRecord |
| `useInfraObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useInfraObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreateInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdateInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeleteInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
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
| `useIntegrationProvidersQuery` | Query | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useIntegrationProviderQuery` | Query | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useCreateIntegrationProviderMutation` | Mutation | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useUpdateIntegrationProviderMutation` | Mutation | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useDeleteIntegrationProviderMutation` | Mutation | Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth. |
| `useNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreateNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdateNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeleteNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useNamespaceEventsQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useNamespaceEventQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useCreateNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useUpdateNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useDeleteNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `usePlatformFunctionApiBindingsQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `usePlatformFunctionApiBindingQuery` | Query | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useCreatePlatformFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useUpdatePlatformFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `useDeletePlatformFunctionApiBindingMutation` | Mutation | Join table binding function definitions to API endpoints with per-binding alias and config |
| `usePlatformFunctionDefinitionsQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `usePlatformFunctionDefinitionQuery` | Query | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useCreatePlatformFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useUpdatePlatformFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `useDeletePlatformFunctionDefinitionMutation` | Mutation | Function definitions — registered cloud functions with routing, queue, and retry configuration |
| `usePlatformFunctionDeploymentsQuery` | Query | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `usePlatformFunctionDeploymentQuery` | Query | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useCreatePlatformFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useUpdatePlatformFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `useDeletePlatformFunctionDeploymentMutation` | Mutation | Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace) |
| `usePlatformFunctionDeploymentEventsQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `usePlatformFunctionDeploymentEventQuery` | Query | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useCreatePlatformFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useUpdatePlatformFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `useDeletePlatformFunctionDeploymentEventMutation` | Mutation | Deployment lifecycle events — audit log of provisioning, scaling, and failure events |
| `usePlatformFunctionExecutionLogsQuery` | Query | Function execution logs — structured console output per invocation |
| `usePlatformFunctionExecutionLogQuery` | Query | Function execution logs — structured console output per invocation |
| `useCreatePlatformFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useUpdatePlatformFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `useDeletePlatformFunctionExecutionLogMutation` | Mutation | Function execution logs — structured console output per invocation |
| `usePlatformFunctionInvocationAttemptsQuery` | Query | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `usePlatformFunctionInvocationAttemptQuery` | Query | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `useCreatePlatformFunctionInvocationAttemptMutation` | Mutation | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `useUpdatePlatformFunctionInvocationAttemptMutation` | Mutation | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `useDeletePlatformFunctionInvocationAttemptMutation` | Mutation | Function invocation attempts — one row per worker attempt (including failed retries) with duration and error detail |
| `usePlatformFunctionInvocationsQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `usePlatformFunctionInvocationQuery` | Query | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `useCreatePlatformFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `useUpdatePlatformFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `useDeletePlatformFunctionInvocationMutation` | Mutation | Function invocation log — INSERT to call a function (business-layer, metered). Linked to definitions via function_definition_id FK, with task_identifier as the denormalized routing/audit slug. |
| `usePlatformInfraCommitsQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `usePlatformInfraCommitQuery` | Query | Commit history — each commit snapshots a tree root for a store |
| `useCreatePlatformInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useUpdatePlatformInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `useDeletePlatformInfraCommitMutation` | Mutation | Commit history — each commit snapshots a tree root for a store |
| `usePlatformInfraGetAllTreeNodesQuery` | Query | List all platformInfraGetAllTreeNodes |
| `useCreatePlatformInfraGetAllTreeNodesRecordMutation` | Mutation | Create a platformInfraGetAllTreeNodesRecord |
| `usePlatformInfraObjectsQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `usePlatformInfraObjectQuery` | Query | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useCreatePlatformInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useUpdatePlatformInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `useDeletePlatformInfraObjectMutation` | Mutation | Content-addressed Merkle tree objects keyed by UUID v5 hash of data + children |
| `usePlatformInfraRefsQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `usePlatformInfraRefQuery` | Query | Branch heads — mutable pointers into the commit chain |
| `useCreatePlatformInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useUpdatePlatformInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `useDeletePlatformInfraRefMutation` | Mutation | Branch heads — mutable pointers into the commit chain |
| `usePlatformInfraStoresQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `usePlatformInfraStoreQuery` | Query | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useCreatePlatformInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useUpdatePlatformInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `useDeletePlatformInfraStoreMutation` | Mutation | Named stores — one per version-controlled tree (e.g. one graph, one definition set) |
| `usePlatformNamespacesQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformNamespaceQuery` | Query | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useCreatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useUpdatePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `useDeletePlatformNamespaceMutation` | Mutation | Logical namespace containers for grouping secrets, config, functions, and other resources |
| `usePlatformNamespaceEventsQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `usePlatformNamespaceEventQuery` | Query | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useCreatePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useUpdatePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `useDeletePlatformNamespaceEventMutation` | Mutation | Namespace lifecycle events — audit log of creation, activation, deactivation, label changes |
| `usePlatformResourcesQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `usePlatformResourceQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useCreatePlatformResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useUpdatePlatformResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useDeletePlatformResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `usePlatformResourceDeclaredCapacitiesQuery` | Query | List all platformResourceDeclaredCapacities |
| `useCreatePlatformResourceDeclaredCapacityMutation` | Mutation | Create a platformResourceDeclaredCapacity |
| `usePlatformResourceDefinitionsQuery` | Query | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `usePlatformResourceDefinitionQuery` | Query | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useCreatePlatformResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useUpdatePlatformResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useDeletePlatformResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `usePlatformResourceEventsQuery` | Query | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `usePlatformResourceEventQuery` | Query | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useCreatePlatformResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useUpdatePlatformResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useDeletePlatformResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `usePlatformResourceInstallationsQuery` | Query | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `usePlatformResourceInstallationQuery` | Query | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `useCreatePlatformResourceInstallationMutation` | Mutation | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `useUpdatePlatformResourceInstallationMutation` | Mutation | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `useDeletePlatformResourceInstallationMutation` | Mutation | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `usePlatformResourceStatusChecksQuery` | Query | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `usePlatformResourceStatusCheckQuery` | Query | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useCreatePlatformResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useUpdatePlatformResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useDeletePlatformResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `usePlatformResourceUsageLogsQuery` | Query | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `usePlatformResourceUsageLogQuery` | Query | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `useCreatePlatformResourceUsageLogMutation` | Mutation | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `useUpdatePlatformResourceUsageLogMutation` | Mutation | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `useDeletePlatformResourceUsageLogMutation` | Mutation | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `usePlatformResourceUsageSummariesQuery` | Query | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `usePlatformResourceUsageSummaryQuery` | Query | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `useCreatePlatformResourceUsageSummaryMutation` | Mutation | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `useUpdatePlatformResourceUsageSummaryMutation` | Mutation | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `useDeletePlatformResourceUsageSummaryMutation` | Mutation | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `usePlatformResourceUtilizationsQuery` | Query | List all platformResourceUtilizations |
| `useCreatePlatformResourceUtilizationMutation` | Mutation | Create a platformResourceUtilization |
| `usePlatformResourcesHealthsQuery` | Query | List all platformResourcesHealths |
| `usePlatformResourcesHealthQuery` | Query | Get one platformResourcesHealth |
| `useCreatePlatformResourcesHealthMutation` | Mutation | Create a platformResourcesHealth |
| `useUpdatePlatformResourcesHealthMutation` | Mutation | Update a platformResourcesHealth |
| `useDeletePlatformResourcesHealthMutation` | Mutation | Delete a platformResourcesHealth |
| `usePlatformResourcesRequirementsStatesQuery` | Query | List all platformResourcesRequirementsStates |
| `useCreatePlatformResourcesRequirementsStateMutation` | Mutation | Create a platformResourcesRequirementsState |
| `usePlatformResourcesResolvedRequirementsQuery` | Query | List all platformResourcesResolvedRequirements |
| `useCreatePlatformResourcesResolvedRequirementMutation` | Mutation | Create a platformResourcesResolvedRequirement |
| `usePlatformWebhookEndpointsQuery` | Query | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `usePlatformWebhookEndpointQuery` | Query | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `useCreatePlatformWebhookEndpointMutation` | Mutation | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `useUpdatePlatformWebhookEndpointMutation` | Mutation | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `useDeletePlatformWebhookEndpointMutation` | Mutation | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `usePlatformWebhookEventsQuery` | Query | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `usePlatformWebhookEventQuery` | Query | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useCreatePlatformWebhookEventMutation` | Mutation | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useUpdatePlatformWebhookEventMutation` | Mutation | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useDeletePlatformWebhookEventMutation` | Mutation | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useResourcesQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useResourceQuery` | Query | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useCreateResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useUpdateResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useDeleteResourceMutation` | Mutation | Unified K8s resource declarations — stores desired state (spec) and observed state (status) for all resource kinds within a namespace |
| `useResourceDeclaredCapacitiesQuery` | Query | List all resourceDeclaredCapacities |
| `useCreateResourceDeclaredCapacityMutation` | Mutation | Create a resourceDeclaredCapacity |
| `useResourceDefinitionsQuery` | Query | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useResourceDefinitionQuery` | Query | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useCreateResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useUpdateResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useDeleteResourceDefinitionMutation` | Mutation | Resource definitions — templates for resource kinds declaring default spec and secret/config requirements |
| `useResourceEventsQuery` | Query | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useResourceEventQuery` | Query | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useCreateResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useUpdateResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useDeleteResourceEventMutation` | Mutation | Resource lifecycle events — audit log of provisioning, updates, and failure events |
| `useResourceInstallationsQuery` | Query | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `useResourceInstallationQuery` | Query | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `useCreateResourceInstallationMutation` | Mutation | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `useUpdateResourceInstallationMutation` | Mutation | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `useDeleteResourceInstallationMutation` | Mutation | Installed resource bundle ("release") — groups a set of resources; params are merkle-versioned in the scope's shared infra store for rollback |
| `useResourceStatusChecksQuery` | Query | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useResourceStatusCheckQuery` | Query | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useCreateResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useUpdateResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useDeleteResourceStatusCheckMutation` | Mutation | On-demand resource status checks — diagnostic snapshots from the runtime (K8s status, conditions, log tails) |
| `useResourceUsageLogsQuery` | Query | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `useResourceUsageLogQuery` | Query | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `useCreateResourceUsageLogMutation` | Mutation | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `useUpdateResourceUsageLogMutation` | Mutation | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `useDeleteResourceUsageLogMutation` | Mutation | Raw resource usage log — interval-accounting measurements from heartbeats (self), the reconciler (observer), and the namespace-grain collector (prometheus) |
| `useResourceUsageSummariesQuery` | Query | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `useResourceUsageSummaryQuery` | Query | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `useCreateResourceUsageSummaryMutation` | Mutation | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `useUpdateResourceUsageSummaryMutation` | Mutation | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `useDeleteResourceUsageSummaryMutation` | Mutation | Resource usage summaries — runtime seconds, GB-seconds, and max gauges per (resource, namespace, day); resource_id-NULL rows are namespace-grain totals |
| `useResourceUtilizationsQuery` | Query | List all resourceUtilizations |
| `useCreateResourceUtilizationMutation` | Mutation | Create a resourceUtilization |
| `useResourcesHealthsQuery` | Query | List all resourcesHealths |
| `useResourcesHealthQuery` | Query | Get one resourcesHealth |
| `useCreateResourcesHealthMutation` | Mutation | Create a resourcesHealth |
| `useUpdateResourcesHealthMutation` | Mutation | Update a resourcesHealth |
| `useDeleteResourcesHealthMutation` | Mutation | Delete a resourcesHealth |
| `useResourcesRequirementsStatesQuery` | Query | List all resourcesRequirementsStates |
| `useCreateResourcesRequirementsStateMutation` | Mutation | Create a resourcesRequirementsState |
| `useResourcesResolvedRequirementsQuery` | Query | List all resourcesResolvedRequirements |
| `useCreateResourcesResolvedRequirementMutation` | Mutation | Create a resourcesResolvedRequirement |
| `useWebhookEndpointsQuery` | Query | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `useWebhookEndpointQuery` | Query | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `useCreateWebhookEndpointMutation` | Mutation | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `useUpdateWebhookEndpointMutation` | Mutation | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `useDeleteWebhookEndpointMutation` | Mutation | Webhook route authority: (host, path) -> function task_identifier invoked through the webhook channel, with provider, signing-secret reference, and replay window |
| `useWebhookEventsQuery` | Query | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useWebhookEventQuery` | Query | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useCreateWebhookEventMutation` | Mutation | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useUpdateWebhookEventMutation` | Mutation | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useDeleteWebhookEventMutation` | Mutation | Durable webhook acceptance log — one row per accepted delivery, deduplicated on (endpoint_id, external_event_id), linked to the pending function invocation it enqueued |
| `useReadFunctionGraphQuery` | Query | readFunctionGraph |
| `useAddEdgeMutation` | Mutation | addEdge |
| `useAddEdgeAndSaveMutation` | Mutation | addEdgeAndSave |
| `useAddNodeMutation` | Mutation | addNode |
| `useAddNodeAndSaveMutation` | Mutation | addNodeAndSave |
| `useCopyGraphMutation` | Mutation | copyGraph |
| `useImportDefinitionsMutation` | Mutation | importDefinitions |
| `useImportGraphJsonMutation` | Mutation | importGraphJson |
| `useInfraInitEmptyRepoMutation` | Mutation | infraInitEmptyRepo |
| `useInfraInsertNodeAtPathMutation` | Mutation | infraInsertNodeAtPath |
| `useInfraSetDataAtPathMutation` | Mutation | infraSetDataAtPath |
| `useInitEmptyRepoMutation` | Mutation | initEmptyRepo |
| `useInsertNodeAtPathMutation` | Mutation | insertNodeAtPath |
| `usePlatformInfraInitEmptyRepoMutation` | Mutation | platformInfraInitEmptyRepo |
| `usePlatformInfraInsertNodeAtPathMutation` | Mutation | platformInfraInsertNodeAtPath |
| `usePlatformInfraSetDataAtPathMutation` | Mutation | platformInfraSetDataAtPath |
| `usePlatformResourceInstallationsInstallMutation` | Mutation | platformResourceInstallationsInstall |
| `usePlatformResourceInstallationsRollbackMutation` | Mutation | platformResourceInstallationsRollback |
| `usePlatformResourceInstallationsUninstallMutation` | Mutation | platformResourceInstallationsUninstall |
| `usePlatformResourceInstallationsUpgradeMutation` | Mutation | platformResourceInstallationsUpgrade |
| `useProvisionBucketMutation` | Mutation | Provision an S3 bucket for a logical bucket in the database.
Reads the bucket config via RLS, then creates and configures
the S3 bucket with the appropriate privacy policies, CORS rules,
and lifecycle settings. |
| `useResourceInstallationsInstallMutation` | Mutation | resourceInstallationsInstall |
| `useResourceInstallationsRollbackMutation` | Mutation | resourceInstallationsRollback |
| `useResourceInstallationsUninstallMutation` | Mutation | resourceInstallationsUninstall |
| `useResourceInstallationsUpgradeMutation` | Mutation | resourceInstallationsUpgrade |
| `useSaveGraphMutation` | Mutation | saveGraph |
| `useSetDataAtPathMutation` | Mutation | setDataAtPath |
| `useStartExecutionMutation` | Mutation | startExecution |
| `useValidateFunctionGraphMutation` | Mutation | validateFunctionGraph |

## Table Hooks

### DbPreset

```typescript
// List all dbPresets
const { data, isLoading } = useDbPresetsQuery({
  selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } },
});

// Get one dbPreset
const { data: item } = useDbPresetQuery({
  id: '<UUID>',
  selection: { fields: { active: true, commitId: true, createdAt: true, definition: true, description: true, id: true, label: true, modulesHash: true, slug: true, storeId: true, updatedAt: true } },
});

// Create a dbPreset
const { mutate: create } = useCreateDbPresetMutation({
  selection: { fields: { id: true } },
});
create({ active: '<Boolean>', commitId: '<UUID>', definition: '<JSON>', description: '<String>', label: '<String>', modulesHash: '<UUID>', slug: '<String>', storeId: '<UUID>' });
```

### FunctionApiBinding

```typescript
// List all functionApiBindings
const { data, isLoading } = useFunctionApiBindingsQuery({
  selection: { fields: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } },
});

// Get one functionApiBinding
const { data: item } = useFunctionApiBindingQuery({
  id: '<UUID>',
  selection: { fields: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } },
});

// Create a functionApiBinding
const { mutate: create } = useCreateFunctionApiBindingMutation({
  selection: { fields: { id: true } },
});
create({ alias: '<String>', apiId: '<UUID>', config: '<JSON>', functionDefinitionId: '<UUID>' });
```

### FunctionDefinition

```typescript
// List all functionDefinitions
const { data, isLoading } = useFunctionDefinitionsQuery({
  selection: { fields: { accessChannels: true, category: true, concurrency: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, graphId: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, memoryLimitBytes: true, memoryRequestBytes: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, protected: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } },
});

// Get one functionDefinition
const { data: item } = useFunctionDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { accessChannels: true, category: true, concurrency: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, databaseId: true, description: true, fnCategory: true, functionColumns: true, graphId: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, memoryLimitBytes: true, memoryRequestBytes: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, protected: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } },
});

// Create a functionDefinition
const { mutate: create } = useCreateFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ accessChannels: '<String>', category: '<String>', concurrency: '<Int>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', databaseId: '<UUID>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', graphId: '<UUID>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', protected: '<Boolean>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' });
```

### FunctionDeployment

```typescript
// List all functionDeployments
const { data, isLoading } = useFunctionDeploymentsQuery({
  selection: { fields: { annotations: true, concurrency: true, createdAt: true, databaseId: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } },
});

// Get one functionDeployment
const { data: item } = useFunctionDeploymentQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, concurrency: true, createdAt: true, databaseId: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } },
});

// Create a functionDeployment
const { mutate: create } = useCreateFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', concurrency: '<Int>', databaseId: '<UUID>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' });
```

### FunctionDeploymentEvent

```typescript
// List all functionDeploymentEvents
const { data, isLoading } = useFunctionDeploymentEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } },
});

// Get one functionDeploymentEvent
const { data: item } = useFunctionDeploymentEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } },
});

// Create a functionDeploymentEvent
const { mutate: create } = useCreateFunctionDeploymentEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', databaseId: '<UUID>', deploymentId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>' });
```

### FunctionExecutionLog

```typescript
// List all functionExecutionLogs
const { data, isLoading } = useFunctionExecutionLogsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } },
});

// Get one functionExecutionLog
const { data: item } = useFunctionExecutionLogQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } },
});

// Create a functionExecutionLog
const { mutate: create } = useCreateFunctionExecutionLogMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', databaseId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' });
```

### FunctionGraphCommit

```typescript
// List all functionGraphCommits
const { data, isLoading } = useFunctionGraphCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});

// Get one functionGraphCommit
const { data: item } = useFunctionGraphCommitQuery({
  id: '<UUID>',
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});

// Create a functionGraphCommit
const { mutate: create } = useCreateFunctionGraphCommitMutation({
  selection: { fields: { id: true } },
});
create({ authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```

### FunctionGraph

```typescript
// List all functionGraphs
const { data, isLoading } = useFunctionGraphsQuery({
  selection: { fields: { context: true, createdAt: true, createdBy: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, scopeId: true, storeId: true, updatedAt: true, validationErrors: true } },
});

// Get one functionGraph
const { data: item } = useFunctionGraphQuery({
  id: '<UUID>',
  selection: { fields: { context: true, createdAt: true, createdBy: true, definitionsCommitId: true, description: true, id: true, isValid: true, name: true, scopeId: true, storeId: true, updatedAt: true, validationErrors: true } },
});

// Create a functionGraph
const { mutate: create } = useCreateFunctionGraphMutation({
  selection: { fields: { id: true } },
});
create({ context: '<String>', createdBy: '<UUID>', definitionsCommitId: '<UUID>', description: '<String>', isValid: '<Boolean>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>', validationErrors: '<JSON>' });
```

### FunctionGraphExecution

```typescript
// List all functionGraphExecutions
const { data, isLoading } = useFunctionGraphExecutionsQuery({
  selection: { fields: { actorId: true, completedAt: true, currentWave: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } },
});

// Get one functionGraphExecution
const { data: item } = useFunctionGraphExecutionQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, completedAt: true, currentWave: true, definitionsCommitId: true, entityId: true, entityType: true, errorCode: true, errorMessage: true, executionPlan: true, graphId: true, id: true, inputPayload: true, invocationCreatedAt: true, invocationId: true, lastProgressAt: true, maxPendingJobs: true, maxTicks: true, nodeOutputs: true, organizationId: true, outputNames: true, outputNode: true, outputPayload: true, outputPort: true, parentExecutionId: true, parentInvocationId: true, parentNodeName: true, principalId: true, scopeId: true, startedAt: true, status: true, tickCount: true, timeoutAt: true } },
});

// Create a functionGraphExecution
const { mutate: create } = useCreateFunctionGraphExecutionMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', completedAt: '<Datetime>', currentWave: '<Int>', definitionsCommitId: '<UUID>', entityId: '<UUID>', entityType: '<String>', errorCode: '<String>', errorMessage: '<String>', executionPlan: '<JSON>', graphId: '<UUID>', inputPayload: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', lastProgressAt: '<Datetime>', maxPendingJobs: '<Int>', maxTicks: '<Int>', nodeOutputs: '<JSON>', organizationId: '<UUID>', outputNames: '<String>', outputNode: '<String>', outputPayload: '<JSON>', outputPort: '<String>', parentExecutionId: '<UUID>', parentInvocationId: '<UUID>', parentNodeName: '<String>', principalId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>', tickCount: '<Int>', timeoutAt: '<Datetime>' });
```

### FunctionGraphExecutionNodeState

```typescript
// List all functionGraphExecutionNodeStates
const { data, isLoading } = useFunctionGraphExecutionNodeStatesQuery({
  selection: { fields: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } },
});

// Get one functionGraphExecutionNodeState
const { data: item } = useFunctionGraphExecutionNodeStateQuery({
  id: '<UUID>',
  selection: { fields: { callbackInputs: true, callbackMeta: true, callbackTokenHash: true, completedAt: true, createdAt: true, errorCode: true, errorMessage: true, executionId: true, id: true, nodeName: true, nodePath: true, outputId: true, scopeId: true, startedAt: true, status: true } },
});

// Create a functionGraphExecutionNodeState
const { mutate: create } = useCreateFunctionGraphExecutionNodeStateMutation({
  selection: { fields: { id: true } },
});
create({ callbackInputs: '<JSON>', callbackMeta: '<JSON>', callbackTokenHash: '<String>', completedAt: '<Datetime>', errorCode: '<String>', errorMessage: '<String>', executionId: '<UUID>', nodeName: '<String>', nodePath: '<String>', outputId: '<UUID>', scopeId: '<UUID>', startedAt: '<Datetime>', status: '<String>' });
```

### FunctionGraphExecutionOutput

```typescript
// List all functionGraphExecutionOutputs
const { data, isLoading } = useFunctionGraphExecutionOutputsQuery({
  selection: { fields: { createdAt: true, data: true, hash: true, id: true, scopeId: true } },
});

// Get one functionGraphExecutionOutput
const { data: item } = useFunctionGraphExecutionOutputQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, data: true, hash: true, id: true, scopeId: true } },
});

// Create a functionGraphExecutionOutput
const { mutate: create } = useCreateFunctionGraphExecutionOutputMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', hash: '<Base64EncodedBinary>', scopeId: '<UUID>' });
```

### FunctionGraphObject

```typescript
// List all functionGraphObjects
const { data, isLoading } = useFunctionGraphObjectsQuery({
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});

// Get one functionGraphObject
const { data: item } = useFunctionGraphObjectQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});

// Create a functionGraphObject
const { mutate: create } = useCreateFunctionGraphObjectMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' });
```

### FunctionGraphRef

```typescript
// List all functionGraphRefs
const { data, isLoading } = useFunctionGraphRefsQuery({
  selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } },
});

// Get one functionGraphRef
const { data: item } = useFunctionGraphRefQuery({
  id: '<UUID>',
  selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } },
});

// Create a functionGraphRef
const { mutate: create } = useCreateFunctionGraphRefMutation({
  selection: { fields: { id: true } },
});
create({ commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' });
```

### FunctionGraphStore

```typescript
// List all functionGraphStores
const { data, isLoading } = useFunctionGraphStoresQuery({
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});

// Get one functionGraphStore
const { data: item } = useFunctionGraphStoreQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});

// Create a functionGraphStore
const { mutate: create } = useCreateFunctionGraphStoreMutation({
  selection: { fields: { id: true } },
});
create({ hash: '<UUID>', name: '<String>', scopeId: '<UUID>' });
```

### FunctionInvocationAttempt

```typescript
// List all functionInvocationAttempts
const { data, isLoading } = useFunctionInvocationAttemptsQuery({
  selection: { fields: { actorId: true, attempt: true, createdAt: true, databaseId: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } },
});

// Get one functionInvocationAttempt
const { data: item } = useFunctionInvocationAttemptQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, attempt: true, createdAt: true, databaseId: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } },
});

// Create a functionInvocationAttempt
const { mutate: create } = useCreateFunctionInvocationAttemptMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', attempt: '<Int>', databaseId: '<UUID>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' });
```

### FunctionInvocation

```typescript
// List all functionInvocations
const { data, isLoading } = useFunctionInvocationsQuery({
  selection: { fields: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, databaseId: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } },
});

// Get one functionInvocation
const { data: item } = useFunctionInvocationQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, databaseId: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } },
});

// Create a functionInvocation
const { mutate: create } = useCreateFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', apiBindingId: '<UUID>', channel: '<String>', completedAt: '<Datetime>', databaseId: '<UUID>', definitionScope: '<String>', durationMs: '<Int>', error: '<String>', functionDefinitionId: '<UUID>', graphExecutionId: '<UUID>', jobId: '<BigInt>', parentInvocationId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', result: '<JSON>', startedAt: '<Datetime>', status: '<String>', taskIdentifier: '<String>' });
```

### GetAllTreeNodesRecord

```typescript
// List all getAllTreeNodes
const { data, isLoading } = useGetAllTreeNodesQuery({
  selection: { fields: { data: true, path: true } },
});

// Create a getAllTreeNodesRecord
const { mutate: create } = useCreateGetAllTreeNodesRecordMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', path: '<String>' });
```

### InfraCommit

```typescript
// List all infraCommits
const { data, isLoading } = useInfraCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } },
});

// Get one infraCommit
const { data: item } = useInfraCommitQuery({
  id: '<UUID>',
  selection: { fields: { authorId: true, committerId: true, databaseId: true, date: true, id: true, message: true, parentIds: true, storeId: true, treeId: true } },
});

// Create a infraCommit
const { mutate: create } = useCreateInfraCommitMutation({
  selection: { fields: { id: true } },
});
create({ authorId: '<UUID>', committerId: '<UUID>', databaseId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```

### InfraGetAllTreeNodesRecord

```typescript
// List all infraGetAllTreeNodes
const { data, isLoading } = useInfraGetAllTreeNodesQuery({
  selection: { fields: { data: true, path: true } },
});

// Create a infraGetAllTreeNodesRecord
const { mutate: create } = useCreateInfraGetAllTreeNodesRecordMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', path: '<String>' });
```

### InfraObject

```typescript
// List all infraObjects
const { data, isLoading } = useInfraObjectsQuery({
  selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } },
});

// Get one infraObject
const { data: item } = useInfraObjectQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, data: true, databaseId: true, id: true, kids: true, ktree: true } },
});

// Create a infraObject
const { mutate: create } = useCreateInfraObjectMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', databaseId: '<UUID>', kids: '<UUID>', ktree: '<String>' });
```

### InfraRef

```typescript
// List all infraRefs
const { data, isLoading } = useInfraRefsQuery({
  selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } },
});

// Get one infraRef
const { data: item } = useInfraRefQuery({
  id: '<UUID>',
  selection: { fields: { commitId: true, databaseId: true, id: true, name: true, storeId: true } },
});

// Create a infraRef
const { mutate: create } = useCreateInfraRefMutation({
  selection: { fields: { id: true } },
});
create({ commitId: '<UUID>', databaseId: '<UUID>', name: '<String>', storeId: '<UUID>' });
```

### InfraStore

```typescript
// List all infraStores
const { data, isLoading } = useInfraStoresQuery({
  selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } },
});

// Get one infraStore
const { data: item } = useInfraStoreQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, hash: true, id: true, name: true } },
});

// Create a infraStore
const { mutate: create } = useCreateInfraStoreMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', hash: '<UUID>', name: '<String>' });
```

### IntegrationProvider

```typescript
// List all integrationProviders
const { data, isLoading } = useIntegrationProvidersQuery({
  selection: { fields: { brand: true, category: true, createdAt: true, description: true, icon: true, id: true, logo: true, name: true, requiredConfigs: true, requiredSecrets: true, slug: true, updatedAt: true } },
});

// Get one integrationProvider
const { data: item } = useIntegrationProviderQuery({
  id: '<UUID>',
  selection: { fields: { brand: true, category: true, createdAt: true, description: true, icon: true, id: true, logo: true, name: true, requiredConfigs: true, requiredSecrets: true, slug: true, updatedAt: true } },
});

// Create a integrationProvider
const { mutate: create } = useCreateIntegrationProviderMutation({
  selection: { fields: { id: true } },
});
create({ brand: '<JSON>', category: '<String>', description: '<String>', icon: '<String>', logo: '<Image>', name: '<String>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>' });
```

### Namespace

```typescript
// List all namespaces
const { data, isLoading } = useNamespacesQuery({
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});

// Get one namespace
const { data: item } = useNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, createdAt: true, databaseId: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});

// Create a namespace
const { mutate: create } = useCreateNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', databaseId: '<UUID>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' });
```

### NamespaceEvent

```typescript
// List all namespaceEvents
const { data, isLoading } = useNamespaceEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } },
});

// Get one namespaceEvent
const { data: item } = useNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } },
});

// Create a namespaceEvent
const { mutate: create } = useCreateNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', namespaceId: '<UUID>' });
```

### PlatformFunctionApiBinding

```typescript
// List all platformFunctionApiBindings
const { data, isLoading } = usePlatformFunctionApiBindingsQuery({
  selection: { fields: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } },
});

// Get one platformFunctionApiBinding
const { data: item } = usePlatformFunctionApiBindingQuery({
  id: '<UUID>',
  selection: { fields: { alias: true, apiId: true, config: true, functionDefinitionId: true, id: true } },
});

// Create a platformFunctionApiBinding
const { mutate: create } = useCreatePlatformFunctionApiBindingMutation({
  selection: { fields: { id: true } },
});
create({ alias: '<String>', apiId: '<UUID>', config: '<JSON>', functionDefinitionId: '<UUID>' });
```

### PlatformFunctionDefinition

```typescript
// List all platformFunctionDefinitions
const { data, isLoading } = usePlatformFunctionDefinitionsQuery({
  selection: { fields: { accessChannels: true, billable: true, category: true, concurrency: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, graphId: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, memoryLimitBytes: true, memoryRequestBytes: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, protected: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, system: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } },
});

// Get one platformFunctionDefinition
const { data: item } = usePlatformFunctionDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { accessChannels: true, billable: true, category: true, concurrency: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, description: true, fnCategory: true, functionColumns: true, graphId: true, icon: true, id: true, image: true, inputs: true, integrations: true, isPublished: true, maxAttempts: true, memoryLimitBytes: true, memoryRequestBytes: true, moduleTable: true, name: true, outputs: true, payloadArgs: true, priority: true, props: true, protected: true, publishedAt: true, queueName: true, requiredBuckets: true, requiredConfigs: true, requiredModels: true, requiredSecrets: true, resources: true, runtime: true, scaleMax: true, scaleMin: true, system: true, targetFunction: true, targetSchema: true, taskIdentifier: true, timeoutSeconds: true, updatedAt: true, volatile: true } },
});

// Create a platformFunctionDefinition
const { mutate: create } = useCreatePlatformFunctionDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ accessChannels: '<String>', billable: '<Boolean>', category: '<String>', concurrency: '<Int>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', description: '<String>', fnCategory: '<String>', functionColumns: '<JSON>', graphId: '<UUID>', icon: '<String>', image: '<String>', inputs: '<JSON>', integrations: '<String>', isPublished: '<Boolean>', maxAttempts: '<Int>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', moduleTable: '<String>', name: '<String>', outputs: '<JSON>', payloadArgs: '<JSON>', priority: '<Int>', props: '<JSON>', protected: '<Boolean>', publishedAt: '<Datetime>', queueName: '<String>', requiredBuckets: '<String>', requiredConfigs: '<ResourceRequirement>', requiredModels: '<String>', requiredSecrets: '<ResourceRequirement>', resources: '<JSON>', runtime: '<String>', scaleMax: '<Int>', scaleMin: '<Int>', system: '<Boolean>', targetFunction: '<String>', targetSchema: '<String>', taskIdentifier: '<String>', timeoutSeconds: '<Int>', volatile: '<Boolean>' });
```

### PlatformFunctionDeployment

```typescript
// List all platformFunctionDeployments
const { data, isLoading } = usePlatformFunctionDeploymentsQuery({
  selection: { fields: { annotations: true, concurrency: true, createdAt: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } },
});

// Get one platformFunctionDeployment
const { data: item } = usePlatformFunctionDeploymentQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, concurrency: true, createdAt: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } },
});

// Create a platformFunctionDeployment
const { mutate: create } = useCreatePlatformFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', concurrency: '<Int>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' });
```

### PlatformFunctionDeploymentEvent

```typescript
// List all platformFunctionDeploymentEvents
const { data, isLoading } = usePlatformFunctionDeploymentEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } },
});

// Get one platformFunctionDeploymentEvent
const { data: item } = usePlatformFunctionDeploymentEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, deploymentId: true, eventType: true, id: true, message: true, metadata: true } },
});

// Create a platformFunctionDeploymentEvent
const { mutate: create } = useCreatePlatformFunctionDeploymentEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', deploymentId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>' });
```

### PlatformFunctionExecutionLog

```typescript
// List all platformFunctionExecutionLogs
const { data, isLoading } = usePlatformFunctionExecutionLogsQuery({
  selection: { fields: { actorId: true, createdAt: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } },
});

// Get one platformFunctionExecutionLog
const { data: item } = usePlatformFunctionExecutionLogQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, id: true, invocationId: true, logLevel: true, message: true, metadata: true, taskIdentifier: true } },
});

// Create a platformFunctionExecutionLog
const { mutate: create } = useCreatePlatformFunctionExecutionLogMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', invocationId: '<UUID>', logLevel: '<String>', message: '<String>', metadata: '<JSON>', taskIdentifier: '<String>' });
```

### PlatformFunctionInvocationAttempt

```typescript
// List all platformFunctionInvocationAttempts
const { data, isLoading } = usePlatformFunctionInvocationAttemptsQuery({
  selection: { fields: { actorId: true, attempt: true, createdAt: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } },
});

// Get one platformFunctionInvocationAttempt
const { data: item } = usePlatformFunctionInvocationAttemptQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, attempt: true, createdAt: true, durationMs: true, error: true, errorDetail: true, id: true, invocationCreatedAt: true, invocationId: true, startedAt: true, success: true, taskIdentifier: true } },
});

// Create a platformFunctionInvocationAttempt
const { mutate: create } = useCreatePlatformFunctionInvocationAttemptMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', attempt: '<Int>', durationMs: '<Int>', error: '<String>', errorDetail: '<JSON>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', startedAt: '<Datetime>', success: '<Boolean>', taskIdentifier: '<String>' });
```

### PlatformFunctionInvocation

```typescript
// List all platformFunctionInvocations
const { data, isLoading } = usePlatformFunctionInvocationsQuery({
  selection: { fields: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } },
});

// Get one platformFunctionInvocation
const { data: item } = usePlatformFunctionInvocationQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, apiBindingId: true, channel: true, completedAt: true, createdAt: true, definitionScope: true, durationMs: true, error: true, functionDefinitionId: true, graphExecutionId: true, id: true, jobId: true, parentInvocationId: true, payload: true, provenance: true, result: true, startedAt: true, status: true, taskIdentifier: true } },
});

// Create a platformFunctionInvocation
const { mutate: create } = useCreatePlatformFunctionInvocationMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', apiBindingId: '<UUID>', channel: '<String>', completedAt: '<Datetime>', definitionScope: '<String>', durationMs: '<Int>', error: '<String>', functionDefinitionId: '<UUID>', graphExecutionId: '<UUID>', jobId: '<BigInt>', parentInvocationId: '<UUID>', payload: '<JSON>', provenance: '<JSON>', result: '<JSON>', startedAt: '<Datetime>', status: '<String>', taskIdentifier: '<String>' });
```

### PlatformInfraCommit

```typescript
// List all platformInfraCommits
const { data, isLoading } = usePlatformInfraCommitsQuery({
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});

// Get one platformInfraCommit
const { data: item } = usePlatformInfraCommitQuery({
  id: '<UUID>',
  selection: { fields: { authorId: true, committerId: true, date: true, id: true, message: true, parentIds: true, scopeId: true, storeId: true, treeId: true } },
});

// Create a platformInfraCommit
const { mutate: create } = useCreatePlatformInfraCommitMutation({
  selection: { fields: { id: true } },
});
create({ authorId: '<UUID>', committerId: '<UUID>', date: '<Datetime>', message: '<String>', parentIds: '<UUID>', scopeId: '<UUID>', storeId: '<UUID>', treeId: '<UUID>' });
```

### PlatformInfraGetAllTreeNodesRecord

```typescript
// List all platformInfraGetAllTreeNodes
const { data, isLoading } = usePlatformInfraGetAllTreeNodesQuery({
  selection: { fields: { data: true, path: true } },
});

// Create a platformInfraGetAllTreeNodesRecord
const { mutate: create } = useCreatePlatformInfraGetAllTreeNodesRecordMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', path: '<String>' });
```

### PlatformInfraObject

```typescript
// List all platformInfraObjects
const { data, isLoading } = usePlatformInfraObjectsQuery({
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});

// Get one platformInfraObject
const { data: item } = usePlatformInfraObjectQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, data: true, id: true, kids: true, ktree: true, scopeId: true } },
});

// Create a platformInfraObject
const { mutate: create } = useCreatePlatformInfraObjectMutation({
  selection: { fields: { id: true } },
});
create({ data: '<JSON>', kids: '<UUID>', ktree: '<String>', scopeId: '<UUID>' });
```

### PlatformInfraRef

```typescript
// List all platformInfraRefs
const { data, isLoading } = usePlatformInfraRefsQuery({
  selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } },
});

// Get one platformInfraRef
const { data: item } = usePlatformInfraRefQuery({
  id: '<UUID>',
  selection: { fields: { commitId: true, id: true, name: true, scopeId: true, storeId: true } },
});

// Create a platformInfraRef
const { mutate: create } = useCreatePlatformInfraRefMutation({
  selection: { fields: { id: true } },
});
create({ commitId: '<UUID>', name: '<String>', scopeId: '<UUID>', storeId: '<UUID>' });
```

### PlatformInfraStore

```typescript
// List all platformInfraStores
const { data, isLoading } = usePlatformInfraStoresQuery({
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});

// Get one platformInfraStore
const { data: item } = usePlatformInfraStoreQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, hash: true, id: true, name: true, scopeId: true } },
});

// Create a platformInfraStore
const { mutate: create } = useCreatePlatformInfraStoreMutation({
  selection: { fields: { id: true } },
});
create({ hash: '<UUID>', name: '<String>', scopeId: '<UUID>' });
```

### PlatformNamespace

```typescript
// List all platformNamespaces
const { data, isLoading } = usePlatformNamespacesQuery({
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});

// Get one platformNamespace
const { data: item } = usePlatformNamespaceQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, createdAt: true, description: true, id: true, isActive: true, isManaged: true, labels: true, lastError: true, name: true, namespaceName: true, status: true, updatedAt: true } },
});

// Create a platformNamespace
const { mutate: create } = useCreatePlatformNamespaceMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', description: '<String>', isActive: '<Boolean>', isManaged: '<Boolean>', labels: '<JSON>', lastError: '<String>', name: '<String>', namespaceName: '<String>', status: '<String>' });
```

### PlatformNamespaceEvent

```typescript
// List all platformNamespaceEvents
const { data, isLoading } = usePlatformNamespaceEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } },
});

// Get one platformNamespaceEvent
const { data: item } = usePlatformNamespaceEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, namespaceId: true } },
});

// Create a platformNamespaceEvent
const { mutate: create } = useCreatePlatformNamespaceEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', namespaceId: '<UUID>' });
```

### PlatformResource

```typescript
// List all platformResources
const { data, isLoading } = usePlatformResourcesQuery({
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});

// Get one platformResource
const { data: item } = usePlatformResourceQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});

// Create a platformResource
const { mutate: create } = useCreatePlatformResourceMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' });
```

### PlatformResourceDeclaredCapacity

```typescript
// List all platformResourceDeclaredCapacities
const { data, isLoading } = usePlatformResourceDeclaredCapacitiesQuery({
  selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } },
});

// Create a platformResourceDeclaredCapacity
const { mutate: create } = useCreatePlatformResourceDeclaredCapacityMutation({
  selection: { fields: { id: true } },
});
create({ cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' });
```

### PlatformResourceDefinition

```typescript
// List all platformResourceDefinitions
const { data, isLoading } = usePlatformResourceDefinitionsQuery({
  selection: { fields: { annotations: true, createdAt: true, createdBy: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } },
});

// Get one platformResourceDefinition
const { data: item } = usePlatformResourceDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, createdAt: true, createdBy: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } },
});

// Create a platformResourceDefinition
const { mutate: create } = useCreatePlatformResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', createdBy: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' });
```

### PlatformResourceEvent

```typescript
// List all platformResourceEvents
const { data, isLoading } = usePlatformResourceEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } },
});

// Get one platformResourceEvent
const { data: item } = usePlatformResourceEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } },
});

// Create a platformResourceEvent
const { mutate: create } = useCreatePlatformResourceEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' });
```

### PlatformResourceInstallation

```typescript
// List all platformResourceInstallations
const { data, isLoading } = usePlatformResourceInstallationsQuery({
  selection: { fields: { commitId: true, createdAt: true, createdBy: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } },
});

// Get one platformResourceInstallation
const { data: item } = usePlatformResourceInstallationQuery({
  id: '<UUID>',
  selection: { fields: { commitId: true, createdAt: true, createdBy: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } },
});

// Create a platformResourceInstallation
const { mutate: create } = useCreatePlatformResourceInstallationMutation({
  selection: { fields: { id: true } },
});
create({ commitId: '<UUID>', createdBy: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' });
```

### PlatformResourceStatusCheck

```typescript
// List all platformResourceStatusChecks
const { data, isLoading } = usePlatformResourceStatusChecksQuery({
  selection: { fields: { completedAt: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } },
});

// Get one platformResourceStatusCheck
const { data: item } = usePlatformResourceStatusCheckQuery({
  id: '<UUID>',
  selection: { fields: { completedAt: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } },
});

// Create a platformResourceStatusCheck
const { mutate: create } = useCreatePlatformResourceStatusCheckMutation({
  selection: { fields: { id: true } },
});
create({ completedAt: '<Datetime>', requestedAt: '<Datetime>', requestedBy: '<UUID>', resourceId: '<UUID>', result: '<JSON>', status: '<String>' });
```

### PlatformResourceUsageLog

```typescript
// List all platformResourceUsageLogs
const { data, isLoading } = usePlatformResourceUsageLogsQuery({
  selection: { fields: { cpuMillicores: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } },
});

// Get one platformResourceUsageLog
const { data: item } = usePlatformResourceUsageLogQuery({
  id: '<UUID>',
  selection: { fields: { cpuMillicores: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } },
});

// Create a platformResourceUsageLog
const { mutate: create } = useCreatePlatformResourceUsageLogMutation({
  selection: { fields: { id: true } },
});
create({ cpuMillicores: '<BigInt>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' });
```

### PlatformResourceUsageSummary

```typescript
// List all platformResourceUsageSummaries
const { data, isLoading } = usePlatformResourceUsageSummariesQuery({
  selection: { fields: { date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});

// Get one platformResourceUsageSummary
const { data: item } = usePlatformResourceUsageSummaryQuery({
  id: '<UUID>',
  selection: { fields: { date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});

// Create a platformResourceUsageSummary
const { mutate: create } = useCreatePlatformResourceUsageSummaryMutation({
  selection: { fields: { id: true } },
});
create({ date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' });
```

### PlatformResourceUtilization

```typescript
// List all platformResourceUtilizations
const { data, isLoading } = usePlatformResourceUtilizationsQuery({
  selection: { fields: { avgMemoryBytes: true, cpuLimitMillicores: true, cpuPeakUtilization: true, cpuRequestHeadroomMillicores: true, cpuRequestMillicores: true, date: true, gbSeconds: true, kind: true, maxCpuMillicores: true, maxMemoryBytes: true, memoryLimitBytes: true, memoryPeakUtilization: true, memoryRequestBytes: true, memoryRequestHeadroomBytes: true, namespaceId: true, replicas: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});

// Create a platformResourceUtilization
const { mutate: create } = useCreatePlatformResourceUtilizationMutation({
  selection: { fields: { id: true } },
});
create({ avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' });
```

### PlatformResourcesHealth

```typescript
// List all platformResourcesHealths
const { data, isLoading } = usePlatformResourcesHealthsQuery({
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});

// Get one platformResourcesHealth
const { data: item } = usePlatformResourcesHealthQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});

// Create a platformResourcesHealth
const { mutate: create } = useCreatePlatformResourcesHealthMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' });
```

### PlatformResourcesRequirementsState

```typescript
// List all platformResourcesRequirementsStates
const { data, isLoading } = usePlatformResourcesRequirementsStatesQuery({
  selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } },
});

// Create a platformResourcesRequirementsState
const { mutate: create } = useCreatePlatformResourcesRequirementsStateMutation({
  selection: { fields: { id: true } },
});
create({ configHash: '<String>', configObjectName: '<String>', requirementsHash: '<String>', resourceId: '<UUID>', secretsHash: '<String>', secretsObjectName: '<String>', slug: '<String>' });
```

### PlatformResourcesResolvedRequirement

```typescript
// List all platformResourcesResolvedRequirements
const { data, isLoading } = usePlatformResourcesResolvedRequirementsQuery({
  selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } },
});

// Create a platformResourcesResolvedRequirement
const { mutate: create } = useCreatePlatformResourcesResolvedRequirementMutation({
  selection: { fields: { id: true } },
});
create({ atomId: '<UUID>', configObjectName: '<String>', name: '<String>', namespaceId: '<UUID>', present: '<Boolean>', required: '<Boolean>', requirementKind: '<String>', resourceId: '<UUID>', secretsObjectName: '<String>', slug: '<String>' });
```

### PlatformWebhookEndpoint

```typescript
// List all platformWebhookEndpoints
const { data, isLoading } = usePlatformWebhookEndpointsQuery({
  selection: { fields: { active: true, createdAt: true, createdBy: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } },
});

// Get one platformWebhookEndpoint
const { data: item } = usePlatformWebhookEndpointQuery({
  id: '<UUID>',
  selection: { fields: { active: true, createdAt: true, createdBy: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } },
});

// Create a platformWebhookEndpoint
const { mutate: create } = useCreatePlatformWebhookEndpointMutation({
  selection: { fields: { id: true } },
});
create({ active: '<Boolean>', createdBy: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' });
```

### PlatformWebhookEvent

```typescript
// List all platformWebhookEvents
const { data, isLoading } = usePlatformWebhookEventsQuery({
  selection: { fields: { createdAt: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } },
});

// Get one platformWebhookEvent
const { data: item } = usePlatformWebhookEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } },
});

// Create a platformWebhookEvent
const { mutate: create } = useCreatePlatformWebhookEventMutation({
  selection: { fields: { id: true } },
});
create({ endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' });
```

### Resource

```typescript
// List all resources
const { data, isLoading } = useResourcesQuery({
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});

// Get one resource
const { data: item } = useResourceQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});

// Create a resource
const { mutate: create } = useCreateResourceMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' });
```

### ResourceDeclaredCapacity

```typescript
// List all resourceDeclaredCapacities
const { data, isLoading } = useResourceDeclaredCapacitiesQuery({
  selection: { fields: { cpuLimitMillicores: true, cpuRequestMillicores: true, installationId: true, isTransient: true, kind: true, memoryLimitBytes: true, memoryRequestBytes: true, namespaceId: true, podCountMax: true, podCountMin: true, source: true, sourceId: true, storageSizeBytes: true } },
});

// Create a resourceDeclaredCapacity
const { mutate: create } = useCreateResourceDeclaredCapacityMutation({
  selection: { fields: { id: true } },
});
create({ cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', installationId: '<UUID>', isTransient: '<Boolean>', kind: '<String>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', namespaceId: '<UUID>', podCountMax: '<Int>', podCountMin: '<Int>', source: '<String>', sourceId: '<UUID>', storageSizeBytes: '<BigInt>' });
```

### ResourceDefinition

```typescript
// List all resourceDefinitions
const { data, isLoading } = useResourceDefinitionsQuery({
  selection: { fields: { annotations: true, createdAt: true, createdBy: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } },
});

// Get one resourceDefinition
const { data: item } = useResourceDefinitionQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, createdAt: true, createdBy: true, databaseId: true, defaultSpec: true, description: true, id: true, integrations: true, kind: true, labels: true, name: true, namespaceId: true, requiredConfigs: true, requiredSecrets: true, slug: true, stepUpMinAge: true, updatedAt: true, updatedBy: true } },
});

// Create a resourceDefinition
const { mutate: create } = useCreateResourceDefinitionMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', createdBy: '<UUID>', databaseId: '<UUID>', defaultSpec: '<JSON>', description: '<String>', integrations: '<String>', kind: '<String>', labels: '<JSON>', name: '<String>', namespaceId: '<UUID>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', slug: '<String>', stepUpMinAge: '<Interval>', updatedBy: '<UUID>' });
```

### ResourceEvent

```typescript
// List all resourceEvents
const { data, isLoading } = useResourceEventsQuery({
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } },
});

// Get one resourceEvent
const { data: item } = useResourceEventQuery({
  id: '<UUID>',
  selection: { fields: { actorId: true, createdAt: true, databaseId: true, eventType: true, id: true, message: true, metadata: true, resourceId: true } },
});

// Create a resourceEvent
const { mutate: create } = useCreateResourceEventMutation({
  selection: { fields: { id: true } },
});
create({ actorId: '<UUID>', databaseId: '<UUID>', eventType: '<String>', message: '<String>', metadata: '<JSON>', resourceId: '<UUID>' });
```

### ResourceInstallation

```typescript
// List all resourceInstallations
const { data, isLoading } = useResourceInstallationsQuery({
  selection: { fields: { commitId: true, createdAt: true, createdBy: true, databaseId: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } },
});

// Get one resourceInstallation
const { data: item } = useResourceInstallationQuery({
  id: '<UUID>',
  selection: { fields: { commitId: true, createdAt: true, createdBy: true, databaseId: true, id: true, name: true, namespaceId: true, params: true, revision: true, slug: true, status: true, storeId: true, updatedAt: true, updatedBy: true } },
});

// Create a resourceInstallation
const { mutate: create } = useCreateResourceInstallationMutation({
  selection: { fields: { id: true } },
});
create({ commitId: '<UUID>', createdBy: '<UUID>', databaseId: '<UUID>', name: '<String>', namespaceId: '<UUID>', params: '<JSON>', revision: '<Int>', slug: '<String>', status: '<String>', storeId: '<UUID>', updatedBy: '<UUID>' });
```

### ResourceStatusCheck

```typescript
// List all resourceStatusChecks
const { data, isLoading } = useResourceStatusChecksQuery({
  selection: { fields: { completedAt: true, databaseId: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } },
});

// Get one resourceStatusCheck
const { data: item } = useResourceStatusCheckQuery({
  id: '<UUID>',
  selection: { fields: { completedAt: true, databaseId: true, id: true, requestedAt: true, requestedBy: true, resourceId: true, result: true, status: true } },
});

// Create a resourceStatusCheck
const { mutate: create } = useCreateResourceStatusCheckMutation({
  selection: { fields: { id: true } },
});
create({ completedAt: '<Datetime>', databaseId: '<UUID>', requestedAt: '<Datetime>', requestedBy: '<UUID>', resourceId: '<UUID>', result: '<JSON>', status: '<String>' });
```

### ResourceUsageLog

```typescript
// List all resourceUsageLogs
const { data, isLoading } = useResourceUsageLogsQuery({
  selection: { fields: { cpuMillicores: true, databaseId: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } },
});

// Get one resourceUsageLog
const { data: item } = useResourceUsageLogQuery({
  id: '<UUID>',
  selection: { fields: { cpuMillicores: true, databaseId: true, id: true, intervalSeconds: true, memoryBytes: true, metrics: true, namespaceId: true, resourceId: true, sampledAt: true, source: true } },
});

// Create a resourceUsageLog
const { mutate: create } = useCreateResourceUsageLogMutation({
  selection: { fields: { id: true } },
});
create({ cpuMillicores: '<BigInt>', databaseId: '<UUID>', intervalSeconds: '<Int>', memoryBytes: '<BigInt>', metrics: '<JSON>', namespaceId: '<UUID>', resourceId: '<UUID>', sampledAt: '<Datetime>', source: '<String>' });
```

### ResourceUsageSummary

```typescript
// List all resourceUsageSummaries
const { data, isLoading } = useResourceUsageSummariesQuery({
  selection: { fields: { databaseId: true, date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});

// Get one resourceUsageSummary
const { data: item } = useResourceUsageSummaryQuery({
  id: '<UUID>',
  selection: { fields: { databaseId: true, date: true, gbSeconds: true, id: true, maxCpuMillicores: true, maxMemoryBytes: true, namespaceId: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});

// Create a resourceUsageSummary
const { mutate: create } = useCreateResourceUsageSummaryMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', date: '<Date>', gbSeconds: '<BigFloat>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', namespaceId: '<UUID>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' });
```

### ResourceUtilization

```typescript
// List all resourceUtilizations
const { data, isLoading } = useResourceUtilizationsQuery({
  selection: { fields: { avgMemoryBytes: true, cpuLimitMillicores: true, cpuPeakUtilization: true, cpuRequestHeadroomMillicores: true, cpuRequestMillicores: true, date: true, gbSeconds: true, kind: true, maxCpuMillicores: true, maxMemoryBytes: true, memoryLimitBytes: true, memoryPeakUtilization: true, memoryRequestBytes: true, memoryRequestHeadroomBytes: true, namespaceId: true, replicas: true, resourceId: true, runtimeSeconds: true, sampleCount: true } },
});

// Create a resourceUtilization
const { mutate: create } = useCreateResourceUtilizationMutation({
  selection: { fields: { id: true } },
});
create({ avgMemoryBytes: '<BigInt>', cpuLimitMillicores: '<BigInt>', cpuPeakUtilization: '<BigFloat>', cpuRequestHeadroomMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', date: '<Date>', gbSeconds: '<BigFloat>', kind: '<String>', maxCpuMillicores: '<BigInt>', maxMemoryBytes: '<BigInt>', memoryLimitBytes: '<BigInt>', memoryPeakUtilization: '<BigFloat>', memoryRequestBytes: '<BigInt>', memoryRequestHeadroomBytes: '<BigInt>', namespaceId: '<UUID>', replicas: '<Int>', resourceId: '<UUID>', runtimeSeconds: '<BigInt>', sampleCount: '<Int>' });
```

### ResourcesHealth

```typescript
// List all resourcesHealths
const { data, isLoading } = useResourcesHealthsQuery({
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});

// Get one resourcesHealth
const { data: item } = useResourcesHealthQuery({
  id: '<UUID>',
  selection: { fields: { annotations: true, cpuLimitMillicores: true, cpuRequestMillicores: true, createdAt: true, createdBy: true, databaseId: true, errorCount: true, id: true, installationId: true, integrations: true, kind: true, labels: true, lastError: true, lastHeartbeatAt: true, memoryLimitBytes: true, memoryRequestBytes: true, name: true, namespaceId: true, replicas: true, requiredConfigs: true, requiredSecrets: true, resourceDefinitionId: true, slug: true, spec: true, status: true, statusDetail: true, statusObserved: true, storageClass: true, storageSizeBytes: true, updatedAt: true, updatedBy: true } },
});

// Create a resourcesHealth
const { mutate: create } = useCreateResourcesHealthMutation({
  selection: { fields: { id: true } },
});
create({ annotations: '<JSON>', cpuLimitMillicores: '<BigInt>', cpuRequestMillicores: '<BigInt>', createdBy: '<UUID>', databaseId: '<UUID>', errorCount: '<Int>', installationId: '<UUID>', integrations: '<String>', kind: '<String>', labels: '<JSON>', lastError: '<String>', lastHeartbeatAt: '<Datetime>', memoryLimitBytes: '<BigInt>', memoryRequestBytes: '<BigInt>', name: '<String>', namespaceId: '<UUID>', replicas: '<Int>', requiredConfigs: '<ResourceRequirement>', requiredSecrets: '<ResourceRequirement>', resourceDefinitionId: '<UUID>', slug: '<String>', spec: '<JSON>', status: '<String>', statusDetail: '<String>', statusObserved: '<JSON>', storageClass: '<String>', storageSizeBytes: '<BigInt>', updatedBy: '<UUID>' });
```

### ResourcesRequirementsState

```typescript
// List all resourcesRequirementsStates
const { data, isLoading } = useResourcesRequirementsStatesQuery({
  selection: { fields: { configHash: true, configObjectName: true, requirementsHash: true, resourceId: true, secretsHash: true, secretsObjectName: true, slug: true } },
});

// Create a resourcesRequirementsState
const { mutate: create } = useCreateResourcesRequirementsStateMutation({
  selection: { fields: { id: true } },
});
create({ configHash: '<String>', configObjectName: '<String>', requirementsHash: '<String>', resourceId: '<UUID>', secretsHash: '<String>', secretsObjectName: '<String>', slug: '<String>' });
```

### ResourcesResolvedRequirement

```typescript
// List all resourcesResolvedRequirements
const { data, isLoading } = useResourcesResolvedRequirementsQuery({
  selection: { fields: { atomId: true, configObjectName: true, name: true, namespaceId: true, present: true, required: true, requirementKind: true, resourceId: true, secretsObjectName: true, slug: true } },
});

// Create a resourcesResolvedRequirement
const { mutate: create } = useCreateResourcesResolvedRequirementMutation({
  selection: { fields: { id: true } },
});
create({ atomId: '<UUID>', configObjectName: '<String>', name: '<String>', namespaceId: '<UUID>', present: '<Boolean>', required: '<Boolean>', requirementKind: '<String>', resourceId: '<UUID>', secretsObjectName: '<String>', slug: '<String>' });
```

### WebhookEndpoint

```typescript
// List all webhookEndpoints
const { data, isLoading } = useWebhookEndpointsQuery({
  selection: { fields: { active: true, createdAt: true, createdBy: true, databaseId: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } },
});

// Get one webhookEndpoint
const { data: item } = useWebhookEndpointQuery({
  id: '<UUID>',
  selection: { fields: { active: true, createdAt: true, createdBy: true, databaseId: true, functionDefinitionId: true, host: true, id: true, namespaceId: true, path: true, provider: true, replayWindowSeconds: true, signingSecretName: true, updatedAt: true, updatedBy: true } },
});

// Create a webhookEndpoint
const { mutate: create } = useCreateWebhookEndpointMutation({
  selection: { fields: { id: true } },
});
create({ active: '<Boolean>', createdBy: '<UUID>', databaseId: '<UUID>', functionDefinitionId: '<UUID>', host: '<String>', namespaceId: '<UUID>', path: '<String>', provider: '<String>', replayWindowSeconds: '<Int>', signingSecretName: '<String>', updatedBy: '<UUID>' });
```

### WebhookEvent

```typescript
// List all webhookEvents
const { data, isLoading } = useWebhookEventsQuery({
  selection: { fields: { createdAt: true, databaseId: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } },
});

// Get one webhookEvent
const { data: item } = useWebhookEventQuery({
  id: '<UUID>',
  selection: { fields: { createdAt: true, databaseId: true, endpointId: true, error: true, externalEventId: true, id: true, invocationCreatedAt: true, invocationId: true, payload: true, provider: true, providerTimestamp: true, status: true, updatedAt: true } },
});

// Create a webhookEvent
const { mutate: create } = useCreateWebhookEventMutation({
  selection: { fields: { id: true } },
});
create({ databaseId: '<UUID>', endpointId: '<UUID>', error: '<String>', externalEventId: '<String>', invocationCreatedAt: '<Datetime>', invocationId: '<UUID>', payload: '<JSON>', provider: '<String>', providerTimestamp: '<Datetime>', status: '<String>' });
```

## Custom Operation Hooks

### `useReadFunctionGraphQuery`

readFunctionGraph

- **Type:** query
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `graphId` | UUID |

### `useAddEdgeMutation`

addEdge

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddEdgeInput (required) |

### `useAddEdgeAndSaveMutation`

addEdgeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddEdgeAndSaveInput (required) |

### `useAddNodeMutation`

addNode

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddNodeInput (required) |

### `useAddNodeAndSaveMutation`

addNodeAndSave

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | AddNodeAndSaveInput (required) |

### `useCopyGraphMutation`

copyGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | CopyGraphInput (required) |

### `useImportDefinitionsMutation`

importDefinitions

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ImportDefinitionsInput (required) |

### `useImportGraphJsonMutation`

importGraphJson

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ImportGraphJsonInput (required) |

### `useInfraInitEmptyRepoMutation`

infraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInitEmptyRepoInput (required) |

### `useInfraInsertNodeAtPathMutation`

infraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraInsertNodeAtPathInput (required) |

### `useInfraSetDataAtPathMutation`

infraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InfraSetDataAtPathInput (required) |

### `useInitEmptyRepoMutation`

initEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InitEmptyRepoInput (required) |

### `useInsertNodeAtPathMutation`

insertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | InsertNodeAtPathInput (required) |

### `usePlatformInfraInitEmptyRepoMutation`

platformInfraInitEmptyRepo

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInfraInitEmptyRepoInput (required) |

### `usePlatformInfraInsertNodeAtPathMutation`

platformInfraInsertNodeAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInfraInsertNodeAtPathInput (required) |

### `usePlatformInfraSetDataAtPathMutation`

platformInfraSetDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformInfraSetDataAtPathInput (required) |

### `usePlatformResourceInstallationsInstallMutation`

platformResourceInstallationsInstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformResourceInstallationsInstallInput (required) |

### `usePlatformResourceInstallationsRollbackMutation`

platformResourceInstallationsRollback

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformResourceInstallationsRollbackInput (required) |

### `usePlatformResourceInstallationsUninstallMutation`

platformResourceInstallationsUninstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformResourceInstallationsUninstallInput (required) |

### `usePlatformResourceInstallationsUpgradeMutation`

platformResourceInstallationsUpgrade

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | PlatformResourceInstallationsUpgradeInput (required) |

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

### `useResourceInstallationsInstallMutation`

resourceInstallationsInstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResourceInstallationsInstallInput (required) |

### `useResourceInstallationsRollbackMutation`

resourceInstallationsRollback

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResourceInstallationsRollbackInput (required) |

### `useResourceInstallationsUninstallMutation`

resourceInstallationsUninstall

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResourceInstallationsUninstallInput (required) |

### `useResourceInstallationsUpgradeMutation`

resourceInstallationsUpgrade

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ResourceInstallationsUpgradeInput (required) |

### `useSaveGraphMutation`

saveGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SaveGraphInput (required) |

### `useSetDataAtPathMutation`

setDataAtPath

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | SetDataAtPathInput (required) |

### `useStartExecutionMutation`

startExecution

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | StartExecutionInput (required) |

### `useValidateFunctionGraphMutation`

validateFunctionGraph

- **Type:** mutation
- **Arguments:**

  | Argument | Type |
  |----------|------|
  | `input` | ValidateFunctionGraphInput (required) |

---

Built by the [Constructive](https://constructive.io) team.

## Disclaimer

AS DESCRIBED IN THE LICENSES, THE SOFTWARE IS PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND.

No developer or entity involved in creating this software will be liable for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of the code, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value.
