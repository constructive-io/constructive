# @constructive-io/errors

Canonical Constructive error system. Zero runtime dependencies — usable by any
service or client without pulling in pgpm.

- **Registry** — the single source of truth mapping each stable `code` to its
  classification (`public` vs `internal`), HTTP hint, and default message.
- **`parse(anyError)`** — normalize an error from any source (a
  `ConstructiveError`, a node-postgres `DatabaseError`, a GraphQL error or
  `{ errors: [...] }` wrapper, a plain `Error`, or a string) into a canonical
  `{ code, context, class, known }`.
- **`format(code, context, locale)`** — render a localized, interpolated
  message. `{{var}}` placeholders + registerable per-locale catalogs (i18n).
- **`errors.*` factory** — type-safe throwable builders derived from the
  registry, e.g. `throw errors.MODULE_NOT_FOUND({ name })`.
- **`classify(code)`** — `public` or `internal`; unknown codes are `internal`
  (fail safe) so transports never leak unregistered errors.

```ts
import { parse, format, errors, classify } from '@constructive-io/errors';

// Normalize a DB error surfaced through GraphQL
const parsed = parse(graphqlError);
if (parsed.class === 'public') {
  showUser(format(parsed.code!, parsed.context, locale));
}

// Throw a structured error
throw errors.ACCOUNT_EXISTS();
```

## Design notes

- The machine `code` is deliberately separate from user-facing copy so codes
  are stable and messages are localizable.
- `parse()` recovers structure from the code's precedence: structured `DETAIL`
  JSON → GraphQL `extensions.code` → a leading ALL_CAPS token in the message
  (legacy DB `RAISE`, incl. `CODE (arg, arg)` positional args) → native
  SQLSTATE constraint mapping.
- The registry has two layers, merged at lookup time (curated wins):
  - **Generated** (`src/generated/registry.generated.ts`) — every code raised via
    `EXCEPTION`/`THROW` across constructive-db (deploy sources + generated output),
    each with a `public`/`internal` class, HTTP hint, and default message.
  - **Curated** (`src/registry.ts`) — refined, typed-context entries for the codes
    that matter most (public auth/limit copy, native PostgreSQL constraint codes,
    pgpm CLI codes). These override the generated entries.
- Unregistered codes still `parse()` and are classified `internal` (masked).

## Regenerating the full registry

The generated layer is produced from a committed audit snapshot:

```bash
python3 scripts/generate-registry.py
```

It reads `scripts/db-error-inventory.json` (the constructive-db error audit) and,
when a `constructive-io/dashboard` checkout is found (via `DASHBOARD_DIR` or a
sibling `../dashboard`), seeds public copy from its error catalogs. Re-run the
constructive-db audit and overwrite `scripts/db-error-inventory.json` before
regenerating when DB error codes change. Never hand-edit the generated file.
