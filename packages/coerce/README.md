# @constructive-io/coerce

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@constructive-io/coerce"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=packages%2Fcoerce%2Fpackage.json"/></a>
</p>

Coerce untrusted `unknown` values — JSON request bodies, database rows, Kubernetes specs, env strings — into narrow TypeScript types. Zero dependencies.

## why?

Because every service ends up re-typing the same four functions inline, each subtly different:

```ts
// don't
const asString = (v: unknown) => (typeof v === 'string' && v ? v : null);
const asInteger = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) ? v : null);
```

## install

```sh
npm install @constructive-io/coerce
```

## usage

Two families. `as*` is lenient and returns `null`; `require*` throws a labelled `CoerceError`.

```ts
import { asInteger, asOneOf, asString, requireString } from '@constructive-io/coerce';

const model = asString(body.model);                            // string | null
const attempt = asInteger(body.attempt);                       // number | null
const role = asOneOf(body.author_role, ['user', 'assistant']);  // 'user' | 'assistant' | null
const messageId = requireString(body.message_id, 'message_id'); // string, or throws
```

| lenient | strict | accepts |
| --- | --- | --- |
| `asString` | `requireString` | a non-empty, non-whitespace string |
| `asNumber` | `requireNumber` | a finite number |
| `asInteger` | `requireInteger` | an integer |
| `asBoolean` | `requireBoolean` | a boolean, or `true/false`, `1/0`, `yes/no`, `on/off`, `t/f`, `y/n` |
| `asStringArray` | `requireStringArray` | an array whose every entry is a non-empty string |
| `asStringList` | `requireStringList` | an array, or a delimited string (`'a, b'`) |
| `asRecord` | `requireRecord` | a plain object (not `null`, not an array) |
| `asDate` | `requireDate` | a valid `Date`, or a parseable date string |
| `asIsoString` | `requireIsoString` | a `Date` (serialised) or a string (verbatim) |
| `asOneOf` | `requireOneOf` | one of the given string literals |

## rules

- **No guessing across types.** `'5'` is not an integer and `1` is not a string. Only `asBoolean` and `asDate` read strings, because env vars and query strings carry nothing else.
- **A blank string is absent.** `''` and `'   '` coerce to `null`, so an empty value can never read as a supplied identifier.
- **All-or-nothing lists.** `asStringArray` rejects the whole array rather than dropping bad entries — that is how a list of allowed origins quietly shrinks.
- **No transport semantics.** `CoerceError` carries the `label` that failed, not an HTTP status. Map it at your boundary:

```ts
try {
  return handle(requireString(body.message_id, 'message_id'));
} catch (err) {
  if (err instanceof CoerceError) throw new HttpError(400, err.message);
  throw err;
}
```

## related

`12factor-env` builds on this package for its lenient env parsing, and adds envalid-backed environment *schemas* (`cleanEnv`, redaction, cross-field checks). Reach for `12factor-env` when validating `process.env` at boot, and for this package when validating a value at runtime.

## license

MIT
