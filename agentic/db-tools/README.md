# @agentic-kit/db-tools

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml">
    <img height="20" src="https://github.com/constructive-io/constructive/actions/workflows/run-tests.yaml/badge.svg" />
  </a>
   <a href="https://github.com/constructive-io/constructive/blob/main/LICENSE"><img height="20" src="https://img.shields.io/badge/license-MIT-blue.svg"/></a>
   <a href="https://www.npmjs.com/package/@agentic-kit/db-tools"><img height="20" src="https://img.shields.io/github/package-json/v/constructive-io/constructive?filename=agentic%2Fdb-tools%2Fpackage.json"/></a>
</p>

The Constructive typed database tools, as **harness-neutral** [`HarnessTool`](https://www.npmjs.com/package/@agentic-kit/harness)s: zod parameters, `execute(params, { cwd, signal })`, and no coding-agent SDK anywhere in the package. Binding them to a harness is the *adapter's* job — [`@agentic-kit/pi`](https://www.npmjs.com/package/@agentic-kit/pi) does it with `toPiTool()` — so a second, compatible harness registers the same 18 tools without a fork.

```
@agentic-kit/db-tools ──► @agentic-kit/harness (HarnessTool)
        ▲
        ├── @agentic-kit/pi        toPiTool()  ──► pi's ToolDefinition
        └── your adapter           toXTool()   ──► your harness's tool shape
```

```bash
npm install @agentic-kit/db-tools
```

## What's inside

- **25 typed db tools** — `provision_database` / `replace_database`, `provision_blueprint`, `describe_schema`, `add_relation`, `delete_table`, `create_field` / `update_field` / `retype_field` / `delete_field`, `add_policies`, `add_records`, `list_entity_types` / `create_entity_type` / `delete_entity_type`, `create_api_key`, `run_codegen`, the template suite (`list` / `create` / `apply` / `update` / `delete`), the access tools (`explain_access`, `set_access`), and `describe_policy_type`. `constructiveDbTools` is the list, in registration order. Each states one effect (`read`, `write` or `destructive`) for every call; a change whose effect differs is its own tool (`retype_field` beside `update_field`, `replace_database` beside `provision_database`). Every failing call returns a `failure` (code, message, hint) beside the `details` it always had. A message or hint names no tool and no parameter: the calls that help travel as data (`failure.calls`, `result.calls`). Every object of a tool's own input refuses a key it does not have and names the nearest known one, instead of dropping it; Every change that names a table, a field, a template or an entity type finds it, or finds a new name's stored form free, before there is a plan to approve. A call that did only part of what was asked (a field without its unique constraint, some of the rows) returns the code `partial`, and its `details` hold the errors of the part that failed. Backend errors are read by their `extensions.code` and `extensions.class`, then the HTTP status (`extensions.http` first: the server answers HTTP 200 and puts the status there), then a masked internal error with its `errorId`; message text never decides, because the server masks the text it does not mean to show. `failureFromErrors(errors, action, meaning?)` is that mapping, exported for code that sends its own GraphQL (`postGraphQL`, which takes an `operationName`), and `FailureMeaning` names what a unique violation means for the call.

  The public `extensions.context` of the error that decided goes into `failure.context`: a query over the backend's request limits (`QUERY_TOO_COSTLY`, `QUERY_TOO_DEEP`, `PAGE_SIZE_TOO_LARGE`, `REQUEST_TOO_LARGE`) is `query-too-large` with its numbers there, for example `{ cost, limit }`. An update or delete that answers with no row in its payload changed nothing: that is how row-level security answers for a row this account cannot see, so every tool that updates or deletes fails `no-rows-changed` there instead of reporting success. A create that answers without the new row fails `no-rows-changed` as well: the row may not exist, or a policy lets the account create it but not read it, and the hint names the call that shows whether it exists. `STEP_UP_REQUIRED` is `step-up-required`: the change needs a recent sign-in.

  `constructiveGateDeps().precondition` runs each tool's own first check and returns the plan's target from what it resolved (`toolPreconditions`, one per tool, provision_database included), and for a change to a table's access the access before and after; a tool the map does not hold is blocked as `unsupported`.

  **Access.** The access of a table is its stored rules, grants and row security (`readTables`), and nothing here says who can or cannot reach a row. `explain_access` gives one plain sentence per stored rule (`explainPolicy`, from the words of the rule's Authz node), the grants, row security and the structural findings (`accessFindings`), each of which says what may happen. It and `describe_schema` return each stored rule through `asWritten`, in the one shape a caller writes (`{ $type, privileges, permissive, policy_role, data, with_check? }`), with every key the node's closed `parameter_schema` marks `readOnly` left out, nested nodes included, so a read carries no part the closed world refuses. A plan's rules use the same keys, with `words` in place of `data`. `set_access` replaces every rule of a table in one change with `owns: ['policies']`; the grants stay, and the Data nodes the rules need add their columns when the table lacks them. `add_policies` adds rules without replacing any. Both take rules only in the registry's blueprint shape (`{ $type, privileges, permissive, policy_role, policy_name, data }`, `AccessPolicyZod`), check each rule's shape against the registry's `BlueprintPolicy`, and check its data with `checkRule` (ajv over the node's closed `parameter_schema`, and the rule shapes these tools do not support) and its role before any plan. Every tool that sends rules, `provision_blueprint` included, sends them through `rulesToSend`: rules of one policy type, role, kind and data become one rule with all their privileges, and a rule the backend would skip (the same policy type and data as another) or refuse (a second policy row of one role, privilege and name) is refused before the plan. The plan holds the rules, grants and row security now and after, one sentence per rule, the findings the change adds and removes, the columns it adds (name, type, required, default) and the ones it reuses as they are. A reused column of another type than its Data node needs is blocked before the change (`conflict`, with `retype_field` and `delete_field`). When the person signed in to the app sees a row, a change that adds a required column with no value for the rows is blocked before anything is sent; otherwise the backend's refused NOT NULL comes back as a `conflict` with the `create_field` call that adds the column as optional first. After the change, the table is read back and compared with the plan by meaning (`policyDifference`); a difference is a `conflict`, and a read that fails is `unverified`. A refusal on the rows of an app table (`add_records`) suggests the read of its rules; a refusal on the control plane does not, because it is about the account's rights on the database.

- **Host injection** — credentials, backend endpoints and data-plane tokens come from the host application, not from the package. Call `configureHost()` once at startup; the tools read it lazily per call.
- **Project context** — `resolveProjectContext` / `resolveDataToken` resolve the database a tool acts on from the cwd's `.env` plus the host's session, and `deriveSubdomainEndpoint` derives its per-database endpoints. `probeDatabase` says whether that database is still there, and `readSchemaModel` reads its app tables.
- **Provisioning model** — the pinned `node-type-registry` presets, the provision manifest, and overlay resolution (`resolveProvisionModules`).
- **`constructiveGateDeps`** — the confirm gate's host capabilities (the effect of a call, the tool's own first check, what tables would a template copy) answered by these tools, so every adapter gates the same tools against the same project state instead of restating it. Each tool runs its check (`toolPreconditions`: the project context on the plane it acts on, an owner, an app sign-in) before it changes anything, and the gate blocks a call whose check fails with that same failure.
- **`toolSchema`** — a tool's zod parameters as plain JSON Schema, for adapters whose harness wants JSON Schema rather than zod.

## Usage

```ts
import { configureHost, constructiveDbTools } from '@agentic-kit/db-tools';

configureHost({
  account: () => ({ userId, accessToken }),
  backendConfig: () => ({ apiEndpoint, modulesEndpoint }),
  signInHint: 'Run `agent login` to sign in.'
});

for (const tool of constructiveDbTools) {
  myHarness.registerTool(myToolBinding(tool));
}
```

A tool executes against nothing but its params and a context, so it is callable directly — which is also how the tests drive it:

```ts
const result = await describeSchemaTool.execute({ database_name: 'my-app' }, { cwd: process.cwd() });
```

## Is the bound database still there?

`probeDatabase` (or `probeBoundDatabase(id)`, which uses the host's account and control endpoint) asks the platform api and returns one of:

| `status` | Means | Recovery |
| --- | --- | --- |
| `found` | Live; carries `name`, `ownerId` and `hash` (the schema hash, which changes on every schema change) | none |
| `suspended` | It exists and keeps its data, but is held (`suspendedAt`, `suspendedReason`) | wait for the hold to lift; never replace it |
| `missing` | The backend answered and this account can't see it: deleted, or access lost | re-provision |
| `unreachable` | No usable answer; `cause` is `network`, `server`, `auth` (account credential rejected) or `error` (an error the probe doesn't know) | retry or sign in; never re-provision |

Only `missing` means the database is gone. On a backend without `hash`, the probe retries once without it and `hash` is undefined. `resolveProjectContext` reports the same states as `db-missing`, `db-suspended`, `account-mismatch` and `backend-unreachable` (with `cause`), and a resolved context carries `hash`.

Tenant APIs answer `ACCESS_SUSPENDED` (a 403 with a JSON body) for a deleted or suspended database. The SDK's `FetchAdapter` drops that body, so `postGraphQL` and `statusAdapter` (a drop-in ORM adapter) keep each error's `extensions.code` and HTTP status, and `classifyBackendErrors` sorts them into `suspended`, `network`, `server`, `auth`, `forbidden` or `graphql`. `add_records`, `run_codegen` and `create_api_key` return `details.code: 'database-unavailable'` on `ACCESS_SUSPENDED`, and `run_codegen` doesn't retry a refused introspection.

## The live schema

`readSchemaModel(context)` reads the app tables (category `APP`, whoever created them) from the metaschema in one piece, or throws `SchemaReadError`; a partial read would look like columns dropped outside. Each table has its stable metaschema id, every field with its category (a status column made by `DataStatusField` is `MODULE`), a normalised type, `isRequired`, a structured default (`value`, `now`, `today`, `generated` or `expression`), the values an IN-list check allows, primary-key and unique flags, foreign keys with their delete and update actions (targets outside the app tables still resolve), and its policies. `accessOf(policies)` maps them to `shared`, `private` or `custom`. The model's `hash` is read before anything else.

## Provisioning

`provision_database` and the host-side `provisionDatabase(input, { cwd })` never create a second database by accident. Calls for one project run one at a time. A binding is `DATABASE_ID` alone: it is probed, then kept (healing endpoints and any missing binding keys) or refused. The account bearer stays with the host, not in `.env`. Replace mode (`mode: 'replace', replaces: <the id the caller saw>`) swaps the binding only if it is still that one, and never swaps a suspended database, or a live one on the host path. A provision that outlasts the poll is recorded in `.env` and resumed by the next call. A ticket that can't be read back, or a call that lost track of its ticket, finds an in-flight provision of the same name with `listOwn` before anything is requested; a completed one is only reported. After `MAX_PENDING_ATTEMPTS` waits the call fails `provision-stuck` until the host passes `abandonPending`.

Failures carry a `code`: `signed-out`, `backend-unreachable`, `db-missing`, `db-suspended`, `account-mismatch`, `binding-live`, `binding-changed`, `pending-other`, `ticket-lost`, `provision-stuck`, `name-taken` (with `heldBy` when a database of this account holds the name, which the host can bind with `adopt: <id>`), `binding-not-saved`, `env-write-failed`, `reprovision-not-allowed` or `failed`.

Host hooks for this, all optional:

- `persistBinding(binding)` saves the binding in the host's own store before `.env` is written. If it throws, `.env` is left alone, the ticket stays recorded, and the call fails `binding-not-saved`.
- `toolReprovision: false` makes `replace_database` fail `reprovision-not-allowed`, for a host that replaces databases only after the user approves.
- `reprovisionHint` replaces the default advice to bind the directory to a new database in failure messages.
- `prewarmApp: false` stops the tools from preparing packages/app, for a host that prepares the app itself or not at all: `provision_database` clones and installs nothing while the backend provisions, and `run_codegen` creates, rewrites and installs nothing. It generates into the app that is there, and answers `app-missing`, with `appEndpoint` (the app data plane endpoint) in `failure.context` and `details`, when there is no app or a composed app has no installed packages.

## Blueprints

`BlueprintZod`, `expandBlueprintDefaults`, `blueprintProblems` and the field type parsers live here. The tool's own parameters stay small: the definition is any blueprint, and `provision_blueprint` checks it inside the tool. `expandBlueprintDefaults` keeps every key it is given and fills in what the backend would otherwise need: for each new table DataId, its own nodes, the Data nodes its rules need (`dataNodesForPolicies`) and DataTimestamps, row security, the default grants (select, insert, update and delete for authenticated) when it gives none, each rule's role, privileges and kind, and each field's type and default in the backend's form (a type name becomes a FieldType, SQL text or a constant a FieldDefault); a field a node adds is dropped. Then each rule's data is checked with `checkRule`, a second rule of one type, role and privilege is refused, and the whole definition is checked with ajv against the registry's `blueprintDefinitionJsonSchema` (`blueprintProblems`); a schema, relation end or table the blueprint names must exist where it says. The backend's own blueprint codes (`VALIDATE_BLUEPRINT_*`) come back as `invalid-input` with the detail the backend sent. A code the backend raises while it builds a rule (`MEMBERSHIP_TYPE_MUST_BE_INT`, `BAD_RLS_EXPRESSION` and the others) is a sentence with the backend detail and a call for each policy type, and an internal error there never prints the backend's text.

The backend stores a new table or field name in its own form (`inflection.underscore`, then 63 characters: `r2_rows_a` becomes `r2_rowsa`). `storedName` is that rule, checked against the backend's own answers for 650 names. A plan says where a new name will be stored differently, a result names what the backend stored (read back by id after a blueprint), and a lookup by the name a table was made with names the stored one. `describe_policy_type` gives every Authz node in short, or one in full (its parameter schema, `use_when`, `avoid_when`, `risks` and the columns it needs).

## Blueprint builds

`constructBlueprint` queues the build and returns the construction id, and the backend builds one blueprint at a time. So `provision_blueprint`, `add_relation` and `apply_template` wait for their build through `buildBlueprint` (or `waitForConstruction`, given an id), which reads the construction every 2 s until it is `constructed`, and returns the construction id and its table map, or `failed`, and throws with the backend's error code and message. The error is read in a separate query after the failure, so the status reads also work on a backend without the `error` column, and there the failure says the backend gave no reason. A host that polls on its own reads the reason the same way with `readConstructionFailure`. On a backend that still builds inside the mutation, the first read already says `constructed`.

The wait gives up after `CONSTRUCTION_DEADLINE_MS` (240 s: the build's own 120 s statement timeout, plus as long again in the queue), when the signal aborts, or when the status can't be read (a GraphQL error, or 3 network failures in a row), and says the build may still finish. A host that limits how long a tool runs should give these three tools more than 240 s.

Once the backend has queued the build, `buildBlueprint` throws every failure as a `BlueprintBuildError` with its `constructionId`, and `provision_blueprint` puts that id on `details.constructionId`, whether the build succeeded or not. The build carries on without the call, so a host that retries failed calls shouldn't retry one that has an id: a second build of the same tables fails on the ones the first made. Without an id, nothing was queued.

## Related

| Package | Role |
| --- | --- |
| [`@agentic-kit/harness`](https://www.npmjs.com/package/@agentic-kit/harness) | the neutral contracts: `HarnessTool`, `HarnessAdapter`, the run gate |
| [`@agentic-kit/pi`](https://www.npmjs.com/package/@agentic-kit/pi) | the pi adapter: binds these tools and attaches a run's lanes to a pi session |
| [`@agentic-kit/cli`](https://www.npmjs.com/package/@agentic-kit/cli) | the `agent` CLI, which materializes the tools into a pi agent dir |
