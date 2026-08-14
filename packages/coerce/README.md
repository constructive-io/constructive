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

Then the text-carried and named shapes — what an env var, a query string or a header hands you:

| lenient | strict | accepts |
| --- | --- | --- |
| `asNumeric` | `requireNumeric` | a finite number, or a numeric string (`'5'`) |
| `asNumericInteger` | `requireNumericInteger` | an integer, or an integral string (`'5'`) |
| `asNumberIn` | `requireNumberIn` | a finite number within `{ min, max }`, inclusive |
| `asIntegerIn` | `requireIntegerIn` | an integer within `{ min, max }`, inclusive |
| `asPort` | `requirePort` | a port: an integer in `1..65535`, from a number or a string |
| `asBigInt` | `requireBigInt` | a `bigint`, an integer, or a digit string |
| `asUrl` | `requireUrl` | an absolute URL — a scheme is required |
| `asHostname` | `requireHostname` | a hostname or IP address — no scheme, port or path |
| `asEmail` | `requireEmail` | an email address |
| `asUuid` | `requireUuid` | a canonical UUID |
| `asDuration` | `requireDuration` | milliseconds, or a suffixed duration (`'30s'`, `'5m'`, `'2h'`, `'1d'`, `'1w'`) |
| `asJson` | `requireJson` | an object or array, or a string that parses to one |

```ts
const port = asPort(process.env.PORT);   // 1..65535, or null
const ttl = asDuration('30s');           // 30000
const timeout = asIntegerIn(body.timeout_ms, { min: 1, max: 60_000 });
```

## rules

- **No guessing across types.** `'5'` is not an integer to `asInteger` and `1` is not a string. A JSON body that sent a string meant a string; the coercers that do read text (`asNumeric`, `asPort`, `asDuration`, `asBoolean`, `asDate`, `asJson`) say so in their names, because an env var or a query string carries nothing else.
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

`12factor-env` coerces through this package: its `port`/`url`/`host`/`email`/`uuid`/`duration`/`num`/`int`/`list`/`enumerated` validators are these coercers wrapped in envalid specs, so a variable and a request body agree on what each shape accepts. On top it adds what is environment-only — schemas (`cleanEnv`), defaults, secret redaction, cross-field checks. Reach for `12factor-env` when validating `process.env` at boot, and for this package when validating a value at runtime.
