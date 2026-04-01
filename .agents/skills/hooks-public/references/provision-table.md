# provisionTable

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Composable table provisioning: creates or finds a table, then applies N nodes (Data* modules), creates fields, enables RLS, creates grants, creates N policies, and optionally creates table-level indexes/full_text_searches/unique_constraints. All operations are graceful (skip existing). Accepts multiple nodes and multiple policies per call, unlike secure_table_provision which is limited to one of each. Returns (out_table_id, out_fields).

## Usage

```typescript
const { mutate } = useProvisionTableMutation(); mutate({ input: '<ProvisionTableInput>' });
```

## Examples

### Use useProvisionTableMutation

```typescript
const { mutate, isLoading } = useProvisionTableMutation();
mutate({ input: '<ProvisionTableInput>' });
```
