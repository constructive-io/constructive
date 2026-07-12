# platformFunctionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
usePlatformFunctionDeploymentsQuery({ selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true } } })
usePlatformFunctionDeploymentQuery({ id: '<UUID>', selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true } } })
useCreatePlatformFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionDeploymentMutation({})
```

## Examples

### List all platformFunctionDeployments

```typescript
const { data, isLoading } = usePlatformFunctionDeploymentsQuery({
  selection: { fields: { id: true, createdAt: true, updatedAt: true, namespaceId: true, status: true, serviceUrl: true, serviceName: true, revision: true, image: true, imageVersion: true, handlerName: true, concurrency: true, scaleMin: true, scaleMax: true, timeoutSeconds: true, resources: true, lastError: true, lastErrorAt: true, errorCount: true, labels: true, annotations: true } },
});
```

### Create a platformFunctionDeployment

```typescript
const { mutate } = useCreatePlatformFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
mutate({ namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>' });
```
