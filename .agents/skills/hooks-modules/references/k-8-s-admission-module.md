# k8sAdmissionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Provisions the platform-managed Kubernetes admission catalogs: a kinds table and a spec-rules table, Merkle-versioned through the referenced merkle_store_module, whose rows the generated admission gate on resources/resource_definitions reads. Writes are platform-admin and human-only; every scope reads the one catalog.

## Usage

```typescript
useK8sAdmissionModulesQuery({ selection: { fields: { apiName: true, createdAt: true, databaseId: true, entityTableId: true, id: true, k8sResourceKindsTableId: true, k8sSpecRulesTableId: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } } })
useK8sAdmissionModuleQuery({ id: '<UUID>', selection: { fields: { apiName: true, createdAt: true, databaseId: true, entityTableId: true, id: true, k8sResourceKindsTableId: true, k8sSpecRulesTableId: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } } })
useCreateK8sAdmissionModuleMutation({ selection: { fields: { id: true } } })
useUpdateK8sAdmissionModuleMutation({ selection: { fields: { id: true } } })
useDeleteK8sAdmissionModuleMutation({})
```

## Examples

### List all k8sAdmissionModules

```typescript
const { data, isLoading } = useK8sAdmissionModulesQuery({
  selection: { fields: { apiName: true, createdAt: true, databaseId: true, entityTableId: true, id: true, k8sResourceKindsTableId: true, k8sSpecRulesTableId: true, merkleStoreModuleId: true, policies: true, prefix: true, privateApiName: true, privateSchemaId: true, privateSchemaName: true, provisions: true, publicSchemaId: true, publicSchemaName: true, scope: true, storeName: true } },
});
```

### Create a k8sAdmissionModule

```typescript
const { mutate } = useCreateK8sAdmissionModuleMutation({
  selection: { fields: { id: true } },
});
mutate({ apiName: '<String>', databaseId: '<UUID>', entityTableId: '<UUID>', k8sResourceKindsTableId: '<UUID>', k8sSpecRulesTableId: '<UUID>', merkleStoreModuleId: '<UUID>', policies: '<JSON>', prefix: '<String>', privateApiName: '<String>', privateSchemaId: '<UUID>', privateSchemaName: '<String>', provisions: '<JSON>', publicSchemaId: '<UUID>', publicSchemaName: '<String>', scope: '<String>', storeName: '<String>' });
```
