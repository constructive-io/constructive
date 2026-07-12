# functionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
useFunctionDeploymentsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } } })
useFunctionDeploymentQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } } })
useCreateFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useUpdateFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useDeleteFunctionDeploymentMutation({})
```

## Examples

### List all functionDeployments

```typescript
const { data, isLoading } = useFunctionDeploymentsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true, databaseId: true } },
});
```

### Create a functionDeployment

```typescript
const { mutate } = useCreateFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
mutate({ namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' });
```
