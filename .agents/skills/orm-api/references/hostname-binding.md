# hostnameBinding

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Compiled hostname index maintained by domain sync triggers; read only through the resolver

## Usage

```typescript
db.hostnameBinding.findMany({ select: { id: true } }).execute()
db.hostnameBinding.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.hostnameBinding.create({ data: { domainId: '<UUID>', hostname: '<String>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsSecretName: '<String>', tlsStatus: '<String>', verificationStatus: '<String>' }, select: { id: true } }).execute()
db.hostnameBinding.update({ where: { id: '<UUID>' }, data: { domainId: '<UUID>' }, select: { id: true } }).execute()
db.hostnameBinding.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all hostnameBinding records

```typescript
const items = await db.hostnameBinding.findMany({
  select: { id: true, domainId: true }
}).execute();
```

### Create a hostnameBinding

```typescript
const item = await db.hostnameBinding.create({
  data: { domainId: '<UUID>', hostname: '<String>', isWildcard: '<Boolean>', managed: '<Boolean>', parentHostname: '<String>', tlsSecretName: '<String>', tlsStatus: '<String>', verificationStatus: '<String>' },
  select: { id: true }
}).execute();
```
