# safegres evals

A repeatable eval loop for safegres: known SQL scenarios audited under every
preset, with committed goldens so scoring changes and rule regressions show up
as diffs.

## Running

```bash
pnpm eval          # audit every fixture under every preset, compare to goldens
pnpm eval:update   # re-record goldens from current tool behavior
```

Requires a reachable Postgres (`PGHOST`/`PGUSER`/`PGPASSWORD`, default
`localhost`/`postgres`/`password`); each fixture is deployed into an isolated
database via `pgsql-test`. The loop also runs as part of `pnpm test`, so CI
guards against drift.

## Layout

- `fixtures/*.sql` — self-contained scenarios. Each creates its own schema
  (`eval_<name>`) so the audit can be scoped to it. Role creation is guarded
  with `IF NOT EXISTS` (roles are cluster-global).
- `cases.ts` — the case list (name → schema → fixture) and the preset set.
- `golden/<name>.json` — recorded `{ score, grade, byCode }` per preset. The
  finding-count histogram (keyed by rule code) is stable across finding order
  and message wording, so goldens stay legible and only move on real behavior
  changes.
- `evals.test.ts` — the jest-driven runner (prints a scoreboard, asserts
  against goldens, or re-records them under `UPDATE_GOLDENS=1`).

## Current scoreboard

| case         | recommended | strict    | constructive | minimal   |
|--------------|-------------|-----------|--------------|-----------|
| secure-app   | 100/A+ (0)  | 100/A+ (0)| 100/A+ (0)   | 100/A+ (0)|
| leaky-app    | 13/F (10)   | 0/F (10)  | 0/F (10)     | 57/D (4)  |
| anon-exposed | 56/D (5)    | 56/D (5)  | 0/F (11)     | 100/A+ (0)|

`anon-exposed` is the case that shows the `constructive` preset's value: the
pure-Postgres presets can only see the PUBLIC-grant (R3) and permissive-policy
(A7) problems, while `constructive` additionally flags the untrusted
`anonymous` role's write grants (R1) and write policies (R2).

## Adding a case

1. Write `fixtures/<name>.sql` creating schema `eval_<name>`.
2. Add an entry to `CASES` in `cases.ts`.
3. `pnpm eval:update` and review the recorded golden before committing.

## Adding real-schema snapshots

Beyond hand-written fixtures, the loop is meant to consume schema snapshots
dumped from real apps (Diligence, Constructive). Deploy the app schema into a
database, `pg_dump --schema-only` the relevant schemas into
`fixtures/<app>-snapshot.sql`, and add a case. This turns dogfooding into a
regression signal instead of a one-off.
