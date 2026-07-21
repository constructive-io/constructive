# functionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
db.functionDeployment.findMany({ select: { id: true } }).execute()
db.functionDeployment.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionDeployment.create({ data: { annotations: '<JSON>', concurrency: '<Int>', databaseId: '<UUID>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' }, select: { id: true } }).execute()
db.functionDeployment.update({ where: { id: '<UUID>' }, data: { annotations: '<JSON>' }, select: { id: true } }).execute()
db.functionDeployment.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionDeployment records

```typescript
const items = await db.functionDeployment.findMany({
  select: { id: true, annotations: true }
}).execute();
```

### Create a functionDeployment

```typescript
const item = await db.functionDeployment.create({
  data: { annotations: '<JSON>', concurrency: '<Int>', databaseId: '<UUID>', errorCount: '<Int>', handlerName: '<String>', image: '<String>', imageVersion: '<String>', labels: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', namespaceId: '<UUID>', resources: '<JSON>', revision: '<Int>', scaleMax: '<Int>', scaleMin: '<Int>', serviceName: '<String>', serviceUrl: '<String>', status: '<String>', timeoutSeconds: '<Int>' },
  select: { id: true }
}).execute();
```
