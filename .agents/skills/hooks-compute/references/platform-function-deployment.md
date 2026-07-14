# platformFunctionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
usePlatformFunctionDeploymentsQuery({ selection: { fields: { annotations: true, concurrency: true, createdAt: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } } })
usePlatformFunctionDeploymentQuery({ id: '<UUID>', selection: { fields: { annotations: true, concurrency: true, createdAt: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } } })
useCreatePlatformFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionDeploymentMutation({})
```

## Examples

### List all platformFunctionDeployments

```typescript
const { data, isLoading } = usePlatformFunctionDeploymentsQuery({
  selection: { fields: { annotations: true, concurrency: true, createdAt: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true } },
});
```

### Create a platformFunctionDeployment

```typescript
const { mutate } = useCreatePlatformFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', concurrency: '<Int>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' });
```
