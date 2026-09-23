# k8sAdmissionModule

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

CRUD operations for K8sAdmissionModule records via csdk CLI

## Usage

```bash
csdk k-8-s-admission-module list
csdk k-8-s-admission-module list --where.<field>.<op> <value> --orderBy <values>
csdk k-8-s-admission-module list --limit 10 --after <cursor>
csdk k-8-s-admission-module find-first --where.<field>.<op> <value>
csdk k-8-s-admission-module get --id <UUID>
csdk k-8-s-admission-module create --databaseId <UUID> --merkleStoreModuleId <UUID> --prefix <String> --scope <String> --storeName <String> [--apiName <String>] [--entityTableId <UUID>] [--k8sResourceKindsTableId <UUID>] [--k8sSpecRulesTableId <UUID>] [--policies <JSON>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>]
csdk k-8-s-admission-module update --id <UUID> [--apiName <String>] [--databaseId <UUID>] [--entityTableId <UUID>] [--k8sResourceKindsTableId <UUID>] [--k8sSpecRulesTableId <UUID>] [--merkleStoreModuleId <UUID>] [--policies <JSON>] [--prefix <String>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>] [--scope <String>] [--storeName <String>]
csdk k-8-s-admission-module delete --id <UUID>
```

## Examples

### List k8sAdmissionModule records

```bash
csdk k-8-s-admission-module list
```

### List k8sAdmissionModule records with pagination

```bash
csdk k-8-s-admission-module list --limit 10 --offset 0
```

### List k8sAdmissionModule records with cursor pagination

```bash
csdk k-8-s-admission-module list --limit 10 --after <cursor>
```

### Find first matching k8sAdmissionModule

```bash
csdk k-8-s-admission-module find-first --where.id.equalTo <value>
```

### List k8sAdmissionModule records with field selection

```bash
csdk k-8-s-admission-module list --select id,id
```

### List k8sAdmissionModule records with filtering and ordering

```bash
csdk k-8-s-admission-module list --where.id.equalTo <value> --orderBy ID_ASC
```

### Create a k8sAdmissionModule

```bash
csdk k-8-s-admission-module create --databaseId <UUID> --merkleStoreModuleId <UUID> --prefix <String> --scope <String> --storeName <String> [--apiName <String>] [--entityTableId <UUID>] [--k8sResourceKindsTableId <UUID>] [--k8sSpecRulesTableId <UUID>] [--policies <JSON>] [--privateApiName <String>] [--privateSchemaId <UUID>] [--privateSchemaName <String>] [--provisions <JSON>] [--publicSchemaId <UUID>] [--publicSchemaName <String>]
```

### Get a k8sAdmissionModule by id

```bash
csdk k-8-s-admission-module get --id <value>
```
