# Physical hostile preflight

Run this validation against a dedicated, unmeasured physical-fixture server before starting cperf. Provision and serve the hostile clone with the same explicit identity and purpose:

```bash
node research/graphile-density/physical-database-density/provision.cjs \
  --prefix pdc_hostile \
  --customers 8 \
  --out-dir /absolute/path/to/hostile-clone \
  --maintenance-database postgres \
  --run-purpose hostile-preflight \
  --clone-id fresh-preflight-clone-20260802-a

node --expose-gc research/graphile-density/physical-database-density/server.cjs \
  --manifest /absolute/path/to/hostile-clone/provision.json \
  --secrets /absolute/path/to/hostile-clone/runtime-secrets.json \
  --customers 8 \
  --arm physical-db-idle-1s \
  --mode scoped-required \
  --runtime-pool-max 2 \
  --enable-realtime true \
  --expected-database-contract 'sha256:<manifest-contract-digest>' \
  --blueprint-compatibility 'sha256:<generated-prerequisite-digest>' \
  --run-purpose hostile-preflight \
  --clone-id fresh-preflight-clone-20260802-a
```

The provisioner writes a distinct 256-bit nonce into a private schema in every physical database. The nonce never leaves PostgreSQL: the credential-free manifest contains only its context-bound digest, and both the child and aggregate status endpoints query the row live and recompute the digest before reporting `verified: true`. Runtime roles have no privilege on the private schema.

The validator loads the credential-free manifest and the provisioner's private runtime-secrets file. `--secrets` must name a regular, non-symlink file owned by the current user with no group or other permission bits (normally mode `0600`). The parent reads that file once. Each isolated worker receives exactly the representative customer's three A/B/C passwords through its private process environment, with the selected surface replaced by the probe credential; no worker receives the secrets path or another customer's credential. Neither the secrets path, its contents, nor the authenticated `CTF_CONTROL_TOKEN` is written to the artifact.

```bash
CTF_CONTROL_TOKEN='<ephemeral-token>' node \
  research/graphile-density/physical-database-density/physical-hostile-preflight.cjs \
  --manifest /absolute/path/to/provision.json \
  --secrets /absolute/path/to/runtime-secrets.json \
  --base-url http://127.0.0.1:3410 \
  --arm physical-db-idle-1s \
  --mode scoped-required \
  --preflight-clone-id fresh-preflight-clone-20260802-a \
  --output /absolute/path/to/physical-hostile-preflight.json
```

The validator requires the server's exact hostile-preflight clone ID, live attestation set, manifest customer set, arm, introspection mode, canonical database contract, blueprint fingerprint, and runtime artifact fingerprint. Hostile startup also recomputes every customer's structural and database-contract fingerprints from the live database rather than echoing the provision manifest. It then walks customers sequentially through the exact `/customer/<manifest customer id>` mount, requires `current_database()` to match that customer's physical identity during every dynamic identity and control sequence, invalidates the whole fleet before rebuilding every surface, and records only credential-free hashes and outcomes.

Fixture startup admission has one safe-role control followed by an exact 15-case unsafe matrix against a representative hostile physical database. The parent validator first reads the private attestation row and recomputes its context-bound digest, then a live catalog query proves that the temporary roles have exactly the intended profiles: `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, schema ownership, and schema `CREATE`. The control-plane login, `NODE_OPTIONS`, `NODE_PATH`, and generic Graphile environment are never forwarded to a probe child. Each child validates its exact environment key set, verifies `current_database()` and `current_user` with the selected runtime credential, and substitutes each profile independently into surfaces A, B, and C in a fresh process. All 15 fixture starts must fail with `GRAPHILE_UNSAFE_RUNTIME_ROLE` before the fixture's `buildEntry` or cache publication; the safe control must start successfully with zero builds and zero resident entries. Cleanup is attempted even after an ambiguous setup failure and a live catalog audit must find zero remaining probe roles and schemas.

This matrix exercises `complete-tenant-fixture.createFixtureServer`, whose role audit is deliberately ahead of its custom build seam. It does not claim to execute the production `graphile()` middleware path. Every worker reports the exact loaded runtime-artifact fingerprint, and all 16 worker results must match the mounted hostile server before the aggregate artifact can pass.

This command must never be imported by or invoked from the measured cperf process. Provision the measured clone separately with `--run-purpose measurement` and a different `--clone-id`, then pass those exact values to its server. A measurement-purpose server reports `controlAvailable: false` and refuses the entire hostile control endpoint even if a valid control token is accidentally present. The measured clone must reproduce the canonical structural and database-contract fingerprints, but it must not inherit the preflight clone's sessions, PostgreSQL cache state, mutations, nonce, or cgroup history. A passing preflight artifact is security evidence only, so it is explicitly marked `performanceEvidence: false` and `customerQualified: false`.

The runtime fingerprint hashes the deterministic resolved closure of local `dist` JavaScript reached from the fixture's runtime roots, plus the exact patched installed Graphile artifacts. Changes behind an `index.js` export stub therefore invalidate the evidence without recording absolute paths, source bytes, or credentials.

Focused tests:

```bash
node --test \
  research/graphile-density/complete-tenant-fixture/schema.test.cjs \
  research/graphile-density/complete-tenant-fixture/hostile-validation.test.cjs \
  research/graphile-density/physical-database-density/unsafe-runtime-startup-probe.test.cjs \
  research/graphile-density/physical-database-density/physical-hostile-preflight.test.cjs
```
