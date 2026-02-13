# graphile-authz

Authorization plugin for PostGraphile v5 that provides declarative, composable authorization rules.

## Features

- **Declarative Rules**: Define authorization rules using a simple, composable API
- **SQL Generation**: Automatically generates efficient SQL WHERE clauses for row-level security
- **Multiple Authz Nodes**: Support for various authorization patterns:
  - `DirectOwner` - Check if the current user owns the resource
  - `Membership` - Check membership in a group/organization
  - `MembershipByField` - Check membership via a field reference
  - `OrgHierarchy` - Check organization hierarchy access
  - `Temporal` - Time-based access control
  - `Publishable` - Check if content is published
  - `ArrayContainsActor` - Check if user is in an array field
  - `Composite` - Combine multiple rules with AND/OR logic

## Installation

```bash
pnpm add graphile-authz
```

## Usage

```typescript
import { createAuthzPreset, defineRules, CommonRules } from 'graphile-authz';

const rules = defineRules({
  posts: CommonRules.ownDataOnly('author_id'),
  comments: CommonRules.publishedOnly('is_published'),
});

const preset = createAuthzPreset({ rules });
```

## License

MIT
