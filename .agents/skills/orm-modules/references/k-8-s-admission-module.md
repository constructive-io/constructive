# k8sAdmissionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions the platform-managed Kubernetes admission catalogs: a kinds table and a spec-rules table, Merkle-versioned through the referenced merkle_store_module, whose rows the generated admission gate on resources/resource_definitions reads. Writes are platform-admin and human-only; every scope reads the one catalog.

## Usage

```typescript
db.k8sAdmissionModule.findMany({ select: { id: true } }).execute()
db.k8sAdmissionModule.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.k8sAdmissionModule.create({ data: { apiName: '<String>', databaseId: '<UUID>', entityTableId: '<UUID>', k8sResourceKindsTableId: '<UUID>', k8sSpecRulesTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' }, select: { id: true } }).execute()
db.k8sAdmissionModule.update({ where: { id: '<UUID>' }, data: { apiName: '<String>' }, select: { id: true } }).execute()
db.k8sAdmissionModule.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all k8sAdmissionModule records

```typescript
const items = await db.k8sAdmissionModule.findMany({
  select: { id: true, apiName: true }
}).execute();
```

### Create a k8sAdmissionModule

```typescript
const item = await db.k8sAdmissionModule.create({
  data: { apiName: '<String>', databaseId: '<UUID>', entityTableId: '<UUID>', k8sResourceKindsTableId: '<UUID>', k8sSpecRulesTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' },
  select: { id: true }
}).execute();
```
