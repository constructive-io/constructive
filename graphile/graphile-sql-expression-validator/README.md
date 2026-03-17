# graphile-sql-expression-validator

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/graphile-sql-expression-validator"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=graphile%2Fgraphile-sql-expression-validator%2Fpackage.json"/></a>
</p>

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
    }),
  ],
};
```
