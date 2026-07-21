# functionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
useFunctionDeploymentsQuery({ selection: { fields: { annotations: true, concurrency: true, createdAt: true, databaseId: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } } })
useFunctionDeploymentQuery({ id: '<UUID>', selection: { fields: { annotations: true, concurrency: true, createdAt: true, databaseId: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } } })
useCreateFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDeploymentMutation({})
```

## Examples

### List all functionDeployments

```typescript
const { data, isLoading } = useFunctionDeploymentsQuery({
  selection: { fields: { annotations: true, concurrency: true, createdAt: true, databaseId: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } },
});
```

### Create a functionDeployment

```typescript
const { mutate } = useCreateFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', concurrency: '<Int>', databaseId: '<UUID>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' });
```
