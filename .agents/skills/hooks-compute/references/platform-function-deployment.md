# platformFunctionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
usePlatformFunctionDeploymentsQuery({ selection: { fields: { annotations: true, catalogImageId: true, concurrency: true, createdAt: true, createdByPrincipal: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, realm: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true, updatedByPrincipal: true } } })
usePlatformFunctionDeploymentQuery({ id: '<UUID>', selection: { fields: { annotations: true, catalogImageId: true, concurrency: true, createdAt: true, createdByPrincipal: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, realm: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true, updatedByPrincipal: true } } })
useCreatePlatformFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useUpdatePlatformFunctionDeploymentMutation({ selection: { fields: { id: true } } })
useDeletePlatformFunctionDeploymentMutation({})
```

## Examples

### List all platformFunctionDeployments

```typescript
const { data, isLoading } = usePlatformFunctionDeploymentsQuery({
  selection: { fields: { annotations: true, catalogImageId: true, concurrency: true, createdAt: true, createdByPrincipal: true, errorCount: true, handlerName: true, id: true, image: true, imageVersion: true, labels: true, lastError: true, lastErrorAt: true, namespaceId: true, realm: true, resources: true, revision: true, scaleMax: true, scaleMin: true, serviceName: true, serviceUrl: true, status: true, timeoutSeconds: true, updatedAt: true, updatedByPrincipal: true } },
});
```

### Create a platformFunctionDeployment

```typescript
const { mutate } = useCreatePlatformFunctionDeploymentMutation({
  selection: { fields: { id: true } },
});
mutate({ annotations: '<JSON>', catalogImageId: '<UUID>', concurrency: '<Int>', createdByPrincipal: '<UUID>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', realm: '<String>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>', updatedByPrincipal: '<UUID>' });
```
