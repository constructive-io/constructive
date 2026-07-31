# @pgpmjs/naming-spec

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@pgpmjs/naming-spec"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=pgpm%2Fnaming-spec%2Fpackage.json"/></a>
</p>

The PGPM naming spec — canonical, **derived** change paths.

A change path is never authored and never identity: it is a pure projection of an
object's identity through this spec. Objects (content-addressed ASTs + dependency
edges) are the source of truth; paths are re-derivable at any time, so regrouping,
renaming schemes, or repartitioning packages can never break identity-keyed
consumers (diff, dependency resolution).

```ts
import { pathFor } from '@pgpmjs/naming-spec';
import { classifyStatements, identityOf } from '@pgsql/transform';

const facts = classifyStatements('CREATE TABLE app.users (id int);')[0];
pathFor(identityOf(facts)!); // 'schemas/app/tables/users/table'
```

Canonical templates (naming spec v1, the conventions used across constructive-db):

| kind | path |
|------|------|
| schema | `schemas/{schema}/schema` |
| table | `schemas/{schema}/tables/{table}/table` |
| trigger / policy / index / constraint / seed | `schemas/{schema}/tables/{table}/{triggers\|policies\|indexes\|constraints\|fixtures}/{name}` |
| function / view / type / sequence | `schemas/{schema}/{procedures\|views\|types\|sequences}/{name}` |
| extension | `extensions/{name}` |
| role | `roles/{name}` |

Pure leaf with zero dependencies. Identity derivation (`identityOf`) lives upstream
in `@pgsql/transform`; this package only renders identities to paths.
