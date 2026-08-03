# domainsAssignSubdomain

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the domainsAssignSubdomain mutation

## Usage

```typescript
db.mutation.domainsAssignSubdomain({ input: { apex: '<String>', label: '<String>', maxAttempts: '<Int>' } }).execute()
```

## Examples

### Run domainsAssignSubdomain

```typescript
const result = await db.mutation.domainsAssignSubdomain({ input: { apex: '<String>', label: '<String>', maxAttempts: '<Int>' } }).execute();
```
