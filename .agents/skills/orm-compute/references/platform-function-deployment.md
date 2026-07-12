# platformFunctionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
db.platformFunctionDeployment.findMany({ select: { id: true } }).execute()
db.platformFunctionDeployment.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionDeployment.create({ data: { namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformFunctionDeployment.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute()
db.platformFunctionDeployment.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionDeployment records

```typescript
const items = await db.platformFunctionDeployment.findMany({
  select: { id: true, namespaceId: true }
}).execute();
```

### Create a platformFunctionDeployment

```typescript
const item = await db.platformFunctionDeployment.create({
  data: { namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>' },
  select: { id: true }
}).execute();
```
