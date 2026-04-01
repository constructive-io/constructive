# provisionFullTextSearch

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Creates a full-text search configuration on a table. Accepts a jsonb definition with field (tsvector column name) and sources (array of {field, weight, lang}). Graceful: skips if FTS config already exists for the same (table_id, field_id). Returns the fts_id.

## Usage

```typescript
const { mutate } = useProvisionFullTextSearchMutation(); mutate({ input: { databaseId: '<UUID>', tableId: '<UUID>', definition: '<JSON>' } });
```

## Examples

### Use useProvisionFullTextSearchMutation

```typescript
const { mutate, isLoading } = useProvisionFullTextSearchMutation();
mutate({ input: { databaseId: '<UUID>', tableId: '<UUID>', definition: '<JSON>' } });
```
