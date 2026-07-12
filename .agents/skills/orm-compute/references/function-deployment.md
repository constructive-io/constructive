# functionDeployment

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Function deployment bindings — ties a handler image to a namespace for Knative provisioning and routing (one row per handler image per namespace)

## Usage

```typescript
db.functionDeployment.findMany({ select: { id: true } }).execute()
db.functionDeployment.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.functionDeployment.create({ data: { namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' }, select: { id: true } }).execute()
db.functionDeployment.update({ where: { id: '<UUID>' }, data: { namespaceId: '<UUID>' }, select: { id: true } }).execute()
db.functionDeployment.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all functionDeployment records

```typescript
const items = await db.functionDeployment.findMany({
  select: { id: true, namespaceId: true }
}).execute();
```

### Create a functionDeployment

```typescript
const item = await db.functionDeployment.create({
  data: { namespaceId: '<UUID>', status: '<String>', serviceUrl: '<String>', serviceName: '<String>', revision: '<Int>', image: '<String>', imageVersion: '<String>', handlerName: '<String>', concurrency: '<Int>', scaleMin: '<Int>', scaleMax: '<Int>', timeoutSeconds: '<Int>', resources: '<JSON>', lastError: '<String>', lastErrorAt: '<Datetime>', errorCount: '<Int>', labels: '<JSON>', annotations: '<JSON>', databaseId: '<UUID>' },
  select: { id: true }
}).execute();
```
