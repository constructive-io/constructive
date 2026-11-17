# requestDeviceApproval

<!-- @constructive-io/graphql-codegen - DO NOT EDIT -->

Execute the requestDeviceApproval mutation

## Usage

```typescript
db.mutation.requestDeviceApproval({ input: { deviceToken: '<String>', next: '<String>', userId: '<UUID>' } }).execute()
```

## Examples

### Run requestDeviceApproval

```typescript
const result = await db.mutation.requestDeviceApproval({ input: { deviceToken: '<String>', next: '<String>', userId: '<UUID>' } }).execute();
```
