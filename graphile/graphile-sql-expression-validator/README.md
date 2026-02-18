# graphile-sql-expression-validator

SQL expression validation and normalization for PostGraphile v5.

Validates SQL expressions against a configurable allowlist of functions and schemas, preventing injection of dangerous SQL constructs while allowing safe default expressions.

## Usage

### Standalone Validation

```typescript
import { parseAndValidateSqlExpression } from 'graphile-sql-expression-validator';

const result = await parseAndValidateSqlExpression('now()', {
  allowedFunctions: ['now', 'gen_random_uuid'],
});

if (result.valid) {
  console.log(result.canonicalText); // 'now()'
}
```

### PostGraphile v5 Preset

```typescript
import { SqlExpressionValidatorPreset } from 'graphile-sql-expression-validator';

const preset: GraphileConfig.Preset = {
  extends: [
    SqlExpressionValidatorPreset({
      allowedSchemas: ['app_public'],
      allowOwnedSchemas: true,
    }),
  ],
};
```
