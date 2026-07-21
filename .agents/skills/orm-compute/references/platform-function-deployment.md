# platformFunctionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
db.platformFunctionDeployment.findMany({ select: { id: true } }).execute()
db.platformFunctionDeployment.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.platformFunctionDeployment.create({ data: { annotations: '<JSON>', concurrency: '<Int>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' }, select: { id: true } }).execute()
db.platformFunctionDeployment.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.platformFunctionDeployment.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all platformFunctionDeployment records

```typescript
const items = await db.platformFunctionDeployment.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a platformFunctionDeployment

```typescript
const item = await db.platformFunctionDeployment.create({
  data: { annotations: '<JSON>', concurrency: '<Int>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' },
  select: { id: true }
}).execute();
```
