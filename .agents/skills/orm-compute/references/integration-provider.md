# integrationProvider

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Branded catalog of external service integrations and their canonical secret/config requirements. Each row defines a provider (e.g. Mailgun, Postgres) that function and resource definitions can reference by slug. The required_secrets/required_configs arrays are guidance that the UI can copy into a definition; the definition arrays remain the source of truth.

## Usage

```typescript
db.integrationProvider.findMany({ select: { id: true } }).execute()
db.integrationProvider.findOne({ id: '<UUID>', select: { id: true } }).execute()
db.integrationProvider.create({ data: { slug: '<String>', name: '<String>', description: '<String>', category: '<String>', icon: '<String>', logo: '<Image>', brand: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>' }, select: { id: true } }).execute()
db.integrationProvider.update({ where: { id: '<UUID>' }, data: { slug: '<String>' }, select: { id: true } }).execute()
db.integrationProvider.delete({ where: { id: '<UUID>' } }).execute()
```

## Examples

### List all integrationProvider records

```typescript
const items = await db.integrationProvider.findMany({
  select: { id: true, slug: true }
}).execute();
```

### Create a integrationProvider

```typescript
const item = await db.integrationProvider.create({
  data: { slug: '<String>', name: '<String>', description: '<String>', category: '<String>', icon: '<String>', logo: '<Image>', brand: '<JSON>', requiredSecrets: '<ResourceRequirement>', requiredConfigs: '<ResourceRequirement>' },
  select: { id: true }
}).execute();
```
